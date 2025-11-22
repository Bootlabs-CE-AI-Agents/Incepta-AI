# Backend API Endpoint Catalog

**Generated:** 2025-01-21
**Purpose:** Comprehensive catalog of ALL backend API endpoints for NextJS integration

---

## Authentication & Authorization

### `/api/auth` - Authentication (auth.py)

- `POST /api/auth/register` - Register new user with email and password
- `POST /api/auth/token` - OAuth2 password flow login (returns access + refresh tokens)
- `POST /api/auth/refresh` - Refresh access token using refresh token
- `POST /api/auth/logout` - Logout user (revoke tokens)

### `/api/users` - User Management (users.py)

- `GET /api/users/me` - Get current user profile with roles
- `PUT /api/users/me/password` - Change password with validation

---

## Tenant Management

### `/api/v1/tenants` - Public Tenants (tenants.py)

- `GET /api/v1/tenants` - List all tenants accessible to authenticated user
- `GET /api/v1/tenants/{tenant_id}` - Get specific tenant by ID

### `/admin/tenants` - Admin Tenant Management (admin/tenants.py)

- `POST /admin/tenants` - Create new tenant configuration
- `GET /admin/tenants` - List all tenant configurations (paginated)
- `GET /admin/tenants/{tenant_id}` - Get specific tenant configuration
- `PUT /admin/tenants/{tenant_id}` - Update tenant configuration
- `DELETE /admin/tenants/{tenant_id}` - Soft delete tenant configuration
- `POST /admin/tenants/{tenant_id}/rotate-llm-key` - Rotate LiteLLM virtual key for tenant
- `POST /admin/tenants/{tenant_id}/budget-override` - Grant temporary budget override
- `DELETE /admin/tenants/{tenant_id}/budget-override` - Remove budget override

### `/api/tenants` - Tenant Spend (tenant_spend.py)

- `GET /api/tenants/{tenant_id}/spend` - Get real-time spend data from LiteLLM

---

## Agent Management

### `/api/v1/agents` - Agents CRUD (agents.py)

- `POST /api/v1/agents` - Create new agent
- `GET /api/v1/agents` - List agents (paginated, with filters)
- `GET /api/v1/agents/tool-usage-stats` - Get tool usage statistics
- `GET /api/v1/agents/{agent_id}` - Get agent by ID
- `PUT /api/v1/agents/{agent_id}` - Update agent
- `DELETE /api/v1/agents/{agent_id}` - Soft delete agent
- `POST /api/v1/agents/{agent_id}/activate` - Activate agent (DRAFT→ACTIVE)
- `GET /api/v1/agents/{agent_id}/webhook-secret` - Get unmasked webhook HMAC secret
- `POST /api/v1/agents/{agent_id}/regenerate-webhook-secret` - Regenerate webhook secret
- `GET /api/v1/agents/{agent_id}/error-analysis` - Get aggregated error analysis for agent

### `/api/agents` - Agent Performance (agent_performance.py)

- `GET /api/agents/{agent_id}/metrics` - Get per-agent performance metrics
- `GET /api/agents/{agent_id}/history` - Get paginated execution history with filtering
- `GET /api/agents/{agent_id}/trends` - Get performance trends for charting
- `GET /api/agents/{agent_id}/error-analysis` - Get error type breakdown
- `GET /api/agents/slowest` - Get slowest agents by P95 latency

### `/api/agents` - Agent Testing (agent_testing.py)

- `POST /api/agents/{agent_id}/test` - Execute agent test in sandbox mode
- `GET /api/agents/{agent_id}/test-history` - Get paginated test execution history
- `GET /api/agents/{agent_id}/test/{test_id}` - Get single test result
- `POST /api/agents/{agent_id}/test/compare` - Compare two test execution results

### `/api/agents` - Agent Memory (memory.py)

- `GET /api/agents/{agent_id}/memory/config` - Get agent memory configuration
- `PUT /api/agents/{agent_id}/memory/config` - Update agent memory configuration
- `GET /api/agents/{agent_id}/memory/state` - Get complete memory state
- `DELETE /api/agents/{agent_id}/memory` - Clear agent memory (with optional type filter)
- `GET /api/agents/{agent_id}/memory/history` - Get paginated memory history

---

## Agent Execution

### `/api/agent-execution` - Agent Execution (agent_execution.py)

- `POST /api/agent-execution/execute` - Execute agent with user message
- `GET /api/agent-execution/health` - Health check for agent execution service

### Execution Details (executions.py)

- `GET /{execution_id}` - Get execution details by ID (tenant-isolated)

---

## Prompts & Templates

### `/api/v1/prompts` - Prompt Management (prompts.py)

