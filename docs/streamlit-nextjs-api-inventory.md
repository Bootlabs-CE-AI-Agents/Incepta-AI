# Streamlit → Next.js Migration: API Inventory & Data Source Mapping

**Date:** 2025-11-21
**Purpose:** Complete mapping of Streamlit data sources to Next.js REST API endpoints
**Status:** 🔴 **CRITICAL REFERENCE DOCUMENT** - All migration work must validate against this

---

## Executive Summary

This document maps **every data source** from **all 14 Streamlit pages** to their corresponding Next.js REST API endpoints. Use this to:

1. **Validate migration completeness** - Is every Streamlit data source accessible via Next.js?
2. **Identify missing APIs** - Which data sources need new REST endpoints?
3. **Write parity tests** - Ensure Next.js returns identical data to Streamlit
4. **Guide story development** - Stories should reference this doc for API verification

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | REST API exists and verified |
| ⚠️ | REST API exists but needs verification (path/response unclear) |
| ❌ | NO REST API - requires backend story to create |
| 🔧 | Direct service access (Streamlit uses, not available via REST) |
| 📊 | External service (Prometheus, Celery, K8s) - may need abstraction layer |

---

## Page-by-Page Mapping

### Page 01: Dashboard (`/dashboard`)

**Streamlit:** `src/admin/pages/1_Dashboard.py`
**Next.js:** `nextjs-ui/app/dashboard/page.tsx`

| Streamlit Data Source | Type | REST API Endpoint | Status | Notes |
|---|---|---|---|---|
| `test_database_connection()` | Direct DB | `/api/health` → `check_db` | ✅ | src/api/health.py:15 |
| `test_redis_connection()` | Direct Redis | `/api/health` → `check_redis` | ✅ | src/api/health.py:25 |
| `get_queue_depth()` | Redis LLEN | `/api/metrics/queue-depth` | ⚠️ | Check src/api/metrics.py |
| `get_success_rate_24h()` | DB Query | `/api/metrics/success-rate?hours=24` | ⚠️ | Check src/api/metrics.py |
| `get_p95_latency()` | DB Query | `/api/metrics/latency?percentile=95` | ⚠️ | Check src/api/metrics.py |
| `get_active_workers()` | Celery inspect() | ❌ **MISSING** | 📊 | **Story 2.1 required** |
| `get_recent_failures()` | DB Query | `/api/executions?status=failed&limit=10` | ⚠️ | Verify executions API |
| `fetch_queue_depth_timeseries()` | Prometheus | ❌ **MISSING** | 📊 | Need Prometheus proxy API |
| `fetch_success_rate_timeseries()` | Prometheus | ❌ **MISSING** | 📊 | Need Prometheus proxy API |
| `fetch_latency_timeseries()` | Prometheus | ❌ **MISSING** | 📊 | Need Prometheus proxy API |

**Critical Gaps:**
- ❌ Worker monitoring (Celery) - **Blocker for Epic 2**
- ❌ Prometheus time-series - **Blocker for dashboard charts**

---

### Page 02: Tenants (`/dashboard/tenants`)

**Streamlit:** `src/admin/pages/2_Tenants.py`
**Next.js:** `nextjs-ui/app/dashboard/tenants/page.tsx`

| Streamlit Data Source | Type | REST API Endpoint | Status | Notes |
|---|---|---|---|---|
| `get_all_tenants()` | DB Query (tenants) | `/api/tenants` | ✅ | src/api/tenants.py:20 |
| `get_tenant_by_id(id)` | DB Query | `/api/tenants/{id}` | ✅ | src/api/tenants.py:35 |
| `show_tenant_budget_dashboard()` | Budget data | `/api/budget/{tenant_id}` | ✅ | src/api/budget.py |
| `show_tenant_byok_sections()` | BYOK config | `/api/byok/{tenant_id}` | ✅ | src/api/byok.py |

**Status:** ✅ **100% API coverage** - All Streamlit data sources have REST equivalents

