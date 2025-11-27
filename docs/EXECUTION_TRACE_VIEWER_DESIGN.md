# Execution Trace Viewer - Design & Implementation

**Date:** 2025-11-27
**Status:** Implemented
**Component:** `ExecutionTraceViewer.tsx`
**Integration:** Test Sandbox Tab in Agent Details

---

## Problem Statement

The agent test sandbox page was displaying raw JSON execution traces, which were:
- **Unreadable**: Dense nested JSON structure difficult to parse visually
- **Not actionable**: No way to understand execution flow or identify bottlenecks
- **Not accessible**: Required manual parsing of timestamps, durations, and step sequences
- **No context**: Tool calls and LLM requests mixed together without visual distinction

## Research Findings

Based on research into industry best practices, I analyzed how leading observability platforms visualize LLM execution traces:

### Best Practice UI Patterns (2025)

**1. Hierarchical/Tree Visualization**
- Trace trees organize logs from various call stack levels
- Metrics (latency, cost) automatically aggregated at every level
- Easy pinpointing of root causes
- *References:* [LangFuse Observability Docs](https://langfuse.com/docs/observability/overview), [Medium - Top Open-Source LLM Observability Tools](https://medium.com/@thepracticaldeveloper/top-open-source-llm-observability-tools-in-2025-d2d5cbf4b932)

**2. Waterfall/Timeline Visualization**
- Sequential display of steps with duration bars
- Visual indication of execution order and timing
- Identify performance bottlenecks at a glance
- *References:* [LangSmith Documentation](https://docs.smith.langchain.com/observability/concepts), [Sentry Fetch Waterfall](https://blog.sentry.io/fetch-waterfall-in-react/)

**3. Tool Call & LLM Request Separation**
- Different card types for different step categories
- Tool calls: Show input parameters and results clearly
- LLM requests: Show prompts and responses with model information
- Color-coded for quick visual scanning
- *References:* [Google ADK Web UI Debugging](https://deepwiki.com/stigsfoot/google-ai-sprint/9.3-adk-web-ui-debugging), [MCP Inspector](https://chrisebert.net/testing-mcp-servers-with-mcp-inspector/)

**4. Collapsible Details**
- Show summary in collapsed state
- Expand to see full input/output for debugging
- Metadata (duration, timestamp, step number) always visible
- *References:* [AgentPrism - React Components](https://evilmartians.com/chronicles/debug-ai-fast-agent-prism-open-source-library-visualize-agent-traces)

**5. Metadata Display**
- Token usage and cost tracking
- Execution timing breakdown
- Status indicators
- *References:* [LangChain Observability](https://last9.io/blog/langchain-observability/)

---

## Solution Architecture

### Component Hierarchy

```
ExecutionTraceViewer (Main Component)
├── Execution Summary Section
│   ├── Overview metrics (step count, total duration)
│   └── Waterfall Timeline View
│       └── Timing bars for each step
├── Execution Steps Section
│   └── Conditional Step Cards (expanded/collapsed)
│       ├── ToolCallCard
│       │   ├── Tool name, step number, duration
│       │   └── [Expanded] Input, Output, Metadata
│       └── LLMRequestCard
│           ├── Model name, step number, duration
│           └── [Expanded] Prompt, Response, Metadata
└── Empty State (when no steps)
```

### Key Features

#### 1. **Execution Timeline with Waterfall View**
- Visual representation of step sequence
- Duration bars showing relative execution time
- Color-coded by step type (blue for tools, purple for LLM)
- Legend for quick understanding
- Helps identify bottlenecks and long-running operations

#### 2. **Hierarchical Step Cards**

**ToolCallCard:**
- Header showing: Tool name, step #, duration, icon
- Collapsed state: Just the essentials for scanning
- Expanded state:
  - Input Parameters (JSON formatted)
  - Output/Result (JSON or text)
  - Metadata grid (timestamp, duration, step #)

**LLMRequestCard:**
- Header showing: Model name, step #, duration, icon
- Collapsed state: Just the essentials for scanning
- Expanded state:
  - Prompt/Messages (JSON formatted)
  - Response (JSON or text)
  - Metadata grid (model, duration, timestamp)

#### 3. **Visual Indicators**
- Color coding: Blue dots for tools, purple for LLM requests
- Icons: ⚡ (tools), 💬 (LLM), 🕐 (timeline)
- Status: Implicit (all steps shown as successful - errors captured in metadata)
- Duration formatting: Milliseconds with 1-2 decimal precision

#### 4. **Responsive Design**
- Grid layouts that adapt to screen size
- Scrollable code blocks (max-height: 160px)
- Truncated text with proper overflow handling
- Touch-friendly card interactions

---

## Response Structure

The component accepts execution traces matching this structure:

```typescript
interface ExecutionTrace {
  steps: [
    {
      step_number: 1,
      step_type: "tool_call" | "llm_request",
      tool_name?: string,        // For tool calls
      model?: string,            // For LLM requests
      input: {                   // Input parameters or prompt
        [key: string]: any
      },
      output: any,               // Result or response
      timestamp: "ISO-8601",     // e.g., "2025-11-27T10:30:45.123Z"
      duration_ms: 245.50        // Execution time in milliseconds
    }
    // ... more steps
  ],
  total_duration_ms: 1243.50,
  status: "success" | "failed"
}
```

### Tools Used in Response

Each execution step can contain:

1. **Tool Calls** (step_type: "tool_call")
   - Represents function/tool execution
   - tool_name: Name of the tool invoked
   - input: Parameters passed to the tool
   - output: Return value or error
   - Example: Search tools, database queries, API calls

2. **LLM Requests** (step_type: "llm_request")
   - Represents LLM API calls
   - model: Model identifier (e.g., "gpt-4", "claude-3")
   - input: Messages/prompt sent to LLM
   - output: Generated response
   - Example: OpenAI API calls, Claude API calls, LangGraph steps

---

## UI/UX Improvements Over Raw JSON

| Aspect | Before (Raw JSON) | After (ExecutionTraceViewer) |
|--------|-------------------|------------------------------|
| **Readability** | Dense nested structure | Clear hierarchical cards |
| **Scanning** | Manual parsing needed | Visual timeline + color coding |
| **Performance** | Hard to spot bottlenecks | Waterfall bars show durations |
| **Tool Context** | No distinction | Separate cards + icons |
| **Expansion** | N/A | Collapsible details view |
| **Metadata** | Scattered in JSON | Dedicated metadata grids |
| **Mobile** | Not responsive | Fully responsive design |
| **Accessibility** | No labels/hierarchy | Semantic HTML, ARIA labels |

---

## Implementation Details

### Files Created
- `/nextjs-ui/components/execution-history/ExecutionTraceViewer.tsx` (365 lines)

### Files Modified
- `/nextjs-ui/components/agents/TestSandbox.tsx`
  - Removed: JsonView import and dark/light theme logic
  - Added: ExecutionTraceViewer import
  - Replaced: Raw JSON view with `<ExecutionTraceViewer trace={testResult.execution_trace} />`

### Dependencies
- **lucide-react**: Icons (ChevronDown, ChevronRight, Zap, MessageSquare, Clock, AlertCircle)
- **React 18+**: Hooks (useState)
- **Tailwind CSS**: Styling with custom utility classes

### Build Status
✅ **NextJS Build:** Successful (no TypeScript or build errors)

---

## Usage Example

```typescript
import { ExecutionTraceViewer } from '@/components/execution-history/ExecutionTraceViewer';

// In your component:
<ExecutionTraceViewer trace={testResult.execution_trace} />

// Where testResult.execution_trace matches ExecutionTrace interface
```

---

## Design Decisions

### 1. **Waterfall Timeline**
- **Why:** Helps identify performance bottlenecks at a glance
- **How:** Uses relative widths based on max step duration
- **Trade-off:** Not to-scale in absolute terms, but effective for comparison

### 2. **Collapsible Details**
- **Why:** Balance between quick scanning and detailed inspection
- **How:** useState tracks expanded step numbers
- **Trade-off:** Additional interaction required, but reduced cognitive load

### 3. **Separated Card Types**
- **Why:** Different visual treatment for different execution types
- **How:** Check step_type to render ToolCallCard or LLMRequestCard
- **Trade-off:** More component code, but better UX

### 4. **Fixed Collapsed Height for Code**
- **Why:** Prevent huge blocks of text from dominating the page
- **How:** max-h-[160px] with overflow-auto on code blocks
- **Trade-off:** Need to expand to see full content, but keeps page scannable

---

## Future Enhancements

1. **Copy-to-Clipboard:** Add copy buttons to code blocks
2. **Search/Filter:** Filter steps by type or tool name
3. **Export:** Download execution trace as JSON or CSV
4. **Comparison:** Side-by-side comparison of two execution traces
5. **Performance Charts:** Show execution time trends across multiple tests
6. **Error Handling:** Dedicated error state display with stack traces
7. **Animations:** Smooth expand/collapse animations
8. **Keyboard Shortcuts:** Expand/collapse all with keyboard commands

---

## Research Sources

1. [LangFuse - LLM Observability Overview](https://langfuse.com/docs/observability/overview)
2. [LangSmith - Observability Concepts](https://docs.smith.langchain.com/observability/concepts)
3. [Medium - Top Open-Source LLM Observability Tools 2025](https://medium.com/@thepracticaldeveloper/top-open-source-llm-observability-tools-in-2025-d2d5cbf4b932)
4. [Google ADK - Web UI Debugging](https://deepwiki.com/stigsfoot/google-ai-sprint/9.3-adk-web-ui-debugging)
5. [MCP Inspector - Testing MCP Servers](https://chrisebert.net/testing-mcp-servers-with-mcp-inspector/)
6. [AgentPrism - Visualize Agent Traces](https://evilmartians.com/chronicles/debug-ai-fast-agent-prism-open-source-library-visualize-agent-traces)
7. [Sentry - Fetch Waterfall Patterns](https://blog.sentry.io/fetch-waterfall-in-react/)
8. [Material UI - Timeline Component](https://mui.com/material-ui/react-timeline/)

---

## Testing the Component

1. Navigate to: `/dashboard/agents-config/{agent-id}?tab=test`
2. Enter a test message
3. Click "Execute Test"
4. View the new ExecutionTraceViewer displaying:
   - Execution timeline with waterfall
   - Hierarchical step cards
   - Collapsible tool/LLM call details
   - Clear metadata display

---

## Conclusion

The ExecutionTraceViewer transforms raw execution data into a professional, readable interface following industry best practices from LangSmith, Google ADK, and AgentPrism. It provides immediate visibility into agent behavior while maintaining the ability to drill down into implementation details.
