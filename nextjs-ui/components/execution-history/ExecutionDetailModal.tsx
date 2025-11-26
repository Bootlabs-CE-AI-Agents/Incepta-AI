/**
 * Execution Detail Modal Component
 *
 * Comprehensive modal displaying execution details with:
 * - Execution Flow tab: Timeline view with tool calls and durations
 * - LLM Conversation tab: User message, agent response, system prompt context
 * - Input Data tab: Original webhook/trigger payload
 * - Raw Output tab: Full execution_trace JSON
 * - Metadata & Logs tab: Execution metadata and debug logs
 */

import { useMemo } from 'react';
import { X, Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import JsonView from '@uiw/react-json-view';
import { darkTheme } from '@uiw/react-json-view/dark';
import { lightTheme } from '@uiw/react-json-view/light';
import { formatDistanceToNow, format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { ExecutionTraceTimeline } from './ExecutionTraceTimeline';
import { LLMConversationDisplay } from './LLMConversationDisplay';
import { parseExecutionTrace } from '@/lib/utils/execution-trace-parser';
import { useExecutionDetail, type ExecutionStatus } from '@/lib/hooks/useExecutions';

interface ExecutionDetailModalProps {
  executionId: string | null;
  onClose: () => void;
  isDarkMode?: boolean;
}

// Direct color values for guaranteed visibility (bypassing Tailwind issues)
const COLORS = {
  textPrimary: '#1e293b',      // Very dark slate
  textSecondary: '#475569',    // Medium slate
  textMuted: '#64748b',        // Lighter slate
  headerBg: '#f1f5f9',         // Light slate background
  cardBg: '#f8fafc',           // Very light slate
  border: '#cbd5e1',           // Slate border
};

const STATUS_ICONS: Record<ExecutionStatus, React.ReactNode> = {
  completed: <CheckCircle className="h-5 w-5 text-accent-green" />,
  failed: <AlertCircle className="h-5 w-5 text-red-500" />,
  processing: <Loader2 className="h-5 w-5 text-accent-blue animate-spin" />,
  pending: <Clock className="h-5 w-5 text-text-secondary" />,
  cancelled: <X className="h-5 w-5 text-accent-orange" />,
};

const STATUS_COLORS: Record<ExecutionStatus, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  completed: 'success',
  processing: 'info',
  pending: 'default',
  failed: 'error',
  cancelled: 'warning',
};

function formatDuration(ms: number | null): string {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

export function ExecutionDetailModal({ executionId, onClose, isDarkMode = false }: ExecutionDetailModalProps) {
  const { data: execution, isLoading, error } = useExecutionDetail(executionId);

  // Parse execution trace to extract LLM response
  const parsedTrace = useMemo(() => {
    if (execution?.output) {
      return parseExecutionTrace(execution.output);
    }
    return { llmResponse: null, toolCalls: [], totalDurationMs: 0, toolCallsCount: 0, hasErrors: false };
  }, [execution?.output]);

  if (!executionId) return null;

  return (
    <Modal isOpen={!!executionId} onClose={onClose} size="xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-h2 font-bold" style={{ color: COLORS.textPrimary }}>
            Execution Details
          </h2>
          {execution && (
            <Badge variant={STATUS_COLORS[execution.status]} size="md">
              {STATUS_ICONS[execution.status]}
              <span className="ml-2">{execution.status}</span>
            </Badge>
          )}
        </div>
        <button
          onClick={onClose}
          className="hover:opacity-70 transition-opacity"
          style={{ color: COLORS.textSecondary }}
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loading />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-lg font-medium" style={{ color: COLORS.textPrimary }}>
            Failed to load execution details
          </p>
          <p className="text-sm mt-2" style={{ color: COLORS.textSecondary }}>
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
        </div>
      )}

      {execution && (
        <>
          {/* Summary Header */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 rounded-lg"
            style={{ backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.border}` }}
          >
            <div>
              <div className="text-xs font-medium uppercase mb-1" style={{ color: COLORS.textSecondary }}>
                Execution ID
              </div>
              <div className="text-sm font-mono truncate" style={{ color: COLORS.textPrimary }}>
                {execution.id.slice(0, 12)}...
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase mb-1" style={{ color: COLORS.textSecondary }}>
                Agent
              </div>
              <div className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>
                {execution.agent_name}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase mb-1" style={{ color: COLORS.textSecondary }}>
                Duration
              </div>
              <div className="text-sm tabular-nums" style={{ color: COLORS.textPrimary }}>
                {formatDuration(execution.duration_ms)}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase mb-1" style={{ color: COLORS.textSecondary }}>
                Started
              </div>
              <div className="text-sm" style={{ color: COLORS.textPrimary }}>
                {formatDistanceToNow(new Date(execution.started_at), { addSuffix: true })}
              </div>
              <div className="text-xs" style={{ color: COLORS.textSecondary }}>
                {format(new Date(execution.started_at), 'MMM d, HH:mm:ss')}
              </div>
            </div>
          </div>

          {/* Error Message (if failed) */}
          {execution.status === 'failed' && execution.error_message && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-red-900 dark:text-red-200 mb-1">
                    Error Message
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300 font-mono whitespace-pre-wrap">
                    {execution.error_message}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <Tabs
            tabs={[
              {
                key: 'execution',
                label: '⏱️ Execution Flow',
                content: (
                  <div className="space-y-4">
                    <ExecutionTraceTimeline
                      outputData={execution.output}
                      isDarkMode={isDarkMode}
                      totalDurationMs={execution.duration_ms ?? 0}
                    />
                  </div>
                ),
              },
              {
                key: 'conversation',
                label: '💬 LLM Conversation',
                content: (
                  <LLMConversationDisplay
                    llmResponse={parsedTrace.llmResponse}
                    isDarkMode={isDarkMode}
                    agentId={execution.agent_id}
                  />
                ),
              },
              {
                key: 'input',
                label: '📥 Input Data',
                content: (
                  <div className="rounded-lg border border-white/50 dark:border-white/20 overflow-hidden">
                    {execution.input ? (
                      <JsonView
                        value={execution.input}
                        style={isDarkMode ? darkTheme : lightTheme}
                        displayDataTypes={false}
                        collapsed={2}
                        enableClipboard
                      />
                    ) : (
                      <div className="p-6 text-center" style={{ color: COLORS.textSecondary }}>
                        No input data available
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'raw-output',
                label: '📤 Raw Output',
                content: (
                  <div className="rounded-lg border border-white/50 dark:border-white/20 overflow-hidden">
                    {execution.output ? (
                      <JsonView
                        value={execution.output}
                        style={isDarkMode ? darkTheme : lightTheme}
                        displayDataTypes={false}
                        collapsed={2}
                        enableClipboard
                      />
                    ) : (
                      <div className="p-6 text-center" style={{ color: COLORS.textSecondary }}>
                        No output data available
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'metadata',
                label: '📋 Metadata & Logs',
                content: (
                  <div className="space-y-4">
                    {/* Metadata Section */}
                    <div>
                      <h3 className="text-sm font-semibold mb-2" style={{ color: COLORS.textPrimary }}>
                        Metadata
                      </h3>
                      <div className="rounded-lg border border-white/50 dark:border-white/20 overflow-hidden">
                        <JsonView
                          value={execution.metadata}
                          style={isDarkMode ? darkTheme : lightTheme}
                          displayDataTypes={false}
                          collapsed={1}
                          enableClipboard
                        />
                      </div>
                    </div>

                    {/* Logs Section */}
                    {execution.logs && execution.logs.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2" style={{ color: COLORS.textPrimary }}>
                          Execution Logs ({execution.logs.length})
                        </h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
                          {execution.logs.map((log, index) => (
                            <div
                              key={index}
                              className={`p-3 rounded-lg border text-sm font-mono ${
                                log.level === 'error'
                                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
                                  : log.level === 'warning'
                                  ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-200'
                                  : 'bg-white/50 dark:bg-white/5 border-white/50 dark:border-white/20 text-text-primary dark:text-white'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <span className="font-semibold uppercase text-xs">
                                  {log.level}
                                </span>
                                <span className="text-xs text-text-secondary dark:text-white/60">
                                  {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                                </span>
                              </div>
                              <div className="whitespace-pre-wrap">{log.message}</div>
                              {log.context && (
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-xs text-text-secondary dark:text-white/60 hover:text-text-primary dark:hover:text-white">
                                    View Context
                                  </summary>
                                  <div className="mt-2 p-2 rounded bg-white dark:bg-black/20 border border-white/50 dark:border-white/20">
                                    <JsonView
                                      value={log.context}
                                      style={isDarkMode ? darkTheme : lightTheme}
                                      displayDataTypes={false}
                                      collapsed={1}
                                      enableClipboard={false}
                                    />
                                  </div>
                                </details>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
            variant="pills"
          />
        </>
      )}
    </Modal>
  );
}
