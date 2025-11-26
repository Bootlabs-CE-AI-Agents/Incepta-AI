/**
 * Execution Trace Timeline Component
 *
 * Displays execution steps in a timeline view following industry patterns:
 * - Datadog/Elastic APM trace visualization
 * - LangSmith trace UI patterns
 * - Microsoft Prompt Flow tree view hierarchy
 *
 * Features:
 * - Duration bar indicators
 * - Nested hierarchy with expand/collapse
 * - Status color coding
 * - Sequential timeline view
 */

import { useCallback, useMemo, useState } from 'react';
import { ChevronRight, Zap, MessageSquare, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import JsonView from '@uiw/react-json-view';
import { darkTheme } from '@uiw/react-json-view/dark';
import { lightTheme } from '@uiw/react-json-view/light';
import { formatDuration, parseExecutionTrace, type ParsedExecutionTrace, type ToolCall } from '@/lib/utils/execution-trace-parser';

interface ExecutionTraceTimelineProps {
  outputData: unknown;
  isDarkMode?: boolean;
  totalDurationMs?: number;
}

// Direct color values for guaranteed visibility (bypassing Tailwind issues)
const COLORS = {
  textPrimary: '#1e293b',      // Very dark slate
  textSecondary: '#475569',    // Medium slate
  textMuted: '#64748b',        // Lighter slate
  border: '#cbd5e1',           // Slate border
};

export function ExecutionTraceTimeline({
  outputData,
  isDarkMode = false,
  totalDurationMs = 0,
}: ExecutionTraceTimelineProps) {
  const [expandedToolIndices, setExpandedToolIndices] = useState<Set<number>>(new Set());

  const trace = useMemo(() => parseExecutionTrace(outputData), [outputData]);

  const toggleToolExpanded = useCallback((index: number) => {
    setExpandedToolIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  if (!trace.toolCalls.length && !trace.llmResponse) {
    return (
      <div
        className="rounded-lg p-6 text-center"
        style={{ border: `1px solid ${COLORS.border}` }}
      >
        <Clock className="h-12 w-12 mx-auto mb-3" style={{ color: COLORS.textMuted }} />
        <p style={{ color: COLORS.textSecondary }}>
          No execution trace data available
        </p>
      </div>
    );
  }

  // Calculate relative positioning for timeline bars
  const minDuration = Math.min(
    trace.llmResponse?.durationMs || 0,
    ...trace.toolCalls.map((t) => t.durationMs || 0)
  );

  const maxDuration = Math.max(
    trace.llmResponse?.durationMs || 0,
    ...trace.toolCalls.map((t) => t.durationMs || 0),
    totalDurationMs || 0,
    1000 // Minimum scale
  );

  const getDurationPercentage = (duration?: number) => {
    if (!duration || maxDuration === 0) return 0;
    return Math.min((duration / maxDuration) * 100, 100);
  };

  return (
    <div className="space-y-4">
      {/* Timeline Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>
          Execution Timeline
        </h3>
        <div className="text-xs" style={{ color: COLORS.textSecondary }}>
          Total: {formatDuration(totalDurationMs || trace.totalDurationMs)}
        </div>
      </div>

      {/* LLM Response Section */}
      {trace.llmResponse && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/10 overflow-hidden">
          {/* Step Header */}
          <div className="px-4 py-3 flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-blue-900 dark:text-blue-200">
                LLM Response
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300 mt-1 line-clamp-2">
                {trace.llmResponse.response.substring(0, 100)}
                {trace.llmResponse.response.length > 100 ? '...' : ''}
              </div>
            </div>

            {/* Duration Bar */}
            {trace.llmResponse.durationMs !== undefined && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-20 h-2 bg-blue-200 dark:bg-blue-800/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-400 rounded-full transition-all"
                    style={{ width: `${getDurationPercentage(trace.llmResponse.durationMs)}%` }}
                  />
                </div>
                <div className="text-xs font-mono text-blue-900 dark:text-blue-200 whitespace-nowrap">
                  {formatDuration(trace.llmResponse.durationMs)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tool Calls Section */}
      {trace.toolCalls.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase px-1 mb-2" style={{ color: COLORS.textSecondary }}>
            🔧 Tool Calls ({trace.toolCalls.length})
          </div>

          {trace.toolCalls.map((tool, index) => {
            const isExpanded = expandedToolIndices.has(index);
            const statusIcon = tool.status === 'success'
              ? <CheckCircle className="h-4 w-4 text-green-500" />
              : <AlertCircle className="h-4 w-4 text-red-500" />;

            return (
              <div
                key={index}
                className="rounded-lg border border-white/20 dark:border-white/15 overflow-hidden bg-white/30 dark:bg-white/5"
              >
                {/* Step Header - Click to expand */}
                <button
                  onClick={() => toggleToolExpanded(index)}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/20 dark:hover:bg-white/10 transition-colors text-left"
                >
                  {/* Expand/Collapse Chevron */}
                  <ChevronRight
                    className={`h-4 w-4 flex-shrink-0 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                    style={{ color: COLORS.textSecondary }}
                  />

                  {/* Tool Icon & Name */}
                  <Zap className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm" style={{ color: COLORS.textPrimary }}>
                      {tool.toolName}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                      tool.status === 'success'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}
                  >
                    {statusIcon}
                    <span>{tool.status === 'success' ? 'OK' : 'Error'}</span>
                  </div>

                  {/* Duration Bar & Time */}
                  {tool.durationMs !== undefined && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${getDurationPercentage(tool.durationMs)}%` }}
                        />
                      </div>
                      <div className="text-xs font-mono whitespace-nowrap" style={{ color: COLORS.textSecondary }}>
                        {formatDuration(tool.durationMs)}
                      </div>
                    </div>
                  )}
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <>
                    <div className="border-t border-white/10 dark:border-white/10" />

                    <div className="px-4 py-3 space-y-3" style={{ backgroundColor: '#f8fafc' }}>
                      {/* Input Parameters */}
                      <div>
                        <div className="text-xs font-semibold uppercase mb-2" style={{ color: COLORS.textSecondary }}>
                          Input
                        </div>
                        <div className="rounded p-2 max-h-48 overflow-y-auto" style={{ border: `1px solid ${COLORS.border}`, backgroundColor: '#ffffff' }}>
                          {Object.keys(tool.toolArgs).length > 0 ? (
                            <JsonView
                              value={tool.toolArgs}
                              style={isDarkMode ? darkTheme : lightTheme}
                              displayDataTypes={false}
                              collapsed={1}
                              enableClipboard
                            />
                          ) : (
                            <div className="text-xs" style={{ color: COLORS.textSecondary }}>
                              No parameters
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Output */}
                      <div>
                        <div className="text-xs font-semibold uppercase mb-2" style={{ color: COLORS.textSecondary }}>
                          Output
                        </div>
                        <div className="rounded p-2 max-h-48 overflow-y-auto" style={{ border: `1px solid ${COLORS.border}`, backgroundColor: '#ffffff' }}>
                          {tool.toolResult ? (
                            (() => {
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
                                return (
                                  <pre className="text-xs font-mono whitespace-pre-wrap break-words" style={{ color: COLORS.textPrimary }}>
                                    {tool.toolResult}
                                  </pre>
                                );
                              }
                            })()
                          ) : (
                            <div className="text-xs" style={{ color: COLORS.textSecondary }}>
                              No output
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Error (if present) */}
                      {tool.error && (
                        <div className="rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-2">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-red-700 dark:text-red-300 font-mono">
                              {tool.error}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      <div className="pt-2 flex gap-4 text-xs" style={{ borderTop: `1px solid ${COLORS.border}`, color: COLORS.textSecondary }}>
        <div>
          <span className="font-semibold" style={{ color: COLORS.textPrimary }}>
            {trace.toolCalls.length}
          </span>
          {' '}tools called
        </div>
        {trace.hasErrors && (
          <div className="text-red-600">
            <span className="font-semibold">Errors detected</span>
          </div>
        )}
      </div>
    </div>
  );
}
