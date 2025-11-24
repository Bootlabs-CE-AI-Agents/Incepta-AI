/**
 * useLLMModels Hook
 * Fetches available LLM models for prompt testing
 *
 * Story: nextjs-story-29-prompts-llm-test
 * AC: AC-1 (Model selector dropdown)
 */

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  pricing: {
    input: number;
    output: number;
  };
}

/**
 * Fetch available LLM models from backend
 * Cache for 5 minutes (models don't change frequently)
 */
export function useLLMModels() {
  return useQuery<LLMModel[]>({
    queryKey: ['llm', 'models'],
    queryFn: async () => {
      const response = await axios.get('/api/v1/llm/models');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
