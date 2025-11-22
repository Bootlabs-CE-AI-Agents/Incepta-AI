# API Path Audit Report - CRITICAL FINDINGS

**Date**: 2025-11-21
**Status**: 🔴 **MAJOR DISCREPANCY DISCOVERED**
**Impact**: HIGH - API inventory document has incorrect endpoint paths

---

## Executive Summary

**Critical Discovery**: The documented API paths in `streamlit-nextjs-api-inventory.md` are INCORRECT. The actual FastAPI backend uses different path conventions:

- **Admin endpoints**: `/admin/*` (not `/api/*`)
- **Versioned endpoints**: `/api/v1/*` (not `/api/*`)
- **Mixed conventions**: Some use `/api/costs/*`, others use `/api/v1/agents/*`

**Impact**: This explains why manual API testing returned 404 errors. The Next.js frontend may be calling incorrect endpoints, or the API inventory documentation is wrong.

---

## Path Convention Analysis

### Discovered Patterns

#### Pattern 1: Admin Prefix (`/admin/*`)
**Used for**: Tenant management (admin operations)

**Examples**:
- `/admin/tenants` [POST, GET]
- `/admin/tenants/{tenant_id}` [GET, PUT, DELETE]
- `/admin/tenants/{tenant_id}/budget-override` [POST, DELETE]
- `/admin/tenants/{tenant_id}/rotate-llm-key` [POST]

**Documentation Assumed**: `/api/tenants`
**Actual Path**: `/admin/tenants`
**Status**: ❌ **INCORRECT IN DOCS**

#### Pattern 2: Versioned API (`/api/v1/*`)
**Used for**: Core application APIs (agents, plugins, prompts, tenants, feedback, health)

**Examples**:
- `/api/v1/agents` [POST, GET]
- `/api/v1/agents/{agent_id}` [GET, PUT, DELETE]
- `/api/v1/plugins/` [GET]
- `/api/v1/plugins/{plugin_id}` [GET]
- `/api/v1/prompts` [GET, POST]
- `/api/v1/tenants` [GET]
- `/api/v1/tenants/{tenant_id}` [GET]
- `/api/v1/mcp-servers/` [POST, GET]
- `/api/v1/unified-tools/` [GET]
- `/api/v1/feedback/` [POST, GET]
- `/api/v1/health` [GET]
- `/api/v1/ready` [GET]
- `/api/v1/metrics/agents` [GET]
- `/api/v1/metrics/queue` [GET]

**Documentation Assumed**: `/api/agents`, `/api/plugins`, `/api/prompts`
**Actual Path**: `/api/v1/agents`, `/api/v1/plugins/`, `/api/v1/prompts`
**Status**: ❌ **INCORRECT IN DOCS**

#### Pattern 3: Unversioned API (`/api/*`)
**Used for**: Specialized services (costs, auth, executions, specific agent operations)

**Examples**:
- `/api/costs/summary` [GET]
- `/api/costs/trend` [GET]
- `/api/costs/token-breakdown` [GET]
- `/api/costs/budget-utilization` [GET]
- `/api/costs/by-agent` [GET]
- `/api/costs/by-model` [GET]
- `/api/costs/by-tenant` [GET]
- `/api/auth/register` [POST]
- `/api/auth/token` [POST]
- `/api/auth/refresh` [POST]
- `/api/auth/logout` [POST]
- `/api/executions/{execution_id}` [GET]
- `/api/agents/{agent_id}/metrics` [GET]
- `/api/agents/{agent_id}/trends` [GET]
- `/api/agents/{agent_id}/history` [GET]
- `/api/agents/{agent_id}/error-analysis` [GET]
- `/api/agents/{agent_id}/memory/*` [various]
- `/api/agents/slowest` [GET]
- `/api/llm-providers` [GET, POST]
- `/api/llm-models` [POST]
- `/api/openapi-tools` [POST, GET]
- `/api/fallback-chains` [GET, POST]
- `/api/tenants/{tenant_id}/spend` [GET]
- `/api/tenants/{tenant_id}/byok/*` [various]
- `/api/agent-execution/execute` [POST]
- `/api/agent-execution/health` [GET]

**Documentation Assumed**: Partially correct (costs APIs), incorrect for others
**Actual Path**: Mixed - some correct, some need correction
**Status**: ⚠️ **PARTIALLY CORRECT**

