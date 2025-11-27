/**
 * Execution Detail Modal Component
 *
 * Comprehensive modal displaying execution details with:
 * - Agent Response tab: Full LLM conversation display
 * - Tools Used tab: User-friendly tool cards with parameters
 * - Input Data tab: Formatted key-value display
 * - Raw Data tab: Full JSON for debugging (expanded)
 *
 * Design inspired by:
 * - LangSmith trace visualization
 * - Datadog LLM Observability
 * - Langfuse trace UI
 */

import { useMemo } from 'react';
import { X, Clock, AlertCircle, CheckCircle, Loader2, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { LLMConversationDisplay } from './LLMConversationDisplay';
import { ToolsUsedDisplay } from './ToolsUsedDisplay';
import { KeyValueDisplay } from './KeyValueDisplay';
import { parseExecutionTrace } from '@/lib/utils/execution-trace-parser';
import { useExecutionDetail, type ExecutionStatus } from '@/lib/hooks/useExecutions';

interface ExecutionDetailModalProps {
  executionId: string | null;
  onClose: () => void;
  isDarkMode?: boolean;
}

const COLORS = {
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  bgCard: '#ffffff',
  bgAlt: '#f8fafc',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

const STATUS_ICONS: Record<ExecutionStatus, React.ReactNode> = {
  completed: <CheckCircle className="h-5 w-5" style={{ color: COLORS.success }} />,
  failed: <AlertCircle className="h-5 w-5" style={{ color: COLORS.error }} />,
  processing: <Loader2 className="h-5 w-5 animate-spin" style={{ color: COLORS.info }} />,
  pending: <Clock className="h-5 w-5" style={{ color: COLORS.textSecondary }} />,
  cancelled: <X className="h-5 w-5" style={{ color: COLORS.warning }} />,
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

/**
 * Raw JSON display component with full expansion
 */
function RawDataDisplay({ data, title }: { data: unknown; title: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!data) {
    return (
      <div
        className="p-6 text-center rounded-xl"
        style={{ backgroundColor: COLORS.bgAlt, border: `1px solid ${COLORS.border}`, color: COLORS.textMuted }}
      >
        No {title.toLowerCase()} available
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${COLORS.border}` }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: COLORS.bgAlt, borderBottom: `1px solid ${COLORS.border}` }}
      >
        <span className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>
          {title}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          style={{ color: copied ? COLORS.success : COLORS.textSecondary }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
      </div>
      <pre
        className="p-4 text-xs font-mono overflow-auto max-h-[500px]"
        style={{ backgroundColor: COLORS.bgCard, color: COLORS.textPrimary }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export function ExecutionDetailModal({ executionId, onClose, isDarkMode = false }: ExecutionDetailModalProps) {
  const { data: execution, isLoading, error } = useExecutionDetail(executionId);

  // Parse execution trace to extract LLM response and tool calls
  const parsedTrace = useMemo(() => {
    if (execution?.output) {
      return parseExecutionTrace(execution.output);
    }
    return { llmResponse: null, toolCalls: [], totalDurationMs: 0, toolCallsCount: 0, hasErrors: false };
  }, [execution?.output]);

  if (!executionId) return null;

  return (
    <Modal isOpen={!!executionId} onClose={onClose} size="xl" scrollable>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold" style={{ color: COLORS.textPrimary }}>
            Execution Details
          </h2>
          {execution && (
            <Badge variant={STATUS_COLORS[execution.status]} size="md">
              {STATUS_ICONS[execution.status]}
              <span className="ml-2 capitalize">{execution.status}</span>
            </Badge>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          style={{ color: COLORS.textSecondary }}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loading />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-12 w-12 mb-4" style={{ color: COLORS.error }} />
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
          {/* Summary Cards */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 rounded-xl"
            style={{ backgroundColor: COLORS.bgAlt, border: `1px solid ${COLORS.border}` }}
          >
            <div>
              <div className="text-xs font-medium uppercase mb-1" style={{ color: COLORS.textSecondary }}>
                Execution ID
              </div>
              <div className="text-sm font-mono" style={{ color: COLORS.textPrimary }}>
                {execution.id.slice(0, 12)}...
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase mb-1" style={{ color: COLORS.textSecondary }}>
                Agent
              </div>
              <div className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>
                {execution.agent_name}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase mb-1" style={{ color: COLORS.textSecondary }}>
                Duration
              </div>
              <div className="text-sm font-mono font-semibold" style={{ color: COLORS.textPrimary }}>
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
              <div className="text-xs mt-0.5" style={{ color: COLORS.textSecondary }}>
                {format(new Date(execution.started_at), 'MMM d, HH:mm:ss')}
              </div>
            </div>
          </div>

          {/* Error Message (if failed) */}
          {execution.status === 'failed' && execution.error_message && (
            <div
              className="mb-6 p-4 rounded-xl"
              style={{ backgroundColor: '#fef2f2', border: `1px solid #fecaca` }}
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: COLORS.error }} />
                <div>
                  <div className="text-sm font-semibold mb-1" style={{ color: '#991b1b' }}>
                    Error Message
                  </div>
                  <div className="text-sm font-mono whitespace-pre-wrap" style={{ color: '#b91c1c' }}>
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
                key: 'response',
                label: '💬 Agent Response',
                content: (
                  <LLMConversationDisplay
                    llmResponse={parsedTrace.llmResponse}
                    isDarkMode={isDarkMode}
                    agentId={execution.agent_id}
                  />
                ),
              },
              {
                key: 'tools',
                label: `🔧 Tools Used (${parsedTrace.toolCalls.length})`,
                content: (
                  <ToolsUsedDisplay
                    toolCalls={parsedTrace.toolCalls}
                    isDarkMode={isDarkMode}
                  />
                ),
              },
              {
                key: 'input',
                label: '📥 Input Data',
                content: (
                  <div className="space-y-4">
                    <p className="text-sm" style={{ color: COLORS.textSecondary }}>
                      Original input data that triggered this execution:
                    </p>
                    {execution.input ? (
                      <KeyValueDisplay data={execution.input} maxDepth={5} />
                    ) : (
                      <div
                        className="p-6 text-center rounded-xl"
                        style={{ backgroundColor: COLORS.bgAlt, border: `1px solid ${COLORS.border}`, color: COLORS.textMuted }}
                      >
                        No input data available
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'raw',
                label: '📄 Raw Data',
                content: (
                  <div className="space-y-4">
                    <p className="text-sm" style={{ color: COLORS.textSecondary }}>
                      Full execution data for debugging purposes:
                    </p>
                    <RawDataDisplay data={execution.output} title="Output Data" />
                    <RawDataDisplay data={execution.metadata} title="Metadata" />
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
