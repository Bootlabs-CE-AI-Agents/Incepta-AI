# UX Wireframes: MCP Tool Discovery UI

**Story**: 0.4.1 - MCP Tool Discovery in Agent Management
**Designer**: Sally (UX)
**Date**: 2025-11-22
**Status**: ✅ Ready for Development

---

## Overview

The MCP Tool Discovery UI allows users to browse, search, filter, and assign tools to agents from multiple sources (OpenAPI and MCP servers). The UI must support:

1. **Multi-source tool organization** (All/OpenAPI/MCP tabs)
2. **Real-time health monitoring** for MCP servers
3. **Advanced filtering** (search + server filter)
4. **Batch tool selection** with visual feedback
5. **Server health badges** (green/yellow/red)

---

## User Journey

```
1. User navigates to Agent Management page
   ↓
2. User selects an existing agent to edit
   ↓
3. User clicks "Edit" button
   ↓
4. User scrolls to "🛠️ Tool Assignment & Discovery" section
   ↓
5. User sees three tabs: "📋 All Tools" | "🔧 OpenAPI Tools" | "🔌 MCP Tools"
   ↓
6. User switches to "🔌 MCP Tools" tab to assign MCP tools
   ↓
7. User uses search box to find specific tools (e.g., "file")
   ↓
8. User filters by MCP server (e.g., "filesystem")
   ↓
9. User sees tools with health badges: 🟢 Healthy | 🟡 Degraded | 🔴 Unhealthy
   ↓
10. User clicks checkboxes to select tools
   ↓
11. User clicks "✅ Select All" or "❌ Clear All" for batch operations
   ↓
12. User reviews "📊 Selected Tools Summary" showing OpenAPI + MCP counts
   ↓
13. User clicks "Save" to update agent tool assignments
```

---

## Wireframe 1: Full Page Layout (Agent Edit Dialog)