#### Pattern 4: Webhook Endpoints (`/webhook/*`)
**Used for**: External webhook integrations

**Examples**:
- `/webhook/agents/{agent_id}/webhook` [POST]
- `/webhook/servicedesk` [POST]
- `/webhook/servicedesk/resolved-ticket` [POST]

**Documentation Status**: Not covered in inventory
**Status**: ℹ️ **NOT DOCUMENTED**

---

## Corrected API Paths by Page

### Page 02: Tenants

**INCORRECT Documentation**:
- GET `/api/tenants`
- POST `/api/tenants`
- PUT `/api/tenants/{id}`
- DELETE `/api/tenants/{id}`

**CORRECT Actual Paths**:
- GET `/admin/tenants` - Admin list
- POST `/admin/tenants` - Admin create
- GET `/admin/tenants/{tenant_id}` - Admin get
- PUT `/admin/tenants/{tenant_id}` - Admin update
- DELETE `/admin/tenants/{tenant_id}` - Admin delete
- GET `/api/v1/tenants` - Public list (filtered by user)
- GET `/api/v1/tenants/{tenant_id}` - Public get

**Implications**: Next.js Tenants page likely calls `/admin/tenants`, NOT `/api/tenants`

---

### Page 03: Plugins

**INCORRECT Documentation**:
- GET `/api/plugins`
- POST `/api/plugins`
- PUT `/api/plugins/{id}`
- DELETE `/api/plugins/{id}`

**CORRECT Actual Paths**:
- GET `/api/v1/plugins/` - List plugins
- GET `/api/v1/plugins/{plugin_id}` - Get plugin
- POST `/api/v1/plugins/{plugin_id}/test` - Test plugin

**Implications**:
- ❌ **NO CREATE/UPDATE/DELETE endpoints exist!**
- Plugins appear to be read-only via API
- Testing is the only write operation

---

### Page 05: Agent Management

**INCORRECT Documentation**:
- GET `/api/agents`
- POST `/api/agents`
- PUT `/api/agents/{id}`
- DELETE `/api/agents/{id}`

**CORRECT Actual Paths**:
- GET `/api/v1/agents` - List agents
- POST `/api/v1/agents` - Create agent
- GET `/api/v1/agents/{agent_id}` - Get agent
- PUT `/api/v1/agents/{agent_id}` - Update agent
- DELETE `/api/v1/agents/{agent_id}` - Delete agent
- POST `/api/v1/agents/{agent_id}/activate` - Activate agent
- GET `/api/v1/agents/{agent_id}/webhook-secret` - Get webhook secret
- POST `/api/v1/agents/{agent_id}/regenerate-webhook-secret` - Regenerate secret
- GET `/api/v1/agents/tool-usage-stats` - Tool usage stats

**Implications**: Paths use `/api/v1/` prefix, NOT `/api/`

---

### Page 07: LLM Costs

**CORRECT Documentation** ✅:
- GET `/api/costs/summary`
- GET `/api/costs/trend`
- GET `/api/costs/token-breakdown`
- GET `/api/costs/budget-utilization`
- GET `/api/costs/by-agent`
- GET `/api/costs/by-model`
- GET `/api/costs/by-tenant`

**Status**: All paths CORRECT (unversioned `/api/costs/*` pattern)

---

### Page 08: Agent Performance

**PARTIALLY CORRECT Documentation**:

**Documented**:
- `/api/agents/{id}/metrics`
- `/api/agents/{id}/history`

**Additional Paths Found**:
- GET `/api/agents/{agent_id}/metrics` ✅
- GET `/api/agents/{agent_id}/history` ✅
- GET `/api/agents/{agent_id}/trends` ⚠️ NOT DOCUMENTED
- GET `/api/agents/{agent_id}/error-analysis` ⚠️ NOT DOCUMENTED
- GET `/api/agents/slowest` ⚠️ NOT DOCUMENTED
- GET `/api/agents/{agent_id}/memory/history` ⚠️ NOT DOCUMENTED
- GET `/api/agents/{agent_id}/memory/state` ⚠️ NOT DOCUMENTED
- GET `/api/agents/{agent_id}/memory/config` ⚠️ NOT DOCUMENTED
- PUT `/api/agents/{agent_id}/memory/config` ⚠️ NOT DOCUMENTED
- DELETE `/api/agents/{agent_id}/memory` ⚠️ NOT DOCUMENTED

