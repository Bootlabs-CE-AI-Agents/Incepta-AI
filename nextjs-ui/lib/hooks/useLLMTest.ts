/**
 * useLLMTest Hook
 * Mutation hook for testing prompts with real LLMs
 *
 * Story: nextjs-story-29-prompts-llm-test
 * AC: AC-2 (Run Test with Loading State)
 */

import { useMutation } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';

export interface LLMTestParams {
  system_prompt: string;
  user_message: string;
  model: string;
  temperature: number;
  max_tokens: number;
}

export interface LLMTestResponse {
  response: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  execution_time: number; // seconds
  cost: number; // USD
  model: string;
}

export interface LLMTestError {
  type: 'network' | 'api' | 'timeout' | 'rate_limit' | 'invalid_model';
  message: string;
  details?: string;
  status?: number;
}

/**
 * Test prompt with LLM
 * Timeout: 60 seconds, Retry: 3 attempts
 */
export function useLLMTest() {
  return useMutation<LLMTestResponse, LLMTestError, LLMTestParams>({
    mutationFn: async (params: LLMTestParams) => {
      try {
        const response = await axios.post('/api/v1/llm/test', params, {
          timeout: 60000, // 60 seconds
        });
        return response.data;
      } catch (error) {
        // Map errors to user-friendly messages (AC-6)
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;

          if (axiosError.code === 'ECONNABORTED') {
            throw {
              type: 'timeout',
              message: 'Request timed out after 60s',
              details: 'Try reducing max tokens or try again later.',
            };
          }

          if (!axiosError.response) {
            throw {
              type: 'network',
              message: 'Unable to connect',
              details: 'Check your internet connection and try again.',
            };
          }

          const status = axiosError.response.status;

          if (status === 429) {
            throw {
              type: 'rate_limit',
              message: 'Rate limit exceeded',
              details: 'Wait a moment and retry.',
              status,
            };
          }

          if (status === 500) {
            throw {
              type: 'api',
              message: 'LLM service error',
              details: 'Please try again later.',
              status,
            };
          }

          if (status === 400) {
            const responseData = axiosError.response.data as { detail?: string } | undefined;
            throw {
              type: 'invalid_model',
              message: 'Invalid model or parameters',
              details: responseData?.detail || 'Check your configuration and try again.',
              status,
            };
          }

          const responseData = axiosError.response.data as { detail?: string } | undefined;
          throw {
            type: 'api',
            message: 'API Error',
            details: responseData?.detail || 'An unexpected error occurred.',
            status,
          };
        }

        throw {
          type: 'api',
          message: 'Unknown error',
          details: 'An unexpected error occurred. Please try again.',
        };
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
