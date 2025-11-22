# Migration Story Backlog

**Generated**: 2025-11-21
**Purpose**: Developer-ready stories for completing Streamlit → Next.js migration
**Source Analysis**:
- Backend API Catalog: 120+ active endpoints across 28 modules
- Streamlit Feature Catalog: 15 pages with comprehensive feature documentation
- Next.js Implementation Status: 17 pages, 95% complete

---

## Epic 0: Production Blockers (P0)

### Story 0.1: Dashboard Home - Real Data Integration
**Priority**: P0 🔴
**Effort**: S (1-2 days)
**Dependencies**: None

**User Story**: As a user, I need to see real-time system metrics on the dashboard home page so that I can quickly assess system health.

**Current State**: Dashboard home (`/dashboard/page.tsx`) displays 100% hardcoded mock data.

**Acceptance Criteria**:
- [ ] Create backend endpoint `GET /api/v1/dashboard/summary`
- [ ] Return aggregated metrics:
  - Active agents count (from agents table where is_active=true)
  - Executions today count (from agent_executions where date=today)
  - Average response time (from agent_executions P50 latency)
  - Error rate percentage (failed/total executions, 24h window)
  - Recent activity (last 10 executions with agent_name, status, timestamp)
- [ ] Wire up API to dashboard page using TanStack Query
- [ ] Add auto-refresh (30s interval)
- [ ] Remove all hardcoded values
- [ ] Add loading skeleton
- [ ] Add error state with retry

**Backend API Spec**:
```typescript
GET /api/v1/dashboard/summary
Response: {
  active_agents_count: number
  executions_today: number
  avg_response_time_ms: number
  error_rate_pct: number
  recent_activity: Array<{
    execution_id: string
    agent_name: string
    status: "completed" | "failed" | "processing"
    timestamp: string
  }>
}
```

**Technical Notes**:
- Add to `src/api/dashboard.py`
- Query across agents + agent_executions tables
- Cache for 30s using Redis
- Use SQL aggregations for performance

**Testing Requirements**:
- Unit test for dashboard service aggregation logic
- Integration test for GET /api/v1/dashboard/summary
- E2E test for dashboard page render

---

### Story 0.2: Operations Page - Component Verification
**Priority**: P0 🔴
**Effort**: M (3-5 days)
**Dependencies**: None

**User Story**: As an admin, I need to manage queue operations so that I can pause processing, clear queues, and monitor worker health.

**Current State**: Page structure exists but child components (`QueueStatus`, `QueueDepthChart`, `TaskList`, `QueuePauseToggle`) need implementation verification.

**Acceptance Criteria**:
- [ ] Verify `QueueStatus` component fetches from `GET /api/v1/queue/status`
- [ ] Verify `QueueDepthChart` fetches from `GET /api/v1/queue/metrics`
- [ ] Verify `TaskList` component fetches from `GET /api/v1/queue/tasks`
- [ ] Verify `QueuePauseToggle` calls `POST /api/v1/queue/pause` and `POST /api/v1/queue/resume`
- [ ] If components are stubs, implement full backend integration
- [ ] Add pagination to TaskList (25/50/100 per page)
- [ ] Add cancel task action (DELETE /api/v1/queue/tasks/{id})
- [ ] Add confirmation dialogs for pause/clear operations
- [ ] Add auto-refresh (30s for queue status)
- [ ] Add typed "YES" confirmation for destructive actions

**Backend API Endpoints** (verify existence or create):
```typescript
GET /api/v1/queue/status
Response: {
  queue_depth: number
  processing_paused: boolean
  active_workers: number
}

GET /api/v1/queue/metrics?time_range=1h
Response: {
  timestamps: string[]
  queue_depths: number[]
}

GET /api/v1/queue/tasks?skip=0&limit=25&status=all
Response: {
  tasks: Array<{
    id: string
    agent_id: string
    agent_name: string
    status: "pending" | "processing" | "completed" | "failed"
    queued_at: string
    priority: number
    tenant_id: string
  }>
  total: number
}

POST /api/v1/queue/pause
POST /api/v1/queue/resume
DELETE /api/v1/queue/tasks/{id}
```

**Technical Notes**:
- Reference Streamlit `7_Operations.py` for Redis flag logic
- Use `admin.utils.operations_helper` patterns
- Implement audit logging for all operations
- Add RBAC enforcement (admin only)

**Testing Requirements**:
- Unit tests for queue service methods
- Integration tests for all queue API endpoints
- E2E test for pause/resume flow
- E2E test for queue clearing with confirmation

---

## Epic 1: User Management & RBAC (P0)

### Story 1.1: User Management Admin Panel
**Priority**: P0 🔴
**Effort**: L (1-2 weeks)
**Dependencies**: None

**User Story**: As an admin, I need to manage user accounts so that I can control system access and assign roles.

**Current State**: Backend has user endpoints but Next.js has no user management page.

**Acceptance Criteria**:
- [ ] Create `/dashboard/users` page with user list
- [ ] Implement user CRUD operations
- [ ] Wire up to these backend endpoints:
  - `GET /api/v1/users` (need to create - currently only /api/users/me exists)
  - `POST /api/v1/users` (need to create)
  - `PUT /api/v1/users/{user_id}` (need to create)
  - `DELETE /api/v1/users/{user_id}` (need to create)
  - `PUT /api/v1/users/{user_id}/password` (exists: /api/users/me/password)
- [ ] Add role/permission assignment UI
- [ ] Add user search/filter
- [ ] Add pagination (25/50/100 rows)
- [ ] Add user status toggle (active/inactive)
- [ ] Display last login timestamp
- [ ] Add password reset functionality
- [ ] Add email validation

**Backend API Spec** (NEW endpoints needed):
```typescript
GET /api/v1/users?skip=0&limit=25&search=&role=all&status=all
Response: {
  users: Array<{
    id: string
    email: string
    full_name: string
    roles: string[]
    is_active: boolean
    last_login_at: string | null
    created_at: string
    updated_at: string
  }>
  total: number
}

POST /api/v1/users
Request: {
  email: string
  full_name: string
  password: string
  roles: string[]
}

PUT /api/v1/users/{user_id}
Request: {
  email?: string
  full_name?: string
  roles?: string[]
  is_active?: boolean
}

DELETE /api/v1/users/{user_id}
```

**Technical Notes**:
- Add to `src/api/users.py` (extend existing)
- Requires admin authentication
- Hash passwords with bcrypt
- Use existing UI patterns from other CRUD pages
- Reference Tenants page for layout

**Testing Requirements**:
- Unit tests for user CRUD hooks
- Integration tests for all user API endpoints
- E2E test for full user management flow
- Test RBAC enforcement (admin only access)

---

### Story 1.2: Role & Permission Management
**Priority**: P0 🔴
**Effort**: M (3-5 days)
**Dependencies**: Story 1.1

