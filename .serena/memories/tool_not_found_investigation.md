# Tool "Not Found" Investigation - Execution 4f987511

## Problem Statement
Jira agent (Ticket Enhancer) execution 4f987511 shows:
- Tool calls count: 2
- Tool 1: jira_get_issue → Result: "Tool jira_get_issue not found"
- Tool 2: jira_search → Result: "" (empty)
- No jira_add_comment was called

LLM correctly identified and attempted to call tools, but executor couldn't find them.

## Architecture
- **Agent**: Ticket Enhancer (ID: 46a88773-4dc3-492f-8119-f95cc26bd4cc)
- **Tenant**: default
- **Architecture**: plan_and_solve (uses PlanAndSolveExecutor)
- **MCP Server**: Jira (ID: 3edda0a5-364b-4fc8-a593-d77fbca4ca7e)

## Verification Points - All Green
1. **Tools Assigned**: ✓
   - jira_get_issue, jira_search, jira_add_comment, jira_create_version
   - Located in agents.assigned_mcp_tools JSON

2. **Tools Discovered**: ✓
   - MCP server has 31 tools including jira_get_issue
   - Located in mcp_servers.discovered_tools JSONB
   - Server status: active
   - Last health check: 2025-11-27 07:22:43

3. **Tool Binding**: ✓
   - Tools are being loaded (agent_service.get_agent_tools() returns 9 tools)
   - MCPToolBridge.get_langchain_tools() filters and converts tools

## Root Cause - Unknown (Investigation In Progress)
Two possibilities:

### Possibility A: Empty Tools List
- Tools aren't being loaded by MCPToolBridge.get_langchain_tools()
- Result: `self.tools` list is empty in PlanAndSolveExecutor
- Fix: Debug tool loading in MCPToolBridge

### Possibility B: Tool Name Mismatch  
- Tools loaded but with different names than expected
- Example: Tools might be named "Jira_GetIssue" but LLM requests "jira_get_issue"
- Result: Tool lookup fails: `next((t for t in self.tools if t.name == "jira_get_issue"), None)`
- Fix: Normalize tool names or ensure consistent naming

## PlanAndSolveExecutor Tool Lookup Code
Location: src/services/agent_execution/cognitive_architectures.py, line 383-397

```python
# Find and execute the tool
tool = next(
    (t for t in self.tools if t.name == tool_name), None
)
if tool:
    # execute tool
else:
    # Return "Tool {tool_name} not found"
```

The lookup only matches by exact name. No transformation or fallback.

## Tool Loading Pipeline
1. agent_execution_service.execute_agent()
   - Calls convert_tools_to_langchain()
   
2. convert_tools_to_langchain() (src/services/agent_execution/tool_converter.py)
   - Separates openapi_tools from mcp_tools
   - Calls bridge.get_langchain_tools(mcp_tools)

3. MCPToolBridge.get_langchain_tools() (src/services/mcp_tool_bridge.py, line 104)
   - Groups tools by server
   - For each server:
     - Loads all tools from MCP: `server_tools = await load_mcp_tools(session)`
     - Filters by assignment: `[t for t in server_tools if t.name in assigned_tool_names]`
     - Creates custom wrappers for resources/prompts
     - Returns final tool list

4. CognitiveArchitectureFactory._create_agent_executor()
   - Creates PlanAndSolveExecutor with tools
   - Passes tools to executor's create() method

5. PlanAndSolveExecutor.solve_with_plan()
   - Binds tools to LLM
   - Executes tool calls by name lookup

## Diagnostic Logging Added
Location: src/services/agent_execution_service.py (line 291-298)
```python
logger.info(
    "Tools ready for executor binding",
    extra={
        "tool_count": len(langchain_tools),
        "tool_names": [t.name for t in langchain_tools],
    }
)
```

Location: src/services/mcp_tool_bridge.py (line 237-246, 300-306)
- Logs loaded tool names vs assigned tool names
- Logs final tool list returned to caller

Location: src/services/agent_execution/cognitive_architectures.py (line 366-395)
- Logs available tools in executor
- Logs tool lookup failures with requested vs available names

## Next Steps
1. Run real agent execution with valid LLM credentials
2. Check logs for:
   - How many tools in final list?
   - What are their names?
   - Which tool names are being requested by LLM?
3. Identify mismatch
4. Fix (either empty list or name normalization)
5. Verify with new execution

## Status
- ChatLiteLLM fix: ✓ DEPLOYED (fixes multi-provider tool call parsing)
- Tool loading issue: UNDER INVESTIGATION (diagnostic logging added)
- Tool name matching: UNKNOWN (awaiting log output)
