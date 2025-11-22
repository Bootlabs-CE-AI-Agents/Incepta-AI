/**
 * React Query Hook for LiteLLM Available Models
 *
 * Fetches the list of available models from the LiteLLM proxy.
 * Provides automatic caching (5 minutes) matching backend cache duration.
 */

import { useQuery } from '@tanstack/react-query';
import { getAvailableModels, ModelInfo } from '@/lib/api/llm-models';

/**
 * Hook to fetch available models from LiteLLM
 *
 * @param forceRefresh - If true, bypass cache and fetch fresh from LiteLLM
 * @returns React Query result with available models
 */
export function useAvailableModels(forceRefresh: boolean = false) {
  return useQuery<ModelInfo[], Error>({
    queryKey: ['llm-models', 'available', forceRefresh],
    queryFn: () => getAvailableModels(forceRefresh),
    staleTime: 5 * 60 * 1000, // 5 minutes (match backend cache TTL)
    gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
    retry: 2,                  // Retry failed requests twice
    refetchOnWindowFocus: false, // Don't refetch on window focus (data rarely changes)
  });
}