**User Story**: As an admin, I need to manage roles and permissions so that I can implement fine-grained access control.

**Acceptance Criteria**:
- [ ] Create `/dashboard/roles` page with role list
- [ ] Add role CRUD operations
- [ ] Add permission assignment matrix UI
- [ ] Wire up to backend endpoints:
  - `GET /api/v1/roles`
  - `POST /api/v1/roles`
  - `PUT /api/v1/roles/{role_id}`
  - `DELETE /api/v1/roles/{role_id}`
  - `GET /api/v1/permissions` (list all available permissions)
  - `PUT /api/v1/roles/{role_id}/permissions` (assign permissions to role)
- [ ] Add user count per role
- [ ] Add predefined roles (super_admin, tenant_admin, developer, operator, viewer)
- [ ] Prevent deletion of roles in use
- [ ] Add role hierarchy visualization

**Backend API Spec** (NEW endpoints needed):
```typescript
GET /api/v1/roles
Response: {
  roles: Array<{
    id: string
    name: string
    description: string
    permissions: string[]
    user_count: number
    is_system_role: boolean
  }>
}

GET /api/v1/permissions
Response: {
  permissions: Array<{
    name: string
    resource: string
    action: string
    description: string
  }>
}

PUT /api/v1/roles/{role_id}/permissions
Request: {
  permissions: string[]
}
```

**Technical Notes**:
- Add to `src/api/rbac.py` (new file)
- Reference existing RBAC decorators
- System roles cannot be deleted
- Add audit logging for permission changes

**Testing Requirements**:
- Unit tests for role CRUD
- Integration tests for permission assignment
- E2E test for role creation and assignment

---

## Epic 2: Admin Tenant Operations (P0)

### Story 2.1: Tenant Budget Override
**Priority**: P0 🔴
**Effort**: S (1-2 days)
**Dependencies**: None

**User Story**: As an admin, I need to grant temporary budget overrides so that I can handle emergency situations without modifying tenant budgets.

**Current State**: Backend endpoint exists (`POST /admin/tenants/{tenant_id}/budget-override`) but no UI.

**Acceptance Criteria**:
- [ ] Add "Grant Budget Override" button to Tenants page
- [ ] Create modal dialog with:
  - Override amount input (USD)
  - Expiration date picker (max 30 days)
  - Reason textarea (required)
- [ ] Wire up to `POST /admin/tenants/{tenant_id}/budget-override`
- [ ] Add "Remove Override" action (DELETE endpoint)
- [ ] Display override badge on tenant card if active
- [ ] Show override expiration countdown
- [ ] Add confirmation dialog for removal
- [ ] Log all override actions to audit log

**Backend API Endpoints** (EXIST):
- `POST /admin/tenants/{tenant_id}/budget-override`
- `DELETE /admin/tenants/{tenant_id}/budget-override`

**Technical Notes**:
- Reference `src/api/admin/tenants.py`
- Override is temporary (TTL in Redis + DB record)
- Requires admin authentication (X-Admin-Key header)
- Add to existing Tenants page UI

**Testing Requirements**:
- Unit test for override modal component
- Integration test for override endpoints
- E2E test for full override flow
- Test override expiration logic

---

### Story 2.2: Tenant LiteLLM Key Rotation
**Priority**: P0 🔴
**Effort**: S (1-2 days)
**Dependencies**: None

**User Story**: As an admin, I need to rotate tenant LiteLLM virtual keys so that I can handle security incidents or key compromises.

**Current State**: Backend endpoint exists (`POST /admin/tenants/{tenant_id}/rotate-llm-key`) but no UI.

**Acceptance Criteria**:
- [ ] Add "Rotate LiteLLM Key" button to Tenants detail page
- [ ] Create confirmation dialog with:
  - Warning message about service interruption
  - Reason textarea (required)
  - Typed "YES" confirmation
- [ ] Wire up to `POST /admin/tenants/{tenant_id}/rotate-llm-key`
- [ ] Display new key in modal after rotation (copy button)
- [ ] Show last rotation timestamp on tenant card
- [ ] Add notification to tenant admins (optional)
- [ ] Log rotation to audit log

**Backend API Endpoint** (EXISTS):
- `POST /admin/tenants/{tenant_id}/rotate-llm-key`

**Technical Notes**:
- Reference `src/api/admin/tenants.py`
- New key generated via LiteLLM API
- Old key invalidated immediately
- Add to Tenants detail page

**Testing Requirements**:
- Unit test for rotation modal
- Integration test for key rotation
- E2E test for full rotation flow
- Test key invalidation

---

### Story 2.3: Admin Tenant Configuration Panel
**Priority**: P0 🔴
**Effort**: M (3-5 days)
**Dependencies**: None

**User Story**: As an admin, I need advanced tenant configuration options so that I can manage all tenant settings beyond basic CRUD.

**Current State**: Backend has `/admin/tenants` endpoints but Next.js only has basic tenant management.

**Acceptance Criteria**:
- [ ] Create `/dashboard/admin/tenants` page (separate from user-facing `/dashboard/tenants`)
- [ ] Add admin-specific features:
  - View all tenants (not just accessible ones)
  - Soft delete/restore functionality
  - LiteLLM key rotation UI (Story 2.2)
  - Budget override UI (Story 2.1)
  - Force sync tenant configs to Redis
- [ ] Wire up to admin endpoints:
  - `GET /admin/tenants?skip=0&limit=25`
  - `POST /admin/tenants`
  - `GET /admin/tenants/{tenant_id}`
  - `PUT /admin/tenants/{tenant_id}`
  - `DELETE /admin/tenants/{tenant_id}` (soft delete)
  - `POST /admin/tenants/{tenant_id}/rotate-llm-key`
  - `POST /admin/tenants/{tenant_id}/budget-override`
- [ ] Add pagination and filtering
- [ ] Add tenant health indicators
- [ ] Require admin authentication (X-Admin-Key header)
- [ ] Add audit logging for all admin actions

**Backend API Endpoints** (EXIST):
- All `/admin/tenants` endpoints from Backend API Catalog

**Technical Notes**:
- Reference `src/api/admin/tenants.py`
- Use separate route from user tenant page
- Add RBAC guard (super_admin only)
- Include tenant spend visualization

**Testing Requirements**:
- Unit tests for admin tenant hooks
- Integration tests for admin endpoints
- E2E test for admin tenant management
- Test RBAC enforcement

---

## Epic 3: Missing Streamlit Features (P1)

### Story 3.1: Agent Test Execution Interface
**Priority**: P1 🟡
**Effort**: M (3-5 days)
**Dependencies**: None

**User Story**: As a developer, I need to test agents in sandbox mode so that I can validate agent behavior before activation.

**Current State**: Backend has agent testing endpoints but Next.js has limited testing UI.

**Acceptance Criteria**:
- [ ] Add "Test Agent" tab to Agent detail page
- [ ] Create test input form:
  - User message textarea
  - Context variables (JSON editor)
  - Model override selector
  - Temperature slider (0-1)
  - Max tokens input
