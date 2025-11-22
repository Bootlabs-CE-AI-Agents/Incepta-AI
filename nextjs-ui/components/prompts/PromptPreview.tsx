/**
 * Prompt Preview Component
 * 
 * Displays a preview of the prompt with variables substituted.
 * Story 0.4.2: System Prompt Editor Part 1 - Part 6
 */

'use client';

import React, { useMemo, useState } from 'react';
import { substituteVariables, validatePrompt } from '@/lib/utils/promptVariables';
import type { PromptVariable } from '@/types/prompts';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';

interface PromptPreviewProps {
  /** Prompt template text */
  promptText: string;
  /** Declared variables */
  variables: PromptVariable[];
  /** Custom variable values for preview (optional) */
  previewValues?: Record<string, string>;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Prompt Preview Component
 * 
 * Features:
 * - Shows prompt with variables substituted
 * - Uses example values or defaults from variable definitions
 * - Allows custom preview values
 * - Copy to clipboard functionality
 * - Toggle preview visibility
 * - Highlights missing required variables
 */
export function PromptPreview({
  promptText,
  variables,
  previewValues = {},
  className = '',
}: PromptPreviewProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  // Build variable values for preview
  const variableValues = useMemo(() => {
    const values: Record<string, string> = {};
    
    variables.forEach((variable) => {
      // Priority: previewValues > exampleValue > defaultValue > placeholder
      values[variable.name] = 
        previewValues[variable.name] ||
        variable.exampleValue ||
        variable.defaultValue ||
        `[[${variable.name}]]`;
    });

    return values;
  }, [variables, previewValues]);

  // Substitute variables
  const previewText = useMemo(() => {
    return substituteVariables(promptText, variableValues, {
      useDefaults: true,
      keepMissing: true,
    });
  }, [promptText, variableValues]);

  // Validate prompt
  const validation = useMemo(() => {
    return validatePrompt(promptText, variables, variableValues);
  }, [promptText, variables, variableValues]);

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">
            Preview
          </h3>
          {!validation.isValid && (
            <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs rounded">
              ⚠️ {validation.errors.length} warning{validation.errors.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded transition-colors"
            title="Copy preview"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => setIsVisible(!isVisible)}
            className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded transition-colors"
            title={isVisible ? 'Hide preview' : 'Show preview'}
          >
            {isVisible ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Validation warnings */}
      {!validation.isValid && (
        <div className="space-y-1">
          {validation.errors.map((error, index) => (
            <div
              key={index}
              className="px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-400"
            >
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Preview content */}
      {isVisible && (
        <div className="relative">
          <div className="p-4 bg-surface border border-white/10 rounded-lg overflow-auto max-h-96">
            <pre className="text-sm text-text-primary whitespace-pre-wrap font-mono leading-relaxed">
              {previewText}
            </pre>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-4 mt-2 text-xs text-text-tertiary">
            <span>{previewText.length.toLocaleString()} characters</span>
            <span>•</span>
            <span>{previewText.split(/\s+/).length.toLocaleString()} words</span>
            <span>•</span>
            <span>{previewText.split('\n').length} lines</span>
          </div>
        </div>
      )}

      {/* Collapsed state */}
      {!isVisible && (
        <div className="px-3 py-2 bg-surface/50 border border-white/5 rounded-lg text-xs text-text-tertiary text-center">
          Preview hidden. Click eye icon to show.
        </div>
      )}
    </div>
  );
}