---

### Page 03: Plugin Management (`/dashboard/plugins`)

**Streamlit:** `src/admin/pages/3_Plugin_Management.py`
**Next.js:** `nextjs-ui/app/dashboard/plugins/page.tsx`

| Streamlit Data Source | Type | REST API Endpoint | Status | Notes |
|---|---|---|---|---|
| `fetch_plugins()` | httpx → API | `/api/v1/plugins/` | ✅ | Streamlit ALREADY uses REST |
| `fetch_plugin_details(id)` | httpx → API | `/api/v1/plugins/{id}` | ✅ | src/api/plugins.py |
| `test_plugin_connection(id)` | httpx → API | `/api/v1/plugins/{id}/test` | ✅ | src/api/plugins.py |

**Status:** ✅ **100% API coverage** - Streamlit uses REST APIs directly

---

### Page 04: History (`/dashboard/execution-history`)

**Streamlit:** `src/admin/pages/4_History.py`
**Next.js:** `nextjs-ui/app/dashboard/execution-history/page.tsx` (Note: Name mismatch!)

| Streamlit Data Source | Type | REST API Endpoint | Status | Notes |
|---|---|---|---|---|
| `get_all_tenant_ids()` | DB Query | `/api/tenants` | ✅ | Reuse tenants API |
| `get_enhancement_history()` | DB Query (enhancement_history) | `/api/executions?limit=&offset=` | ⚠️ | Verify pagination support |
| `format_status_badge()` | UI Helper | N/A (frontend) | ✅ | Move to Next.js component |
| `convert_to_csv()` | Data export | N/A (frontend) | ✅ | Client-side export |

**Status:** ⚠️ **Needs verification** - Pagination params may differ

---

### Page 05: Agent Management (`/dashboard/agents`)

**Streamlit:** `src/admin/pages/5_Agent_Management.py`
**Next.js:** `nextjs-ui/app/dashboard/agents/page.tsx`

| Streamlit Data Source | Type | REST API Endpoint | Status | Notes |
|---|---|---|---|---|
| `fetch_agents_async()` | httpx → API | `/api/agents` | ✅ | src/api/agents.py:25 |
| `fetch_available_tenants()` | httpx → API | `/api/tenants` | ✅ | Reuse tenants API |
| `fetch_agent_detail_async(id)` | httpx → API | `/api/agents/{id}` | ✅ | src/api/agents.py:45 |
| `activate_agent_async(id)` | httpx → API | `/api/agents/{id}/activate` | ✅ | src/api/agents.py:89 |
| `fetch_unified_tools()` | Tool list | `/api/unified-tools` | ✅ | src/api/unified_tools.py |
| `fetch_mcp_server_health()` | MCP health | `/api/mcp-servers?health=true` | ⚠️ | Check health query param |

**Status:** ✅ **Near-complete** - Minor verification needed for MCP health

---

### Page 06: LLM Providers (`/dashboard/llm-providers`)

**Streamlit:** `src/admin/pages/6_LLM_Providers.py`
**Next.js:** `nextjs-ui/app/dashboard/llm-providers/page.tsx`

| Streamlit Data Source | Type | REST API Endpoint | Status | Notes |
|---|---|---|---|---|
| `get_models_from_litellm()` | LiteLLMProviderService | `/api/llm-providers/models` | ⚠️ | Check src/api/llm_providers.py |
| `add_model_to_litellm()` | httpx → LiteLLM proxy | `/api/llm-providers/models` (POST) | ⚠️ | Proxy to LiteLLM |
| `delete_model(id)` | httpx → LiteLLM proxy | `/api/llm-providers/models/{id}` (DELETE) | ⚠️ | Proxy to LiteLLM |

**Status:** ⚠️ **Needs API verification** - LiteLLM proxy endpoints may not be wrapped

---

### Page 07: Operations (`/dashboard/operations`)

**Streamlit:** `src/admin/pages/7_Operations.py`
**Next.js:** `nextjs-ui/app/dashboard/operations/page.tsx`