- [ ] Wire up to backend endpoints:
  - `POST /api/agents/{agent_id}/test` (execute test)
  - `GET /api/agents/{agent_id}/test-history?skip=0&limit=25`
  - `GET /api/agents/{agent_id}/test/{test_id}` (detail)
  - `POST /api/agents/{agent_id}/test/compare` (compare two tests)
- [ ] Display test results:
  - LLM response
  - Token usage (input/output)
  - Execution time
  - Cost estimate
  - Tool calls made
- [ ] Add test history table with pagination
- [ ] Add test comparison modal (side-by-side)
- [ ] Add save test result button
- [ ] Add test result export (JSON/CSV)

**Backend API Endpoints** (EXIST):
- `POST /api/agents/{agent_id}/test`
- `GET /api/agents/{agent_id}/test-history`
- `GET /api/agents/{agent_id}/test/{test_id}`
- `POST /api/agents/{agent_id}/test/compare`

**Technical Notes**:
- Reference `src/api/agent_testing.py`
- Tests run in sandbox (no side effects)
- Add to existing Agent detail page as tab
- Use Monaco editor for JSON inputs

**Testing Requirements**:
- Unit tests for test execution hooks
- Integration tests for test API endpoints
- E2E test for test execution flow
- E2E test for test comparison

---

### Story 3.2: Agent Memory Management UI
**Priority**: P1 🟡
**Effort**: M (3-5 days)
**Dependencies**: None

**User Story**: As a developer, I need to manage agent memory state so that I can troubleshoot memory-related issues and reset agent memory.

**Current State**: Backend has memory endpoints but no UI in Next.js.

**Acceptance Criteria**:
- [ ] Add "Memory" tab to Agent detail page
- [ ] Create memory configuration section:
  - Memory type selector (short-term/long-term/episodic)
  - Memory capacity slider
  - Retention policy selector
- [ ] Wire up to backend endpoints:
  - `GET /api/agents/{agent_id}/memory/config`
  - `PUT /api/agents/{agent_id}/memory/config`
  - `GET /api/agents/{agent_id}/memory/state`
  - `DELETE /api/agents/{agent_id}/memory?type={type}` (clear memory)
  - `GET /api/agents/{agent_id}/memory/history?skip=0&limit=25`
- [ ] Display memory state:
  - Current memory items
  - Memory size/capacity
  - Last updated timestamp
- [ ] Add clear memory action with confirmation
- [ ] Add memory history table
- [ ] Add memory export (JSON)
- [ ] Add memory visualization (timeline/graph)

**Backend API Endpoints** (EXIST):
- `GET /api/agents/{agent_id}/memory/config`
- `PUT /api/agents/{agent_id}/memory/config`
- `GET /api/agents/{agent_id}/memory/state`
- `DELETE /api/agents/{agent_id}/memory`
- `GET /api/agents/{agent_id}/memory/history`

**Technical Notes**:
- Reference `src/api/memory.py`
- Memory state can be large (add pagination)
- Add to Agent detail page as tab
- Require developer/admin role

**Testing Requirements**:
- Unit tests for memory hooks
- Integration tests for memory API endpoints
- E2E test for memory management flow
- Test memory clear functionality

---

### Story 3.3: Worker Logs Viewer
**Priority**: P1 🟡
**Effort**: S (1-2 days)
**Dependencies**: None

**User Story**: As an admin, I need to view worker logs so that I can troubleshoot worker issues.

**Current State**: Backend has endpoint (`GET /api/v1/workers/{hostname}/logs`) but Next.js Workers page doesn't use it.

**Acceptance Criteria**:
- [ ] Add "View Logs" button to each worker card on Workers page
- [ ] Create logs modal with:
  - Log level filter (ERROR/WARNING/INFO/DEBUG)
  - Line count slider (50/100/250/500/1000)
  - Search input for log filtering
  - Auto-refresh toggle (5s/10s/30s/off)
- [ ] Wire up to `GET /api/v1/workers/{hostname}/logs?level={level}&lines={count}`
- [ ] Display logs with:
  - Syntax highlighting
  - Line numbers
  - Timestamp column
  - Log level badges
- [ ] Add download logs button (downloads as .log file)
- [ ] Add tail mode (auto-scroll to bottom)
- [ ] Add log streaming (WebSocket, optional)

**Backend API Endpoint** (EXISTS):
- `GET /api/v1/workers/{hostname}/logs`

**Technical Notes**:
- Reference Streamlit `8_Workers.py`
- Logs retrieved via kubectl (K8s API)
- Add to existing Workers page
- Use monospace font for logs

**Testing Requirements**:
- Unit test for logs modal component
- Integration test for logs endpoint
- E2E test for logs viewer flow
- Test log filtering and search

---

### Story 3.4: System Prompt Version History
**Priority**: P1 🟡
**Effort**: S (1-2 days)
**Dependencies**: None

**User Story**: As a developer, I need to view and revert prompt versions so that I can manage prompt changes over time.

**Current State**: Backend has prompt version endpoints but Next.js prompts page is missing version history UI.

**Acceptance Criteria**:
- [ ] Add "Version History" tab to Prompt detail page
- [ ] Wire up to backend endpoints:
  - `GET /api/v1/prompts/{agent_id}/prompt-versions?limit=20&offset=0`
  - `GET /api/v1/prompts/{agent_id}/prompt-versions/{version_id}`
  - `POST /api/v1/prompts/{agent_id}/prompt-versions/revert`
- [ ] Display version history table:
  - Version number
  - Creator (user email)
  - Created timestamp
  - Character count
  - Diff indicator (if changed)
- [ ] Add version detail modal:
  - Full prompt text
  - Diff view (compared to previous version)
  - Metadata (created_at, created_by)
- [ ] Add revert action with confirmation
- [ ] Add version comparison (select 2 versions)
- [ ] Add version export (download as .txt)

**Backend API Endpoints** (EXIST):
- `GET /api/v1/prompts/{agent_id}/prompt-versions`
- `GET /api/v1/prompts/{agent_id}/prompt-versions/{version_id}`
- `POST /api/v1/prompts/{agent_id}/prompt-versions/revert`

**Technical Notes**:
- Reference `src/api/prompts.py`
- Use diff library for version comparison (similar to audit logs)
- Add to Prompts page
- Require developer/admin role

**Testing Requirements**:
- Unit tests for version history hooks
- Integration tests for version API endpoints
- E2E test for version revert flow
- Test version comparison

---

### Story 3.5: Prompt Template Management
**Priority**: P1 🟡
**Effort**: S (1-2 days)
**Dependencies**: None

**User Story**: As a developer, I need to create and manage reusable prompt templates so that I can quickly configure new agents.

**Current State**: Backend has template endpoints but Next.js is missing template CRUD UI.

