# Streamlit vs Next.js Data Comparison Findings

**Date**: 2025-11-21
**Status**: In Progress
**Method**: Automated API validation + Manual UI verification

## Executive Summary

This document tracks data parity validation between Streamlit and Next.js UIs. The goal is to identify data mismatches, missing APIs, and UI inconsistencies before completing the migration.

## Validation Approach

### Phase 1: Automated API Validation ✅
- Test all REST API endpoints that Next.js depends on
- Compare API responses to expected Streamlit data sources
- Validate response schemas and data types

### Phase 2: Manual UI Comparison (Current)
- Visual inspection of both UIs side-by-side
- Verify charts, tables, and metrics display correctly
- Document UI/UX differences

### Phase 3: Parity Test Execution
- Run `tests/integration/test_streamlit_nextjs_parity.py`
- Fix any failing assertions
- Achieve 100% parity before deprecation

---

## Findings by Page

### ✅ Page 01: Dashboard (Home)

**Streamlit URL**: `http://localhost:8501/`
**Next.js URL**: `http://localhost:3000/dashboard`
**Status**: 🔍 **NEEDS INVESTIGATION**

#### Streamlit Data Sources
1. **System Health**: `fetch_system_health()` → `SystemHealthService.get_health()`
2. **Queue Depth**: Prometheus metric `celery_queue_size`
3. **Success Rate**: Calculated from `EnhancementHistory` table
4. **Performance Trends**: Time-series data from Prometheus

#### Next.js APIs
- ❌ **MISSING**: `/api/dashboard/health`
- ❌ **MISSING**: `/api/dashboard/metrics` (Prometheus proxy)
- ❌ **MISSING**: `/api/dashboard/trends` (time-series)

#### Current Streamlit Page Observations
- **System Health**: Shows "⚠️ System Status: Degraded" (0.0% success rate)
- **Key Metrics**:
  - Queue Depth: 0
  - Success Rate: 0.0%
  - P95 Latency: 0.00s
  - Active Workers: 0
- **Database**: PostgreSQL 17.6 connected
- **Tenants**: 0 configured
- **Charts**: "No data available" (expected - no activity yet)

#### Data Mismatch Risk
🔴 **HIGH** - 3 critical APIs missing. Next.js Dashboard will be non-functional.

#### Recommendation
- **Epic Creation Required**: Dashboard API endpoints (Epic 5)
- **Blockers**: Must implement before Next.js Dashboard can launch

---

### ✅ Page 02: Tenants

**Streamlit URL**: `http://localhost:8501/Tenants`
**Next.js URL**: `http://localhost:3000/dashboard/tenants`
**Status**: ✅ **100% API COVERAGE**

#### Streamlit Data Sources
1. `fetch_tenants()` → `TenantService.list_tenants()`
2. `create_tenant()` → `TenantService.create_tenant()`
3. `update_tenant()` → `TenantService.update_tenant()`
4. `delete_tenant()` → `TenantService.delete_tenant()`

#### Next.js APIs
- ✅ `GET /api/tenants` (verified in inventory)
- ✅ `POST /api/tenants`
- ✅ `PUT /api/tenants/{id}`
- ✅ `DELETE /api/tenants/{id}`

#### Data Mismatch Risk
🟢 **LOW** - Full API coverage, shared service layer

#### Validation Status
- ⏳ **Parity Test**: Not yet executed
- ⏳ **Manual UI Check**: Pending

---

### ⏳ Page 03: Plugins

**Streamlit URL**: `http://localhost:8501/Plugin_Management`
**Next.js URL**: `http://localhost:3000/dashboard/plugins`
**Status**: ✅ **100% API COVERAGE**

#### Next.js APIs
- ✅ `GET /api/plugins`
- ✅ `POST /api/plugins`
- ✅ `PUT /api/plugins/{id}`
- ✅ `DELETE /api/plugins/{id}`

#### Data Mismatch Risk
🟢 **LOW**

---

### ⏳ Page 04: History

**Streamlit URL**: `http://localhost:8501/History`
**Next.js URL**: `http://localhost:3000/dashboard/history`
**Status**: ⚠️ **NEEDS VERIFICATION**

#### Streamlit Data Sources
1. `fetch_enhancement_history()` → `EnhancementHistoryService.list_history()`
2. Filters: date range, tenant, status
3. Pagination: offset/limit