| Streamlit Data Source | Type | REST API Endpoint | Status | Notes |
|---|---|---|---|---|
| `is_processing_paused()` | Redis GET | ❌ **MISSING** | 🔧 | Direct Redis access |
| `get_queue_length()` | Redis LLEN | ❌ **MISSING** | 🔧 | Direct Redis access |
| `get_active_workers()` | Celery inspect() | ❌ **MISSING** | 📊 | **Story 2.1 required** |
| `pause_processing()` | Redis SET | ❌ **MISSING** | 🔧 | Need operations API |
| `resume_processing()` | Redis DELETE | ❌ **MISSING** | 🔧 | Need operations API |
| `clear_celery_queue()` | Redis LTRIM | ❌ **MISSING** | 🔧 | Need operations API |
| `sync_tenant_configs()` | DB + Redis | ❌ **MISSING** | 🔧 | Need operations API |
| `get_recent_operations()` | DB Query (operations_log) | ❌ **MISSING** | 🔧 | Need operations log API |

**Critical Gap:** ❌ **Entire page missing APIs** - **Epic 6: Operations Management API** required

---

### Page 08: Workers (`/dashboard/workers`)

**Streamlit:** `src/admin/pages/8_Workers.py`
**Next.js:** `nextjs-ui/app/dashboard/workers/page.tsx`

| Streamlit Data Source | Type | REST API Endpoint | Status | Notes |
|---|---|---|---|---|
| `fetch_celery_workers()` | Celery inspect().active_queues() | ❌ **MISSING** | 📊 | **Story 2.1: GET /api/workers** |
| `fetch_worker_resources()` | Prometheus (CPU/Mem) | ❌ **MISSING** | 📊 | **Story 2.1: GET /api/workers/{id}/metrics** |
| `fetch_worker_logs()` | Kubernetes API (kubectl logs) | ❌ **MISSING** | 📊 | **Story 2.1: GET /api/workers/{id}/logs** |
| `fetch_worker_throughput_history()` | Prometheus range query | ❌ **MISSING** | 📊 | **Story 2.1: GET /api/workers/{id}/metrics** |
| `restart_worker_k8s()` | Kubernetes API (rollout restart) | ❌ **MISSING** | 📊 | **Story 2.1: POST /api/workers/{id}/restart** |

**Critical Gap:** ❌ **Epic 2 entirely blocked** - Workers page has ZERO REST APIs

**Backend Work Required:**
1. Wrap Celery `inspect()` in REST endpoint
2. Proxy Prometheus metrics via REST
3. Proxy Kubernetes API (logs, restart) via REST
4. Create comprehensive `src/api/workers.py` router

---

### Page 09: System Prompt Editor (`/dashboard/prompts`)

**Streamlit:** `src/admin/pages/9_System_Prompt_Editor.py`
**Next.js:** `nextjs-ui/app/dashboard/prompts/page.tsx`

| Streamlit Data Source | Type | REST API Endpoint | Status | Notes |
|---|---|---|---|---|
| GET active agents | httpx → API | `/api/agents?status=active,draft&limit=100` | ✅ | src/api/agents.py |
| GET prompt templates | httpx → API | `/api/agents/prompt-templates` | ⚠️ | Verify endpoint exists |
| POST save prompt version | httpx → API | `/api/agents/{id}/prompt-versions` | ⚠️ | Check src/api/prompts.py |
| POST test prompt with LLM | httpx → API | `/api/llm/test` | ⚠️ | Check src/api/llm_models.py |
| GET version history | httpx → API | `/api/agents/{id}/prompt-versions` | ⚠️ | Verify versioning API |
| POST revert version | httpx → API | `/api/agents/{id}/prompt-versions/revert` | ⚠️ | Verify revert endpoint |
| POST create template | httpx → API | `/api/agents/prompt-templates` | ⚠️ | Verify templates API |
| DELETE template | httpx → API | `/api/agents/prompt-templates/{id}` | ⚠️ | Verify templates API |

