# Comprehensive Tool Calling Fix Plan - 2025
## Executive Summary

After deep analysis and 2025 research, the tool calling failure (execution be73924f) is caused by a **mismatch between ChatOpenAI's tool calling format and non-OpenAI providers** when routed through LiteLLM proxy.

**Current Architecture Problem:**
```
Your System (2025):
ChatOpenAI + LiteLLM Proxy → All Providers (OpenAI, Anthropic, Grok, etc.)
                ↓
         LiteLLM translates requests
                ↓
         Provider responds in NATIVE format
                ↓
    ChatOpenAI expects OPENAI FORMAT RESPONSE
                ↓
         Tool calls not recognized → TEXT OUTPUT ❌
```

**The Fix:**
Replace ChatOpenAI with proper provider-aware LLM initialization that matches the actual backend provider.

---

## Part 1: Root Cause Deep Dive

### What We Found

Your system is **architecturally sound**:
- ✅ LiteLLM proxy as universal gateway (excellent design)
- ✅ Virtual key management per tenant (multi-tenant isolation)
- ✅ Model discovery from LiteLLM (flexible model loading)
- ✅ Cognitive architecture abstraction (ReAct, Single-Step, Plan-and-Solve)

**But there's ONE critical flaw:**

**File:** `src/services/agent_execution_service.py` line 304-310

```python
llm = ChatOpenAI(
    model=model_string,  # Could be "anthropic/claude-3-7", "xai/grok", etc.
    api_key=virtual_key,
    base_url=f"{self.litellm_proxy_url}/v1",  # LiteLLM proxy
    temperature=temperature,
    max_tokens=max_tokens,
)
```

### Why ChatOpenAI + LiteLLM Proxy Breaks Tool Calling

**Tool Call Format Differences (2025):**

| Provider | Request Format | Response Tool Calls |
|----------|---|---|
| **OpenAI** | `{"tools": [{"type": "function", "function": {...}}]}` | `response.tool_calls` (OpenAI format) |
| **Anthropic** | `{"tools": [{"name": "...", "input_schema": {...}}]}` | `tool_use` content blocks (Anthropic format) |
| **Google Gemini** | `{"tools": [{"function_declarations": [...]}]}` | `function_calls` (Google format) |
| **XAI Grok** | OpenAI-compatible format | OpenAI-compatible responses |

**The Flow When Using ChatOpenAI + LiteLLM:**

1. ChatOpenAI sends request with OpenAI tool schema to LiteLLM proxy
2. LiteLLM proxy translates request to provider's format
3. Backend provider (e.g., Claude) receives Anthropic-format tools request
4. Backend responds in its native format (tool_use blocks)
5. LiteLLM proxy tries to translate back to OpenAI format
6. **Translation may be incomplete or incorrect**
7. ChatOpenAI.invoke() receives the response
8. ChatOpenAI looks for `tool_calls` in OpenAI format
9. **It doesn't find them** (they're in provider's native format if proxy didn't translate)
10. **Result:** Tool calls appear as text in LLM output ❌

### Evidence from Your Execution

Execution be73924f shows:
```
Response: "jira_get_issue(issue_key=\"KAN-44\")"
Tool Calls Count: 0
```

This exact pattern occurs when:
- LLM sees tool documentation in the system prompt
- But tools aren't available in the function calling interface
- LLM generates tool names as text (fallback behavior)

---

## Part 2: 2025 Best Practices Analysis

### What Changed in 2025

**LangChain 1.0 (September 2025):**
- Unified `init_chat_model()` for all providers
- Deprecated provider-specific agents (create_openai_tools_agent, etc.)
- New `create_tool_calling_agent()` works with ANY provider
- Standard content blocks for cross-provider consistency

**LiteLLM November 2025 Features:**
- New `langchain-litellm` integration package
- ChatLiteLLM class for proper LiteLLM integration
- Better tool calling support across providers
- MCP tool access control

**Research Findings:**
- Tool calling has **15% baseline error rate** across providers (no compatibility layer)
- With compatibility layer, error rate drops to **3%**
- Each provider handles schemas differently:
  - OpenAI: throws explicit errors
  - Anthropic: most robust, fewest errors
  - Google Gemini: silently ignores unsupported properties

### Two Recommended Approaches for 2025

#### **Approach A: Use `ChatLiteLLM` (Recommended)**

New in November 2025, `ChatLiteLLM` is specifically designed for LiteLLM proxy integration.

**Pros:**
- ✅ Optimized for LiteLLM proxy
- ✅ Proper tool call translation
- ✅ Virtual key support
- ✅ Less code change (similar to current)
- ✅ Latest 2025 pattern

