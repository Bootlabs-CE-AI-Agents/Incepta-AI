# Feature Parity Checklist: Streamlit vs Next.js

**Generated**: 2025-11-21
**Purpose**: Comprehensive comparison of Streamlit admin UI vs Next.js dashboard features
**Parity Status**: ~65% feature parity overall

---

## Summary Dashboard

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Complete Parity | 9 | 56% |
| ⚠️ Partial Parity | 3 | 19% |
| ❌ Missing | 4 | 25% |
| **TOTAL** | **16** | **100%** |

---

## Feature Matrix

### ✅ **1. Dashboard / Home** - COMPLETE PARITY

| Feature | Streamlit | Next.js | Status | Evidence |
|---------|-----------|---------|--------|----------|
| Active Agents Count | ✅ | ✅ | ✅ | src/admin/pages/1_Dashboard.py:78 → nextjs-ui/app/dashboard/page.tsx:45 |
| Executions Today | ✅ | ✅ | ✅ | Dashboard service queries same data |
| Avg Response Time | ✅ | ✅ | ✅ | 24-hour rolling average with IST |
| Error Rate | ✅ | ✅ | ✅ | Industry threshold classification |
| Recent Activity Feed | ✅ | ✅ | ✅ | Last 10 execution events |
| Real-time Updates | ✅ | ✅ | ✅ | Streamlit auto-refresh, Next.js polling |

**Parity Score**: 100% ✅

---

### ⚠️ **2. Tenants** - PARTIAL PARITY (70%)

| Feature | Streamlit | Next.js | Status | Evidence |
|---------|-----------|---------|--------|----------|
| Tenant CRUD | ✅ | ✅ | ✅ | src/admin/pages/2_Tenants.py:123 → nextjs-ui/app/dashboard/tenants/page.tsx:67 |
| Tenant List View | ✅ | ✅ | ✅ | Both show table with pagination |
| **BYOK Configuration** | ✅ | ❌ | ❌ | src/admin/pages/2_Tenants.py:234-289 (Fernet encryption UI) |
| **Budget Dashboard** | ✅ | ❌ | ❌ | src/admin/pages/2_Tenants.py:156-198 (utilization bar + alerts) |
| Tenant Status Toggle | ✅ | ✅ | ✅ | Active/suspended status management |

**Parity Score**: 60% ⚠️
**Missing Features**: BYOK UI, Budget utilization dashboard

---

### ✅ **3. Plugins** - COMPLETE PARITY

| Feature | Streamlit | Next.js | Status | Evidence |
|---------|-----------|---------|--------|----------|
| Plugin CRUD | ✅ | ✅ | ✅ | src/admin/pages/3_Plugin_Management.py → nextjs-ui/app/dashboard/plugins/page.tsx |
| Plugin Configuration | ✅ | ✅ | ✅ | JSON editor for config |
| Status Management | ✅ | ✅ | ✅ | Draft → Active → Suspended |
| Health Check | ✅ | ✅ | ✅ | Test connection button |

**Parity Score**: 100% ✅

---

### ✅ **4. History / Execution History** - COMPLETE PARITY

| Feature | Streamlit | Next.js | Status | Evidence |
|---------|-----------|---------|--------|----------|
| Execution List | ✅ | ✅ | ✅ | src/admin/pages/4_History.py → nextjs-ui/app/dashboard/execution-history/page.tsx |
| Filters (Status, Date) | ✅ | ✅ | ✅ | Both have filter UI |
| Pagination | ✅ | ✅ | ✅ | Server-side pagination |
| Execution Details | ✅ | ✅ | ✅ | View logs, errors, timing |

**Parity Score**: 100% ✅

---

### ❌ **5. Agent Management** - CRITICAL MISSING (50%)

| Feature | Streamlit | Next.js | Status | Evidence |
|---------|-----------|---------|--------|----------|
| Agent CRUD | ✅ | ✅ | ✅ | Basic create/read/update/delete |
| **MCP Tool Discovery UI** | ✅ | ❌ | ❌ | src/admin/pages/5_Agent_Management.py:123-267 (Tabs: All/OpenAPI/MCP) |
| **Server Health Badges** | ✅ | ❌ | ❌ | Green/Yellow/Red status indicators |
| **Tool Assignment with Filters** | ✅ | ❌ | ❌ | Filter by server, search by name |
| **LLM Model Dropdown** | ✅ | ❌ | ❌ | Populated from LiteLLM `/model/new` API |
| Agent Status Management | ✅ | ✅ | ✅ | Draft → Active → Suspended |

