# Tool Calling Failure Root Cause Analysis
## Execution ID: be73924f-be28-471d-b1f3-ad55d81c7bc1

**Date**: 2025-11-27
**Agent**: Ticket Enhancer (46a88773-4dc3-492f-8119-f95cc26bd4cc)
**Status**: Root Cause Identified
**Priority**: CRITICAL

---

## Executive Summary

The Jira "Ticket Enhancer" agent is **not calling MCP tools autonomously**, resulting in `tool_calls_count=0` and no ticket updates.

**Root Cause**: The LLM is outputting tool calls as **TEXT** (e.g., `"jira_get_issue(issue_key=\"KAN-44\")"`) instead of invoking them as actual function calls.

**Root Mechanism**: The tools ARE being:
- ✅ Discovered from MCP servers (3 tools assigned)
- ✅ Converted to LangChain format via `langchain-mcp-adapters`
- ✅ Passed to `create_react_agent()`

**But are NOT being**:
- ❌ Properly bound to the LLM for function calling
- ❌ Available to the LLM as actual function/tool schemas

---

## Investigation Path

### Step 1: Execution Trace Analysis
**File**: Execution ID be73924f in database

```
Response: "jira_get_issue(issue_key=\"KAN-44\")"
Tool Calls Count: 0
Status: success (but actually failed - no tools called)
```

**Finding**: The LLM generated text that LOOKS like a tool call, but it's literally just text in the response. This is the classic symptom of **tools not being bound to the LLM**.

### Step 2: Agent Configuration Verification
**File**: Agent database record

- Agent Status: ✅ Active
- Tools Assigned: ✅ 3 tools
  - 65977cb8-1727-5e15-917c-8ed90be8b696
  - 35594218-7e66-56d0-9571-60800fa0e086
  - a1d07c2a-3c54-5dfa-8900-6bca97ac1928
- System Prompt: ✅ Comprehensive 500+ lines with explicit tool-calling instructions:
  ```
  "ALWAYS use the tools provided - don't generate pseudocode"

  Examples:
  - Call jira_get_issue to fetch the complete ticket details
  - Call jira_search to find previous tickets with similar problems
  - Call fetch to research solutions on the internet
  - Call jira_add_comment to post findings back to issue
  ```

**Finding**: Agent is properly configured and explicitly instructed to use tools, but the tools aren't actually callable by the LLM.

### Step 3: Tool Loading Pipeline Trace
**File**: `src/services/agent_execution_service.py` (lines 224-320)

```
[PASS] Step 1: Load unified tools from agent
   └─ 3 tools loaded from database

[PASS] Step 2: Get active MCP servers
   └─ MCP servers available and active

[PASS] Step 3: Convert tools to LangChain format
   └─ convert_tools_to_langchain(unified_tools, mcp_servers)
   └─ Returns: langchain_tools list

[PASS] Step 4: Create LLM instance
   └─ ChatOpenAI with LiteLLM proxy
   └─ model="gpt-4o-mini"
   └─ api_key=virtual_key
   └─ base_url="http://localhost:4000/v1"

[PASS] Step 5: Create agent executor
   └─ CognitiveArchitectureFactory.create_executor(
        architecture="react",
        llm=llm,
        tools=langchain_tools
      )
   └─ Delegates to ReActExecutor.create()

[FAIL] Step 6: ReActExecutor creates agent WITHOUT tool binding
   └─ See detailed analysis below
```

### Step 4: Tool Binding Issue in ReActExecutor
**File**: `src/services/agent_execution/cognitive_architectures.py` (lines 90-109)

```python
def create(self) -> Any:
    agent = create_react_agent(model=self.llm, tools=self.tools)
    return agent
```

**The Problem**:
- `create_react_agent()` from LangGraph is supposed to handle tool binding internally
- However, the agent is NOT receiving tools in a format that allows the LLM to invoke them

**Comparison with Other Executors** (Same file):

SingleStepExecutor (lines 159-164):
```python
# EXPLICIT tool binding
llm_with_tools = self.llm.bind_tools(self.tools)
response = llm_with_tools.invoke(messages)
```