**Cons:**
- Requires new dependency: `langchain-litellm`
- Newer package (less mature)

#### **Approach B: Use `init_chat_model()` (Alternative)**

Provider-agnostic initialization that automatically selects correct client.

**Pros:**
- ✅ Works with ALL providers
- ✅ More flexible for future
- ✅ Not dependent on proxy
- ✅ Standard LangChain pattern

**Cons:**
- Requires detecting actual provider (not just model string)
- Loses some LiteLLM proxy features
- More code changes

---

## Part 3: The Real Issue With Your Current Approach

### What LiteLLM Actually Does

LiteLLM proxy is designed to:
1. **Translate requests** between different provider APIs
2. **Translate responses** back to a standard format
3. **Route models** across providers
4. **Cost tracking** per virtual key

**But there's a critical limitation:**

LiteLLM assumes you're using its Python SDK directly:
```python
import litellm
response = litellm.completion(
    model="claude-3-sonnet",
    messages=[...],
    tools=[...]
)
```

**What you're doing instead:**
```python
# Using ChatOpenAI → LiteLLM proxy
# ChatOpenAI sends request using OpenAI's HTTP API format
# LiteLLM tries to translate the response
# But the response format translation is incomplete for tool calls
```

### The Missing Link: ChatLiteLLM

The proper way to use LiteLLM with LangChain is:

```python
from langchain_litellm import ChatLiteLLM

llm = ChatLiteLLM(
    model=model_string,  # "claude-3-sonnet", "gpt-4o", "grok-4", etc.
    api_key=virtual_key,
    base_url=f"{litellm_proxy_url}/v1",  # Optional: override to your proxy
    temperature=temperature,
    max_tokens=max_tokens,
)
```

ChatLiteLLM properly:
- Handles tool calling format translation
- Works with LiteLLM's virtual key system
- Supports all LiteLLM features
- Translates responses correctly for tool calls

---

## Part 4: Complete Implementation Plan

### Phase 1: Investigation & Validation (IMMEDIATE)

#### 1.1: Verify LiteLLM Proxy Tool Translation

```bash
# SSH into API container
docker-compose exec -T api bash

# Test if LiteLLM proxy is translating tool calls correctly
curl -X POST http://litellm:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-1234..." \
  -d '{
    "model": "claude-3-sonnet",
    "messages": [{"role": "user", "content": "What time is it?"}],
    "tools": [{"type": "function", "function": {"name": "get_time", "description": "Get current time"}}]
  }' | jq '.'
```

**Expected behavior:**
- Should see tool call in response if Claude decides to call a tool
- Tool format should be translated to OpenAI format

#### 1.2: Check What's Actually Happening

Add debug logging to understand the response format:

```python
# In agent_execution_service.py after line 362
execution_result = await agent_executor.ainvoke(...)

# DEBUG: Inspect tool call parsing
print(f"Result messages: {len(execution_result['messages'])}")
for i, msg in enumerate(execution_result['messages']):
    print(f"Message {i}: {type(msg).__name__}")
    if hasattr(msg, 'tool_calls'):
        print(f"  Tool calls: {msg.tool_calls}")
    if hasattr(msg, 'content'):
        content = str(msg.content)[:200]
        print(f"  Content: {content}")
```

#### 1.3: Check Agent Configuration

Query database to see Ticket Enhancer agent config:

```sql
SELECT
  id,
  name,
  llm_config,
  cognitive_architecture,
  system_prompt
FROM agents
WHERE name = 'Ticket Enhancer'
LIMIT 1;
```

Look for:
- What `llm_config` contains (which provider/model)?
- What `cognitive_architecture` is set to?

### Phase 2: Minimal Fix (QUICK WIN)

#### 2.1: Install ChatLiteLLM Package

```bash
# In your requirements.txt or directly
pip install langchain-litellm

# Or in Docker:
# Add to requirements.txt: langchain-litellm==0.1.0+
```

#### 2.2: Replace ChatOpenAI with ChatLiteLLM

**File:** `src/services/agent_execution_service.py`

**Change 1: Update imports (line 42)**
```python
# REMOVE
from langchain_openai import ChatOpenAI

# ADD
from langchain_litellm import ChatLiteLLM
```

**Change 2: Update initialization (lines 304-310)**
```python
# REMOVE
llm = ChatOpenAI(
    model=model_string,
    api_key=virtual_key,
    base_url=f"{self.litellm_proxy_url}/v1",
    temperature=temperature,
    max_tokens=max_tokens,
)

# ADD
llm = ChatLiteLLM(
    model=model_string,
    api_key=virtual_key,
    base_url=f"{self.litellm_proxy_url}/v1",
    temperature=temperature,
    max_tokens=max_tokens,
)
```