**Parity Score**: 33% ❌ **CRITICAL GAP**
**Missing Features**: MCP tool discovery interface (145 lines of logic)

**User Impact**: Cannot properly assign MCP tools to agents, missing LLM model selection

---

### ⚠️ **6. LLM Providers** - PARTIAL PARITY (80%)

| Feature | Streamlit | Next.js | Status | Evidence |
|---------|-----------|---------|--------|----------|
| Provider CRUD | ✅ | ✅ | ✅ | src/admin/pages/6_LLM_Providers.py → nextjs-ui/app/dashboard/llm-providers/page.tsx |
| Configuration Editor | ✅ | ✅ | ✅ | JSON editor for provider config |
| **Model Discovery from LiteLLM** | ✅ | ❓ | ⚠️ | src/admin/pages/6_LLM_Providers.py:156 (`GET /model/new`) - NEEDS VERIFICATION |
| Provider Templates | ✅ | ✅ | ✅ | Azure, Bedrock, Vertex AI presets |

**Parity Score**: 75% ⚠️
**Action Required**: Verify LiteLLM integration in nextjs-ui/lib/api/llm-providers.ts

---

### ✅ **7. Operations / Queue Management** - COMPLETE PARITY

| Feature | Streamlit | Next.js | Status | Evidence |
|---------|-----------|---------|--------|----------|
| Queue Status Metrics | ✅ | ✅ | ✅ | src/admin/pages/7_Operations.py → nextjs-ui/app/dashboard/operations/page.tsx |
| Queue Depth Chart | ✅ | ✅ | ✅ | Recharts visualization with IST timestamps |
| Task List with Pagination | ✅ | ✅ | ✅ | Server-side pagination |
| Pause/Resume Controls | ✅ | ✅ | ✅ | Admin-only RBAC enforced |
| Real-time Polling | ✅ | ✅ | ✅ | 3s/5s/10s intervals |

**Parity Score**: 100% ✅
**Note**: Story 0.3 verified working with E2E tests

---

### ✅ **8. Workers** - COMPLETE PARITY

| Feature | Streamlit | Next.js | Status | Evidence |
|---------|-----------|---------|--------|----------|
| Worker List View | ✅ | ✅ | ✅ | src/admin/pages/8_Workers.py → nextjs-ui/app/dashboard/workers/page.tsx |
| Worker Health Status | ✅ | ✅ | ✅ | Active/idle/offline indicators |
| Task Assignment | ✅ | ✅ | ✅ | Current task tracking |
| Worker Metrics | ✅ | ✅ | ✅ | Tasks processed, success rate |

**Parity Score**: 100% ✅

---

### ❌ **9. System Prompt Editor** - ENTIRELY MISSING (0%)

| Feature | Streamlit | Next.js | Status | Evidence |
|---------|-----------|---------|--------|----------|
| **Prompt Template Manager** | ✅ | ❌ | ❌ | src/admin/pages/9_System_Prompt_Editor.py:78-134 (default, creative, analytical, custom) |
| **Monaco Code Editor** | ✅ | ❌ | ❌ | Syntax highlighting for prompts |
| **Variable Substitution Preview** | ✅ | ❌ | ❌ | {{tenant_name}}, {{tools}}, {{context}} |
| **Version History** | ✅ | ❌ | ❌ | src/admin/pages/9_System_Prompt_Editor.py:234-289 (v1, v2, v3...) |
| **Rollback to Previous Version** | ✅ | ❌ | ❌ | Revert button with confirmation |
| **Test with LLM Dropdown** | ✅ | ❌ | ❌ | Live testing with selected model |
| **Save as New Template** | ✅ | ❌ | ❌ | Fork template functionality |

**Parity Score**: 0% ❌ **CRITICAL GAP**
**Missing Features**: Entire 541-line feature (src/admin/pages/9_System_Prompt_Editor.py)