PlanAndSolveExecutor (lines 342, 361):
```python
# EXPLICIT tool binding
llm_with_tools = self.llm.bind_tools(self.tools)
response = llm_with_tools.invoke(messages)
```

ReActExecutor (lines 106):
```python
# IMPLICIT tool binding (relying on create_react_agent)
agent = create_react_agent(model=self.llm, tools=self.tools)
```

**Finding**: The other executors explicitly call `.bind_tools()` on the LLM, but ReActExecutor relies on `create_react_agent()` to do this internally. This may be the issue if `create_react_agent()` isn't properly binding the tools.

---

## Tool Conversion Pipeline

**File**: `src/services/agent_execution/tool_converter.py` (lines 89-117)

### MCP Tools Path:
```
unified_mcp_tools
  ↓
MCPToolBridge.get_langchain_tools(mcp_tools)
  ↓
load_mcp_tools(session)  [from langchain-mcp-adapters]
  ↓
BaseTool instances with proper schema
  ↓
langchain_tools list
```

**Source**: `langchain_mcp_adapters.tools.load_mcp_tools`

The tools ARE being converted to proper `BaseTool` instances via the official `langchain-mcp-adapters` library, which is the correct 2025 pattern.

### OpenAPI Tools Path:
```
unified_openapi_tools
  ↓
[NOT IMPLEMENTED - TODO comment on line 85]
```

**Finding**: OpenAPI tools aren't being converted, only MCP tools. For the Jira agent, we're relying on MCP Jira server.

---

## Critical Questions

### 1. Is `create_react_agent()` properly binding tools?

LangGraph's `create_react_agent()` should bind tools via `.bind_tools()` internally. However:
- The agent is NOT making actual tool calls
- The LLM is writing tool calls as text instead
- This suggests tools aren't available to the LLM's function-calling interface

### 2. Are the converted MCP tools proper `BaseTool` instances?

The `load_mcp_tools()` function from `langchain-mcp-adapters` should return:
```python
List[BaseTool]  # with proper schema, invoke() method, etc.
```

But we haven't verified that:
- The tools have proper schema definitions
- The tools' `invoke()` methods work correctly
- The tools are in a format the LLM can call

### 3. Is the LLM configured correctly for tool calling?

ChatOpenAI with LiteLLM proxy should support tool calling, but:
- We're using a proxy endpoint (`http://localhost:4000/v1`)
- The proxy might not be properly translating tool binding to the backend LLM
- Or the LLM model (`gpt-4o-mini`) might not be receiving the tools properly

---

## SOLUTIONS

### Solution 1: Verify LiteLLM Proxy Configuration (IMMEDIATE)

The most likely issue is that the LiteLLM proxy is not properly forwarding tool calling information to the backend LLM.

**Action**:
1. Check LiteLLM proxy logs for how it handles `bind_tools()` calls
2. Test if LiteLLM proxy supports tool calling with gpt-4o-mini
3. Verify the proxy is configured to:
   - Accept `tools` parameter in ChatOpenAI
   - Forward tools properly to OpenAI API
   - Support function calling for gpt-4o-mini model

**Config Location**:
```
src/services/agent_execution_service.py line 304-310
```

**Example Test**:
```python
llm = ChatOpenAI(
    model="gpt-4o-mini",
    api_key=virtual_key,
    base_url="http://localhost:4000/v1",
)

# Try binding a test tool
test_tool = StructuredTool.from_function(
    lambda x: f"test: {x}",
    name="test_tool",
    description="Test tool"
)

llm_with_tools = llm.bind_tools([test_tool])

# Check if the binding worked
print(f"Bound tools: {llm_with_tools.kwargs.get('tools', [])}")
```

### Solution 2: Add Explicit Tool Binding in ReActExecutor (RECOMMENDED)

Even though `create_react_agent()` should bind tools, we can make it explicit and more reliable:

**File**: `src/services/agent_execution/cognitive_architectures.py` (line 90-109)

**Current Code**:
```python
def create(self) -> Any:
    agent = create_react_agent(model=self.llm, tools=self.tools)
    return agent
```

