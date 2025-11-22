# Sprint 2 Session Handoff - MCP Tool Discovery

**Session End**: 2025-11-22, Token Usage: 130k/200k (65%)
**Handoff To**: Next YOLO mode session
**Status**: 🚧 Ready to continue implementation

---

## TL;DR - Start Here

**What's Done**:
- ✅ Sprint 1 Retrospective (team alignment on process improvements)
- ✅ UX Wireframes (650 lines, production-ready)
- ✅ TypeScript Types (115 lines, all interfaces defined)

**What's Next**:
1. Verify MCP health endpoint schema (`/api/v1/mcp-servers/health`)
2. Create API clients (`unified-tools.ts`, `mcp-health.ts`)
3. Create React Query hooks (`useUnifiedTools`, `useMCPServerHealth`)
4. Build 7 small UI components (start with `HealthBadge`)

**Critical Files to Review**:
- `docs/ux-wireframes-mcp-tool-discovery.md` - Complete UX spec
- `nextjs-ui/types/tools.ts` - TypeScript interfaces
- `docs/sprint-2-progress-report.md` - Detailed progress tracking

---

## Backend API Endpoints (Verified)

### 1. Unified Tools Endpoint ✅
```
GET /api/v1/unified-tools/
Headers: X-Tenant-ID: {tenant_id}

Response: list[UnifiedTool]
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "get_weather",
    "description": "Get current weather information",
    "source_type": "openapi",  // or "mcp"
    "openapi_tool_id": 123,     // null for MCP tools
    "mcp_server_id": null,       // UUID for MCP tools
    "mcp_primitive_type": null,  // "tool" | "resource" | "prompt" for MCP
    "mcp_server_name": null,     // string for MCP tools
    "input_schema": {...},       // JSON Schema
    "enabled": true
  }
]
```

**File**: `src/api/unified_tools.py:22`
**Cache**: 60 seconds (in-memory)
**Performance**: <500ms p95 (first call), <10ms (cached)

---

### 2. MCP Health Endpoint ⚠️ NOT YET VERIFIED

**Expected endpoint** (from Streamlit code):
```
GET /api/v1/mcp-servers/health
Query params: tenant_id={tenant_id}

Expected response (needs verification):
{
  "health_status": {
    "filesystem": {
      "server": "filesystem",
      "status": "healthy" | "degraded" | "down",
      "last_check": "2025-11-22T10:30:00Z",
      "response_time_ms": 125,
      "tools_available": 12,
      "error": null | "error message"
    },
    "postgres": {...}
  },
  "checked_at": "2025-11-22T10:30:15Z"
}
```

**ACTION REQUIRED**:
1. Grep for `mcp.*health` in `src/api/` to find endpoint
2. Verify response schema matches TypeScript `MCPHealthStatusResponse`
3. Update types if needed

---

## Frontend Implementation Plan

### Phase 1: API Layer (1.5 SP) - START HERE

#### Step 1: Verify Health Endpoint
```bash
cd /Users/ravi/Documents/nullBytes_Apps/Ai_Agents/AI\ Ops
grep -r "health.*endpoint\|@router.*health" src/api/
```

#### Step 2: Create API Clients

**File 1**: `nextjs-ui/lib/api/unified-tools.ts`
```typescript
/**
 * Unified Tools API Client
 */
import { apiClient } from './client';
import { UnifiedTool } from '@/types/tools';

/**
 * Get all available tools for a tenant (OpenAPI + MCP)
 *
 * Backend caches for 60s, React Query adds client-side caching
 */
export const getUnifiedTools = async (tenantId: string): Promise<UnifiedTool[]> => {
  const response = await apiClient.get<UnifiedTool[]>('/api/v1/unified-tools/', {
    headers: {
      'X-Tenant-ID': tenantId,
    },
  });

  // Transform backend UnifiedTool to frontend UnifiedTool
  return response.data.map(tool => ({
    id: tool.id,
    name: tool.name,
    description: tool.description,
    source_type: tool.source_type,
    mcp_server: tool.mcp_server_name || undefined,
    icon: deriveToolIcon(tool.name, tool.source_type),
    schema: tool.input_schema,
  }));
};

/**
 * Derive emoji icon from tool name
 */
function deriveToolIcon(name: string, sourceType: string): string {
  const lowercaseName = name.toLowerCase();

  // File operations
  if (lowercaseName.includes('read') || lowercaseName.includes('file')) return '📄';
  if (lowercaseName.includes('write')) return '📝';
  if (lowercaseName.includes('delete')) return '🗑️';
  if (lowercaseName.includes('search') || lowercaseName.includes('find')) return '🔍';
  if (lowercaseName.includes('list') || lowercaseName.includes('directory')) return '📂';

  // Database operations
  if (lowercaseName.includes('sql') || lowercaseName.includes('query')) return '📊';
  if (lowercaseName.includes('database') || lowercaseName.includes('db')) return '💾';

  // Network operations
  if (lowercaseName.includes('fetch') || lowercaseName.includes('http')) return '🌐';
  if (lowercaseName.includes('api') || lowercaseName.includes('request')) return '📡';

  // Default icons by source type
  return sourceType === 'mcp' ? '🔌' : '🔧';
}
```

