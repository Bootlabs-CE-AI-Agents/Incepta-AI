/**
 * Workers React Query Hooks
 *
 * Custom hooks for worker monitoring operations using TanStack Query v5
 * Implements AC-5 (auto-refresh) and AC-8 (backend API integration)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { workersApi } from '../api/workers';
import type { WorkerStatus, WorkerLogsResponse, WorkerRestartResponse, WorkerMetrics } from '../api/workers';

/**
 * Query keys for cache management
 */
export const workerKeys = {
  all: ['workers'] as const,
  lists: () => [...workerKeys.all, 'list'] as const,
  logs: (hostname: string) => [...workerKeys.all, 'logs', hostname] as const,
  metrics: (hostname: string) => [...workerKeys.all, 'metrics', hostname] as const,
};

/**
 * Fetch all workers with auto-refresh (AC-5, AC-8)
 *
 * @param enabled - Enable/disable auto-refresh (default: true)
 * @returns UseQueryResult with WorkerStatus[] array
 *
 * Configuration per AC-8:
 * - staleTime: 30s (prevent unnecessary refetches)
 * - refetchInterval: 30s (auto-refresh when enabled)
 * - refetchOnWindowFocus: false (prevent refetch on tab switch)
 * - retry: 3 attempts with exponential backoff
 */
export const useWorkers = (enabled: boolean = true) => {
  return useQuery<WorkerStatus[], Error>({
    queryKey: workerKeys.lists(),
    queryFn: workersApi.listWorkers,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: enabled ? 30 * 1000 : false, // Auto-refresh every 30s when enabled
    refetchOnWindowFocus: false, // AC-8: Don't refetch on window focus
    retry: 3, // AC-8: 3 attempts with exponential backoff
  });
};

/**
 * Fetch worker logs
 *
 * @param hostname - Worker hostname
 * @param lines - Number of log lines to fetch (default: 100)
 * @param enabled - Enable query (default: false, only fetch when modal opens)
 */
export const useWorkerLogs = (hostname: string | null, lines: number = 100, enabled: boolean = false) => {
  return useQuery<WorkerLogsResponse, Error>({
    queryKey: workerKeys.logs(hostname || ''),
    queryFn: () => workersApi.getWorkerLogs(hostname!, lines),
    enabled: enabled && !!hostname,
    staleTime: 10 * 1000, // Logs stale after 10s
    retry: 2,
  });
};

/**
 * Fetch worker metrics (historical performance data)
 *
 * @param hostname - Worker hostname
 * @param enabled - Enable query (default: false, only fetch when charts are visible)
 * @returns UseQueryResult with WorkerMetrics including throughput history
 *
 * Configuration:
 * - staleTime: 5 minutes (metrics don't change frequently)
 * - refetchInterval: disabled (only refetch manually or on window focus)
 * - retry: 2 attempts
 */
export const useWorkerMetrics = (hostname: string | null, enabled: boolean = false) => {
  return useQuery<WorkerMetrics, Error>({
    queryKey: workerKeys.metrics(hostname || ''),
    queryFn: () => workersApi.getWorkerMetrics(hostname!),
    enabled: enabled && !!hostname,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

/**
 * Restart worker mutation with optimistic UI updates (AC-4)
 *
 * Triggers POST /api/v1/workers/{hostname}/restart
 * Implements optimistic UI update pattern:
 * 1. Immediately update worker status to 'restarting' (perceived performance)
 * 2. Show success toast
 * 3. Auto-refresh workers list after 10 seconds (allow backend to update status)
 * 4. Timeout warning after 60 seconds if still showing 'restarting'
 */
export const useRestartWorker = () => {
  const queryClient = useQueryClient();

  return useMutation<WorkerRestartResponse, Error, string>({
    mutationFn: workersApi.restartWorker,
    onSuccess: (data, hostname) => {
      // AC-4: Optimistic update - set worker status to 'restarting' immediately
      queryClient.setQueryData<WorkerStatus[]>(workerKeys.lists(), (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((worker) =>
          worker.hostname === hostname
            ? { ...worker, status: 'restarting' as WorkerStatus['status'] } // TypeScript limitation - 'restarting' not in enum
            : worker
        );
      });

      // AC-3: Success toast
      toast.success(`Worker ${hostname} is restarting. This may take 10-30 seconds.`, {
        description: data.message,
      });

      // AC-4: Auto-refresh after 10 seconds to sync with backend state
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: workerKeys.lists() });
      }, 10000);

      // AC-4: Timeout warning after 60 seconds if worker still showing 'restarting'
      setTimeout(() => {
        const currentData = queryClient.getQueryData<WorkerStatus[]>(workerKeys.lists());
        const worker = currentData?.find((w) => w.hostname === hostname);
        if (worker && (worker.status as string) === 'restarting') {
          toast.error('Worker restart timed out. Check logs or contact support.', {
            description: `Worker ${hostname} is still restarting after 60 seconds`,
          });
        }
      }, 60000);
    },
    onError: (error, hostname) => {
      // AC-5: Error handling (specific error messages handled in dialog component)
      toast.error(`Failed to restart worker ${hostname}`, {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });
};