**Acceptance Criteria**:
- [ ] Add "Templates" tab to Prompts page
- [ ] Create template list view with:
  - Template name, description
  - Built-in vs custom indicator
  - Variable count
  - Usage count (agents using template)
- [ ] Wire up to backend endpoints:
  - `GET /api/agents/prompt-templates`
  - `POST /api/agents/prompt-templates`
  - `DELETE /api/agents/prompt-templates/{template_id}`
- [ ] Add create template form:
  - Name input (required)
  - Description textarea
  - Template text (with variable syntax highlighting)
  - Variable extraction preview
- [ ] Add delete action (custom templates only)
- [ ] Add template preview (render with sample variables)
- [ ] Prevent deletion of templates in use

**Backend API Endpoints** (EXIST):
- `GET /api/agents/prompt-templates`
- `POST /api/agents/prompt-templates`
- `DELETE /api/agents/prompt-templates/{template_id}`

**Technical Notes**:
- Reference Streamlit `9_System_Prompt_Editor.py`
- Built-in templates cannot be deleted
- Variable syntax: `{{variable_name}}`
- Add to Prompts page as tab

**Testing Requirements**:
- Unit tests for template CRUD hooks
- Integration tests for template API endpoints
- E2E test for template creation flow
- Test template variable extraction

---

### Story 3.6: Prompt Testing with LLM
**Priority**: P1 🟡
**Effort**: S (1-2 days)
**Dependencies**: None

**User Story**: As a developer, I need to test prompts with real LLM calls so that I can validate prompt quality before deploying.

**Current State**: Backend endpoint exists (`POST /api/v1/prompts/test`) but no UI.

**Acceptance Criteria**:
- [ ] Add "Test Prompt" button to Prompt editor
- [ ] Create test modal with:
  - Model selector (dropdown with available models)
  - Variable inputs (dynamic based on prompt variables)
  - Sample user message textarea
  - Temperature slider
  - Max tokens input
- [ ] Wire up to `POST /api/v1/prompts/test`
- [ ] Display test results:
  - LLM response
  - Token usage (input/output)
  - Execution time
  - Cost estimate
- [ ] Add test history (last 5 tests)
- [ ] Add copy result button
- [ ] Add save as test case option

**Backend API Endpoint** (EXISTS):
- `POST /api/v1/prompts/test`

**Technical Notes**:
- Reference `src/api/prompts.py`
- Model list fetched from LiteLLM
- Variable substitution client-side
- Add to Prompts page

**Testing Requirements**:
- Unit test for prompt test modal
- Integration test for prompt test endpoint
- E2E test for prompt testing flow
- Test variable substitution

---

## Epic 4: Dashboard Enhancements (P2)

### Story 4.1: Dashboard Metrics - Real-Time Updates
**Priority**: P2 🟢
**Effort**: S (1-2 days)
**Dependencies**: Story 0.1

**User Story**: As a user, I need real-time dashboard updates so that I can monitor system health without manual refresh.

**Acceptance Criteria**:
- [ ] Add auto-refresh to dashboard home (30s interval)
- [ ] Add manual refresh button
- [ ] Add last updated timestamp
- [ ] Add pause/resume auto-refresh toggle
- [ ] Add refresh interval selector (10s/30s/60s/off)
- [ ] Add loading indicators during refresh
- [ ] Maintain scroll position during refresh
- [ ] Add error handling with retry

**Technical Notes**:
- Use TanStack Query's refetchInterval
- Store refresh preference in localStorage
- Add subtle animation on data update
- Reference Health page pattern

**Testing Requirements**:
- Unit test for auto-refresh logic
- E2E test for refresh controls
- Test pause/resume functionality

---

### Story 4.2: Dashboard - Trend Indicators
**Priority**: P2 🟢
**Effort**: S (1-2 days)
**Dependencies**: Story 0.1

**User Story**: As a user, I need trend indicators on dashboard metrics so that I can see if metrics are improving or degrading.

**Acceptance Criteria**:
- [ ] Add trend arrows to metric cards (↑/↓/→)
- [ ] Add trend percentage (e.g., "+12% vs yesterday")
- [ ] Add color coding (green=improving, red=degrading, gray=stable)
- [ ] Add sparklines for 24h trends (optional)
- [ ] Add tooltip with trend explanation
- [ ] Calculate trends based on previous period comparison

**Backend API Update**:
```typescript
GET /api/v1/dashboard/summary
Response: {
  // existing fields...
  trends: {
    active_agents: { direction: "up" | "down" | "stable", pct_change: number }
    executions_today: { direction: "up" | "down" | "stable", pct_change: number }
    avg_response_time: { direction: "up" | "down" | "stable", pct_change: number }
    error_rate: { direction: "up" | "down" | "stable", pct_change: number }
  }
}
```

**Technical Notes**:
- Backend calculates trends vs previous 24h
- Green for positive trends (except error_rate, where down is good)
- Add to dashboard summary endpoint

**Testing Requirements**:
- Unit test for trend calculation logic
- Unit test for trend display components
- E2E test for trend indicators

---

### Story 4.3: Dashboard - Quick Actions Panel
**Priority**: P2 🟢
**Effort**: S (1-2 days)
**Dependencies**: Story 0.1

**User Story**: As a user, I need quick action shortcuts on the dashboard so that I can perform common tasks efficiently.

**Acceptance Criteria**:
- [ ] Add "Quick Actions" section to dashboard
- [ ] Add action cards:
  - Create New Agent (navigates to /agents-config/new)
  - View Execution History (navigates to /execution-history)
  - Check System Health (navigates to /health)
  - Manage Tenants (navigates to /tenants)
- [ ] Add action counts/badges (e.g., "5 active agents")
- [ ] Add RBAC filtering (show only allowed actions)
- [ ] Add keyboard shortcuts (⌘+N for new agent, etc.)

**Technical Notes**:
- Use glassmorphic cards consistent with design
- Add to dashboard page below metrics
- Use Next.js router for navigation
- Add Cmd/Ctrl+K command palette (optional)

**Testing Requirements**:
- Unit test for quick actions component
- E2E test for navigation
- Test RBAC filtering

---

## Epic 5: Enhanced Monitoring & Analytics (P2)

### Story 5.1: Error Analysis Dashboard
**Priority**: P2 🟢
**Effort**: M (3-5 days)
**Dependencies**: None

**User Story**: As an admin, I need a centralized error analysis dashboard so that I can identify and troubleshoot systemic issues.

**Acceptance Criteria**:
- [ ] Create `/dashboard/error-analysis` page
- [ ] Wire up to backend endpoints:
  - `GET /api/v1/agents/{agent_id}/error-analysis` (aggregate)
  - Create new: `GET /api/v1/error-analysis/global?time_range=24h`
- [ ] Display error metrics:
  - Total errors (24h/7d/30d)
  - Error rate trend chart
  - Top 10 error types with counts
  - Affected agents breakdown
  - Recent error samples (last 20)
