/**
 * Execution Trace Parser
 *
 * Utilities for parsing execution_trace JSON from API responses
 * and extracting tool calls, LLM responses, and conversation flow
 */

export interface ToolCall {
  stepNumber: number;
  toolName: string;
  toolArgs: Record<string, unknown>;
  toolResult: string;
  timestamp?: string;
  durationMs?: number;
  status?: 'success' | 'failed';
  error?: string;
}

export interface LLMStep {
  systemPrompt?: string;
  userMessage?: string;
  response: string;
  durationMs?: number;
  timestamp?: string;
  model?: string;
}

export interface ParsedExecutionTrace {
  toolCalls: ToolCall[];
  llmResponse: LLMStep | null;
  totalDurationMs: number;
  toolCallsCount: number;
  hasErrors: boolean;
}

/**
 * Parse execution_trace to extract tool calls and LLM response
 *
 * Handles the steps array format from the backend:
 * - step_type: "tool_call" | "llm_response" | "llm_request"
 * - Extracts tool metadata, inputs, outputs
 * - Handles missing or malformed data gracefully
 */
export function parseExecutionTrace(outputData: unknown): ParsedExecutionTrace {
  const result: ParsedExecutionTrace = {
    toolCalls: [],
    llmResponse: null,
    totalDurationMs: 0,
    toolCallsCount: 0,
    hasErrors: false,
  };

  // Handle null/undefined output
  if (!outputData || typeof outputData !== 'object') {
    return result;
  }

  const output = outputData as Record<string, unknown>;

  // Get total duration
  if (typeof output.total_duration_ms === 'number') {
    result.totalDurationMs = output.total_duration_ms;
  }

  // Get tool calls count if available
  if (typeof output.tool_calls_count === 'number') {
    result.toolCallsCount = output.tool_calls_count;
  }

  // Parse steps array
  const steps = output.steps;
  if (!Array.isArray(steps)) {
    return result;
  }

  let toolStepNumber = 0;

  for (const step of steps) {
    if (!step || typeof step !== 'object') continue;

    const stepObj = step as Record<string, unknown>;
    const stepType = stepObj.step_type as string;

    // Handle tool_call steps
    if (stepType === 'tool_call') {
      toolStepNumber++;

      const toolCall: ToolCall = {
        stepNumber: toolStepNumber,
        toolName: (stepObj.tool_name as string) || 'Unknown Tool',
        toolArgs: (stepObj.tool_args as Record<string, unknown>) || {},
        toolResult: String(stepObj.tool_result || ''),
        timestamp: stepObj.timestamp as string,
        durationMs: stepObj.duration_ms as number,
        status: (stepObj.status as 'success' | 'failed') || 'success',
        error: stepObj.error as string,
      };

      if (toolCall.error) {
        result.hasErrors = true;
      }

      result.toolCalls.push(toolCall);
    }

    // Handle llm_response steps
    if (stepType === 'llm_response') {
      result.llmResponse = {
        systemPrompt: stepObj.system_prompt as string,
        userMessage: (stepObj.user_message || stepObj.input) as string,
        response: (stepObj.response as string) || '',
        durationMs: stepObj.duration_ms as number,
        timestamp: stepObj.timestamp as string,
        model: stepObj.model as string,
      };
    }
  }

  // If no tool calls count was set, use actual count
  if (result.toolCallsCount === 0) {
    result.toolCallsCount = result.toolCalls.length;
  }

  return result;
}

/**
 * Format duration milliseconds to human-readable string
 */
export function formatDuration(ms: number | undefined): string {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

/**
 * Safely parse JSON string, return original if invalid
 */
export function safeParseJson(data: unknown): unknown {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
  return data;
}