```
┌────────────────────────────────────────────────────────────────────┐
│  📝 Edit Agent: Customer Support Agent                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─── Basic Information ────────────────────────────────────────┐  │
│  │  Name:  [Customer Support Agent                           ]  │  │
│  │  Type:  [Conversational ▼]                                  │  │
│  │  Desc:  [Handles customer inquiries...                    ]  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─── LLM Configuration ─────────────────────────────────────────┐ │
│  │  Provider: [OpenAI ▼]                                        │ │
│  │  Model:    [GPT-4 (openai) ▼]                    [🔄 Refresh] │ │
│  │  Temp:     [0.7]   Max Tokens: [4096]   Top P: [1.0]        │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌─── System Prompt ─────────────────────────────────────────────┐ │
│  │  [You are a helpful customer support agent...]                 │
│  │  [                                                  ]           │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ───────────────────────────────────────────────────────────────  │
│                                                                     │
│  🛠️ Tool Assignment & Discovery  <--- NEW SECTION                 │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  [📋 All Tools] [🔧 OpenAPI Tools] [🔌 MCP Tools]           │ │
│  │  ───────────────────────────────────────────────────────────  │
│  │                                                                │ │
│  │  🔍 Search tools: [file system                             ]  │ │
│  │                                                                │ │
│  │  ✅ Select All      ❌ Clear All                              │ │
│  │                                                                │ │
│  │  ┌─ Available Tools ────────────────────────────────────────┐ │ │
│  │  │                                                           │ │ │
│  │  │  ☐ 📄 read_file                              🟢 Healthy  │ │ │
│  │  │     Read contents from filesystem (filesystem)           │ │ │
│  │  │                                                           │ │ │
│  │  │  ☐ 📝 write_file                             🟢 Healthy  │ │ │
│  │  │     Write contents to filesystem (filesystem)            │ │ │
│  │  │                                                           │ │ │
│  │  │  ☑ 🔍 search_files                           🟢 Healthy  │ │ │
│  │  │     Search for files matching pattern (filesystem)       │ │ │
│  │  │                                                           │ │ │
│  │  │  ☐ 📊 execute_sql                            🟡 Degraded │ │ │
│  │  │     Execute SQL query on database (postgres)             │ │ │
│  │  │                                                           │ │ │
│  │  │  ☐ 🌐 fetch_url                              🔴 Down     │ │ │
│  │  │     Fetch content from URL (web-fetcher)                 │ │ │
│  │  │                                                           │ │ │
│  │  └───────────────────────────────────────────────────────────┘ │ │
│  │                                                                │ │
│  │  📊 Selected Tools Summary:                                    │ │
│  │  • OpenAPI Tools: 3 selected (openapi_tool_1, ...)           │ │
│  │  • MCP Tools: 1 selected (search_files)                       │ │
│  │  • Total: 4 tools                                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  [Cancel]                                        [Save Changes]    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Wireframe 2: MCP Tools Tab with Server Filter

```
┌─────────────────────────────────────────────────────────────────────┐
│  🛠️ Tool Assignment & Discovery                                     │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  [📋 All Tools] [🔧 OpenAPI Tools] [🔌 MCP Tools]   <-- Active │  │
│  │  ─────────────────────────────────────────────────────────────  │  │
│  │                                                                  │  │
│  │  🔍 Search tools: [                                          ]  │  │
│  │                                                                  │  │
│  │  Filter by MCP Server: ▼                                        │  │
│  │  ☑ filesystem (12 tools)                                        │  │
│  │  ☐ postgres (8 tools)                                           │  │
│  │  ☐ web-fetcher (5 tools)                                        │  │
│  │  ☐ slack-integration (3 tools)                                  │  │
│  │                                                                  │  │
│  │  💡 Tip: To quickly select all tools from a server, use the    │  │
│  │     filter below to show only that server's tools, then         │  │
│  │     click '✅ Select All'.                                      │  │
│  │                                                                  │  │
│  │  ✅ Select All      ❌ Clear All                                │  │
│  │                                                                  │  │
│  │  ┌─ Available Tools (Showing filesystem tools only) ─────────┐ │  │
│  │  │                                                             │ │  │
│  │  │  ☐ 📄 read_file                              🟢 Healthy    │ │  │
│  │  │     Read contents from filesystem (filesystem)             │ │  │
│  │  │                                                             │ │  │
│  │  │  ☐ 📝 write_file                             🟢 Healthy    │ │  │
│  │  │     Write contents to filesystem (filesystem)              │ │  │
│  │  │                                                             │ │  │
│  │  │  ☐ 🗑️ delete_file                            🟢 Healthy    │ │  │
│  │  │     Delete file from filesystem (filesystem)               │ │  │
│  │  │                                                             │ │  │
│  │  │  ☐ 📂 list_directory                         🟢 Healthy    │ │  │
│  │  │     List directory contents (filesystem)                   │ │  │
│  │  │                                                             │ │  │
│  │  │  [... 8 more filesystem tools ...]                          │ │  │
│  │  │                                                             │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │                                                                  │  │
│  │  📊 Selected Tools Summary:                                      │  │
│  │  • OpenAPI Tools: 3 selected                                    │  │
│  │  • MCP Tools: 0 selected                                        │  │
│  │  • Total: 3 tools                                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Wireframe 3: Health Badge Tooltip (Hover State)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ☐ 📊 execute_sql                            🟡 Degraded            │
│     Execute SQL query on database (postgres)                        │
│                                                                       │
│     ┌────────────────────────────────────┐ <-- Tooltip on hover     │
│     │  ⚠️ Server Health: Degraded        │                          │
│     │                                     │                          │
│     │  Status: YELLOW                     │                          │
│     │  Last Check: 30s ago                │                          │
│     │  Response Time: 850ms               │                          │
│     │                                     │                          │
│     │  Server: postgres                   │                          │
│     │  Tools Available: 8                 │                          │
│     └────────────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. **Tab Navigation** (Component: `Tabs`)
- Three tabs: All Tools, OpenAPI Tools, MCP Tools
- Active tab highlighted with underline/color
- Icon prefix for visual clarity

**Props**:
```typescript
{
  tabs: [
    { id: 'all', label: 'All Tools', icon: '📋' },
    { id: 'openapi', label: 'OpenAPI Tools', icon: '🔧' },
    { id: 'mcp', label: 'MCP Tools', icon: '🔌' }
  ],
  activeTab: 'mcp',
  onTabChange: (tabId) => {...}
}
```

---

### 2. **Search Box** (Component: `Input`)
- Placeholder: "Search by name or description..."
- Help text: "Case-insensitive search across tool names and descriptions"
- Real-time filtering (debounced 300ms)