- [ ] Add filtering:
  - Time range selector
  - Error type filter
  - Agent filter
  - Severity filter (if available)
- [ ] Add error detail modal with:
  - Full error message
  - Stack trace
  - Affected execution IDs
  - First/last occurrence timestamps
  - Occurrence count
- [ ] Add export errors (CSV)
- [ ] Add auto-refresh (60s)

**Backend API Spec** (NEW endpoint):
```typescript
GET /api/v1/error-analysis/global?time_range=24h&error_type=&agent_id=
Response: {
  total_errors: number
  error_rate_pct: number
  trend: Array<{ timestamp: string, count: number }>
  error_types: Array<{
    type: string
    count: number
    percentage: number
    affected_agents: string[]
    sample_message: string
    first_occurrence: string
    last_occurrence: string
  }>
}
```

**Technical Notes**:
- Add to `src/api/error_analysis.py`
- Query agent_executions table (status=failed)
- Group errors by error message patterns
- Use regex for error type classification

**Testing Requirements**:
- Unit tests for error analysis service
- Integration tests for error endpoints
- E2E test for error analysis page
- Test error grouping logic

---

### Story 5.2: Cost Attribution by Tenant
**Priority**: P2 🟢
**Effort**: S (1-2 days)
**Dependencies**: None

**User Story**: As an admin, I need to see cost breakdown by tenant so that I can perform cost allocation and chargebacks.

**Acceptance Criteria**:
- [ ] Add "By Tenant" tab to LLM Costs page
- [ ] Wire up to existing endpoint: `GET /api/costs/by-tenant?limit=10&start_date=&end_date=`
- [ ] Display tenant cost table:
  - Tenant name
  - Total cost
  - Agent count
  - Execution count
  - Average cost per execution
  - Budget utilization percentage
- [ ] Add sorting (by cost, by utilization, by name)
- [ ] Add cost breakdown per tenant (expandable rows):
  - Cost by agent
  - Cost by model
  - Token usage
- [ ] Add export tenant costs (CSV)
- [ ] Add date range filter
- [ ] Add cost trend sparklines per tenant

**Backend API Endpoint** (EXISTS):
- `GET /api/costs/by-tenant`

**Technical Notes**:
- Reference `src/api/llm_costs.py`
- Add to existing LLM Costs page as tab
- Use expandable rows pattern from budget utilization

**Testing Requirements**:
- Unit tests for tenant cost hooks
- Integration test for by-tenant endpoint
- E2E test for cost attribution view

---

### Story 5.3: Agent Tool Usage Statistics
**Priority**: P2 🟢
**Effort**: S (1-2 days)
**Dependencies**: None

**User Story**: As a developer, I need to see which tools agents are using so that I can optimize tool assignments and identify unused tools.

**Acceptance Criteria**:
- [ ] Add "Tool Usage" section to Agent Performance page
- [ ] Wire up to `GET /api/v1/agents/tool-usage-stats?agent_id={id}&days=30`
- [ ] Display tool usage table:
  - Tool name
  - Call count
  - Success rate
  - Average execution time
  - Last used timestamp
- [ ] Add usage chart (bar chart, top 10 tools)
- [ ] Add unused tools list
- [ ] Add tool error analysis
- [ ] Add date range filter

**Backend API Endpoint** (EXISTS):
- `GET /api/v1/agents/tool-usage-stats`

**Technical Notes**:
- Reference `src/api/agents.py`
- Add to Agent Performance page
- Query tool_calls from execution logs

**Testing Requirements**:
- Unit test for tool usage stats hook
- Integration test for tool-usage-stats endpoint
- E2E test for tool usage view

---

## Epic 6: System Operations (P2)

### Story 6.1: Tenant Config Sync Operation
**Priority**: P2 🟢
**Effort**: S (1-2 days)
**Dependencies**: Story 0.2

**User Story**: As an admin, I need to sync tenant configs from PostgreSQL to Redis so that I can ensure cache consistency.

**Current State**: Streamlit has sync operation but Next.js Operations page needs verification.

**Acceptance Criteria**:
- [ ] Add "Sync Tenant Configs" button to Operations page
- [ ] Create confirmation dialog with:
  - Warning message
  - Typed "YES" confirmation
  - Tenant count to be synced
- [ ] Wire up to `POST /api/operations/sync-configs`
- [ ] Display sync results:
  - Synced count
  - Failed count
  - Duration
  - Error messages (if any)
- [ ] Add audit log entry
- [ ] Add toast notification on completion
- [ ] Show last sync timestamp

**Backend API Endpoint** (NEW):
```typescript
POST /api/operations/sync-configs
Response: {
  synced_count: number
  failed_count: number
  duration_ms: number
  errors: string[]
}
```

**Technical Notes**:
- Reference Streamlit `7_Operations.py`
- Use `admin.utils.operations_helper.sync_tenant_configs()`
- Syncs PostgreSQL → Redis cache
- Add to Operations page

**Testing Requirements**:
- Unit test for sync operation
- Integration test for sync-configs endpoint
- E2E test for sync flow
- Test error handling

---

### Story 6.2: Database Connection Monitoring
**Priority**: P2 🟢
**Effort**: S (1-2 days)
**Dependencies**: None

**User Story**: As an admin, I need to monitor database and Redis connections so that I can detect connectivity issues early.

**Acceptance Criteria**:
- [ ] Add "Database Health" section to Health page
- [ ] Create new endpoint: `GET /api/v1/health/database`
- [ ] Display connection metrics:
  - PostgreSQL: connection pool size, active connections, idle connections, max connections
  - Redis: connected clients, used memory, uptime, hit rate
- [ ] Add connection test buttons
- [ ] Add health indicators (green/yellow/red)
- [ ] Add connection history chart (last 24h)
- [ ] Add auto-refresh (5s)
- [ ] Add alerts for connection pool exhaustion

**Backend API Spec** (NEW):
```typescript
GET /api/v1/health/database
Response: {
  postgres: {
    status: "healthy" | "degraded" | "down"
    pool_size: number
    active_connections: number
    idle_connections: number
    max_connections: number
    response_time_ms: number
  }
  redis: {
    status: "healthy" | "degraded" | "down"
    connected_clients: number
    used_memory_mb: number
    uptime_seconds: number
    hit_rate_pct: number
    response_time_ms: number
  }
}
```

**Technical Notes**:
- Add to `src/api/health.py`
- Query PostgreSQL: `SELECT * FROM pg_stat_database`
- Query Redis: `INFO` command
- Add to Health page

**Testing Requirements**:
- Unit test for database health checks
- Integration test for health endpoint
- E2E test for database monitoring
- Test connection failure scenarios

---

### Story 6.3: Audit Log Export
**Priority**: P2 🟢
**Effort**: S (1-2 days)
**Dependencies**: None

