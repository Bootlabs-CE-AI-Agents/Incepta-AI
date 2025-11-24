'use client';

/**
 * Prompt Editor Component (Full-featured with CodeMirror)
 * 
 * This is the full PromptEditor used in the prompts management pages.
 * Features:
 * - CodeMirror 6 with variable syntax highlighting
 * - Token counting with model-specific estimation
 * - Save/Revert functionality
 * - Variable detection and display
 * 
 * For the simplified version used in AgentForm, see SystemPromptEditor.
 * 
 * Story 0.4.3: System Prompt Editor Part 2
 */

import React, { useMemo } from 'react';
import { CodeMirrorEditor } from './CodeMirrorEditor';
import { estimateTokenCount, formatTokenCount, getTokenLimitWarning } from '@/lib/utils/tokenCounter';
import { extractVariables } from '@/lib/utils/promptVariables';

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => Promise<void>;
  onRevert?: () => void;
  isSubmitting?: boolean;
  model?: string;
  maxTokens?: number;
  maxCharacters?: number; // AC-2: Character limit (Story 27)
}

export function PromptEditor({
  value,
  onChange,
  onSave,
  onRevert,
  isSubmitting = false,
  model = 'gpt-4',
  maxTokens = 4000,
  maxCharacters = 12000, // AC-2: Default 12,000 character limit
}: PromptEditorProps) {
  // Character count for Story 27 (AC-2)
  const characterCount = value.length;

  // Calculate token count
  const tokenCount = useMemo(
    () => estimateTokenCount(value, model),
    [value, model]
  );

  // Extract variables
  const variables = useMemo(() => extractVariables(value), [value]);

  // Get warning level for characters (AC-2: 8000=warning, 12000=danger)
  const charWarningLevel = useMemo(() => {
    if (characterCount >= maxCharacters) return 'danger';
    if (characterCount >= (maxCharacters * 0.67)) return 'warning'; // 8000 is 67% of 12000
    return 'safe';
  }, [characterCount, maxCharacters]);

  // Get warning level for tokens
  const tokenWarningLevel = useMemo(
    () => getTokenLimitWarning(tokenCount, maxTokens),
    [tokenCount, maxTokens]
  );

  // Character count color based on warning level
  const charCountColor = {
    safe: 'text-gray-400',
    warning: 'text-yellow-400',
    danger: 'text-red-400',
  }[charWarningLevel];

  // Token count color based on warning level
  const tokenCountColor = {
    safe: 'text-green-400',
    warning: 'text-yellow-400',
    danger: 'text-red-400',
  }[tokenWarningLevel];

  return (
    <div className="space-y-4">
      {/* CodeMirror Editor */}
      <CodeMirrorEditor
        value={value}
        onChange={onChange}
        onSave={onSave} // AC-6: Pass save handler for Ctrl+S
        placeholder="You are a helpful assistant..."
        className="min-h-[400px]"
      />
      
      {/* Footer with character count, token count and variables */}
      <div className="space-y-2">
        {/* Character count (AC-2: Story 27) */}
        <div className="flex items-center justify-between text-xs px-4 py-2 bg-surface/50 rounded-lg border border-white/5">
          <div className="flex items-center gap-3">
            <span className={charCountColor}>
              Characters: {characterCount.toLocaleString()} / {maxCharacters.toLocaleString()}
            </span>
            {charWarningLevel === 'warning' && (
              <span className="text-yellow-400">⚠️ Approaching limit</span>
            )}
            {charWarningLevel === 'danger' && (
              <span className="text-red-400">❌ Exceeds maximum</span>
            )}
          </div>

          {/* Token count */}
          <div className="flex items-center gap-3">
            <span className={tokenCountColor}>
              {formatTokenCount(tokenCount)}
            </span>
            <span className="text-text-tertiary">
              / {maxTokens.toLocaleString()} max tokens
            </span>
            {tokenWarningLevel === 'warning' && (
              <span className="text-yellow-400">⚠️</span>
            )}
            {tokenWarningLevel === 'danger' && (
              <span className="text-red-400">❌</span>
            )}
          </div>
        </div>

        {/* Variables detected */}
        {variables.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-text-secondary px-4 py-2 bg-surface/50 rounded-lg border border-white/5">
            <span className="text-text-tertiary">Variables ({variables.length}):</span>
            <div className="flex gap-1 flex-wrap">
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
      
      {/* Action buttons */}
      {onSave && (
        <div className="flex gap-2">
          <button
            onClick={onSave}
            disabled={isSubmitting || charWarningLevel === 'danger'} // AC-2: Disable save when ≥12,000 characters
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
          {onRevert && (
            <button
              onClick={onRevert}
              disabled={isSubmitting}
              className="px-4 py-2 bg-surface border border-white/10 text-text-primary rounded-md hover:bg-white/5 disabled:opacity-50 transition-colors"
            >
              Revert Changes
            </button>
          )}
        </div>
      )}
    </div>
  );
}
