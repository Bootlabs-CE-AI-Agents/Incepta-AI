"""
Queue Management Schemas

Pydantic models for queue operations API including status monitoring,
task management, and queue control operations.

Story 0.3: Queue Management API Implementation
"""

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class QueueStatus(BaseModel):
    """
    Current queue status metrics.

    Provides real-time snapshot of queue health including depth,
    processing rate, wait times, and error counts.
    """
    depth: int = Field(..., description="Current number of tasks in queue", ge=0)
    processing_rate: float = Field(..., description="Tasks processed per minute (last 5 min)", ge=0.0)
    avg_wait_time: float = Field(..., description="Average wait time in seconds (last hour)", ge=0.0)
    failed_tasks_24h: int = Field(..., description="Failed tasks in last 24 hours", ge=0)
    is_paused: bool = Field(..., description="Whether queue processing is paused")

    class Config:
        json_schema_extra = {
            "example": {
                "depth": 12,
                "processing_rate": 5.3,
                "avg_wait_time": 45.2,
                "failed_tasks_24h": 3,
                "is_paused": False
            }
        }


class QueueDepthDataPoint(BaseModel):
    """
    Single data point in queue depth history time series.

    Used for charting queue depth over time.
    """
    timestamp: datetime = Field(..., description="Timestamp in IST (Asia/Kolkata)")
    depth: int = Field(..., description="Queue depth at this timestamp", ge=0)

    class Config:
        json_schema_extra = {
            "example": {
                "timestamp": "2025-01-21T14:30:00+05:30",
                "depth": 15
            }
        }


class QueueTask(BaseModel):
    """
    Task in the processing queue.

    Represents a single agent execution task with its current status
    and metadata for display in the task list UI.
    """
    id: str = Field(..., description="Execution ID (UUID)")
    agent_name: str = Field(..., description="Name of the agent")
    status: Literal["pending", "processing", "completed", "failed"] = Field(
        ..., description="Current task status"
    )
    queued_at: datetime = Field(..., description="When task was queued (IST)")
    priority: int = Field(..., description="Task priority: 1=High, 2=Normal, 3=Low", ge=1, le=3)
    tenant_id: str = Field(..., description="Tenant identifier")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "agent_name": "Customer Support Bot",
                "status": "processing",
                "queued_at": "2025-01-21T14:25:00+05:30",
                "priority": 2,
                "tenant_id": "tenant-123"
            }
        }


class TaskListResponse(BaseModel):
    """
    Paginated list of tasks in queue.

    Supports pagination for large queues with page/limit controls.
    """
    tasks: List[QueueTask] = Field(..., description="Tasks on current page")
    total: int = Field(..., description="Total number of tasks matching filter", ge=0)
    page: int = Field(..., description="Current page number (1-indexed)", ge=1)
    pages: int = Field(..., description="Total number of pages", ge=1)

    class Config:
        json_schema_extra = {
            "example": {
                "tasks": [
                    {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "agent_name": "Customer Support Bot",
                        "status": "processing",
                        "queued_at": "2025-01-21T14:25:00+05:30",
                        "priority": 2,
                        "tenant_id": "tenant-123"
                    }
                ],
                "total": 45,
                "page": 1,
                "pages": 3
            }
        }


class PauseQueueRequest(BaseModel):
    """
    Request to pause queue processing.

    Optional reason string for audit logging.
    """
    reason: Optional[str] = Field(None, description="Optional reason for pausing", max_length=500)

    class Config:
        json_schema_extra = {
            "example": {
                "reason": "Maintenance window - deploying new agent version"
            }
        }


class QueueMetricsQuery(BaseModel):
    """
    Query parameters for queue depth history endpoint.

    Defines time range for fetching historical metrics.
    """
    start_time: datetime = Field(..., description="Start of time range (ISO 8601)")
    end_time: datetime = Field(..., description="End of time range (ISO 8601)")

    class Config:
        json_schema_extra = {
            "example": {
                "start_time": "2025-01-21T13:30:00+05:30",
                "end_time": "2025-01-21T14:30:00+05:30"
            }
        }
