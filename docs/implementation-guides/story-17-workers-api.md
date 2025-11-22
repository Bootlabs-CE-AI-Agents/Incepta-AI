# Story 17: Backend Workers API - Implementation Guide

**Story ID:** nextjs-story-17-workers-api-backend
**Owner:** Charlie (Senior Dev)
**Duration:** 16 hours (2 days)
**Priority:** P0 - CRITICAL (BLOCKS Sprint 2)
**Date Created:** 2025-11-22

## Overview

This guide provides step-by-step implementation instructions for Story 17: Backend Workers API. This story is **CRITICAL PATH** - all Sprint 2 UI stories (18-21) depend on these endpoints.

**What We're Building:**
- REST API for Celery worker monitoring
- 3 endpoints: list workers, get logs, restart worker
- Integration with Celery inspect API
- OpenAPI documentation
- Comprehensive unit tests

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Testing Guide](#testing-guide)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Knowledge
- Python async/await patterns
- FastAPI routing and dependency injection
- Celery architecture (workers, queues, inspect API)
- Pydantic schemas
- Pytest with async support

### Environment Setup

```bash
# Ensure Celery is running with at least 1 worker
docker-compose up -d rabbitmq redis celery-worker

# Verify worker is online
docker-compose exec celery-worker celery -A src.workers.celery_app inspect active

# Expected output:
# -> celery-worker@hostname: OK
#     - empty  (or active tasks)
```

### Dependencies Already Installed
```python
# pyproject.toml or requirements.txt
fastapi>=0.104.0
celery>=5.3.0
pydantic>=2.0.0
pytest>=7.4.0
pytest-asyncio>=0.21.0
httpx>=0.24.0  # For testing
```

---

## Architecture Overview

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  /dashboard/workers → GET /api/workers                       │
│  /dashboard/workers/[id] → GET /api/workers/{id}/logs       │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP
┌─────────────────────────────────────────────────────────────┐
│                  FastAPI Backend (src/api/workers.py)        │
│  - Route handlers                                            │
│  - Request validation (Pydantic)                             │
│  - Response serialization                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│            Service Layer (src/services/worker_service.py)    │
│  - Business logic                                            │
│  - Celery inspect API calls                                  │
│  - Log aggregation                                           │
│  - Worker restart coordination                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Celery Infrastructure                     │
│  - RabbitMQ (message broker)                                 │
│  - Celery Workers (task execution)                           │
│  - Redis (result backend)                                    │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── api/
│   └── workers.py                 # NEW: FastAPI routes
├── services/
│   └── worker_service.py          # NEW: Business logic
├── schemas/
│   └── worker.py                  # NEW: Pydantic models
├── database/
│   └── models.py                  # MODIFY: Add WorkerLog model (optional)
└── workers/
    └── celery_app.py              # EXISTING: Celery app instance

tests/
├── unit/
│   ├── test_worker_service.py     # NEW: Service tests
│   └── test_worker_api.py         # NEW: API tests
└── integration/
    └── test_worker_integration.py # NEW: End-to-end tests
```

---

## Step-by-Step Implementation

### Step 1: Create Pydantic Schemas (30 minutes)

Create `src/schemas/worker.py`:

```python
"""Pydantic schemas for Celery worker monitoring."""

from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, validator


class WorkerStatus(BaseModel):
    """Single Celery worker status."""

    id: str = Field(..., description="Unique worker identifier (e.g., 'worker-1@hostname')")
    status: Literal["online", "offline"] = Field(..., description="Worker connectivity status")
    active_tasks: int = Field(0, ge=0, description="Number of currently executing tasks")
    processed_tasks: int = Field(0, ge=0, description="Total tasks processed since startup")
    success_rate: float = Field(0.0, ge=0.0, le=1.0, description="Task success rate (0.0-1.0)")
    avg_task_duration_ms: float = Field(0.0, ge=0.0, description="Average task duration in milliseconds")
    last_heartbeat: Optional[datetime] = Field(None, description="Last heartbeat timestamp")
    uptime_seconds: int = Field(0, ge=0, description="Worker uptime in seconds")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "worker-1@hostname",
                "status": "online",
                "active_tasks": 3,
                "processed_tasks": 1524,
                "success_rate": 0.98,
                "avg_task_duration_ms": 1250.5,
                "last_heartbeat": "2025-11-22T10:30:00Z",
                "uptime_seconds": 86400,
            }
        }


