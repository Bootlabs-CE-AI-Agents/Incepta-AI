# Story 0.3: Queue Management API - Implementation Plan

**Status**: Ready for Implementation
**Priority**: P0 (Production Blocker)
**Effort**: M (3-5 days)
**Dependencies**: Story 0.1 (Dashboard) complete, Story 0.2 (Operations verification) complete

---

## Summary

Implement 6 REST API endpoints to support the Operations page queue management functionality. Frontend components are production-ready and waiting for backend support.

**Completed**:
- ✅ Pydantic schemas created (`src/schemas/queue.py`)
- ✅ Frontend components verified (100% complete)
- ✅ API client and hooks verified (React Query patterns)

**Remaining**:
- ⏳ Create `src/services/queue_service.py` (business logic layer)
- ⏳ Create `src/api/queue.py` (FastAPI router)
- ⏳ Register router in `src/main.py`
- ⏳ Write unit tests
- ⏳ Test end-to-end with frontend

---

## Implementation Guide

### Step 1: Create Queue Service Layer

**File**: `src/services/queue_service.py`

This service will handle:
1. Celery integration for queue inspection
2. Redis operations for pause/resume
3. Database queries for execution history
4. IST timezone conversion

**Key Methods Needed**:

```python
class QueueService:
    """
    Service layer for queue management operations.

    Integrates with Celery for queue inspection, Redis for pause/resume,
    and PostgreSQL for execution history.
    """

    def __init__(self):
        self.redis_client = get_redis_client()
        self.celery_app = celery_app  # from src.workers.celery_app
        self.IST = pytz.timezone("Asia/Kolkata")

    async def get_queue_status(self, tenant_id: str, db: AsyncSession) -> QueueStatus:
        """
        Get current queue metrics.

        Returns:
            QueueStatus with depth, processing_rate, avg_wait_time, failed_tasks_24h, is_paused

        Data Sources:
            - depth: Celery inspect().reserved() or Redis llen("celery")
            - processing_rate: COUNT(*) from agent_test_executions WHERE created_at > NOW() - 5min
            - avg_wait_time: AVG(started_at - created_at) WHERE started_at > NOW() - 1hour
            - failed_tasks_24h: COUNT(*) WHERE status='failed' AND created_at > NOW() - 24h
            - is_paused: Redis.get("queue_paused") == "true"
        """
        pass

    async def get_depth_history(
        self,
        tenant_id: str,
        start_time: datetime,
        end_time: datetime,
        db: AsyncSession
    ) -> List[QueueDepthDataPoint]:
        """
        Get queue depth time series.

        Options:
        A. If Redis stores snapshots: ZRANGEBYSCORE queue_depth_history <start> <end>
        B. If no snapshots: Query agent_test_executions and calculate in-flight tasks

        Returns: List of (timestamp, depth) tuples
        """
        pass

    async def get_queue_tasks(
        self,
        tenant_id: str,
        page: int,
        limit: int,
        status: Optional[str],
        db: AsyncSession
    ) -> TaskListResponse:
        """
        Get paginated list of tasks in queue.

        Query: SELECT * FROM agent_test_executions
               WHERE tenant_id = ? AND status IN ('pending', 'processing')
               ORDER BY created_at DESC
               LIMIT ? OFFSET ?

        Returns: TaskListResponse with tasks, total, page, pages
        """
        pass

    async def cancel_task(
        self,
        tenant_id: str,
        task_id: str,
        db: AsyncSession
    ) -> None:
        """
        Cancel a pending or processing task.

        Steps:
        1. Verify task belongs to tenant
        2. Verify status is 'pending' or 'processing'
        3. Call Celery: celery_app.control.revoke(task_id, terminate=True)
        4. Update DB: status='cancelled', error_message='Cancelled by user'
        """
        pass

    async def pause_queue(self, reason: Optional[str] = None) -> None:
        """
        Pause queue processing.

        Steps:
        1. Redis.set("queue_paused", "true")
        2. Optional: Log to audit_logs table
        """
        pass

    async def resume_queue(self) -> None:
        """
        Resume queue processing.

        Steps:
        1. Redis.delete("queue_paused")
        2. Optional: Log to audit_logs table
        """
        pass
```

**Dependencies**:
- `from src.cache.redis_client import get_redis_client`
- `from src.workers.celery_app import celery_app`
- `from src.database.models import AgentTestExecution` (or similar)
- `import pytz`

**IST Timezone Handling**:
```python
def _to_ist(self, dt: datetime) -> datetime:
    """Convert UTC datetime to IST."""
    if dt.tzinfo is None:
        dt = pytz.utc.localize(dt)
    return dt.astimezone(self.IST)

def _get_ist_now(self) -> datetime:
    """Get current IST time."""
    return datetime.now(self.IST)
```

---

### Step 2: Create Queue API Router

**File**: `src/api/queue.py`

FastAPI router with 6 endpoints:

