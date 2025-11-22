/**
 * React Query Hook for Unified Tools
 *
 * Fetches all available tools (OpenAPI + MCP) for a tenant with caching.
 * Story 0.4.1: MCP Tool Discovery UI - Data fetching layer
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { getUnifiedTools } from '@/lib/api/unified-tools';
import type { UnifiedTool } from '@/types/tools';

/**
 * Fetch unified tools for a tenant with React Query caching
 *
 * Cache Strategy:
 * - staleTime: 60s (matches backend cache TTL)
 * - gcTime: 120s (keep in memory for 2 minutes)
 * - Only fetches if tenantId is provided
 *
 * @param tenantId - Tenant UUID (empty string disables query)
 * @returns React Query result with tools array
 *
 * @example
 * const { data: tools, isLoading, error } = useUnifiedTools(tenantId);
 * const mcpTools = tools?.filter(t => t.source_type === 'mcp') ?? [];
 */
export function useUnifiedTools(tenantId: string): UseQueryResult<UnifiedTool[], Error> {
  return useQuery<UnifiedTool[], Error>({
    queryKey: ['unified-tools', tenantId],
    queryFn: () => getUnifiedTools(tenantId),
    staleTime: 60 * 1000, // 60s - matches backend cache
    gcTime: 120 * 1000, // 2min - keep in cache longer than stale
    enabled: !!tenantId, // Only fetch if tenant ID exists
    retry: 2, // Retry failed requests twice
    refetchOnWindowFocus: false, // Don't refetch on tab focus (data is stable)
  });
}
