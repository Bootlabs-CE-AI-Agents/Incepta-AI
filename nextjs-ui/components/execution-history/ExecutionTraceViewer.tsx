/**
 * Execution Trace Viewer Component
 *
 * Displays agent execution traces in a readable, interactive format with:
 * - Timeline/Waterfall view showing step sequence and duration
 * - Hierarchical step cards (Tool Calls vs LLM Requests)
 * - Collapsible details for deep inspection
 * - Color-coded step types and status indicators
 *
 * Based on research into LangSmith, Google ADK, and AgentPrism patterns.
 * References:
 * - LangSmith Tracing: https://docs.smith.langchain.com/observability/concepts
 * - Google ADK Debugging: https://deepwiki.com/stigsfoot/google-ai-sprint/9.3-adk-web-ui-debugging
 * - AgentPrism: https://evilmartians.com/chronicles/debug-ai-fast-agent-prism-open-source-library-visualize-agent-traces
 */

'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Zap, MessageSquare, Clock, AlertCircle } from 'lucide-react';

interface ExecutionStep {
  step_number: number;
  step_type: 'tool_call' | 'llm_request';
  tool_name?: string;
  model?: string;
  input: Record<string, any>;
  output: any;
  timestamp: string;
  duration_ms: number;
}

interface ExecutionTrace {
  steps: ExecutionStep[];
  total_duration_ms: number;
  status: string;
}

interface ExecutionTraceViewerProps {
  trace: ExecutionTrace;
}

/**
 * Tool Call Card - Shows tool execution details
 */
