# Streamlit Feature Catalog

Complete documentation of all Streamlit page features and their API endpoint dependencies.

**Generated:** 2025-11-21
**Purpose:** Compare against backend API catalog and Next.js implementation for migration validation

---

## 1_Dashboard.py

**Purpose:** Real-time system status monitoring and health dashboard
**Story Reference:** Story 6.2, Story 6.6

**API Endpoints Used:**
- None directly - uses local database queries via helper functions:
  - `admin.utils.db_helper.test_database_connection()`
  - `admin.utils.redis_helper.test_redis_connection()`
  - `admin.utils.metrics_helper.get_queue_depth()` → queries Redis
  - `admin.utils.metrics_helper.get_success_rate_24h()` → queries PostgreSQL
  - `admin.utils.metrics_helper.get_p95_latency()` → queries PostgreSQL
  - `admin.utils.metrics_helper.get_active_workers()` → queries Celery/Redis
  - `admin.utils.metrics_helper.get_recent_failures()` → queries PostgreSQL
  - `admin.utils.metrics_helper.fetch_queue_depth_timeseries()` → queries Prometheus
  - `admin.utils.metrics_helper.fetch_success_rate_timeseries()` → queries Prometheus
  - `admin.utils.metrics_helper.fetch_latency_timeseries()` → queries Prometheus

**Key Features:**
- System health status indicator (Healthy/Degraded/Down)
- Real-time metrics display (queue depth, success rate, P95 latency, active workers)
- Recent failures section with error details
- PostgreSQL and Redis connection status
- Auto-refresh (configurable: 10s, 30s, 60s, 120s)
- Performance trends charts (queue depth, success rate, latency percentiles)
- Time range selector (1h, 6h, 24h, 7d)

**Data Fields:**
- System status: calculated from DB/Redis connection + success rate + queue depth
- Queue depth: number of pending jobs in Redis queue
- Success rate: percentage of successful enhancements (24h)
- P95 latency: 95th percentile processing time (ms)
- Active workers: count of Celery workers
- Recent failures: last 10 failed enhancements with ticket_id, tenant_id, error message, timestamp

**User Actions:**
- Configure auto-refresh interval (dropdown)
- Pause/resume auto-refresh (checkbox)
- Manual refresh (button)
- Select time range for trends (dropdown: 1h/6h/24h/7d)

---

## 2_Tenants.py

**Purpose:** Full CRUD interface for tenant management
**Story Reference:** Story 6.3, Story 8.13 (BYOK)

**API Endpoints Used:**
- `GET /api/v1/plugins/` - Fetch available plugins for tenant assignment
- `GET /api/tenants/{tenant_id}/spend` - Fetch real-time LiteLLM spend data (via helper)
- Direct database operations via helpers:
  - `admin.utils.tenant_helper.get_all_tenants()`
  - `admin.utils.tenant_helper.get_tenant_by_id()`
  - `admin.utils.tenant_helper.create_tenant()`
  - `admin.utils.tenant_helper.update_tenant()`
  - `admin.utils.tenant_helper.soft_delete_tenant()`
  - `admin.utils.servicedesk_validator.validate_servicedesk_connection()` → external ServiceDesk API
  - `admin.utils.jira_validator.validate_jira_connection()` → external Jira API

**Key Features:**
- View all tenants in table format with search/filter
- Add new tenant with validation and connection testing
- Edit existing tenant (masked sensitive fields)
- Delete tenant with confirmation (soft delete)
- Display webhook URL after creation
- Budget configuration and dashboard
- BYOK (Bring Your Own Key) configuration sections
- Key rotation interface
- Revert to platform keys

**Data Fields:**
- Basic: name, tenant_id, tool_type, servicedesk_url, is_active, created_at, updated_at
- Credentials (encrypted): servicedesk_api_key_encrypted, webhook_signing_secret_encrypted, litellm_virtual_key
- Enhancement preferences: JSON object with feature toggles (ticket_history, documentation, ip_lookup, monitoring)
- Budget: max_budget, alert_threshold (%), grace_threshold (%), budget_duration (30d/60d/90d)
- Spend: current_spend, utilization_pct, models_breakdown, budget_reset_at