**Status:** ⚠️ **Needs comprehensive API audit** - Streamlit uses many prompt-related endpoints

---

### Page 07: LLM Costs (`/dashboard/llm-costs`)

**Streamlit:** `src/admin/pages/07_LLM_Costs.py`
**Next.js:** `nextjs-ui/app/dashboard/llm-costs/page.tsx`

| Streamlit Data Source | Type | REST API Endpoint | Status | Notes |
|---|---|---|---|---|
| `fetch_cost_summary()` | LLMCostService.get_cost_summary() | `/api/costs/summary` | ✅ **VERIFIED** | src/api/llm_costs.py:40 |
| `fetch_daily_trend(days)` | LLMCostService.get_daily_spend_trend() | `/api/costs/trend?days=30` | ⚠️ | Verify endpoint exists |
| `fetch_token_breakdown()` | LLMCostService.get_token_breakdown() | `/api/costs/token-breakdown?start_date=&end_date=` | ⚠️ | Verify endpoint exists |
| `fetch_budget_utilization()` | LLMCostService.get_budget_utilization() | `/api/costs/budget-utilization` | ⚠️ | Verify endpoint exists |
| `fetch_agent_stats()` | LLMCostService.get_spend_by_agent() | `/api/costs/by-agent?start_date=&end_date=&limit=` | ✅ | src/api/llm_costs.py:93 |
| `fetch_model_spend()` | LLMCostService.get_spend_by_model() | `/api/costs/by-model?start_date=&end_date=` | ⚠️ | Check if endpoint exists |

**Status:** ✅ **Partial verification** - Summary endpoint proven identical, others need audit

**Migration Confidence:** HIGH - Service layer confirmed shared between Streamlit and Next.js

---

### Page 08: Agent Performance (`/dashboard/agent-performance`)

**Streamlit:** `src/admin/pages/08_Agent_Performance.py`
**Next.js:** `nextjs-ui/app/dashboard/agent-performance/page.tsx` (Note: May not exist yet!)

| Streamlit Data Source | Type | REST API Endpoint | Status | Notes |
|---|---|---|---|---|
| `fetch_all_metrics()` | AgentPerformanceService.get_metrics() | `/api/agents/{id}/metrics?start_date=&end_date=` | ⚠️ | Check src/api/agent_performance.py |
| `fetch_all_trends()` | AgentPerformanceService.get_trends() | `/api/agents/{id}/trends?granularity=hourly` | ⚠️ | Epic 1 Story 1.6 |
| `fetch_all_errors()` | AgentPerformanceService.get_error_analysis() | `/api/agents/{id}/error-analysis` | ⚠️ | Epic 1 Story 1.7 |
| `fetch_all_slowest()` | AgentPerformanceService.get_slowest_agents() | `/api/agents/slowest?limit=20` | ⚠️ | Epic 1 Story 1.8 |
| `fetch_all_history()` | AgentPerformanceService.get_execution_history() | `/api/agents/{id}/executions?limit=&offset=` | ⚠️ | May reuse executions API |
| `fetch_agent_list()` | Direct DB query (agents) | `/api/agents` | ✅ | Reuse agents API |

**Status:** ⚠️ **Epic 1 dependency** - Agents performance APIs created in Stories 1.5-1.8

---

### Page 10: Add Tool (`/dashboard/tools`)

**Streamlit:** `src/admin/pages/10_Add_Tool.py`
**Next.js:** `nextjs-ui/app/dashboard/tools/page.tsx`

| Streamlit Data Source | Type | REST API Endpoint | Status | Notes |
|---|---|---|---|---|
| `load_tenants()` | tenant_crud_helpers.get_all_tenants() | `/api/tenants` | ✅ | Reuse tenants API |
| POST parse OpenAPI spec | httpx → API | `/api/openapi-tools/parse` | ✅ | src/api/openapi_tools.py |
| POST test connection | httpx → API | `/api/openapi-tools/test-connection` | ✅ | src/api/openapi_tools.py |
| POST save tool | httpx → API | `/api/openapi-tools` | ✅ | src/api/openapi_tools.py |

