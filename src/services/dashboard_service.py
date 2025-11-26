"""
Dashboard service layer for aggregating system metrics and activity.

Implements business logic for the dashboard summary endpoint including:
- Active agent counting with week-over-week comparison
- Execution metrics for current IST day with success rate calculation
- 24-hour rolling average response time with trend analysis
- 24-hour rolling error rate with industry threshold classification
- Recent activity feed from executions and system events

All datetime calculations use IST (Asia/Kolkata) timezone.
Results are cached for 60 seconds to optimize performance.

Story 0.1: Dashboard Home - Real Data Integration
"""

from datetime import datetime, timedelta
from typing import List, Optional

import pytz
from sqlalchemy import and_, func, select, cast, Float
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.models import Agent, AgentTestExecution
from src.schemas.dashboard import (
    ActiveAgentsMetric,
    ActivityStatus,
    ActivityType,
    DashboardSummary,
    ErrorRateMetric,
    ExecutionsTodayMetric,
    MetricChange,
    RecentActivity,
    ResponseTimeMetric,
)
from src.utils.logger import logger

# IST Timezone constant
IST = pytz.timezone("Asia/Kolkata")


class DashboardService:
    """
    Service layer for dashboard metrics aggregation.

    Provides business logic for calculating real-time metrics across agents,
    executions, and system activity with IST timezone support and performance
    caching.

    All methods enforce tenant_id filtering to prevent cross-tenant access.
    """

    def __init__(self):
        """Initialize dashboard service."""
        self.timezone = IST

    def _get_ist_now(self) -> datetime:
        """
        Get current datetime in IST timezone.

        Returns:
            Current datetime with IST timezone info
        """
        return datetime.now(self.timezone)

    def _get_ist_today_start(self) -> datetime:
        """
        Get start of current IST day (midnight).

        Returns:
            Datetime representing 00:00:00 IST today
        """
        now_ist = self._get_ist_now()
        return now_ist.replace(hour=0, minute=0, second=0, microsecond=0)

    def _get_24h_ago(self) -> datetime:
        """
        Get datetime 24 hours ago in IST.

        Returns:
            Datetime 24 hours before now in IST
        """
        return self._get_ist_now() - timedelta(hours=24)

    def _get_7d_ago(self) -> datetime:
        """
        Get datetime 7 days ago in IST.

        Returns:
            Datetime 7 days before now in IST
        """
        return self._get_ist_now() - timedelta(days=7)

    def _format_response_time(self, milliseconds: float) -> str:
        """
        Format response time for display.

        Args:
            milliseconds: Response time in milliseconds

        Returns:
            Formatted string (e.g., "1.2s" or "345ms")
        """
        if milliseconds >= 1000:
            seconds = milliseconds / 1000
            return f"{seconds:.1f}s"
        return f"{int(milliseconds)}ms"

    def _calculate_change_message(
        self, current: float, previous: float, unit: str = ""
    ) -> Optional[MetricChange]:
        """
        Calculate change message comparing current vs previous value.

        Args:
            current: Current value
            previous: Previous value for comparison
            unit: Optional unit suffix (e.g., "agents", "ms")

        Returns:
            MetricChange object or None if previous is 0
        """
        if previous == 0:
            return None

        diff = current - previous
        if abs(diff) < 0.01:  # No significant change
            return None

        # Format the change message
        sign = "+" if diff > 0 else ""
        if unit:
            value_str = f"{sign}{int(diff)} {unit} from last week"
        else:
            value_str = f"{sign}{diff:.1f} from last week"

        # Determine if positive (context-dependent)
        # For most metrics, increase is positive
        is_positive = diff > 0

        return MetricChange(value=value_str, is_positive=is_positive)

    async def get_active_agents_metric(
        self, tenant_id: str, db: AsyncSession
    ) -> ActiveAgentsMetric:
        """
        Get count of active agents with week-over-week comparison.

        Args:
            tenant_id: Tenant identifier for isolation
            db: Database session

        Returns:
            ActiveAgentsMetric with count and change
        """
        # Current active agent count
        current_query = select(func.count(Agent.id)).where(
            and_(Agent.tenant_id == tenant_id, Agent.status == "active")
        )
        current_result = await db.execute(current_query)
        current_count = current_result.scalar() or 0

        # Agent count 7 days ago (approximate - counts agents that existed then)
        seven_days_ago = self._get_7d_ago()
        past_query = select(func.count(Agent.id)).where(
            and_(
                Agent.tenant_id == tenant_id,
                Agent.status == "active",
                Agent.created_at <= seven_days_ago,
            )
        )
        past_result = await db.execute(past_query)
        past_count = past_result.scalar() or 0

        # Calculate change
        change = self._calculate_change_message(current_count, past_count, "agents")

        return ActiveAgentsMetric(count=current_count, change=change)

    async def get_executions_today_metric(
        self, tenant_id: str, db: AsyncSession
    ) -> ExecutionsTodayMetric:
        """
        Get execution count for current IST day with success rate.

        Args:
            tenant_id: Tenant identifier for isolation
            db: Database session

        Returns:
            ExecutionsTodayMetric with total, successful, and success_rate
        """
        today_start = self._get_ist_today_start()

        # Total executions since midnight IST
        total_query = select(func.count(AgentTestExecution.id)).where(
            and_(
                AgentTestExecution.tenant_id == tenant_id,
                AgentTestExecution.created_at >= today_start,
            )
        )
        total_result = await db.execute(total_query)
        total_count = total_result.scalar() or 0

        # Successful executions since midnight IST
        success_query = select(func.count(AgentTestExecution.id)).where(
            and_(
                AgentTestExecution.tenant_id == tenant_id,
                AgentTestExecution.created_at >= today_start,
                AgentTestExecution.status.in_(["success", "completed"]),
            )
        )
        success_result = await db.execute(success_query)
        successful_count = success_result.scalar() or 0

        # Calculate success rate (handle division by zero)
        success_rate = (successful_count / total_count * 100) if total_count > 0 else 0.0

        return ExecutionsTodayMetric(
            total=total_count, successful=successful_count, success_rate=success_rate
        )

    async def get_response_time_metric(
        self, tenant_id: str, db: AsyncSession
    ) -> ResponseTimeMetric:
        """
        Get average response time for last 24 hours with trend comparison.

        Args:
            tenant_id: Tenant identifier for isolation
            db: Database session

        Returns:
            ResponseTimeMetric with formatted time and threshold status
        """
        now = self._get_ist_now()
        twenty_four_h_ago = self._get_24h_ago()
        seven_days_ago = self._get_7d_ago()

        # Avg response time in last 24h (in milliseconds)
        # Extract 'total_duration_ms' from JSON field and cast to float
        recent_query = select(
            func.avg(
                cast(
                    func.json_extract_path_text(
                        AgentTestExecution.execution_time, 'total_duration_ms'
                    ),
                    Float
                )
            )
        ).where(
            and_(
                AgentTestExecution.tenant_id == tenant_id,
                AgentTestExecution.created_at >= twenty_four_h_ago,
                AgentTestExecution.execution_time.isnot(None),
            )
        )
        recent_result = await db.execute(recent_query)
        recent_avg_ms = recent_result.scalar() or 0.0

        # Avg response time for 7-day period ending 24h ago (for comparison)
        past_start = seven_days_ago
        past_end = twenty_four_h_ago
        past_query = select(
            func.avg(
                cast(
                    func.json_extract_path_text(
                        AgentTestExecution.execution_time, 'total_duration_ms'
                    ),
                    Float
                )
            )
        ).where(
            and_(
                AgentTestExecution.tenant_id == tenant_id,
                AgentTestExecution.created_at >= past_start,
                AgentTestExecution.created_at < past_end,
                AgentTestExecution.execution_time.isnot(None),
            )
        )
        past_result = await db.execute(past_query)
        past_avg_ms = past_result.scalar() or 0.0

        # Calculate change (for response time, decrease is positive)
        change = None
        if past_avg_ms > 0:
            diff_ms = recent_avg_ms - past_avg_ms
            formatted_diff = self._format_response_time(abs(diff_ms))
            sign = "+" if diff_ms > 0 else "-"
            change = MetricChange(
                value=f"{sign}{formatted_diff} from avg", is_positive=(diff_ms < 0)
            )

        # Check if exceeds 500ms industry threshold
        threshold_exceeded = recent_avg_ms > 500

        return ResponseTimeMetric(
            value=self._format_response_time(recent_avg_ms),
            value_ms=recent_avg_ms,
            change=change,
            threshold_exceeded=threshold_exceeded,
        )

    async def get_error_rate_metric(
        self, tenant_id: str, db: AsyncSession
    ) -> ErrorRateMetric:
        """
        Get error rate for last 24 hours with industry threshold classification.

        Error rate = (failed_executions / total_executions) * 100

        Classification:
        - <1%: "Excellent" (green)
        - 1-5%: "Monitor closely" (orange)
        - >5%: "Critical" (red)

        Args:
            tenant_id: Tenant identifier for isolation
            db: Database session

        Returns:
            ErrorRateMetric with percentage and status classification
        """
        twenty_four_h_ago = self._get_24h_ago()

        # Total executions in last 24h
        total_query = select(func.count(AgentTestExecution.id)).where(
            and_(
                AgentTestExecution.tenant_id == tenant_id,
                AgentTestExecution.created_at >= twenty_four_h_ago,
            )
        )
        total_result = await db.execute(total_query)
        total_count = total_result.scalar() or 0

        # Failed executions in last 24h
        failed_query = select(func.count(AgentTestExecution.id)).where(
            and_(
                AgentTestExecution.tenant_id == tenant_id,
                AgentTestExecution.created_at >= twenty_four_h_ago,
                AgentTestExecution.status.in_(["failed", "error"]),
            )
        )
        failed_result = await db.execute(failed_query)
        failed_count = failed_result.scalar() or 0

        # Calculate error rate (handle division by zero)
        error_rate = (failed_count / total_count * 100) if total_count > 0 else 0.0

        # Classify based on industry thresholds
        if error_rate < 1.0:
            status_message = "Excellent"
            is_critical = False
        elif error_rate <= 5.0:
            status_message = "Monitor closely"
            is_critical = False
        else:
            status_message = "Critical"
            is_critical = True

        return ErrorRateMetric(
            percentage=error_rate, status_message=status_message, is_critical=is_critical
        )

    async def get_recent_activity(
        self, tenant_id: str, db: AsyncSession, limit: int = 10
    ) -> List[RecentActivity]:
        """
        Get recent activity feed from execution events.

        Returns last N execution completions with relative timestamps.
        In future, can be expanded to include system events (agent created, etc.)

        Args:
            tenant_id: Tenant identifier for isolation
            db: Database session
            limit: Maximum number of activities to return (default: 10)

        Returns:
            List of RecentActivity items, most recent first
        """
        # Query recent executions with agent name via join
        query = (
            select(AgentTestExecution, Agent.name.label("agent_name"))
            .outerjoin(Agent, AgentTestExecution.agent_id == Agent.id)
            .where(
                and_(
                    AgentTestExecution.tenant_id == tenant_id,
                    AgentTestExecution.created_at.isnot(None),
                )
            )
            .order_by(AgentTestExecution.created_at.desc())
            .limit(limit)
        )
        result = await db.execute(query)
        rows = result.all()

        activities = []
        for row in rows:
            execution = row[0]  # AgentTestExecution object
            agent_name = row[1] or "Unknown"  # Agent name from join

            # Determine activity type and status based on execution status
            if execution.status in ["success", "completed"]:
                activity_type = ActivityType.EXECUTION_SUCCESS
                activity_status = ActivityStatus.SUCCESS
                title = f'Agent "{agent_name}" executed successfully'
            else:
                activity_type = ActivityType.EXECUTION_FAILURE
                activity_status = ActivityStatus.ERROR
                title = f'Agent "{agent_name}" execution failed'

            # Use created_at timestamp (should be in IST from database)
            timestamp = execution.created_at

            # Extract error details from errors field (JSON list or None)
            error_details = None
            if execution.errors:
                if isinstance(execution.errors, list) and len(execution.errors) > 0:
                    error_details = str(execution.errors[0])
                elif isinstance(execution.errors, str):
                    error_details = execution.errors

            activities.append(
                RecentActivity(
                    id=str(execution.id),
                    type=activity_type,
                    title=title,
                    timestamp=timestamp,
                    status=activity_status,
                    details=error_details,
                )
            )

        return activities

    async def get_dashboard_summary(
        self, tenant_id: str, db: AsyncSession
    ) -> DashboardSummary:
        """
        Get complete dashboard summary with all metrics and recent activity.

        This is the main entry point for the dashboard API endpoint.
        All calculations use IST timezone and are optimized for performance.

        Results should be cached at the API layer for 60 seconds.

        Args:
            tenant_id: Tenant identifier for isolation
            db: Database session

        Returns:
            Complete DashboardSummary object
        """
        logger.info(f"Generating dashboard summary for tenant: {tenant_id}")

        # Gather all metrics concurrently (could be optimized with asyncio.gather)
        active_agents = await self.get_active_agents_metric(tenant_id, db)
        executions_today = await self.get_executions_today_metric(tenant_id, db)
        avg_response_time = await self.get_response_time_metric(tenant_id, db)
        error_rate = await self.get_error_rate_metric(tenant_id, db)
        recent_activity = await self.get_recent_activity(tenant_id, db, limit=10)

        summary = DashboardSummary(
            active_agents=active_agents,
            executions_today=executions_today,
            avg_response_time=avg_response_time,
            error_rate=error_rate,
            recent_activity=recent_activity,
            generated_at=self._get_ist_now(),
            timezone="Asia/Kolkata",
        )

        logger.info(f"Dashboard summary generated: {active_agents.count} active agents")
        return summary