**User Story**: As an admin, I need to export audit logs so that I can perform compliance reporting and analysis.

**Acceptance Criteria**:
- [ ] Add "Export" button to Audit Logs page
- [ ] Create export modal with:
  - Format selector (CSV/JSON)
  - Date range picker
  - Event type filter
  - User filter
  - Entity type filter
- [ ] Wire up to new endpoint: `GET /audit/export?format=csv&start_date=&end_date=&event_type=&user_id=&entity_type=`
- [ ] Generate downloadable file
- [ ] Add export size limit (max 10K records)
- [ ] Add progress indicator for large exports
- [ ] Add email delivery option for large exports

**Backend API Endpoint** (NEW):
```typescript
GET /audit/export?format=csv&start_date=&end_date=&filters...
Response: File download (CSV or JSON)
```

**Technical Notes**:
- Add to `src/api/audit.py`
- Stream large exports (chunked response)
- Add rate limiting (1 export per minute)
- Add to Audit Logs page

**Testing Requirements**:
- Unit test for export generation
- Integration test for export endpoint
- E2E test for export flow
- Test large export handling

---

## Epic 7: Integration Enhancements (P3)

### Story 7.1: ServiceDesk Plus Webhook URL Display
**Priority**: P3 🟢
**Effort**: XS (< 1 day)
**Dependencies**: None

**User Story**: As a tenant admin, I need to see my ServiceDesk webhook URL so that I can configure ServiceDesk to send events to the platform.

**Acceptance Criteria**:
- [ ] Add "Webhook Configuration" section to Tenant detail page
- [ ] Display webhook URL with copy button
- [ ] Show webhook signing secret (masked, with reveal option)
- [ ] Add webhook test button (sends test payload)
- [ ] Add webhook delivery logs (last 20 deliveries)
- [ ] Add webhook URL regeneration option

**Technical Notes**:
- Webhook URL format: `https://{domain}/webhook/servicedesk?tenant_id={id}`
- Add to existing Tenants page
- Reference Streamlit tenant management

**Testing Requirements**:
- Unit test for webhook URL display
- E2E test for webhook configuration section
- Test URL copy functionality

---

### Story 7.2: BYOK Key Rotation UI
**Priority**: P3 🟢
**Effort**: S (1-2 days)
**Dependencies**: None

**User Story**: As a tenant admin, I need to rotate my BYOK API keys so that I can maintain security compliance.

**Current State**: Backend endpoints exist but Next.js lacks BYOK management UI.

**Acceptance Criteria**:
- [ ] Add "BYOK Configuration" section to Tenant detail page
- [ ] Wire up to backend endpoints:
  - `POST /api/tenants/{tenant_id}/byok/test-keys`
  - `POST /api/tenants/{tenant_id}/byok/enable`
  - `PUT /api/tenants/{tenant_id}/byok/rotate-keys`
  - `POST /api/tenants/{tenant_id}/byok/disable`
  - `GET /api/tenants/{tenant_id}/byok/status`
- [ ] Add BYOK enable form:
  - Provider selector (OpenAI/Anthropic/etc.)
  - API key input (masked)
  - Test connection button
- [ ] Add rotate keys action with confirmation
- [ ] Add disable BYOK action (revert to platform keys)
- [ ] Display BYOK status badge
- [ ] Show last rotation timestamp
- [ ] Add audit logging for all BYOK actions

**Backend API Endpoints** (EXIST):
- All `/api/tenants/{tenant_id}/byok/*` endpoints

**Technical Notes**:
- Reference `src/api/byok.py`
- Keys stored encrypted in database
- Test connection before enabling
- Add to Tenants detail page

**Testing Requirements**:
- Unit tests for BYOK hooks
- Integration tests for BYOK endpoints
- E2E test for BYOK enable flow
- E2E test for key rotation flow
- Test revert to platform keys

---

### Story 7.3: Webhook Delivery Logs
**Priority**: P3 🟢
**Effort**: S (1-2 days)
**Dependencies**: None

**User Story**: As a tenant admin, I need to see webhook delivery logs so that I can troubleshoot integration issues.

**Acceptance Criteria**:
- [ ] Create new endpoint: `GET /api/webhooks/delivery-logs?tenant_id={id}&skip=0&limit=25`
- [ ] Add "Webhook Logs" tab to Tenant detail page
- [ ] Display delivery logs table:
  - Timestamp
  - Event type
  - Status (delivered/failed)
  - Response code
  - Response body (expandable)
  - Retry count
  - Next retry at (if failed)
- [ ] Add filtering by status and event type
- [ ] Add retry button for failed deliveries
- [ ] Add pagination (25/50/100 per page)
- [ ] Add export logs (CSV)

**Backend API Spec** (NEW):
```typescript
GET /api/webhooks/delivery-logs?tenant_id={id}&skip=0&limit=25&status=all&event_type=all
Response: {
  logs: Array<{
    id: string
    timestamp: string
    event_type: string
    status: "delivered" | "failed"
    response_code: number
    response_body: string
    retry_count: number
    next_retry_at: string | null
  }>
  total: number
}
```

**Technical Notes**:
- Add to `src/api/webhooks.py`
- Log webhook deliveries to database
- Implement retry mechanism
- Add to Tenants page as tab

**Testing Requirements**:
- Unit tests for webhook logging
- Integration tests for delivery logs endpoint
- E2E test for webhook logs view
- Test retry functionality

---

## Epic 8: Documentation & Developer Experience (P3)

### Story 8.1: Interactive API Documentation
**Priority**: P3 🟢
**Effort**: M (3-5 days)
**Dependencies**: None

**User Story**: As a developer, I need interactive API documentation so that I can test API endpoints and understand request/response formats.

**Acceptance Criteria**:
- [ ] Create `/dashboard/api-docs` page
- [ ] Integrate Swagger UI or Redoc component
- [ ] Wire up to existing OpenAPI spec (`GET /docs/openapi.json`)
- [ ] Add "Try It Out" functionality for authenticated endpoints
- [ ] Add API key management section
- [ ] Add code examples (curl/Python/JavaScript)
- [ ] Add authentication instructions
- [ ] Add RBAC information per endpoint
- [ ] Add rate limiting information

**Technical Notes**:
- Backend already has OpenAPI docs at `/docs` and `/redoc`
- Embed in Next.js iframe or use @stoplight/elements
- Add authentication via X-Tenant-ID and Bearer token
- Add to sidebar navigation

**Testing Requirements**:
- E2E test for API docs page load
- Test "Try It Out" functionality
- Test authentication flow

---

### Story 8.2: Agent Configuration Templates
**Priority**: P3 🟢
**Effort**: S (1-2 days)
**Dependencies**: None

**User Story**: As a developer, I need pre-configured agent templates so that I can quickly create common agent types.

**Acceptance Criteria**:
- [ ] Add "Templates" section to Agent creation page
- [ ] Create agent templates:
  - Customer Support Agent
  - IT Helpdesk Agent
  - Code Review Agent
  - Data Analysis Agent