**Status:** ✅ **100% API coverage** - Streamlit uses REST APIs directly

---

### Page 11: Execution History (`/dashboard/execution-history`)

**Streamlit:** `src/admin/pages/11_Execution_History.py`
**Next.js:** `nextjs-ui/app/dashboard/execution-history/page.tsx`

| Streamlit Data Source | Type | REST API Endpoint | Status | Notes |
|---|---|---|---|---|
| `get_agent_list()` | Direct DB query (agents) | `/api/agents` | ✅ | Reuse agents API |
| `get_tenant_list()` | Direct DB query (tenants) | `/api/tenants` | ✅ | Reuse tenants API |
| `get_execution_history()` | Direct DB query (agent_executions) | `/api/executions?agent_id=&tenant_id=&status=&limit=&offset=` | ✅ | src/api/executions.py |
| `fetch_execution_detail(id)` | httpx → API | `/api/agents/executions/{id}` | ✅ | src/api/agent_execution.py |

**Status:** ✅ **100% API coverage** - Streamlit uses mix of DB queries and REST (should migrate DB queries to REST)

---

### Page 12: MCP Servers (`/dashboard/mcp-servers`)

**Streamlit:** `src/admin/pages/12_MCP_Servers.py`
**Next.js:** `nextjs-ui/app/dashboard/mcp-servers/page.tsx`

| Streamlit Data Source | Type | REST API Endpoint | Status | Notes |
|---|---|---|---|---|
| `render_server_list()` | httpx → API | `/api/mcp-servers` | ✅ | src/api/mcp_servers.py |
| `render_server_details(id)` | httpx → API | `/api/mcp-servers/{id}` | ✅ | src/api/mcp_servers.py |

**Status:** ✅ **100% API coverage** - Streamlit uses REST APIs directly

---

## Summary Statistics

### Pages with 100% API Coverage ✅
1. **Tenants** (Page 02) - 4/4 endpoints exist
2. **Plugins** (Page 03) - 3/3 endpoints exist (Streamlit uses REST)
3. **Agent Management** (Page 05) - 6/6 endpoints exist
4. **Add Tool** (Page 10) - 4/4 endpoints exist
5. **Execution History** (Page 11) - 4/4 endpoints exist
6. **MCP Servers** (Page 12) - 2/2 endpoints exist

**Total: 6/14 pages (43%)** have complete API coverage

### Pages with Critical Missing APIs ❌
1. **Dashboard** (Page 01) - 3/10 missing (workers, Prometheus)
2. **Operations** (Page 07) - 8/8 missing (ALL Redis/Celery operations)
3. **Workers** (Page 08) - 5/5 missing (ALL Celery/K8s operations)

**Total: 3/14 pages (21%)** are completely blocked

### Pages Needing Verification ⚠️
1. **History** (Page 04) - Pagination params unclear
2. **LLM Providers** (Page 06) - LiteLLM proxy wrapping unclear
3. **System Prompt Editor** (Page 09) - Many prompt endpoints unverified
4. **LLM Costs** (Page 07) - 5/6 endpoints unverified (1 proven)
5. **Agent Performance** (Page 08) - Epic 1 dependency, endpoints in-progress

**Total: 5/14 pages (36%)** need API verification

---

## Critical Blockers for Migration

### Blocker 1: Workers Monitoring (Epic 2)
**Pages Affected:** Dashboard (Page 01), Workers (Page 08)
**Missing APIs:**
- `GET /api/workers` - List all Celery workers
- `GET /api/workers/{hostname}/metrics` - Worker CPU/memory/throughput
- `GET /api/workers/{hostname}/logs` - Pod logs from Kubernetes
- `POST /api/workers/{hostname}/restart` - Trigger K8s rollout restart

