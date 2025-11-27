/**
 * Tool Types - MCP Tool Discovery
 *
 * TypeScript types for unified tool management (OpenAPI + MCP tools)
 * Matches backend API schema from Story 11.2.5
 */

/**
 * Source type for tools
 */
export type ToolSourceType = 'openapi' | 'mcp';

/**
 * MCP Server Health Status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'down';

/**
 * Unified Tool Interface
 *
 * Combines OpenAPI tools and MCP tools into single interface
 * for the tool discovery UI
 */
export interface UnifiedTool {
  /** Unique tool identifier (e.g., "openapi_tool_1" or "filesystem/read_file") */
  id: string;

  /** Human-readable tool name */
  name: string;

  /** Tool description */
  description: string;

  /** Source type: openapi or mcp */
  source_type: ToolSourceType;

  /** MCP server name (only for MCP tools) */
  mcp_server?: string;

  /** MCP server ID (UUID, only for MCP tools) */
  mcp_server_id?: string;

  /** MCP server name from backend (only for MCP tools) */
  mcp_server_name?: string;

  /** MCP primitive type: tool, resource, or prompt (only for MCP tools) */
  mcp_primitive_type?: 'tool' | 'resource' | 'prompt';

  /** Tool icon emoji (derived from category or name) */
  icon?: string;

  /** Tool schema (JSON Schema for parameters) */
  schema?: Record<string, any>;

  /** Input schema from backend */
  input_schema?: Record<string, any>;

  /** Whether tool is enabled */
  enabled?: boolean;
}

/**
 * MCP Server Health Status Response
 *
 * Real-time health monitoring for MCP servers
 */
export interface MCPServerHealth {
  /** Server name */
  server: string;

  /** Health status */
  status: HealthStatus;

  /** Last health check timestamp (ISO 8601) */
  last_check: string;

  /** Response time in milliseconds */
  response_time_ms: number;

  /** Number of tools available from this server */
  tools_available: number;

  /** Error message (if status is 'down') */
  error?: string;
}

/**
 * Health Status Map
 *
 * Maps server names to their health status
 */
export type HealthStatusMap = Record<string, MCPServerHealth>;

/**
 * Tool Selection State
 *
 * Tracks selected tools by source type
 */
export interface ToolSelectionState {
  /** Selected OpenAPI tool IDs */
  openapi: Set<string>;

  /** Selected MCP tool IDs (format: "server/tool_name") */
  mcp: Set<string>;
}

/**
 * Unified Tools API Response
 */
export interface UnifiedToolsResponse {
  /** List of all available tools (OpenAPI + MCP) */
  tools: UnifiedTool[];

  /** Total count */
  total: number;
}

/**
 * MCP Health Status API Response
 */
export interface MCPHealthStatusResponse {
  /** Map of server name to health status */
  health_status: HealthStatusMap;

  /** Timestamp of health check (ISO 8601) */
  checked_at: string;
}

/**
 * MCP Tool Assignment
 *
 * Proper MCP tool assignment structure expected by backend
 */
export interface MCPToolAssignment {
  /** Deterministic UUID for the tool */
  id: string;
  /** Tool name */
  name: string;
  /** Always "mcp" for MCP tools */
  source_type: 'mcp';
  /** MCP server UUID */
  mcp_server_id: string;
  /** MCP server name */
  mcp_server_name: string;
  /** MCP primitive type */
  mcp_primitive_type: 'tool' | 'resource' | 'prompt';
}

/**
 * Tool Assignment Payload
 *
 * Sent to backend when saving agent tool assignments
 */
export interface ToolAssignmentPayload {
  /** OpenAPI tool IDs to assign */
  tool_ids: string[];

  /** MCP tool assignments with full metadata */
  mcp_tool_assignments: MCPToolAssignment[];
}