- [ ] Each template includes:
  - Pre-configured system prompt
  - Recommended LLM model
  - Default tools
  - Temperature/max_tokens settings
- [ ] Add template preview
- [ ] Add "Use Template" button (pre-fills form)
- [ ] Add custom template creation
- [ ] Store templates in database

**Backend API Spec** (NEW):
```typescript
GET /api/v1/agent-templates
Response: {
  templates: Array<{
    id: string
    name: string
    description: string
    system_prompt: string
    llm_config: {...}
    recommended_tools: string[]
    is_builtin: boolean
  }>
}

POST /api/v1/agent-templates
Request: { name, description, system_prompt, llm_config, recommended_tools }
```

**Technical Notes**:
- Add to `src/api/agent_templates.py` (new file)
- Store templates in database
- Built-in templates cannot be deleted
- Add to Agent creation page

**Testing Requirements**:
- Unit tests for template CRUD
- Integration tests for template endpoints
- E2E test for template usage
- Test template pre-fill

---

### Story 8.3: Feedback & Enhancement Tracking
**Priority**: P3 🟢
**Effort**: S (1-2 days)
**Dependencies**: None

**User Story**: As a user, I need to submit feedback and enhancement requests so that I can influence product development.

**Current State**: Backend has feedback endpoint but no UI.

**Acceptance Criteria**:
- [ ] Create `/dashboard/feedback` page
- [ ] Wire up to backend endpoints:
  - `POST /api/v1/feedback/` (submit)
  - `GET /api/v1/feedback/?status=all&category=all&skip=0&limit=25` (list)
  - `GET /api/v1/feedback/stats` (statistics)
- [ ] Add feedback submission form:
  - Category selector (bug/feature/enhancement/other)
  - Title input
  - Description textarea
  - Priority selector (low/medium/high)
  - Attachments (screenshots)
- [ ] Display feedback list (admin view):
  - Status badges (new/in-progress/completed/rejected)
  - Category badges
  - Vote count
  - Comment count
  - Created timestamp
- [ ] Add voting system (upvote/downvote)
- [ ] Add comments thread
- [ ] Add status updates
- [ ] Add export feedback (CSV)

**Backend API Endpoints** (EXIST):
- `POST /api/v1/feedback/`
- `GET /api/v1/feedback/`
- `GET /api/v1/feedback/stats`

**Technical Notes**:
- Reference `src/api/feedback.py`
- Add voting and commenting endpoints
- Add to sidebar navigation
- Require authentication

**Testing Requirements**:
- Unit tests for feedback hooks
- Integration tests for feedback endpoints
- E2E test for feedback submission
- Test voting and commenting

---

## Epic 9: Performance & Scalability (P3)

### Story 9.1: Execution History - Lazy Loading
**Priority**: P3 🟢
**Effort**: S (1-2 days)
**Dependencies**: None

**User Story**: As a user, I need faster execution history page loads so that I can quickly access execution data.

**Acceptance Criteria**:
- [ ] Implement virtual scrolling for execution history table
- [ ] Add infinite scroll (load more on scroll)
- [ ] Reduce initial page load (fetch 25 rows initially)
- [ ] Add request debouncing for search/filter
- [ ] Add client-side caching (TanStack Query)
- [ ] Optimize SQL queries (add indexes if needed)
- [ ] Add loading skeleton for rows
- [ ] Measure and improve Time to First Byte (TTFB)

**Technical Notes**:
- Use @tanstack/react-virtual for virtual scrolling
- Add indexes on agent_executions table (tenant_id, created_at, status)
- Debounce search input (300ms)
- Cache queries for 60s

**Testing Requirements**:
- Performance test with 10K+ executions
- E2E test for virtual scrolling
- Test infinite scroll
- Test debounced search

---

### Story 9.2: LLM Costs - Data Aggregation Optimization
**Priority**: P3 🟢
**Effort**: S (1-2 days)
**Dependencies**: None

**User Story**: As an admin, I need faster LLM cost dashboard loads so that I can quickly view cost analytics.

**Acceptance Criteria**:
- [ ] Create materialized view for cost aggregations
- [ ] Add daily cost rollup job (Celery task)
- [ ] Cache cost summary for 5 minutes
- [ ] Optimize budget utilization query
- [ ] Add database indexes on llm_usage_logs table
- [ ] Reduce initial chart data points (30 days → 7 days default)
- [ ] Add incremental loading (show summary first, then details)
- [ ] Measure query performance (<100ms target)

**Technical Notes**:
- Create materialized view: `daily_llm_costs`
- Add Celery task: `refresh_cost_aggregations` (runs daily at 1am)
- Add indexes: (tenant_id, created_at), (agent_id, created_at)
- Use Redis caching for summary endpoint

**Testing Requirements**:
- Performance test with 100K+ usage logs
- Unit test for aggregation job
- Integration test for cached endpoints
- Test cache invalidation

---

## Epic 10: Security & Compliance (P3)

### Story 10.1: API Key Management
**Priority**: P3 🟢
**Effort**: M (3-5 days)
**Dependencies**: None

**User Story**: As a developer, I need to manage API keys so that I can integrate external applications with the platform.

**Acceptance Criteria**:
- [ ] Create `/dashboard/api-keys` page
- [ ] Add API key generation with:
  - Name/description
  - Expiration date
  - Scope/permissions (read/write)
  - Rate limit
- [ ] Wire up to new endpoints:
  - `POST /api/v1/api-keys`
  - `GET /api/v1/api-keys`
  - `DELETE /api/v1/api-keys/{key_id}`
  - `PUT /api/v1/api-keys/{key_id}/rotate`
- [ ] Display API key table:
  - Key name, masked key (last 4 chars)
  - Scopes, rate limit
  - Created/expires at
  - Last used timestamp
  - Usage count
- [ ] Add key rotation with confirmation
- [ ] Add key revocation
- [ ] Show key only once after creation
- [ ] Add usage logs per key

**Backend API Spec** (NEW):
```typescript
POST /api/v1/api-keys
Request: {
  name: string
  description?: string
  scopes: string[]
  expires_at?: string
  rate_limit?: number
}
Response: {
  key_id: string
  api_key: string  // Only returned on creation
  name: string
  scopes: string[]
  expires_at: string
}

GET /api/v1/api-keys
Response: {
  keys: Array<{
    key_id: string
    name: string
    key_prefix: string  // First 4 + last 4 chars
    scopes: string[]
    created_at: string
    expires_at: string
    last_used_at: string | null
    usage_count: number
  }>
}
```

**Technical Notes**:
- Add to `src/api/api_keys.py` (new file)
- Store keys hashed (bcrypt)
- Validate on incoming requests
- Add rate limiting middleware

**Testing Requirements**:
- Unit tests for key generation/validation
- Integration tests for API key endpoints
- E2E test for key creation flow
- Test key authentication

