/**
 * LLM Conversation Display Component
 *
 * Shows the LLM interaction details including system prompt context, user message, and agent response
 */

import { Info, MessageCircle, Brain } from 'lucide-react';
import JsonView from '@uiw/react-json-view';
import { darkTheme } from '@uiw/react-json-view/dark';
import { lightTheme } from '@uiw/react-json-view/light';
import { formatDuration, type LLMStep } from '@/lib/utils/execution-trace-parser';

interface LLMConversationDisplayProps {
  llmResponse: LLMStep | null;
  isDarkMode?: boolean;
  agentId?: string;
}

// Direct color values for guaranteed visibility (bypassing Tailwind issues)
const COLORS = {
  textPrimary: '#1e293b',      // Very dark slate
  textSecondary: '#475569',    // Medium slate
  textMuted: '#64748b',        // Lighter slate
  border: '#cbd5e1',           // Slate border
  cardBg: '#f8fafc',           // Very light slate
};

export function LLMConversationDisplay({
  llmResponse,
  isDarkMode = false,
  agentId,
}: LLMConversationDisplayProps) {
  if (!llmResponse) {
    return (
      <div
        className="rounded-lg p-6 text-center"
        style={{ border: `1px solid ${COLORS.border}` }}
      >
        <MessageCircle className="h-12 w-12 mx-auto mb-3" style={{ color: COLORS.textMuted }} />
        <p style={{ color: COLORS.textSecondary }}>
          No LLM conversation data available
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* System Prompt Section */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/10 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-blue-900 dark:text-blue-200 text-sm mb-1">
              System Prompt
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              The system prompt is configured on the agent{agentId ? ` (ID: ${agentId.slice(0, 8)}...)` : ''}. To view or modify it, go to the Agent Management page and select this agent.
            </p>
          </div>
        </div>
      </div>

      {/* User Message Section */}
      <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
        <div className="px-4 py-3" style={{ backgroundColor: COLORS.cardBg, borderBottom: `1px solid ${COLORS.border}` }}>
          <div className="text-sm font-semibold flex items-center gap-2" style={{ color: COLORS.textPrimary }}>
            <MessageCircle className="h-4 w-4 text-purple-500" />
            User Message (Input)
          </div>
        </div>

        <div className="p-4">
          {llmResponse.userMessage ? (
            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: COLORS.textPrimary }}>
              {llmResponse.userMessage}
            </div>
          ) : (
            <div className="text-sm" style={{ color: COLORS.textSecondary }}>
              No user message available
            </div>
          )}
        </div>
      </div>

      {/* LLM Response Section */}
      <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
        <div className="px-4 py-3" style={{ backgroundColor: COLORS.cardBg, borderBottom: `1px solid ${COLORS.border}` }}>
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold flex items-center gap-2" style={{ color: COLORS.textPrimary }}>
              <Brain className="h-4 w-4 text-blue-500" />
              Agent Response
            </div>
            {llmResponse.durationMs !== undefined && (
              <div className="text-xs font-mono" style={{ color: COLORS.textSecondary }}>
                ⏱️ {formatDuration(llmResponse.durationMs)}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 max-h-96 overflow-y-auto">
          {llmResponse.response ? (
            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: COLORS.textPrimary }}>
              {llmResponse.response}
            </div>
          ) : (
            <div className="text-sm" style={{ color: COLORS.textSecondary }}>
              No response available
            </div>
          )}
        </div>
      </div>

      {/* Model Information (if available) */}
      {llmResponse.model && (
        <div className="text-xs px-1 py-2" style={{ color: COLORS.textSecondary, borderTop: `1px solid ${COLORS.border}` }}>
          Model: <span className="font-mono" style={{ color: COLORS.textPrimary }}>{llmResponse.model}</span>
        </div>
      )}
    </div>
  );
}