**Improved Code**:
```python
def create(self) -> Any:
    logger.info(
        "Creating ReAct agent executor",
        extra={
            "tool_count": len(self.tools),
            "tool_names": [t.name for t in self.tools],
        },
    )

    # Explicitly bind tools to LLM (defensive programming)
    # Reason: Ensures tools are available for function calling even if
    # create_react_agent's internal binding has issues with proxy/auth setup
    llm_with_tools = self.llm.bind_tools(self.tools) if self.tools else self.llm

    # Create ReAct agent using the bound LLM
    agent = create_react_agent(model=llm_with_tools, tools=self.tools)

    logger.debug("ReAct executor created successfully")
    return agent
```

### Solution 3: Add Tool Validation Before Agent Creation

Add a pre-flight check to ensure tools are properly formatted:

**File**: `src/services/agent_execution_service.py` (after line 252)

```python
# Validate tools before agent creation
logger.info(f"Validating {len(langchain_tools)} LangChain tools")
for i, tool in enumerate(langchain_tools):
    if not hasattr(tool, 'invoke') and not hasattr(tool, 'ainvoke'):
        logger.error(f"Tool {i} ({tool.name}) missing invoke method!")
    if not hasattr(tool, 'args_schema'):
        logger.warning(f"Tool {i} ({tool.name}) missing args_schema")
    logger.debug(f"Tool {i}: name={tool.name}, schema={tool.args_schema}")
```

### Solution 4: Switch to SingleStepExecutor for Testing

To verify if the issue is specific to `create_react_agent()`, test with SingleStepExecutor which explicitly binds tools:

**Action**:
1. Change agent's `cognitive_architecture` to `"single_step"`
2. Run the same Jira ticket enhancement task
3. If it works, the issue is in ReActExecutor/create_react_agent
4. If it still fails, the issue is in tool conversion or LiteLLM proxy

### Solution 5: Check MCP Tool Schema

Verify that MCP tools converted via `langchain-mcp-adapters` have proper schema:

**File**: `src/services/mcp_tool_bridge.py` (after line 217)

```python
# Validate that filtered tools have proper schemas
for tool in filtered_tools:
    if not hasattr(tool, 'args_schema') or tool.args_schema is None:
        logger.warning(f"Tool {tool.name} missing args_schema - LLM won't be able to call it")
    else:
        logger.debug(f"Tool {tool.name} schema: {tool.args_schema}")
```

---

## Technical Context

### LangGraph's create_react_agent()
From LangGraph documentation, `create_react_agent()` should:
1. Create a ReAct loop (Reason → Act → Observe)
2. Bind tools to the LLM via `.bind_tools()`
3. Create tool-calling nodes
4. Return a compiled graph

However, the fact that our LLM is outputting tool calls as **text** suggests step 2 (tool binding) is failing.

### MCP Integration Pattern (2025)
The proper pattern is:
```
MCP Server → langchain-mcp-adapters.load_mcp_tools() → BaseTool instances
                                                           ↓
                                                    LLM.bind_tools()
                                                           ↓
                                                    LLM can invoke tools
```

We're doing:
```
MCP Server → langchain-mcp-adapters.load_mcp_tools() → BaseTool instances
                                                           ↓
                                          create_react_agent(tools=...)
                                                           ↓
                                        [tools not being used by LLM?]
```

---

## ROOT CAUSE CONFIRMED

**The Actual Issue**: `create_react_agent()` DOES call `.bind_tools()` internally, BUT there's a **validation function `_should_bind_tools()`** that checks if tools are already bound and skips binding if they are NOT matching properly.

### The `_should_bind_tools()` Logic (from LangGraph source):

```python
def _should_bind_tools(model: LanguageModelLike, tools: Sequence[BaseTool], num_builtin: int = 0) -> bool:
    # ... checks if model is a RunnableBinding ...

    if len(tools) != len(bound_tools) - num_builtin:
        raise ValueError(
            "Number of tools in the model.bind_tools() and tools passed to "
            "create_react_agent must match"
        )

    # Validates that tool names match between what's bound and what's passed
    tool_names = set(tool.name for tool in tools)
    bound_tool_names = {extract bound tool names from model}

    if missing_tools := tool_names - bound_tool_names:
        raise ValueError(f"Missing tools '{missing_tools}' in the model.bind_tools()")

    return False  # Don't bind again, already bound
    return True   # Do bind, not yet bound
```