**User Actions:**
- Search tenants by name or ID
- Filter by status (Active/Inactive/All)
- Add new tenant (button → modal dialog)
- Test ServiceDesk/Jira connection before saving
- Edit tenant details (button → modal dialog)
- Delete tenant (button → confirmation dialog)
- Configure BYOK API keys
- Rotate API keys
- Revert to platform keys
- View budget dashboard with real-time spend
- Refresh spend data (button)

---

## 3_Plugin_Management.py

**Purpose:** Plugin registration, configuration, and connection testing
**Story Reference:** Story 7.8

**API Endpoints Used:**
- `GET /api/v1/plugins/` - Fetch all registered plugins
- `GET /api/v1/plugins/{plugin_id}` - Fetch plugin details with config schema
- `POST /api/v1/plugins/{plugin_id}/test` - Test plugin connection (placeholder)

**Key Features:**
- View all registered plugins in table format
- Filter plugins by status (Active/Inactive/Error/All)
- Search plugins by name or description
- Expandable configuration schema view
- Plugin connection testing interface (placeholder)
- Integration with tenant assignment

**Data Fields:**
- Plugin metadata: plugin_id, name, version, status, description, tool_type
- Config schema: schema_fields array with field_name, field_type, required, description
- LiteLLM params: model, api_key, api_base, rpm (if applicable)

**User Actions:**
- Filter by status (dropdown)
- Search plugins (text input)
- Refresh plugin list (button)
- Expand plugin details (expander)
- View configuration schema
- Test connection (placeholder - not fully implemented)

---

## 4_History.py

**Purpose:** Enhancement history viewer with filtering and export
**Story Reference:** Story 6.4

**API Endpoints Used:**
- None directly - uses local database queries via helpers:
  - `admin.utils.history_helper.get_all_tenant_ids()` → queries PostgreSQL
  - `admin.utils.history_helper.get_enhancement_history()` → queries PostgreSQL with pagination

**Key Features:**
- Filter by tenant, status, date range
- Search by ticket ID (case-insensitive partial match)
- Pagination (25/50/100/250 rows per page)
- Color-coded status badges (completed=green, failed=red, pending=blue)
- Expandable row details (context_gathered JSON, llm_output, error_message)
- CSV export with flattened JSON fields
- Performance optimized for 10K+ records (indexed queries, < 5s)

**Data Fields:**
- Enhancement record: ticket_id, tenant_id, status, processing_time_ms, created_at, completed_at
- Context data: context_gathered (JSON), llm_output (text), error_message (text)
- Derived: Duration (formatted ms), status badge (colored HTML)

**User Actions:**
- Select tenant filter (dropdown)
- Select status filter (dropdown: All/pending/completed/failed)
- Select date range (date inputs)
- Search by ticket ID (text input)
- Change page size (dropdown: 25/50/100/250)
- Navigate pages (Previous/Next buttons)
- Expand row details (expander per row)
- Export to CSV (button → generates CSV with all visible records)

---

## 5_Agent_Management.py

**Purpose:** Comprehensive AI agent CRUD interface with tool assignment
**Story Reference:** Story 8.4, Story 11.2.5 (MCP Tool Discovery)

**API Endpoints Used:**
- `GET /api/agents?status={status}&limit=100&tenant_id={tenant_id}` - Fetch agents with filters
- `GET /api/agents/{agent_id}` - Fetch agent details
- `POST /api/agents` - Create new agent
- `PUT /api/agents/{agent_id}` - Update agent
- `DELETE /api/agents/{agent_id}` - Delete agent (soft delete)
- `POST /api/agents/{agent_id}/activate` - Activate draft agent
- `GET /api/tenants?include_inactive=false` - Fetch tenants for dropdown (via helper)
- `GET /api/unified-tools?tenant_id={tenant_id}` - Fetch OpenAPI + MCP tools (Story 11.2.5)
- `GET /api/mcp-servers/health?tenant_id={tenant_id}` - Fetch MCP server health status