class WorkersListResponse(BaseModel):
    """Response for GET /api/workers."""

    workers: List[WorkerStatus] = Field(default_factory=list, description="List of all workers")
    total_count: int = Field(0, ge=0, description="Total number of workers")

    class Config:
        json_schema_extra = {
            "example": {
                "workers": [
                    {
                        "id": "worker-1@hostname",
                        "status": "online",
                        "active_tasks": 3,
                        "processed_tasks": 1524,
                        "success_rate": 0.98,
                        "avg_task_duration_ms": 1250.5,
                        "last_heartbeat": "2025-11-22T10:30:00Z",
                        "uptime_seconds": 86400,
                    }
                ],
                "total_count": 1,
            }
        }


class WorkerLog(BaseModel):
    """Single worker log entry."""

    timestamp: datetime = Field(..., description="Log timestamp")
    level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(..., description="Log level")
    task_id: Optional[str] = Field(None, description="Associated task ID")
    message: str = Field(..., description="Log message")
    worker_id: str = Field(..., description="Worker that generated the log")

    class Config:
        json_schema_extra = {
            "example": {
                "timestamp": "2025-11-22T10:30:15.234Z",
                "level": "INFO",
                "task_id": "abc-123",
                "message": "Task completed successfully",
                "worker_id": "worker-1@hostname",
            }
        }


class WorkerLogsResponse(BaseModel):
    """Response for GET /api/workers/{id}/logs."""

    logs: List[WorkerLog] = Field(default_factory=list, description="List of log entries")
    total_count: int = Field(0, ge=0, description="Total number of matching logs")
    has_more: bool = Field(False, description="Whether more logs are available")

    class Config:
        json_schema_extra = {
            "example": {
                "logs": [
                    {
                        "timestamp": "2025-11-22T10:30:15.234Z",
                        "level": "INFO",
                        "task_id": "abc-123",
                        "message": "Task completed successfully",
                        "worker_id": "worker-1@hostname",
                    }
                ],
                "total_count": 5432,
                "has_more": True,
            }
        }


class WorkerRestartRequest(BaseModel):
    """Request body for POST /api/workers/{id}/restart."""

    graceful: bool = Field(True, description="Wait for active tasks to complete before restart")
    timeout_seconds: int = Field(300, ge=0, le=600, description="Maximum wait time (0-600 seconds)")

    class Config:
        json_schema_extra = {
            "example": {
                "graceful": True,
                "timeout_seconds": 300,
            }
        }


class WorkerRestartResponse(BaseModel):
    """Response for POST /api/workers/{id}/restart."""

    worker_id: str = Field(..., description="Worker identifier")
    status: Literal["restarting", "failed"] = Field(..., description="Restart status")
    estimated_completion: Optional[datetime] = Field(None, description="Estimated restart completion time")
    active_tasks_count: int = Field(0, ge=0, description="Number of tasks waiting to complete")

    class Config:
        json_schema_extra = {
            "example": {
                "worker_id": "worker-1@hostname",
                "status": "restarting",
                "estimated_completion": "2025-11-22T10:35:00Z",
                "active_tasks_count": 2,
            }
        }
```

**Why This Matters:**
- Type-safe request/response validation
- Automatic OpenAPI schema generation
- Clear API contracts for frontend developers
- Built-in example data for documentation

---

### Step 2: Implement Worker Service (4 hours)

Create `src/services/worker_service.py`:

```python
"""Business logic for Celery worker monitoring."""

