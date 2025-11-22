# ADR 017: LiteLLM Proxy Integration Pattern

**Status:** Accepted
**Date:** 2025-01-22
**Deciders:** Ravi (Product Owner), Winston (Backend Architect)
**Technical Story:** Stories 8.1, 8.9, 8.10, 8.13 - LiteLLM Proxy Integration

---

## Context

The AI Agents Platform needs a unified LLM gateway to:
- Route all agent LLM calls through a single proxy for centralized tracking
- Implement per-tenant budget enforcement and cost tracking
- Support multiple LLM providers (OpenAI, Anthropic, Azure, etc.)
- Enable tenant "Bring Your Own Key" (BYOK) for cost control
- Provide retry logic, fallback chains, and error handling
- Simplify provider credential management

**Current Pain Points:**
1. **No Cost Visibility:** Direct provider API calls don't track per-tenant spend
2. **No Budget Enforcement:** Tenants can exceed budgets without automatic blocking
3. **Provider Complexity:** Each provider has different API formats and auth methods
4. **No Retry Logic:** Transient failures require manual retries in application code
5. **Credential Sprawl:** Each agent stores provider API keys separately

**Requirements:**
- **Per-Tenant Budget Tracking:** Track spend per tenant, enforce max_budget limits
- **Virtual Key Management:** Tenant-specific API keys for routing and tracking
- **BYOK Support:** Tenants bring their own OpenAI/Anthropic keys (no platform spend tracking)
- **Multi-Provider Support:** OpenAI, Anthropic, Azure OpenAI, custom providers
- **Budget Webhooks:** Real-time alerts at 80%, 100%, 110% budget thresholds
- **Grace Period Enforcement:** Block execution at 110% of max_budget (configurable)
- **Audit Logging:** All LLM calls logged for compliance and debugging

---

## Decision

We will use **LiteLLM Proxy** as the centralized LLM gateway with **virtual key management** for per-tenant cost tracking and budget enforcement.

**Architecture Pattern:**
```
┌─────────────────────────────────────────────────────────┐
│ AI Agents Platform (FastAPI Backend)                   │
│  ┌──────────────────────────────────────────┐           │
│  │ LLMService (src/services/llm_service.py) │           │
│  │  - Virtual key creation & rotation       │           │
│  │  - AsyncOpenAI client provisioning       │           │
│  │  - Budget check BEFORE provisioning      │           │
│  └──────────────────────────────────────────┘           │
│                      │                                   │
│                      ▼                                   │
│  ┌──────────────────────────────────────────┐           │
│  │ BudgetService (budget_service.py)        │           │
│  │  - Budget status queries (LiteLLM API)   │           │
│  │  - Grace threshold enforcement (110%)    │           │
│  │  - Budget webhooks handling (budget.py)  │           │
│  └──────────────────────────────────────────┘           │
│                      │                                   │
└──────────────────────┼───────────────────────────────────┘
                       │ /key/generate, /key/info
                       │ /user/info, /v1/chat/completions
                       ▼
┌─────────────────────────────────────────────────────────┐
│ LiteLLM Proxy (Docker Service)                          │
│  - Virtual key management (user_id=tenant_id)           │
│  - Budget enforcement (max_budget, webhooks)            │
│  - Multi-provider routing (OpenAI, Anthropic, Azure)    │
│  - Retry logic & fallback chains                        │
│  - PostgreSQL database for keys & spend logs            │
└─────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ LLM Providers (External APIs)                           │
│  - OpenAI (GPT-4, GPT-3.5)                              │
│  - Anthropic (Claude 3 Opus, Sonnet, Haiku)            │
│  - Azure OpenAI (Enterprise deployments)                │
└─────────────────────────────────────────────────────────┘
```

