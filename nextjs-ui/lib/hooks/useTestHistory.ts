/**
 * useTestHistory Hook
 * Session storage management for LLM test history
 *
 * Story: nextjs-story-29-prompts-llm-test
 * AC: AC-4 (Test History with Session Storage)
 */

import { useState, useEffect, useCallback } from 'react';
import type { LLMTestResponse, LLMTestParams } from './useLLMTest';

export interface TestRun {
  id: string;
  timestamp: Date;
  model: string;
  userMessage: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  result: LLMTestResponse;
  variables?: Record<string, string>;
}

const STORAGE_KEY = 'prompt-test-history';
const MAX_HISTORY_SIZE = 5;

/**
 * Manage test history in sessionStorage (max 5 runs, FIFO queue)
 */
export function useTestHistory() {
  const [history, setHistory] = useState<TestRun[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load history from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        const historyWithDates = parsed.map((run: TestRun) => ({
          ...run,
          timestamp: new Date(run.timestamp),
        }));
        setHistory(historyWithDates);
      }
    } catch (err) {
      console.error('Failed to load test history:', err);
      setError('Failed to load test history from session storage');
    }
  }, []);

  // Save history to sessionStorage whenever it changes
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      setError(null);
    } catch (err) {
      // Handle quota exceeded error (AC-4)
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        console.error('Session storage quota exceeded');
        setError('Storage quota exceeded. Clearing old history.');
        // Clear oldest entry and retry
        const newHistory = history.slice(1);
        setHistory(newHistory);
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
          setError(null);
        } catch {
          setError('Unable to save test history');
        }
      } else {
        console.error('Failed to save test history:', err);
        setError('Failed to save test history');
      }
    }
  }, [history]);

  // Add new test run to history (FIFO queue, max 5)
  const addTest = useCallback(
    (
      params: LLMTestParams,
      result: LLMTestResponse,
      variables?: Record<string, string>
    ) => {
      const newRun: TestRun = {
        id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        model: result.model,
        userMessage: params.user_message,
        systemPrompt: params.system_prompt,
        temperature: params.temperature,
        maxTokens: params.max_tokens,
        result,
        variables,
      };

      setHistory((prev) => {
        // Add to beginning, keep only last 5
        const updated = [newRun, ...prev].slice(0, MAX_HISTORY_SIZE);
        return updated;
      });
    },
    []
  );

  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      setError(null);
    } catch (err) {
      console.error('Failed to clear test history:', err);
      setError('Failed to clear test history');
    }
  }, []);

  // Get specific test run by ID
  const getTestById = useCallback(
    (id: string): TestRun | undefined => {
      return history.find((run) => run.id === id);
    },
    [history]
  );

  return {
    history,
    addTest,
    clearHistory,
    getTestById,
    error,
  };
}
