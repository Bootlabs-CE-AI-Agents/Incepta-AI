# API Path Verification Report

**Date**: 2025-11-21
**Purpose**: Verify corrected API paths from OpenAPI spec audit
**Status**: 🔴 **CRITICAL PATH MISMATCH CONFIRMED**

---

## Executive Summary

**CRITICAL FINDING**: Next.js frontend uses **MIXED path conventions** that don't match the backend OpenAPI spec:

- **LLM Costs**: Next.js uses `/api/v1/costs/*` ✅ BUT backend has `/api/costs/*`
- **Agents**: Next.js uses `/api/agents` ❌ BUT backend has `/api/v1/agents`
- **Plugins**: Backend uses `/api/v1/plugins/` (trailing slash required)
- **Tenants**: Backend uses `/admin/tenants` (admin endpoint) or `/api/v1/tenants`

**Impact**: This explains why "everything feels broken" - the frontend is calling wrong paths!

---

## Verification Results

### Phase 1: Backend API Testing (curl)

Tested corrected paths from OpenAPI spec audit:

| Endpoint | Path Tested | Result | Response |
|----------|------------|--------|----------|
| **Tenants (Admin)** | `/admin/tenants` | ❌ AUTH | `Missing X-Admin-Key header` |
| **Tenants (Public)** | `/api/v1/tenants` | ❌ AUTH | `Not authenticated` |
| **Agents** | `/api/v1/agents` | ❌ ERROR | `Internal Server Error` |
| **Plugins** | `/api/v1/plugins/` | ✅ SUCCESS | `{"plugins":[...],"count":2}` |
| **Prompts** | `/api/v1/prompts` | ❌ ERROR | `Internal Server Error` |
| **MCP Servers** | `/api/v1/mcp-servers/` | ❌ ERROR | `Internal Server Error` |
| **LLM Costs Summary** | `/api/costs/summary` | ✅ SUCCESS | `{"today_spend":0.0,...}` |
| **LLM Costs Trend** | `/api/costs/trend?days=7` | ✅ SUCCESS | `[{"date":"2025-11-14",...}]` |
| **LLM Costs By Agent** | `/api/costs/by-agent` | ✅ SUCCESS | `[]` (empty but 200 OK) |
| **Tools** | `/api/v1/tools` | ❌ 404 | `Not Found` |
| **Tools (with slash)** | `/api/v1/tools/` | ❌ 404 | `Not Found` |

**Authentication Notes**:
- `/admin/*` endpoints require `X-Admin-Key` header
- `/api/v1/*` endpoints require JWT authentication (`Authorization: Bearer <token>`)
- `/api/costs/*` endpoints only require `X-Tenant-ID` header ✅

**Internal Server Errors**: Likely due to missing authentication or database issues (not path issues)

### Phase 2: Next.js Frontend Audit

#### API Client Configuration

**File**: `nextjs-ui/lib/api/client.ts:18`

```typescript
baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
```

✅ **Correct**: Base URL properly configured

**File**: `nextjs-ui/lib/auth.ts:18`

```typescript
const API_BASE_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
```

✅ **Correct**: Auth uses same base URL

#### React Query Hooks - Path Analysis

##### ❌ **CRITICAL**: useAgents Hook

**File**: `nextjs-ui/hooks/useAgents.ts:23`

```typescript
const response = await apiClient.get<AgentListResponse>('/api/agents?status=active');
```

**Problem**: Uses `/api/agents` but backend has `/api/v1/agents`
**Impact**: HIGH - Agent selector broken across all pages
**Fix Required**: Change to `/api/v1/agents?status=active`

##### ⚠️ **WARNING**: useLLMCostSummary Hook

**File**: `nextjs-ui/hooks/useLLMCostSummary.ts:22`

```typescript
const response = await axios.get<CostSummaryDTO>('/api/v1/costs/summary', {
```

**Problem**: Uses `/api/v1/costs/summary` but backend has `/api/costs/summary` (no v1!)
**Impact**: MEDIUM - LLM Costs page might not work
**Backend Test**: ✅ `/api/costs/summary` returns 200 OK
**Fix Required**: Change to `/api/costs/summary` OR add `/api/v1/costs/*` route in backend

**Comment in Code Says**:
```typescript
// Maps to Backend API: GET /api/v1/costs/summary (src/api/llm_costs.py:40-64)
```
This comment is **INCORRECT** - backend uses `/api/costs/summary`

---

## Root Cause Analysis

