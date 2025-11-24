/**
 * TestHistoryList Component
 * Displays list of previous test runs with timestamps, previews, and view buttons
 *
 * Story: nextjs-story-29-prompts-llm-test (AC-4)
 * Path: nextjs-ui/components/prompts/TestHistoryList.tsx
 *
 * Features:
 * - Display last 5 tests from useTestHistory hook
 * - Relative timestamps ("2 minutes ago")
 * - User message preview (50 chars), result preview (100 chars)
 * - "View" button to load previous test result
 *
 * Props:
 * - history: Array of test results from useTestHistory
 * - onViewTest: Callback to display a previous test result
 *
 * @since 2025-11-24
 * @author Claude Sonnet 4.5
 */

'use client';

import { formatDistanceToNow } from 'date-fns';
import { Clock, Eye } from 'lucide-react';

interface TestHistoryItem {
  timestamp: number;
  model: string;
  userMessage: string;
  result: {
    response: string;
    usage: {
      input_tokens: number;
      output_tokens: number;
      total_tokens: number;
    };
    execution_time: number;
    cost: number;
    model: string;
  };
  variables?: Record<string, string>;
}

interface TestHistoryListProps {
  history: TestHistoryItem[];
  onViewTest: (test: TestHistoryItem) => void;
}

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export function TestHistoryList({ history, onViewTest }: TestHistoryListProps) {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Test History (Last {history.length} Runs)
      </h3>

      <div className="space-y-3">
        {history.map((test, index) => (
          <div
            key={`${test.timestamp}-${index}`}
            className="rounded-md border border-gray-200 bg-gray-50 p-3 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-750 dark:hover:bg-gray-700 transition-colors"
          >
            {/* Header: timestamp, model, view button */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">
                  {formatDistanceToNow(test.timestamp, { addSuffix: true })}
                </span>
                <span className="text-gray-400">•</span>
                <span className="font-mono text-xs text-blue-600 dark:text-blue-400">
                  {test.model}
                </span>
              </div>
              <button
                onClick={() => onViewTest(test)}
                className="flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                aria-label={`View test from ${formatDistanceToNow(test.timestamp, { addSuffix: true })}`}
              >
                <Eye className="h-3 w-3" />
                View
              </button>
            </div>

            {/* User message preview (50 chars) */}
            <div className="text-xs mb-1">
              <span className="font-medium text-gray-700 dark:text-gray-300">Message: </span>
              <span className="text-gray-600 dark:text-gray-400 italic">
                "{truncateText(test.userMessage, 50)}"
              </span>
            </div>

            {/* Result preview (100 chars) */}
            <div className="text-xs">
              <span className="font-medium text-gray-700 dark:text-gray-300">Result: </span>
              <span className="text-gray-600 dark:text-gray-400">
                {truncateText(test.result.response, 100)}
              </span>
            </div>

            {/* Metrics (tokens, time, cost) */}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{test.result.usage.total_tokens} tokens</span>
              <span>•</span>
              <span>{test.result.execution_time.toFixed(2)}s</span>
              <span>•</span>
              <span>${test.result.cost.toFixed(4)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