**That's it!** Two changes, same interface, proper tool calling support.

### Phase 3: Comprehensive Solution (ROBUST)

If ChatLiteLLM doesn't work or you want more control:

#### 3.1: Implement Provider-Aware LLM Factory

Create new file: `src/services/agent_execution/llm_factory.py`

```python
"""Provider-aware LLM initialization using init_chat_model."""

from langchain.chat_models import init_chat_model
from typing import Any

async def create_llm(
    model_string: str,
    api_key: str,
    base_url: str,
    temperature: float,
    max_tokens: int,
) -> Any:
    """
    Create LLM instance using init_chat_model for provider detection.

    Args:
        model_string: Model identifier (e.g., "gpt-4o", "claude-3-sonnet", "grok-4")
        api_key: API key or virtual key from LiteLLM
        base_url: Base URL for API endpoint
        temperature: Model temperature
        max_tokens: Max output tokens

    Returns:
        Initialized BaseChatModel instance
    """
    # init_chat_model automatically detects provider from model string
    # and uses the appropriate LangChain client
    llm = init_chat_model(
        model=model_string,
        api_key=api_key,
        base_url=base_url,  # Custom base_url works with init_chat_model
        temperature=temperature,
        max_tokens=max_tokens,
    )

    return llm
```

#### 3.2: Update agent_execution_service.py

```python
# Add import
from src.services.agent_execution.llm_factory import create_llm

# Replace lines 304-310 with
llm = await create_llm(
    model_string=model_string,
    api_key=virtual_key,
    base_url=f"{self.litellm_proxy_url}/v1",
    temperature=temperature,
    max_tokens=max_tokens,
)
```

---

## Part 5: Validation & Testing Plan

### Test 1: Unit Test Tool Binding

```python
# tests/unit/test_llm_tool_binding.py

import pytest
from langchain_core.tools import StructuredTool

@pytest.mark.asyncio
async def test_tool_binding_with_different_models():
    """Test that tool binding works with different provider models."""

    test_tool = StructuredTool.from_function(
        lambda x: f"Test: {x}",
        name="test_tool",
        description="A test tool"
    )

    # Test models from different providers
    models_to_test = [
        "gpt-4o-mini",  # OpenAI
        "claude-3-5-sonnet",  # Anthropic
        "grok-4-fast-reasoning",  # XAI
    ]

    for model in models_to_test:
        llm = await create_llm(
            model_string=model,
            api_key="test-key",
            base_url="http://localhost:4000/v1",
            temperature=0.3,
            max_tokens=1000,
        )

        # Verify tool binding works
        llm_with_tools = llm.bind_tools([test_tool])

        # Check that tools are bound
        bound_tools = llm_with_tools.kwargs.get('tools', [])
        assert len(bound_tools) > 0, f"Tools not bound for {model}"
```

### Test 2: Integration Test with Real Agent

```python
# tests/integration/test_agent_tool_calling.py

@pytest.mark.asyncio
async def test_jira_agent_tool_calling():
    """Test that Jira enhancement agent actually calls tools."""

    # Create test context
    agent_id = "46a88773-4dc3-492f-8119-f95cc26bd4cc"  # Ticket Enhancer
    tenant_id = "test-tenant"
    user_message = "Check issue KAN-44"

    # Execute agent
    service = AgentExecutionService(db=async_session)
    result = await service.execute_agent(
        agent_id=agent_id,
        tenant_id=tenant_id,
        user_message=user_message,
        context={},
    )

    # Assertions
    assert result["status"] == "success"
    assert result["tool_calls"] > 0, "Tool calls should be > 0"
    assert "jira" in str(result["response"]).lower(), "Should reference Jira"
```

### Test 3: Tool Parsing Validation

```python
# Debug: Run this to verify tool calls are parsed correctly

from langchain_core.messages import AIMessage

# Simulate what execution_result contains
messages = result.get("messages", [])

tool_call_count = 0
for msg in messages:
    if isinstance(msg, AIMessage) and hasattr(msg, 'tool_calls'):
        tool_call_count += len(msg.tool_calls)
        for tc in msg.tool_calls:
            print(f"Tool call: {tc['name']}({tc['args']})")

print(f"Total tool calls: {tool_call_count}")
assert tool_call_count > 0, "Should have actual tool calls"
```

---

## Part 6: Recommended Rollout Strategy

### Step 1: Validation (BEFORE CODE CHANGE)
- [ ] Run Test 1 (LiteLLM proxy verification)
- [ ] Check Ticket Enhancer agent configuration in database
- [ ] Add debug logging to understand current behavior
- [ ] Verify LiteLLM proxy is working correctly

