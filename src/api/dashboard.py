"""
Dashboard API endpoints for system metrics and activity summary.

REST API for retrieving dashboard overview metrics including active agents,
executions, response times, error rates, and recent activity feed.

All endpoints enforce tenant isolation via tenant_id filtering.
Results are cached for 60 seconds to optimize performance.

Story 0.1: Dashboard Home - Real Data Integration
"""

from datetime import datetime, timedelta
from functools import lru_cache
from typing import Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_tenant_db, get_tenant_id
from src.schemas.dashboard import DashboardSummary
from src.services.dashboard_service import DashboardService
from src.utils.logger import logger

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])

# Cache for dashboard summary (60 second TTL)
# Key format: "tenant_id:minute" to refresh every minute
_dashboard_cache: dict[str, tuple[DashboardSummary, datetime]] = {}


def get_dashboard_service() -> DashboardService:
    """
    Dependency injection for DashboardService.

    Returns:
        Initialized DashboardService instance
    """
    return DashboardService()


def _get_cache_key(tenant_id: str) -> str:
    """
    Generate cache key for dashboard summary.

    Key includes tenant_id and current minute to auto-expire every 60s.

    Args:
        tenant_id: Tenant identifier

    Returns:
        Cache key string
    """
    current_minute = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    return f"{tenant_id}:{current_minute}"


def _get_cached_summary(tenant_id: str) -> Optional[DashboardSummary]:
    """
    Get cached dashboard summary if available and not expired.

    Args:
        tenant_id: Tenant identifier

    Returns:
        Cached DashboardSummary or None if not in cache/expired
    """
    cache_key = _get_cache_key(tenant_id)
    if cache_key in _dashboard_cache:
        summary, cached_at = _dashboard_cache[cache_key]
        # Check if cache is still valid (within 60 seconds)
        if datetime.utcnow() - cached_at < timedelta(seconds=60):
            logger.debug(f"Dashboard cache hit for tenant: {tenant_id}")
            return summary
        else:
            # Clean up expired entry
            del _dashboard_cache[cache_key]

    return None


def _cache_summary(tenant_id: str, summary: DashboardSummary) -> None:
    """
    Cache dashboard summary with current timestamp.

    Args:
        tenant_id: Tenant identifier
        summary: Dashboard summary to cache
    """
    cache_key = _get_cache_key(tenant_id)
    _dashboard_cache[cache_key] = (summary, datetime.utcnow())
    logger.debug(f"Dashboard cached for tenant: {tenant_id}")


@router.get(
    "/summary",
    response_model=DashboardSummary,
    status_code=status.HTTP_200_OK,
    summary="Get Dashboard Summary",
    description=(
        "Retrieves comprehensive dashboard overview including:\n\n"
        "- **Active Agents**: Count of agents with status='active' and week-over-week change\n"
        "- **Executions Today**: Total and successful execution counts for current IST day\n"
        "- **Avg Response Time**: Mean duration of executions in last 24 hours with trend\n"
        "- **Error Rate**: Percentage of failed executions in last 24 hours with threshold classification\n"
        "- **Recent Activity**: Last 10 execution events with timestamps\n\n"
        "All calculations use IST (Asia/Kolkata) timezone.\n"
        "Results are cached for 60 seconds per tenant."
    ),
    responses={
        200: {
            "description": "Dashboard summary retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "active_agents": {"count": 12, "change": {"value": "+2 agents from last week", "is_positive": True}},
                        "executions_today": {"total": 48, "successful": 32, "success_rate": 66.7},
                        "avg_response_time": {
                            "value": "1.2s",
                            "value_ms": 1200.0,
                            "change": {"value": "-300ms from avg", "is_positive": True},
                            "threshold_exceeded": False,
                        },
                        "error_rate": {"percentage": 2.1, "status_message": "Monitor closely", "is_critical": False},
                        "recent_activity": [
                            {
                                "id": "exec-123",
                                "type": "execution_success",
                                "title": 'Agent "Customer Support Bot" executed successfully',
                                "timestamp": "2025-01-21T14:30:00+05:30",
                                "status": "success",
                                "details": None,
                            }
                        ],
                        "generated_at": "2025-01-21T14:32:15+05:30",
                        "timezone": "Asia/Kolkata",
                    }
                }
            },
        }
    },
)
async def get_dashboard_summary(
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_tenant_db),
    service: DashboardService = Depends(get_dashboard_service),
) -> DashboardSummary:
    """
    Get dashboard summary with metrics and activity.

    Returns aggregated metrics for:
    - Active agents count
    - Today's execution statistics
    - Average response time (24h)
    - Error rate (24h)
    - Recent activity feed (last 10 events)

    Results are cached for 60 seconds per tenant to optimize performance.

    Args:
        tenant_id: Tenant identifier from auth middleware
        db: Database session
        service: Dashboard service instance

    Returns:
        DashboardSummary with all metrics and activity feed

    Raises:
        HTTPException: If database query fails (500 Internal Server Error)
    """
    logger.info(f"Dashboard summary requested for tenant: {tenant_id}")

    # Check cache first
    cached_summary = _get_cached_summary(tenant_id)
    if cached_summary:
        return cached_summary

    try:
        # Generate fresh summary
        summary = await service.get_dashboard_summary(tenant_id, db)

        # Cache the result
        _cache_summary(tenant_id, summary)

        logger.info(
            f"Dashboard summary generated for tenant {tenant_id}: "
            f"{summary.active_agents.count} agents, "
            f"{summary.executions_today.total} executions today"
        )

        return summary

    except Exception as e:
        logger.error(f"Failed to generate dashboard summary for tenant {tenant_id}: {str(e)}", exc_info=True)
        raise


# Future endpoints can be added here:
# - POST /dashboard/refresh - Force cache refresh
# - GET /dashboard/metrics/{metric_name} - Individual metric endpoints
# - GET /dashboard/activity - Extended activity feed with pagination