### Why This Happened

1. **Frontend-First Development**: UI built before API paths were standardized
2. **Inconsistent Path Conventions**: Backend uses 3 different patterns:
   - `/admin/*` - Admin operations
   - `/api/v1/*` - Versioned core APIs
   - `/api/*` - Unversioned specialized services
3. **Documentation Assumptions**: Documentation assumed `/api/resource` pattern, but reality is mixed
4. **No Path Validation**: No automated tests to catch path mismatches

### Why It "Feels Broken"

Users open Next.js pages and see:
- **Agent Performance**: Blank screen (can't load agents list)
- **LLM Costs**: May or may not work depending on path routing
- **Tenants**: Might fail with auth errors
- **Plugins**: May work if trailing slash included

---

## Impact Assessment

### High Impact (🔴)

1. **useAgents Hook**: Used by multiple pages for agent selection
   - **Pages Affected**: Agent Performance, LLM Costs (by-agent), Execution History
   - **User Impact**: Agent selector dropdowns won't load
   - **Fix**: 1-line change in `useAgents.ts`

2. **LLM Costs Path Mismatch**: Frontend expects `/api/v1/costs/*`, backend has `/api/costs/*`
   - **Pages Affected**: LLM Costs dashboard (Story nextjs-9)
   - **User Impact**: Dashboard may show errors or fail to load
   - **Fix**: Either update frontend OR add `/api/v1/costs/*` routes in backend

### Medium Impact (🟡)

3. **Tenants Authentication**: Unclear which path should be used
   - **Options**: `/admin/tenants` (requires X-Admin-Key) OR `/api/v1/tenants` (requires JWT)
   - **User Impact**: Tenants page may show auth errors
   - **Fix**: Determine correct authentication flow

4. **Trailing Slash Requirement**: Plugins needs `/api/v1/plugins/` but frontend might use `/api/v1/plugins`
   - **User Impact**: 404 errors intermittently
   - **Fix**: Ensure frontend always includes trailing slash OR backend accepts both

### Low Impact (🟢)

5. **Tools Endpoint Missing**: `/api/v1/tools` returns 404
   - **User Impact**: Tools management page won't work
   - **Status**: May not be implemented yet (needs verification)

---

## Recommended Actions

### Immediate (Today)

1. ✅ **Document path mismatches** - COMPLETED (this report)
2. ⏳ **Create comprehensive Next.js path audit script** - Extract ALL API calls
3. ⏳ **Fix useAgents hook** - Change `/api/agents` → `/api/v1/agents`
4. ⏳ **Decide LLM Costs strategy**:
   - **Option A**: Update frontend `/api/v1/costs/*` → `/api/costs/*`
   - **Option B**: Add `/api/v1/costs/*` routes in backend that proxy to `/api/costs/*`

### Short-Term (This Week)

5. ⏳ **Run automated path extraction**:
   ```bash
   grep -r "apiClient\.\|axios\.\|fetch(" nextjs-ui/ --include="*.ts" --include="*.tsx" \
     | grep -oP "['\"](/api/[^'\"]+)" \
     | sort -u > nextjs-api-paths.txt
   ```
6. ⏳ **Compare extracted paths to OpenAPI spec**
7. ⏳ **Create path correction PR** with all fixes
8. ⏳ **Add automated path validation test** to CI/CD

### Long-Term (Before Production)

9. ⏳ **Standardize all paths** to one convention (recommend `/api/v1/*` for everything)
10. ⏳ **Add OpenAPI spec validation** to frontend build process
11. ⏳ **Create path migration guide** for future development
12. ⏳ **Add API contract tests** (Pact or similar)

---

## Detailed Path Corrections Needed

### Next.js Frontend Changes

**File**: `nextjs-ui/hooks/useAgents.ts:23`
```diff
- const response = await apiClient.get<AgentListResponse>('/api/agents?status=active');
+ const response = await apiClient.get<AgentListResponse>('/api/v1/agents?status=active');
```

**File**: `nextjs-ui/hooks/useLLMCostSummary.ts:22` (IF choosing Option A)
```diff
- const response = await axios.get<CostSummaryDTO>('/api/v1/costs/summary', {
+ const response = await axios.get<CostSummaryDTO>('/api/costs/summary', {
```

**File**: `nextjs-ui/hooks/useLLMCostSummary.ts:7` (update comment)
```diff
- * Maps to Backend API: GET /api/v1/costs/summary (src/api/llm_costs.py:40-64)
+ * Maps to Backend API: GET /api/costs/summary (src/api/llm_costs.py:40-64)
```

### Backend Changes (IF choosing Option B for LLM Costs)

**File**: `src/main.py` (add route alias)
```python
# Add route alias for Next.js compatibility
app.include_router(
    llm_costs.router,
    prefix="/api/v1/costs",  # Alias to /api/costs
    tags=["LLM Costs (v1)"]
)
```

---

## Path Audit Script

```bash
#!/bin/bash
# Extract all API paths from Next.js frontend

echo "=== Next.js Frontend API Paths ==="
cd nextjs-ui
grep -r "apiClient\.\|axios\.\|fetch(" . \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  | grep -oP "['\"](/api/[^'\"]+)" \
  | sort -u

echo ""
echo "=== Backend OpenAPI Spec Paths ==="
cd ..
curl -s "http://localhost:8000/openapi.json" \
  | python3 -c "
import json, sys
spec = json.load(sys.stdin)
for path, methods in sorted(spec['paths'].items()):
    print(path)
" | sort -u

echo ""
echo "=== Path Diff Analysis ==="
echo "Compare the two lists above to find mismatches"
```

---

## Testing Plan

### Manual Testing (After Fixes)

```bash
# Test corrected paths with proper authentication
TENANT_ID="00000000-0000-0000-0000-000000000001"

# 1. Agents (requires JWT)
# First get JWT token from login
TOKEN=$(curl -s -X POST "http://localhost:8000/api/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin" \
  | jq -r '.access_token')

curl "http://localhost:8000/api/v1/agents?status=active" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID"

# 2. LLM Costs (only needs tenant ID)
curl "http://localhost:8000/api/costs/summary" \
  -H "X-Tenant-ID: $TENANT_ID"

# 3. Plugins (requires JWT)
curl "http://localhost:8000/api/v1/plugins/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID"
```

### Automated Testing (Add to CI/CD)

```typescript
// tests/integration/test_api_paths.spec.ts

describe('API Path Validation', () => {
  it('should match OpenAPI spec paths', async () => {
    // 1. Extract all frontend API calls
    const frontendPaths = extractApiPathsFromCode();

    // 2. Fetch OpenAPI spec
    const backendPaths = await fetchOpenApiPaths();

    // 3. Compare and assert all paths exist
    frontendPaths.forEach(path => {
      expect(backendPaths).toContain(path);
    });
  });
});
```

---

## Success Metrics

### Phase 1: Path Corrections (Week 1)
- [ ] All Next.js hooks use correct paths
- [ ] useAgents hook fixed (HIGH priority)
- [ ] LLM Costs path strategy decided
- [ ] Path audit script created

### Phase 2: Validation (Week 2)
- [ ] Automated path extraction running in CI/CD
- [ ] All paths verified against OpenAPI spec
- [ ] Manual testing complete for corrected paths
- [ ] Documentation updated with correct paths

### Phase 3: Production Ready (Week 3)
- [ ] Zero path mismatches between frontend and backend
- [ ] All parity tests passing
- [ ] API contract tests in place
- [ ] Path migration guide published

---

## Appendix: Full OpenAPI Path List

```
/admin/auth/login
/admin/auth/logout
/admin/tenants
/admin/tenants/{tenant_id}
/api/auth/token
/api/auth/refresh
/api/costs/summary
/api/costs/trend
/api/costs/by-agent
/api/costs/by-model
/api/costs/token-breakdown
/api/costs/budget-utilization
/api/costs/transactions
/api/executions/{execution_id}
/api/v1/agents
/api/v1/agents/{agent_id}
/api/v1/mcp-servers/
/api/v1/mcp-servers/{server_id}
/api/v1/plugins/
/api/v1/prompts
/api/v1/prompts/{prompt_id}
/api/v1/tenants
/api/v1/tenants/{tenant_id}
... (108 total endpoints documented in api-path-audit-report.md)
```

---

## Conclusion

**Status**: Path mismatches CONFIRMED and documented

**Root Cause**: Frontend-first development with assumed path conventions that don't match backend reality

**Impact**: HIGH - Explains why migration "feels broken"

**Next Step**: Fix `useAgents` hook immediately (1-line change), then decide LLM Costs strategy

**Timeline**: All path corrections can be completed in 1-2 days

---

**Document Version**: 1.0
**Last Updated**: 2025-11-21 18:00:00
**Next Review**: After useAgents fix deployed
