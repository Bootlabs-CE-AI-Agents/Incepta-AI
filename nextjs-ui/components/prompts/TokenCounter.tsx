/**
 * Token Counter Display Component
 * 
 * Displays token count statistics with visual warnings.
 * Story 0.4.2: System Prompt Editor Part 1 - Part 5
 */

'use client';

import React from 'react';
import { formatTokenCount, getTokenLimitWarning } from '@/lib/utils/tokenCounter';
import type { TokenCount } from '@/types/prompts';

interface TokenCounterProps {
  /** Token count data */
  tokenCount: TokenCount;
  /** Maximum token limit */
  maxTokens?: number;
  /** Display mode: 'compact' or 'detailed' */
  mode?: 'compact' | 'detailed';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Token Counter Display Component
 * 
 * Shows token count with warning indicators:
 * - Green: < 75% of limit (safe)
 * - Yellow: 75-90% of limit (warning)
 * - Red: > 90% of limit (danger)
 */
export function TokenCounter({
  tokenCount,
  maxTokens = 4000,
  mode = 'compact',
  className = '',
}: TokenCounterProps) {
  const warningLevel = getTokenLimitWarning(tokenCount, maxTokens);
  
  const colorClasses = {
    safe: 'text-green-400',
    warning: 'text-yellow-400',
    danger: 'text-red-400',
  }[warningLevel];

  const bgClasses = {
    safe: 'bg-green-500/10 border-green-500/20',
    warning: 'bg-yellow-500/10 border-yellow-500/20',
    danger: 'bg-red-500/10 border-red-500/20',
  }[warningLevel];

  const warningIcon = {
    safe: '✓',
    warning: '⚠️',
    danger: '❌',
  }[warningLevel];

  const warningText = {
    safe: 'Within limit',
    warning: 'Approaching limit',
    danger: 'Over limit',
  }[warningLevel];

  const percentage = Math.round((tokenCount.count / maxTokens) * 100);

  if (mode === 'compact') {
    return (
      <div className={`flex items-center gap-2 text-xs ${className}`}>
        <span className={colorClasses}>
          {formatTokenCount(tokenCount)}
        </span>
        <span className="text-text-tertiary">/</span>
        <span className="text-text-tertiary">
          {maxTokens.toLocaleString()}
        </span>
        {warningLevel !== 'safe' && (
          <span className={colorClasses}>
            {warningIcon} {warningText}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`p-3 border rounded-lg ${bgClasses} ${className}`}>
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-text-primary">
            Token Usage
          </h4>
          <span className={`text-xs font-medium ${colorClasses}`}>
            {warningIcon} {warningText}
          </span>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              warningLevel === 'safe' ? 'bg-green-400' :
              warningLevel === 'warning' ? 'bg-yellow-400' :
              'bg-red-400'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className={colorClasses}>
              {formatTokenCount(tokenCount)}
            </span>
            <span className="text-text-tertiary">
              / {maxTokens.toLocaleString()} tokens
            </span>
            <span className="text-text-tertiary">
              ({percentage}%)
            </span>
          </div>
          {tokenCount.estimatedCost && (
            <span className="text-text-tertiary">
              ~${tokenCount.estimatedCost.toFixed(4)}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex items-center gap-4 text-xs text-text-tertiary pt-1 border-t border-white/10">
          <span>{tokenCount.characters.toLocaleString()} chars</span>
          <span>•</span>
          <span>{tokenCount.words.toLocaleString()} words</span>
          <span>•</span>
          <span>Model: {tokenCount.model}</span>
        </div>
      </div>
    </div>
  );
}
