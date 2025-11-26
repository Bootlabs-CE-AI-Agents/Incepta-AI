"""
Execution detail schemas for API responses.

This module provides Pydantic v2 schemas for the execution details endpoint,
supporting retrieval of agent test execution records with tenant isolation
and sensitive data masking.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ExecutionDetailResponse(BaseModel):
    """
    Response schema for GET /api/executions/{execution_id}.

    Represents a single agent test execution record with full details including
    input payload, execution trace, token usage, timing, and errors. Sensitive
    data (API keys, passwords, tokens) is masked before returning.

    Attributes:
        id: Execution record UUID (globally unique)
        agent_id: UUID of the agent that was executed
        tenant_id: Tenant identifier for multi-tenant isolation
        input: Test payload (webhook data or trigger parameters)
        output: Execution trace with step-by-step details
        status: Execution status (completed/failed/etc)
        duration_ms: Total execution duration in milliseconds
        started_at: Timestamp when execution was created (ISO 8601)
        completed_at: Timestamp when execution finished (ISO 8601, nullable)
        error_message: Error details if execution failed (nullable)
        metadata: Execution metadata (user_id, correlation_id, etc)
        logs: Execution log entries (nullable)
    """

    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID = Field(..., description="Execution record ID (globally unique)")
    agent_id: UUID = Field(..., description="Agent ID that was executed")
    agent_name: str = Field(..., description="Agent name for display")
    tenant_id: str = Field(..., description="Tenant identifier for isolation")
    input: dict = Field(..., description="Test payload or trigger parameters")
    output: dict = Field(
        ..., description="Execution trace with step-by-step execution details"
    )
    status: str = Field(..., description="Execution status: completed, failed, etc")
    duration_ms: int = Field(
        ..., description="Total execution duration in milliseconds"
    )
    started_at: str = Field(..., description="Execution start timestamp (ISO 8601)")
    completed_at: Optional[str] = Field(
        default=None, description="Execution completion timestamp (ISO 8601, nullable)"
    )
    error_message: Optional[str] = Field(
        default=None, description="Error message if execution failed (nullable)"
    )
    metadata: dict = Field(
        default_factory=dict, description="Execution metadata (user_id, correlation_id, etc)"
    )
    logs: list = Field(
        default_factory=list, description="Execution log entries"
    )