**Backend Work Required:**
- Create `src/api/workers.py` router
- Wrap Celery `inspect()` methods
- Proxy Prometheus queries for worker metrics
- Proxy Kubernetes API for logs and restarts

**Estimated Effort:** Epic 2, Story 2.1 (5 hours backend + 2 hours testing)

### Blocker 2: Operations Management (New Epic Required)
**Pages Affected:** Operations (Page 07)
**Missing APIs:**
- `GET /api/operations/status` - Check if processing paused
- `POST /api/operations/pause` - Pause Celery processing
- `POST /api/operations/resume` - Resume Celery processing
- `DELETE /api/operations/queue` - Clear Celery queue
- `POST /api/operations/sync-config` - Sync tenant configs to Redis
- `GET /api/operations/logs` - Recent operations log

**Backend Work Required:**
- Create `src/api/operations.py` router
- Wrap Redis operations (GET, SET, DELETE, LTRIM)
- Wrap Celery control methods
- Add operations logging (CRUD on operations_log table)

**Estimated Effort:** New Epic 6 (8 hours backend + 3 hours testing)

### Blocker 3: Prometheus Time-Series Data
**Pages Affected:** Dashboard (Page 01)
**Missing APIs:**
- `GET /api/metrics/queue-depth/timeseries?start=&end=` - Prometheus range query
- `GET /api/metrics/success-rate/timeseries?start=&end=` - Prometheus range query
- `GET /api/metrics/latency/timeseries?start=&end=&percentile=95` - Prometheus range query

**Backend Work Required:**
- Create `src/api/metrics.py` endpoints (may partially exist)
- Proxy Prometheus HTTP API queries
- Add response caching (Prometheus is slow)

**Estimated Effort:** 3 hours backend + 1 hour testing

---

## Migration Validation Checklist

Use this checklist when completing each page migration:

### For Each Streamlit Page:
- [ ] **API Inventory Complete** - All data sources identified and documented
- [ ] **API Endpoints Verified** - REST endpoints exist and tested via Postman/curl
- [ ] **Parity Test Written** - Test comparing Streamlit output vs Next.js API response
- [ ] **Parity Test Passing** - Data matches exactly (or differences documented)
- [ ] **Next.js Page Complete** - UI built and calling verified APIs
- [ ] **Manual Validation** - Screenshot comparison Streamlit vs Next.js
- [ ] **Performance Validated** - Next.js load time ≤ Streamlit load time

---

## Next Actions

### Immediate (This Week):
1. ✅ **API Verification Sprint** - Audit all ⚠️ endpoints (test via curl/Postman)
2. ✅ **Create Epic 6: Operations Management** - Backend API for Operations page
3. ✅ **Update Epic 2 Story 2.1** - Ensure all worker endpoints documented
4. ✅ **Create Parity Test Template** - Standard test pattern for all pages

### Short-Term (Next 2 Weeks):
1. ✅ **Complete Epic 2** - Workers APIs (5 endpoints)
2. ✅ **Complete Epic 6** - Operations APIs (6 endpoints)
3. ✅ **Add Prometheus Proxy** - Metrics time-series endpoints (3 endpoints)
4. ✅ **Run Parity Tests** - All 14 pages validated

### Medium-Term (Weeks 3-4):
1. ✅ **Fix Data Mismatches** - Any parity test failures resolved
2. ✅ **Update Epic Stories** - Reframe as "Migrate X from Streamlit" not "Create X"
3. ✅ **Create Deprecation Plan** - Roadmap for Streamlit sunset

---

## Document Maintenance

**Update Frequency:** After EVERY new REST API endpoint created
**Owner:** Tech Lead (validate all updates)
**Version Control:** Git tracked, reviewed in PRs

**When to Update:**
- New FastAPI router created (add to API column)
- Streamlit data source discovered (add new row)
- Endpoint verified working (change ⚠️ to ✅)
- API path changes (update endpoint column)

---

_This document is the source of truth for migration completeness. All migration stories MUST reference specific rows from this inventory._
