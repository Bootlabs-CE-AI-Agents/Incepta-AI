"""
Streamlit → Next.js Data Parity Tests.

PURPOSE: Validate that Next.js REST APIs return IDENTICAL data to Streamlit helpers.

CRITICAL: These tests are the ONLY way to verify migration correctness.
- If parity test fails → Next.js shows wrong data to users
- If parity test missing → No confidence in migration
- If parity test passes → Safe to switch users from Streamlit to Next.js

USAGE:
    pytest tests/integration/test_streamlit_nextjs_parity.py -v
    pytest tests/integration/test_streamlit_nextjs_parity.py::test_cost_summary_parity -v

REQUIREMENTS:
- Backend running (FastAPI server on localhost:8000)
- Database populated with test data
- Redis/Celery/Prometheus running (for relevant tests)
"""

import asyncio
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient

import importlib

# Import Streamlit pages using importlib (module names start with numbers)
llm_costs_module = importlib.import_module("src.admin.pages.07_LLM_Costs")
fetch_agent_stats = llm_costs_module.fetch_agent_stats
fetch_budget_utilization = llm_costs_module.fetch_budget_utilization
fetch_cost_summary = llm_costs_module.fetch_cost_summary
fetch_daily_trend = llm_costs_module.fetch_daily_trend
fetch_model_spend = llm_costs_module.fetch_model_spend
fetch_token_breakdown = llm_costs_module.fetch_token_breakdown

agent_performance_module = importlib.import_module("src.admin.pages.08_Agent_Performance")
fetch_all_errors = agent_performance_module.fetch_all_errors
fetch_all_history = agent_performance_module.fetch_all_history
fetch_all_metrics = agent_performance_module.fetch_all_metrics
fetch_all_slowest = agent_performance_module.fetch_all_slowest
fetch_all_trends = agent_performance_module.fetch_all_trends
from src.api.llm_costs import router as llm_costs_router
from src.database.session import get_async_session
from src.main import app
from src.services.llm_cost_service import LLMCostService

# FastAPI test client
client = TestClient(app)


# ============================================================================
# HELPER UTILITIES
# ============================================================================


def assert_decimal_equal(actual: float, expected: Decimal, tolerance: float = 0.01):
    """
    Compare float (Next.js) to Decimal (Streamlit) with tolerance.

    Args:
        actual: Float from Next.js API response
        expected: Decimal from Streamlit helper
        tolerance: Acceptable difference (default 0.01 = 1 cent)
    """
    assert abs(float(expected) - actual) < tolerance, (
        f"Value mismatch: Next.js returned {actual}, "
        f"Streamlit returned {expected} (diff: {abs(float(expected) - actual)})"
    )


def assert_count_equal(actual: int, expected: int):
    """Compare counts (must match exactly)."""
    assert actual == expected, f"Count mismatch: Next.js={actual}, Streamlit={expected}"


def assert_percentage_equal(actual: float, expected: float, tolerance: float = 0.1):
    """Compare percentages with tolerance (0.1 = 0.1% difference)."""
    assert abs(expected - actual) < tolerance, (
        f"Percentage mismatch: Next.js={actual}%, "
        f"Streamlit={expected}% (diff: {abs(expected - actual)}%)"
    )


# ============================================================================
# LLM COSTS PAGE PARITY TESTS (Page 07)
# ============================================================================


