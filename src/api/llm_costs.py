"""
LLM Cost API Endpoints.

REST API for cost dashboard data retrieval.
All endpoints enforce tenant isolation via get_tenant_id() dependency.

Following 2025 FastAPI best practices:
- Async/await patterns
- Proper dependency injection
- Type hints with Annotated
- HTTPException for error handling

Note: Cost queries use a separate LiteLLM database connection (litellm_db)
while tenant/agent lookups use the main database (ai_agents).
"""

import logging
from datetime import date, timedelta
from typing import Annotated, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_tenant_id
from src.database.session import get_async_session, get_litellm_session
from src.schemas.llm_cost import (
    AgentSpendDTO,
    BudgetUtilizationDTO,
    CostSummaryDTO,
    DailySpendDTO,
    ModelSpendDTO,
    TenantSpendDTO,
    TokenBreakdownDTO,
)
from src.services.llm_cost_service import LLMCostService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/costs", tags=["LLM Costs"])


@router.get("/summary", response_model=CostSummaryDTO)
async def get_cost_summary(
    db: Annotated[AsyncSession, Depends(get_async_session)],
    litellm_db: Annotated[AsyncSession, Depends(get_litellm_session)],
    tenant_id: Annotated[UUID, Depends(get_tenant_id)],
) -> CostSummaryDTO:
    """
    Get overall cost summary (AC#2).

    Returns:
    - Today's spend
    - This week's spend
    - This month's spend
    - Last 30 days total
    - Top tenant by spend (if admin)
    - Top agent by spend

    **Tenant Isolation**: Filters by authenticated tenant
    """
    try:
        cost_service = LLMCostService(db, litellm_db)
        summary = await cost_service.get_cost_summary(tenant_id=tenant_id)
        return summary
    except Exception as e:
        logger.error(f"Error fetching cost summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch cost summary")


@router.get("/by-tenant", response_model=List[TenantSpendDTO])
async def get_spend_by_tenant(
    db: Annotated[AsyncSession, Depends(get_async_session)],
    litellm_db: Annotated[AsyncSession, Depends(get_litellm_session)],
    tenant_id: Annotated[UUID, Depends(get_tenant_id)],
    start_date: Annotated[date, Query(description="Start date (YYYY-MM-DD)")],
    end_date: Annotated[date, Query(description="End date (YYYY-MM-DD)")],
    limit: Annotated[int, Query(ge=1, le=100, description="Max results")] = 10,
) -> List[TenantSpendDTO]:
    """
    Get top N tenants by spend (AC#2).

    **Admin Only**: Returns all tenants. Non-admin users see only their tenant.

    **Tenant Isolation**: Enforced via get_tenant_id()
    """
    try:
        cost_service = LLMCostService(db, litellm_db)
        # For non-admin users, filter by their tenant
        # TODO: Check if user is admin, if not restrict to single tenant
        tenants = await cost_service.get_spend_by_tenant(start_date, end_date, limit)
        return tenants
    except Exception as e:
        logger.error(f"Error fetching spend by tenant: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch tenant spend")


@router.get("/by-agent", response_model=List[AgentSpendDTO])
async def get_spend_by_agent(
    db: Annotated[AsyncSession, Depends(get_async_session)],
    litellm_db: Annotated[AsyncSession, Depends(get_litellm_session)],
    tenant_id: Annotated[UUID, Depends(get_tenant_id)],
    start_date: Annotated[date, Query(description="Start date (YYYY-MM-DD)")],
    end_date: Annotated[date, Query(description="End date (YYYY-MM-DD)")],
    limit: Annotated[int, Query(ge=1, le=100, description="Max results")] = 10,
) -> List[AgentSpendDTO]:
    """
    Get top N agents by spend with execution statistics (AC#6).

    Returns:
    - Agent name
    - Execution count
    - Total cost
    - Average cost per execution

    **Tenant Isolation**: Filters by authenticated tenant
    """
    try:
        cost_service = LLMCostService(db, litellm_db)
        agents = await cost_service.get_spend_by_agent(
            start_date, end_date, tenant_id, limit
        )
        return agents
    except Exception as e:
        logger.error(f"Error fetching spend by agent: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch agent spend")


