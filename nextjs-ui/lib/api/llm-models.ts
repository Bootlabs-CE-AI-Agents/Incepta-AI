/**
 * LLM Models API Functions
 *
 * API client functions for LiteLLM model discovery and management.
 * Integrates with the backend LiteLLM proxy to dynamically fetch available models.
 */

import { apiClient } from './client';

/**
 * Model Information from LiteLLM
 */
export interface ModelInfo {
  id: string; // e.g., "gpt-4", "claude-3-opus-20240229"
  name: string; // e.g., "GPT-4", "Claude 3 Opus"
  provider: string; // e.g., "openai", "anthropic", "xai"
  max_tokens?: number; // Maximum context window
  supports_function_calling: boolean; // Whether model supports function calling
  litellm_provider?: string; // Internal LiteLLM provider identifier
  mode?: string; // e.g., "chat", "completion"
}

/**
 * Get available models from LiteLLM proxy
 *
 * Fetches the list of currently configured models from the LiteLLM proxy.
 * Results are cached on the backend for 5 minutes for performance.
 *
 * @param forceRefresh - If true, bypass backend cache and fetch fresh from LiteLLM
 * @returns Promise resolving to array of available models
 */
export const getAvailableModels = async (forceRefresh: boolean = false): Promise<ModelInfo[]> => {
  const response = await apiClient.get<ModelInfo[]>('/api/llm-models/available', {
    params: {
      force_refresh: forceRefresh,
    },
  });
  return response.data;
};
