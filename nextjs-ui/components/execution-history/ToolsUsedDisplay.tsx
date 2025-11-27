/**
 * ToolsUsedDisplay Component
 *
 * Displays tool calls in a user-friendly card format inspired by:
 * - LangSmith trace visualization
 * - Datadog LLM Observability
 * - Langfuse trace UI
 *
 * Features:
 * - Tool cards with icons and status badges
 * - Parameters shown as readable key-value pairs
 * - Output displayed in formatted view
 * - Duration and timing information
 * - Expandable details
 */

import { useState } from 'react';
import {
  Wrench,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Zap,
  Database,
  Search,
  Mail,
  Globe,
  FileText,
  Code,
  MessageSquare,
  Copy,
  Check,
} from 'lucide-react';
import { formatDuration, type ToolCall } from '@/lib/utils/execution-trace-parser';
import { KeyValueDisplay } from './KeyValueDisplay';

interface ToolsUsedDisplayProps {
  toolCalls: ToolCall[];
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
  successBg: '#ecfdf5',
  error: '#ef4444',
  errorBg: '#fef2f2',
  warning: '#f59e0b',
  warningBg: '#fffbeb',
};

/**
 * Get appropriate icon for tool based on name
 */
function getToolIcon(toolName: string) {
  const name = toolName.toLowerCase();

  if (name.includes('search') || name.includes('find') || name.includes('query')) {
    return <Search className="h-5 w-5" />;
  }
  if (name.includes('database') || name.includes('db') || name.includes('sql')) {
    return <Database className="h-5 w-5" />;
  }
  if (name.includes('email') || name.includes('mail') || name.includes('send')) {
    return <Mail className="h-5 w-5" />;
  }
  if (name.includes('http') || name.includes('api') || name.includes('web') || name.includes('fetch')) {
    return <Globe className="h-5 w-5" />;
  }
  if (name.includes('file') || name.includes('read') || name.includes('write') || name.includes('document')) {
    return <FileText className="h-5 w-5" />;
  }
  if (name.includes('code') || name.includes('execute') || name.includes('run') || name.includes('script')) {
    return <Code className="h-5 w-5" />;
  }
  if (name.includes('chat') || name.includes('message') || name.includes('llm')) {
    return <MessageSquare className="h-5 w-5" />;
  }

  return <Wrench className="h-5 w-5" />;
}

/**
 * Get color scheme for tool based on name
 */
function getToolColor(toolName: string): string {
  const name = toolName.toLowerCase();

  if (name.includes('search') || name.includes('find')) return '#8b5cf6'; // Purple
  if (name.includes('database') || name.includes('db')) return '#06b6d4'; // Cyan
  if (name.includes('email') || name.includes('mail')) return '#f59e0b'; // Amber
  if (name.includes('http') || name.includes('api') || name.includes('web')) return '#3b82f6'; // Blue
  if (name.includes('file') || name.includes('document')) return '#10b981'; // Emerald
  if (name.includes('code') || name.includes('execute')) return '#ef4444'; // Red

  return '#64748b'; // Default gray
}

/**
 * Format tool result for display
 */
function formatToolResult(result: string): { type: 'json' | 'text'; data: unknown } {
  if (!result) return { type: 'text', data: '' };

  try {
    const parsed = JSON.parse(result);
    return { type: 'json', data: parsed };
  } catch {
    return { type: 'text', data: result };
  }
}

/**
 * Single tool card component
 */