**User Impact**: Users cannot manage prompt templates, test variations, or track version history

**Next.js Current State**: nextjs-ui/app/dashboard/prompts/page.tsx only has list view (no editor)

---

### ⚠️ **10. Tools / Add Tool** - PARTIAL PARITY (70%)

| Feature | Streamlit | Next.js | Status | Evidence |
|---------|-----------|---------|--------|----------|
| Tool CRUD | ✅ | ✅ | ✅ | src/admin/pages/10_Add_Tool.py → nextjs-ui/app/dashboard/tools/page.tsx |
| OpenAPI Spec Upload | ✅ | ✅ | ✅ | File upload + URL fetch |
| **OAuth 2.0 Scope Selector** | ✅ | ❓ | ⚠️ | src/admin/pages/10_Add_Tool.py:156-203 (scope checkboxes) |
| **FastMCP Automatic Generation** | ✅ | ❓ | ⚠️ | src/admin/pages/10_Add_Tool.py:298 - NEEDS VERIFICATION |
| Tool Testing | ✅ | ✅ | ✅ | Test connection button |

**Parity Score**: 60% ⚠️
**Action Required**: Verify FastMCP integration and OAuth scope handling in Next.js

---

### ✅ **11. Execution History (Detailed View)** - COMPLETE PARITY

| Feature | Streamlit | Next.js | Status | Evidence |
|---------|-----------|---------|--------|----------|
| Execution List | ✅ | ✅ | ✅ | Same as #4 (duplicate page in Streamlit) |
| Filters | ✅ | ✅ | ✅ | Status, date range, agent |
| Export to CSV | ✅ | ✅ | ✅ | Download execution data |

**Parity Score**: 100% ✅

---

### ✅ **12. MCP Servers** - COMPLETE PARITY

| Feature | Streamlit | Next.js | Status | Evidence |
|---------|-----------|---------|--------|----------|
| MCP Server CRUD | ✅ | ✅ | ✅ | src/admin/pages/12_MCP_Servers.py → nextjs-ui/app/dashboard/mcp-servers/page.tsx |
| Server Configuration | ✅ | ✅ | ✅ | Command, args, env vars |
| Health Check | ✅ | ✅ | ✅ | Test connection with status badges |
| Tool Discovery | ✅ | ✅ | ✅ | List tools available from server |

**Parity Score**: 100% ✅

---

### ✅ **13. LLM Costs** - COMPLETE PARITY

| Feature | Streamlit | Next.js | Status | Evidence |
|---------|-----------|---------|--------|----------|
| Daily Spend Chart | ✅ | ✅ | ✅ | src/admin/pages/07_LLM_Costs.py → nextjs-ui/app/dashboard/llm-costs/page.tsx |
| Model Breakdown | ✅ | ✅ | ✅ | Pie chart by model |
| Cost Trend | ✅ | ✅ | ✅ | 7-day/30-day trends |
| Token Usage | ✅ | ✅ | ✅ | Input/output tokens |
| Date Range Filter | ✅ | ✅ | ✅ | Custom date picker |

**Parity Score**: 100% ✅

---

### ✅ **14. Agent Performance** - COMPLETE PARITY

| Feature | Streamlit | Next.js | Status | Evidence |
|---------|-----------|---------|--------|----------|
| Success Rate by Agent | ✅ | ✅ | ✅ | src/admin/pages/08_Agent_Performance.py → nextjs-ui/app/dashboard/agent-performance/page.tsx |
| Response Time Charts | ✅ | ✅ | ✅ | Average response time trends |
| Error Rate Tracking | ✅ | ✅ | ✅ | Errors per agent |
| Execution Count | ✅ | ✅ | ✅ | Total runs per agent |

**Parity Score**: 100% ✅

---

### ⚠️ **15. Tickets** - PARTIAL PARITY (90%)

| Feature | Streamlit | Next.js | Status | Evidence |
|---------|-----------|---------|--------|----------|
| Ticket List View | ✅ | ✅ | ✅ | nextjs-ui/app/dashboard/tickets/page.tsx |
| Ticket Details | ✅ | ✅ | ✅ | View ticket content |
| **Sparkline Trend Chart** | ✅ | ❌ | ❌ | nextjs-ui/app/dashboard/tickets/page.tsx:160-162 (MOCK DATA FOUND) |
| Filters | ✅ | ✅ | ✅ | Status, priority, date |

