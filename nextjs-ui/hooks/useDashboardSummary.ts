/**
 * Dashboard Summary Hook
 *
 * React hook for fetching dashboard summary metrics using React Query
 * with automatic revalidation and error handling
 */

import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary, type DashboardSummary } from '@/lib/api/dashboard';
import { useTenantStore } from '@/lib/stores/useTenantStore';

/**
 * Hook for dashboard summary data
 *
 * Fetches dashboard metrics including:
 * - Active agents count
 * - Today's execution statistics
 * - Average response time (24h)
 * - Error rate with classification
 * - Recent activity feed
 *
 * Results are cached on backend for 60s, and React Query provides
 * client-side caching with automatic revalidation.
 *
 * @param refreshInterval - Optional refresh interval in milliseconds (default: 30000 = 30s)
 * @returns React Query response with data, error, isLoading, and refetch
 *
 * @example
 * ```tsx
 * function DashboardPage() {
 *   const { data, error, isLoading } = useDashboardSummary();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return (
 *     <div>
 *       <h1>Active Agents: {data.active_agents.count}</h1>
 *       <p>Executions Today: {data.executions_today.total}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useDashboardSummary(refreshInterval: number = 30000) {
  // Include tenant ID in query key to refetch when tenant changes
  const selectedTenant = useTenantStore((state) => state.selectedTenant);
  const tenantId = selectedTenant?.tenant_id;

  return useQuery<DashboardSummary, Error>({
    queryKey: ['dashboard', 'summary', tenantId],
    queryFn: getDashboardSummary,
    refetchInterval: refreshInterval,
    staleTime: 5 * 1000, // Consider data stale after 5s (prevent duplicate requests)
    gcTime: 60 * 1000,   // Keep data in cache for 60s
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled: !!tenantId, // Only fetch when tenant is selected
  });
}
