/**
 * React Query Hook for MCP Server Health
 *
 * Polls MCP server health status every 30s for real-time monitoring.
 * Story 0.4.1: MCP Tool Discovery UI - Health polling layer
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { getMCPServerHealth } from '@/lib/api/mcp-health';
import type { HealthStatusMap } from '@/types/tools';

/**
 * Fetch and poll MCP server health status with real-time updates
 *
 * Polling Strategy:
 * - refetchInterval: 30s (real-time health updates)
 * - staleTime: 10s (consider fresh for 10s)
 * - gcTime: 60s (keep in cache for 1min)
 * - Background refetch enabled for real-time updates
 *
 * @param tenantId - Tenant UUID (empty string disables query)
 * @returns React Query result with health status map
 *
 * @example
 * const { data: healthStatus } = useMCPServerHealth(tenantId);
 * const fsHealth = healthStatus?.['server-uuid-123'];
 * // { status: 'healthy', response_time_ms: 350, ... }
 */
export function useMCPServerHealth(tenantId: string): UseQueryResult<HealthStatusMap, Error> {
  return useQuery<HealthStatusMap, Error>({
    queryKey: ['mcp-health', tenantId],
    queryFn: () => getMCPServerHealth(tenantId),
    refetchInterval: 30 * 1000, // Poll every 30s for real-time health
    staleTime: 10 * 1000, // Consider fresh for 10s
    gcTime: 60 * 1000, // Keep in cache for 1min
    enabled: !!tenantId, // Only fetch if tenant ID exists
    retry: 1, // Only retry once for health checks (fail fast)
    refetchOnWindowFocus: true, // Refetch on tab focus (health is volatile)
    refetchOnReconnect: true, // Refetch on network reconnect
  });
}
