# Parity Test Execution Report

**Date**: 2025-11-21
**Test Suite**: `tests/integration/test_streamlit_nextjs_parity.py`
**Status**: 🔴 **BLOCKED - Test Environment Setup Issue**

---

## Executive Summary

Attempted to run automated parity tests to validate Next.js data matches Streamlit data. Tests are blocked due to missing `opentelemetry` dependency in test environment.

**Recommendation**: Proceed with manual API verification (curl/Postman) while test environment is fixed.

---

## Test Execution Attempt

### Command
```bash
python -m pytest tests/integration/test_streamlit_nextjs_parity.py::test_cost_summary_parity -v --tb=short
```

### Result
**Status**: ❌ **FAILED - Import Error**

### Error Details

#### Primary Error
```
ModuleNotFoundError: No module named 'opentelemetry.exporter'; 'opentelemetry' is not a package
```

**Location**: `src/monitoring/tracing.py:20`
```python
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
```

#### Root Cause
The test environment is missing OpenTelemetry dependencies that are required by `src/main.py` (imported by the test file). This appears to be a dev/test environment setup issue where the Docker containers have all dependencies, but the local venv does not.

#### Secondary Issues
1. **Import syntax fix required** (FIXED): Python modules starting with numbers (`07_LLM_Costs`) cannot be imported directly
   - **Fix Applied**: Used `importlib.import_module()` for dynamic imports
2. **Streamlit warnings**: Multiple "missing ScriptRunContext" warnings (expected when running Streamlit code outside Streamlit runtime - not a blocker)

---

## Test Environment Issues

### Missing Dependencies in Local Venv
The following OpenTelemetry packages are missing from the local `.venv`:
- `opentelemetry.exporter.otlp.proto.grpc.trace_exporter`
- Possibly other `opentelemetry` sub-packages

### Why This Happens
- Docker containers install all dependencies from `requirements.txt`
- Local venv may have been created before OpenTelemetry was added
- OR: `requirements.txt` has OpenTelemetry but `.venv` wasn't updated

### Fix Options

**Option A: Reinstall Dependencies (Recommended)**
```bash
cd "/Users/ravi/Documents/nullBytes_Apps/Ai_Agents/AI Ops"
source .venv/bin/activate
pip install --upgrade -r requirements.txt
```

**Option B: Mock Monitoring in Tests**
Create a test-specific import that mocks the monitoring module:
```python
# tests/conftest.py
import sys
from unittest.mock import MagicMock

# Mock OpenTelemetry before any imports
sys.modules['opentelemetry.exporter'] = MagicMock()
sys.modules['opentelemetry.exporter.otlp'] = MagicMock()
sys.modules['opentelemetry.exporter.otlp.proto'] = MagicMock()
sys.modules['opentelemetry.exporter.otlp.proto.grpc'] = MagicMock()
sys.modules['opentelemetry.exporter.otlp.proto.grpc.trace_exporter'] = MagicMock()
```

**Option C: Skip Monitoring Imports in Test Mode**
Modify `src/monitoring/tracing.py` to skip imports when running tests:
```python
import os
if os.getenv("PYTEST_CURRENT_TEST"):
    # Running in pytest - use mock
    OTLPSpanExporter = None
else:
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
```

---

## Alternative: Manual API Verification

Since automated parity tests are blocked, proceed with **manual API verification** using curl/Postman.

### Verification Plan

#### Phase 1: Verify ✅ Pages (Low Risk)
Test the "100% coverage" pages to baseline the process:

```bash
# 1. Tenants
curl "http://localhost:8000/api/tenants" -H "X-Tenant-ID: $(uuidgen)"

# 2. Plugins
curl "http://localhost:8000/api/plugins" -H "X-Tenant-ID: $(uuidgen)"

# 3. Agent Management
curl "http://localhost:8000/api/agents" -H "X-Tenant-ID: $(uuidgen)"

# 4. Add Tool
curl "http://localhost:8000/api/tools" -H "X-Tenant-ID: $(uuidgen)"

# 5. Execution History
curl "http://localhost:8000/api/executions" -H "X-Tenant-ID: $(uuidgen)"

# 6. MCP Servers
curl "http://localhost:8000/api/mcp-servers" -H "X-Tenant-ID: $(uuidgen)"
```

**Expected Result**: All return 200 OK with JSON data or empty arrays

#### Phase 2: Verify ⚠️ Pages (Medium Risk)