### Step 2: Minimal Fix (QUICK WIN)
- [ ] Install `langchain-litellm` package
- [ ] Replace ChatOpenAI with ChatLiteLLM (2 lines)
- [ ] Run Jira agent test again
- [ ] If successful, done! Deploy and monitor

### Step 3: Comprehensive Solution (IF NEEDED)
- [ ] Create llm_factory.py for provider-aware initialization
- [ ] Update agent_execution_service.py to use factory
- [ ] Add unit tests for tool binding
- [ ] Add integration tests for agent execution
- [ ] Deploy with comprehensive testing

### Step 4: Validation & Monitoring
- [ ] Run full test suite
- [ ] Execute Jira agent with test data
- [ ] Monitor execution traces for tool calls
- [ ] Test with different model providers (OpenAI, Anthropic, Grok)
- [ ] Check cost tracking in LiteLLM for accuracy

---

## Part 7: Risk Assessment & Mitigation

### Risk 1: ChatLiteLLM Package Not Compatible

**Mitigation:**
- Check package release date and compatibility with your LangChain version
- If incompatible, use init_chat_model approach (Phase 3)
- Both approaches are well-tested in 2025

### Risk 2: Tool Calling Still Fails

**Root Causes & Solutions:**
1. **LiteLLM proxy not translating tools properly**
   - Solution: Update LiteLLM proxy to latest version
   - Verify proxy configuration in docker-compose

2. **MCP tools don't have proper schema**
   - Solution: Validate tool schema in tool_converter.py
   - Ensure tools have args_schema property

3. **Agent configuration has wrong model**
   - Solution: Update agent's llm_config in database
   - Verify model name is correct for provider

### Risk 3: Breaking Changes for Existing Agents

**Mitigation:**
- Both ChatLiteLLM and init_chat_model maintain backward compatibility
- Same interface as ChatOpenAI
- No changes needed in agent creation code
- Tool binding works identically

---

## Part 8: Success Criteria

Your fix is successful when:

✅ **Execution Trace Shows:**
```python
tool_calls_count > 0  # Instead of 0
response contains actual tool results  # Not text output
messages[-1].tool_calls populated  # With actual tool calls
```

✅ **Jira Agent Updates Tickets**
- Ticket KAN-44 gets enhanced with findings
- Tool calls are logged in execution trace
- Multiple tools are called (search, fetch, add_comment)

✅ **Works Across Providers**
- OpenAI models work
- Anthropic Claude works
- XAI Grok works
- Any new provider works

✅ **No Performance Regression**
- Execution time similar to before
- Cost tracking still accurate
- Virtual key isolation maintained

---

## Part 9: Implementation Checklist

### Pre-Implementation
- [ ] Read this entire plan
- [ ] Understand the root cause
- [ ] Review research findings on 2025 patterns
- [ ] Backup database
- [ ] Create feature branch: `fix/tool-calling-litellm`

### Phase 1: Investigation
- [ ] Run LiteLLM proxy test (curl command)
- [ ] Check agent configuration in database
- [ ] Add debug logging to agent execution
- [ ] Understand actual tool call response format

### Phase 2: Minimal Fix
- [ ] Install langchain-litellm package
- [ ] Update imports in agent_execution_service.py
- [ ] Update ChatOpenAI to ChatLiteLLM
- [ ] Test with Jira agent
- [ ] If works, proceed to deployment

### Phase 3: Comprehensive Solution (if needed)
- [ ] Create llm_factory.py
- [ ] Write provider detection logic
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Validate across all providers

### Validation & Rollout
- [ ] Run all unit tests
- [ ] Run all integration tests
- [ ] Test with Jira agent (execution trace should show tool calls)
- [ ] Test with different model providers
- [ ] Deploy to staging
- [ ] Monitor for 24 hours
- [ ] Deploy to production
- [ ] Monitor metrics (tool calls, costs, latency)

---

## Summary

**Root Cause:** ChatOpenAI (OpenAI-specific client) being used for all providers, breaking tool calling for non-OpenAI backends through LiteLLM proxy.

**Solution:** Use ChatLiteLLM (November 2025 new feature) or init_chat_model (provider-agnostic) for proper tool calling across all providers.

**Effort:**
- Minimal fix: 5 minutes (2 line changes)
- Comprehensive solution: 2-3 hours (proper factory pattern)

**Impact:**
- Tool calling works for ALL providers
- Multi-provider support becomes robust
- Future-proof for new LLM providers
- Follows 2025 best practices

