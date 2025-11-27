/**
 * Agent Test Sandbox Component
 *
 * Provides an interface to test agent execution with:
 * - Input message textarea
 * - Execute test button with loading state
 * - Readable execution trace visualization with timeline/waterfall view
 * - Hierarchical step details (Tool Calls vs LLM Requests)
 * - Execution metadata (duration, tokens, cost)
 * - Error handling
 *
 * Uses ExecutionTraceViewer for professional trace visualization.
 * References: LangSmith, Google ADK, AgentPrism patterns.
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Loader2, PlayCircle, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { ExecutionTraceViewer } from '@/components/execution-history/ExecutionTraceViewer';
import { useTestAgent } from '@/lib/hooks/useTestAgent';
import { useAgent } from '@/lib/hooks/useAgents';

interface TestSandboxProps {
  agentId: string;
}

/**
 * Test Sandbox Component
 *
 * AC-2 Requirement: Test Sandbox Tab
 * - Input field for test message
 * - Execute button with loading state
 * - JSON output with syntax highlighting
 * - Execution metadata display
 * - Error handling
 */
export function TestSandbox({ agentId }: TestSandboxProps) {
  const [message, setMessage] = useState('');
  const testMutation = useTestAgent();
  const { data: agent, isLoading: agentLoading } = useAgent(agentId);

  const handleExecuteTest = async () => {
    if (!message.trim()) {
      return;
    }

    // Validate agent configuration before testing
    if (!agent) {
      console.error('Agent not loaded');
      return;
    }

    if (!agent.llm_config?.model) {
      testMutation.reset();
      return;
    }

    try {
      await testMutation.mutateAsync({
        agentId,
        data: {
          payload: {
            message: message.trim(),
          },
          simulate_webhook: true,
        },
      });
    } catch (err) {
      // Error handled by mutation
      console.error('Test execution failed:', err);
    }
  };

  const testResult = testMutation.data;
  const error = testMutation.error?.message;
  const isLoading = testMutation.isPending;

  // Check if agent has required configuration for testing
  const hasRequiredConfig = agent && agent.llm_config?.model && agent.system_prompt;
  const configErrors = [];
  if (!agent?.llm_config?.model) configErrors.push('LLM model not configured');
  if (!agent?.system_prompt) configErrors.push('System prompt not set');

  return (
    <div className="space-y-6">
      {/* Configuration Warning */}
      {!hasRequiredConfig && !agentLoading && (
        <div className="border border-yellow-500/30 bg-yellow-500/10 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-600 mb-2">Agent Not Ready for Testing</h3>
              <ul className="text-sm text-yellow-700/90 space-y-1">
                {configErrors.map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
              <p className="text-xs text-yellow-700/75 mt-2">Please configure the missing items in the Overview tab before testing.</p>
            </div>
          </div>
        </div>
      )}

      {/* Test Input Section */}
      <div>
        <label
          htmlFor="test-message"
          className="block text-sm font-medium text-text-primary mb-2"
        >
          Test Message
          <span className="text-text-secondary ml-2">(required)</span>
        </label>
        <textarea
          id="test-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Enter a message to test this agent..."
          className="w-full px-4 py-3 bg-glass-surface border border-glass-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary/50 text-text-primary placeholder:text-text-tertiary resize-y"
          aria-label="Test message input"
          disabled={isLoading || agentLoading || !hasRequiredConfig}
        />
        {message.length > 0 && (
          <div className="mt-1 text-xs text-text-secondary">
            {message.length} characters
          </div>
        )}
      </div>

      {/* Execute Button */}
      <div className="flex gap-3">
        <Button
          onClick={handleExecuteTest}
          disabled={isLoading || !message.trim() || !hasRequiredConfig || agentLoading}
          className="gap-2"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Testing agent...
            </>
          ) : (
            <>
              <PlayCircle className="h-4 w-4" />
              Execute Test
            </>
          )}
        </Button>

        {testResult && (
          <Button
            onClick={() => {
              testMutation.reset();
              setMessage('');
            }}
            variant="ghost"
          >
            Clear Results
          </Button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div
          className="border border-destructive/30 bg-destructive/10 rounded-lg p-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive mb-1">Test Failed</h3>
              <p className="text-sm text-destructive/90">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success State with Results */}
      {testResult && !error && (
        <div className="space-y-4">
          {/* Success Banner */}
          <div className="border border-success/30 bg-success/10 rounded-lg p-4">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Test Completed Successfully</span>
            </div>
          </div>

          {/* Execution Metadata */}
          <div className="glass-card rounded-lg p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wide">
              Execution Metadata
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-text-secondary mb-1">Execution Time</div>
                <div className="text-lg font-semibold text-text-primary">
                  {testResult.execution_time?.total_duration_ms?.toFixed(2) || 'N/A'}
                  <span className="text-sm font-normal text-text-secondary ml-1">ms</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-text-secondary mb-1">Status</div>
                <div className="text-sm font-medium text-success">
                  {testResult.status || 'Success'}
                </div>
              </div>
              <div>
                <div className="text-xs text-text-secondary mb-1">Steps Executed</div>
                <div className="text-sm font-medium text-text-primary">
                  {testResult.execution_trace?.steps?.length || 0}
                </div>
              </div>
              <div>
                <div className="text-xs text-text-secondary mb-1">Total Tokens</div>
                <div className="text-sm font-medium text-text-primary">
                  {testResult.token_usage?.total_tokens || 0}
                </div>
              </div>
              <div>
                <div className="text-xs text-text-secondary mb-1">Estimated Cost</div>
                <div className="text-sm font-medium text-text-primary">
                  ${(testResult.token_usage?.estimated_cost_usd || 0).toFixed(6)}
                </div>
              </div>
            </div>
          </div>

          {/* Agent Response - Execution Trace Viewer */}
          <ExecutionTraceViewer trace={testResult.execution_trace} />
        </div>
      )}

      {/* Empty State */}
      {!testResult && !error && !isLoading && (
        <div className="glass-card rounded-lg p-12 text-center">
          <div className="text-h1 mb-4" role="img" aria-label="Test tube">
            🧪
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            Ready to Test
          </h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            Enter a test message above and click &quot;Execute Test&quot; to see how this agent
            responds. The response will be displayed below with execution metrics.
          </p>
        </div>
      )}
    </div>
  );
}