**Parity Score**: 75% ⚠️
**Mock Data Found**:
```typescript
// nextjs-ui/app/dashboard/tickets/page.tsx:160-162
const sparklineData = Array.from(
  { length: 12 },
  () => Math.floor(Math.random() * 30) + 70
);
```

**Action Required**: Connect to real trend API endpoint

---

### ✅ **16. Audit Logs** - COMPLETE PARITY

| Feature | Streamlit | Next.js | Status | Evidence |
|---------|-----------|---------|--------|----------|
| Audit Log List | ✅ | ✅ | ✅ | nextjs-ui/app/dashboard/audit-logs/page.tsx |
| Action Tracking | ✅ | ✅ | ✅ | User, action, timestamp |
| Search & Filter | ✅ | ✅ | ✅ | By user, action type, date |
| Export | ✅ | ✅ | ✅ | Download audit trail |

**Parity Score**: 100% ✅

---

## Navigation Gaps

### ❌ **Broken Sidebar Links** - NOT IMPLEMENTED

| Link | Streamlit | Next.js | Status | Action Required |
|------|-----------|---------|--------|-----------------|
| Workflows | ❌ | ❌ | ❌ | Create `/dashboard/workflows` or hide link |
| Logs | ❌ | ❌ | ❌ | Create `/dashboard/logs` or hide link |
| Settings | ❌ | ❌ | ❌ | Create `/dashboard/settings` or hide link |
| Playground | ❌ | ❌ | ❌ | Create `/dashboard/playground` or hide link |
| Testing | ❌ | ❌ | ❌ | Create `/dashboard/testing` or hide link |

**Impact**: User clicks sidebar link → 404 error → loss of trust

**Priority**: P2 (medium) - Not blocking core workflows but poor UX

---

## Priority Ranking

### P0 - CRITICAL (Blocks Core Workflows)

1. **Agent Management - MCP Tool Discovery UI** (Story 0.4.1)
   - Streamlit: 145 lines (src/admin/pages/5_Agent_Management.py:123-267)
   - Impact: Cannot properly assign MCP tools to agents
   - Estimate: 5 SP (2-3 days)

2. **System Prompt Editor - Templates & Monaco Editor** (Story 0.4.2)
   - Streamlit: 541 lines (src/admin/pages/9_System_Prompt_Editor.py)
   - Impact: Cannot manage prompt templates or test variations
   - Estimate: 8 SP (4-5 days)

3. **System Prompt Editor - Version History** (Story 0.4.3)
   - Streamlit: Part of above file
   - Impact: Cannot track prompt changes or rollback
   - Estimate: 5 SP (2-3 days)

4. **LiteLLM Model Selection in Agent Creation** (Story 0.4.4)
   - Streamlit: Dynamic dropdown from `/model/new` API
   - Impact: User sees empty dropdown when creating agents
   - Estimate: 3 SP (1-2 days)

---

### P1 - HIGH (Degrades Experience)

5. **Tenant BYOK Configuration UI** (Story 0.4.5)
   - Streamlit: 56 lines (src/admin/pages/2_Tenants.py:234-289)
   - Impact: Enterprises cannot configure their own API keys
   - Estimate: 5 SP (2-3 days)

6. **Tenant Budget Dashboard** (Story 0.4.6)
   - Streamlit: 43 lines (src/admin/pages/2_Tenants.py:156-198)
   - Impact: No visibility into budget utilization
   - Estimate: 3 SP (1-2 days)

7. **Remove Mock Sparkline in Tickets** (Story 0.4.8)
   - Location: nextjs-ui/app/dashboard/tickets/page.tsx:160-162
   - Impact: Erodes trust (shows fake data)
   - Estimate: 1 SP (0.5 day)

---

### P2 - MEDIUM (Annoyance)

8. **Fix 5 Broken Sidebar Links** (Story 0.4.7)
   - Impact: 404 errors when clicking navigation
   - Options: Create pages OR hide links until implemented
   - Estimate: 2 SP (1 day to hide links, OR 5 days to implement pages)

---

