/**
 * Unit Tests for useLLMModels Hook
 * Story: nextjs-story-29-prompts-llm-test
 * Task 10: Unit tests
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { useLLMModels } from '../useLLMModels';
import type { ReactNode } from 'react';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useLLMModels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch LLM models successfully', async () => {
    const mockModels = [
      { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
      { id: 'claude-3', name: 'Claude 3', provider: 'anthropic' },
    ];

    mockedAxios.get.mockResolvedValueOnce({ data: mockModels });

    const { result } = renderHook(() => useLLMModels(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockModels);
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/llm/models');
  });

  it('should handle API error', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useLLMModels(), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('should return empty array for empty response', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [] });

    const { result } = renderHook(() => useLLMModels(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('should cache results for 5 minutes', async () => {
    const mockModels = [
      { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
    ];

    mockedAxios.get.mockResolvedValueOnce({ data: mockModels });

    const { result, rerender } = renderHook(() => useLLMModels(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Rerender should not trigger new API call (within staleTime)
    rerender();

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });
});