**Props**:
```typescript
{
  icon: '🔍',
  placeholder: 'Search by name or description...',
  value: searchQuery,
  onChange: (value) => {...},
  debounceMs: 300
}
```

---

### 3. **MCP Server Filter** (Component: `MultiSelect`)
- Only visible in "MCP Tools" tab
- Shows server names with tool counts
- Example: "filesystem (12 tools)"
- Multi-select dropdown

**Props**:
```typescript
{
  label: 'Filter by MCP Server',
  options: [
    { value: 'filesystem', label: 'filesystem (12 tools)' },
    { value: 'postgres', label: 'postgres (8 tools)' }
  ],
  selected: ['filesystem'],
  onChange: (selected) => {...}
}
```

---

### 4. **Batch Action Buttons** (Component: `ButtonGroup`)
- "✅ Select All" - Checks all filtered tools
- "❌ Clear All" - Unchecks all tools
- Horizontal layout, equal width

**Props**:
```typescript
{
  buttons: [
    { label: '✅ Select All', onClick: handleSelectAll },
    { label: '❌ Clear All', onClick: handleClearAll }
  ],
  layout: 'horizontal'
}
```

---

### 5. **Tool Item** (Component: `ToolCheckbox`)
- Checkbox for selection
- Tool icon (emoji based on category)
- Tool name (bold)
- Tool description (muted)
- Server name in parentheses
- Health badge (colored dot + label)

**Props**:
```typescript
{
  tool: {
    id: 'filesystem/read_file',
    name: 'read_file',
    description: 'Read contents from filesystem',
    icon: '📄',
    server: 'filesystem',
    source_type: 'mcp'
  },
  healthStatus: {
    status: 'healthy', // 'healthy' | 'degraded' | 'down'
    lastCheck: '2025-11-22T10:30:00Z',
    responseTime: 125
  },
  isSelected: false,
  onChange: (checked) => {...}
}
```

---

### 6. **Health Badge** (Component: `HealthBadge`)
- 🟢 Healthy (green) - Response < 500ms
- 🟡 Degraded (yellow) - Response 500-2000ms
- 🔴 Down (red) - No response or error

**Props**:
```typescript
{
  status: 'healthy' | 'degraded' | 'down',
  tooltip: {
    status: 'YELLOW',
    lastCheck: '30s ago',
    responseTime: '850ms',
    server: 'postgres',
    toolsAvailable: 8
  }
}
```

---

### 7. **Selected Tools Summary** (Component: `SummaryCard`)
- OpenAPI tools count + examples
- MCP tools count + examples
- Total count

**Props**:
```typescript
{
  openapi: {
    count: 3,
    examples: ['openapi_tool_1', 'openapi_tool_2', 'openapi_tool_3']
  },
  mcp: {
    count: 1,
    examples: ['search_files']
  },
  total: 4
}
```

---

## Visual Design Tokens

### Colors

```typescript
const healthColors = {
  healthy: {
    bg: 'rgba(34, 197, 94, 0.1)',  // green-500/10
    text: 'rgb(34, 197, 94)',       // green-500
    icon: '🟢'
  },
  degraded: {
    bg: 'rgba(234, 179, 8, 0.1)',   // yellow-500/10
    text: 'rgb(234, 179, 8)',        // yellow-500
    icon: '🟡'
  },
  down: {
    bg: 'rgba(239, 68, 68, 0.1)',   // red-500/10
    text: 'rgb(239, 68, 68)',        // red-500
    icon: '🔴'
  }
};
```

### Spacing

```typescript
const spacing = {
  sectionGap: '24px',      // Between sections
  toolItemGap: '12px',     // Between tool items
  inputGap: '16px',        // Between search/filter inputs
  summaryMargin: '24px',   // Above summary card
};
```

### Typography

```typescript
const typography = {
  toolName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--foreground)'
  },
  toolDescription: {
    fontSize: '13px',
    fontWeight: 400,
    color: 'var(--muted-foreground)'
  },
  serverLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--muted-foreground)',
    fontStyle: 'italic'
  }
};
```

---

## Interaction States

### Tool Checkbox States

1. **Unchecked** (Default)
   - Gray border
   - White background
   - No checkmark

2. **Checked** (Selected)
   - Primary color border
   - Primary color background (10% opacity)
   - White checkmark icon

