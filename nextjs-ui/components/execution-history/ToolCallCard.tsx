/**
 * Tool Call Card Component
 *
 * Displays individual tool invocation details with input/output in expandable card
 * Similar to Streamlit's tool call rendering
 */

import { useState } from 'react';
import { ChevronDown, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import JsonView from '@uiw/react-json-view';
import { darkTheme } from '@uiw/react-json-view/dark';
import { lightTheme } from '@uiw/react-json-view/light';
import { formatDuration } from '@/lib/utils/execution-trace-parser';
import type { ToolCall } from '@/lib/utils/execution-trace-parser';

interface ToolCallCardProps {
  tool: ToolCall;
  isDarkMode?: boolean;
  index: number;
}

export function ToolCallCard({ tool, isDarkMode = false, index }: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusIcon = tool.status === 'success'
    ? <CheckCircle className="h-4 w-4 text-green-500" />
    : <AlertCircle className="h-4 w-4 text-red-500" />;

  const statusText = tool.status === 'success' ? 'Success' : 'Failed';

  return (
    <div className="border border-white/20 dark:border-white/15 rounded-lg overflow-hidden bg-white/30 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10 transition-colors">
      {/* Header - Click to expand */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Zap className="h-5 w-5 text-blue-500 flex-shrink-0" />

          <div className="flex-1 min-w-0 text-left">
            <div className="font-semibold text-text-primary dark:text-white truncate">
              Tool {index}: <span className="font-bold">{tool.toolName}</span>
            </div>
            <div className="text-xs text-text-secondary dark:text-white/60 mt-0.5">
              {Object.keys(tool.toolArgs).length} input parameter{Object.keys(tool.toolArgs).length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Status badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
            tool.status === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}>
            {statusIcon}
            <span>{statusText}</span>
          </div>
        </div>

        <ChevronDown
          className={`h-5 w-5 text-text-secondary dark:text-white/60 flex-shrink-0 ml-2 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <>
          <div className="border-t border-white/10 dark:border-white/10" />

          <div className="px-4 py-3 space-y-4">
            {/* Input Parameters */}
            <div>
              <h4 className="text-sm font-semibold text-text-primary dark:text-white mb-2">
                📥 Input Parameters
              </h4>
              <div className="rounded-lg border border-white/10 dark:border-white/10 overflow-hidden bg-white/10 dark:bg-black/20">
                {Object.keys(tool.toolArgs).length > 0 ? (
                  <JsonView
                    value={tool.toolArgs}
                    style={isDarkMode ? darkTheme : lightTheme}
                    displayDataTypes={false}
                    collapsed={1}
                    enableClipboard
                  />
                ) : (
                  <div className="p-3 text-text-secondary dark:text-white/60 text-sm">
                    No input parameters
                  </div>
                )}
              </div>
            </div>

            {/* Output / Result */}
            <div>
              <h4 className="text-sm font-semibold text-text-primary dark:text-white mb-2">
                📤 Output / Result
              </h4>
              <div className="rounded-lg border border-white/10 dark:border-white/10 overflow-hidden bg-white/10 dark:bg-black/20">
                {tool.toolResult ? (
                  <div className="p-3">
                    {(() => {
                      // Try to parse as JSON
                      try {
                        const parsed = JSON.parse(tool.toolResult);
                        return (
                          <JsonView
                            value={parsed}
                            style={isDarkMode ? darkTheme : lightTheme}
                            displayDataTypes={false}
                            collapsed={1}
                            enableClipboard
                          />
                        );
                      } catch {
                        // Display as plain text if not JSON
                        return (
                          <pre className="text-xs text-text-primary dark:text-white/80 font-mono whitespace-pre-wrap break-words overflow-x-auto">
                            {tool.toolResult}
                          </pre>
                        );
                      }
                    })()}
                  </div>
                ) : (
                  <div className="p-3 text-text-secondary dark:text-white/60 text-sm">
                    No output available
                  </div>
                )}
              </div>
            </div>

            {/* Error message (if present) */}
            {tool.error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-red-900 dark:text-red-200 text-sm">
                      Error
                    </div>
                    <div className="text-red-700 dark:text-red-300 text-sm font-mono mt-1">
                      {tool.error}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-2 border-t border-white/10 dark:border-white/10">
              <div className="flex flex-wrap gap-3 text-xs text-text-secondary dark:text-white/60">
                {tool.durationMs !== undefined && (
                  <div className="flex items-center gap-1.5">
                    <span>⚡ Duration:</span>
                    <span className="font-mono text-text-primary dark:text-white">
                      {formatDuration(tool.durationMs)}
                    </span>
                  </div>
                )}
                {tool.timestamp && (
                  <div className="flex items-center gap-1.5">
                    <span>⏱️ Timestamp:</span>
                    <span className="font-mono text-text-primary dark:text-white">
                      {new Date(tool.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
