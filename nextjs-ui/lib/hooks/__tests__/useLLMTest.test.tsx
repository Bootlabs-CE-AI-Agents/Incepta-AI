/**
 * Unit Tests for useLLMTest Hook
 * Story: nextjs-story-29-prompts-llm-test
 * Task 10: Unit tests
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { useLLMTest } from '../useLLMTest';
import type { ReactNode } from 'react';
import type { LLMTestParams } from '../useLLMTest';

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

describe('useLLMTest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockParams: LLMTestParams = {
    system_prompt: 'You are a helpful assistant.',
    user_message: 'Hello!',
    model: 'gpt-4',
    temperature: 0.7,
    max_tokens: 500,
  };

  const mockResponse = {
    response: 'Hello! How can I help you today?',
    usage: {
      input_tokens: 10,
      output_tokens: 8,
      total_tokens: 18,
    },
    execution_time: 1.5,
    cost: 0.0025,
    model: 'gpt-4',
  };

  it('should execute LLM test successfully', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

    const { result } = renderHook(() => useLLMTest(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(mockParams);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResponse);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      '/api/v1/llm/test',
      mockParams,
      { timeout: 60000 }
    );
  });

  it('should handle timeout error', async () => {
    const timeoutError = new AxiosError('timeout', 'ECONNABORTED');

    mockedAxios.post.mockRejectedValue(timeoutError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    const { result } = renderHook(() => useLLMTest(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(mockParams);

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    expect(result.current.error).toMatchObject({
      type: 'timeout',
      message: 'Request timed out after 60s',
    });
  });

  it('should handle network error', async () => {
    const networkError = new AxiosError('Network Error');
    networkError.response = undefined;

    mockedAxios.post.mockRejectedValue(networkError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    const { result } = renderHook(() => useLLMTest(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(mockParams);

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    expect(result.current.error).toMatchObject({
      type: 'network',
      message: 'Unable to connect',
    });
  });

  it('should handle rate limit error (429)', async () => {
    const rateLimitError = new AxiosError('Rate Limit');
    rateLimitError.response = {
      status: 429,
      data: { detail: 'Too many requests' },
      statusText: 'Too Many Requests',
      headers: {},
      config: {} as any,
    };

    mockedAxios.post.mockRejectedValue(rateLimitError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    const { result } = renderHook(() => useLLMTest(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(mockParams);

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    expect(result.current.error).toMatchObject({
      type: 'rate_limit',
      message: 'Rate limit exceeded',
      status: 429,
    });
  });

  it('should handle API error (500)', async () => {
    const apiError = new AxiosError('Internal Server Error');
    apiError.response = {
      status: 500,
      data: { detail: 'Internal error' },
      statusText: 'Internal Server Error',
      headers: {},
      config: {} as any,
    };

    mockedAxios.post.mockRejectedValue(apiError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    const { result } = renderHook(() => useLLMTest(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(mockParams);

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    expect(result.current.error).toMatchObject({
      type: 'api',
      message: 'LLM service error',
      status: 500,
    });
  });

  it('should handle invalid model error (400)', async () => {
    const invalidModelError = new AxiosError('Bad Request');
    invalidModelError.response = {
      status: 400,
      data: { detail: 'Invalid model specified' },
      statusText: 'Bad Request',
      headers: {},
      config: {} as any,
    };

    mockedAxios.post.mockRejectedValue(invalidModelError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    const { result } = renderHook(() => useLLMTest(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(mockParams);

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    expect(result.current.error).toMatchObject({
      type: 'invalid_model',
      message: 'Invalid model or parameters',
      status: 400,
    });
  });

  it('should handle non-axios error', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Unknown error'));
    mockedAxios.isAxiosError.mockReturnValue(false);

    const { result } = renderHook(() => useLLMTest(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(mockParams);

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    expect(result.current.error).toMatchObject({
      type: 'api',
      message: 'Unknown error',
    });
  });

  it('should set loading state during execution', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockedAxios.post.mockReturnValueOnce(promise as any);

    const { result } = renderHook(() => useLLMTest(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(mockParams);

    expect(result.current.isPending).toBe(true);

    resolvePromise!({ data: mockResponse });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.isPending).toBe(false);
  });
});