```python
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
from src.schemas.queue import (
    QueueStatus,
    QueueDepthDataPoint,
    TaskListResponse,
    PauseQueueRequest,
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
            detail="Failed to retrieve queue status"
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
        f"Queue metrics requested for tenant {tenant_id}: "
        f"{start_time} to {end_time}"
    )
    try:
        return await service.get_depth_history(tenant_id, start_time, end_time, db)
    except Exception as e:
        logger.error(f"Failed to get queue metrics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve queue metrics"
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
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
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
            detail="Failed to retrieve queue tasks"
        )


@router.delete(
    "/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cancel Task",
    description=(
        "Cancel a pending or processing task. "
        "Requires tenant_admin or operator role. "
        "Revokes Celery task and updates execution status to 'cancelled'."
    ),
)
async def cancel_task(
    task_id: str,
    tenant_id: str = Depends(get_tenant_id),
    _role_check=Depends(require_role(["tenant_admin", "operator"])),
    db: AsyncSession = Depends(get_tenant_db),
    service: QueueService = Depends(get_queue_service),
) -> None:
    """Cancel a task in the queue."""
    logger.info(f"Cancel task requested: {task_id} (tenant: {tenant_id})")
    try:
        await service.cancel_task(tenant_id, task_id, db)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to cancel task: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel task"
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
    _role_check=Depends(require_role(["tenant_admin"])),
    service: QueueService = Depends(get_queue_service),
) -> None:
    """Pause queue processing."""
    logger.warning(f"Queue pause requested: {request.reason or 'No reason provided'}")
    try:
        await service.pause_queue(request.reason)
    except Exception as e:
        logger.error(f"Failed to pause queue: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to pause queue"
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
    _role_check=Depends(require_role(["tenant_admin"])),
    service: QueueService = Depends(get_queue_service),
) -> None:
    """Resume queue processing."""
    logger.info("Queue resume requested")
    try:
        await service.resume_queue()
    except Exception as e:
        logger.error(f"Failed to resume queue: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resume queue"
        )
```

**Note on RBAC**:
- `require_role()` dependency should be added to `src/api/dependencies.py` if it doesn't exist
- Alternative: Use existing auth dependencies and check `session.user.role` manually

---

### Step 3: Register Router in Main

**File**: `src/main.py`

Add to imports:
```python
from src.api import queue
```

Add to router registration section (around line 86):
```python
app.include_router(queue.router)  # Story 0.3: Queue management endpoints
```

---

### Step 4: Testing Plan

#### Unit Tests

**File**: `tests/unit/test_queue_service.py`

```python
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta

from src.services.queue_service import QueueService
from src.schemas.queue import QueueStatus, QueueTask


@pytest.fixture
def queue_service():
    return QueueService()


@pytest.fixture
def mock_db():
    return AsyncMock()


class TestQueueService:
    """Test suite for QueueService."""

    @pytest.mark.asyncio
    async def test_get_queue_status_success(self, queue_service, mock_db):
        """Test successful queue status retrieval."""
        with patch.object(queue_service, 'redis_client') as mock_redis, \
             patch.object(queue_service, 'celery_app') as mock_celery:

            # Mock Redis pause state
            mock_redis.get.return_value = None

            # Mock Celery queue depth
            mock_celery.control.inspect().reserved.return_value = {'worker1': []}

            # Mock database query (processing rate, wait time, failed tasks)
            mock_db.execute = AsyncMock(return_value=MagicMock(
                scalars=MagicMock(return_value=MagicMock(
                    all=MagicMock(return_value=[5.3, 45.2, 3])
                ))
            ))

            status = await queue_service.get_queue_status("tenant-123", mock_db)

            assert isinstance(status, QueueStatus)
            assert status.is_paused is False
            assert status.depth >= 0

    @pytest.mark.asyncio
    async def test_cancel_task_not_found(self, queue_service, mock_db):
        """Test cancelling non-existent task raises ValueError."""
        mock_db.execute = AsyncMock(return_value=MagicMock(
            scalar_one_or_none=MagicMock(return_value=None)
        ))

        with pytest.raises(ValueError, match="Task not found"):
            await queue_service.cancel_task("tenant-123", "invalid-id", mock_db)

    # Add more tests for pause/resume, depth history, task listing, etc.
```

#### Integration Tests

**File**: `tests/integration/test_queue_api.py`

```python
import pytest
from httpx import AsyncClient
from unittest.mock import patch

from src.main import app


@pytest.mark.asyncio
async def test_get_queue_status_endpoint(test_client: AsyncClient):
    """Test GET /api/v1/queue/status endpoint."""
    response = await test_client.get(
        "/api/v1/queue/status",
        headers={"X-Tenant-ID": "test-tenant"}
    )

    assert response.status_code == 200
    data = response.json()
    assert "depth" in data
    assert "processing_rate" in data
    assert "avg_wait_time" in data
    assert "failed_tasks_24h" in data
    assert "is_paused" in data


@pytest.mark.asyncio
async def test_pause_queue_requires_admin_role(test_client: AsyncClient):
    """Test pause endpoint requires tenant_admin role."""
    response = await test_client.post(
        "/api/v1/queue/pause",
        json={"reason": "Test pause"},
        headers={"X-Tenant-ID": "test-tenant", "X-User-Role": "viewer"}
    )

    assert response.status_code == 403


# Add more E2E tests for all endpoints
```