**Key Components:**
1. **LiteLLM Proxy** (http://litellm:4000) - Centralized LLM gateway
2. **LLMService** - Virtual key lifecycle management (create, rotate, validate)
3. **BudgetService** - Budget status queries and enforcement logic
4. **AsyncOpenAI Client** - Tenant-specific client pointing to LiteLLM proxy

---

## Rationale

### Why LiteLLM Proxy?

**1. Virtual Key Management (Per-Tenant Tracking):**
```python
# Create virtual key for tenant
response = await litellm_api.post("/key/generate", {
    "user_id": "acme-corp",  # LiteLLM tracks spend per user_id
    "key_alias": "acme-corp-key-abc123",
    "max_budget": 500.0,  # $500 budget
    "metadata": {"tenant_id": "acme-corp"}
})
# Returns: {"key": "sk-litellm-virtual-key-xyz"}
```
- Each tenant gets a unique virtual key (format: `sk-...`)
- All LLM calls via this key are tracked under `user_id=tenant_id`
- LiteLLM stores spend logs in PostgreSQL (`litellm_spendlogs` table)

**2. Budget Enforcement with Webhooks:**
```python
# LiteLLM sends webhooks at thresholds
POST /api/v1/budget/webhook
{
    "user_id": "acme-corp",
    "current_spend": 450.0,  # $450 spent
    "max_budget": 500.0,     # $500 limit
    "utilization_pct": 90,   # 90% threshold hit
    "event_type": "budget_crossed",
    "threshold": "90%"
}
```
- **Webhooks at:** 80% (alert), 100% (warning), 110% (grace threshold)
- **Platform Response:** At 110%, block execution with `BudgetExceededError`
- **Async Notifications:** Email + Slack alerts for budget events

**3. Multi-Provider Routing:**
```python
# LiteLLM routes based on model prefix
await client.chat.completions.create(
    model="gpt-4",  # Routes to OpenAI
    # model="claude-3-opus-20240229",  # Routes to Anthropic
    # model="azure/gpt-4-deployment",  # Routes to Azure OpenAI
    messages=[{"role": "user", "content": "Hello"}]
)
```
- **Automatic Routing:** `gpt-4` → OpenAI, `claude-*` → Anthropic
- **Fallback Chains:** If OpenAI fails, retry with Anthropic equivalent
- **Provider Abstraction:** Application code doesn't know which provider is used

**4. BYOK (Bring Your Own Key) Support:**
```python
# Tenant provides their own OpenAI/Anthropic keys
response = await litellm_api.post("/key/generate", {
    "user_id": "acme-corp",
    "max_budget": null,  # No platform budget tracking for BYOK
    "metadata": {
        "byok_enabled": True,
        "openai_api_key": "os.environ/OPENAI_KEY_acme-corp",  # Tenant's key
        "anthropic_api_key": "os.environ/ANTHROPIC_KEY_acme-corp"
    }
})
```
- **BYOK tenants:** Use their own provider keys (stored encrypted in database)
- **Platform tenants:** Use platform provider keys (pooled across tenants)
- **Cost Tracking:** BYOK spend not tracked by platform (tenant billed directly by provider)

**5. Retry Logic & Error Handling:**
```python
# LiteLLM handles retries automatically
# Application code just calls LiteLLM proxy
try:
    response = await client.chat.completions.create(...)
except Exception as e:
    # LiteLLM already retried 3 times with exponential backoff
    logger.error(f"LLM call failed after retries: {e}")
```
- **Automatic Retries:** 3 attempts with exponential backoff (2s, 4s, 8s)
- **Timeout Handling:** Configurable timeouts (connect: 5s, read: 30s)
- **HTTP Error Codes:** 5xx → retry, 4xx → fail immediately

**6. Centralized Credential Management:**
```yaml
# LiteLLM config (litellm-config.yaml)
model_list:
  - model_name: gpt-4
    litellm_params:
      model: gpt-4
      api_key: os.environ/OPENAI_API_KEY  # Platform key
  - model_name: claude-3-opus-20240229
    litellm_params:
      model: claude-3-opus-20240229
      api_key: os.environ/ANTHROPIC_API_KEY  # Platform key
```
- **Environment Variables:** Provider keys stored as env vars, not in code
- **Dynamic Reloading:** Config updates via `/model/new` API endpoint
- **Audit Trail:** All credential updates logged in audit_logs table

### Why Not Direct Provider API Calls?

**Alternative: Each agent calls OpenAI/Anthropic directly**

**Cons:**
- **No Cost Tracking:** Cannot track spend per tenant (all calls mixed)
- **No Budget Enforcement:** Cannot block execution when budget exceeded
- **No Retry Logic:** Must implement retry + exponential backoff per agent
- **Credential Sprawl:** Each agent stores provider API keys
- **No Fallback:** If OpenAI down, agents fail (no automatic fallback to Anthropic)

**Verdict:** Direct calls lack critical production features (cost tracking, budgets, retries).

### Why Not AWS Bedrock?

**Alternative: Use AWS Bedrock as LLM gateway**

**Pros:**
- **Enterprise-Grade:** AWS-managed infrastructure, high availability
- **Multi-Provider:** Claude, GPT-4, Llama, Mistral, etc.
- **Cost Tracking:** AWS Cost Explorer for spend tracking

**Cons:**
- **No Per-Tenant Budgets:** AWS budgets are per AWS account, not per user_id
- **Complex Setup:** Requires AWS account, IAM roles, VPC config
- **Vendor Lock-In:** Tied to AWS ecosystem
- **Higher Cost:** AWS markup on provider API calls (~20-30%)

**Verdict:** AWS Bedrock is overkill for internal tool, LiteLLM simpler and cheaper.

---

## Alternatives Considered

### Alternative 1: Direct Provider API Calls
```python
# Each agent calls OpenAI directly
import openai
client = openai.AsyncOpenAI(api_key="sk-...")
response = await client.chat.completions.create(...)
```
- **Pros:** Simple, no proxy overhead
- **Cons:** No cost tracking, no budget enforcement, no retry logic, credential sprawl
- **Rejected because:** Lacks critical production features

### Alternative 2: AWS Bedrock
```python
# Use AWS Bedrock as LLM gateway
import boto3
client = boto3.client("bedrock-runtime")
response = client.invoke_model(...)
```
- **Pros:** AWS-managed, enterprise-grade
- **Cons:** No per-tenant budgets, complex setup, vendor lock-in, higher cost
- **Rejected because:** Overkill for internal tool, LiteLLM simpler

### Alternative 3: Custom Proxy (Build Our Own)
```python
# Build custom LLM proxy with FastAPI
@app.post("/llm/chat")
async def llm_chat(request: ChatRequest):
    # Route to provider, track spend, enforce budget
    pass
```
- **Pros:** Full control, custom features
- **Cons:** **Months of development**, must implement retries, fallbacks, budget tracking, monitoring
- **Rejected because:** Reinventing the wheel, LiteLLM already solves this

### Alternative 4: No Budget Enforcement
```python
# Track spend in database, but don't block execution
current_spend = db.query(TenantSpend).filter_by(tenant_id=tenant_id).first()
if current_spend > max_budget:
    logger.warning(f"Tenant {tenant_id} exceeded budget")  # Just warn
# Continue execution anyway
```
- **Pros:** Simple, no blocking logic
- **Cons:** **Tenants can exceed budgets indefinitely**, no cost control
- **Rejected because:** Unacceptable for production system

---

## Consequences

### Positive

1. **Per-Tenant Cost Visibility:**
   - Real-time spend tracking per tenant via `GET /key/info`
   - Per-model spend breakdown (GPT-4 vs Claude)
   - Historical spend data for billing reconciliation

2. **Budget Enforcement:**
   - Automatic blocking at 110% grace threshold
   - Prevents runaway costs from infinite agent loops
   - Async notifications (email + Slack) at 80%, 100% thresholds

3. **BYOK Support:**
   - Tenants use their own provider keys (no platform cost tracking)
   - Encrypted storage of tenant keys in database
   - Key rotation API for security compliance

4. **Multi-Provider Support:**
   - Single client interface for all providers
   - Automatic fallback if primary provider fails
   - Easy to add new providers (Cohere, Mistral, etc.)

5. **Simplified Error Handling:**
   - LiteLLM handles retries automatically (3 attempts, exponential backoff)
   - HTTP error code mapping (5xx → retry, 4xx → fail)
   - Timeout handling with granular config (connect, read, write, pool)

6. **Centralized Logging:**
   - All LLM calls logged to PostgreSQL (`litellm_spendlogs`)
   - Audit trail for compliance (GDPR, SOC2)
   - Debug with `/key/info` to see recent calls

### Negative

1. **Proxy Latency:**
   - Adds ~50-100ms latency per request (LiteLLM proxy overhead)
   - **Impact:** Acceptable for batch processing, noticeable for real-time chat
   - **Mitigation:** LiteLLM proxy runs in Docker on same network (minimal latency)

2. **Single Point of Failure:**
   - If LiteLLM proxy down, all LLM calls fail
   - **Impact:** No LLM functionality until proxy restored
   - **Mitigation:**
     - Docker health checks + auto-restart (`restart: unless-stopped`)
     - Budget check failsafe (if LiteLLM API down, allow execution with warning)
     - Future: Multi-instance LiteLLM with load balancer

3. **PostgreSQL Dependency:**
   - LiteLLM requires PostgreSQL for key storage and spend logs
   - **Impact:** Additional infrastructure dependency
   - **Mitigation:** Existing PostgreSQL database used (shared with application)

4. **Virtual Key Management Complexity:**
   - Must create virtual key per tenant (lifecycle: create, rotate, invalidate)
   - **Impact:** Additional database columns (`litellm_virtual_key`, `byok_virtual_key`)
   - **Mitigation:** LLMService encapsulates all virtual key logic

5. **Budget Webhook Reliability:**
   - Webhooks may be delayed or lost (network issues)
   - **Impact:** Budget alerts delayed, potential overspend
   - **Mitigation:** Budget check BEFORE provisioning client (AC#4 Story 8.10)

---

## Implementation Notes

### LiteLLM Proxy Setup (Docker Compose)

**docker-compose.yml:**
```yaml
services:
  litellm:
    image: ghcr.io/berriai/litellm:main-stable
    container_name: litellm
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: postgresql+asyncpg://litellm:password@postgres:5432/litellm
      LITELLM_MASTER_KEY: ${AI_AGENTS_LITELLM_MASTER_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    volumes:
      - ./litellm-config.yaml:/app/litellm-config.yaml
    command: ["--config", "/app/litellm-config.yaml", "--port", "4000"]
    depends_on:
      - postgres
    restart: unless-stopped
```

### Virtual Key Creation (LLMService)

**src/services/llm_service.py:**
```python
class LLMService:
    async def create_virtual_key_for_tenant(
        self, tenant_id: str, max_budget: float = 100.0
    ) -> str:
        """Create LiteLLM virtual key for tenant with budget constraint."""
        response = await self._call_litellm_api(
            method="POST",
            endpoint="/key/generate",
            json_data={
                "user_id": tenant_id,  # LiteLLM tracks spend per user_id
                "key_alias": f"{tenant_id}-key-{uuid4()}",
                "max_budget": max_budget,  # $100 default
                "metadata": {
                    "tenant_id": tenant_id,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "purpose": "agent-orchestration"
                }
            }
        )
        virtual_key = response.get("key")  # "sk-litellm-..."
        return virtual_key  # Caller must encrypt before storing
```

### Budget Enforcement (BudgetService)

**src/services/budget_service.py:**
```python
class BudgetService:
    async def check_budget_exceeded(self, tenant_id: str) -> Tuple[bool, str]:
        """Check if tenant budget exceeded grace threshold (110%)."""
        tenant = await self.get_tenant_config(tenant_id)
        if not tenant.max_budget or tenant.max_budget == 0:
            return False, ""  # No budget configured

        # Query LiteLLM for current spend
        spend_data = await self.get_tenant_spend_from_litellm(tenant_id)
        grace_threshold_pct = 110  # Configurable (default: 110%)
        grace_threshold = tenant.max_budget * (grace_threshold_pct / 100)

        if spend_data.current_spend >= grace_threshold:
            return True, (
                f"Budget exceeded: ${spend_data.current_spend:.2f} / "
                f"${tenant.max_budget:.2f} (grace: {grace_threshold_pct}%)"
            )
        return False, ""
```

### AsyncOpenAI Client Provisioning

**src/services/llm_service.py:**
```python
async def get_llm_client_for_tenant(self, tenant_id: str) -> AsyncOpenAI:
    """Get AsyncOpenAI client with tenant's virtual key (AC#5)."""
    # CRITICAL: Budget check BEFORE provisioning client
    budget_service = BudgetService(self.db, self.litellm_proxy_url, self.master_key)
    exceeded, error_msg = await budget_service.check_budget_exceeded(tenant_id)
    if exceeded:
        raise BudgetExceededError(error_msg)

    # Fetch encrypted virtual key from database
    tenant = await self.get_tenant_config(tenant_id)
    if tenant.byok_enabled:
        virtual_key = decrypt(tenant.byok_virtual_key)  # BYOK key
    else:
        virtual_key = decrypt(tenant.litellm_virtual_key)  # Platform key

    # Return client pointing to LiteLLM proxy
    return AsyncOpenAI(
        base_url=f"{self.litellm_proxy_url}/v1",  # http://litellm:4000/v1
        api_key=virtual_key,  # sk-litellm-...
        timeout=30.0
    )
```

### Budget Webhook Handler

**src/api/budget.py:**
```python
@router.post("/budget/webhook")
async def litellm_budget_webhook(request: Request, db: AsyncSession = Depends(get_async_session)):
    """Handle LiteLLM budget webhook (Story 8.10)."""
    # Verify HMAC signature
    webhook_secret = settings.litellm_webhook_secret
    signature = request.headers.get("X-LiteLLM-Signature")
    body = await request.body()
    expected_sig = hmac.new(webhook_secret.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected_sig):
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Parse webhook payload
    payload = await request.json()
    tenant_id = payload.get("user_id")
    current_spend = payload.get("current_spend")
    max_budget = payload.get("max_budget")
    threshold = payload.get("threshold")  # "80%", "100%", "110%"

    # Send notification (email + Slack)
    if threshold == "80%":
        await send_budget_alert(tenant_id, current_spend, max_budget, level="warning")
    elif threshold == "100%":
        await send_budget_alert(tenant_id, current_spend, max_budget, level="critical")
    elif threshold == "110%":
        # Grace threshold - execution will be blocked by check_budget_exceeded()
        await send_budget_alert(tenant_id, current_spend, max_budget, level="blocked")

    return {"status": "processed"}
```

### BYOK Virtual Key Creation

**src/services/llm_service.py:**
```python
async def create_byok_virtual_key(
    self, tenant_id: str, openai_key: str, anthropic_key: str
) -> str:
    """Create BYOK virtual key with tenant's provider keys."""
    response = await self._call_litellm_api(
        method="POST",
        endpoint="/key/generate",
        json_data={
            "user_id": tenant_id,
            "max_budget": None,  # No platform budget tracking for BYOK
            "metadata": {
                "byok_enabled": True,
                "openai_api_key": f"os.environ/OPENAI_KEY_{tenant_id}",
                "anthropic_api_key": f"os.environ/ANTHROPIC_KEY_{tenant_id}"
            }
        }
    )
    return response.get("key")
```

### Database Schema Updates

**alembic/versions/add_litellm_virtual_key_columns.py:**
```python
def upgrade():
    op.add_column(
        "tenant_configs",
        sa.Column("litellm_virtual_key", sa.Text(), nullable=True, comment="Encrypted LiteLLM virtual key for platform keys")
    )
    op.add_column(
        "tenant_configs",
        sa.Column("litellm_key_created_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "tenant_configs",
        sa.Column("byok_virtual_key", sa.Text(), nullable=True, comment="Encrypted LiteLLM virtual key for BYOK")
    )
```

### Configuration (Environment Variables)

**.env:**
```bash
# LiteLLM Proxy Configuration
AI_AGENTS_LITELLM_PROXY_URL=http://litellm:4000
AI_AGENTS_LITELLM_MASTER_KEY=sk-master-key-min-32-chars-required
AI_AGENTS_LITELLM_WEBHOOK_SECRET=webhook-secret-min-32-chars-required

# Provider API Keys (Platform-wide, used by LiteLLM)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

---

## References

- [LiteLLM Documentation](https://docs.litellm.ai/docs/)
- [LiteLLM Proxy Setup](https://docs.litellm.ai/docs/proxy/quick_start)
- [LiteLLM Virtual Keys](https://docs.litellm.ai/docs/proxy/virtual_keys)
- [LiteLLM Budget API](https://docs.litellm.ai/docs/proxy/users#budget-api)
- [Context7 MCP: LiteLLM Repository](https://github.com/berriai/litellm)
- [OpenAI Python SDK](https://github.com/openai/openai-python)

---

## Related Decisions

- **Story 8.1:** LiteLLM proxy integration as Docker service
- **Story 8.9:** Virtual key management for cost tracking
- **Story 8.10:** Budget enforcement with grace period
- **Story 8.13:** BYOK (Bring Your Own Key) support

---

**Decision Made By:** Ravi (Product Owner), Winston (Backend Architect)
**Reviewed By:** Architecture Team
**Supersedes:** None
**Superseded By:** None