**Key Features:**
- View all agents in table with search/filter/pagination
- Create agents with multi-tab form (Basic Info, LLM Config, System Prompt, Triggers, Tools)
- Edit existing agents with form validation
- Delete agents with soft delete confirmation
- Manage agent status transitions (draft→active, active→suspended)
- Display webhook URLs with copy functionality
- Form validation with helpful error messages
- MCP Tool Discovery UI with tabs (All Tools, OpenAPI Tools, MCP Tools)
- Server health badges for MCP tools
- Tool assignment with checkboxes

**Data Fields:**
- Agent metadata: id, name, tenant_id, status, created_at, updated_at
- LLM config: model, temperature, max_tokens, stop_sequences
- System prompt: prompt_text, prompt_version_id
- Triggers: trigger_type, trigger_config (JSON)
- Tools: tool_ids (array of UUIDs), mcp_tool_assignments (array of objects)
- MCP tool assignment: server_id, tool_name, description, source_type="mcp"
- Unified tool: id, name, description, source_type (openapi/mcp), server_id (if MCP)

**User Actions:**
- Search agents by name (text input)
- Filter by status (dropdown: All/draft/active/suspended/inactive)
- Select tenant (dropdown - required)
- Refresh list (button)
- Create agent (button → multi-step modal dialog)
- View agent details (button → modal)
- Edit agent (button → modal dialog)
- Delete agent (button → confirmation dialog)
- Activate draft agent (button)
- Assign OpenAPI tools (checkboxes in "OpenAPI Tools" tab)
- Assign MCP tools (checkboxes in "MCP Tools" tab with server filter)
- View assigned tools summary (displays OpenAPI count + MCP count with health badges)

---

## 6_LLM_Providers.py

**Purpose:** LLM model management via LiteLLM proxy
**Story Reference:** Story 9.2

**API Endpoints Used:**
- LiteLLM API (via `services.litellm_provider_service.LiteLLMProviderService`):
  - `POST /model/new` - Add model to LiteLLM
  - `GET /v1/model/info` - List configured models
  - `DELETE /model/delete` - Remove model from LiteLLM

**Key Features:**
- View all configured LiteLLM models in table
- Add new model with provider configuration
- Delete model with confirmation
- No local database storage (LiteLLM is single source of truth)
- Support for multiple providers (OpenAI, Anthropic, Azure, Bedrock, Vertex AI, Cohere, Replicate)

**Data Fields:**
- Model config: model_name (LiteLLM ID), provider_type, model_identifier, api_key
- Optional: api_base, rpm_limit, tags, description
- LiteLLM params: model (format: "provider/model"), api_key, api_base, rpm
- Model info: max_tokens, tags, description

**User Actions:**
- Add model (button → modal dialog)
- Configure provider details (dropdown: OpenAI/Anthropic/Azure/etc.)
- Enter API key (password input)
- Set optional parameters (API base URL, rate limit, tags)
- Delete model (button → confirmation dialog)
- Refresh model list (button)
- Expand model details (expander per model)

---

## 7_Operations.py

**Purpose:** Manual system operations and audit logging
**Story Reference:** Story 6.5

**API Endpoints Used:**
- None directly - uses local Redis/Celery operations via helpers:
  - `admin.utils.operations_helper.is_processing_paused()` → checks Redis flag
  - `admin.utils.operations_helper.pause_processing()` → sets Redis flag with 24h TTL
  - `admin.utils.operations_helper.resume_processing()` → deletes Redis flag
  - `admin.utils.operations_helper.clear_celery_queue()` → purges Celery queue
  - `admin.utils.operations_helper.sync_tenant_configs()` → syncs PostgreSQL→Redis cache
  - `admin.utils.operations_helper.get_active_workers()` → queries Celery inspect()
  - `admin.utils.operations_helper.get_queue_length()` → queries Redis
  - `admin.utils.operations_helper.get_recent_operations()` → queries PostgreSQL audit log