@pytest.mark.integration
@pytest.mark.parity
def test_cost_summary_parity(test_tenant_id: UUID):
    """
    Validate Next.js /api/costs/summary returns identical data to Streamlit fetch_cost_summary().

    CRITICAL TEST: This is THE definitive test for LLM Costs migration.
    - If this passes → LLM Costs page shows correct data
    - If this fails → Users see wrong numbers in production

    Acceptance Criteria (Story nextjs-9, AC#1):
    - Today's spend matches
    - Week's spend matches
    - Month's spend matches
    - Top tenant matches (name + amount)
    - Top agent matches (name + amount)
    """
    # STEP 1: Get Streamlit data
    streamlit_data = fetch_cost_summary(tenant_id_param=test_tenant_id)

    # STEP 2: Get Next.js data
    response = client.get(
        "/api/costs/summary",
        headers={"X-Tenant-ID": str(test_tenant_id)},
    )
    assert response.status_code == 200, f"API returned {response.status_code}: {response.text}"
    nextjs_data = response.json()

    # STEP 3: Assert all 5 metrics match
    assert_decimal_equal(nextjs_data["today_spend"], streamlit_data.today_spend)
    assert_decimal_equal(nextjs_data["week_spend"], streamlit_data.week_spend)
    assert_decimal_equal(nextjs_data["month_spend"], streamlit_data.month_spend)

    # Top tenant (if exists)
    if streamlit_data.top_tenant:
        assert nextjs_data["top_tenant"]["name"] == streamlit_data.top_tenant.name
        assert_decimal_equal(
            nextjs_data["top_tenant"]["amount"], streamlit_data.top_tenant.amount
        )
    else:
        assert nextjs_data["top_tenant"] is None

    # Top agent (if exists)
    if streamlit_data.top_agent:
        assert nextjs_data["top_agent"]["name"] == streamlit_data.top_agent.name
        assert_decimal_equal(nextjs_data["top_agent"]["amount"], streamlit_data.top_agent.amount)
    else:
        assert nextjs_data["top_agent"] is None


@pytest.mark.integration
@pytest.mark.parity
@pytest.mark.skip(reason="Endpoint not yet verified - Story 1.2 dependency")
def test_daily_trend_parity(test_tenant_id: UUID):
    """
    Validate Next.js /api/costs/trend returns identical data to Streamlit fetch_daily_trend().

    Acceptance Criteria (Story 1.2):
    - 30 days of daily spend data
    - Date matches (YYYY-MM-DD format)
    - Spend amount matches for each day
    """
    days = 30

    # STEP 1: Get Streamlit data
    streamlit_data = fetch_daily_trend(days=days, tenant_id_param=test_tenant_id)

    # STEP 2: Get Next.js data
    response = client.get(
        f"/api/costs/trend?days={days}",
        headers={"X-Tenant-ID": str(test_tenant_id)},
    )
    assert response.status_code == 200
    nextjs_data = response.json()

    # STEP 3: Assert data length matches
    assert_count_equal(len(nextjs_data), len(streamlit_data))

    # STEP 4: Assert each day matches
    for nextjs_day, streamlit_day in zip(nextjs_data, streamlit_data):
        assert nextjs_day["date"] == str(streamlit_day.date)
        assert_decimal_equal(nextjs_day["spend"], streamlit_day.spend)


@pytest.mark.integration
@pytest.mark.parity
@pytest.mark.skip(reason="Endpoint not yet verified - Story 1.3 dependency")
def test_token_breakdown_parity(test_tenant_id: UUID):
    """
    Validate Next.js /api/costs/token-breakdown returns identical data to Streamlit fetch_token_breakdown().

    Acceptance Criteria (Story 1.3):
    - Input tokens count matches
    - Output tokens count matches
    - Total cost matches
    - Percentage calculations match
    """
    start_date = date.today() - timedelta(days=7)
    end_date = date.today()

    # STEP 1: Get Streamlit data
    streamlit_data = fetch_token_breakdown(
        start_date_param=start_date, end_date_param=end_date, tenant_id_param=test_tenant_id
    )

    # STEP 2: Get Next.js data
    response = client.get(
        f"/api/costs/token-breakdown?start_date={start_date}&end_date={end_date}",
        headers={"X-Tenant-ID": str(test_tenant_id)},
    )
    assert response.status_code == 200
    nextjs_data = response.json()

    # STEP 3: Assert token counts match
    assert_count_equal(nextjs_data["input_tokens"], streamlit_data.input_tokens)
    assert_count_equal(nextjs_data["output_tokens"], streamlit_data.output_tokens)
    assert_count_equal(nextjs_data["total_tokens"], streamlit_data.total_tokens)

    # STEP 4: Assert cost matches
    assert_decimal_equal(nextjs_data["total_cost"], streamlit_data.total_cost)

    # STEP 5: Assert percentages match (if calculated)
    if "input_percentage" in nextjs_data:
        assert_percentage_equal(
            nextjs_data["input_percentage"], streamlit_data.input_percentage
        )
        assert_percentage_equal(
            nextjs_data["output_percentage"], streamlit_data.output_percentage
        )