- `GET /api/v1/prompts` - List prompt templates
- `POST /api/v1/prompts` - Create custom prompt template
- `GET /api/v1/prompts/{template_id}` - Get prompt template by ID
- `PUT /api/v1/prompts/{template_id}` - Update custom prompt template
- `DELETE /api/v1/prompts/{template_id}` - Delete custom prompt template
- `POST /api/v1/prompts/test` - Test system prompt with LLM
- `GET /api/v1/prompts/{agent_id}/prompt-versions` - Get prompt version history
- `GET /api/v1/prompts/{agent_id}/prompt-versions/{version_id}` - Get prompt version detail
- `POST /api/v1/prompts/{agent_id}/prompt-versions/revert` - Revert to previous prompt version

---

## Tools & Integrations

### `/api/v1/plugins` - Plugin Management (plugins_routes.py)

- `GET /api/v1/plugins/` - List registered plugins
- `GET /api/v1/plugins/{plugin_id}` - Get plugin details and config schema
- `POST /api/v1/plugins/{plugin_id}/test` - Test plugin connection

### `/api/openapi-tools` - OpenAPI Tools (openapi_tools.py)

- `POST /api/openapi-tools/parse` - Parse and validate OpenAPI spec
- `POST /api/openapi-tools/test-connection` - Test API connection with credentials
- `POST /api/openapi-tools` - Create new OpenAPI tool
- `GET /api/openapi-tools` - List all tools for tenant
- `GET /api/openapi-tools/{tool_id}` - Get tool by ID

### `/api/v1` - Unified Tools (unified_tools.py)

- `GET /api/v1/unified-tools/` - List all available tools from all sources (OpenAPI + MCP)

### `/api/v1/mcp-servers` - MCP Server Management (mcp_servers.py)

- `POST /api/v1/mcp-servers/` - Create MCP server with auto discovery
- `GET /api/v1/mcp-servers/` - List MCP servers (paginated, with filters)
- `GET /api/v1/mcp-servers/{server_id}` - Get MCP server details
- `PATCH /api/v1/mcp-servers/{server_id}` - Update MCP server
- `DELETE /api/v1/mcp-servers/{server_id}` - Delete MCP server
- `POST /api/v1/mcp-servers/{server_id}/discover` - Force capability rediscovery
- `GET /api/v1/mcp-servers/{server_id}/health` - Health check (initialize only)
- `POST /api/v1/mcp-servers/{server_id}/health-check` - Manual health check
- `GET /api/v1/mcp-servers/{server_id}/metrics` - Get MCP server health metrics
- `POST /api/v1/mcp-servers/test-connection` - Test MCP server connection without saving

---

## Workers & Monitoring

### `/api/v1/workers` - Worker Management (workers.py)

- `GET /api/v1/workers` - List workers and their status
- `GET /api/v1/workers/{hostname}/logs` - Get worker logs
- `POST /api/v1/workers/{hostname}/restart` - Restart worker pod

### `/api/v1` - Health Checks (health.py)

- `GET /api/v1/health` - Health check endpoint for monitoring
- `GET /api/v1/ready` - Readiness check for Kubernetes
- `GET /api/v1/health/litellm` - LiteLLM proxy health check
- `GET /api/v1/tenants/{tenant_id}/validate-llm-key` - Validate tenant's LiteLLM virtual key

### `/api/v1/metrics` - Metrics (metrics.py)

- `GET /api/v1/metrics/agents` - Agent execution metrics for dashboard
- `GET /api/v1/metrics/queue` - Ticket processing queue metrics

---

## LLM & Cost Management

### `/api/llm-providers` - LLM Providers [DEPRECATED] (llm_providers.py)

**All endpoints return HTTP 410 Gone - use LiteLLM API directly**

- `POST /api/llm-providers` - Create provider (deprecated)
- `GET /api/llm-providers` - List providers (deprecated)
- `GET /api/llm-providers/{provider_id}` - Get provider (deprecated)
- `PUT /api/llm-providers/{provider_id}` - Update provider (deprecated)
- `DELETE /api/llm-providers/{provider_id}` - Delete provider (deprecated)
- `POST /api/llm-providers/{provider_id}/test-connection` - Test connection (deprecated)
- `GET /api/llm-providers/{provider_id}/models` - Get models (deprecated)
- `POST /api/llm-providers/{provider_id}/sync-models` - Sync models (deprecated)

### `/api/llm-models` - LLM Models (llm_models.py)

- `GET /api/llm-models/available` - Get available models from LiteLLM (ACTIVE)

**Deprecated endpoints (return HTTP 410 Gone):**

- `POST /api/llm-models` - Create model (deprecated)
- `GET /api/llm-models/{model_id}` - Get model (deprecated)
- `PUT /api/llm-models/{model_id}` - Update model (deprecated)
- `DELETE /api/llm-models/{model_id}` - Delete model (deprecated)
- `POST /api/llm-models/{model_id}/toggle` - Toggle model (deprecated)
- `POST /api/llm-models/bulk-enable` - Bulk enable (deprecated)
- `POST /api/llm-models/bulk-disable` - Bulk disable (deprecated)

### `/api/costs` - LLM Costs (llm_costs.py)