**Key Features:**
- Pause/resume worker processing (Redis flag control)
- Clear Celery queue with confirmation
- Sync tenant configs from PostgreSQL to Redis cache
- Worker health display with stats (auto-refresh every 30s)
- Operation logs display (last 20 operations)
- Typed "YES" confirmation dialogs for all operations
- Audit logging for compliance

**Data Fields:**
- Worker stats: hostname, status, active_tasks, completed_tasks, uptime_seconds
- Queue: queue_depth (pending task count)
- Processing status: paused (boolean from Redis flag)
- Operation log: timestamp, user, operation, status, details (JSON)

**User Actions:**
- Pause processing (button → typed confirmation)
- Resume processing (button → typed confirmation)
- Clear queue (button → typed confirmation with task count)
- Sync tenant configs (button → typed confirmation)
- View worker health (auto-refresh fragment)
- Export operation logs (CSV download button)
- Refresh logs (button)

---

## 8_Workers.py

**Purpose:** Celery worker health and resource monitoring
**Story Reference:** Story 6.7

**API Endpoints Used:**
- None directly - uses local queries via helpers:
  - `admin.utils.worker_helper.fetch_celery_workers()` → Celery inspect()
  - `admin.utils.worker_helper.fetch_worker_resources()` → queries Prometheus metrics
  - `admin.utils.worker_helper.restart_worker_k8s()` → kubectl rollout restart (K8s API)
  - `admin.utils.worker_helper.fetch_worker_logs()` → kubectl logs (K8s API)
  - `admin.utils.worker_helper.fetch_worker_throughput_history()` → queries Prometheus

**Key Features:**
- Worker list with status indicators (active/idle/unresponsive)
- Resource metrics (CPU%, Memory%, throughput)
- Worker restart controls (rolling restart via K8s)
- Logs viewer with filtering (level, line count)
- Historical performance charts (7-day throughput)
- Auto-refresh every 30 seconds
- Filter by worker status

**Data Fields:**
- Worker: hostname, status, uptime_seconds, active_tasks, completed_tasks
- Resources: cpu_percent, memory_percent, throughput_tasks_per_min
- Logs: log lines with level (ERROR/WARNING/INFO/DEBUG)
- Historical: timestamp, throughput (tasks/min)

**User Actions:**
- Filter by status (multi-select: active/idle/unresponsive)
- Refresh now (button)
- Select worker for restart (dropdown)
- Restart worker (button → confirmation → K8s rollout restart)
- Select worker for logs (dropdown)
- Configure log filters (level dropdown, line count slider)
- Fetch logs (button → displays log output)
- Download logs (download button)
- View historical charts (tabs per worker)

---

## 9_System_Prompt_Editor.py

**Purpose:** Agent system prompt configuration and versioning
**Story Reference:** Story 8.5

**API Endpoints Used:**
- `GET /api/agents?status=active,draft&limit=100` - Load agents for selection
- `GET /api/agents/prompt-templates` - Fetch prompt templates
- `POST /api/agents/{agent_id}/prompt-versions` - Save new prompt version
- `GET /api/agents/{agent_id}/prompt-versions?limit=20&offset=0` - Fetch version history
- `POST /api/agents/{agent_id}/prompt-versions/revert` - Revert to previous version
- `POST /api/agents/prompt-templates` - Create custom template
- `DELETE /api/agents/prompt-templates/{template_id}` - Delete custom template
- `POST /api/llm/test` - Test prompt with LLM (via LiteLLM)
- Dynamic model discovery via `admin.utils.agent_helpers.fetch_available_models()`