**File 2**: `nextjs-ui/lib/api/mcp-health.ts`
```typescript
/**
 * MCP Server Health API Client
 */
import { apiClient } from './client';
import { HealthStatusMap } from '@/types/tools';

export interface MCPHealthResponse {
  health_status: HealthStatusMap;
  checked_at: string;
}

/**
 * Get MCP server health status
 *
 * Polls server health and returns real-time status
 */
export const getMCPServerHealth = async (tenantId: string): Promise<HealthStatusMap> => {
  const response = await apiClient.get<MCPHealthResponse>(
    '/api/v1/mcp-servers/health',
    {
      params: { tenant_id: tenantId },
    }
  );

  return response.data.health_status;
};
```

---

#### Step 3: Create React Query Hooks

**File 1**: `nextjs-ui/lib/hooks/useUnifiedTools.ts`
```typescript
/**
 * React Query Hook for Unified Tools
 */
import { useQuery } from '@tanstack/react-query';
import { getUnifiedTools } from '@/lib/api/unified-tools';
import { UnifiedTool } from '@/types/tools';

/**
 * Fetch all available tools (OpenAPI + MCP) for a tenant
 *
 * @param tenantId - Tenant UUID (required)
 * @returns React Query result with tools array
 */
export function useUnifiedTools(tenantId: string | undefined) {
  return useQuery<UnifiedTool[], Error>({
    queryKey: ['unified-tools', tenantId],
    queryFn: () => getUnifiedTools(tenantId!),
    enabled: !!tenantId,      // Only fetch if tenant selected
    staleTime: 60 * 1000,     // Match backend cache (60s)
    gcTime: 120 * 1000,       // Keep in cache for 2min
    retry: 2,                  // Retry failed requests twice
  });
}
```

**File 2**: `nextjs-ui/lib/hooks/useMCPServerHealth.ts`
```typescript
/**
 * React Query Hook for MCP Server Health
 */
import { useQuery } from '@tanstack/react-query';
import { getMCPServerHealth } from '@/lib/api/mcp-health';
import { HealthStatusMap } from '@/types/tools';

/**
 * Fetch MCP server health status with real-time polling
 *
 * Polls every 30s to keep health badges up-to-date
 *
 * @param tenantId - Tenant UUID (required)
 * @returns React Query result with health status map
 */
export function useMCPServerHealth(tenantId: string | undefined) {
  return useQuery<HealthStatusMap, Error>({
    queryKey: ['mcp-health', tenantId],
    queryFn: () => getMCPServerHealth(tenantId!),
    enabled: !!tenantId,
    refetchInterval: 30 * 1000,  // Poll every 30s for real-time updates
    staleTime: 10 * 1000,         // Consider fresh for 10s
    retry: 1,                      // Only retry once (health checks should be fast)
  });
}
```

---

### Phase 2: UI Components (2.5 SP)

Build components from smallest to largest (composition pattern):

#### Component 1: HealthBadge (smallest, most reusable)