- `GET /api/costs/summary` - Get overall cost summary
- `GET /api/costs/by-tenant` - Get top N tenants by spend
- `GET /api/costs/by-agent` - Get top N agents by spend
- `GET /api/costs/by-model` - Get spend breakdown by model
- `GET /api/costs/token-breakdown` - Get token usage breakdown (input vs output)
- `GET /api/costs/trend` - Get daily spend trend time series
- `GET /api/costs/budget-utilization` - Get budget utilization for tenants

### `/api/v1` - Budget Alerts (budget.py)

- `POST /api/v1/budget-alerts` - Receive LiteLLM budget alert webhooks

---

## BYOK (Bring Your Own Key)

### `/api/tenants` - BYOK Management (byok.py)

- `POST /api/tenants/{tenant_id}/byok/test-keys` - Test provider API keys
- `POST /api/tenants/{tenant_id}/byok/enable` - Enable BYOK mode
- `PUT /api/tenants/{tenant_id}/byok/rotate-keys` - Rotate BYOK keys
- `POST /api/tenants/{tenant_id}/byok/disable` - Disable BYOK and revert to platform keys
- `GET /api/tenants/{tenant_id}/byok/status` - Get BYOK status

---

## Webhooks

### `/webhook` - Webhook Receivers (webhooks.py)

- `POST /webhook/servicedesk` - Receive ServiceDesk Plus webhook notification
- `POST /webhook/servicedesk/resolved-ticket` - Receive resolved ticket webhook
- `POST /webhook/agents/{agent_id}/webhook` - Agent webhook endpoint for external trigger

---

## Feedback

### `/api/v1/feedback` - Enhancement Feedback (feedback.py)

- `POST /api/v1/feedback/` - Submit enhancement feedback
- `GET /api/v1/feedback/` - Retrieve feedback records (with filters)
- `GET /api/v1/feedback/stats` - Get aggregated feedback statistics

---

## Fallback Chains [DEPRECATED]

### `/api/fallback-chains` - Fallback Chain Management (fallback_chains.py)

**All endpoints return HTTP 410 Gone - use LiteLLM's built-in fallback mechanisms**

- `POST /api/fallback-chains` - Create fallback chain (deprecated)
- `GET /api/fallback-chains` - List fallback chains (deprecated)
- `GET /api/fallback-chains/{chain_id}` - Get fallback chain (deprecated)
- `PUT /api/fallback-chains/{chain_id}` - Update fallback chain (deprecated)
- `DELETE /api/fallback-chains/{chain_id}` - Delete fallback chain (deprecated)
- `POST /api/fallback-chains/{chain_id}/toggle` - Toggle fallback chain (deprecated)
- `GET /api/fallback-chains/model/{model_id}` - Get fallback chains by model (deprecated)
- `GET /api/fallback-chains/metrics` - Get fallback metrics (deprecated)
- `POST /api/fallback-chains/test` - Test fallback chain (deprecated)

---

## Summary Statistics

**Total Active Endpoints:** ~120+
**Total Deprecated Endpoints:** ~25
**API Modules:** 28

### By Category:
- **Authentication & Users:** 6 endpoints
- **Tenant Management:** 12 endpoints
- **Agent Management:** 23 endpoints
- **Agent Execution:** 3 endpoints
- **Prompts:** 9 endpoints
- **Tools & Integrations:** 20 endpoints
- **Workers & Monitoring:** 7 endpoints
- **LLM & Costs:** 14 endpoints
- **BYOK:** 5 endpoints
- **Webhooks:** 3 endpoints
- **Feedback:** 3 endpoints
- **Deprecated (Providers/Models/Fallback):** 25 endpoints

---

## Authentication Patterns

### Header-Based Auth:
- `X-Tenant-ID` - Tenant isolation (most endpoints)
- `X-Admin-Key` - Admin authorization (admin endpoints)
- `Authorization: Bearer <token>` - User authentication (OAuth2)
- `X-Hub-Signature-256` - Webhook HMAC validation
- `X-ServiceDesk-Signature` - ServiceDesk webhook validation
- `X-Webhook-Signature` - Generic webhook validation

---

## Common Query Parameters

### Pagination:
- `skip` / `offset` - Pagination offset
- `limit` / `page_size` - Results per page

### Filtering:
- `status` - Filter by status
- `start_date` / `end_date` - Date range filters
- `q` - Search query

### Time Ranges:
- `days` - Number of days for trends
- `time_range` - Preset time ranges (24h, 7d, 30d)
- `period_hours` - Time period in hours

---

## Notes

1. **Tenant Isolation:** All endpoints enforce tenant isolation via `X-Tenant-ID` header or dependency injection
2. **Deprecated Endpoints:** Return HTTP 410 Gone with migration instructions
3. **Rate Limiting:** Applied to auth endpoints (10/min registration, 100/min login)
4. **CORS:** Configured for NextJS frontend access
5. **OpenAPI Docs:** Available at `/docs` (Swagger UI) and `/redoc` (ReDoc)
