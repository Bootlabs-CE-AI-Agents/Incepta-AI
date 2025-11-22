# Next.js API Path Analysis Summary

**Date**: 2025-11-21
**Status**: 🔴 **CRITICAL - Mixed Path Conventions Confirmed**

---

## Executive Summary

Extracted **54 unique API paths** from Next.js codebase. Analysis reveals **MIXED path conventions** with critical mismatches against backend OpenAPI spec:

**Key Findings**:
1. **useAgents** uses `/api/agents` but backend has `/api/v1/agents` ❌
2. **LLM Costs** frontend uses `/api/v1/costs/*` but backend has `/api/costs/*` ❌
3. Most other pages correctly use `/api/v1/*` pattern ✅
4. Some paths use `:id` (Next.js convention) vs `{id}` (OpenAPI convention)

---

## All Next.js API Paths (54 total)

### Authentication & Users (6 paths)
```
'/api/auth/signin'
'/api/v1/auth/login'
'/api/v1/users/me'
'/api/v1/users/me/role'
'/api/v1/users/me/role?tenant_id=1'
'/api/v1/users/me/tenants'
```

**Status**: ✅ Mostly correct (auth uses `/api/auth/*` which exists in backend)

### Agents (7 paths)
```
'/api/agents?status=active'                                    ❌ WRONG PATH
'/api/agents/agent-123/metrics?start_date=2025-01-14&end_date=2025-01-21'  ❌ WRONG PATH
'/api/agents/agent-123/trends'                                ❌ WRONG PATH
'/api/v1/agents'                                              ✅ CORRECT
'/api/v1/agents/:id'                                          ✅ CORRECT
'/api/v1/agents/:id/test'                                     ✅ CORRECT
'/api/v1/agents/:id/tools'                                    ✅ CORRECT
'/api/v1/agents/options'                                      ⚠️ VERIFY
```

**Critical Issue**: `useAgents` hook uses `/api/agents` instead of `/api/v1/agents`
**Impact**: HIGH - Agent selector broken across multiple pages

### Tenants (4 paths)
```
'/api/v1/tenants'                                             ✅ CORRECT
'/api/v1/tenants/:id'                                         ✅ CORRECT
'/api/v1/tenants/switch'                                      ⚠️ VERIFY
```

**Status**: ✅ Correct paths (uses `/api/v1/tenants`)

### LLM Costs (4 paths)
```
'/api/v1/costs/summary'                                       ❌ WRONG PATH
'/api/v1/costs/token-breakdown'                               ❌ WRONG PATH
'/api/v1/costs/trend?days=7'                                  ❌ WRONG PATH
'/api/v1/costs/trend?days=30'                                 ❌ WRONG PATH
```

**Critical Issue**: Frontend uses `/api/v1/costs/*` but backend has `/api/costs/*` (no v1!)
**Impact**: MEDIUM-HIGH - LLM Costs dashboard may not load

**Backend Reality**:
```
'/api/costs/summary'          ✅ EXISTS (confirmed via curl)
'/api/costs/trend'            ✅ EXISTS (confirmed via curl)
'/api/costs/token-breakdown'  ✅ EXISTS (per OpenAPI spec)
'/api/costs/by-agent'         ✅ EXISTS (confirmed via curl)
'/api/costs/by-model'         ✅ EXISTS (per OpenAPI spec)
'/api/costs/budget-utilization' ✅ EXISTS (per OpenAPI spec)
```

### LLM Providers (6 paths)
```
'/api/v1/llm-providers'                                       ✅ CORRECT
'/api/v1/llm-providers/:id'                                   ✅ CORRECT
'/api/v1/llm-providers/:id/models'                            ✅ CORRECT
'/api/v1/llm-providers/:id/models/refresh'                    ⚠️ VERIFY
'/api/v1/llm-providers/test'                                  ⚠️ VERIFY
```

**Status**: ✅ Likely correct (uses `/api/v1/llm-providers`)

### Plugins (1 path)
```
'/api/v1/plugins'                                             ⚠️ NEEDS TRAILING SLASH
```

**Backend Reality**: `/api/v1/plugins/` (with trailing slash)
**Impact**: LOW - May work due to FastAPI redirect, but should add slash

### Prompts (2 paths)
```
'/api/v1/prompts'                                             ✅ CORRECT
'/api/v1/prompts/test'                                        ⚠️ VERIFY
```

**Status**: ✅ Correct paths

### MCP Servers (4 paths)
```
'/api/v1/mcp-servers'                                         ⚠️ NEEDS TRAILING SLASH
'/api/v1/mcp-servers/:id'                                     ⚠️ NEEDS TRAILING SLASH
'/api/v1/mcp-servers/:id/health'                              ⚠️ VERIFY
'/api/v1/mcp-servers/:id/tools'                               ⚠️ VERIFY
'/api/v1/mcp-servers/test'                                    ⚠️ VERIFY
```