import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from celery import Celery
from celery.app.control import Inspect

from src.schemas.worker import (
    WorkerStatus,
    WorkersListResponse,
    WorkerLog,
    WorkerLogsResponse,
    WorkerRestartResponse,
)
from src.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


class WorkerService:
    """Service for interacting with Celery workers."""

    def __init__(self, celery_instance: Celery = celery_app):
        """Initialize worker service with Celery app instance."""
        self.celery = celery_instance
        self.inspect: Inspect = celery_instance.control.inspect()

    async def list_workers(self) -> WorkersListResponse:
        """
        List all Celery workers with their current status.

        Returns:
            WorkersListResponse: List of workers with status information.

        Raises:
            RuntimeError: If unable to inspect workers.
        """
        try:
            # Get active workers
            active_workers = self.inspect.active()
            stats = self.inspect.stats()
            registered = self.inspect.registered()

            if active_workers is None:
                logger.warning("No active workers found (inspect returned None)")
                return WorkersListResponse(workers=[], total_count=0)

            workers: List[WorkerStatus] = []

            for worker_id in active_workers.keys():
                try:
                    worker_status = await self._build_worker_status(
                        worker_id=worker_id,
                        active_tasks=active_workers.get(worker_id, []),
                        stats=stats.get(worker_id) if stats else None,
                    )
                    workers.append(worker_status)
                except Exception as e:
                    logger.error(f"Error building status for worker {worker_id}: {e}")
                    continue

            return WorkersListResponse(
                workers=workers,
                total_count=len(workers),
            )

        except Exception as e:
            logger.error(f"Error listing workers: {e}")
            raise RuntimeError(f"Failed to inspect workers: {e}")

    async def _build_worker_status(
        self,
        worker_id: str,
        active_tasks: List[Dict[str, Any]],
        stats: Optional[Dict[str, Any]],
    ) -> WorkerStatus:
        """
        Build WorkerStatus from Celery inspect data.

        Args:
            worker_id: Worker identifier.
            active_tasks: List of active tasks on this worker.
            stats: Worker statistics from inspect.stats().

        Returns:
            WorkerStatus: Populated worker status object.
        """
        # Parse stats if available
        total_tasks = 0
        success_rate = 0.0
        avg_duration_ms = 0.0
        uptime_seconds = 0

        if stats:
            total_tasks = stats.get("total", {}).get("tasks.completed", 0)
            failed_tasks = stats.get("total", {}).get("tasks.failed", 0)

            if total_tasks + failed_tasks > 0:
                success_rate = total_tasks / (total_tasks + failed_tasks)

            # Calculate average duration (simplified - in production use metrics)
            avg_duration_ms = stats.get("avg_duration_ms", 0.0)

            # Uptime from worker stats
            uptime_seconds = stats.get("uptime", 0)

        return WorkerStatus(
            id=worker_id,
            status="online",
            active_tasks=len(active_tasks),
            processed_tasks=total_tasks,
            success_rate=success_rate,
            avg_task_duration_ms=avg_duration_ms,
            last_heartbeat=datetime.utcnow(),  # Approximation
            uptime_seconds=uptime_seconds,
        )

    async def get_worker_logs(
        self,
        worker_id: str,
        limit: int = 100,
        offset: int = 0,
        level: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> WorkerLogsResponse:
        """
        Get logs for a specific worker.

        Args:
            worker_id: Worker identifier.
            limit: Maximum number of logs to return (1-1000).
            offset: Number of logs to skip.
            level: Filter by log level (DEBUG, INFO, WARNING, ERROR, CRITICAL).
            start_time: Filter logs after this timestamp.
            end_time: Filter logs before this timestamp.

        Returns:
            WorkerLogsResponse: List of log entries.

        Raises:
            ValueError: If worker_id not found.
        """
        # Validate limit
        limit = max(1, min(limit, 1000))

        # Check worker exists
        active_workers = self.inspect.active()
        if active_workers is None or worker_id not in active_workers:
            raise ValueError(f"Worker {worker_id} not found")

        # TODO: Implement log aggregation
        # For now, return mock data - in production, integrate with:
        # 1. Celery events for real-time logs
        # 2. Centralized logging (ELK, Loki, CloudWatch)
        # 3. Database-backed log storage

        logger.warning(
            f"Log retrieval not yet implemented for worker {worker_id}. "
            "Returning empty response. Integrate with logging backend in production."
        )

        return WorkerLogsResponse(
            logs=[],
            total_count=0,
            has_more=False,
        )

    async def restart_worker(
        self,
        worker_id: str,
        graceful: bool = True,
        timeout_seconds: int = 300,
    ) -> WorkerRestartResponse:
        """
        Restart a specific Celery worker.

        Args:
            worker_id: Worker identifier.
            graceful: Wait for active tasks to complete.
            timeout_seconds: Maximum wait time for graceful shutdown (0-600).

        Returns:
            WorkerRestartResponse: Restart status.

        Raises:
            ValueError: If worker_id not found.
            RuntimeError: If restart fails.
        """
        # Check worker exists
        active_workers = self.inspect.active()
        if active_workers is None or worker_id not in active_workers:
            raise ValueError(f"Worker {worker_id} not found")

        # Get active tasks count
        active_tasks = active_workers.get(worker_id, [])
        active_count = len(active_tasks)

        try:
            # Send shutdown signal via Celery control
            # pool_restart: restart worker pool
            # For graceful shutdown, use warm_shutdown=True
            if graceful:
                self.celery.control.pool_restart(
                    destination=[worker_id],
                    reload=True,  # Reload code
                )
            else:
                # Force restart (kill active tasks)
                self.celery.control.shutdown(
                    destination=[worker_id],
                    reply=True,
                )

            # Estimate completion time
            estimated_completion = datetime.utcnow() + timedelta(
                seconds=min(timeout_seconds, active_count * 30)  # Estimate 30s per task
            )

            return WorkerRestartResponse(
                worker_id=worker_id,
                status="restarting",
                estimated_completion=estimated_completion,
                active_tasks_count=active_count,
            )

        except Exception as e:
            logger.error(f"Error restarting worker {worker_id}: {e}")
            return WorkerRestartResponse(
                worker_id=worker_id,
                status="failed",
                estimated_completion=None,
                active_tasks_count=active_count,
            )
```

**Implementation Notes:**

1. **Celery Inspect API:**
   - `inspect.active()`: Get currently executing tasks
   - `inspect.stats()`: Get worker statistics
   - `inspect.registered()`: Get registered tasks

2. **Log Aggregation (TODO):**
   - Current implementation returns empty logs
   - Production should integrate with:
     - Celery events API for real-time logs
     - Centralized logging (ELK, CloudWatch Logs)
     - Database-backed log storage

3. **Worker Restart:**
   - `pool_restart()`: Graceful restart (finishes active tasks)
   - `shutdown()`: Force shutdown (kills active tasks)

---

### Step 3: Create FastAPI Routes (2 hours)

Create `src/api/workers.py`:

```python
"""FastAPI routes for Celery worker monitoring."""

import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends, status
from fastapi.responses import JSONResponse

from src.schemas.worker import (
    WorkersListResponse,
    WorkerLogsResponse,
    WorkerRestartRequest,
    WorkerRestartResponse,
)
from src.services.worker_service import WorkerService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/workers", tags=["workers"])


def get_worker_service() -> WorkerService:
    """Dependency injection for WorkerService."""
    return WorkerService()


@router.get(
    "",
    response_model=WorkersListResponse,
    summary="List all Celery workers",
    description="Get status information for all active Celery workers.",
    responses={
        200: {
            "description": "Successfully retrieved worker list",
            "model": WorkersListResponse,
        },
        503: {
            "description": "Service unavailable - unable to inspect workers",
        },
    },
)
async def list_workers(
    worker_service: WorkerService = Depends(get_worker_service),
) -> WorkersListResponse:
    """
    List all active Celery workers with their current status.

    Returns worker information including:
    - Worker ID
    - Online/offline status
    - Active tasks count
    - Total processed tasks
    - Success rate
    - Average task duration
    - Last heartbeat
    - Uptime
    """
    try:
        return await worker_service.list_workers()
    except RuntimeError as e:
        logger.error(f"Error listing workers: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to inspect workers: {str(e)}",
        )


@router.get(
    "/{worker_id}/logs",
    response_model=WorkerLogsResponse,
    summary="Get worker logs",
    description="Retrieve logs for a specific Celery worker with pagination and filtering.",
    responses={
        200: {
            "description": "Successfully retrieved logs",
            "model": WorkerLogsResponse,
        },
        404: {
            "description": "Worker not found",
        },
    },
)
async def get_worker_logs(
    worker_id: str,
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of logs to return"),
    offset: int = Query(0, ge=0, description="Number of logs to skip"),
    level: Optional[str] = Query(None, regex="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$", description="Filter by log level"),
    start_time: Optional[datetime] = Query(None, description="Filter logs after this timestamp"),
    end_time: Optional[datetime] = Query(None, description="Filter logs before this timestamp"),
    worker_service: WorkerService = Depends(get_worker_service),
) -> WorkerLogsResponse:
    """
    Get logs for a specific worker with pagination and filtering.

    Query Parameters:
    - **limit**: Maximum logs to return (1-1000, default 100)
    - **offset**: Skip this many logs (for pagination)
    - **level**: Filter by log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    - **start_time**: Only logs after this time (ISO8601 format)
    - **end_time**: Only logs before this time (ISO8601 format)

    Returns paginated log entries with total count and pagination info.
    """
    try:
        return await worker_service.get_worker_logs(
            worker_id=worker_id,
            limit=limit,
            offset=offset,
            level=level,
            start_time=start_time,
            end_time=end_time,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Error retrieving logs for worker {worker_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve logs: {str(e)}",
        )


@router.post(
    "/{worker_id}/restart",
    response_model=WorkerRestartResponse,
    summary="Restart worker",
    description="Gracefully or forcefully restart a Celery worker.",
    responses={
        200: {
            "description": "Worker restart initiated successfully",
            "model": WorkerRestartResponse,
        },
        404: {
            "description": "Worker not found",
        },
        503: {
            "description": "Worker restart failed",
        },
    },
)
async def restart_worker(
    worker_id: str,
    restart_request: WorkerRestartRequest,
    worker_service: WorkerService = Depends(get_worker_service),
) -> WorkerRestartResponse:
    """
    Restart a specific Celery worker.

    Request Body:
    - **graceful**: If true, wait for active tasks to complete before restart
    - **timeout_seconds**: Maximum wait time for graceful shutdown (0-600 seconds)

    Returns restart status and estimated completion time.

    **Warning:** Forceful restart (graceful=false) will terminate active tasks!
    """
    try:
        response = await worker_service.restart_worker(
            worker_id=worker_id,
            graceful=restart_request.graceful,
            timeout_seconds=restart_request.timeout_seconds,
        )

        if response.status == "failed":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Worker restart failed for {worker_id}",
            )

        return response

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error restarting worker {worker_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to restart worker: {str(e)}",
        )
```

**Register Router in Main App:**

Edit `src/main.py` (or wherever FastAPI app is initialized):

```python
from src.api import workers  # Import new router

app = FastAPI(title="AI Agents API")

# Register workers router
app.include_router(workers.router)
```

---

### Step 4: Update OpenAPI Documentation (1 hour)

Add endpoint documentation to `openapi.yaml` (if using separate spec file):

```yaml
/api/workers:
  get:
    summary: List all Celery workers
    description: Get status information for all active Celery workers
    tags:
      - workers
    responses:
      '200':
        description: Successfully retrieved worker list
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/WorkersListResponse'
            example:
              workers:
                - id: "worker-1@hostname"
                  status: "online"
                  active_tasks: 3
                  processed_tasks: 1524
                  success_rate: 0.98
                  avg_task_duration_ms: 1250.5
                  last_heartbeat: "2025-11-22T10:30:00Z"
                  uptime_seconds: 86400
              total_count: 1
      '503':
        description: Service unavailable - unable to inspect workers

/api/workers/{worker_id}/logs:
  get:
    summary: Get worker logs
    description: Retrieve logs for a specific worker with pagination
    tags:
      - workers
    parameters:
      - name: worker_id
        in: path
        required: true
        schema:
          type: string
        example: "worker-1@hostname"
      - name: limit
        in: query
        schema:
          type: integer
          minimum: 1
          maximum: 1000
          default: 100
      - name: offset
        in: query
        schema:
          type: integer
          minimum: 0
          default: 0
      - name: level
        in: query
        schema:
          type: string
          enum: [DEBUG, INFO, WARNING, ERROR, CRITICAL]
      - name: start_time
        in: query
        schema:
          type: string
          format: date-time
      - name: end_time
        in: query
        schema:
          type: string
          format: date-time
    responses:
      '200':
        description: Successfully retrieved logs
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/WorkerLogsResponse'
      '404':
        description: Worker not found

/api/workers/{worker_id}/restart:
  post:
    summary: Restart worker
    description: Gracefully or forcefully restart a Celery worker
    tags:
      - workers
    parameters:
      - name: worker_id
        in: path
        required: true
        schema:
          type: string
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/WorkerRestartRequest'
          example:
            graceful: true
            timeout_seconds: 300
    responses:
      '200':
        description: Worker restart initiated
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/WorkerRestartResponse'
      '404':
        description: Worker not found
      '503':
        description: Worker restart failed
```

**Note:** FastAPI automatically generates OpenAPI spec from Pydantic schemas and route decorators. The above YAML is for reference - you can use FastAPI's built-in `/docs` (Swagger UI) instead.

---

## Testing Guide

### Unit Tests (4 hours)

Create `tests/unit/test_worker_service.py`:

```python
"""Unit tests for WorkerService."""

import pytest
from datetime import datetime
from unittest.mock import Mock, patch, AsyncMock
from src.services.worker_service import WorkerService
from src.schemas.worker import WorkersListResponse, WorkerStatus


@pytest.fixture
def mock_celery_app():
    """Mock Celery app instance."""
    celery_mock = Mock()
    inspect_mock = Mock()
    celery_mock.control.inspect.return_value = inspect_mock
    return celery_mock, inspect_mock


@pytest.fixture
def worker_service(mock_celery_app):
    """WorkerService instance with mocked Celery."""
    celery_mock, _ = mock_celery_app
    return WorkerService(celery_instance=celery_mock)


@pytest.mark.asyncio
async def test_list_workers_success(worker_service, mock_celery_app):
    """Test successful worker listing."""
    _, inspect_mock = mock_celery_app

    # Mock inspect responses
    inspect_mock.active.return_value = {
        "worker-1@hostname": [],
    }
    inspect_mock.stats.return_value = {
        "worker-1@hostname": {
            "total": {"tasks.completed": 100, "tasks.failed": 2},
            "uptime": 3600,
        }
    }

    # Execute
    result = await worker_service.list_workers()

    # Verify
    assert isinstance(result, WorkersListResponse)
    assert result.total_count == 1
    assert len(result.workers) == 1

    worker = result.workers[0]
    assert worker.id == "worker-1@hostname"
    assert worker.status == "online"
    assert worker.processed_tasks == 100
    assert worker.success_rate == pytest.approx(0.98, rel=1e-2)


@pytest.mark.asyncio
async def test_list_workers_no_workers(worker_service, mock_celery_app):
    """Test listing when no workers are active."""
    _, inspect_mock = mock_celery_app
    inspect_mock.active.return_value = None

    result = await worker_service.list_workers()

    assert result.total_count == 0
    assert len(result.workers) == 0


@pytest.mark.asyncio
async def test_list_workers_inspect_failure(worker_service, mock_celery_app):
    """Test handling of inspect API failure."""
    _, inspect_mock = mock_celery_app
    inspect_mock.active.side_effect = Exception("Connection failed")

    with pytest.raises(RuntimeError, match="Failed to inspect workers"):
        await worker_service.list_workers()


@pytest.mark.asyncio
async def test_get_worker_logs_worker_not_found(worker_service, mock_celery_app):
    """Test log retrieval for non-existent worker."""
    _, inspect_mock = mock_celery_app
    inspect_mock.active.return_value = {"worker-1@hostname": []}

    with pytest.raises(ValueError, match="Worker worker-2@hostname not found"):
        await worker_service.get_worker_logs(worker_id="worker-2@hostname")


@pytest.mark.asyncio
async def test_restart_worker_success(worker_service, mock_celery_app):
    """Test successful worker restart."""
    celery_mock, inspect_mock = mock_celery_app
    inspect_mock.active.return_value = {
        "worker-1@hostname": [{"id": "task-1"}],  # 1 active task
    }

    result = await worker_service.restart_worker(
        worker_id="worker-1@hostname",
        graceful=True,
        timeout_seconds=300,
    )

    assert result.worker_id == "worker-1@hostname"
    assert result.status == "restarting"
    assert result.active_tasks_count == 1
    celery_mock.control.pool_restart.assert_called_once()


@pytest.mark.asyncio
async def test_restart_worker_not_found(worker_service, mock_celery_app):
    """Test restart for non-existent worker."""
    _, inspect_mock = mock_celery_app
    inspect_mock.active.return_value = {}

    with pytest.raises(ValueError, match="Worker worker-2@hostname not found"):
        await worker_service.restart_worker(worker_id="worker-2@hostname")
```

Create `tests/unit/test_worker_api.py`:

```python
"""Unit tests for worker API routes."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from src.main import app
from src.schemas.worker import WorkersListResponse, WorkerStatus


client = TestClient(app)


@pytest.mark.asyncio
async def test_list_workers_endpoint_success():
    """Test GET /api/workers returns worker list."""
    mock_response = WorkersListResponse(
        workers=[
            WorkerStatus(
                id="worker-1@hostname",
                status="online",
                active_tasks=3,
                processed_tasks=1524,
                success_rate=0.98,
                avg_task_duration_ms=1250.5,
                uptime_seconds=86400,
            )
        ],
        total_count=1,
    )

    with patch("src.api.workers.WorkerService.list_workers", return_value=mock_response):
        response = client.get("/api/workers")

    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] == 1
    assert len(data["workers"]) == 1
    assert data["workers"][0]["id"] == "worker-1@hostname"


@pytest.mark.asyncio
async def test_list_workers_endpoint_service_unavailable():
    """Test GET /api/workers handles service errors."""
    with patch(
        "src.api.workers.WorkerService.list_workers",
        side_effect=RuntimeError("Connection failed"),
    ):
        response = client.get("/api/workers")

    assert response.status_code == 503
    assert "Unable to inspect workers" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_worker_logs_endpoint_success():
    """Test GET /api/workers/{id}/logs with query params."""
    from src.schemas.worker import WorkerLogsResponse

    mock_response = WorkerLogsResponse(logs=[], total_count=0, has_more=False)

    with patch("src.api.workers.WorkerService.get_worker_logs", return_value=mock_response):
        response = client.get(
            "/api/workers/worker-1@hostname/logs",
            params={"limit": 50, "offset": 0, "level": "INFO"},
        )

    assert response.status_code == 200
    data = response.json()
    assert "logs" in data


@pytest.mark.asyncio
async def test_get_worker_logs_endpoint_not_found():
    """Test GET /api/workers/{id}/logs for invalid worker."""
    with patch(
        "src.api.workers.WorkerService.get_worker_logs",
        side_effect=ValueError("Worker not found"),
    ):
        response = client.get("/api/workers/invalid-worker/logs")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_restart_worker_endpoint_success():
    """Test POST /api/workers/{id}/restart."""
    from src.schemas.worker import WorkerRestartResponse
    from datetime import datetime

    mock_response = WorkerRestartResponse(
        worker_id="worker-1@hostname",
        status="restarting",
        estimated_completion=datetime.utcnow(),
        active_tasks_count=2,
    )

    with patch("src.api.workers.WorkerService.restart_worker", return_value=mock_response):
        response = client.post(
            "/api/workers/worker-1@hostname/restart",
            json={"graceful": True, "timeout_seconds": 300},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "restarting"
```

### Run Tests

```bash
# Run all worker tests
pytest tests/unit/test_worker_service.py tests/unit/test_worker_api.py -v

# Run with coverage
pytest tests/unit/test_worker_service.py tests/unit/test_worker_api.py \
  --cov=src/services/worker_service \
  --cov=src/api/workers \
  --cov-report=term-missing \
  --cov-fail-under=80
```

---

## Troubleshooting

### Issue 1: Celery Inspect Returns None

**Symptom:** `inspect.active()` returns `None` instead of worker dict.

**Cause:** No workers are running or RabbitMQ connection failed.

**Solution:**
```bash
# Check Celery worker is running
docker-compose ps celery-worker

# View worker logs
docker-compose logs celery-worker

# Restart worker
docker-compose restart celery-worker

# Verify RabbitMQ connection
docker-compose logs rabbitmq
```

### Issue 2: Worker Restart Doesn't Work

**Symptom:** `pool_restart()` call doesn't restart worker.

**Cause:** Worker doesn't support pool restart, or wrong destination format.

**Solution:**
```python
# Verify destination format includes hostname
destination = ["worker-1@hostname"]  # CORRECT
# destination = ["worker-1"]  # WRONG (missing hostname)

# Try alternative restart methods
self.celery.control.shutdown(destination=[worker_id], reply=True)
```

### Issue 3: Import Errors in Tests

**Symptom:** `ModuleNotFoundError: No module named 'src'`

**Cause:** Python path not set correctly.

**Solution:**
```bash
# Add project root to PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Or use pytest.ini
# pythonpath = .

# Or install package in editable mode
pip install -e .
```

---

## Next Steps

After completing Story 17:

1. **Merge to Main:**
   ```bash
   git add src/ tests/ openapi.yaml
   git commit -m "feat: Backend Workers API (Story 17)

   - Implement GET /api/workers
   - Implement GET /api/workers/{id}/logs
   - Implement POST /api/workers/{id}/restart
   - Add comprehensive unit tests (>80% coverage)
   - Update OpenAPI documentation"

   git push origin feature/story-17-workers-api
   ```

2. **Create Pull Request:**
   - Use `.github/PULL_REQUEST_TEMPLATE.md`
   - Fill out Technical Debt section
   - Request code review from senior dev

3. **Unblock Sprint 2:**
   - Notify frontend team (Amelia) that endpoints are available
   - Provide OpenAPI spec link
   - Share example request/response payloads

4. **Monitor Production:**
   - Set up Prometheus metrics for worker endpoints
   - Configure alerting for worker offline status
   - Monitor API response times

---

**Document Owner:** Charlie (Senior Dev)
**Created:** 2025-11-22
**Last Updated:** 2025-11-22
**Related:** Story 17, Sprint 2 Preparation Plan
