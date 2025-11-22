/**
 * API client for Agent Prompt Versions
 * Handles version history, retrieval, and reversion for agent system prompts
 */

import { apiClient } from './client';
import type { PromptVersionResponse, PromptVersionDetail, RevertVersionRequest } from '@/types/prompts';

/**
 * Get prompt version history for an agent
 * 
 * @param agentId - Agent UUID
 * @param limit - Max versions to return (default 20, max 100)
 * @param offset - Pagination offset
 */
export async function getAgentPromptVersions(
  agentId: string,
  limit: number = 20,
  offset: number = 0
): Promise<PromptVersionResponse[]> {
  const response = await apiClient.get<PromptVersionResponse[]>(
    `/api/v1/agents/${agentId}/prompt-versions`,
    { params: { limit, offset } }
  );
  return response.data;
}

/**
 * Get detailed prompt version with full text
 * 
 * @param agentId - Agent UUID
 * @param versionId - Version UUID
 */
export async function getAgentPromptVersionDetail(
  agentId: string,
  versionId: string
): Promise<PromptVersionDetail> {
  const response = await apiClient.get<PromptVersionDetail>(
    `/api/v1/agents/${agentId}/prompt-versions/${versionId}`
  );
  return response.data;
}

/**
 * Revert agent to a previous prompt version
 * 
 * @param agentId - Agent UUID
 * @param request - Version to revert to
 */
export async function revertAgentPromptVersion(
  agentId: string,
  request: RevertVersionRequest
): Promise<boolean> {
  const response = await apiClient.post<{ success: boolean }>(
    `/api/v1/agents/${agentId}/prompt-versions/revert`,
    request
  );
  return response.data.success;
}
