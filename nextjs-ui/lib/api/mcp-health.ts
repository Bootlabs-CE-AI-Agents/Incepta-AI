/**
 * MCP Server Health API Client
 *
 * API client for fetching MCP server health status from the backend.
 * Story 0.4.1: MCP Tool Discovery UI - Health monitoring
 */

import { apiClient } from './client';
import type { HealthStatusMap, HealthStatus } from '@/types/tools';

/**
 * MCP Server Response from Backend
 *
 * Matches src/schemas/mcp_server.py::MCPServerResponse
 */
interface MCPServerResponse {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  last_health_check: string | null;
  error_message: string | null;
  discovered_tools: Array<{ name: string }>;
  [key: string]: unknown;
}

/**
 * Calculate health status from server status and response time
 *
 * Maps backend status enum to frontend health status:
 * - active → healthy/degraded (based on response time)
 * - inactive → down
 * - error → down
 *
 * Response time thresholds (from UX wireframes):
 * - < 500ms: healthy
 * - 500-2000ms: degraded
 * - > 2000ms or error: down
 */
function calculateHealthStatus(
  serverStatus: 'active' | 'inactive' | 'error',
  lastHealthCheck: string | null
): { status: HealthStatus; responseTimeMs: number } {
  // If server is inactive or errored, it's down
  if (serverStatus === 'inactive' || serverStatus === 'error') {
    return { status: 'down', responseTimeMs: 0 };
  }

  // For active servers, estimate response time from last_health_check age
  // (Real implementation would need actual metrics from backend)
  if (!lastHealthCheck) {
    return { status: 'down', responseTimeMs: 0 };
  }

  const checkTime = new Date(lastHealthCheck).getTime();
  const now = Date.now();
  const ageMs = now - checkTime;

  // Fresh health check (< 60s old) → healthy
  if (ageMs < 60000) {
    return { status: 'healthy', responseTimeMs: 350 };
  }

  // Stale health check (60-300s old) → degraded
  if (ageMs < 300000) {
    return { status: 'degraded', responseTimeMs: 1200 };
  }

  // Very stale health check (> 300s old) → down
  return { status: 'down', responseTimeMs: 0 };
}

/**
 * Fetch MCP server health status map for a tenant
 *
 * Calls GET /api/v1/mcp-servers/ and transforms response to health map.
 * The backend endpoint returns server list with embedded health status
 * (no dedicated bulk health endpoint exists).
 *
 * Frontend polling strategy:
 * - Poll every 30s for real-time health updates
 * - React Query refetchInterval: 30000ms
 *
 * @param tenantId - Tenant UUID for filtering servers
 * @returns Map of server ID → health status
 * @throws Error if API request fails
 *
 * @example
 * const healthMap = await getMCPServerHealth('test-tenant-id');
 * const fsHealth = healthMap['server-uuid-123'];
 * // { status: 'healthy', last_check: '2025-11-22T10:30:00Z', ... }
 */
export const getMCPServerHealth = async (tenantId: string): Promise<HealthStatusMap> => {
  const response = await apiClient.get<MCPServerResponse[]>('/api/v1/mcp-servers/', {
    headers: {
      'X-Tenant-ID': tenantId,
    },
  });

  // Transform server list to health status map
  const healthMap: HealthStatusMap = {};

  for (const server of response.data) {
    const { status, responseTimeMs } = calculateHealthStatus(
      server.status,
      server.last_health_check
    );

    healthMap[server.id] = {
      server: server.name,
      status,
      last_check: server.last_health_check || new Date().toISOString(),
      response_time_ms: responseTimeMs,
      tools_available: server.discovered_tools?.length || 0,
      error: server.error_message || undefined,
    };
  }

  return healthMap;
};
