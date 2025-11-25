/**
 * PromptTestTab Component
 * Main test tab with configuration, result display, and history
 *
 * Story: nextjs-story-29-prompts-llm-test
 * AC: AC-1, AC-2, AC-7, AC-8, AC-9, AC-10
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { useLLMModels } from '@/lib/hooks/useLLMModels';
import { useLLMTest } from '@/lib/hooks/useLLMTest';
import { useTestHistory } from '@/lib/hooks/useTestHistory';
import {
  extractVariables,
  substituteVariables,
  getDefaultVariableValues,
} from '@/lib/utils/variableSubstitution';
import { VariableInputs } from './VariableInputs';
import { TestResultPanel } from './TestResultPanel';
import { TestErrorPanel } from './TestErrorPanel';
import { TestHistoryList } from './TestHistoryList';

interface PromptTestTabProps {
  promptId: string;
  currentPromptContent: string;
}

// Validation schema (AC-1)
const testConfigSchema = z.object({
  model: z.string().min(1, 'Model is required'),
  userMessage: z.string().min(1, 'User message is required'),
  temperature: z.number().min(0).max(1),
  maxTokens: z.number().min(1).max(4000),
});

type TestConfigForm = z.infer<typeof testConfigSchema>;

export function PromptTestTab({
  promptId,
  currentPromptContent,
}: PromptTestTabProps) {
  // Query models (AC-1)
  const { data: models, isLoading: modelsLoading } = useLLMModels();
  const testMutation = useLLMTest();
  const { history, addTest } = useTestHistory();

  // Form state (AC-1)
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
  } = useForm<TestConfigForm>({
    resolver: zodResolver(testConfigSchema),
    defaultValues: {
      model: '',
      userMessage: '',
      temperature: 0.7,
      maxTokens: 500,
    },
    mode: 'onChange',
  });

  const userMessage = watch('userMessage');
  const temperature = watch('temperature');

  // Variable detection (AC-7)
  const detectedVariables = useMemo(() => {
    return extractVariables(currentPromptContent);
  }, [currentPromptContent]);

  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    {}
  );

  // State for viewing historical test results (AC-4)
  const [viewedHistoricalTest, setViewedHistoricalTest] = useState<any | null>(null);

  // Initialize default variable values (AC-7)
  useEffect(() => {
    if (detectedVariables.length > 0 && Object.keys(variableValues).length === 0) {
      const defaults = getDefaultVariableValues(detectedVariables);
      setVariableValues(defaults);
    }
  }, [detectedVariables, variableValues]);

  // Set default model when models load
  useEffect(() => {
    if (models && models.length > 0 && !watch('model')) {
      setValue('model', models[0].id);
    }
  }, [models, setValue, watch]);

  const handleVariableChange = (name: string, value: string) => {
    setVariableValues((prev) => ({ ...prev, [name]: value }));
  };

  // Run test (AC-2)
  const onSubmit = async (data: TestConfigForm) => {
    // Substitute variables before sending (AC-7)
    const systemPromptWithVars = substituteVariables(
      currentPromptContent,
      variableValues
    );

    testMutation.mutate(
      {
        system_prompt: systemPromptWithVars,
        user_message: data.userMessage,
        model: data.model,
        temperature: data.temperature,
        max_tokens: data.maxTokens,
      },
      {
        onSuccess: (result) => {
          // Add to history (AC-4)
          addTest(
            {
              system_prompt: systemPromptWithVars,
              user_message: data.userMessage,
              model: data.model,
              temperature: data.temperature,
              max_tokens: data.maxTokens,
            },
            result,
            detectedVariables.length > 0 ? variableValues : undefined
          );
          // Clear viewed historical test to show latest result (AC-4)
          setViewedHistoricalTest(null);
        },
      }
    );
  };

  // Retry on error (AC-6)
  const handleRetry = () => {
    handleSubmit(onSubmit)();
  };

  // Handle viewing historical test result (AC-4)
  const handleViewTest = (test: any) => {
    setViewedHistoricalTest(test);
  };

  // Keyboard submit (AC-10)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(onSubmit)();
    }
  };

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
      {/* Test Configuration (AC-1) */}
      <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown}>
        <div className="rounded-lg border border-white/50 dark:border-white/20 bg-white dark:bg-white/5 p-6">
          <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-4">
            Test Configuration
          </h3>

          <div className="space-y-4">
            {/* Model Selector (AC-1) */}
            <div>
              <Label htmlFor="model" className="text-sm">
                Model
              </Label>
              {modelsLoading ? (
                <div className="flex items-center space-x-2 text-sm text-text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading models...</span>
                </div>
              ) : (
                <select
                  {...register('model')}
                  id="model"
                  className="mt-1 block w-full rounded-md border border-white/50 dark:border-white/20 bg-white dark:bg-white/5 px-3 py-2 text-sm"
                  aria-label="Select LLM model"
                >
                  <option value="">Select a model</option>
                  {models?.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.provider})
                    </option>
                  ))}
                </select>
              )}
              {errors.model && (
                <p className="mt-1 text-xs text-red-600">{errors.model.message}</p>
              )}
            </div>

            {/* User Message (AC-1) */}
            <div>
              <Label htmlFor="userMessage" className="text-sm">
                User Message
              </Label>
              <Textarea
                {...register('userMessage')}
                id="userMessage"
                rows={4}
                placeholder="Type your test message here..."
                className="mt-1"
                aria-label="User message input"
              />
              {errors.userMessage && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.userMessage.message}
                </p>
              )}
            </div>

            {/* Variable Inputs (AC-7) */}
            {detectedVariables.length > 0 && (
              <VariableInputs
                variables={detectedVariables}
                values={variableValues}
                onChange={handleVariableChange}
              />
            )}

            {/* Temperature Slider (AC-1) */}
            <div>
              <Label htmlFor="temperature" className="text-sm flex justify-between">
                <span>Temperature</span>
                <span className="text-text-secondary">{temperature.toFixed(1)}</span>
              </Label>
              <input
                {...register('temperature', { valueAsNumber: true })}
                id="temperature"
                type="range"
                min="0"
                max="1"
                step="0.1"
                className="mt-1 w-full"
                aria-label="Temperature slider"
              />
              <div className="flex justify-between text-xs text-text-secondary mt-1">
                <span>0.0</span>
                <span>1.0</span>
              </div>
            </div>

            {/* Max Tokens (AC-1) */}
            <div>
              <Label htmlFor="maxTokens" className="text-sm">
                Max Tokens
              </Label>
              <Input
                {...register('maxTokens', { valueAsNumber: true })}
                id="maxTokens"
                type="number"
                min="1"
                max="4000"
                className="mt-1"
                aria-label="Maximum tokens"
              />
              {errors.maxTokens && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.maxTokens.message}
                </p>
              )}
            </div>

            {/* Run Test Button (AC-1, AC-2) */}
            <Button
              type="submit"
              disabled={!isValid || userMessage.trim() === '' || testMutation.isPending}
              className="w-full"
              aria-label="Run test (Ctrl+Enter)"
            >
              {testMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing prompt...
                </>
              ) : (
                'Run Test'
              )}
            </Button>
            <p className="text-xs text-text-secondary text-center">
              Press Ctrl+Enter to submit
            </p>
          </div>
        </div>
      </form>

      {/* Loading State (AC-2) */}
      {testMutation.isPending && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Testing prompt...
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Calling {watch('model')} with your prompt...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display (AC-6) */}
      {testMutation.isError && testMutation.error && (
        <TestErrorPanel error={testMutation.error} onRetry={handleRetry} />
      )}

      {/* Result Display (AC-3) - Show either current result or viewed historical test */}
      {((testMutation.isSuccess && testMutation.data) || viewedHistoricalTest) && (
        <TestResultPanel
          result={viewedHistoricalTest?.result || testMutation.data}
          variables={viewedHistoricalTest?.variables || (detectedVariables.length > 0 ? variableValues : undefined)}
          isHistorical={!!viewedHistoricalTest}
        />
      )}

      {/* Test History (AC-4) */}
      <TestHistoryList history={history} onViewTest={handleViewTest} />
    </div>
  );
}