#### Next.js APIs
- ✅ `GET /api/enhancements/history` (exists)
- ⚠️ **Unverified**: Pagination params (offset/limit/page)
- ⚠️ **Unverified**: Filter params (tenant_id, status, start_date, end_date)

#### Data Mismatch Risk
🟡 **MEDIUM** - API exists but query params need verification

#### Recommendation
- **Test Required**: Manual curl/Postman test with filters
- **Verification**: `curl "http://localhost:8000/api/enhancements/history?limit=10&offset=0"`

---

### ⏳ Page 05: Agent Management

**Streamlit URL**: `http://localhost:8501/Agent_Management`
**Next.js URL**: `http://localhost:3000/dashboard/agents`
**Status**: ✅ **100% API COVERAGE**

#### Next.js APIs
- ✅ `GET /api/agents`
- ✅ `POST /api/agents`
- ✅ `PUT /api/agents/{id}`
- ✅ `DELETE /api/agents/{id}`

#### Data Mismatch Risk
🟢 **LOW**

---

### ⏳ Page 06: LLM Providers

**Streamlit URL**: `http://localhost:8501/LLM_Providers`
**Next.js URL**: `http://localhost:3000/dashboard/llm-providers` (assumed)
**Status**: ⚠️ **NEEDS VERIFICATION**

#### Streamlit Data Sources
1. `fetch_litellm_models()` → Calls LiteLLM proxy `/models` endpoint
2. Direct integration with LiteLLM proxy (port 4000)

#### Next.js APIs
- ⚠️ **Unverified**: Does `/api/llm-providers` exist?
- ⚠️ **Unknown**: Is it a proxy to LiteLLM or cached data?

#### Data Mismatch Risk
🟡 **MEDIUM** - Unclear if API layer exists for LiteLLM wrapping

#### Recommendation
- **Verification Required**: Check if API exists
- **Option A**: Next.js calls LiteLLM directly (client-side)
- **Option B**: FastAPI proxies LiteLLM (server-side) - **Recommended**

---

### 🔴 Page 07: LLM Costs

**Streamlit URL**: `http://localhost:8501/LLM_Costs`
**Next.js URL**: `http://localhost:3000/dashboard/llm-costs`
**Status**: ⚠️ **PARTIAL COVERAGE** (Story nextjs-9 completed)

#### Streamlit Data Sources
1. ✅ `fetch_cost_summary()` → `LLMCostService.get_cost_summary()`
2. ⚠️ `fetch_daily_trend()` → `LLMCostService.get_daily_trend()`
3. ⚠️ `fetch_token_breakdown()` → `LLMCostService.get_token_breakdown()`
4. ⚠️ `fetch_budget_utilization()` → `LLMCostService.get_budget_utilization()`
5. ⚠️ `fetch_agent_stats()` → `LLMCostService.get_agent_spend()`
6. ⚠️ `fetch_model_spend()` → `LLMCostService.get_model_spend()`

#### Next.js APIs
- ✅ `/api/costs/summary` (VERIFIED - Story nextjs-9)
- ⚠️ `/api/costs/trend` (exists, needs parity test)
- ⚠️ `/api/costs/token-breakdown` (exists, needs parity test)
- ⚠️ `/api/costs/budget-utilization` (exists, needs parity test)
- ⚠️ `/api/costs/by-agent` (exists, needs parity test)
- ⚠️ `/api/costs/by-model` (exists, needs parity test)

#### Known Issues (Story nextjs-9)
- **Hardcoded Values**: `todayChange`, `weekChange`, `monthChange` all set to `0` instead of real data
  - Source: `docs/sprint-artifacts/nextjs-story-9-llm-cost-dashboard-overview.md:433-436`
  - Code: `const todayChange = formatPercentageChange(data.today_spend, 0);`
  - **Root Cause**: Backend doesn't provide previous period comparison data

#### Data Mismatch Risk
🟡 **MEDIUM** - 1/6 endpoints verified, 5/6 need parity tests

#### Recommendation
- **Immediate**: Run `pytest tests/integration/test_streamlit_nextjs_parity.py::test_cost_summary_parity -v`
- **Next**: Implement change % calculations in backend service
- **Then**: Verify remaining 5 endpoints

---

### 🔴 Page 08: Agent Performance

**Streamlit URL**: `http://localhost:8501/Agent_Performance`
**Next.js URL**: `http://localhost:3000/dashboard/agent-performance`
**Status**: 🔴 **BLOCKED - Epic 1 Dependency**