**Status**: ⚠️ **MORE ENDPOINTS EXIST** than documented

---

### Page 11: System Prompt Editor

**INCORRECT Documentation**:
- `/api/prompts`

**CORRECT Actual Paths**:
- GET `/api/v1/prompts` - List prompts
- POST `/api/v1/prompts` - Create prompt
- GET `/api/v1/prompts/{template_id}` - Get prompt
- PUT `/api/v1/prompts/{template_id}` - Update prompt
- DELETE `/api/v1/prompts/{template_id}` - Delete prompt
- POST `/api/v1/prompts/test` - Test prompt
- GET `/api/v1/prompts/{agent_id}/prompt-versions` - Get versions
- GET `/api/v1/prompts/{agent_id}/prompt-versions/{version_id}` - Get specific version
- POST `/api/v1/prompts/{agent_id}/prompt-versions/revert` - Revert to version

**Implications**: Uses `/api/v1/` prefix + versioning support exists

---

### Page 12: Add Tool

**INCORRECT Documentation**:
- `/api/tools`

**CORRECT Actual Paths**:
- GET `/api/v1/unified-tools/` - List unified tools
- POST `/api/openapi-tools` - Create OpenAPI tool
- GET `/api/openapi-tools` - List OpenAPI tools
- GET `/api/openapi-tools/{tool_id}` - Get tool
- POST `/api/openapi-tools/parse` - Parse OpenAPI spec
- POST `/api/openapi-tools/test-connection` - Test connection

**Implications**:
- Two tool systems: "unified tools" (read-only) and "OpenAPI tools" (CRUD)
- Documented path `/api/tools` doesn't exist

---

### Page 13: Execution History

**INCORRECT Documentation**:
- `/api/executions`
- `/api/executions/{id}`
- `/api/executions/{id}/logs`

**CORRECT Actual Paths**:
- GET `/api/executions/{execution_id}` - Get single execution
- POST `/api/agent-execution/execute` - Execute agent
- GET `/api/agent-execution/health` - Execution health

**Implications**:
- ❌ **NO LIST ENDPOINT** (`GET /api/executions`) exists!
- Only single execution retrieval available
- No logs endpoint found

---

### Page 14: MCP Servers

**INCORRECT Documentation**:
- `/api/mcp-servers`

**CORRECT Actual Paths**:
- POST `/api/v1/mcp-servers/` - Create server
- GET `/api/v1/mcp-servers/` - List servers
- GET `/api/v1/mcp-servers/{server_id}` - Get server
- PATCH `/api/v1/mcp-servers/{server_id}` - Update server (NOT PUT!)
- DELETE `/api/v1/mcp-servers/{server_id}` - Delete server
- POST `/api/v1/mcp-servers/test-connection` - Test connection
- POST `/api/v1/mcp-servers/{server_id}/discover` - Discover tools
- GET `/api/v1/mcp-servers/{server_id}/health` - Get health
- POST `/api/v1/mcp-servers/{server_id}/health-check` - Check health
- GET `/api/v1/mcp-servers/{server_id}/metrics` - Get metrics

**Implications**: Uses `/api/v1/` prefix + uses PATCH instead of PUT

---

## Impact Analysis

### High Impact Issues

1. **Tenants Page**: Documented `/api/tenants` → Actual `/admin/tenants` or `/api/v1/tenants`
   - **Risk**: 🔴 **CRITICAL** - Page completely non-functional if using wrong path

2. **Agents Page**: Documented `/api/agents` → Actual `/api/v1/agents`
   - **Risk**: 🔴 **CRITICAL** - Page completely non-functional if using wrong path

3. **Plugins Page**: Documented CRUD endpoints → Actual **NO WRITE OPERATIONS**
   - **Risk**: 🔴 **CRITICAL** - Create/Update/Delete buttons don't work

4. **Execution History**: Documented `/api/executions` list → Actual **NO LIST ENDPOINT**
   - **Risk**: 🔴 **CRITICAL** - Cannot list executions, only get single by ID

### Medium Impact Issues

5. **Prompts Page**: Documented `/api/prompts` → Actual `/api/v1/prompts`
   - **Risk**: 🟡 **MEDIUM** - Wrong prefix

6. **Tools Page**: Documented `/api/tools` → Actual `/api/v1/unified-tools/` + `/api/openapi-tools`
   - **Risk**: 🟡 **MEDIUM** - Wrong path + dual tool systems

