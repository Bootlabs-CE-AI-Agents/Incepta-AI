"""
Workers API endpoints.

Provides REST API for worker monitoring, logs, metrics, and restart operations.
Requires admin role (no tenant isolation per AC-6).

Story: nextjs-story-17-workers-api-backend
"""

from typing import List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.services.worker_service import WorkerService, get_worker_service
from src.schemas.worker import (
    WorkerStatus,
    WorkerLogsResponse,
    WorkerRestartResponse,
    WorkerMetricsDTO,
)
from src.api.dependencies import require_admin_role
from src.database.session import get_async_session
from src.database.models import AuditLog, User
from src.utils.logger import logger


router = APIRouter(prefix="/api/v1/workers", tags=["Workers"])


@router.get(
    "",
    response_model=List[WorkerStatus],
    summary="List Workers",
    description="Get status of all Celery workers including health metrics (AC-1).",
)
async def list_workers(
    _: User = Depends(require_admin_role),
    worker_service: WorkerService = Depends(get_worker_service),
) -> List[WorkerStatus]:
    """
    List all workers and their status (AC-1).

    Returns:
        List of WorkerStatus DTOs

    Raises:
        HTTPException: 401 if not authenticated
        HTTPException: 403 if not admin
        HTTPException: 503 if Celery/Redis unavailable
    """
    try:
        return await worker_service.get_workers_status()
    except Exception as e:
        logger.error(f"Error listing workers: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to list workers. Celery or Redis unavailable.",
        )


@router.get(
    "/{hostname}/logs",
    response_model=WorkerLogsResponse,
    summary="Get Worker Logs",
    description="Fetch recent logs from a specific worker pod (AC-2).",
)
async def get_worker_logs(
    hostname: str,
    lines: int = Query(100, ge=1, le=1000, description="Number of log lines (max 1000)"),
    since: datetime | None = Query(None, description="Only return logs after this timestamp"),
    _: User = Depends(require_admin_role),
    worker_service: WorkerService = Depends(get_worker_service),
) -> WorkerLogsResponse:
    """
    Get logs for a specific worker (AC-2).

    Args:
        hostname: Worker hostname (e.g., celery@worker-pod-123)
        lines: Number of log lines to fetch (default 100, max 1000)
        since: Optional ISO 8601 timestamp filter

    Returns:
        WorkerLogsResponse with list of LogEntryDTO objects

    Raises:
        HTTPException: 400 if lines > 1000 or since format invalid
        HTTPException: 401 if not authenticated
        HTTPException: 403 if not admin
        HTTPException: 404 if worker not found
        HTTPException: 503 if Kubernetes API unavailable
    """
    try:
        logs = await worker_service.get_worker_logs(hostname, lines, since)
        return WorkerLogsResponse(hostname=hostname, logs=logs)
    except ValueError as e:
        # Worker not found (AC-2: 404)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching logs for {hostname}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch logs for {hostname}. Kubernetes API unavailable.",
        )


@router.post(
    "/{hostname}/restart",
    response_model=WorkerRestartResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Restart Worker",
    description="Trigger a restart of the worker pod (AC-3).",
)
async def restart_worker(
    hostname: str,
    user: User = Depends(require_admin_role),
    db: AsyncSession = Depends(get_async_session),
    worker_service: WorkerService = Depends(get_worker_service),
) -> WorkerRestartResponse:
    """
    Restart a specific worker (AC-3).

    Triggers Kubernetes rollout restart for worker deployment.
    Action logged to audit trail.

    Args:
        hostname: Worker hostname

    Returns:
        WorkerRestartResponse with restart_initiated_at timestamp

    Raises:
        HTTPException: 401 if not authenticated
        HTTPException: 403 if not admin
        HTTPException: 404 if worker not found
        HTTPException: 500 if Kubernetes API fails
    """
    try:
        # Validate worker exists (AC-3 safety check)
        workers = await worker_service.get_workers_status()
        if not any(w.hostname == hostname for w in workers):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Worker {hostname} not found",
            )

        # Trigger restart (AC-3)
        result = await worker_service.restart_worker(hostname)

        # Log to audit trail (AC-3, AC-8)
        audit_entry = AuditLog(
            user_id=user.id,
            action="worker_restart",
            resource=hostname,
            timestamp=datetime.utcnow(),
        )
        db.add(audit_entry)
        await db.commit()

        # Return 202 Accepted with timestamp (AC-3)
        return WorkerRestartResponse(
            status="success",
            message=f"Worker {hostname} restart initiated",
            restart_initiated_at=result["restart_initiated_at"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error restarting worker {hostname}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to restart worker {hostname}. Kubernetes API error.",
        )


@router.get(
    "/{hostname}/metrics",
    response_model=WorkerMetricsDTO,
    summary="Get Worker Metrics",
    description="Fetch detailed worker metrics from Prometheus (AC-4).",
)
async def get_worker_metrics(
    hostname: str,
    _: User = Depends(require_admin_role),
    worker_service: WorkerService = Depends(get_worker_service),
) -> WorkerMetricsDTO:
    """
    Get detailed metrics for a specific worker (AC-4).

    Fetches current metrics (CPU, memory, network) from Prometheus,
    7-day throughput history, and worker metadata from Celery.

    Args:
        hostname: Worker hostname

    Returns:
        WorkerMetricsDTO with current metrics, throughput history, versions

    Raises:
        HTTPException: 401 if not authenticated
        HTTPException: 403 if not admin
        HTTPException: 404 if worker not found
        HTTPException: 503 if Prometheus unavailable (with partial data)
    """
    try:
        return await worker_service.get_worker_metrics(hostname)
    except ValueError as e:
        # Worker not found (AC-4: 404)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching metrics for {hostname}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch metrics for {hostname}. Prometheus unavailable.",
        )
