'use client';

/**
 * ImportConfig - Form for configuring tool import
 * Fields: Name prefix, Base URL, Auth type, Auth credentials
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Network, Loader2 } from 'lucide-react';
import type { AuthConfig, TestConnectionRequest } from '@/lib/api/tools';
import { testConnection } from '@/lib/api/tools';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select } from '../ui/Select';
import { ScopeCheckboxGroup } from './ScopeCheckboxGroup';
import { ConnectionTestResult, type ConnectionTestResult as TestResult } from './ConnectionTestResult';

const importConfigSchema = z.object({
  name_prefix: z.string().max(50, 'Prefix too long').catch(''),
  base_url: z.string().url('Invalid URL').min(1, 'Base URL is required'),
  auth_type: z.enum(['none', 'api_key', 'bearer', 'basic', 'oauth2']),
  api_key_name: z.string().catch(''),
  api_key_location: z.enum(['header', 'query']).catch('header'),
  api_key_value: z.string().catch(''),
  bearer_token: z.string().catch(''),
  basic_username: z.string().catch(''),
  basic_password: z.string().catch(''),
  oauth2_client_id: z.string().catch(''),
  oauth2_client_secret: z.string().catch(''),
  oauth2_auth_url: z.string().catch(''),
  oauth2_token_url: z.string().catch(''),
}).refine(
  (data) => {
    // OAuth2 required field validation
    if (data.auth_type === 'oauth2') {
      return Boolean(
        data.oauth2_client_id &&
        data.oauth2_client_secret &&
        data.oauth2_auth_url &&
        data.oauth2_token_url
      );
    }
    return true;
  },
  {
    message: 'All OAuth2 fields are required when OAuth2 authentication is selected',
    path: ['oauth2_client_id'],
  }
).refine(
  (data) => {
    // OAuth2 HTTPS URL validation
    if (data.auth_type === 'oauth2') {
      const authUrlValid = data.oauth2_auth_url?.startsWith('https://');
      const tokenUrlValid = data.oauth2_token_url?.startsWith('https://');
      return authUrlValid && tokenUrlValid;
    }
    return true;
  },
  {
    message: 'OAuth2 URLs must use HTTPS',
    path: ['oauth2_auth_url'],
  }
);

type ImportConfigForm = z.infer<typeof importConfigSchema>;

interface ImportConfigProps {
  onSubmit: (config: {
    namePrefix?: string;
    baseUrl: string;
    authConfig: AuthConfig;
  }) => void;
  isLoading?: boolean;
  spec?: Record<string, unknown>; // OpenAPI spec for test connection
}

export function ImportConfig({ onSubmit, isLoading = false, spec }: ImportConfigProps) {
  const [oauth2Scopes, setOauth2Scopes] = useState<string[]>([]);
  const [oauth2ScopesError, setOauth2ScopesError] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<ImportConfigForm>({
    resolver: zodResolver(importConfigSchema),
    defaultValues: {
      name_prefix: '',
      base_url: '',
      auth_type: 'none',
      api_key_name: 'X-API-Key',
      api_key_location: 'header',
      api_key_value: '',
      bearer_token: '',
      basic_username: '',
      basic_password: '',
      oauth2_client_id: '',
      oauth2_client_secret: '',
      oauth2_auth_url: '',
      oauth2_token_url: '',
    },
    mode: 'onChange',
  });

  const authType = watch('auth_type');

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: testConnection,
    onSuccess: (response) => {
      if (response.success) {
        setTestResult({
          success: true,
          status_code: response.status_code!,
          response_time_ms: response.response_time_ms,
          headers: response.headers,
          body: response.body,
          tested_endpoint: response.tested_endpoint,
        });
      } else {
        setTestResult({
          success: false,
          error: response.error || 'Connection test failed',
          error_type: response.error_type || 'unknown',
          status_code: response.status_code,
          tested_endpoint: response.tested_endpoint,
        });
      }
    },
    onError: (error: Error) => {
      setTestResult({
        success: false,
        error: error.message || 'Network error occurred',
        error_type: 'network',
      });
    },
  });

  const handleTestConnection = () => {
    if (!spec) {
      setTestResult({
        success: false,
        error: 'No OpenAPI spec available. Please parse a spec first.',
        error_type: 'unknown',
      });
      return;
    }

    const formData = watch();
    const authConfig: AuthConfig = { type: formData.auth_type };

    if (formData.auth_type === 'api_key') {
      authConfig.api_key_name = formData.api_key_name;
      authConfig.api_key_location = formData.api_key_location;
      authConfig.api_key_value = formData.api_key_value;
    } else if (formData.auth_type === 'bearer') {
      authConfig.bearer_token = formData.bearer_token;
    } else if (formData.auth_type === 'basic') {
      authConfig.basic_username = formData.basic_username;
      authConfig.basic_password = formData.basic_password;
    } else if (formData.auth_type === 'oauth2') {
      // Check if OAuth2 token available
      authConfig.oauth2_client_id = formData.oauth2_client_id;
      authConfig.oauth2_client_secret = formData.oauth2_client_secret;
      authConfig.oauth2_auth_url = formData.oauth2_auth_url;
      authConfig.oauth2_token_url = formData.oauth2_token_url;
      authConfig.oauth2_scopes = oauth2Scopes;

      // Note: OAuth2 full flow testing requires access token
      // For now, we'll just validate the configuration
    }

    const request: TestConnectionRequest = {
      spec,
      auth_config: authConfig,
    };

    testConnectionMutation.mutate(request);
  };

  const handleFormSubmit = (data: ImportConfigForm) => {
    // OAuth2 scope validation (not handled by Zod schema)
    if (data.auth_type === 'oauth2') {
      if (oauth2Scopes.length === 0) {
        setOauth2ScopesError('At least 1 scope must be selected');
        return;
      }
      // Required fields and HTTPS validation handled by Zod schema refine()
    }

    const authConfig: AuthConfig = {
      type: data.auth_type,
    };

    if (data.auth_type === 'api_key') {
      authConfig.api_key_name = data.api_key_name;
      authConfig.api_key_location = data.api_key_location;
      authConfig.api_key_value = data.api_key_value;
    } else if (data.auth_type === 'bearer') {
      authConfig.bearer_token = data.bearer_token;
    } else if (data.auth_type === 'basic') {
      authConfig.basic_username = data.basic_username;
      authConfig.basic_password = data.basic_password;
    } else if (data.auth_type === 'oauth2') {
      authConfig.oauth2_client_id = data.oauth2_client_id;
      authConfig.oauth2_client_secret = data.oauth2_client_secret;
      authConfig.oauth2_auth_url = data.oauth2_auth_url;
      authConfig.oauth2_token_url = data.oauth2_token_url;
      authConfig.oauth2_scopes = oauth2Scopes;
    }

    onSubmit({
      namePrefix: data.name_prefix || undefined,
      baseUrl: data.base_url,
      authConfig,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name Prefix */}
        <div>
          <Label htmlFor="name_prefix">Tool Name Prefix (Optional)</Label>
          <Input
            id="name_prefix"
            {...register('name_prefix')}
            placeholder="e.g., jira_"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Prefix added to operation IDs (e.g., jira_createIssue)
          </p>
          {errors.name_prefix && (
            <p className="text-sm text-red-600 mt-1">{errors.name_prefix.message}</p>
          )}
        </div>

        {/* Base URL */}
        <div>
          <Label htmlFor="base_url">Base URL *</Label>
          <Input
            id="base_url"
            {...register('base_url')}
            placeholder="https://api.example.com/v1"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            API base URL for tool execution
          </p>
          {errors.base_url && (
            <p className="text-sm text-red-600 mt-1">{errors.base_url.message}</p>
          )}
        </div>
      </div>

      {/* Auth Type */}
      <div>
        <Label htmlFor="auth_type">Authentication Type</Label>
        <Select
          id="auth_type"
          {...register('auth_type')}
          disabled={isLoading}
          options={[
            { value: 'none', label: 'None' },
            { value: 'api_key', label: 'API Key' },
            { value: 'bearer', label: 'Bearer Token' },
            { value: 'basic', label: 'Basic Auth' },
            { value: 'oauth2', label: 'OAuth2' },
          ]}
        />
      </div>

      {/* API Key Auth Fields */}
      {authType === 'api_key' && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-md">
          <p className="text-sm font-medium text-gray-700">API Key Configuration</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="api_key_name">Key Name</Label>
              <Input
                id="api_key_name"
                {...register('api_key_name')}
                placeholder="X-API-Key"
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="api_key_location">Location</Label>
              <Select
                id="api_key_location"
                {...register('api_key_location')}
                disabled={isLoading}
                options={[
                  { value: 'header', label: 'Header' },
                  { value: 'query', label: 'Query Parameter' },
                ]}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="api_key_value">API Key Value</Label>
            <Input
              id="api_key_value"
              type="password"
              {...register('api_key_value')}
              placeholder="Enter API key"
              disabled={isLoading}
            />
          </div>
        </div>
      )}

      {/* Bearer Token Auth Fields */}
      {authType === 'bearer' && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-md">
          <p className="text-sm font-medium text-gray-700">Bearer Token Configuration</p>
          <div>
            <Label htmlFor="bearer_token">Bearer Token</Label>
            <Input
              id="bearer_token"
              type="password"
              {...register('bearer_token')}
              placeholder="Enter bearer token"
              disabled={isLoading}
            />
          </div>
        </div>
      )}

      {/* Basic Auth Fields */}
      {authType === 'basic' && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-md">
          <p className="text-sm font-medium text-gray-700">Basic Authentication</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="basic_username">Username</Label>
              <Input
                id="basic_username"
                {...register('basic_username')}
                placeholder="Enter username"
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="basic_password">Password</Label>
              <Input
                id="basic_password"
                type="password"
                {...register('basic_password')}
                placeholder="Enter password"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* OAuth2 Auth Fields */}
      {authType === 'oauth2' && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-md">
          <p className="text-sm font-medium text-gray-700">OAuth2 Configuration</p>

          {/* Client ID and Secret */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="oauth2_client_id">Client ID *</Label>
              <Input
                id="oauth2_client_id"
                {...register('oauth2_client_id')}
                placeholder="Enter client ID"
                disabled={isLoading}
              />
              {errors.oauth2_client_id && (
                <p className="text-sm text-red-600 mt-1">{errors.oauth2_client_id.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="oauth2_client_secret">Client Secret *</Label>
              <Input
                id="oauth2_client_secret"
                type="password"
                {...register('oauth2_client_secret')}
                placeholder="Enter client secret"
                disabled={isLoading}
              />
              {errors.oauth2_client_secret && (
                <p className="text-sm text-red-600 mt-1">{errors.oauth2_client_secret.message}</p>
              )}
            </div>
          </div>

          {/* Authorization URL */}
          <div>
            <Label htmlFor="oauth2_auth_url">Authorization URL *</Label>
            <Input
              id="oauth2_auth_url"
              type="url"
              {...register('oauth2_auth_url')}
              placeholder="https://accounts.google.com/o/oauth2/auth"
              disabled={isLoading}
            />
            {errors.oauth2_auth_url && (
              <p className="text-sm text-red-600 mt-1">{errors.oauth2_auth_url.message}</p>
            )}
          </div>

          {/* Token URL */}
          <div>
            <Label htmlFor="oauth2_token_url">Token URL *</Label>
            <Input
              id="oauth2_token_url"
              type="url"
              {...register('oauth2_token_url')}
              placeholder="https://oauth2.googleapis.com/token"
              disabled={isLoading}
            />
            {errors.oauth2_token_url && (
              <p className="text-sm text-red-600 mt-1">{errors.oauth2_token_url.message}</p>
            )}
          </div>

          {/* Scopes */}
          <ScopeCheckboxGroup
            selectedScopes={oauth2Scopes}
            onChange={(scopes) => {
              setOauth2Scopes(scopes);
              setOauth2ScopesError('');
            }}
            error={oauth2ScopesError}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Test Connection Button */}
      {authType !== 'none' && spec && (
        <div className="pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={handleTestConnection}
            disabled={!isValid || testConnectionMutation.isPending || isLoading}
            className="w-full sm:w-auto"
          >
            {testConnectionMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Network className="h-4 w-4 mr-2" />
                Test Connection
              </>
            )}
          </Button>
        </div>
      )}

      {/* Test Result Panel */}
      {testResult && (
        <ConnectionTestResult
          result={testResult}
          onClose={() => setTestResult(null)}
          onRetry={handleTestConnection}
        />
      )}

      {/* Submit Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <Button type="submit" disabled={!isValid || isLoading}>
          {isLoading ? 'Importing...' : 'Import Tools'}
        </Button>
      </div>
    </form>
  );
}
