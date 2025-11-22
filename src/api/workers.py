from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from src.services.worker_service import WorkerService, get_worker_service
from src.schemas.worker import WorkerStatus, WorkerLogsResponse, WorkerRestartResponse
from src.utils.logger import logger

router = APIRouter(prefix="/api/v1/workers", tags=["workers"])

@router.get(
    "",
    response_model=List[WorkerStatus],
    summary="List Workers",
    description="Get status of all Celery workers including health metrics."
)
async def list_workers(
    worker_service: WorkerService = Depends(get_worker_service)
) -> List[WorkerStatus]:
    """
    List all workers and their status.
    """
    try:
        return await worker_service.get_workers_status()
    except Exception as e:
        logger.error(f"Error listing workers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list workers"
        )

@router.get(
    "/{hostname}/logs",
    response_model=WorkerLogsResponse,
    summary="Get Worker Logs",
    description="Fetch recent logs from a specific worker pod."
)
async def get_worker_logs(
    hostname: str,
    lines: int = Query(100, ge=1, le=1000),
    worker_service: WorkerService = Depends(get_worker_service)
) -> WorkerLogsResponse:
    """
    Get logs for a specific worker.
    """
    try:
        logs = await worker_service.get_worker_logs(hostname, lines)
        return WorkerLogsResponse(hostname=hostname, logs=logs)
    except Exception as e:
        logger.error(f"Error fetching logs for {hostname}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch logs for {hostname}"
        )

@router.post(
    "/{hostname}/restart",
    response_model=WorkerRestartResponse,
    summary="Restart Worker",
    description="Trigger a restart of the worker pod."
)
async def restart_worker(
    hostname: str,
    worker_service: WorkerService = Depends(get_worker_service)
) -> WorkerRestartResponse:
    """
    Restart a specific worker.
    """
    try:
        success = await worker_service.restart_worker(hostname)
        if success:
            return WorkerRestartResponse(success=True, message=f"Restart initiated for {hostname}")
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to restart worker"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error restarting worker {hostname}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to restart worker {hostname}"
        )
