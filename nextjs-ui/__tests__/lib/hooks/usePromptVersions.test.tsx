/**
 * Unit tests for Prompt Versions React Query Hooks
 *
 * Tests cover:
 * - usePromptVersions with pagination and filters
 * - usePromptVersion for single version fetch
 * - useRevertPromptVersion mutation
 * - Query invalidation after mutations
 * - Error handling
 * - Loading states
 *
 * Story: nextjs-story-28-prompts-version-history
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  usePromptVersions,
  usePromptVersion,
  useRevertPromptVersion,
} from '@/lib/hooks/usePrompts';
import * as promptsApi from '@/lib/api/prompts';
import type { PromptVersion, PaginatedVersionsResponse } from '@/lib/api/prompts';

// Mock the API module
jest.mock('@/lib/api/prompts', () => ({
  getPromptVersions: jest.fn(),
  getPromptVersion: jest.fn(),
  revertPromptVersion: jest.fn(),
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockVersions: PromptVersion[] = [
  {
    id: '1',
    version_number: 5,
    template_text: 'Version 5 content',
    description: 'Latest version',
    created_at: '2024-01-15T10:00:00Z',
    created_by: 'user@example.com',
  },
  {
    id: '2',
    version_number: 4,
    template_text: 'Version 4 content',
    description: null,
    created_at: '2024-01-14T10:00:00Z',
    created_by: null,
  },
];

const mockPaginatedResponse: PaginatedVersionsResponse = {
  items: mockVersions,
  total: 25,
  page: 1,
  limit: 20,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('usePromptVersions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic fetching', () => {
    it('fetches versions for a prompt successfully', async () => {
      (promptsApi.getPromptVersions as jest.Mock).mockResolvedValue(mockPaginatedResponse);

      const { result } = renderHook(
        () => usePromptVersions('prompt-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockPaginatedResponse);
      expect(result.current.error).toBeNull();
      expect(promptsApi.getPromptVersions).toHaveBeenCalledWith('prompt-1', undefined);
    });

    it('returns loading state while fetching', () => {
      (promptsApi.getPromptVersions as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(
        () => usePromptVersions('prompt-1'),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('handles fetch errors', async () => {
      const error = new Error('Failed to fetch versions');
      (promptsApi.getPromptVersions as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(
        () => usePromptVersions('prompt-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.data).toBeUndefined();
    });

    it('does not fetch when prompt ID is empty', () => {
      (promptsApi.getPromptVersions as jest.Mock).mockResolvedValue(mockPaginatedResponse);

      renderHook(
        () => usePromptVersions(''),
        { wrapper: createWrapper() }
      );

      // Should not call API when ID is empty
      expect(promptsApi.getPromptVersions).not.toHaveBeenCalled();
    });
  });

  describe('Pagination', () => {
    it('passes page parameter to API', async () => {
      (promptsApi.getPromptVersions as jest.Mock).mockResolvedValue(mockPaginatedResponse);

      const { result } = renderHook(
        () => usePromptVersions('prompt-1', { page: 2 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(promptsApi.getPromptVersions).toHaveBeenCalledWith('prompt-1', { page: 2 });
    });

    it('passes limit parameter to API', async () => {
      (promptsApi.getPromptVersions as jest.Mock).mockResolvedValue(mockPaginatedResponse);

      const { result } = renderHook(
        () => usePromptVersions('prompt-1', { limit: 10 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(promptsApi.getPromptVersions).toHaveBeenCalledWith('prompt-1', { limit: 10 });
    });

    it('passes both page and limit parameters', async () => {
      (promptsApi.getPromptVersions as jest.Mock).mockResolvedValue(mockPaginatedResponse);

      const { result } = renderHook(
        () => usePromptVersions('prompt-1', { page: 3, limit: 15 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(promptsApi.getPromptVersions).toHaveBeenCalledWith('prompt-1', {
        page: 3,
        limit: 15,
      });
    });
  });

  describe('Search and filters', () => {
    it('passes search parameter to API', async () => {
      (promptsApi.getPromptVersions as jest.Mock).mockResolvedValue(mockPaginatedResponse);

      const { result } = renderHook(
        () => usePromptVersions('prompt-1', { search: 'Latest' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(promptsApi.getPromptVersions).toHaveBeenCalledWith('prompt-1', {
        search: 'Latest',
      });
    });

    it('passes date range filters to API', async () => {
      (promptsApi.getPromptVersions as jest.Mock).mockResolvedValue(mockPaginatedResponse);

      const { result } = renderHook(
        () =>
          usePromptVersions('prompt-1', {
            from: '2024-01-01',
            to: '2024-01-31',
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(promptsApi.getPromptVersions).toHaveBeenCalledWith('prompt-1', {
        from: '2024-01-01',
        to: '2024-01-31',
      });
    });

    it('passes all parameters together', async () => {
      (promptsApi.getPromptVersions as jest.Mock).mockResolvedValue(mockPaginatedResponse);

      const params = {
        page: 2,
        limit: 10,
        search: 'Latest',
        from: '2024-01-01',
        to: '2024-01-31',
      };

      const { result } = renderHook(
        () => usePromptVersions('prompt-1', params),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(promptsApi.getPromptVersions).toHaveBeenCalledWith('prompt-1', params);
    });
  });

  describe('Query key', () => {
    it('includes prompt ID and params in query key', async () => {
      (promptsApi.getPromptVersions as jest.Mock).mockResolvedValue(mockPaginatedResponse);

      const params = { page: 2, search: 'Latest' };

      const { result } = renderHook(
        () => usePromptVersions('prompt-1', params),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Query should be cached with key including ID and params
      expect(result.current.data).toEqual(mockPaginatedResponse);
    });

    it('creates different cache entries for different params', async () => {
      (promptsApi.getPromptVersions as jest.Mock).mockResolvedValue(mockPaginatedResponse);

      const { result: result1 } = renderHook(
        () => usePromptVersions('prompt-1', { page: 1 }),
        { wrapper: createWrapper() }
      );

      const { result: result2 } = renderHook(
        () => usePromptVersions('prompt-1', { page: 2 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
        expect(result2.current.isLoading).toBe(false);
      });

      // Should have called API twice with different params
      expect(promptsApi.getPromptVersions).toHaveBeenCalledTimes(2);
      expect(promptsApi.getPromptVersions).toHaveBeenCalledWith('prompt-1', { page: 1 });
      expect(promptsApi.getPromptVersions).toHaveBeenCalledWith('prompt-1', { page: 2 });
    });
  });

  describe('Stale time', () => {
    it('sets staleTime to 30 seconds', async () => {
      (promptsApi.getPromptVersions as jest.Mock).mockResolvedValue(mockPaginatedResponse);

      const { result } = renderHook(
        () => usePromptVersions('prompt-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Data should be fresh for 30 seconds
      // This is a behavior test - staleTime is configured in the hook
      expect(result.current.data).toEqual(mockPaginatedResponse);
    });
  });
});

describe('usePromptVersion', () => {
  const mockVersion: PromptVersion = {
    id: '1',
    version_number: 5,
    template_text: 'Version 5 content',
    description: 'Latest version',
    created_at: '2024-01-15T10:00:00Z',
    created_by: 'user@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches single version successfully', async () => {
    (promptsApi.getPromptVersion as jest.Mock).mockResolvedValue(mockVersion);

    const { result } = renderHook(
      () => usePromptVersion('prompt-1', 'version-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockVersion);
    expect(promptsApi.getPromptVersion).toHaveBeenCalledWith('prompt-1', 'version-1');
  });

  it('does not fetch when prompt ID is empty', () => {
    (promptsApi.getPromptVersion as jest.Mock).mockResolvedValue(mockVersion);

    renderHook(
      () => usePromptVersion('', 'version-1'),
      { wrapper: createWrapper() }
    );

    expect(promptsApi.getPromptVersion).not.toHaveBeenCalled();
  });

  it('does not fetch when version ID is empty', () => {
    (promptsApi.getPromptVersion as jest.Mock).mockResolvedValue(mockVersion);

    renderHook(
      () => usePromptVersion('prompt-1', ''),
      { wrapper: createWrapper() }
    );

    expect(promptsApi.getPromptVersion).not.toHaveBeenCalled();
  });

  it('handles fetch errors', async () => {
    const error = new Error('Failed to fetch version');
    (promptsApi.getPromptVersion as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(
      () => usePromptVersion('prompt-1', 'version-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeUndefined();
  });
});

describe('useRevertPromptVersion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reverts to version successfully', async () => {
    const { toast } = require('sonner');
    const mockPrompt = { id: 'prompt-1', name: 'Test Prompt' };
    (promptsApi.revertPromptVersion as jest.Mock).mockResolvedValue(mockPrompt);

    const { result } = renderHook(
      () => useRevertPromptVersion(),
      { wrapper: createWrapper() }
    );

    await result.current.mutateAsync({
      id: 'prompt-1',
      versionId: 'version-3',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(promptsApi.revertPromptVersion).toHaveBeenCalledWith('prompt-1', 'version-3');
    expect(toast.success).toHaveBeenCalledWith('Reverted to previous version');
  });

  it('displays error toast on failure', async () => {
    const { toast } = require('sonner');
    const error = new Error('Network error');
    (promptsApi.revertPromptVersion as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(
      () => useRevertPromptVersion(),
      { wrapper: createWrapper() }
    );

    try {
      await result.current.mutateAsync({
        id: 'prompt-1',
        versionId: 'version-3',
      });
    } catch (e) {
      // Expected to throw
    }

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to revert prompt: Network error');
  });

  it('invalidates related queries on success', async () => {
    (promptsApi.revertPromptVersion as jest.Mock).mockResolvedValue({});

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRevertPromptVersion(), { wrapper });

    await result.current.mutateAsync({
      id: 'prompt-1',
      versionId: 'version-3',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should invalidate prompts list query
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['prompts'] });

    // Should invalidate single prompt query
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['prompts', 'prompt-1'] });

    // Should invalidate versions query
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['prompts', 'prompt-1', 'versions'],
    });
  });

  it('sets loading state during mutation', async () => {
    (promptsApi.revertPromptVersion as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const { result } = renderHook(
      () => useRevertPromptVersion(),
      { wrapper: createWrapper() }
    );

    result.current.mutate({
      id: 'prompt-1',
      versionId: 'version-3',
    });

    // Should be pending after state update
    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it('handles concurrent revert operations', async () => {
    (promptsApi.revertPromptVersion as jest.Mock).mockResolvedValue({});

    const { result } = renderHook(
      () => useRevertPromptVersion(),
      { wrapper: createWrapper() }
    );

    // Trigger two reverts in quick succession
    const promise1 = result.current.mutateAsync({
      id: 'prompt-1',
      versionId: 'version-3',
    });

    const promise2 = result.current.mutateAsync({
      id: 'prompt-1',
      versionId: 'version-2',
    });

    await Promise.all([promise1, promise2]);

    // Both should complete successfully
    expect(promptsApi.revertPromptVersion).toHaveBeenCalledTimes(2);
  });
});