7. **MCP Servers**: Uses PATCH instead of PUT for updates
   - **Risk**: 🟡 **MEDIUM** - HTTP method mismatch

### Low Impact Issues

8. **LLM Costs**: All paths CORRECT ✅
   - **Risk**: 🟢 **LOW** - No issues

9. **Agent Performance**: More endpoints exist than documented
   - **Risk**: 🟢 **LOW** - Feature-rich, just underdocumented

---

## Root Cause

**Why This Happened**:

1. **Gap Analysis Assumptions**: The API inventory was created by analyzing Streamlit imports and *assuming* REST API paths followed standard conventions (`/api/resource`)

2. **No OpenAPI Spec Review**: The inventory was not validated against the actual OpenAPI spec (`/openapi.json`)

3. **Mixed API Conventions**: The backend uses THREE different path conventions (`/admin/*`, `/api/v1/*`, `/api/*`) without clear documentation of when to use which

4. **Version Evolution**: API v1 (`/api/v1/*`) suggests there was a migration from unversioned to versioned endpoints, but not all endpoints were migrated

---

## Recommended Actions

### Immediate (Today)

1. **✅ Update API Inventory Document**
   - Correct all endpoint paths
   - Add version prefixes
   - Mark missing endpoints

2. **✅ Test Corrected Paths**
   - Re-run manual API verification with correct paths
   - Update comparison findings

3. **⚠️ Audit Next.js Frontend**
   - Check which paths Next.js actually uses
   - Determine if Next.js is correct and docs are wrong, or vice versa

### Short-Term (This Week)

4. **Backend API Convention Documentation**
   - Document when to use `/admin/*` vs `/api/v1/*` vs `/api/*`
   - Create API design guidelines

5. **Create Missing Endpoints Epic**
   - Plugins CRUD operations (if needed)
   - Executions list endpoint (if needed)

6. **Frontend Path Audit**
   - Search Next.js codebase for all `fetch()` calls
   - Verify paths match OpenAPI spec

### Long-Term (Next Sprint)

7. **API Versioning Strategy**
   - Decide: Migrate all to `/api/v1/*`? Or keep mixed?
   - Document versioning policy

8. **OpenAPI Spec as Single Source of Truth**
   - Generate TypeScript types from OpenAPI spec
   - Auto-validate frontend API calls

---

## Validation Tests

### Test with Corrected Paths

```bash
# Tenants (Admin)
curl "http://localhost:8000/admin/tenants" -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001"

# Tenants (Public)
curl "http://localhost:8000/api/v1/tenants" -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001"

# Agents
curl "http://localhost:8000/api/v1/agents" -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001"

# Plugins
curl "http://localhost:8000/api/v1/plugins/" -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001"

# Prompts
curl "http://localhost:8000/api/v1/prompts" -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001"

# MCP Servers
curl "http://localhost:8000/api/v1/mcp-servers/" -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001"

# LLM Costs (should still work)
curl "http://localhost:8000/api/costs/summary" -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001"
```

---

## Next Steps

1. ✅ **Document this finding** (THIS FILE)
2. ⏳ **Run corrected API tests** (next task)
3. ⏳ **Update API inventory with correct paths**
4. ⏳ **Audit Next.js frontend for path mismatches**
5. ⏳ **Create tickets for missing endpoints**

---

**Last Updated**: 2025-11-21 17:45:00
**Next Review**: After corrected API testing complete

---

## Appendix: Full Endpoint List (108 endpoints)

<details>
<summary>Click to expand complete endpoint list</summary>

