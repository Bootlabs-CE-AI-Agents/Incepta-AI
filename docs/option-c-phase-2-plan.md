# Option C - Phase 2: Validation & Testing Plan

**Date**: 2025-11-21
**Status**: 🟡 **READY TO BEGIN**
**Prerequisites**: ✅ Phase 1 Complete (Documentation & Path Fixes)

---

## Phase 1 Completion Summary ✅

### What Was Accomplished

1. **Comprehensive Documentation** (~4,000+ lines)
   - API inventory (14 pages mapped)
   - Parity test suite framework
   - Deprecation plan (4 phases, 9+ weeks)
   - Comparison findings (risk assessment)
   - OpenAPI spec audit (108 endpoints)
   - Path verification report
   - Path analysis (54 Next.js paths)

2. **Critical Path Fixes Applied**
   - Fixed useAgents: `/api/agents` → `/api/v1/agents`
   - Fixed LLM Costs (4 hooks): `/api/v1/costs/*` → `/api/costs/*`
   - All changes verified and documented

3. **Root Cause Identified**
   - Frontend-first development without backend validation
   - Mixed path conventions (3 different patterns)
   - No automated path validation in CI/CD

---

## Phase 2 Overview: Validation & Testing

**Goal**: Verify that the path fixes resolve the "everything feels broken" issue

**Duration**: 1-2 weeks

**Success Criteria**:
- All fixed pages load data correctly (no 404s)
- Agent selectors populate across all pages
- LLM Costs dashboard shows real data
- Parity tests pass (or failures documented)
- Production deployment strategy finalized

---

## Phase 2 Tasks Breakdown

### Priority 1: Validate Path Fixes (Week 2, Days 1-2)

#### Task 2.1: Docker Environment Testing

**Test in Docker environment (matches production)**:

```bash
# Start all services
cd "/Users/ravi/Documents/nullBytes_Apps/Ai_Agents/AI Ops"
docker-compose up -d

# Wait for services to be ready
docker-compose logs -f fastapi | grep "Application startup complete"
docker-compose logs -f nextjs | grep "Ready"

# Check service health
curl http://localhost:8000/health
curl http://localhost:3000/
```

#### Task 2.2: API Endpoint Validation via curl

**Test each fixed endpoint**:

```bash
# Get test tenant ID
TENANT_ID=$(docker-compose exec -T postgres psql -U aiagents -d ai_agents -tAc "SELECT tenant_id FROM tenants LIMIT 1;")

# Get JWT token
TOKEN=$(curl -s -X POST "http://localhost:8000/api/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin" \
  | python3 -c "import json, sys; print(json.load(sys.stdin)['access_token'])")

# Test Fix 1: Agents endpoint
curl -s "http://localhost:8000/api/v1/agents?status=active" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  | python3 -m json.tool

# Test Fix 2-5: LLM Costs endpoints
curl -s "http://localhost:8000/api/costs/summary" \
  -H "X-Tenant-ID: $TENANT_ID" \
  | python3 -m json.tool

curl -s "http://localhost:8000/api/costs/trend?days=7" \
  -H "X-Tenant-ID: $TENANT_ID" \
  | python3 -m json.tool

curl -s "http://localhost:8000/api/costs/token-breakdown" \
  -H "X-Tenant-ID: $TENANT_ID" \
  | python3 -m json.tool

curl -s "http://localhost:8000/api/costs/budget-utilization" \
  -H "X-Tenant-ID: $TENANT_ID" \
  | python3 -m json.tool
```

**Expected Results**:
- ✅ All endpoints return 200 OK
- ✅ Valid JSON data structures returned

---

### Priority 2: Automated Testing (Week 2, Days 3-4)

#### Task 2.3: Fix Test Environment

```bash
cd "/Users/ravi/Documents/nullBytes_Apps/Ai_Agents/AI Ops"
source .venv/bin/activate
pip install --upgrade -r requirements.txt
```

#### Task 2.4: Run Parity Tests

```bash
pytest tests/integration/test_streamlit_nextjs_parity.py -v -m parity
```

#### Task 2.5: TypeScript Build Verification

```bash
cd nextjs-ui
npx tsc --noEmit
npm run build
```

---

### Priority 3: Data Quality Validation (Week 2, Days 4-5)

#### Task 2.6: Fix Hardcoded Values (Story nextjs-9)

**Backend needs to return**:
- `yesterday_spend`
- `last_week_spend`
- `last_month_spend`

**Frontend fix**: Update CostSummaryCards.tsx to use real values instead of `0`

#### Task 2.7: Document Missing Endpoints

Create assessment for:
- `/api/v1/tools` (404)
- `/api/v1/executions` (list - 404)
- Workers endpoints
- Queue/Audit endpoints

---

## Phase 2 Deliverables

1. **Validation Test Results** (`docs/validation-test-results.md`)
2. **Parity Test Execution Report** (updated)
3. **Data Mismatch Report** (`docs/data-mismatch-report.md`)
4. **Missing Endpoints Assessment** (`docs/missing-endpoints-assessment.md`)
5. **Phase 2 Completion Report** (`docs/option-c-phase-2-completion.md`)

---

## Success Metrics

- [ ] All 5 path fixes validated (curl tests pass)
- [ ] Next.js build passes
- [ ] Parity tests run successfully
- [ ] Hardcoded values issue documented
- [ ] All missing endpoints cataloged
- [ ] Phase 2 completion report published

---

## Next Immediate Actions

1. **Start Docker services** and validate endpoints via curl
2. **Fix test environment** (OpenTelemetry dependencies)
3. **Run parity tests** to identify data mismatches
4. **Create validation reports** for all findings

---

**Document Version**: 1.0
**Last Updated**: 2025-11-21 19:30:00
**Status**: Ready for Phase 2 execution