#### Streamlit Data Sources
1. `fetch_all_metrics()` → `AgentPerformanceService.get_metrics()`
2. `fetch_all_history()` → `AgentPerformanceService.get_execution_history()`
3. `fetch_all_trends()` → `AgentPerformanceService.get_trends()`
4. `fetch_all_errors()` → `AgentPerformanceService.get_errors()`
5. `fetch_all_slowest()` → `AgentPerformanceService.get_slowest_executions()`

#### Next.js APIs
- ❓ **Unknown**: Epic 1 story status unclear
- ❓ **Unknown**: `/api/agents/{id}/metrics` exists?
- ❓ **Unknown**: `/api/agents/{id}/history` exists?

#### Data Mismatch Risk
🔴 **HIGH** - Blocked by Epic 1 completion status

#### Recommendation
- **Verify Epic 1**: Check if Agent Performance APIs exist in `src/api/agent_performance.py`
- **If Missing**: Create Epic 1 Implementation story

---

### 🔴 Page 09: Operations

**Streamlit URL**: `http://localhost:8501/Operations`
**Next.js URL**: Not planned yet
**Status**: 🔴 **BLOCKED - No Next.js Page**

#### Streamlit Data Sources
1. Redis operations (KEYS, GET, SET, DELETE)
2. Celery operations (revoke, purge, inspect)
3. Database operations (manual SQL query execution)
4. System operations (cache clear, metrics reset)

#### Next.js APIs
- ❌ **MISSING**: 6 operations endpoints (Epic 6 - not yet created)

#### Data Mismatch Risk
🔴 **CRITICAL** - Entire page missing from Next.js

#### Recommendation
- **Create Epic 6**: Operations Management APIs
- **Decision Required**: Include in migration scope or keep Streamlit-only?

---

### 🔴 Page 10: Workers

**Streamlit URL**: `http://localhost:8501/Workers`
**Next.js URL**: Not planned yet
**Status**: 🔴 **BLOCKED - Epic 2 Incomplete**

#### Streamlit Data Sources
1. Celery worker status (via `celery inspect active`)
2. Kubernetes pod status (via `kubectl get pods`)
3. Worker logs (via `kubectl logs`)
4. Prometheus metrics (worker CPU, memory, task rate)

#### Next.js APIs
- ❌ **MISSING**: 5 worker monitoring endpoints (Epic 2 Story 2.1)

#### Data Mismatch Risk
🔴 **CRITICAL** - Backend APIs don't exist

#### Recommendation
- **Update Epic 2 Story 2.1**: Ensure all 5 endpoints are implemented
- **Verification**: Check `src/api/workers.py` exists

---

### ⏳ Page 11: System Prompt Editor

**Streamlit URL**: `http://localhost:8501/System_Prompt_Editor`
**Next.js URL**: Not planned yet
**Status**: ⚠️ **NEEDS VERIFICATION**

#### Streamlit Data Sources
1. `fetch_prompts()` → `PromptService.list_prompts()`
2. `fetch_prompt_by_id()` → `PromptService.get_prompt()`
3. `create_prompt()` → `PromptService.create_prompt()`
4. `update_prompt()` → `PromptService.update_prompt()`
5. `delete_prompt()` → `PromptService.delete_prompt()`
6. `test_prompt()` → `PromptService.test_prompt()` (with variable substitution)

#### Next.js APIs
- ⚠️ **Unverified**: Multiple prompt endpoints exist in `src/api/system_prompts.py`
- ⚠️ **Unknown**: Are all CRUD operations covered?
- ⚠️ **Unknown**: Is test_prompt() endpoint available?

#### Data Mismatch Risk
🟡 **MEDIUM** - APIs likely exist but need verification

#### Recommendation
- **API Audit**: List all `/api/prompts/*` endpoints
- **Test**: Verify CRUD + test functionality

---

### ✅ Page 12: Add Tool

**Streamlit URL**: `http://localhost:8501/Add_Tool`
**Next.js URL**: `http://localhost:3000/dashboard/tools/add`
**Status**: ✅ **100% API COVERAGE**

#### Next.js APIs
- ✅ `GET /api/tools`
- ✅ `POST /api/tools`
- ✅ `GET /api/tools/{id}`

#### Data Mismatch Risk
🟢 **LOW**

---

### ✅ Page 13: Execution History

**Streamlit URL**: `http://localhost:8501/Execution_History`
**Next.js URL**: `http://localhost:3000/dashboard/executions`
**Status**: ✅ **100% API COVERAGE**