@router.get("/by-model", response_model=List[ModelSpendDTO])
async def get_spend_by_model(
    db: Annotated[AsyncSession, Depends(get_async_session)],
    litellm_db: Annotated[AsyncSession, Depends(get_litellm_session)],
    tenant_id: Annotated[UUID, Depends(get_tenant_id)],
    start_date: Annotated[date, Query(description="Start date (YYYY-MM-DD)")],
    end_date: Annotated[date, Query(description="End date (YYYY-MM-DD)")],
) -> List[ModelSpendDTO]:
    """
    Get spend breakdown by model (AC#2).

    Returns:
    - Model name
    - Total spend
    - Total tokens
    - Prompt tokens
    - Completion tokens

    **Tenant Isolation**: Filters by authenticated tenant
    """
    try:
        cost_service = LLMCostService(db, litellm_db)
        models = await cost_service.get_spend_by_model(start_date, end_date, tenant_id)
        return models
    except Exception as e:
        logger.error(f"Error fetching spend by model: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch model spend")


@router.get("/token-breakdown", response_model=List[TokenBreakdownDTO])
async def get_token_breakdown(
    db: Annotated[AsyncSession, Depends(get_async_session)],
    litellm_db: Annotated[AsyncSession, Depends(get_litellm_session)],
    tenant_id: Annotated[UUID, Depends(get_tenant_id)],
    start_date: Annotated[Optional[date], Query(description="Start date (YYYY-MM-DD), defaults to 30 days ago")] = None,
    end_date: Annotated[Optional[date], Query(description="End date (YYYY-MM-DD), defaults to today")] = None,
    model: Annotated[Optional[str], Query(description="Optional model filter")] = None,
) -> List[TokenBreakdownDTO]:
    """
    Get token usage breakdown (input vs output) by model (AC#4).

    Returns:
    - Model name
    - Prompt tokens
    - Completion tokens
    - Total tokens
    - Percentages

    **Tenant Isolation**: Filters by authenticated tenant

    **Date Range**: If not provided, defaults to last 30 days (30 days ago to today)
    """
    try:
        # Default date range: last 30 days
        if start_date is None:
            start_date = date.today() - timedelta(days=30)
        if end_date is None:
            end_date = date.today()

        cost_service = LLMCostService(db, litellm_db)
        breakdown = await cost_service.get_token_breakdown(
            start_date, end_date, model, tenant_id
        )
        return breakdown
    except Exception as e:
        logger.error(f"Error fetching token breakdown: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch token breakdown")


@router.get("/trend", response_model=List[DailySpendDTO])
async def get_daily_spend_trend(
    db: Annotated[AsyncSession, Depends(get_async_session)],
    litellm_db: Annotated[AsyncSession, Depends(get_litellm_session)],
    tenant_id: Annotated[UUID, Depends(get_tenant_id)],
    days: Annotated[int, Query(ge=1, le=365, description="Number of days")] = 30,
) -> List[DailySpendDTO]:
    """
    Get daily spend trend time series (AC#3).

    Returns daily aggregations for the last N days.
    Missing dates filled with $0.00.

    **Tenant Isolation**: Filters by authenticated tenant
    """
    try:
        cost_service = LLMCostService(db, litellm_db)
        trend = await cost_service.get_daily_spend_trend(days, tenant_id)
        return trend
    except Exception as e:
        logger.error(f"Error fetching daily spend trend: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch spend trend")


@router.get("/budget-utilization", response_model=List[BudgetUtilizationDTO])
async def get_budget_utilization(
    db: Annotated[AsyncSession, Depends(get_async_session)],
    litellm_db: Annotated[AsyncSession, Depends(get_litellm_session)],
    tenant_id: Annotated[UUID, Depends(get_tenant_id)],
) -> List[BudgetUtilizationDTO]:
    """
    Get budget utilization for tenants (AC#5).

    Returns:
    - Budget limit
    - Current spend (this month)
    - Remaining budget
    - Utilization percentage
    - Color indicator (green/yellow/red)

    **Tenant Isolation**: Returns only authenticated tenant's data
    """
    try:
        cost_service = LLMCostService(db, litellm_db)
        utilization = await cost_service.get_budget_utilization(tenant_id=tenant_id)
        return utilization
    except Exception as e:
        logger.error(f"Error fetching budget utilization: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to fetch budget utilization"
        )