3. **Hover** (Interactive)
   - Light gray background
   - Cursor: pointer
   - Tool item highlights

4. **Disabled** (Server down)
   - Gray opacity 50%
   - Cursor: not-allowed
   - Tooltip: "Server unavailable"

---

## Accessibility

### Keyboard Navigation

- **Tab**: Navigate between search, filter, checkboxes, buttons
- **Space**: Toggle checkbox
- **Enter**: Activate button
- **Escape**: Close filter dropdown

### Screen Reader Labels

```html
<input
  aria-label="Search tools by name or description"
  role="searchbox"
/>

<input
  type="checkbox"
  aria-label="Select read_file tool from filesystem server"
  aria-describedby="tool-read_file-description"
/>

<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  Showing 5 tools matching "file"
</div>
```

### Color Contrast

- Health badge text: WCAG AA compliant (4.5:1 minimum)
- Tool names: 7:1 contrast ratio
- Disabled states: 3:1 contrast ratio

---

## Responsive Design

### Desktop (>= 1024px)

- Full 3-column tab layout
- Server filter as multi-select dropdown
- Tool items in 1-column list

### Tablet (768px - 1023px)

- Full tabs layout
- Server filter as multi-select dropdown
- Tool items in 1-column list

### Mobile (<= 767px)

- Tab navigation scrollable horizontal
- Server filter as drawer/modal
- Tool items in 1-column list with condensed layout

---

## Empty States

### No Tools Available

```
┌─────────────────────────────────────┐
│                                      │
│           🔧                          │
│                                      │
│  No Tools Configured                 │
│                                      │
│  Configure OpenAPI tools or MCP      │
│  servers to assign tools to agents.  │
│                                      │
│  [Configure Tools →]                 │
│                                      │
└─────────────────────────────────────┘
```

### No Search Results

```
┌─────────────────────────────────────┐
│                                      │
│           🔍                          │
│                                      │
│  No tools found for "database"       │
│                                      │
│  Try different keywords or clear     │
│  the search to see all tools.        │
│                                      │
│  [Clear Search ×]                    │
│                                      │
└─────────────────────────────────────┘
```

---

## Acceptance Criteria (UX Validation)

| # | Criterion | Status |
|---|-----------|--------|
| AC1 | Tab navigation works with keyboard (Tab, Arrow keys) | ✅ Designed |
| AC2 | Search box filters tools in real-time (<300ms debounce) | ✅ Designed |
| AC3 | MCP server filter shows tool counts per server | ✅ Designed |
| AC4 | Health badges update in real-time (polling every 30s) | ✅ Designed |
| AC5 | Select All/Clear All buttons work per filtered view | ✅ Designed |
| AC6 | Tool selection persists when switching tabs | ✅ Designed |
| AC7 | Summary card updates immediately on selection change | ✅ Designed |
| AC8 | Tooltip shows health details on badge hover | ✅ Designed |
| AC9 | Screen reader announces tool count changes | ✅ Designed |
| AC10 | Mobile layout collapses gracefully (<768px) | ✅ Designed |

---

## Next Steps for Development (Amelia)

1. **Create React components**:
   - `MCPToolDiscovery.tsx` - Container component
   - `ToolTabs.tsx` - Tab navigation
   - `ToolSearchFilter.tsx` - Search + server filter
   - `ToolList.tsx` - Tool items with checkboxes
   - `ToolCheckbox.tsx` - Individual tool item
   - `HealthBadge.tsx` - Health status indicator
   - `SelectedToolsSummary.tsx` - Summary card

2. **Implement API integrations**:
   - `GET /api/v1/tools/unified?tenant_id={id}` - Fetch all tools
   - `GET /api/v1/mcp-servers/health?tenant_id={id}` - Fetch health status
   - Poll health status every 30s

3. **Add state management**:
   - Selected tools state (OpenAPI + MCP)
   - Search query state
   - Server filter state
   - Health status state

4. **Write E2E tests** (Murat):
   - Tab navigation flow
   - Search and filter interaction
   - Tool selection and deselection
   - Health badge updates
   - Save tool assignments

---

**Wireframes Complete** ✅
**Ready for Development** 🚀
**Designer Sign-off**: Sally (UX) - Nov 22, 2025
