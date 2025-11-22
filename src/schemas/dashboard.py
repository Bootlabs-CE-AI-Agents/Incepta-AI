"""
Pydantic schemas for Dashboard Summary API.

This module defines data validation schemas for the dashboard overview endpoint,
providing real-time metrics and recent activity feed with IST timezone support.

Following 2025 Pydantic v2 best practices:
- ConfigDict(from_attributes=True) for ORM integration
- str mixin for Enum classes (JSON serialization)
- Field validators for data validation
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ActivityType(str, Enum):
    """Activity feed event types."""

    EXECUTION_SUCCESS = "execution_success"
    EXECUTION_FAILURE = "execution_failure"
    AGENT_CREATED = "agent_created"
    AGENT_UPDATED = "agent_updated"
    PROMPT_CREATED = "prompt_created"
    PLUGIN_CONNECTED = "plugin_connected"
    TENANT_CREATED = "tenant_created"


class ActivityStatus(str, Enum):
    """Visual status indicator for activity items."""

    SUCCESS = "success"  # Green
    ERROR = "error"  # Red
    INFO = "info"  # Blue
    WARNING = "warning"  # Orange


class RecentActivity(BaseModel):
    """
    Single activity feed item.

    Represents an event in the system with timestamp, description, and status.
    Timestamps use IST (Asia/Kolkata) timezone.
    """

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(description="Unique activity identifier")
    type: ActivityType = Field(description="Type of activity event")
    title: str = Field(description="Human-readable activity description")
    timestamp: datetime = Field(description="Activity timestamp in IST")
    status: ActivityStatus = Field(description="Visual status indicator")
    details: Optional[str] = Field(None, description="Optional additional context")


class MetricChange(BaseModel):
    """
    Metric change indicator comparing current vs previous period.

    Used to show trend direction (up/down) and magnitude of change.
    """

    value: str = Field(description="Human-readable change description (e.g., '+2 from last week')")
    is_positive: bool = Field(description="Whether change is considered positive/good")


class ActiveAgentsMetric(BaseModel):
    """Active agents count with week-over-week change."""

    count: int = Field(ge=0, description="Number of agents with status='active'")
    change: Optional[MetricChange] = Field(None, description="Comparison to 7 days ago")


class ExecutionsTodayMetric(BaseModel):
    """
    Execution count for current IST day (midnight to now).

    Includes total executions and successful execution count.
    """

    total: int = Field(ge=0, description="Total executions since IST midnight")
    successful: int = Field(ge=0, description="Successful executions since IST midnight")
    success_rate: float = Field(ge=0.0, le=100.0, description="Success rate percentage")


class ResponseTimeMetric(BaseModel):
    """
    Average response time for executions in last 24 hours.

    Formatted as human-readable string with comparison to 7-day average.
    """

    value: str = Field(description="Avg response time (e.g., '1.2s')")
    value_ms: float = Field(ge=0.0, description="Raw value in milliseconds")
    change: Optional[MetricChange] = Field(None, description="Comparison to 7-day average")
    threshold_exceeded: bool = Field(
        False, description="True if exceeds 500ms industry threshold"
    )


class ErrorRateMetric(BaseModel):
    """
    Error rate percentage for executions in last 24 hours.

    Includes status classification based on industry thresholds.
    """

    percentage: float = Field(ge=0.0, le=100.0, description="Error rate percentage")
    status_message: str = Field(description="Human-readable status (Excellent/Monitor/Critical)")
    is_critical: bool = Field(description="True if >5% (critical threshold)")


class DashboardSummary(BaseModel):
    """
    Complete dashboard summary response.

    Aggregates key metrics and recent activity for the dashboard home page.
    All timestamps use IST (Asia/Kolkata) timezone.
    All currency values displayed in INR (₹).

    Cached for 60 seconds to optimize performance.
    """

    model_config = ConfigDict(from_attributes=True)

    active_agents: ActiveAgentsMetric = Field(description="Active agent count metrics")
    executions_today: ExecutionsTodayMetric = Field(description="Today's execution metrics (IST)")
    avg_response_time: ResponseTimeMetric = Field(description="24h avg response time")
    error_rate: ErrorRateMetric = Field(description="24h error rate metrics")
    recent_activity: List[RecentActivity] = Field(
        default_factory=list, description="Last 10 activity events", max_length=10
    )
    generated_at: datetime = Field(description="Summary generation timestamp (IST)")
    timezone: str = Field(default="Asia/Kolkata", description="Timezone used for calculations")