```
/ [GET]
/admin/tenants [POST, GET]
/admin/tenants/{tenant_id} [GET, PUT, DELETE]
/admin/tenants/{tenant_id}/budget-override [POST, DELETE]
/admin/tenants/{tenant_id}/rotate-llm-key [POST]
/api/agent-execution/execute [POST]
/api/agent-execution/health [GET]
/api/agents/slowest [GET]
/api/agents/{agent_id}/error-analysis [GET]
/api/agents/{agent_id}/history [GET]
/api/agents/{agent_id}/memory [DELETE]
/api/agents/{agent_id}/memory/config [GET, PUT]
/api/agents/{agent_id}/memory/history [GET]
/api/agents/{agent_id}/memory/state [GET]
/api/agents/{agent_id}/metrics [GET]
/api/agents/{agent_id}/test [POST]
/api/agents/{agent_id}/test-history [GET]
/api/agents/{agent_id}/test/compare [POST]
/api/agents/{agent_id}/test/{test_id} [GET]
/api/agents/{agent_id}/trends [GET]
/api/auth/logout [POST]
/api/auth/refresh [POST]
/api/auth/register [POST]
/api/auth/token [POST]
/api/costs/budget-utilization [GET]
/api/costs/by-agent [GET]
/api/costs/by-model [GET]
/api/costs/by-tenant [GET]
/api/costs/summary [GET]
/api/costs/token-breakdown [GET]
/api/costs/trend [GET]
/api/executions/{execution_id} [GET]
/api/fallback-chains [GET, POST]
/api/fallback-chains/metrics [GET]
/api/fallback-chains/model/{model_id} [GET]
/api/fallback-chains/test [POST]
/api/fallback-chains/{chain_id} [GET, PUT, DELETE]
/api/fallback-chains/{chain_id}/toggle [POST]
/api/llm-models [POST]
/api/llm-models/available [GET]
/api/llm-models/bulk-disable [POST]
/api/llm-models/bulk-enable [POST]
/api/llm-models/{model_id} [GET, PUT, DELETE]
/api/llm-models/{model_id}/toggle [POST]
/api/llm-providers [GET, POST]
/api/llm-providers/{provider_id} [GET, PUT, DELETE]
/api/llm-providers/{provider_id}/models [GET]
/api/llm-providers/{provider_id}/sync-models [POST]
/api/llm-providers/{provider_id}/test-connection [POST]
/api/openapi-tools [POST, GET]
/api/openapi-tools/parse [POST]
/api/openapi-tools/test-connection [POST]
/api/openapi-tools/{tool_id} [GET]
/api/tenants/{tenant_id}/byok/disable [POST]
/api/tenants/{tenant_id}/byok/enable [POST]
/api/tenants/{tenant_id}/byok/rotate-keys [PUT]
/api/tenants/{tenant_id}/byok/status [GET]
/api/tenants/{tenant_id}/byok/test-keys [POST]
/api/tenants/{tenant_id}/spend [GET]
/api/users/me [GET]
/api/users/me/password [PUT]
/api/v1/agents [POST, GET]
/api/v1/agents/tool-usage-stats [GET]
/api/v1/agents/{agent_id} [GET, PUT, DELETE]
/api/v1/agents/{agent_id}/activate [POST]
/api/v1/agents/{agent_id}/error-analysis [GET]
/api/v1/agents/{agent_id}/regenerate-webhook-secret [POST]
/api/v1/agents/{agent_id}/webhook-secret [GET]
/api/v1/budget-alerts [POST]
/api/v1/feedback/ [POST, GET]
/api/v1/feedback/stats [GET]
/api/v1/health [GET]
/api/v1/health/litellm [GET]
/api/v1/mcp-servers/ [POST, GET]
/api/v1/mcp-servers/test-connection [POST]
/api/v1/mcp-servers/{server_id} [GET, PATCH, DELETE]
/api/v1/mcp-servers/{server_id}/discover [POST]
/api/v1/mcp-servers/{server_id}/health [GET]
/api/v1/mcp-servers/{server_id}/health-check [POST]
/api/v1/mcp-servers/{server_id}/metrics [GET]
/api/v1/metrics/agents [GET]
/api/v1/metrics/queue [GET]
/api/v1/plugins/ [GET]
/api/v1/plugins/{plugin_id} [GET]
/api/v1/plugins/{plugin_id}/test [POST]
/api/v1/prompts [GET, POST]
/api/v1/prompts/test [POST]
/api/v1/prompts/{agent_id}/prompt-versions [GET]
/api/v1/prompts/{agent_id}/prompt-versions/revert [POST]
/api/v1/prompts/{agent_id}/prompt-versions/{version_id} [GET]
/api/v1/prompts/{template_id} [GET, PUT, DELETE]
/api/v1/ready [GET]
/api/v1/tenants [GET]
/api/v1/tenants/{tenant_id} [GET]
/api/v1/tenants/{tenant_id}/validate-llm-key [GET]
/api/v1/unified-tools/ [GET]
/health [GET]
/webhook/agents/{agent_id}/webhook [POST]
/webhook/servicedesk [POST]
/webhook/servicedesk/resolved-ticket [POST]
```

</details>
