/**
 * MCP Servers API Functions
 *
 * API client functions for MCP server CRUD operations
 * including health check and tool discovery
 */

import { apiClient } from './client';
import type {
  MCPServerCreateData,
  MCPServerUpdateData,
  MCPTestConnectionInput,
  MCPTransportType,
  EnvVar
} from '../validations';

/**
 * MCP Server API Response Type
 * Flat structure matching backend Pydantic schema
 */
export interface MCPServer {
  id: string;
  name: string;
  transport_type: MCPTransportType;
  description?: string;

  // stdio transport fields (omitted for http_sse servers)
  command?: string;
  args?: string[];
  env?: EnvVar[];
  cwd?: string;

  // http_sse transport fields (omitted for stdio servers)
  url?: string;
  headers?: Record<string, string>;
  timeout?: number;

  // Discovered capabilities
  discovered_tools?: Array<{
    name: string;
    description?: string;
    inputSchema: Record<string, unknown>;
  }>;
  discovered_resources?: Array<{
    uri: string;
    name?: string;
    description?: string;
    mimeType?: string;
  }>;
  discovered_prompts?: Array<{
    name: string;
    description?: string;
    arguments?: Array<{
      name: string;
      description?: string;
      required?: boolean;
    }>;
  }>;

  // Health and status
  status: 'active' | 'inactive' | 'error';
  last_health_check?: string;
  error_message?: string;
  consecutive_failures: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Tool Discovery Response Type
 */
export interface ToolDiscoveryResponse {
  success: boolean;
  tools: Array<{
    name: string;
    description?: string;
    input_schema: Record<string, unknown>;
  }>;
  error?: string;
}

/**
 * Health Check Log Entry
 */
export interface HealthCheckLog {
  id: string;
  server_id: string;
  status: 'healthy' | 'unhealthy';
  response_time_ms?: number;
  error?: string;
  checked_at: string;
}

/**
 * List all MCP servers
 */
export const getMCPServers = async (): Promise<MCPServer[]> => {
  const response = await apiClient.get<MCPServer[]>('/api/v1/mcp-servers');
  return response.data;
};

/**
 * Get single MCP server by ID
 */
export const getMCPServer = async (id: string): Promise<MCPServer> => {
  const response = await apiClient.get<MCPServer>(`/api/v1/mcp-servers/${id}`);
  return response.data;
};

/**
 * Create new MCP server
 */
export const createMCPServer = async (
  data: MCPServerCreateData
): Promise<MCPServer> => {
  const response = await apiClient.post<MCPServer>('/api/v1/mcp-servers', data);
  return response.data;
};

/**
 * Update existing MCP server
 */
export const updateMCPServer = async (
  id: string,
  data: MCPServerUpdateData
): Promise<MCPServer> => {
  const response = await apiClient.patch<MCPServer>(
    `/api/v1/mcp-servers/${id}`,
    data
  );
  return response.data;
};

/**
 * Delete MCP server
 */
export const deleteMCPServer = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/v1/mcp-servers/${id}`);
};

/**
 * MCP Server response from /discover endpoint
 */
interface MCPServerDiscoverResponse {
  id: string;
  status: string;
  discovered_tools: Array<{
    name: string;
    description?: string;
    inputSchema: Record<string, unknown>;
  }>;
  error_message?: string;
}

/**
 * Test connection and discover tools
 */
export const testMCPServerConnection = async (
  data: MCPTestConnectionInput
): Promise<ToolDiscoveryResponse> => {
  const response = await apiClient.post<MCPServerDiscoverResponse>(
    `/api/v1/mcp-servers/${data.server_id}/discover`
  );

  // Transform MCPServerResponse to ToolDiscoveryResponse
  const serverResponse = response.data;
  return {
    success: serverResponse.status === 'active',
    tools: (serverResponse.discovered_tools || []).map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema
    })),
    error: serverResponse.error_message || undefined
  };
};

/**
 * Get health check logs for a server
 */
export const getMCPServerHealthLogs = async (
  serverId: string,
  limit: number = 10
): Promise<HealthCheckLog[]> => {
  const response = await apiClient.get<HealthCheckLog[]>(
    `/api/v1/mcp-servers/${serverId}/health-logs`,
    { params: { limit } }
  );
  return response.data;
};
