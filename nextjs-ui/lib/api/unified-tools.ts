/**
 * Unified Tools API Client
 *
 * API client for fetching unified tools (OpenAPI + MCP) from the backend.
 * Story 0.4.1: MCP Tool Discovery UI - API client layer
 */

import { apiClient } from './client';
import type { UnifiedTool } from '@/types/tools';

/**
 * Derive tool icon emoji based on tool name and source type
 *
 * Uses keyword matching to assign semantic icons:
 * - File operations: 📄📝🗑️🔍📂
 * - Database: 📊💾
 * - Network: 🌐📡
 * - Defaults: 🔌 (MCP), 🔧 (OpenAPI)
 */
function deriveToolIcon(name: string, sourceType: 'openapi' | 'mcp'): string {
  const lowerName = name.toLowerCase();

  // File operations
  if (lowerName.includes('read') && lowerName.includes('file')) return '📄';
  if (lowerName.includes('write') || lowerName.includes('create')) return '📝';
  if (lowerName.includes('delete') || lowerName.includes('remove')) return '🗑️';
  if (lowerName.includes('search') || lowerName.includes('find')) return '🔍';
  if (lowerName.includes('list') || lowerName.includes('dir')) return '📂';

  // Database operations
  if (lowerName.includes('sql') || lowerName.includes('query')) return '📊';
  if (lowerName.includes('database') || lowerName.includes('db')) return '💾';

  // Network operations
  if (lowerName.includes('fetch') || lowerName.includes('http')) return '🌐';
  if (lowerName.includes('api') || lowerName.includes('request')) return '📡';

  // System operations
  if (lowerName.includes('shell') || lowerName.includes('exec')) return '💻';
  if (lowerName.includes('process') || lowerName.includes('run')) return '⚙️';

  // Default fallbacks
  return sourceType === 'mcp' ? '🔌' : '🔧';
}

/**
 * Fetch all unified tools for a tenant
 *
 * Calls GET /api/v1/unified-tools/ with tenant isolation header.
 * Backend caches results for 60s, frontend should use React Query
 * with matching staleTime.
 *
 * @param tenantId - Tenant UUID for filtering tools
 * @returns Array of unified tools with derived icons
 * @throws Error if API request fails
 *
 * @example
 * const tools = await getUnifiedTools('test-tenant-id');
 * const mcpTools = tools.filter(t => t.source_type === 'mcp');
 */
export const getUnifiedTools = async (tenantId: string): Promise<UnifiedTool[]> => {
  const response = await apiClient.get<UnifiedTool[]>('/api/v1/unified-tools/', {
    headers: {
      'X-Tenant-ID': tenantId,
    },
  });

  // Enhance tools with derived icons
  return response.data.map(tool => ({
    ...tool,
    icon: deriveToolIcon(tool.name, tool.source_type),
  }));
};