#### Next.js APIs
- ✅ `GET /api/executions`
- ✅ `GET /api/executions/{id}`
- ✅ `GET /api/executions/{id}/logs`

#### Data Mismatch Risk
🟢 **LOW**

---

### ✅ Page 14: MCP Servers

**Streamlit URL**: `http://localhost:8501/MCP_Servers`
**Next.js URL**: `http://localhost:3000/dashboard/mcp-servers`
**Status**: ✅ **100% API COVERAGE**

#### Next.js APIs
- ✅ `GET /api/mcp-servers`
- ✅ `POST /api/mcp-servers`
- ✅ `PUT /api/mcp-servers/{id}`
- ✅ `DELETE /api/mcp-servers/{id}`
- ✅ `POST /api/mcp-servers/{id}/test`

#### Data Mismatch Risk
🟢 **LOW**

---

## Summary Statistics

### API Coverage
- **✅ 100% Coverage**: 6 pages (43%)
- **⚠️ Needs Verification**: 5 pages (36%)
- **🔴 Blocked/Missing**: 3 pages (21%)

### Risk Assessment
- 🟢 **Low Risk**: 6 pages
- 🟡 **Medium Risk**: 5 pages
- 🔴 **High/Critical Risk**: 3 pages

### Blockers
1. **Dashboard** (Page 01): 3 missing APIs
2. **Operations** (Page 09): 6 missing APIs, no Next.js page
3. **Workers** (Page 10): 5 missing APIs, Epic 2 incomplete

---

## Next Steps

### Immediate Actions (This Week)
1. ✅ Create this comparison findings document
2. ⏳ Run parity tests for verified pages (Tenants, Plugins, Agent Mgmt, etc.)
3. ⏳ Manual API verification for ⚠️ pages (History, LLM Providers, Prompts)
4. ⏳ Document specific data mismatches in parity tests

### Short-Term (Next 2 Weeks)
1. Create Epic 6: Operations Management APIs
2. Update Epic 2: Complete Workers APIs
3. Create Epic 5: Dashboard Metrics APIs (Prometheus proxy)
4. Fix hardcoded values in LLM Costs (Story nextjs-9 follow-up)

### Before Production Launch
1. 100% of parity tests passing
2. All ⚠️ APIs verified via curl/Postman
3. All 🔴 blockers resolved or scoped out
4. Manual UI comparison complete for all pages

---

## Testing Plan

### Phase 1: Automated Parity Tests
```bash
# Test all verified pages
pytest tests/integration/test_streamlit_nextjs_parity.py -v -m parity

# Test specific page
pytest tests/integration/test_streamlit_nextjs_parity.py::test_cost_summary_parity -v
```

### Phase 2: Manual API Verification
```bash
# Example: History page with filters
curl "http://localhost:8000/api/enhancements/history?limit=10&offset=0&tenant_id=xxx"

# Example: LLM Providers
curl "http://localhost:8000/api/llm-providers" || echo "API doesn't exist"
```

### Phase 3: UI Visual Comparison
- Open both UIs side-by-side
- Navigate to each page
- Compare metrics, charts, tables
- Document UI/UX differences
- Take screenshots for documentation

---

## Data Mismatch Examples

### Example 1: LLM Costs - Hardcoded Change %
**Location**: `nextjs-ui/app/dashboard/llm-costs/components/CostSummaryCards.tsx:433-436`

```typescript
// ❌ WRONG: Hardcoded to 0
const todayChange = formatPercentageChange(data.today_spend, 0);

// ✅ CORRECT: Should compare to yesterday
const todayChange = formatPercentageChange(data.today_spend, data.yesterday_spend);
```

**Fix**: Backend needs to return `yesterday_spend`, `last_week_spend`, `last_month_spend`

---

## Appendix: Validation Checklist

Use this checklist when comparing each page:

### Per-Page Checklist
- [ ] Streamlit page loads without errors
- [ ] Next.js page loads without errors
- [ ] All metrics display (no "N/A" or "0" when data exists)
- [ ] Charts render correctly (no "No data" when data exists)
- [ ] Filters work (date range, tenant selection, etc.)
- [ ] Pagination works (if applicable)
- [ ] CRUD operations work (create, read, update, delete)
- [ ] Search works (if applicable)
- [ ] Export works (if applicable)
- [ ] Real-time updates work (if applicable)
- [ ] Parity test passes

---

**Last Updated**: 2025-11-21 11:50:48
**Next Review**: After parity test execution
