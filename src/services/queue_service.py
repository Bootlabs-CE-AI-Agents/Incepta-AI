"""
Queue Management Service

Service layer for queue operations including status monitoring,
task management, and queue control operations.

Story 0.3: Queue Management API Implementation
"""

import math
from datetime import datetime, timedelta
from typing import List, Optional

import pytz
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.cache.redis_client import get_redis_client
from src.database.models import Agent, AgentTestExecution
from src.schemas.queue import (
    QueueDepthDataPoint,
    QueueStatus,
    QueueTask,
    TaskListResponse,
)
from src.utils.logger import logger
from src.workers.celery_app import celery_app


class QueueService:
    """
    Service layer for queue management operations.

    Integrates with Celery for queue inspection, Redis for pause/resume,
    and PostgreSQL for execution history with IST timezone support.
    """

    def __init__(self):
        """Initialize queue service with IST timezone."""
        self.IST = pytz.timezone("Asia/Kolkata")

    def _to_ist(self, dt: datetime) -> datetime:
        """
        Convert UTC datetime to IST.

        Args:
            dt: Datetime object (naive or aware)

        Returns:
            Datetime in IST timezone
        """
        if dt.tzinfo is None:
            dt = pytz.utc.localize(dt)
        return dt.astimezone(self.IST)

    def _get_ist_now(self) -> datetime:
        """
        Get current IST time.

        Returns:
            Current datetime in IST timezone
        """
        return datetime.now(self.IST)

    async def get_queue_status(self, tenant_id: str, db: AsyncSession) -> QueueStatus:
        """
        Get current queue metrics.

        Args:
            tenant_id: Tenant identifier for isolation
            db: Database session

        Returns:
            QueueStatus with depth, processing_rate, avg_wait_time, failed_tasks_24h, is_paused

        Data Sources:
            - depth: COUNT(*) from agent_test_executions WHERE status IN ('pending', 'processing')
            - processing_rate: COUNT(*) from last 5 minutes / 5
            - avg_wait_time: AVG(execution_time.total_duration_ms / 1000) from last hour
            - failed_tasks_24h: COUNT(*) WHERE status='failed' AND created_at > NOW() - 24h
            - is_paused: Redis.get("queue_paused_{tenant_id}") == "true"
        """
        logger.debug(f"Getting queue status for tenant: {tenant_id}")

        try:
            # Get current queue depth (pending + processing tasks)
            depth_query = select(func.count(AgentTestExecution.id)).where(
                and_(
                    AgentTestExecution.tenant_id == tenant_id,
                    AgentTestExecution.status.in_(["pending", "processing"]),
                )
            )
            depth_result = await db.execute(depth_query)
            depth = depth_result.scalar() or 0

            # Get processing rate (tasks completed in last 5 minutes)
            five_min_ago = self._get_ist_now() - timedelta(minutes=5)
            rate_query = select(func.count(AgentTestExecution.id)).where(
                and_(
                    AgentTestExecution.tenant_id == tenant_id,
                    AgentTestExecution.status == "success",
                    AgentTestExecution.created_at >= five_min_ago,
                )
            )
            rate_result = await db.execute(rate_query)
            tasks_in_5min = rate_result.scalar() or 0
            processing_rate = round(tasks_in_5min / 5.0, 2)  # tasks per minute

            # Get average wait time (last hour, using total_duration_ms from execution_time JSON)
            one_hour_ago = self._get_ist_now() - timedelta(hours=1)
            wait_query = select(AgentTestExecution.execution_time).where(
                and_(
                    AgentTestExecution.tenant_id == tenant_id,
                    AgentTestExecution.status.in_(["success", "failed"]),
                    AgentTestExecution.created_at >= one_hour_ago,
                )
            )
            wait_result = await db.execute(wait_query)
            execution_times = wait_result.scalars().all()

            # Calculate average wait time from execution_time JSON
            total_wait_ms = 0
            count = 0
            for exec_time in execution_times:
                if exec_time and isinstance(exec_time, dict):
                    total_duration_ms = exec_time.get("total_duration_ms", 0)
                    if total_duration_ms > 0:
                        total_wait_ms += total_duration_ms
                        count += 1

            avg_wait_time = round(total_wait_ms / count / 1000.0, 2) if count > 0 else 0.0

            # Get failed tasks in last 24 hours
            twenty_four_hours_ago = self._get_ist_now() - timedelta(hours=24)
            failed_query = select(func.count(AgentTestExecution.id)).where(
                and_(
                    AgentTestExecution.tenant_id == tenant_id,
                    AgentTestExecution.status == "failed",
                    AgentTestExecution.created_at >= twenty_four_hours_ago,
                )
            )
            failed_result = await db.execute(failed_query)
            failed_tasks_24h = failed_result.scalar() or 0

            # Check if queue is paused via Redis
            redis_client = await get_redis_client()
            pause_key = f"queue_paused_{tenant_id}"
            is_paused = await redis_client.get(pause_key) == "true"

            return QueueStatus(
                depth=depth,
                processing_rate=processing_rate,
                avg_wait_time=avg_wait_time,
                failed_tasks_24h=failed_tasks_24h,
                is_paused=is_paused,
            )

        except Exception as e:
            logger.error(f"Error getting queue status: {str(e)}", exc_info=True)
            raise

    async def get_depth_history(
        self,
        tenant_id: str,
        start_time: datetime,
        end_time: datetime,
        db: AsyncSession,
    ) -> List[QueueDepthDataPoint]:
        """
        Get queue depth time series.

        Args:
            tenant_id: Tenant identifier
            start_time: Start of time range (ISO 8601)
            end_time: End of time range (ISO 8601)
            db: Database session

        Returns:
            List of QueueDepthDataPoint (timestamp, depth) tuples

        Implementation:
            Since we don't have periodic snapshots in Redis yet, we'll calculate
            depth at 5-minute intervals by counting tasks in "pending" or "processing"
            status at each timestamp.
        """
        logger.debug(
            f"Getting depth history for tenant {tenant_id}: {start_time} to {end_time}"
        )

        try:
            # Generate 5-minute interval timestamps
            interval_minutes = 5
            current_time = start_time
            data_points = []

            while current_time <= end_time:
                # Count tasks that were pending or processing at this timestamp
                depth_query = select(func.count(AgentTestExecution.id)).where(
                    and_(
                        AgentTestExecution.tenant_id == tenant_id,
                        AgentTestExecution.created_at <= current_time,
                        AgentTestExecution.status.in_(["pending", "processing"]),
                    )
                )
                depth_result = await db.execute(depth_query)
                depth = depth_result.scalar() or 0

                data_points.append(
                    QueueDepthDataPoint(
                        timestamp=self._to_ist(current_time),
                        depth=depth,
                    )
                )

                current_time += timedelta(minutes=interval_minutes)

            return data_points

        except Exception as e:
            logger.error(f"Error getting depth history: {str(e)}", exc_info=True)
            raise

    async def get_queue_tasks(
        self,
        tenant_id: str,
        page: int,
        limit: int,
        status_filter: Optional[str],
        db: AsyncSession,
    ) -> TaskListResponse:
        """
        Get paginated list of tasks in queue.

        Args:
            tenant_id: Tenant identifier
            page: Page number (1-indexed)
            limit: Tasks per page
            status_filter: Optional status filter (pending, processing, completed, failed)
            db: Database session

        Returns:
            TaskListResponse with tasks, total, page, pages

        Query: SELECT * FROM agent_test_executions
               JOIN agents ON agent_test_executions.agent_id = agents.id
               WHERE tenant_id = ? [AND status = ?]
               ORDER BY created_at DESC
               LIMIT ? OFFSET ?
        """
        logger.debug(
            f"Getting queue tasks for tenant {tenant_id}: page={page}, limit={limit}, status={status_filter}"
        )

        try:
            # Build base query with JOIN to get agent name
            base_query = (
                select(
                    AgentTestExecution.id,
                    Agent.name.label("agent_name"),
                    AgentTestExecution.status,
                    AgentTestExecution.created_at,
                    AgentTestExecution.tenant_id,
                )
                .join(Agent, AgentTestExecution.agent_id == Agent.id)
                .where(AgentTestExecution.tenant_id == tenant_id)
            )

            # Apply status filter if provided
            if status_filter:
                base_query = base_query.where(AgentTestExecution.status == status_filter)

            # Get total count
            count_query = select(func.count()).select_from(base_query.alias())
            count_result = await db.execute(count_query)
            total = count_result.scalar() or 0

            # Calculate pagination
            total_pages = math.ceil(total / limit) if total > 0 else 1
            offset = (page - 1) * limit

            # Get paginated results
            paginated_query = base_query.order_by(desc(AgentTestExecution.created_at)).limit(limit).offset(offset)
            result = await db.execute(paginated_query)
            rows = result.all()

            # Convert to QueueTask objects
            tasks = [
                QueueTask(
                    id=str(row.id),
                    agent_name=row.agent_name,
                    status=row.status,
                    queued_at=self._to_ist(row.created_at),
                    priority=2,  # Default to "Normal" priority (no priority field in model yet)
                    tenant_id=row.tenant_id,
                )
                for row in rows
            ]

            return TaskListResponse(
                tasks=tasks,
                total=total,
                page=page,
                pages=total_pages,
            )

        except Exception as e:
            logger.error(f"Error getting queue tasks: {str(e)}", exc_info=True)
            raise

    async def cancel_task(
        self,
        tenant_id: str,
        task_id: str,
        db: AsyncSession,
    ) -> None:
        """
        Cancel a pending or processing task.

        Args:
            tenant_id: Tenant identifier for authorization
            task_id: Task ID (AgentTestExecution ID)
            db: Database session

        Raises:
            ValueError: If task not found or already completed
            PermissionError: If task doesn't belong to tenant

        Steps:
            1. Verify task belongs to tenant
            2. Verify status is 'pending' or 'processing'
            3. Call Celery: celery_app.control.revoke(task_id, terminate=True)
            4. Update DB: status='cancelled', errors={'message': 'Cancelled by user'}
        """
        logger.info(f"Cancelling task {task_id} for tenant {tenant_id}")

        try:
            # Fetch task from database
            query = select(AgentTestExecution).where(AgentTestExecution.id == task_id)
            result = await db.execute(query)
            execution = result.scalar_one_or_none()

            # Verify task exists
            if not execution:
                raise ValueError(f"Task {task_id} not found")

            # Verify tenant ownership
            if execution.tenant_id != tenant_id:
                raise PermissionError(
                    f"Task {task_id} does not belong to tenant {tenant_id}"
                )

            # Verify task can be cancelled
            if execution.status not in ["pending", "processing"]:
                raise ValueError(
                    f"Cannot cancel task in '{execution.status}' status. "
                    "Only 'pending' or 'processing' tasks can be cancelled."
                )

            # Revoke Celery task if task_id is available
            if execution.task_id:
                try:
                    celery_app.control.revoke(execution.task_id, terminate=True)
                    logger.info(f"Revoked Celery task: {execution.task_id}")
                except Exception as celery_error:
                    logger.warning(
                        f"Failed to revoke Celery task {execution.task_id}: {str(celery_error)}"
                    )
                    # Continue with DB update even if Celery revoke fails

            # Update database status
            execution.status = "cancelled"
            execution.errors = {
                "error_type": "UserCancellation",
                "message": "Cancelled by user",
                "cancelled_at": self._get_ist_now().isoformat(),
            }
            await db.commit()

            logger.info(f"Task {task_id} cancelled successfully")

        except (ValueError, PermissionError):
            # Re-raise validation errors
            raise
        except Exception as e:
            logger.error(f"Error cancelling task {task_id}: {str(e)}", exc_info=True)
            await db.rollback()
            raise

    async def pause_queue(self, tenant_id: str, reason: Optional[str] = None) -> None:
        """
        Pause queue processing for a tenant.

        Args:
            tenant_id: Tenant identifier
            reason: Optional reason for pausing

        Steps:
            1. Redis.set(f"queue_paused_{tenant_id}", "true")
            2. Workers check this flag before processing new tasks
        """
        logger.warning(
            f"Pausing queue for tenant {tenant_id}: {reason or 'No reason provided'}"
        )

        try:
            redis_client = await get_redis_client()
            pause_key = f"queue_paused_{tenant_id}"
            await redis_client.set(pause_key, "true")

            logger.info(f"Queue paused successfully for tenant {tenant_id}")

            # TODO: Log to audit_logs table when implemented

        except Exception as e:
            logger.error(
                f"Error pausing queue for tenant {tenant_id}: {str(e)}", exc_info=True
            )
            raise

    async def resume_queue(self, tenant_id: str) -> None:
        """
        Resume queue processing for a tenant.

        Args:
            tenant_id: Tenant identifier

        Steps:
            1. Redis.delete(f"queue_paused_{tenant_id}")
            2. Workers will resume processing tasks
        """
        logger.info(f"Resuming queue for tenant {tenant_id}")

        try:
            redis_client = await get_redis_client()
            pause_key = f"queue_paused_{tenant_id}"
            await redis_client.delete(pause_key)

            logger.info(f"Queue resumed successfully for tenant {tenant_id}")

            # TODO: Log to audit_logs table when implemented

        except Exception as e:
            logger.error(
                f"Error resuming queue for tenant {tenant_id}: {str(e)}", exc_info=True
            )
            raise