**Key Features:**
- Rich text editor with syntax highlighting
- Prompt templates (built-in and custom)
- Variable substitution ({{tenant_name}}, {{tools}}, {{current_date}}, {{agent_name}})
- Prompt preview mode with real-time rendering
- Character count with warnings (8000+ chars, 12000 hard limit)
- Prompt version history with revert capability
- LLM test feature for prompt validation
- Custom template creation and management
- Model selection for testing

**Data Fields:**
- Prompt: prompt_text, description, version_id, created_at
- Template: id, name, description, template_text, is_builtin
- Agent context: id, name, status, llm_config.model, updated_at
- Test result: text (LLM response), tokens_used (input/output), execution_time

**User Actions:**
- Select agent (dropdown)
- Edit prompt text (text area with character counter)
- Load template (dropdown + button)
- Preview prompt (button → toggle preview panel)
- Save prompt (button → creates new version)
- Test prompt with LLM (button → calls /api/llm/test)
- Select test model (dropdown with dynamic model list)
- View version history (tab)
- Revert to version (button)
- Create custom template (form in tab)
- Delete custom template (button)

---

## 10_Add_Tool.py

**Purpose:** OpenAPI specification upload and MCP tool auto-generation
**Story Reference:** Story 8.8

**API Endpoints Used:**
- `POST /api/openapi-tools/parse` - Parse and validate OpenAPI spec
- `POST /api/openapi-tools/test-connection` - Test connection with auth config
- `POST /api/openapi-tools` - Save tool and generate MCP tools
- Database query via helper: `admin.utils.tenant_crud_helpers.get_all_tenants()`

**Key Features:**
- File upload for OpenAPI/Swagger specs (.yaml, .json, .yml)
- Automatic spec validation using openapi-pydantic
- Tool metadata extraction (name, description, base URL, auth schemes)
- Dynamic auth configuration form generation
- Test connection functionality
- FastMCP automatic tool generation
- Database persistence with encrypted credentials

**Data Fields:**
- Tool metadata: tool_name, spec_version, base_url, description, endpoint_count
- Auth schemes: type (apiKey/http/oauth2), location, param_name, scheme (basic/bearer), flows, scopes
- Auth config: depends on type (API key value, username/password, bearer token, OAuth client_id/secret/token_url)
- OpenAPI spec: full JSON/YAML spec object

**User Actions:**
- Select tenant (dropdown - required for multi-tenancy)
- Upload OpenAPI spec file (file uploader: .yaml/.json/.yml, max 5MB)
- Parse specification (button → validates and extracts metadata)
- View spec preview (expander with JSON display)
- Configure authentication (dynamic form based on detected schemes)
- Test connection (button → validates credentials)
- Save tool (button → generates MCP tools from spec)

---

## 07_LLM_Costs.py

**Purpose:** Real-time LLM cost tracking dashboard
**Story Reference:** Story 8.16

**API Endpoints Used:**
- None directly - uses local database queries via `src.services.llm_cost_service.LLMCostService`:
  - `get_cost_summary(tenant_id)` → queries llm_usage_logs table
  - `get_daily_spend_trend(days, tenant_id)` → queries with date grouping
  - `get_token_breakdown(start_date, end_date, tenant_id)` → groups by model
  - `get_budget_utilization(tenant_id)` → joins with tenants table
  - `get_spend_by_agent(start_date, end_date, tenant_id, limit)` → joins with agents table
  - `get_spend_by_model(start_date, end_date, tenant_id)` → groups by model
  - `get_detailed_logs(start_date, end_date, tenant_id)` → raw logs for CSV export

**Key Features:**
- Overview metrics (today, week, month, 30-day total)
- Top tenant and agent by spend
- Daily spend trend chart (30 days)
- Token usage breakdown pie chart
- Budget utilization progress bars
- Agent cost analysis table
- Model spend breakdown table
- CSV export with date range filtering
- Auto-refresh every 60 seconds