**Backend Reality**: `/api/v1/mcp-servers/` (with trailing slash)
**Impact**: LOW-MEDIUM - May cause intermittent 404s

### Tools (2 paths)
```
'/api/v1/tools'                                               ❌ NOT FOUND (404)
'/api/v1/tools/parse'                                         ❌ NOT FOUND (404)
```

**Status**: ❌ Endpoint doesn't exist in backend
**Impact**: HIGH - Tools management page won't work

### Executions (2 paths)
```
'/api/v1/executions'                                          ❌ LIST ENDPOINT MISSING
'/api/v1/executions/export'                                   ⚠️ VERIFY
```

**Backend Reality**: Only `/api/executions/{execution_id}` (get single) exists
**Impact**: HIGH - Execution history list page won't work

### Queue & Metrics (7 paths)
```
'/api/v1/queue/metrics'                                       ⚠️ VERIFY
'/api/v1/queue/pause'                                         ⚠️ VERIFY
'/api/v1/queue/resume'                                        ⚠️ VERIFY
'/api/v1/queue/status'                                        ⚠️ VERIFY
'/api/v1/queue/tasks'                                         ⚠️ VERIFY
'/api/v1/metrics/agents'                                      ⚠️ VERIFY
'/api/v1/metrics/queue'                                       ⚠️ VERIFY
```

**Status**: ⚠️ Need to verify existence (not in OpenAPI spec top-level paths)

### Workers (3 paths)
```
'/api/v1/workers'                                             ⚠️ VERIFY (Story 2.1)
'/api/v1/workers/:id/logs'                                    ⚠️ VERIFY (Story 2.1)
'/api/v1/workers/:id/restart'                                 ⚠️ VERIFY (Story 2.1)
```

**Status**: ⚠️ Epic 2 Story 2.1 - Need to verify implementation

### Audit (3 paths)
```
'/api/v1/audit/auth'                                          ⚠️ VERIFY
'/api/v1/audit/general'                                       ⚠️ VERIFY
'/api/v1/audit/general/:id/diff'                              ⚠️ VERIFY
```

**Status**: ⚠️ Need to verify existence

### Misc (4 paths)
```
'/api/v1/health'                                              ✅ LIKELY EXISTS
'/api/resource'                                               ⚠️ GENERIC PLACEHOLDER
'/api/users'                                                  ⚠️ DUPLICATE?
'/api/users/{id}'                                             ⚠️ DUPLICATE?
'/api/v1/organizations/{orgId}/projects/{projectId}/issues/{issueId}/comments'  ⚠️ SENTRY?
```

---

## Path Mismatch Summary

### 🔴 Critical (HIGH IMPACT) - Fix Immediately

1. **useAgents Hook**: `/api/agents` → `/api/v1/agents`
   - **File**: `nextjs-ui/hooks/useAgents.ts:23`
   - **Impact**: Agent selector broken across all pages
   - **Fix**: 1-line change

2. **LLM Costs Hooks**: `/api/v1/costs/*` → `/api/costs/*`
   - **Files**:
     - `nextjs-ui/hooks/useLLMCostSummary.ts:22`
     - `nextjs-ui/hooks/useLLMCostTrend.ts` (assumed)
     - `nextjs-ui/hooks/useTokenBreakdown.ts` (assumed)
     - `nextjs-ui/hooks/useBudgetUtilization.ts` (assumed)
   - **Impact**: LLM Costs dashboard may show errors
   - **Fix**: Change all `/api/v1/costs/*` to `/api/costs/*`

3. **Tools Endpoint Missing**: `/api/v1/tools` returns 404
   - **Impact**: Tools management page won't work
   - **Fix**: Either implement endpoint OR remove frontend page

4. **Executions List Missing**: `/api/v1/executions` (list) doesn't exist
   - **Backend Has**: Only `/api/executions/{execution_id}` (get single)
   - **Impact**: Execution history list page won't work
   - **Fix**: Implement list endpoint in backend

### 🟡 Medium Impact - Fix Soon

5. **Trailing Slash Requirements**:
   - Plugins: `/api/v1/plugins` → `/api/v1/plugins/`
   - MCP Servers: `/api/v1/mcp-servers` → `/api/v1/mcp-servers/`
   - **Impact**: Intermittent 404s (FastAPI may redirect)
   - **Fix**: Add trailing slashes in frontend

6. **Agent Metrics Paths**: Frontend uses `/api/agents/*/metrics` but should use `/api/v1/agents/*/metrics`
   - **Impact**: Agent Performance page metrics may not load
   - **Fix**: Update to `/api/v1/agents/` prefix

### 🟢 Low Impact - Verify & Document

7. **Unverified Endpoints**: 15+ paths need existence verification
   - Queue management endpoints
   - Audit endpoints
   - Worker endpoints (Epic 2 Story 2.1)
   - Various "test" endpoints