### P3 - LOW (Verification Needed)

9. **Verify LiteLLM Integration in LLM Providers**
   - File: nextjs-ui/lib/api/llm-providers.ts
   - Action: Confirm `/model/new` API usage
   - Estimate: 1 hour investigation

10. **Verify FastMCP Integration in Tools**
    - File: nextjs-ui/lib/api/tools.ts
    - Action: Confirm automatic tool generation from OpenAPI
    - Estimate: 1 hour investigation

---

## Implementation Roadmap

### Sprint 1 (2 weeks) - Critical UX Gaps
- [ ] Story 0.4.1: MCP Tool Discovery UI (5 SP)
- [ ] Story 0.4.4: LiteLLM Model Selection (3 SP)
- [ ] Story 0.4.8: Remove Mock Sparkline Data (1 SP)
- [ ] Verify LiteLLM + FastMCP integrations (2 hours)
- **Total**: 9 SP

### Sprint 2 (2 weeks) - System Prompt Editor
- [ ] Story 0.4.2: Prompt Editor Part 1 - Templates & Monaco (8 SP)
- [ ] Story 0.4.3: Prompt Editor Part 2 - Version History (5 SP)
- **Total**: 13 SP

### Sprint 3 (2 weeks) - Tenant Features & Polish
- [ ] Story 0.4.5: BYOK Configuration (5 SP)
- [ ] Story 0.4.6: Budget Dashboard (3 SP)
- [ ] Story 0.4.7: Fix Broken Navigation (2 SP)
- **Total**: 10 SP

**Overall Estimate**: 32 Story Points ≈ 6 weeks (3 sprints)

---

## Verification Checklist

Use this checklist to verify feature parity after implementation:

### Agent Management
- [ ] MCP tool discovery tabs visible (All/OpenAPI/MCP)
- [ ] Server health badges show correct status (green/yellow/red)
- [ ] Tool assignment filters work (by server, by name)
- [ ] LLM model dropdown populates from LiteLLM API
- [ ] Agent creation form includes all Streamlit fields

### System Prompt Editor
- [ ] Template selector shows all templates
- [ ] Monaco editor loads with syntax highlighting
- [ ] Variable substitution preview works ({{tenant_name}}, etc.)
- [ ] Version history displays (v1, v2, v3...)
- [ ] Rollback button reverts to previous version
- [ ] Test with LLM dropdown works
- [ ] Save as new template creates copy

### Tenant Management
- [ ] BYOK configuration UI accepts encrypted keys
- [ ] Budget dashboard shows utilization bar
- [ ] Budget alerts trigger at 80% threshold
- [ ] All tenant CRUD operations work

### Navigation
- [ ] No 404 errors when clicking sidebar links
- [ ] All pages load within 2 seconds
- [ ] Real-time updates working (polling intervals)

### Data Integrity
- [ ] NO mock data found in any component
- [ ] All charts connected to real APIs
- [ ] IST timezone consistent across all timestamps
- [ ] Error handling graceful (no console errors)

---

## Evidence Repository

**Streamlit Reference Screenshots**: TODO (Paige to capture by EOD)

**Next.js Screenshots**: Available via Chrome DevTools MCP

**Code References**:
- Streamlit: `/Users/ravi/Documents/nullBytes_Apps/Ai_Agents/AI Ops/src/admin/pages/*.py`
- Next.js: `/Users/ravi/Documents/nullBytes_Apps/Ai_Agents/AI Ops/nextjs-ui/app/dashboard/*/page.tsx`

---

## Conclusion

**Overall Feature Parity**: ~65%

**Critical Blockers**: 4 (Agent MCP UI, System Prompt Editor Parts 1 & 2, LiteLLM Integration)

**High Priority**: 3 (BYOK, Budget Dashboard, Mock Data)

**Medium Priority**: 1 (Broken Navigation)

**Estimated Timeline**: 6 weeks (3 sprints) to reach 100% parity

**Recommendation**: Start with Sprint 1 (MCP Tool Discovery + LiteLLM) as these block agent creation workflow, the most critical user journey.

---

**Document Ownership**: Mary (Analyst) + Paige (Tech Writer)
**Last Updated**: 2025-11-21
**Next Review**: After Sprint 1 completion
