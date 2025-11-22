"""
Queue Management API Endpoints

REST API for queue operations including status monitoring,
task management, and queue control operations.

Story 0.3: Queue Management API Implementation
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_tenant_db, get_tenant_id, require_role
from src.database.models import RoleEnum
from src.schemas.queue import (
    PauseQueueRequest,
    QueueDepthDataPoint,
    QueueStatus,
    TaskListResponse,
)
from src.services.queue_service import QueueService
from src.utils.logger import logger

router = APIRouter(prefix="/api/v1/queue", tags=["queue"])


def get_queue_service() -> QueueService:
    """Dependency injection for QueueService."""
    return QueueService()


@router.get(
    "/status",
    response_model=QueueStatus,
    status_code=status.HTTP_200_OK,
    summary="Get Queue Status",
    description=(
        "Retrieve current queue metrics including depth, processing rate, "
        "average wait time, failed task count, and pause state. "
        "Real-time metrics updated every 3 seconds by frontend."
    ),
)
async def get_queue_status(
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_tenant_db),
    service: QueueService = Depends(get_queue_service),
) -> QueueStatus:
    """Get current queue status metrics."""
    logger.debug(f"Queue status requested for tenant: {tenant_id}")
    try:
        return await service.get_queue_status(tenant_id, db)
    except Exception as e:
        logger.error(f"Failed to get queue status: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve queue status",
        )


@router.get(
    "/metrics",
    response_model=List[QueueDepthDataPoint],
    status_code=status.HTTP_200_OK,
    summary="Get Queue Depth History",
    description=(
        "Retrieve time-series data of queue depth for charting. "
        "Supports custom time ranges via start_time and end_time query params. "
        "Frontend requests last 60 minutes by default."
    ),
)
async def get_queue_metrics(
    start_time: datetime = Query(..., description="Start of time range (ISO 8601)"),
    end_time: datetime = Query(..., description="End of time range (ISO 8601)"),
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_tenant_db),
    service: QueueService = Depends(get_queue_service),
) -> List[QueueDepthDataPoint]:
    """Get queue depth history for time range."""
    logger.debug(
        f"Queue metrics requested for tenant {tenant_id}: {start_time} to {end_time}"
    )
    try:
        return await service.get_depth_history(tenant_id, start_time, end_time, db)
    except Exception as e:
        logger.error(f"Failed to get queue metrics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve queue metrics",
        )


@router.get(
    "/tasks",
    response_model=TaskListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Queue Tasks",
    description=(
        "Retrieve paginated list of tasks in queue. "
        "Supports filtering by status (pending, processing, completed, failed). "
        "Frontend uses 20 tasks per page with 5-second polling."
    ),
)
async def get_queue_tasks(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Tasks per page"),
    status_filter: Optional[str] = Query(
        None, alias="status", description="Filter by status"
    ),
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_tenant_db),
    service: QueueService = Depends(get_queue_service),
) -> TaskListResponse:
    """Get paginated list of tasks in queue."""
    logger.debug(
        f"Queue tasks requested for tenant {tenant_id}: "
        f"page={page}, limit={limit}, status={status_filter}"
    )
    try:
        return await service.get_queue_tasks(tenant_id, page, limit, status_filter, db)
    except Exception as e:
        logger.error(f"Failed to get queue tasks: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve queue tasks",
        )


@router.delete(
    "/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cancel Task",
    description=(
        "Cancel a pending or processing task. "
        "Requires operator role or higher (operator, tenant_admin). "
        "Revokes Celery task and updates execution status to 'cancelled'."
    ),
)
async def cancel_task(
    task_id: str,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_tenant_db),
    service: QueueService = Depends(get_queue_service),
    _role_check = Depends(lambda tenant_id: require_role(RoleEnum.OPERATOR, tenant_id)),
) -> None:
    """Cancel a task in the queue."""
    logger.info(f"Cancel task requested: {task_id} (tenant: {tenant_id})")
    try:
        await service.cancel_task(tenant_id, task_id, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to cancel task: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel task",
        )


@router.post(
    "/pause",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Pause Queue Processing",
    description=(
        "Pause all queue processing. "
        "Requires tenant_admin role. "
        "Sets Redis flag that workers check before processing new tasks."
    ),
)
async def pause_queue(
    request: PauseQueueRequest,
    tenant_id: str = Depends(get_tenant_id),
    service: QueueService = Depends(get_queue_service),
    _role_check = Depends(lambda tenant_id: require_role(RoleEnum.ADMIN, tenant_id)),
) -> None:
    """Pause queue processing."""
    logger.warning(f"Queue pause requested: {request.reason or 'No reason provided'}")
    try:
        await service.pause_queue(tenant_id, request.reason)
    except Exception as e:
        logger.error(f"Failed to pause queue: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to pause queue",
        )


@router.post(
    "/resume",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Resume Queue Processing",
    description=(
        "Resume queue processing after pause. "
        "Requires tenant_admin role. " 
        "Removes Redis pause flag."
    ),
)
async def resume_queue(
    tenant_id: str = Depends(get_tenant_id),
    service: QueueService = Depends(get_queue_service),
    _role_check = Depends(lambda tenant_id: require_role(RoleEnum.ADMIN, tenant_id)),
) -> None:
    """Resume queue processing."""
    logger.info("Queue resume requested")
    try:
        await service.resume_queue(tenant_id)
    except Exception as e:
        logger.error(f"Failed to resume queue: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resume queue",
        )
