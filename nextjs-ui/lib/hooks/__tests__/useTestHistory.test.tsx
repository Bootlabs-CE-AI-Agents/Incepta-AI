/**
 * Unit Tests for useTestHistory Hook
 * Story: nextjs-story-29-prompts-llm-test
 * Task 10: Unit tests
 */

import { renderHook, act } from '@testing-library/react';
import { useTestHistory } from '../useTestHistory';

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('useTestHistory', () => {
  beforeEach(() => {
    mockSessionStorage.clear();
  });

  it('should initialize with empty history', () => {
    const { result } = renderHook(() => useTestHistory());
    expect(result.current.history).toEqual([]);
  });

  it('should add test run to history', () => {
    const { result } = renderHook(() => useTestHistory());

    const params = {
      system_prompt: 'Test prompt',
      user_message: 'Hello',
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 500,
    };

    const testResult = {
      response: 'Hi there!',
      usage: { input_tokens: 5, output_tokens: 3, total_tokens: 8 },
      execution_time: 1.2,
      cost: 0.001,
      model: 'gpt-4',
    };

    const variables = { name: 'John' };

    act(() => {
      result.current.addTest(params, testResult, variables);
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0]).toMatchObject({
      model: 'gpt-4',
      userMessage: 'Hello',
      systemPrompt: 'Test prompt',
      temperature: 0.7,
      maxTokens: 500,
      result: testResult,
      variables,
    });
    expect(result.current.history[0].timestamp).toBeInstanceOf(Date);
    expect(result.current.history[0].id).toBeTruthy();
  });

  it('should maintain FIFO order (newest first)', () => {
    const { result } = renderHook(() => useTestHistory());

    const createTestData = (id: number) => ({
      params: {
        system_prompt: `Prompt ${id}`,
        user_message: `Message ${id}`,
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 500,
      },
      result: {
        response: `Response ${id}`,
        usage: { input_tokens: 5, output_tokens: 3, total_tokens: 8 },
        execution_time: 1.0,
        cost: 0.001,
        model: 'gpt-4',
      },
      variables: {},
    });

    act(() => {
      result.current.addTest(
        createTestData(1).params,
        createTestData(1).result,
        createTestData(1).variables
      );
    });

    act(() => {
      result.current.addTest(
        createTestData(2).params,
        createTestData(2).result,
        createTestData(2).variables
      );
    });

    expect(result.current.history).toHaveLength(2);
    expect(result.current.history[0].systemPrompt).toBe('Prompt 2');
    expect(result.current.history[1].systemPrompt).toBe('Prompt 1');
  });

  it('should limit history to 5 runs', () => {
    const { result } = renderHook(() => useTestHistory());

    const createTestData = (id: number) => ({
      params: {
        system_prompt: `Prompt ${id}`,
        user_message: `Message ${id}`,
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 500,
      },
      result: {
        response: `Response ${id}`,
        usage: { input_tokens: 5, output_tokens: 3, total_tokens: 8 },
        execution_time: 1.0,
        cost: 0.001,
        model: 'gpt-4',
      },
      variables: {},
    });

    // Add 6 test runs
    for (let i = 1; i <= 6; i++) {
      act(() => {
        const data = createTestData(i);
        result.current.addTest(data.params, data.result, data.variables);
      });
    }

    expect(result.current.history).toHaveLength(5);
    // Should keep runs 6, 5, 4, 3, 2 (oldest run 1 dropped)
    expect(result.current.history[0].systemPrompt).toBe('Prompt 6');
    expect(result.current.history[4].systemPrompt).toBe('Prompt 2');
  });

  it('should clear all history', () => {
    const { result } = renderHook(() => useTestHistory());

    const params = {
      system_prompt: 'Test',
      user_message: 'Hello',
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 500,
    };

    const testResult = {
      response: 'Hi',
      usage: { input_tokens: 5, output_tokens: 3, total_tokens: 8 },
      execution_time: 1.0,
      cost: 0.001,
      model: 'gpt-4',
    };

    act(() => {
      result.current.addTest(params, testResult, {});
    });

    expect(result.current.history).toHaveLength(1);

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.history).toEqual([]);
  });

  it('should persist history to sessionStorage', () => {
    const { result } = renderHook(() => useTestHistory());

    const params = {
      system_prompt: 'Test',
      user_message: 'Hello',
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 500,
    };

    const testResult = {
      response: 'Hi',
      usage: { input_tokens: 5, output_tokens: 3, total_tokens: 8 },
      execution_time: 1.0,
      cost: 0.001,
      model: 'gpt-4',
    };

    act(() => {
      result.current.addTest(params, testResult, {});
    });

    const stored = mockSessionStorage.getItem('prompt-test-history');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
  });

  it('should load history from sessionStorage on mount', () => {
    const existingHistory = [
      {
        id: 'test-123',
        timestamp: new Date().toISOString(),
        model: 'gpt-4',
        userMessage: 'Test',
        systemPrompt: 'Existing',
        temperature: 0.7,
        maxTokens: 500,
        result: {
          response: 'Response',
          usage: { input_tokens: 5, output_tokens: 3, total_tokens: 8 },
          execution_time: 1.0,
          cost: 0.001,
          model: 'gpt-4',
        },
        variables: {},
      },
    ];

    mockSessionStorage.setItem(
      'prompt-test-history',
      JSON.stringify(existingHistory)
    );

    const { result } = renderHook(() => useTestHistory());

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].systemPrompt).toBe('Existing');
  });

  it('should handle sessionStorage quota exceeded error', () => {
    const { result } = renderHook(() => useTestHistory());

    // Mock setItem to throw QuotaExceededError
    const originalSetItem = mockSessionStorage.setItem;
    mockSessionStorage.setItem = () => {
      const error: any = new Error('QuotaExceededError');
      error.name = 'QuotaExceededError';
      throw error;
    };

    const params = {
      system_prompt: 'Test',
      user_message: 'Hello',
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 500,
    };

    const testResult = {
      response: 'Hi',
      usage: { input_tokens: 5, output_tokens: 3, total_tokens: 8 },
      execution_time: 1.0,
      cost: 0.001,
      model: 'gpt-4',
    };

    // Should not throw error
    expect(() => {
      act(() => {
        result.current.addTest(params, testResult, {});
      });
    }).not.toThrow();

    // Restore original setItem
    mockSessionStorage.setItem = originalSetItem;
  });

  it('should handle invalid JSON in sessionStorage', () => {
    mockSessionStorage.setItem('prompt-test-history', 'invalid-json');

    const { result } = renderHook(() => useTestHistory());

    // Should initialize with empty array instead of crashing
    expect(result.current.history).toEqual([]);
  });
});
