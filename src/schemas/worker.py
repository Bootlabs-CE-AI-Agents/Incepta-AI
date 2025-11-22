from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class WorkerStatus(BaseModel):
    hostname: str
    status: str = Field(..., description="active, idle, or unresponsive")
    active_tasks_count: int
    completed_tasks_count: int
    concurrency: int
    uptime: float
    cpu_usage_percent: float
    memory_usage_percent: float

class WorkerLogsResponse(BaseModel):
    hostname: str
    logs: List[str]

class WorkerRestartResponse(BaseModel):
    success: bool
    message: str