function ToolCard({ tool, index }: { tool: ToolCall; index: number }) {
  const [isExpanded, setIsExpanded] = useState(true); // Expanded by default
  const [copied, setCopied] = useState(false);

  const toolColor = getToolColor(tool.toolName);
  const toolIcon = getToolIcon(tool.toolName);
  const isSuccess = tool.status === 'success';
  const formattedResult = formatToolResult(tool.toolResult);

  const handleCopyResult = async () => {
    try {
      await navigator.clipboard.writeText(tool.toolResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div
      className="rounded-xl overflow-hidden shadow-sm"
      style={{ backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}
    >
      {/* Tool Header */}
      <div
        className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Step number */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ backgroundColor: toolColor }}
        >
          {index + 1}
        </div>

        {/* Tool icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${toolColor}15`, color: toolColor }}
        >
          {toolIcon}
        </div>

        {/* Tool name and info */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base" style={{ color: COLORS.textPrimary }}>
            {tool.toolName}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {tool.durationMs !== undefined && (
              <span className="flex items-center gap-1 text-xs" style={{ color: COLORS.textSecondary }}>
                <Clock className="h-3 w-3" />
                {formatDuration(tool.durationMs)}
              </span>
            )}
            <span className="text-xs" style={{ color: COLORS.textMuted }}>
              {Object.keys(tool.toolArgs).length} parameters
            </span>
          </div>
        </div>

        {/* Status badge */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium flex-shrink-0"
          style={{
            backgroundColor: isSuccess ? COLORS.successBg : COLORS.errorBg,
            color: isSuccess ? COLORS.success : COLORS.error,
          }}
        >
          {isSuccess ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {isSuccess ? 'Success' : 'Failed'}
        </div>

        {/* Expand/collapse icon */}
        <div style={{ color: COLORS.textSecondary }}>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div
          className="px-4 pb-4 pt-2 space-y-4"
          style={{ backgroundColor: COLORS.bgAlt, borderTop: `1px solid ${COLORS.border}` }}
        >
          {/* Parameters Section */}
          <div>
            <h4
              className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-2"
              style={{ color: COLORS.textSecondary }}
            >
              <Zap className="h-3.5 w-3.5" />
              Input Parameters
            </h4>
            {Object.keys(tool.toolArgs).length > 0 ? (
              <KeyValueDisplay data={tool.toolArgs} maxDepth={4} showCopyButton={false} />
            ) : (
              <div
                className="p-3 rounded-lg text-sm text-center"
                style={{ backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, color: COLORS.textMuted }}
              >
                No parameters
              </div>
            )}
          </div>

          {/* Output Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4
                className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2"
                style={{ color: COLORS.textSecondary }}
              >
                <FileText className="h-3.5 w-3.5" />
                Output
              </h4>
              {tool.toolResult && (
                <button
                  onClick={handleCopyResult}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-slate-200 transition-colors"
                  style={{ color: copied ? COLORS.success : COLORS.textSecondary }}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>
            {tool.toolResult ? (
              formattedResult.type === 'json' ? (
                <KeyValueDisplay data={formattedResult.data} maxDepth={4} showCopyButton={false} />
              ) : (
                <div
                  className="p-3 rounded-lg text-sm font-mono whitespace-pre-wrap break-words max-h-64 overflow-y-auto"
                  style={{ backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}
                >
                  {String(formattedResult.data)}
                </div>
              )
            ) : (
              <div
                className="p-3 rounded-lg text-sm text-center"
                style={{ backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, color: COLORS.textMuted }}
              >
                No output
              </div>
            )}
          </div>

          {/* Error Section (if present) */}
          {tool.error && (
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: COLORS.errorBg, border: `1px solid ${COLORS.error}30` }}
            >
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: COLORS.error }} />
                <div>
                  <div className="text-sm font-medium mb-1" style={{ color: COLORS.error }}>
                    Error
                  </div>
                  <div className="text-sm font-mono whitespace-pre-wrap" style={{ color: '#991b1b' }}>
                    {tool.error}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Main ToolsUsedDisplay component
 */
export function ToolsUsedDisplay({ toolCalls, isDarkMode = false }: ToolsUsedDisplayProps) {
  if (!toolCalls || toolCalls.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: COLORS.bgAlt, border: `1px solid ${COLORS.border}` }}
      >
        <Wrench className="h-12 w-12 mx-auto mb-3" style={{ color: COLORS.textMuted }} />
        <p className="text-base font-medium" style={{ color: COLORS.textSecondary }}>
          No tools were used in this execution
        </p>
        <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>
          The agent completed without calling any external tools
        </p>
      </div>
    );
  }

  // Calculate summary stats
  const successCount = toolCalls.filter(t => t.status === 'success').length;
  const failedCount = toolCalls.filter(t => t.status === 'failed').length;
  const totalDuration = toolCalls.reduce((sum, t) => sum + (t.durationMs || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div
        className="rounded-xl p-4 flex items-center justify-between"
        style={{ backgroundColor: COLORS.bgAlt, border: `1px solid ${COLORS.border}` }}
      >
        <div className="flex items-center gap-6">
          <div>
            <div className="text-2xl font-bold" style={{ color: COLORS.textPrimary }}>
              {toolCalls.length}
            </div>
            <div className="text-xs uppercase tracking-wide" style={{ color: COLORS.textSecondary }}>
              Tools Called
            </div>
          </div>

          <div className="h-10 w-px" style={{ backgroundColor: COLORS.border }} />

          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" style={{ color: COLORS.success }} />
            <span className="font-semibold" style={{ color: COLORS.success }}>{successCount}</span>
            <span className="text-sm" style={{ color: COLORS.textSecondary }}>successful</span>
          </div>

          {failedCount > 0 && (
            <div className="flex items-center gap-1">
              <XCircle className="h-4 w-4" style={{ color: COLORS.error }} />
              <span className="font-semibold" style={{ color: COLORS.error }}>{failedCount}</span>
              <span className="text-sm" style={{ color: COLORS.textSecondary }}>failed</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" style={{ color: COLORS.textSecondary }} />
          <span className="text-sm" style={{ color: COLORS.textSecondary }}>
            Total time: <span className="font-mono font-semibold" style={{ color: COLORS.textPrimary }}>{formatDuration(totalDuration)}</span>
          </span>
        </div>
      </div>

      {/* Tool Cards */}
      <div className="space-y-3">
        {toolCalls.map((tool, index) => (
          <ToolCard key={index} tool={tool} index={index} />
        ))}
      </div>
    </div>
  );
}