**Data Fields:**
- Cost summary: today_spend, week_spend, month_spend, total_spend_30d
- Top tenant: tenant_name, total_spend
- Top agent: agent_name, total_cost
- Daily trend: date, total_spend
- Token breakdown: model, input_tokens, output_tokens, total_cost
- Budget utilization: tenant_name, current_spend, max_budget, utilization_pct
- Agent stats: agent_name, execution_count, total_cost, avg_cost_per_execution
- Model spend: model, total_cost, request_count, avg_cost_per_request

**User Actions:**
- Select date range (date input: default last 30 days)
- Filter by tenant (dropdown: "All Tenants" or specific tenant)
- Refresh now (button → clears cache)
- Export CSV (button → generates CSV with detailed logs)

---

## 08_Agent_Performance.py

**Purpose:** Real-time agent performance monitoring dashboard
**Story Reference:** Story 8.17

**API Endpoints Used:**
- None directly - uses database queries via helper functions:
  - `admin.utils.performance_dashboard_helpers.fetch_agent_list()` → queries agents table
  - `admin.utils.performance_dashboard_helpers.fetch_metrics()` → queries agent_executions table
  - `admin.utils.performance_dashboard_helpers.fetch_trends()` → queries with date grouping
  - `admin.utils.performance_dashboard_helpers.fetch_error_analysis()` → groups by error type
  - `admin.utils.performance_dashboard_helpers.fetch_slowest_agents()` → queries with P95 calculation
  - `admin.utils.performance_dashboard_helpers.fetch_execution_history()` → queries agent_executions

**Key Features:**
- Agent selector with performance metrics
- Date range filtering
- Performance metrics cards (total executions, success rate, avg latency, P95 latency)
- Performance trends chart (multi-day)
- Error distribution pie chart
- Execution history table with pagination
- Slowest agents overview (tenant-wide)
- Auto-refresh every 60 seconds

**Data Fields:**
- Metrics: total_executions, success_count, failed_count, success_rate_pct, avg_latency_ms, p95_latency_ms
- Trends: date, avg_latency, success_rate
- Error analysis: error_type → count
- Execution record: id, agent_name, status, duration_seconds, tokens_used, cost_usd, created_at
- Slow agent metrics: agent_name, execution_count, p95_latency_seconds, success_rate_pct, recommendation

**User Actions:**
- Select agent (dropdown)
- Select date range (date input: default last 7 days)
- Select trend period (dropdown: 7/14/30 days)
- Refresh now (button)
- View execution details (expandable rows - not fully implemented)
- View all executions (button → navigates to full history page)

---

## 11_Execution_History.py

**Purpose:** Agent test execution history viewer with detail view
**Story Reference:** Story 10.2, Story 10.3

**API Endpoints Used:**
- `GET /api/agents/{agent_id}/executions/{execution_id}` - Fetch full execution details (via helper)
- Database queries via helpers:
  - `admin.utils.execution_history_helpers.get_agent_list()` → queries agents table
  - `admin.utils.execution_history_helpers.get_tenant_list()` → queries tenants table
  - `admin.utils.execution_history_helpers.get_execution_history()` → queries agent_executions with filters

**Key Features:**
- Filter by agent, tenant, status, date range
- Pagination (50 per page)
- Color-coded status badges
- Expandable row details with full LLM conversation
- Empty state handling
- Default sorting by created_at DESC
- Execution detail view with metadata, input, LLM conversation, errors

**Data Fields:**
- Execution record: id, agent_id, agent_name, tenant_id, status, duration_ms, created_at
- Execution detail: id, agent_id, agent_name, tenant_id, status, duration_seconds, created_at, input_data (JSON), output_data (JSON), conversation_history (array), error_message
- Conversation turn: role (system/user/assistant/tool), content, tool_calls, tool_call_results
- Metadata: tokens_used (input/output), cost_usd, model_used