function ToolCallCard({ step, isExpanded, onToggle }: {
  step: ExecutionStep;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-glass-border rounded-lg overflow-hidden hover:border-accent-primary/50 transition-colors">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-glass-surface/80 transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-accent-primary flex-shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-text-secondary flex-shrink-0" />
        )}

        <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-text-primary truncate">
            {step.tool_name}
          </div>
          <div className="text-sm text-text-secondary mt-1">
            Tool Call • Step {step.step_number}
          </div>
        </div>

        <div className="flex items-center gap-3 ml-2 flex-shrink-0">
          <div className="text-right">
            <div className="text-sm font-medium text-text-primary">
              {step.duration_ms.toFixed(0)}ms
            </div>
          </div>
          <Zap className="h-4 w-4 text-blue-500 flex-shrink-0" />
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-glass-border bg-glass-surface/30 p-4 space-y-4">
          {/* Input Section */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-2">Input Parameters</h4>
            <div className="bg-background/50 rounded p-3 overflow-auto max-h-40">
              <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap break-words">
                {JSON.stringify(step.input, null, 2)}
              </pre>
            </div>
          </div>

          {/* Output Section */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-2">Output/Result</h4>
            <div className="bg-background/50 rounded p-3 overflow-auto max-h-40">
              <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap break-words">
                {typeof step.output === 'string'
                  ? step.output
                  : JSON.stringify(step.output, null, 2)}
              </pre>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-background/50 rounded p-2">
              <div className="text-text-secondary mb-1">Timestamp</div>
              <div className="text-text-primary font-mono truncate">
                {new Date(step.timestamp).toLocaleTimeString()}
              </div>
            </div>
            <div className="bg-background/50 rounded p-2">
              <div className="text-text-secondary mb-1">Duration</div>
              <div className="text-text-primary font-semibold">
                {step.duration_ms.toFixed(2)}ms
              </div>
            </div>
            <div className="bg-background/50 rounded p-2">
              <div className="text-text-secondary mb-1">Step #</div>
              <div className="text-text-primary font-semibold">
                {step.step_number}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * LLM Request Card - Shows LLM interaction details
 */
function LLMRequestCard({ step, isExpanded, onToggle }: {
  step: ExecutionStep;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-glass-border rounded-lg overflow-hidden hover:border-accent-primary/50 transition-colors">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-glass-surface/80 transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-accent-primary flex-shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-text-secondary flex-shrink-0" />
        )}

        <div className="h-2 w-2 rounded-full bg-purple-500 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-text-primary truncate">
            {step.model || 'LLM Request'}
          </div>
          <div className="text-sm text-text-secondary mt-1">
            LLM Call • Step {step.step_number}
          </div>
        </div>

        <div className="flex items-center gap-3 ml-2 flex-shrink-0">
          <div className="text-right">
            <div className="text-sm font-medium text-text-primary">
              {step.duration_ms.toFixed(0)}ms
            </div>
          </div>
          <MessageSquare className="h-4 w-4 text-purple-500 flex-shrink-0" />
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-glass-border bg-glass-surface/30 p-4 space-y-4">
          {/* Input/Prompt Section */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-2">Prompt/Messages</h4>
            <div className="bg-background/50 rounded p-3 overflow-auto max-h-40">
              <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap break-words">
                {JSON.stringify(step.input, null, 2)}
              </pre>
            </div>
          </div>

          {/* Response Section */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-2">Response</h4>
            <div className="bg-background/50 rounded p-3 overflow-auto max-h-40">
              <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap break-words">
                {typeof step.output === 'string'
                  ? step.output
                  : JSON.stringify(step.output, null, 2)}
              </pre>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-background/50 rounded p-2">
              <div className="text-text-secondary mb-1">Model</div>
              <div className="text-text-primary font-mono truncate">
                {step.model || 'Unknown'}
              </div>
            </div>
            <div className="bg-background/50 rounded p-2">
              <div className="text-text-secondary mb-1">Duration</div>
              <div className="text-text-primary font-semibold">
                {step.duration_ms.toFixed(2)}ms
              </div>
            </div>
            <div className="bg-background/50 rounded p-2">
              <div className="text-text-secondary mb-1">Timestamp</div>
              <div className="text-text-primary font-mono truncate">
                {new Date(step.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Main Execution Trace Viewer Component
 */
export function ExecutionTraceViewer({ trace }: ExecutionTraceViewerProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const maxDuration = Math.max(...trace.steps.map(s => s.duration_ms), 1);

  const toggleStep = (stepNumber: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepNumber)) {
      newExpanded.delete(stepNumber);
    } else {
      newExpanded.add(stepNumber);
    }
    setExpandedSteps(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* Execution Summary */}
      <div className="glass-card rounded-lg p-6">
        <div className="flex items-start gap-4 mb-4">
          <Clock className="h-5 w-5 text-accent-primary flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary mb-2">Execution Timeline</h3>
            <p className="text-sm text-text-secondary">
              {trace.steps.length} steps executed in {trace.total_duration_ms.toFixed(0)}ms
            </p>
          </div>
        </div>

        {/* Waterfall Timeline View */}
        <div className="space-y-3 mt-4">
          {trace.steps.map((step) => {
            const width = (step.duration_ms / maxDuration) * 100;
            const offset = trace.steps
              .slice(0, step.step_number - 1)
              .reduce((sum, s) => sum + s.duration_ms, 0) / maxDuration * 100;

            return (
              <div key={step.step_number} className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-12 text-xs font-mono text-text-secondary">
                    Step {step.step_number}
                  </div>
                  <div className="text-xs font-semibold text-text-secondary">
                    {step.step_type === 'tool_call' ? '🔧 Tool' : '🤖 LLM'}
                  </div>
                  <div className="text-xs text-text-secondary truncate flex-1">
                    {step.tool_name || step.model}
                  </div>
                  <div className="text-xs font-mono text-text-tertiary whitespace-nowrap">
                    {step.duration_ms.toFixed(0)}ms
                  </div>
                </div>

                <div className="h-6 bg-glass-surface rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      step.step_type === 'tool_call'
                        ? 'bg-gradient-to-r from-blue-500/60 to-blue-600/60'
                        : 'bg-gradient-to-r from-purple-500/60 to-purple-600/60'
                    } rounded-full transition-all`}
                    style={{
                      marginLeft: `${offset}%`,
                      width: `${width}%`,
                      minWidth: '4px',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline Legend */}
        <div className="flex gap-6 mt-6 pt-4 border-t border-glass-border text-xs">
          <div className="flex items-center gap-2">
            <div className="h-2 w-4 rounded bg-blue-500" />
            <span className="text-text-secondary">Tool Calls</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-4 rounded bg-purple-500" />
            <span className="text-text-secondary">LLM Requests</span>
          </div>
        </div>
      </div>

      {/* Step Details */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wide">
          Execution Steps
        </h3>
        <div className="space-y-3">
          {trace.steps.map((step) => (
            step.step_type === 'tool_call' ? (
              <ToolCallCard
                key={step.step_number}
                step={step}
                isExpanded={expandedSteps.has(step.step_number)}
                onToggle={() => toggleStep(step.step_number)}
              />
            ) : (
              <LLMRequestCard
                key={step.step_number}
                step={step}
                isExpanded={expandedSteps.has(step.step_number)}
                onToggle={() => toggleStep(step.step_number)}
              />
            )
          ))}
        </div>
      </div>

      {/* Empty State */}
      {trace.steps.length === 0 && (
        <div className="glass-card rounded-lg p-8 text-center">
          <AlertCircle className="h-8 w-8 text-text-tertiary mx-auto mb-2" />
          <p className="text-text-secondary">No execution steps to display</p>
        </div>
      )}
    </div>
  );
}
