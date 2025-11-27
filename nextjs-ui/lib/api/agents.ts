/**
 * Agents API Functions
 *
 * API client functions for agent CRUD operations
 * including LLM configuration and tool assignment
 */

import { apiClient } from './client';
import type {
  AgentCreateData,
  AgentUpdateData,
  AgentTestInput,
  LLMConfig,
  MCPToolAssignment
} from '../validations';

/**
 * Agent API Response Type
 */
export interface Agent {
  id: string;
  name: string;
  type?: 'conversational' | 'tool_based' | 'langgraph' | 'custom';
  description?: string;
  system_prompt: string;
  llm_config: LLMConfig;
  tool_ids: string[];
  status: 'draft' | 'active' | 'suspended' | 'inactive';
  is_active?: boolean; // Deprecated: use status instead
  cognitive_architecture: 'react' | 'single_step' | 'plan_and_solve';
  tools_count?: number;
  last_run?: string;
  created_at: string;
  updated_at: string;
  webhook_url?: string;
  hmac_secret_masked?: string;
  tenant_id?: string;
  created_by?: string;
  triggers?: Array<{
    id: string;
    trigger_type: string;
    webhook_url: string;
  }>;
  mcp_tool_assignments?: unknown[];
}

/**
 * Agent Test Response Type
 */
export interface AgentTestResponse {
  test_id: string;
  agent_id: string;
  status: string;
  execution_trace: {
    steps: Array<{
      step_number: number;
      step_type: string;
      tool_name?: string;
      model?: string;
      input: Record<string, unknown>;
      output: Record<string, unknown>;
      timestamp: string;
      duration_ms: number;
    }>;
    total_duration_ms: number;
    status: string;
  };
  token_usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    estimated_cost_usd: number;
  };
  execution_time: {
    total_duration_ms: number;
    steps: Array<{
      name: string;
      duration_ms: number;
    }>;
  };
  errors: unknown | null;
  created_at: string;
}

/**
 * Paginated Agents Response Type
 */
interface AgentsResponse {
  items: Agent[];
  total: number;
  skip: number;
  limit: number;
}

/**
 * List all agents
 */
export const getAgents = async (): Promise<Agent[]> => {
  const response = await apiClient.get<AgentsResponse>('/api/v1/agents');
  return response.data.items;
};

/**
 * Get single agent by ID
 */
export const getAgent = async (id: string): Promise<Agent> => {
  const response = await apiClient.get<Agent>(`/api/v1/agents/${id}`);
  return response.data;
};

/**
 * Create new agent
 */
export const createAgent = async (data: AgentCreateData): Promise<Agent> => {
  const response = await apiClient.post<Agent>('/api/v1/agents', data);
  return response.data;
};

/**
 * Update existing agent
 */
export const updateAgent = async (
  id: string,
  data: AgentUpdateData
): Promise<Agent> => {
  const response = await apiClient.put<Agent>(`/api/v1/agents/${id}`, data);
  return response.data;
};

/**
 * Delete agent
 */
export const deleteAgent = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/v1/agents/${id}`);
};

/**
 * Test agent execution
 */
export const testAgent = async (
  id: string,
  data: AgentTestInput
): Promise<AgentTestResponse> => {
  const response = await apiClient.post<AgentTestResponse>(
    `/api/v1/agents/${id}/test`,
    data
  );
  return response.data;
};

/**
 * Tool Assignment Payload
 * Separates OpenAPI tools (tool_ids) from MCP tools (mcp_tool_assignments)
 */
interface ToolAssignmentPayload {
  tool_ids: string[];
  mcp_tool_assignments?: MCPToolAssignment[];
}

/**
 * Assign tools to agent
 * Uses the standard update endpoint with both tool_ids and mcp_tool_assignments
 *
 * @param id - Agent ID
 * @param toolIds - OpenAPI tool UUIDs
 * @param mcpToolAssignments - MCP tool assignments with full metadata
 */
export const assignTools = async (
  id: string,
  toolIds: string[],
  mcpToolAssignments?: MCPToolAssignment[]
): Promise<Agent> => {
  const payload: ToolAssignmentPayload = {
    tool_ids: toolIds,
  };

  if (mcpToolAssignments && mcpToolAssignments.length > 0) {
    payload.mcp_tool_assignments = mcpToolAssignments;
  }

  const response = await apiClient.put<Agent>(`/api/v1/agents/${id}`, payload);
  return response.data;
};

/**
 * Activate agent (transition from DRAFT to ACTIVE status)
 */
export const activateAgent = async (id: string): Promise<Agent> => {
  const response = await apiClient.post<Agent>(`/api/v1/agents/${id}/activate`);
  return response.data;
};