@pytest.mark.integration
@pytest.mark.parity
@pytest.mark.skip(reason="Endpoint not yet verified - Story 1.4 dependency")
def test_budget_utilization_parity(test_tenant_id: UUID):
    """
    Validate Next.js /api/costs/budget-utilization returns identical data to Streamlit fetch_budget_utilization().

    Acceptance Criteria (Story 1.4):
    - Budget amount matches
    - Spent amount matches
    - Utilization percentage matches
    - List of tenants matches
    """
    # STEP 1: Get Streamlit data
    streamlit_data = fetch_budget_utilization(tenant_id_param=test_tenant_id)

    # STEP 2: Get Next.js data
    response = client.get(
        "/api/costs/budget-utilization",
        headers={"X-Tenant-ID": str(test_tenant_id)},
    )
    assert response.status_code == 200
    nextjs_data = response.json()

    # STEP 3: Assert data length matches
    assert_count_equal(len(nextjs_data), len(streamlit_data))

    # STEP 4: Assert each tenant budget matches
    for nextjs_tenant, streamlit_tenant in zip(nextjs_data, streamlit_data):
        assert nextjs_tenant["tenant_name"] == streamlit_tenant.tenant_name
        assert_decimal_equal(nextjs_tenant["budget"], streamlit_tenant.budget)
        assert_decimal_equal(nextjs_tenant["spent"], streamlit_tenant.spent)
        assert_percentage_equal(
            nextjs_tenant["utilization_percentage"], streamlit_tenant.utilization_percentage
        )


@pytest.mark.integration
@pytest.mark.parity
def test_agent_spend_parity(test_tenant_id: UUID):
    """
    Validate Next.js /api/costs/by-agent returns identical data to Streamlit fetch_agent_stats().

    Acceptance Criteria (Story 1.1 sub-requirement):
    - Agent names match
    - Spend amounts match
    - Top N agents returned (limit parameter)
    """
    start_date = date.today() - timedelta(days=7)
    end_date = date.today()
    limit = 10

    # STEP 1: Get Streamlit data
    streamlit_data = fetch_agent_stats(
        start_date_param=start_date, end_date_param=end_date, tenant_id_param=test_tenant_id
    )

    # STEP 2: Get Next.js data
    response = client.get(
        f"/api/costs/by-agent?start_date={start_date}&end_date={end_date}&limit={limit}",
        headers={"X-Tenant-ID": str(test_tenant_id)},
    )
    assert response.status_code == 200
    nextjs_data = response.json()

    # STEP 3: Assert data length matches (up to limit)
    assert len(nextjs_data) <= limit
    assert_count_equal(len(nextjs_data), min(len(streamlit_data), limit))

    # STEP 4: Assert each agent matches
    for nextjs_agent, streamlit_agent in zip(nextjs_data, streamlit_data[:limit]):
        assert nextjs_agent["agent_name"] == streamlit_agent.agent_name
        assert_decimal_equal(nextjs_agent["total_spend"], streamlit_agent.total_spend)


@pytest.mark.integration
@pytest.mark.parity
@pytest.mark.skip(reason="Endpoint not yet verified - needs API audit")
def test_model_spend_parity(test_tenant_id: UUID):
    """
    Validate Next.js /api/costs/by-model returns identical data to Streamlit fetch_model_spend().

    Acceptance Criteria:
    - Model names match
    - Spend amounts match
    - Token counts match
    """
    start_date = date.today() - timedelta(days=7)
    end_date = date.today()

    # STEP 1: Get Streamlit data
    streamlit_data = fetch_model_spend(
        start_date_param=start_date, end_date_param=end_date, tenant_id_param=test_tenant_id
    )

    # STEP 2: Get Next.js data
    response = client.get(
        f"/api/costs/by-model?start_date={start_date}&end_date={end_date}",
        headers={"X-Tenant-ID": str(test_tenant_id)},
    )
    assert response.status_code == 200
    nextjs_data = response.json()

    # STEP 3: Assert data matches
    for nextjs_model, streamlit_model in zip(nextjs_data, streamlit_data):
        assert nextjs_model["model_name"] == streamlit_model.model_name
        assert_decimal_equal(nextjs_model["total_spend"], streamlit_model.total_spend)
        assert_count_equal(nextjs_model["total_tokens"], streamlit_model.total_tokens)


