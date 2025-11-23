from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class WorkerStatusEnum(str, Enum):
    """Worker status enumeration (AC-1)."""

    ACTIVE = "active"
    IDLE = "idle"
    UNRESPONSIVE = "unresponsive"


class WorkerStatus(BaseModel):
    """Worker status DTO (AC-1: GET /api/workers)."""

    hostname: str = Field(..., description="Worker pod hostname")
    status: WorkerStatusEnum = Field(..., description="Worker operational status")
    uptime_seconds: int = Field(ge=0, description="Seconds since worker started")
    active_tasks: int = Field(ge=0, description="Currently executing tasks")
    completed_tasks: int = Field(ge=0, description="Total completed tasks since start")
    cpu_percent: float = Field(ge=0, le=100, description="Current CPU utilization 0-100")
    memory_percent: float = Field(ge=0, le=100, description="Current memory utilization 0-100")
    throughput_per_minute: float = Field(ge=0, description="Tasks completed in last 60s")


class LogEntryDTO(BaseModel):
    """Log entry DTO (AC-2: GET /api/workers/{hostname}/logs)."""

    timestamp: datetime = Field(..., description="Log entry time (ISO 8601)")
    level: str = Field(..., description="Log level: DEBUG, INFO, WARN, ERROR")
    message: str = Field(..., description="Log message content")
    task_id: Optional[str] = Field(None, description="Associated Celery task ID")


class WorkerLogsResponse(BaseModel):
    """Worker logs response wrapper (AC-2)."""

    hostname: str
    logs: List[LogEntryDTO]


class WorkerRestartResponse(BaseModel):
    """Worker restart response (AC-3: POST /api/workers/{hostname}/restart)."""

    status: str = Field(default="success", description="Operation status")
    message: str = Field(..., description="Human-readable result message")
    restart_initiated_at: datetime = Field(..., description="Restart timestamp (ISO 8601)")


class CurrentMetricsDTO(BaseModel):
    """Current worker metrics (AC-4)."""

    cpu_percent: float = Field(ge=0, le=100)
    memory_percent: float = Field(ge=0, le=100)
    network_bytes_in: int = Field(ge=0, description="Bytes received since start")
    network_bytes_out: int = Field(ge=0, description="Bytes sent since start")


class ThroughputDataPoint(BaseModel):
    """Hourly throughput data point (AC-4)."""

    timestamp: datetime
    tasks_completed: int = Field(ge=0)
    avg_task_duration_seconds: float = Field(ge=0)


class WorkerMetricsDTO(BaseModel):
    """Detailed worker metrics (AC-4: GET /api/workers/{hostname}/metrics)."""

    hostname: str
    current_metrics: CurrentMetricsDTO
    throughput_history: List[ThroughputDataPoint] = Field(
        ..., description="Last 7 days hourly throughput"
    )
    uptime_seconds: int = Field(ge=0)
    celery_version: str
    python_version: str
