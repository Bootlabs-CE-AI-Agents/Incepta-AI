/**
 * System Prompt Editor Component
 *
 * Rich text editor for system prompts with variable highlighting and token counting.
 * Story 0.4.2: System Prompt Editor Part 1 - Core editor
 */

'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { estimateTokenCount, formatTokenCount, getTokenLimitWarning } from '@/lib/utils/tokenCounter';
import { extractVariables } from '@/lib/utils/promptVariables';
import type { TokenCount, EditorSettings } from '@/types/prompts';

interface SystemPromptEditorProps {
  /** Current prompt value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Error message */
  error?: string;
  /** Model name for token estimation */
  model?: string;
  /** Maximum token limit (default: 4000) */
  maxTokens?: number;
  /** Whether editor is disabled */
  disabled?: boolean;
  /** Minimum height in pixels */
  minHeight?: number;
  /** Editor settings */
  settings?: Partial<EditorSettings>;
}

/**
 * Prompt Editor with syntax highlighting for variables
 *
 * Features:
 * - Real-time token counting
 * - Variable placeholder highlighting
 * - Auto-growing textarea
 * - Token limit warnings
 */
export function SystemPromptEditor({
  value,
  onChange,
  placeholder = 'Enter your system prompt...',
  error,
  model = 'gpt-4',
  maxTokens = 4000,
  disabled = false,
  minHeight = 200,
  settings = {},
}: SystemPromptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Default settings
  const editorSettings: EditorSettings = {
    theme: settings.theme || 'dark',
    fontSize: settings.fontSize || 14,
    showLineNumbers: settings.showLineNumbers ?? false,
    lineWrap: settings.lineWrap ?? true,
    autoSave: settings.autoSave ?? false,
    autoSaveInterval: settings.autoSaveInterval || 30000,
  };

  // Calculate token count
  const tokenCount: TokenCount = useMemo(
    () => estimateTokenCount(value, model),
    [value, model]
  );

  // Extract variables
  const variables = useMemo(() => extractVariables(value), [value]);

  // Get warning level
  const warningLevel = useMemo(
    () => getTokenLimitWarning(tokenCount, maxTokens),
    [tokenCount, maxTokens]
  );

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(
        textareaRef.current.scrollHeight,
        minHeight
      )}px`;
    }
  }, [value, minHeight]);

  // Highlight variables in text for display
  const highlightedContent = useMemo(() => {
    if (!value) return '';

    // Replace {{variable}} with highlighted spans
    return value.replace(
      /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g,
      '<span class="text-primary font-semibold">{{$1}}</span>'
    );
  }, [value]);

  // Token count color based on warning level
  const tokenCountColor = {
    safe: 'text-green-400',
    warning: 'text-yellow-400',
    danger: 'text-red-400',
  }[warningLevel];

  return (
    <div className="space-y-2">
      {/* Editor container with syntax highlighting */}
      <div className="relative">
        {/* Highlighted background layer (hidden on focus for better typing experience) */}
        {!isFocused && value && (
          <div
            className="absolute inset-0 px-3 py-2 pointer-events-none whitespace-pre-wrap break-words text-transparent select-none overflow-hidden"
            style={{
              fontSize: `${editorSettings.fontSize}px`,
              fontFamily: 'monospace',
              lineHeight: '1.5',
              minHeight: `${minHeight}px`,
            }}
            dangerouslySetInnerHTML={{ __html: highlightedContent }}
          />
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            relative w-full px-3 py-2
            bg-surface border rounded-lg
            text-text-primary placeholder-text-tertiary
            focus:outline-none focus:ring-2 focus:ring-primary
            resize-none
            ${error ? 'border-destructive' : 'border-white/10'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${!isFocused && value ? 'text-transparent caret-text-primary' : ''}
          `}
          style={{
            fontSize: `${editorSettings.fontSize}px`,
            fontFamily: 'monospace',
            lineHeight: '1.5',
            minHeight: `${minHeight}px`,
            whiteSpace: editorSettings.lineWrap ? 'pre-wrap' : 'pre',
            overflowWrap: editorSettings.lineWrap ? 'break-word' : 'normal',
          }}
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Footer with token count and variables */}
      <div className="flex items-center justify-between text-xs text-text-secondary">
        {/* Token count */}
        <div className="flex items-center gap-3">
          <span className={tokenCountColor}>
            {formatTokenCount(tokenCount)}
          </span>
          <span className="text-text-tertiary">
            / {maxTokens.toLocaleString()} max tokens
          </span>
          {warningLevel === 'warning' && (
            <span className="text-yellow-400">⚠️ Approaching limit</span>
          )}
          {warningLevel === 'danger' && (
            <span className="text-red-400">❌ Over limit</span>
          )}
        </div>

        {/* Variables detected */}
        {variables.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-text-tertiary">Variables:</span>
            <div className="flex gap-1">
              {variables.slice(0, 5).map((varName) => (
                <span
                  key={varName}
                  className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs font-mono"
                >
                  {'{{'}{varName}{'}}'}
                </span>
              ))}
              {variables.length > 5 && (
                <span className="text-text-tertiary">
                  +{variables.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