**User Actions:**
- Select agent filter (dropdown)
- Select tenant filter (dropdown)
- Select status filter (dropdown: All/Completed/Failed)
- Select date range (date inputs: default last 30 days)
- Apply filters (button)
- Navigate pages (Previous/Next buttons)
- Expand execution details (expander per row)
- View LLM conversation (formatted messages with role indicators)
- View error details (if failed)

---

## 12_MCP_Servers.py

**Purpose:** MCP server management UI
**Story Reference:** Story 11.1.9, Story 11.2.1, Story 12.7

**API Endpoints Used:**
- Delegated to helper modules in `src.admin.utils.mcp_admin_ui`:
  - `render_server_list()` → queries MCP servers from database
  - `render_server_form()` → creates/updates MCP server configs
  - `render_server_details()` → fetches server details and health status
- Backend API endpoints (called via helpers):
  - `GET /api/mcp-servers?tenant_id={tenant_id}` - List servers
  - `POST /api/mcp-servers` - Create server
  - `PUT /api/mcp-servers/{server_id}` - Update server
  - `DELETE /api/mcp-servers/{server_id}` - Delete server
  - `GET /api/mcp-servers/{server_id}/health` - Test server connection

**Key Features:**
- Add stdio or HTTP+SSE servers
- Configure server connection params
- Environment variables management
- HTTP headers configuration (for SSE transport)
- Test connection functionality
- Server health monitoring
- Tool discovery from MCP servers
- Edit and delete servers

**Data Fields:**
- MCP server: id, name, tenant_id, transport_type (stdio/sse), command, args (stdio), url (HTTP+SSE), env_vars (key-value pairs), headers (key-value pairs for SSE), is_active, created_at, updated_at
- Health status: healthy (boolean), error_message, last_checked, available_tools_count
- Tools: tool_name, description, input_schema (JSON)

**User Actions:**
- View server list (table with actions)
- Add server (button → form view)
- Select transport type (dropdown: stdio/HTTP+SSE)
- Configure connection details (text inputs for command/args or URL)
- Add environment variables (dynamic key-value inputs)
- Add HTTP headers for SSE (dynamic key-value inputs)
- Test connection (button → validates and fetches tools)
- Save server (button)
- Edit server (button → form view with pre-filled data)
- Delete server (button → confirmation)
- View server details (button → detail view with health status)

---

## Summary Statistics

**Total Streamlit Pages:** 15
**Pages with Direct API Calls:** 7
**Pages with Database-Only Access:** 8
**Total Unique API Endpoints:** ~35
**Total Helper Modules Referenced:** ~25

### API Endpoint Categories:

1. **Agent Management** (5 endpoints):
   - GET /api/agents
   - GET /api/agents/{agent_id}
   - POST /api/agents
   - PUT /api/agents/{agent_id}
   - DELETE /api/agents/{agent_id}
   - POST /api/agents/{agent_id}/activate
   - GET /api/agents/{agent_id}/executions/{execution_id}

2. **Tenant Management** (2 endpoints):
   - GET /api/tenants
   - GET /api/tenants/{tenant_id}/spend

3. **Plugin Management** (3 endpoints):
   - GET /api/v1/plugins/
   - GET /api/v1/plugins/{plugin_id}
   - POST /api/v1/plugins/{plugin_id}/test

4. **Tool Management** (4 endpoints):
   - POST /api/openapi-tools/parse
   - POST /api/openapi-tools/test-connection
   - POST /api/openapi-tools
   - GET /api/unified-tools

5. **MCP Server Management** (5 endpoints):
   - GET /api/mcp-servers
   - POST /api/mcp-servers
   - PUT /api/mcp-servers/{server_id}
   - DELETE /api/mcp-servers/{server_id}
   - GET /api/mcp-servers/health
   - GET /api/mcp-servers/{server_id}/health