---

## Acceptance Criteria

✅ **AC1**: GET /api/v1/queue/status returns current metrics
- Queue depth (integer)
- Processing rate (float, tasks/min)
- Average wait time (float, seconds)
- Failed tasks 24h (integer)
- Is paused (boolean)

✅ **AC2**: GET /api/v1/queue/metrics returns time-series data
- List of (timestamp, depth) tuples
- Supports custom time ranges via query params
- Returns data in IST timezone

✅ **AC3**: GET /api/v1/queue/tasks returns paginated task list
- Supports page/limit pagination
- Optional status filter (pending/processing/completed/failed)
- Returns TaskListResponse with tasks, total, page, pages

✅ **AC4**: DELETE /api/v1/queue/tasks/{task_id} cancels task
- Verifies tenant ownership
- Verifies status is pending/processing
- Revokes Celery task
- Updates database status to 'cancelled'
- Requires tenant_admin or operator role

✅ **AC5**: POST /api/v1/queue/pause pauses queue
- Sets Redis flag: `queue_paused = "true"`
- Requires tenant_admin role
- Optional reason parameter

✅ **AC6**: POST /api/v1/queue/resume resumes queue
- Deletes Redis flag: `queue_paused`
- Requires tenant_admin role

✅ **AC7**: All endpoints enforce tenant isolation
- Filter by tenant_id from auth session
- Prevent cross-tenant data access

✅ **AC8**: All timestamps use IST (Asia/Kolkata) timezone
- created_at, queued_at, timestamp fields in IST
- Consistent with Dashboard API (Story 0.1)

---

## Implementation Checklist

- [ ] Create `src/services/queue_service.py`
  - [ ] Implement `get_queue_status()`
  - [ ] Implement `get_depth_history()`
  - [ ] Implement `get_queue_tasks()`
  - [ ] Implement `cancel_task()`
  - [ ] Implement `pause_queue()`
  - [ ] Implement `resume_queue()`
  - [ ] Add IST timezone helpers

- [ ] Create `src/api/queue.py`
  - [ ] Implement GET `/status` endpoint
  - [ ] Implement GET `/metrics` endpoint
  - [ ] Implement GET `/tasks` endpoint
  - [ ] Implement DELETE `/tasks/{task_id}` endpoint
  - [ ] Implement POST `/pause` endpoint
  - [ ] Implement POST `/resume` endpoint

- [ ] Register router in `src/main.py`

- [ ] Write unit tests (`tests/unit/test_queue_service.py`)
  - [ ] Test queue status calculation
  - [ ] Test depth history retrieval
  - [ ] Test task listing with pagination
  - [ ] Test cancel task (success + error cases)
  - [ ] Test pause/resume operations

- [ ] Write integration tests (`tests/integration/test_queue_api.py`)
  - [ ] Test all 6 endpoints with real API calls
  - [ ] Test RBAC enforcement
  - [ ] Test tenant isolation
  - [ ] Test error handling (404, 403, 500)

- [ ] Manual testing with frontend
  - [ ] Verify QueueStatus component displays metrics
  - [ ] Verify QueueDepthChart renders time-series
  - [ ] Verify TaskList shows paginated tasks
  - [ ] Verify cancel action works with RBAC
  - [ ] Verify pause/resume toggle works

- [ ] Validate Python syntax: `python3 -m py_compile src/services/queue_service.py src/api/queue.py`

- [ ] Run tests: `pytest tests/unit/test_queue_service.py tests/integration/test_queue_api.py -v`

---

## Notes for Implementation

1. **Celery Integration**: Use `from src.workers.celery_app import celery_app` for queue inspection
2. **Redis Keys**: Use consistent naming: `queue_paused`, `queue_depth_history:<timestamp>`
3. **Database Table**: Likely `agent_test_executions` or similar—verify with `src/database/models.py`
4. **Error Handling**: All service methods should raise specific exceptions (ValueError, PermissionError) that router converts to HTTP errors
5. **Logging**: Use structured logging with tenant_id context
6. **Caching**: Consider caching queue status for 2-3 seconds to reduce load (optional)

---

## Dependencies

- ✅ `src/schemas/queue.py` - Already created
- ✅ `src/cache/redis_client.py` - Exists
- ✅ `src/workers/celery_app.py` - Exists
- ✅ `src/database/models.py` - Exists (verify execution table name)
- ⚠️ `src/api/dependencies.py` - May need to add `require_role()` function

---

**End of Implementation Plan**
