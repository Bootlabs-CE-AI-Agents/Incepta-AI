/**
 * Prompt Preview Component
 *
 * Displays a preview of the prompt with variables substituted.
 * Story 0.4.2: System Prompt Editor Part 1 - Part 6
 * Story 27 AC-4/AC-5: Enhanced with markdown rendering and variable substitution toggle
 */

'use client';

import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
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
  const [substituteVars, setSubstituteVars] = useState(false); // AC-5: Variable substitution toggle
  const [renderMarkdown, setRenderMarkdown] = useState(true); // AC-4: Markdown rendering toggle

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

  // Substitute variables (AC-5: Only if enabled)
  const previewText = useMemo(() => {
    if (substituteVars) {
      return substituteVariables(promptText, variableValues, {
        useDefaults: true,
        keepMissing: true,
      });
    }
    return promptText; // Show raw template if substitution disabled
  }, [promptText, variableValues, substituteVars]);

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
          {/* AC-5: Substitution mode badge */}
          {substituteVars && (
            <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded">
              🔄 Substitution Mode
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

      {/* AC-5: Toggles for substitution and markdown */}
      <div className="flex items-center gap-4 text-xs">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={substituteVars}
            onChange={(e) => setSubstituteVars(e.target.checked)}
            className="rounded border-gray-600 text-primary focus:ring-primary"
          />
          <span className="text-text-secondary">Substitute variables with sample values</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={renderMarkdown}
            onChange={(e) => setRenderMarkdown(e.target.checked)}
            className="rounded border-gray-600 text-primary focus:ring-primary"
          />
          <span className="text-text-secondary">Render markdown</span>
        </label>
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

      {/* Preview content (AC-4: Markdown rendering) */}
      {isVisible && (
        <div className="relative">
          <div className="p-4 bg-surface border border-white/10 rounded-lg overflow-auto max-h-96">
            {renderMarkdown ? (
              /* AC-4: Markdown rendered preview */
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    // Style variables distinctly even when rendered
                    code: ({ className, children, ...props }: React.ComponentProps<'code'>) => {
                      const text = String(children);
                      // Inline code doesn't have className starting with 'language-'
                      const isInline = !className || !className.startsWith('language-');
                      // Check if it looks like a variable {{varname}}
                      if (isInline && /^\{\{[\w_]+\}\}$/.test(text.trim())) {
                        return (
                          <code
                            className="px-1 py-0.5 bg-primary/20 text-primary rounded font-mono text-xs"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      }
                      return (
                        <code
                          className={isInline ? 'bg-gray-800 px-1 rounded' : className}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {previewText}
                </ReactMarkdown>
              </div>
            ) : (
              /* Plain text preview */
              <pre className="text-sm text-text-primary whitespace-pre-wrap font-mono leading-relaxed">
                {previewText}
              </pre>
            )}
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
