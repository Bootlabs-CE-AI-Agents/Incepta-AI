/**
 * TestErrorPanel Component
 * Displays LLM test errors with retry button
 *
 * Story: nextjs-story-29-prompts-llm-test
 * AC: AC-6 (Error Handling)
 */

'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { LLMTestError } from '@/lib/hooks/useLLMTest';

interface TestErrorPanelProps {
  error: LLMTestError;
  onRetry: () => void;
}

export function TestErrorPanel({ error, onRetry }: TestErrorPanelProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
      <div className="flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-900 dark:text-red-100">
            ❌ Test Failed
          </h3>
          <p className="mt-1 text-sm font-medium text-red-800 dark:text-red-200">
            {error.type === 'network' && 'Network Error'}
            {error.type === 'api' && 'API Error'}
            {error.type === 'timeout' && 'Timeout'}
            {error.type === 'rate_limit' && 'Rate Limit Exceeded'}
            {error.type === 'invalid_model' && 'Invalid Model'}
          </p>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            {error.message}
          </p>
          {error.details && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {error.details}
            </p>
          )}
          {error.status && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              Status code: {error.status}
            </p>
          )}
          <Button
            onClick={onRetry}
            variant="secondary"
            size="sm"
            className="mt-4 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
          >
            Retry Test
          </Button>
        </div>
      </div>
    </div>
  );
}
