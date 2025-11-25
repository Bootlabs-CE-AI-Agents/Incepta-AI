/**
 * TestResultPanel Component
 * Displays LLM response with markdown rendering and metrics
 *
 * Story: nextjs-story-29-prompts-llm-test
 * AC: AC-3 (Result Panel with LLM Response)
 */

'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import type { LLMTestResponse } from '@/lib/hooks/useLLMTest';

interface TestResultPanelProps {
  result: LLMTestResponse;
  variables?: Record<string, string>;
  isHistorical?: boolean;
}

export function TestResultPanel({ result, variables, isHistorical = false }: TestResultPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.response);
      setCopied(true);
      toast.success('Response copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy response');
    }
  };

  const handleCopyShortcut = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      handleCopy();
    }
  };

  return (
    <div
      className="rounded-lg border border-white/50 dark:border-white/20 bg-white dark:bg-white/5 p-6"
      onKeyDown={handleCopyShortcut}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary dark:text-white flex items-center gap-2">
          Test Result
          {isHistorical && (
            <span className="text-xs font-normal text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
              Historical
            </span>
          )}
        </h3>
        <Button
          onClick={handleCopy}
          variant="ghost"
          size="sm"
          className="text-text-secondary hover:text-text-primary dark:text-text-secondary dark:hover:text-white"
          aria-label="Copy response to clipboard (Ctrl+K)"
        >
          {copied ? (
            <Check className="h-4 w-4 mr-1" />
          ) : (
            <Copy className="h-4 w-4 mr-1" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      {/* LLM Response with Markdown */}
      <div className="mb-4">
        <Label className="text-xs font-medium text-text-primary dark:text-text-secondary mb-2">
          LLM Response:
        </Label>
        <div className="max-h-96 overflow-y-auto rounded-md border border-white/50 dark:border-white/20 bg-white/50 dark:bg-white/5 p-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                code(props) {
                  const { className, children, ...rest } = props;
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match;

                  return isInline ? (
                    <code {...rest} className={className}>
                      {children}
                    </code>
                  ) : (
                    <SyntaxHighlighter
                      style={dark}
                      language={match[1]}
                      PreTag="div"
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  );
                },
              }}
            >
              {result.response}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-text-primary dark:text-text-secondary">
          Metrics:
        </Label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center space-x-2 text-text-secondary dark:text-text-secondary">
            <span>•</span>
            <span>
              {result.usage.input_tokens} input / {result.usage.output_tokens}{' '}
              output / {result.usage.total_tokens} total tokens
            </span>
          </div>
          <div className="flex items-center space-x-2 text-text-secondary dark:text-text-secondary">
            <span>•</span>
            <span>{result.execution_time.toFixed(1)}s execution time</span>
          </div>
          <div className="flex items-center space-x-2 text-text-secondary dark:text-text-secondary">
            <span>•</span>
            <span>${result.cost.toFixed(4)} USD cost</span>
          </div>
          <div className="flex items-center space-x-2 text-text-secondary dark:text-text-secondary">
            <span>•</span>
            <span>Model: {result.model}</span>
          </div>
        </div>
      </div>

      {/* Variables Used */}
      {variables && Object.keys(variables).length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/50 dark:border-white/20">
          <Label className="text-xs font-medium text-text-primary dark:text-text-secondary mb-2">
            Variables Used:
          </Label>
          <div className="space-y-1">
            {Object.entries(variables).map(([key, value]) => (
              <div
                key={key}
                className="flex items-start space-x-2 text-xs text-text-secondary dark:text-text-secondary"
              >
                <span className="font-mono">{`{{${key}}}`}:</span>
                <span className="text-text-secondary">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Add Label component if not imported
function Label({
  children,
  className = '',
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={`block ${className}`} {...props}>
      {children}
    </label>
  );
}