```bash
# 1. History (verify pagination)
curl "http://localhost:8000/api/enhancements/history?limit=10&offset=0" -H "X-Tenant-ID: $(uuidgen)"

# 2. LLM Providers (does endpoint exist?)
curl "http://localhost:8000/api/llm-providers" -H "X-Tenant-ID: $(uuidgen)"
# OR direct LiteLLM proxy:
curl "http://localhost:4000/models"

# 3. System Prompt Editor (verify CRUD)
curl "http://localhost:8000/api/prompts" -H "X-Tenant-ID: $(uuidgen)"
curl "http://localhost:8000/api/prompts/test" -X POST -H "Content-Type: application/json" -d '{...}'
```

**Expected Result**: Identify missing endpoints (404) or confirm existence (200/4xx)

#### Phase 3: Verify LLM Costs Endpoints

```bash
TENANT_ID="00000000-0000-0000-0000-000000000001"  # Use actual test tenant

# 1. Cost Summary (VERIFIED - Story nextjs-9)
curl "http://localhost:8000/api/costs/summary" -H "X-Tenant-ID: $TENANT_ID"

# 2. Daily Trend
curl "http://localhost:8000/api/costs/trend?days=30" -H "X-Tenant-ID: $TENANT_ID"

# 3. Token Breakdown
curl "http://localhost:8000/api/costs/token-breakdown?start_date=2025-11-14&end_date=2025-11-21" -H "X-Tenant-ID: $TENANT_ID"

# 4. Budget Utilization
curl "http://localhost:8000/api/costs/budget-utilization" -H "X-Tenant-ID: $TENANT_ID"

# 5. Agent Spend
curl "http://localhost:8000/api/costs/by-agent?start_date=2025-11-14&end_date=2025-11-21&limit=10" -H "X-Tenant-ID: $TENANT_ID"

# 6. Model Spend
curl "http://localhost:8000/api/costs/by-model?start_date=2025-11-14&end_date=2025-11-21" -H "X-Tenant-ID: $TENANT_ID"
```

**Expected Result**: Validate response schemas match DTOs, check for hardcoded values

---

## Next Steps

### Immediate (Today)
1. ✅ Document test environment issue
2. ⏳ Run manual API verification (Phase 1-3 above)
3. ⏳ Update `comparison-findings.md` with API verification results
4. ⏳ Fix test environment (Option A: reinstall deps)

### Short-Term (Tomorrow)
1. Re-run parity tests after environment fix
2. Document any data mismatches found
3. Create tickets for missing APIs
4. Create tickets for hardcoded values

### Before Production
1. 100% of parity tests passing
2. All manual API verifications complete
3. Test environment stable and documented

---

## Test Fixes Applied

### Fix 1: Import Syntax for Numbered Modules ✅
**Problem**: `from src.admin.pages.07_LLM_Costs import ...` causes `SyntaxError: invalid decimal literal`

**Solution**: Use `importlib.import_module()` for dynamic imports
```python
import importlib

llm_costs_module = importlib.import_module("src.admin.pages.07_LLM_Costs")
fetch_cost_summary = llm_costs_module.fetch_cost_summary
```

**Status**: ✅ FIXED (test file updated)

### Fix 2: OpenTelemetry Dependencies
**Problem**: `ModuleNotFoundError: No module named 'opentelemetry.exporter'`

**Solution**: Pending (see Fix Options above)

**Status**: ⏳ PENDING

---

## Lessons Learned

1. **Test Environment Parity**: Local venv and Docker containers must have identical dependencies
2. **Import Patterns**: Streamlit's numbered module naming (`01_`, `02_`, etc.) is not Python-friendly for direct imports
3. **Dependency Management**: When adding new packages (like OpenTelemetry), update local venv AND requirements.txt
4. **Fallback Testing**: Always have manual verification as backup when automated tests are blocked

---

## Conclusion

**Status**: Automated parity tests blocked by test environment setup issue

**Recommended Action**: Proceed with manual API verification (curl/Postman) while fixing test environment dependencies. This allows progress on Phase 2 (Validation) without waiting for test infrastructure fixes.

**Timeline**:
- Manual API verification: 2-3 hours
- Test environment fix: 30 minutes
- Re-run automated tests: 1 hour

**Total Delay**: ~4 hours (acceptable within 1-week Option C timeline)

---

**Last Updated**: 2025-11-21 17:30:00
**Next Action**: Begin manual API verification (Phase 1)
