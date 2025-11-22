"use client";

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui';
import { testBYOKKeys, enableBYOK, initializePlatformKeys } from '@/lib/api/tenants';
import type {
  BYOKTestKeysRequest,
  BYOKTestKeysResponse,
  BYOKEnableRequest,
  ProviderValidationResult,
} from '@/lib/api/tenants';
import { Key, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

/**
 * BYOK Configuration Component
 *
 * Allows tenants to configure BYOK (Bring Your Own Keys) for LLM providers.
 * Reference: src/admin/utils/byok_helpers.py lines 29-202
 */

interface BYOKConfigurationProps {
  tenantId: string;
  hasVirtualKey?: boolean;
}

type Mode = 'platform' | 'byok';

export function BYOKConfiguration({
  tenantId,
  hasVirtualKey = false,
}: BYOKConfigurationProps) {
  const [mode, setMode] = useState<Mode>('platform');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [validationResult, setValidationResult] =
    useState<BYOKTestKeysResponse | null>(null);
  const [keysValidated, setKeysValidated] = useState(false);

  // Test keys mutation
  const testKeysMutation = useMutation({
    mutationFn: (request: BYOKTestKeysRequest) =>
      testBYOKKeys(tenantId, request),
    onSuccess: (data) => {
      setValidationResult(data);
      const openaiValid = data.openai?.valid ?? false;
      const anthropicValid = data.anthropic?.valid ?? false;
      setKeysValidated(openaiValid || anthropicValid);

      if (openaiValid || anthropicValid) {
        toast.success('Keys validated successfully');
      } else {
        toast.error('All keys failed validation');
      }
    },
    onError: (error) => {
      toast.error('Failed to test keys', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
      setValidationResult(null);
      setKeysValidated(false);
    },
  });

  // Enable BYOK mutation
  const enableBYOKMutation = useMutation({
    mutationFn: (request: BYOKEnableRequest) => enableBYOK(tenantId, request),
    onSuccess: (data) => {
      toast.success('BYOK enabled successfully', {
        description: `Configured providers: ${data.providers_configured.join(', ')}`,
      });
      // Reset form
      setOpenaiKey('');
      setAnthropicKey('');
      setValidationResult(null);
      setKeysValidated(false);
    },
    onError: (error) => {
      toast.error('Failed to enable BYOK', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });

  // Initialize platform keys mutation
  const initPlatformKeysMutation = useMutation({
    mutationFn: () => initializePlatformKeys(tenantId),
    onSuccess: () => {
      toast.success('Platform keys initialized successfully');
    },
    onError: (error) => {
      toast.error('Failed to initialize platform keys', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });

  const handleTestKeys = () => {
    // Validate key formats
    if (openaiKey && !openaiKey.startsWith('sk-')) {
      toast.error('OpenAI key must start with "sk-"');
      return;
    }

    if (anthropicKey && !anthropicKey.startsWith('sk-ant-')) {
      toast.error('Anthropic key must start with "sk-ant-"');
      return;
    }

    if (!openaiKey && !anthropicKey) {
      toast.error('Provide at least one API key');
      return;
    }

    const request: BYOKTestKeysRequest = {};
    if (openaiKey) request.openai_key = openaiKey;
    if (anthropicKey) request.anthropic_key = anthropicKey;

    testKeysMutation.mutate(request);
  };

  const handleSaveBYOK = () => {
    const request: BYOKEnableRequest = {};
    if (openaiKey) request.openai_key = openaiKey;
    if (anthropicKey) request.anthropic_key = anthropicKey;

    enableBYOKMutation.mutate(request);
  };

  const handleInitPlatformKeys = () => {
    initPlatformKeysMutation.mutate();
  };

  const renderValidationResult = (
    provider: string,
    result: ProviderValidationResult | undefined
  ) => {
    if (!result) return null;

    return (
      <div className="p-4 rounded-lg border border-white/20 bg-white/5">
        <div className="flex items-center gap-2 mb-2">
          {result.valid ? (
            <CheckCircle2 className="w-5 h-5 text-accent-green" />
          ) : (
            <XCircle className="w-5 h-5 text-accent-red" />
          )}
          <span className="font-medium text-text-primary">
            {provider}
            {result.valid ? ' Valid' : ' Invalid'}
          </span>
        </div>

        {result.valid && result.models && result.models.length > 0 && (
          <div className="text-sm text-text-secondary">
            <p className="mb-1">{result.models.length} models available</p>
            <div className="flex flex-wrap gap-1">
              {result.models.slice(0, 5).map((model, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 rounded bg-white/10 text-xs"
                >
                  {model}
                </span>
              ))}
              {result.models.length > 5 && (
                <span className="px-2 py-1 text-xs text-text-secondary">
                  +{result.models.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {!result.valid && result.error && (
          <p className="text-sm text-accent-red mt-1">{result.error}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-3">
          LLM Key Management Mode
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setMode('platform')}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              mode === 'platform'
                ? 'border-accent-blue bg-accent-blue/10'
                : 'border-white/20 bg-white/5 hover:border-white/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-5 h-5" />
              <span className="font-medium text-text-primary">
                Use platform keys
              </span>
            </div>
            <p className="text-sm text-text-secondary">
              Centralized billing with platform-managed API keys
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode('byok')}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              mode === 'byok'
                ? 'border-accent-blue bg-accent-blue/10'
                : 'border-white/20 bg-white/5 hover:border-white/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-5 h-5" />
              <span className="font-medium text-text-primary">
                Use own keys (BYOK)
              </span>
            </div>
            <p className="text-sm text-text-secondary">
              Provide your own OpenAI/Anthropic API keys
            </p>
          </button>
        </div>
      </div>

      {/* Platform Mode Info */}
      {mode === 'platform' && (
        <div className="p-4 rounded-lg bg-white/5 border border-white/20">
          {hasVirtualKey ? (
            <div className="flex items-center gap-2 text-accent-green">
              <CheckCircle2 className="w-5 h-5" />
              <span>Using platform-managed API keys for all LLM calls</span>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-accent-yellow mb-4">
                <AlertCircle className="w-5 h-5" />
                <span>Platform virtual key not configured</span>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-text-secondary">
                  Create a platform virtual key to enable LLM functionality for
                  this tenant.
                </p>
                <Button
                  onClick={handleInitPlatformKeys}
                  isLoading={initPlatformKeysMutation.isPending}
                  variant="primary"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Initialize Platform Keys
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BYOK Mode Configuration */}
      {mode === 'byok' && (
        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-accent-yellow/10 border border-accent-yellow/30">
            <div className="flex items-center gap-2 text-accent-yellow mb-2">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">
                You will provide your own OpenAI/Anthropic API keys
              </span>
            </div>
            <p className="text-sm text-text-secondary">
              Keys are encrypted at rest and never exposed in API responses.
            </p>
          </div>

          {/* API Key Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20
                         text-text-primary placeholder-text-secondary
                         focus:outline-none focus:ring-2 focus:ring-accent-blue"
              />
              <p className="text-xs text-text-secondary mt-1">
                Optional. Leave blank if not using OpenAI models.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Anthropic API Key
              </label>
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20
                         text-text-primary placeholder-text-secondary
                         focus:outline-none focus:ring-2 focus:ring-accent-blue"
              />
              <p className="text-xs text-text-secondary mt-1">
                Optional. Leave blank if not using Anthropic/Claude models.
              </p>
            </div>
          </div>

          {/* Validation Section */}
          <div>
            <h4 className="text-sm font-medium text-text-primary mb-3">
              Validate Keys Before Saving
            </h4>
            <div className="flex gap-3">
              <Button
                onClick={handleTestKeys}
                isLoading={testKeysMutation.isPending}
                variant="secondary"
              >
                Test Keys
              </Button>

              {keysValidated && (
                <Button
                  onClick={handleSaveBYOK}
                  isLoading={enableBYOKMutation.isPending}
                  variant="primary"
                >
                  Save BYOK Configuration
                </Button>
              )}
            </div>
          </div>

          {/* Validation Results */}
          {validationResult && (
            <div>
              <h4 className="text-sm font-medium text-text-primary mb-3">
                Validation Results
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {validationResult.openai &&
                  renderValidationResult('OpenAI', validationResult.openai)}
                {validationResult.anthropic &&
                  renderValidationResult(
                    'Anthropic',
                    validationResult.anthropic
                  )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
