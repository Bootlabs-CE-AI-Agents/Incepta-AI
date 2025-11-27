/**
 * LLM Conversation Display Component
 *
 * Shows the complete LLM interaction with full response display.
 * No truncation - shows everything by default.
 */

import { useState } from 'react';
import { Info, MessageCircle, Brain, Copy, Check, User, Bot, Sparkles } from 'lucide-react';
import { formatDuration, type LLMStep } from '@/lib/utils/execution-trace-parser';

interface LLMConversationDisplayProps {
  llmResponse: LLMStep | null;
  isDarkMode?: boolean;
  agentId?: string;
}

const COLORS = {
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  bgCard: '#ffffff',
  bgAlt: '#f8fafc',
  userBg: '#eff6ff',
  userBorder: '#bfdbfe',
  userAccent: '#3b82f6',
  agentBg: '#f0fdf4',
  agentBorder: '#bbf7d0',
  agentAccent: '#10b981',
  infoBg: '#fefce8',
  infoBorder: '#fef08a',
  infoAccent: '#eab308',
};

/**
 * Copy button component
 */
function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
      style={{ color: copied ? '#10b981' : COLORS.textSecondary }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

/**
 * Message bubble component
 */
function MessageBubble({
  type,
  title,
  content,
  icon,
  metadata,
}: {
  type: 'user' | 'agent' | 'info';
  title: string;
  content: string;
  icon: React.ReactNode;
  metadata?: React.ReactNode;
}) {
  const config = {
    user: {
      bg: COLORS.userBg,
      border: COLORS.userBorder,
      accent: COLORS.userAccent,
    },
    agent: {
      bg: COLORS.agentBg,
      border: COLORS.agentBorder,
      accent: COLORS.agentAccent,
    },
    info: {
      bg: COLORS.infoBg,
      border: COLORS.infoBorder,
      accent: COLORS.infoAccent,
    },
  }[type];

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: config.bg, border: `1px solid ${config.border}` }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${config.border}` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${config.accent}20`, color: config.accent }}
          >
            {icon}
          </div>
          <div>
            <div className="font-semibold text-sm" style={{ color: COLORS.textPrimary }}>
              {title}
            </div>
            {metadata && (
              <div className="text-xs mt-0.5" style={{ color: COLORS.textSecondary }}>
                {metadata}
              </div>
            )}
          </div>
        </div>
        {content && <CopyButton text={content} />}
      </div>

      {/* Content - FULL display, no truncation */}
      <div className="p-4">
        {content ? (
          <div
            className="text-sm leading-relaxed whitespace-pre-wrap break-words"
            style={{ color: COLORS.textPrimary }}
          >
            {content}
          </div>
        ) : (
          <div className="text-sm italic" style={{ color: COLORS.textMuted }}>
            No content available
          </div>
        )}
      </div>
    </div>
  );
}

export function LLMConversationDisplay({
  llmResponse,
  isDarkMode = false,
  agentId,
}: LLMConversationDisplayProps) {
  if (!llmResponse) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: COLORS.bgAlt, border: `1px solid ${COLORS.border}` }}
      >
        <MessageCircle className="h-12 w-12 mx-auto mb-3" style={{ color: COLORS.textMuted }} />
        <p className="text-base font-medium" style={{ color: COLORS.textSecondary }}>
          No LLM conversation data available
        </p>
        <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>
          This execution may not have included an LLM interaction
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div
        className="rounded-xl p-4 flex items-center justify-between flex-wrap gap-4"
        style={{ backgroundColor: COLORS.bgAlt, border: `1px solid ${COLORS.border}` }}
      >
        <div className="flex items-center gap-6">
          {llmResponse.model && (
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: COLORS.agentAccent }} />
              <span className="text-sm" style={{ color: COLORS.textSecondary }}>Model:</span>
              <span className="font-mono font-medium text-sm" style={{ color: COLORS.textPrimary }}>
                {llmResponse.model}
              </span>
            </div>
          )}
          {llmResponse.durationMs !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: COLORS.textSecondary }}>Response time:</span>
              <span className="font-mono font-medium text-sm" style={{ color: COLORS.textPrimary }}>
                {formatDuration(llmResponse.durationMs)}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs" style={{ color: COLORS.textMuted }}>
          {llmResponse.userMessage && (
            <span>Input: {llmResponse.userMessage.length.toLocaleString()} chars</span>
          )}
          {llmResponse.response && (
            <span>Output: {llmResponse.response.length.toLocaleString()} chars</span>
          )}
        </div>
      </div>

      {/* System Prompt Info */}
      <div
        className="rounded-xl p-4 flex items-start gap-3"
        style={{ backgroundColor: COLORS.infoBg, border: `1px solid ${COLORS.infoBorder}` }}
      >
        <Info className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: COLORS.infoAccent }} />
        <div>
          <div className="font-semibold text-sm mb-1" style={{ color: '#92400e' }}>
            System Prompt
          </div>
          <p className="text-sm" style={{ color: '#a16207' }}>
            The system prompt is configured on the agent
            {agentId ? ` (ID: ${agentId.slice(0, 8)}...)` : ''}.
            To view or modify it, go to the Agent Configuration page.
          </p>
        </div>
      </div>

      {/* User Message */}
      <MessageBubble
        type="user"
        title="User Message"
        content={llmResponse.userMessage || ''}
        icon={<User className="h-4 w-4" />}
        metadata="Input to the LLM"
      />

      {/* Agent Response - FULL response, no truncation */}
      <MessageBubble
        type="agent"
        title="Agent Response"
        content={llmResponse.response || ''}
        icon={<Bot className="h-4 w-4" />}
        metadata={
          llmResponse.durationMs !== undefined
            ? `Generated in ${formatDuration(llmResponse.durationMs)}`
            : undefined
        }
      />
    </div>
  );
}
