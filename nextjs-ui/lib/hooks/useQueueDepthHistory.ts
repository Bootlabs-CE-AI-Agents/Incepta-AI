/**
 * React Query Hook for Queue Depth History
 *
 * Fetches queue depth time-series data for visualizing processing trends.
 * Provides automatic caching and real-time updates.
 */

import { useQuery } from '@tanstack/react-query';
import { getQueueDepthHistory, QueueDepthDataPoint } from '@/lib/api/queue';

/**
 * Hook to fetch queue depth history for the specified time range
 *
 * @param minutes - Number of minutes of history to fetch (default: 720 = 12 hours)
 * @returns React Query result with queue depth data points
 */
export function useQueueDepthHistory(minutes: number = 720) {
  return useQuery<QueueDepthDataPoint[], Error>({
    queryKey: ['queue', 'depth-history', minutes],
    queryFn: () => getQueueDepthHistory(minutes),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000,       // Consider data stale after 2 minutes
    retry: 3,                        // Retry failed requests 3 times
  });
}