**File**: `nextjs-ui/components/tools/HealthBadge.tsx`
```typescript
'use client';

import { HealthStatus } from '@/types/tools';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';

interface HealthBadgeProps {
  status: HealthStatus;
  serverName: string;
  lastCheck: string;
  responseTime: number;
  toolsAvailable: number;
  error?: string;
}

const healthConfig = {
  healthy: {
    icon: '🟢',
    label: 'Healthy',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-500',
  },
  degraded: {
    icon: '🟡',
    label: 'Degraded',
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-500',
  },
  down: {
    icon: '🔴',
    label: 'Down',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-500',
  },
};

export function HealthBadge({
  status,
  serverName,
  lastCheck,
  responseTime,
  toolsAvailable,
  error,
}: HealthBadgeProps) {
  const config = healthConfig[status];

  // Format last check time
  const lastCheckDate = new Date(lastCheck);
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - lastCheckDate.getTime()) / 1000);
  const timeAgo = secondsAgo < 60
    ? `${secondsAgo}s ago`
    : `${Math.floor(secondsAgo / 60)}m ago`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${config.bgColor} ${config.textColor}`}
          >
            <span aria-hidden="true">{config.icon}</span>
            <span>{config.label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-semibold flex items-center gap-2">
              <span>{config.icon}</span>
              <span>Server Health: {config.label}</span>
            </div>

            <div className="text-xs space-y-1">
              <div><strong>Server:</strong> {serverName}</div>
              <div><strong>Status:</strong> {status.toUpperCase()}</div>
              <div><strong>Last Check:</strong> {timeAgo}</div>
              <div><strong>Response Time:</strong> {responseTime}ms</div>
              <div><strong>Tools Available:</strong> {toolsAvailable}</div>

              {error && (
                <div className="text-red-400 mt-2">
                  <strong>Error:</strong> {error}
                </div>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

---

#### Component 2: ToolCheckbox

**File**: `nextjs-ui/components/tools/ToolCheckbox.tsx`
```typescript
'use client';

import { UnifiedTool, HealthStatus } from '@/types/tools';
import { Checkbox } from '@/components/ui/Checkbox';
import { HealthBadge } from './HealthBadge';

interface ToolCheckboxProps {
  tool: UnifiedTool;
  isSelected: boolean;
  healthStatus?: {
    status: HealthStatus;
    lastCheck: string;
    responseTime: number;
    toolsAvailable: number;
    error?: string;
  };
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function ToolCheckbox({
  tool,
  isSelected,
  healthStatus,
  onChange,
  disabled = false,
}: ToolCheckboxProps) {
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors cursor-pointer ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${isSelected ? 'bg-primary/10 border-primary' : ''}`}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={`Select ${tool.name} tool from ${tool.mcp_server || 'OpenAPI'}`}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">
              {tool.icon}
            </span>
            <span className="font-semibold text-sm text-foreground">
              {tool.name}
            </span>
          </div>

          {healthStatus && tool.mcp_server && (
            <HealthBadge
              status={healthStatus.status}
              serverName={tool.mcp_server}
              lastCheck={healthStatus.lastCheck}
              responseTime={healthStatus.responseTime}
              toolsAvailable={healthStatus.toolsAvailable}
              error={healthStatus.error}
            />
          )}
        </div>

        <p className="text-xs text-muted-foreground mb-1">
          {tool.description}
        </p>

        {tool.mcp_server && (
          <p className="text-xs text-muted-foreground italic">
            Server: {tool.mcp_server}
          </p>
        )}
      </div>
    </label>
  );
}
```

---

#### Remaining Components (Pseudo-code structure)

**Component 3: ToolList** - Maps tools to ToolCheckbox components
**Component 4: ToolSearchFilter** - Search input + MCP filter + Select All/Clear All
**Component 5: ToolTabs** - Tab navigation (All/OpenAPI/MCP)
**Component 6: SelectedToolsSummary** - Shows OpenAPI count + MCP count
**Component 7: MCPToolDiscovery** - Container coordinating all above

---

### Phase 3: Integration (0.5 SP)

Add to `AgentForm.tsx` after System Prompt section:

```typescript
{/* Tool Assignment & Discovery */}
<div className="space-y-4 pt-4 border-t border-white/20">
  <h3 className="text-lg font-semibold text-text-primary">
    🛠️ Tool Assignment & Discovery
  </h3>

  <MCPToolDiscovery
    tenantId={tenantId}  // Need to pass from parent
    selectedToolIds={form.watch('tool_ids') || []}
    selectedMCPTools={form.watch('mcp_tool_assignments') || []}
    onSelectionChange={(toolIds, mcpTools) => {
      form.setValue('tool_ids', toolIds);
      form.setValue('mcp_tool_assignments', mcpTools);
    }}
  />