---

## Recommended Fix Strategy

### Option A: Fix Frontend to Match Backend (RECOMMENDED)

**Pros**:
- Backend paths are correct per OpenAPI spec
- No backend changes needed
- Faster to implement

**Cons**:
- Need to update multiple Next.js files

**Changes Required**:
```typescript
// 1. Fix useAgents hook
- '/api/agents?status=active'
+ '/api/v1/agents?status=active'

// 2. Fix LLM Costs hooks (all 4 files)
- '/api/v1/costs/summary'
+ '/api/costs/summary'

- '/api/v1/costs/trend'
+ '/api/costs/trend'

- '/api/v1/costs/token-breakdown'
+ '/api/costs/token-breakdown'

- '/api/v1/costs/budget-utilization'
+ '/api/costs/budget-utilization'

// 3. Add trailing slashes
- '/api/v1/plugins'
+ '/api/v1/plugins/'

- '/api/v1/mcp-servers'
+ '/api/v1/mcp-servers/'

// 4. Fix agent metrics (if used)
- '/api/agents/{id}/metrics'
+ '/api/v1/agents/{id}/metrics'
```

**Estimated Effort**: 2-4 hours

### Option B: Add Backend Route Aliases

**Pros**:
- Frontend works immediately
- Backward compatibility

**Cons**:
- Maintains inconsistent path conventions
- More backend code to maintain

**Not recommended** unless short-term production hotfix needed

---

## Testing Plan

After path corrections:

```bash
#!/bin/bash
# Test all corrected paths

TENANT_ID="00000000-0000-0000-0000-000000000001"

# Get JWT token
TOKEN=$(curl -s -X POST "http://localhost:8000/api/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin" \
  | python3 -c "import json, sys; print(json.load(sys.stdin)['access_token'])")

echo "Testing corrected paths..."

# 1. Agents (fixed path)
echo "=== Agents ==="
curl -s "http://localhost:8000/api/v1/agents?status=active" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  | python3 -m json.tool

# 2. LLM Costs (fixed paths)
echo "=== LLM Costs Summary ==="
curl -s "http://localhost:8000/api/costs/summary" \
  -H "X-Tenant-ID: $TENANT_ID" \
  | python3 -m json.tool

echo "=== LLM Costs Trend ==="
curl -s "http://localhost:8000/api/costs/trend?days=7" \
  -H "X-Tenant-ID: $TENANT_ID" \
  | python3 -m json.tool

# 3. Plugins (with trailing slash)
echo "=== Plugins ==="
curl -s "http://localhost:8000/api/v1/plugins/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  | python3 -m json.tool

# 4. Tenants
echo "=== Tenants ==="
curl -s "http://localhost:8000/api/v1/tenants" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  | python3 -m json.tool

echo "All tests complete!"
```

---

## Next Steps

1. ✅ **Extract all Next.js API paths** - COMPLETED (54 paths found)
2. ⏳ **Fix useAgents hook** - 1-line change, HIGH priority
3. ⏳ **Fix LLM Costs hooks** - 4 files, MEDIUM-HIGH priority
4. ⏳ **Add trailing slashes** - Plugins and MCP Servers
5. ⏳ **Verify unimplemented endpoints** - Tools, Executions list
6. ⏳ **Update API inventory document** with corrected paths
7. ⏳ **Run comprehensive path test suite**
8. ⏳ **Add automated path validation to CI/CD**

---

## Files to Update (Priority Order)

### High Priority (Fix Today)
1. `nextjs-ui/hooks/useAgents.ts` - Line 23
2. `nextjs-ui/hooks/useLLMCostSummary.ts` - Line 22
3. `nextjs-ui/hooks/useLLMCostTrend.ts` - (find line)
4. `nextjs-ui/hooks/useTokenBreakdown.ts` - (find line)
5. `nextjs-ui/hooks/useBudgetUtilization.ts` - (find line)

### Medium Priority (Fix This Week)
6. All files using `/api/v1/plugins` - add trailing slash
7. All files using `/api/v1/mcp-servers` - add trailing slash
8. Agent metrics hook files (if exist) - update to `/api/v1/agents/`

### Low Priority (Verify & Document)
9. Verify queue endpoint existence
10. Verify audit endpoint existence
11. Verify workers endpoint existence (Epic 2 Story 2.1)

---

## Success Criteria

- [ ] All 54 extracted paths verified against OpenAPI spec
- [ ] Zero path mismatches between frontend and backend
- [ ] useAgents hook returning data (not 404)
- [ ] LLM Costs dashboard loading successfully
- [ ] Parity tests passing for all pages
- [ ] Automated path validation in CI/CD

---

**Document Version**: 1.0
**Last Updated**: 2025-11-21 18:30:00
**Extracted Paths**: 54 unique API paths
**Critical Issues**: 4 high-impact mismatches
**Recommended Action**: Fix frontend (Option A)