# ============================================================================
# AGENT PERFORMANCE PAGE PARITY TESTS (Page 08)
# ============================================================================


@pytest.mark.integration
@pytest.mark.parity
@pytest.mark.skip(reason="Endpoint not yet verified - Story 1.5 dependency")
def test_agent_metrics_parity(test_agent_id: UUID, test_tenant_id: UUID):
    """
    Validate Next.js /api/agents/{id}/metrics returns identical data to Streamlit fetch_all_metrics().

    Acceptance Criteria (Story 1.5):
    - Total executions matches
    - Success rate matches
    - Average execution time matches
    - P95 execution time matches
    - Error count matches
    """
    start_date = date.today() - timedelta(days=7)
    end_date = date.today()

    # STEP 1: Get Streamlit data
    streamlit_data = fetch_all_metrics(
        agent_id=test_agent_id, start_date=start_date, end_date=end_date
    )

    # STEP 2: Get Next.js data
    response = client.get(
        f"/api/agents/{test_agent_id}/metrics?start_date={start_date}&end_date={end_date}",
        headers={"X-Tenant-ID": str(test_tenant_id)},
    )
    assert response.status_code == 200
    nextjs_data = response.json()

    # STEP 3: Assert metrics match
    assert_count_equal(nextjs_data["total_executions"], streamlit_data.total_executions)
    assert_percentage_equal(nextjs_data["success_rate"], streamlit_data.success_rate)
    assert_decimal_equal(nextjs_data["avg_execution_time"], streamlit_data.avg_execution_time)
    assert_decimal_equal(nextjs_data["p95_execution_time"], streamlit_data.p95_execution_time)
    assert_count_equal(nextjs_data["error_count"], streamlit_data.error_count)


# ============================================================================
# TEST FIXTURES
# ============================================================================


@pytest.fixture
def test_tenant_id() -> UUID:
    """
    Provide a test tenant ID.

    IMPORTANT: Replace with actual test tenant from your test database.
    """
    # TODO: Replace with actual test tenant creation in conftest.py
    return uuid4()  # Placeholder


@pytest.fixture
def test_agent_id() -> UUID:
    """
    Provide a test agent ID.

    IMPORTANT: Replace with actual test agent from your test database.
    """
    # TODO: Replace with actual test agent creation in conftest.py
    return uuid4()  # Placeholder


# ============================================================================
# PARITY TEST TEMPLATE (Copy for new pages)
# ============================================================================

"""
TEMPLATE: Copy this pattern for every Streamlit page migration

@pytest.mark.integration
@pytest.mark.parity
def test_PAGE_NAME_FUNCTION_parity(test_params):
    \"\"\"
    Validate Next.js /api/ENDPOINT returns identical data to Streamlit FUNCTION().

    Acceptance Criteria (Story X.Y):
    - Field 1 matches
    - Field 2 matches
    - ...
    \"\"\"
    # STEP 1: Get Streamlit data
    streamlit_data = STREAMLIT_FETCH_FUNCTION(params)

    # STEP 2: Get Next.js data
    response = client.get("/api/ENDPOINT", headers={"X-Tenant-ID": str(test_tenant_id)})
    assert response.status_code == 200
    nextjs_data = response.json()

    # STEP 3: Assert all fields match
    assert_decimal_equal(nextjs_data["field1"], streamlit_data.field1)
    assert_count_equal(nextjs_data["field2"], streamlit_data.field2)
    # ... more assertions
"""