---

### Story 10.2: Audit Log - Enhanced Filtering
**Priority**: P3 🟢
**Effort**: S (1-2 days)
**Dependencies**: None

**User Story**: As a compliance officer, I need advanced audit log filtering so that I can perform detailed compliance audits.

**Acceptance Criteria**:
- [ ] Add advanced filter panel to Audit Logs page
- [ ] Add filter options:
  - User email search (autocomplete)
  - Entity type multi-select
  - Action type multi-select (create/update/delete)
  - IP address filter
  - User agent filter
  - Date range with presets (Today/Last 7 days/Last 30 days/Custom)
  - Success/failure status
- [ ] Add filter persistence (save filters in URL params)
- [ ] Add saved filter presets
- [ ] Add filter reset button
- [ ] Add active filters indicator
- [ ] Optimize filtered queries (add indexes)

**Technical Notes**:
- Use URL query params for filter state
- Add database indexes on frequently filtered columns
- Add Redis caching for autocomplete
- Reference Execution History filtering pattern

**Testing Requirements**:
- Unit tests for filter logic
- E2E test for all filter combinations
- Performance test with filters
- Test filter persistence

---

## Epic 11: Mobile & Accessibility (P3)

### Story 11.1: Mobile-Responsive Dashboard
**Priority**: P3 🟢
**Effort**: M (3-5 days)
**Dependencies**: None

**User Story**: As a mobile user, I need a responsive dashboard so that I can monitor the system on my phone.

**Acceptance Criteria**:
- [ ] Audit all pages for mobile responsiveness
- [ ] Fix layout issues on mobile (< 768px width):
  - Collapse sidebar to hamburger menu
  - Stack metric cards vertically
  - Make tables horizontally scrollable
  - Reduce chart sizes
  - Optimize button sizes for touch
- [ ] Add mobile-specific components:
  - Bottom navigation bar
  - Swipeable tabs
  - Pull-to-refresh
- [ ] Test on multiple devices (iOS/Android)
- [ ] Test on multiple browsers (Safari/Chrome)
- [ ] Add touch-friendly interactions
- [ ] Optimize font sizes for readability

**Technical Notes**:
- Use Tailwind responsive classes (sm:/md:/lg:)
- Test with Chrome DevTools device emulation
- Add viewport meta tag if missing
- Use rem units for font sizes

**Testing Requirements**:
- Visual regression tests for mobile
- E2E tests on mobile viewports
- Test touch interactions
- Test swipe gestures

---

### Story 11.2: Accessibility (WCAG 2.1 AA Compliance)
**Priority**: P3 🟢
**Effort**: L (1-2 weeks)
**Dependencies**: None

**User Story**: As a user with disabilities, I need an accessible interface so that I can use the platform effectively.

**Acceptance Criteria**:
- [ ] Add ARIA labels to all interactive elements
- [ ] Add keyboard navigation support:
  - Tab order logical
  - Focus indicators visible
  - Keyboard shortcuts documented
- [ ] Add screen reader support:
  - Semantic HTML (nav/main/section/article)
  - Alt text for images
  - ARIA live regions for dynamic content
- [ ] Add color contrast compliance:
  - Text contrast ratio ≥ 4.5:1
  - Link contrast ratio ≥ 4.5:1
  - Focus indicators ≥ 3:1
- [ ] Add skip links (Skip to main content)
- [ ] Add form validation with accessible error messages
- [ ] Test with screen readers (NVDA/JAWS/VoiceOver)
- [ ] Generate accessibility report (Lighthouse/axe)

**Technical Notes**:
- Use @radix-ui components (accessible by default)
- Add eslint-plugin-jsx-a11y
- Use @axe-core/react for testing
- Reference WCAG 2.1 guidelines

**Testing Requirements**:
- Automated accessibility tests (axe-core)
- Manual screen reader testing
- Keyboard navigation testing
- Color contrast verification

---

## Summary

### Effort Distribution

| Epic | P0 Stories | P1 Stories | P2 Stories | P3 Stories | Total Effort |
|------|-----------|-----------|-----------|-----------|--------------|
| Epic 0: Production Blockers | 2 (S+M) | - | - | - | ~1 week |
| Epic 1: User Management & RBAC | 2 (L+M) | - | - | - | ~2.5 weeks |
| Epic 2: Admin Tenant Operations | 3 (S+S+M) | - | - | - | ~2 weeks |
| Epic 3: Missing Streamlit Features | - | 6 (M+M+S+S+S+S) | - | - | ~3 weeks |
| Epic 4: Dashboard Enhancements | - | - | 3 (S+S+S) | - | ~1 week |
| Epic 5: Enhanced Monitoring | - | - | 3 (M+S+S) | - | ~2 weeks |
| Epic 6: System Operations | - | - | 3 (S+S+S) | - | ~1 week |
| Epic 7: Integration Enhancements | - | - | - | 3 (XS+S+S) | ~1 week |
| Epic 8: Developer Experience | - | - | - | 3 (M+S+S) | ~2 weeks |
| Epic 9: Performance | - | - | - | 2 (S+S) | ~1 week |
| Epic 10: Security & Compliance | - | - | - | 2 (M+S) | ~1.5 weeks |
| Epic 11: Mobile & Accessibility | - | - | - | 2 (M+L) | ~3 weeks |

**Total Stories**: 34
**Total Estimated Effort**: ~21 weeks (5.25 months with 1 developer)

### Priority Breakdown

- **P0 (Production Blockers)**: 7 stories, ~5.5 weeks
- **P1 (High Priority)**: 6 stories, ~3 weeks
- **P2 (Medium Priority)**: 9 stories, ~4 weeks
- **P3 (Low Priority)**: 12 stories, ~8.5 weeks

### Recommended Sprint Plan

**Sprint 1-2 (2 weeks)**: Epic 0 - Production Blockers
- Story 0.1: Dashboard Home Integration
- Story 0.2: Operations Page Verification

**Sprint 3-4 (2 weeks)**: Epic 1 - User Management (Part 1)
- Story 1.1: User Management Panel

**Sprint 5-6 (2 weeks)**: Epic 1 + Epic 2 (Part 1)
- Story 1.2: Role Management
- Story 2.1: Budget Override UI
- Story 2.2: LiteLLM Key Rotation UI

**Sprint 7-8 (2 weeks)**: Epic 2 + Epic 3 (Part 1)
- Story 2.3: Admin Tenant Panel
- Story 3.1: Agent Test Execution

**Sprint 9-10 (2 weeks)**: Epic 3 (Part 2)
- Story 3.2: Agent Memory Management
- Story 3.3: Worker Logs Viewer
- Story 3.4: Prompt Version History
- Story 3.5: Prompt Template Management
- Story 3.6: Prompt Testing

Then continue with P2 and P3 stories based on business priorities.

---

**End of Migration Story Backlog**