</div>
```

---

## Testing Checklist (1 SP)

### Unit Tests (Murat + Amelia)
- [ ] `useUnifiedTools` hook fetches and transforms data
- [ ] `useMCPServerHealth` hook polls every 30s
- [ ] `HealthBadge` displays correct color/icon for each status
- [ ] `ToolCheckbox` renders health badge only for MCP tools
- [ ] `deriveToolIcon()` returns correct emoji for tool names

### E2E Tests (Murat)
- [ ] Tab navigation works with keyboard
- [ ] Search filters tools in real-time
- [ ] MCP server filter shows tool counts
- [ ] Select All/Clear All affect only filtered tools
- [ ] Health badges update when polling returns new data
- [ ] Tool selection persists when switching tabs
- [ ] Save button sends correct payload to backend

---

## Known Issues & Risks

### Issue 1: Health Endpoint Not Verified ⚠️
**Risk**: TypeScript types may not match backend schema
**Mitigation**: Verify endpoint in next session FIRST before building components

### Issue 2: Tenant ID Availability 🤔
**Risk**: AgentForm may not have `tenantId` prop currently
**Mitigation**: Check if parent page has tenant context, may need to fetch from session/auth

### Issue 3: Tool Icon Logic 📍
**Risk**: Icon derivation is basic, may not cover all tool types
**Mitigation**: Can enhance later, start with basic keywords

---

## File Checklist

### ✅ Created This Session:
1. `docs/ux-wireframes-mcp-tool-discovery.md` (650 lines)
2. `nextjs-ui/types/tools.ts` (115 lines)
3. `docs/sprint-2-progress-report.md` (300 lines)
4. `docs/sprint-2-session-handoff.md` (this file)

### ⏸️ To Create Next Session:
1. `nextjs-ui/lib/api/unified-tools.ts` (~80 lines)
2. `nextjs-ui/lib/api/mcp-health.ts` (~60 lines)
3. `nextjs-ui/lib/hooks/useUnifiedTools.ts` (~40 lines)
4. `nextjs-ui/lib/hooks/useMCPServerHealth.ts` (~45 lines)
5. `nextjs-ui/components/tools/HealthBadge.tsx` (~90 lines)
6. `nextjs-ui/components/tools/ToolCheckbox.tsx` (~100 lines)
7. `nextjs-ui/components/tools/ToolList.tsx` (~80 lines)
8. `nextjs-ui/components/tools/ToolSearchFilter.tsx` (~120 lines)
9. `nextjs-ui/components/tools/ToolTabs.tsx` (~70 lines)
10. `nextjs-ui/components/tools/SelectedToolsSummary.tsx` (~70 lines)
11. `nextjs-ui/components/tools/MCPToolDiscovery.tsx` (~180 lines)
12. `nextjs-ui/e2e/mcp-tool-assignment.spec.ts` (~150 lines)

**Total Remaining**: ~1,085 lines across 12 files

---

## Progress Summary

### Sprint 1 ✅
- Delivered: 4 SP / 4 SP (100%)
- Build: ✅ Zero errors
- Quality: ✅ Zero bugs

### Sprint 2 🚧
- Completed: 1.5 SP / 24 SP (6%)
- In Progress: 0.5 SP (API verification)
- Remaining: 22 SP

### Story 0.4.1 - MCP Tool Discovery 🚧
- Completed: 1.5 SP / 7 SP (21%)
- Remaining: 5.5 SP
- Estimated Completion: 8-10 hours (~2 sessions)

---

## Next Session Start Commands

```bash
# 1. Verify health endpoint
cd /Users/ravi/Documents/nullBytes_Apps/Ai_Agents/AI\ Ops
grep -rn "health.*mcp\|@router.*health" src/api/

# 2. Check if Tooltip component exists
ls nextjs-ui/components/ui/Tooltip.tsx

# 3. Start creating API clients
# Follow pseudo-code above in Phase 1

# 4. Test API clients manually
npm run dev  # Start Next.js dev server
# Open browser DevTools → Network tab
# Check if /api/v1/unified-tools/ returns data
```

---

## Team Status

**Amelia (Dev)**: Ready to build API clients and components
**Sally (UX)**: Wireframes complete, available for design questions
**Winston (Architect)**: Reviewed types, approved architecture
**Murat (TEA)**: Ready to write E2E tests after components done
**Bob (SM)**: Tracking velocity, on pace for 3-week sprint

---

**Handoff Complete** ✅
**Resume Point**: Verify health endpoint → Create API clients → Build HealthBadge
**Mode**: YOLO (Autonomous)
**Token Budget**: 130k/200k used (save next 70k for implementation)