6. **Prompt Management** (7 endpoints):
   - GET /api/agents/prompt-templates
   - POST /api/agents/prompt-templates
   - DELETE /api/agents/prompt-templates/{template_id}
   - POST /api/agents/{agent_id}/prompt-versions
   - GET /api/agents/{agent_id}/prompt-versions
   - POST /api/agents/{agent_id}/prompt-versions/revert
   - POST /api/llm/test

7. **LiteLLM Integration** (3 endpoints):
   - POST /model/new (LiteLLM proxy)
   - GET /v1/model/info (LiteLLM proxy)
   - DELETE /model/delete (LiteLLM proxy)

### Database-Only Operations:
- Dashboard metrics (Redis + PostgreSQL + Prometheus)
- Enhancement history (PostgreSQL)
- Worker health (Celery inspect + Prometheus + K8s API)
- System operations (Redis + Celery + PostgreSQL audit log)
- LLM costs (PostgreSQL llm_usage_logs table)
- Agent performance (PostgreSQL agent_executions table)

### External Service Dependencies:
- **Redis:** Queue depth, pause flags, tenant config cache
- **PostgreSQL:** All persistent data (tenants, agents, executions, cost logs, audit logs)
- **Celery:** Worker inspection, queue management
- **Prometheus:** Time-series metrics (throughput, latency, queue depth trends)
- **Kubernetes API:** Worker restart, log retrieval
- **LiteLLM Proxy:** Model management, budget tracking, BYOK
- **ServiceDesk Plus API:** Connection validation
- **Jira API:** Connection validation

---

## Migration Considerations

### Critical Features for Next.js Migration:

1. **Real-time Updates:**
   - Dashboard auto-refresh (Fragment pattern)
   - Worker health monitoring (Fragment pattern)
   - Cost dashboard auto-refresh (Fragment pattern)
   - Performance dashboard auto-refresh (Fragment pattern)

2. **Complex Forms:**
   - Multi-step agent creation (tabs, dynamic tool selection)
   - Tenant BYOK configuration (multiple expandable sections)
   - OpenAPI tool upload with dynamic auth forms
   - MCP server configuration with dynamic env vars/headers

3. **Interactive Charts:**
   - Plotly charts for trends (daily spend, latency percentiles, token breakdown)
   - Performance trends multi-line charts
   - Error distribution pie charts

4. **Pagination & Filtering:**
   - Enhancement history (25/50/100/250 per page)
   - Execution history (50 per page)
   - Agent list with search/filter
   - Tenant list with search/filter

5. **Authentication & Authorization:**
   - Session state management
   - K8s ingress header-based auth
   - Tenant isolation (X-Tenant-ID header)
   - Admin-only operations (Operations page)

6. **File Operations:**
   - OpenAPI spec upload (5MB limit, .yaml/.json/.yml)
   - CSV export (cost reports, operation logs, execution history)
   - Log download (worker logs)

### API Gaps to Address:

1. **Missing REST endpoints for database-only operations:**
   - GET /api/metrics/dashboard (queue depth, success rate, P95 latency, active workers)
   - GET /api/metrics/trends (time-series for Prometheus metrics)
   - GET /api/enhancements/history (paginated enhancement history)
   - GET /api/operations/logs (audit log with pagination)
   - GET /api/workers/health (Celery worker stats)
   - GET /api/workers/{worker_id}/logs (worker log retrieval)
   - POST /api/operations/pause (pause processing)
   - POST /api/operations/resume (resume processing)
   - POST /api/operations/clear-queue (clear Celery queue)
   - POST /api/operations/sync-configs (sync tenant configs)

2. **LiteLLM proxy integration:**
   - All LiteLLM endpoints already exist (no gap)
   - Budget tracking endpoint `/api/tenants/{tenant_id}/spend` exists

3. **Tool discovery & assignment:**
   - GET /api/unified-tools (combines OpenAPI + MCP tools) - **EXISTS**
   - GET /api/mcp-servers/health (MCP server health checks) - **EXISTS**

---

**End of Streamlit Feature Catalog**
