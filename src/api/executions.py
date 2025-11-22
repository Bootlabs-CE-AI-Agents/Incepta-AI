"""
Execution details API endpoints.

This module provides REST endpoints for retrieving agent test execution records,
supporting execution observability and debugging workflows. Includes tenant
isolation, sensitive data masking, and proper error handling.
"""

import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_tenant_db, get_tenant_id
from src.database.models import AgentTestExecution
from src.schemas.execution import ExecutionDetailResponse
from src.utils.security import mask_sensitive_data

logger = logging.getLogger(__name__)

router = APIRouter(tags=["executions"])


@router.get(
    "",
    summary="List Executions",
    description="Retrieve paginated list of agent test executions with filtering options",
    responses={
        200: {
            "description": "List of executions retrieved successfully",
        },
        500: {
            "description": "Internal server error",
            "content": {
                "application/json": {
                    "example": {"detail": "Failed to retrieve executions"}
                }
            },
        },
    },
)
async def list_executions(
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    db: Annotated[AsyncSession, Depends(get_tenant_db)],
    page: Annotated[int, "Page number (1-based)"] = 1,
    limit: Annotated[int, "Items per page"] = 50,
    date_from: Annotated[str | None, "Filter from date (ISO 8601)"] = None,
    date_to: Annotated[str | None, "Filter to date (ISO 8601)"] = None,
    status_filter: Annotated[str | None, "Comma-separated status filter"] = None,
    agent_id: Annotated[UUID | None, "Filter by agent ID"] = None,
    search: Annotated[str | None, "Search in agent name or execution ID"] = None,
):
    """
    List agent test executions with filtering and pagination.

    Args:
        page: Page number (1-based, default: 1)
        limit: Items per page (default: 50, max: 100)
        date_from: Filter executions created after this date (ISO 8601)
        date_to: Filter executions created before this date (ISO 8601)
        status_filter: Comma-separated list of statuses to filter by
        agent_id: Filter by specific agent UUID
        search: Search term (searches in agent_name and execution id)
        tenant_id: Current tenant ID (injected via dependency)
        db: Tenant-aware database session (injected via dependency)

    Returns:
        dict: Paginated execution list with total count and page info
    """
    try:
        from datetime import datetime
        from sqlalchemy import and_, or_, func, cast, String

        # Limit validation
        if limit > 100:
            limit = 100
        if limit < 1:
            limit = 1
        if page < 1:
            page = 1

        # Build base query conditions
        conditions = [AgentTestExecution.tenant_id == tenant_id]

        # Apply date filters
        if date_from:
            try:
                date_from_dt = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
                conditions.append(AgentTestExecution.created_at >= date_from_dt)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid date_from format: {date_from}",
                )

        if date_to:
            try:
                date_to_dt = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
                conditions.append(AgentTestExecution.created_at <= date_to_dt)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid date_to format: {date_to}",
                )

        # Apply status filter
        if status_filter:
            status_list = [s.strip() for s in status_filter.split(",")]
            conditions.append(AgentTestExecution.status.in_(status_list))

        # Apply agent filter
        if agent_id:
            conditions.append(AgentTestExecution.agent_id == str(agent_id))

        # Apply search filter
        if search:
            search_conditions = [
                AgentTestExecution.agent_name.ilike(f"%{search}%"),
                cast(AgentTestExecution.id, String).ilike(f"%{search}%"),
            ]
            conditions.append(or_(*search_conditions))

        # Count total matching records
        count_query = select(func.count(AgentTestExecution.id)).where(and_(*conditions))
        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

        # Calculate pagination
        offset = (page - 1) * limit
        total_pages = (total + limit - 1) // limit if total > 0 else 0

        # Fetch paginated results
        query = (
            select(AgentTestExecution)
            .where(and_(*conditions))
            .order_by(AgentTestExecution.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await db.execute(query)
        executions = result.scalars().all()

        # Format response
        execution_list = []
        for execution in executions:
            # Extract duration from execution_time JSON field
            duration_ms = None
            if execution.execution_time:
                duration_ms = execution.execution_time.get("total_duration_ms")

            execution_list.append({
                "id": str(execution.id),
                "agent_id": str(execution.agent_id) if execution.agent_id else "",
                "agent_name": execution.agent_name or "Unknown",
                "tenant_id": str(execution.tenant_id),
                "status": execution.status or "unknown",
                "duration_ms": duration_ms,
                "started_at": execution.created_at.isoformat() if execution.created_at else "",
                "completed_at": execution.created_at.isoformat() if execution.created_at else None,
                "error_message": execution.error_message,
            })

        logger.info(f"Listed {len(execution_list)} executions for tenant {tenant_id} (page {page})")
        return {
            "executions": execution_list,
            "total": total,
            "page": page,
            "pages": total_pages,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing executions: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve executions",
        )


@router.get(
    "/{execution_id}",
    response_model=ExecutionDetailResponse,
    summary="Get Execution Details",
    description="Retrieve full execution details including trace, tokens, and timing for a specific execution ID.",
    responses={
        200: {
            "description": "Execution details retrieved successfully",
            "model": ExecutionDetailResponse,
        },
        403: {
            "description": "Forbidden: Execution belongs to a different tenant",
            "content": {
                "application/json": {
                    "example": {"detail": "Forbidden: Access denied"}
                }
            },
        },
        404: {
            "description": "Execution not found",
            "content": {
                "application/json": {"example": {"detail": "Execution not found"}}
            },
        },
        500: {
            "description": "Internal server error",
            "content": {
                "application/json": {
                    "example": {"detail": "Failed to retrieve execution"}
                }
            },
        },
    },
)
async def get_execution_details(
    execution_id: Annotated[UUID, "Execution UUID"],
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    db: Annotated[AsyncSession, Depends(get_tenant_db)],
) -> ExecutionDetailResponse:
    """
    Get execution details by ID with tenant isolation and sensitive data masking.

    Retrieves a single agent test execution record from the database, enforcing
    tenant isolation to prevent cross-tenant access. Sensitive data (API keys,
    passwords, tokens) is automatically masked before returning.

    Args:
        execution_id: UUID of the execution to retrieve
        tenant_id: Current tenant ID (injected via dependency)
        db: Tenant-aware database session (injected via dependency)

    Returns:
        ExecutionDetailResponse: Full execution details with masked sensitive data

    Raises:
        HTTPException(404): If execution not found
        HTTPException(403): If execution belongs to different tenant
        HTTPException(500): If database query fails
    """
    try:
        # Defense-in-depth: Include tenant_id in WHERE clause to prevent SQL-level access
        # This provides an extra security layer beyond application-level checks
        stmt = select(AgentTestExecution).where(
            AgentTestExecution.id == execution_id,
            AgentTestExecution.tenant_id == tenant_id,
        )
        result = await db.execute(stmt)
        execution = result.scalar_one_or_none()

        # If not found with tenant filter, check if execution exists for different tenant
        # This distinguishes 404 (not found) from 403 (forbidden) per AC4
        if execution is None:
            # Check if execution exists at all (without tenant filter)
            stmt_check = select(AgentTestExecution).where(
                AgentTestExecution.id == execution_id
            )
            result_check = await db.execute(stmt_check)
            execution_check = result_check.scalar_one_or_none()

            if execution_check is None:
                # Execution truly doesn't exist - 404
                logger.warning(f"Execution {execution_id} not found")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Execution not found",
                )
            else:
                # Execution exists but belongs to different tenant - 403
                # Sanitize log to avoid exposing raw tenant identifiers
                logger.warning(
                    f"Cross-tenant access attempt: Execution {execution_id} "
                    f"(tenant mismatch detected)"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: Access denied",
                )

        # Calculate execution time from execution_time JSON
        # FIX: Convert to int to match schema (may be float in database)
        total_duration_ms = int(execution.execution_time.get("total_duration_ms", 0))

        # Build response with all required fields
        # Normalize status: DB uses "success" but AC requires "completed"
        normalized_status = "completed" if execution.status == "success" else execution.status

        response_data = {
            "id": execution.id,
            "agent_id": execution.agent_id,
            "tenant_id": execution.tenant_id,
            "input_data": mask_sensitive_data(execution.payload),
            "output_data": mask_sensitive_data(execution.execution_trace),
            "status": normalized_status,
            "execution_time": total_duration_ms,
            "created_at": execution.created_at,
            "updated_at": None,  # AgentTestExecution doesn't have updated_at field
            "error_message": (
                execution.errors.get("message") if execution.errors else None
            ),
            "task_id": execution.task_id,  # Celery task ID for correlation
        }

        logger.info(
            f"Successfully retrieved execution {execution_id} for tenant {tenant_id}"
        )
        return ExecutionDetailResponse(**response_data)

    except HTTPException:
        # Re-raise HTTP exceptions (404, 403)
        raise
    except Exception as e:
        # Catch unexpected errors and log
        logger.error(f"Error retrieving execution {execution_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve execution",
        )