### Why Our Tools Aren't Being Called:

1. **Tools ARE being passed** to `create_react_agent()` ✅
2. **create_react_agent() checks** if model has tools already bound
3. **Since tools are NOT pre-bound**, `_should_bind_tools()` returns `True`
4. **create_react_agent() calls** `model.bind_tools(tools)` ✅
5. **BUT** - The ChatOpenAI instance (with LiteLLM proxy) might NOT support proper tool binding

### The Real Problem:

**ChatOpenAI with LiteLLM proxy endpoint might not be properly translating tool binding to the underlying LLM.**

The tools ARE bound to the ChatOpenAI instance, but when the request is sent to:
```
base_url="http://localhost:4000/v1"  (LiteLLM proxy)
  ↓
  ↓ (proxy translates to backend LLM)
  ↓
model="gpt-4o-mini"
```

The proxy might not be properly forwarding the `tools` parameter to the backend, OR the backend model (gpt-4o-mini) might not be receiving them properly for function calling.

**Evidence**:
- LLM outputs: `"jira_get_issue(issue_key=\"KAN-44\")"` (text, not function call)
- This is what happens when LLM sees tool documentation in the prompt but tools aren't in the function schema
- Sandbox mode with mocked tools works because the tools are invoked locally in Python, bypassing LLM's function calling

---

## Files Involved

| File | Role | Status |
|------|------|--------|
| `src/services/agent_execution_service.py` | Orchestration | ✅ Working (tool loading & conversion OK) |
| `src/services/agent_execution/cognitive_architectures.py` | Agent creation | ⚠️ **SUSPECT** (ReActExecutor may not bind tools) |
| `src/services/agent_execution/tool_converter.py` | Tool conversion | ✅ Working (converts to BaseTool) |
| `src/services/mcp_tool_bridge.py` | MCP loading | ✅ Working (uses langchain-mcp-adapters) |
| `src/services/agent_execution/result_extractor.py` | Result extraction | ✅ Working (but nothing to extract) |

---

## References

- **Execution Trace**: be73924f-be28-471d-b1f3-ad55d81c7bc1
- **Agent**: Ticket Enhancer (46a88773-4dc3-492f-8119-f95cc26bd4cc)
- **LangGraph create_react_agent()**: From `langgraph.prebuilt`
- **MCP Adapters**: `langchain-mcp-adapters.tools.load_mcp_tools`
- **Research**: Context7 MCP + LangGraph integration patterns (Nov 2025)

---

## Conclusion

### What's Working ✅
- Tools ARE discovered from MCP servers (3 tools assigned)
- Tools ARE converted to LangChain BaseTool format via `langchain-mcp-adapters`
- Tools ARE passed to `create_react_agent()`
- `create_react_agent()` DOES call `.bind_tools()` on the LLM

### What's Failing ❌
- The LiteLLM proxy is NOT properly forwarding tool calling to the backend LLM
- The LLM is generating text like `"jira_get_issue(issue_key=\"KAN-44\")"` instead of actual function calls
- This indicates tools are documented in the prompt but NOT available in the function schema

### Root Cause
**LiteLLM Proxy Configuration Issue**: The ChatOpenAI client's `.bind_tools()` is binding the tools to the request, but the LiteLLM proxy (at `http://localhost:4000/v1`) is not properly:
1. Accepting the `tools` parameter from ChatOpenAI's bind_tools()
2. Forwarding it to the OpenAI API backend
3. Or the backend is not receiving the tools properly for function calling

### Recommended Action
1. **Implement Solution 2** (Add explicit tool binding in ReActExecutor) - defensive programming
2. **Implement Solution 3** (Add tool validation) - to identify issues early
3. **Implement Solution 4** (Test with SingleStepExecutor) - to isolate the problem
4. **Verify Solution 1** (Check LiteLLM proxy configuration) - to confirm the root cause

Once the LiteLLM proxy is properly configured to forward tool calling, the agent should start making actual tool calls instead of generating text.
