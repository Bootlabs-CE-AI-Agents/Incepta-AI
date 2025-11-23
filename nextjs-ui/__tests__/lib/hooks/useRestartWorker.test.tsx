/**
 * Tests for useRestartWorker hook (AC-4, AC-5)
 *
 * Coverage:
 * - Optimistic UI updates (AC-4)
 * - Auto-refresh after 10 seconds (AC-4)
 * - Timeout warning after 60 seconds (AC-4)
 * - Error handling (AC-5)
 * - Toast notifications (AC-3)
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRestartWorker, workerKeys } from '@/lib/hooks/useWorkers';
import { workersApi } from '@/lib/api/workers';
import type { WorkerStatus, WorkerRestartResponse } from '@/lib/api/workers';

// Mock dependencies
jest.mock('@/lib/api/workers');
jest.mock('sonner');

const mockWorkersApi = workersApi as jest.Mocked<typeof workersApi>;
const mockToast = toast as jest.Mocked<typeof toast>;

/**
 * Helper to create React Query wrapper with fresh QueryClient
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

/**
 * Helper to create mock workers data
 */
function createMockWorkers(): WorkerStatus[] {
  return [
    {
      hostname: 'worker-1',
      status: 'active',
      uptime_seconds: 3600,
      active_tasks: 2,
      completed_tasks: 50,
      cpu_percent: 45,
      memory_percent: 60,
      throughput_per_minute: 10,
    },
    {
      hostname: 'worker-2',
      status: 'idle',
      uptime_seconds: 7200,
      active_tasks: 0,
      completed_tasks: 30,
      cpu_percent: 20,
      memory_percent: 40,
      throughput_per_minute: 5,
    },
  ];
}

describe('useRestartWorker hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Create fresh query client for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Pre-populate workers list in cache
    const mockWorkers = createMockWorkers();
    queryClient.setQueryData(workerKeys.lists(), mockWorkers);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  /**
   * Test: Successful restart with optimistic UI update (AC-4)
   */
  it('should optimistically update worker status to "restarting" on success', async () => {
    const mockResponse: WorkerRestartResponse = {
      success: true,
      message: 'Worker restart initiated',
    };
    mockWorkersApi.restartWorker.mockResolvedValueOnce(mockResponse);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRestartWorker(), { wrapper });

    // Execute restart mutation
    act(() => {
      result.current.mutate('worker-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // AC-4: Verify optimistic update - worker status changed to "restarting"
    const updatedWorkers = queryClient.getQueryData<WorkerStatus[]>(workerKeys.lists());
    const restartedWorker = updatedWorkers?.find((w) => w.hostname === 'worker-1');
    expect(restartedWorker?.status).toBe('restarting');

    // AC-3: Verify success toast
    expect(mockToast.success).toHaveBeenCalledWith(
      'Worker worker-1 is restarting. This may take 10-30 seconds.',
      { description: 'Worker restart initiated' }
    );
  });

  /**
   * Test: Auto-refresh after 10 seconds (AC-4)
   */
  it('should invalidate workers query after 10 seconds', async () => {
    const mockResponse: WorkerRestartResponse = {
      success: true,
      message: 'Restart successful',
    };
    mockWorkersApi.restartWorker.mockResolvedValueOnce(mockResponse);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRestartWorker(), { wrapper });

    // Spy on queryClient.invalidateQueries
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    act(() => {
      result.current.mutate('worker-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // AC-4: Verify invalidateQueries NOT called immediately
    expect(invalidateSpy).not.toHaveBeenCalled();

    // Fast-forward 10 seconds
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // AC-4: Verify invalidateQueries called after 10s
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: workerKeys.lists() });
  });

  /**
   * Test: Timeout warning after 60 seconds if still restarting (AC-4)
   */
  it('should show timeout error toast if worker still restarting after 60s', async () => {
    const mockResponse: WorkerRestartResponse = {
      success: true,
      message: 'Restart initiated',
    };
    mockWorkersApi.restartWorker.mockResolvedValueOnce(mockResponse);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRestartWorker(), { wrapper });

    act(() => {
      result.current.mutate('worker-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // AC-4: Worker status should be "restarting" after initial update
    const workersAfterRestart = queryClient.getQueryData<WorkerStatus[]>(workerKeys.lists());
    const restartingWorker = workersAfterRestart?.find((w) => w.hostname === 'worker-1');
    expect(restartingWorker?.status).toBe('restarting');

    // Fast-forward 60 seconds
    act(() => {
      jest.advanceTimersByTime(60000);
    });

    // AC-4: Verify timeout error toast
    expect(mockToast.error).toHaveBeenCalledWith(
      'Worker restart timed out. Check logs or contact support.',
      { description: 'Worker worker-1 is still restarting after 60 seconds' }
    );
  });

  /**
   * Test: No timeout warning if worker status changes before 60s
   */
  it('should NOT show timeout error if worker status changes before 60s', async () => {
    const mockResponse: WorkerRestartResponse = {
      success: true,
      message: 'Restart initiated',
    };
    mockWorkersApi.restartWorker.mockResolvedValueOnce(mockResponse);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRestartWorker(), { wrapper });

    act(() => {
      result.current.mutate('worker-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Simulate worker status changing back to "active" after 30s (backend refreshed)
    act(() => {
      jest.advanceTimersByTime(30000);
      const mockWorkersUpdated: WorkerStatus[] = [
        { ...createMockWorkers()[0], status: 'active' }, // worker-1 back to active
        createMockWorkers()[1],
      ];
      queryClient.setQueryData(workerKeys.lists(), mockWorkersUpdated);
    });

    // Fast-forward remaining 30s to 60s total
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    // No timeout error should be shown (worker status changed)
    expect(mockToast.error).not.toHaveBeenCalledWith(
      'Worker restart timed out. Check logs or contact support.',
      expect.anything()
    );
  });

  /**
   * Test: Error handling - mutation error shows toast (AC-5)
   */
  it('should show error toast when restart API call fails', async () => {
    const mockError = new Error('Network error');
    mockWorkersApi.restartWorker.mockRejectedValueOnce(mockError);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRestartWorker(), { wrapper });

    act(() => {
      result.current.mutate('worker-1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // AC-5: Verify error toast (exact match with hook implementation)
    expect(mockToast.error).toHaveBeenCalledWith(
      'Failed to restart worker worker-1',
      { description: 'Network error' }
    );
  });

  /**
   * Test: Error toast for non-Error objects (AC-5)
   */
  it('should show generic error toast for non-Error objects', async () => {
    mockWorkersApi.restartWorker.mockRejectedValueOnce('String error');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRestartWorker(), { wrapper });

    act(() => {
      result.current.mutate('worker-1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockToast.error).toHaveBeenCalledWith(
      'Failed to restart worker worker-1',
      { description: 'An error occurred' }
    );
  });
});
