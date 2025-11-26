/**
 * API Client Barrel Export
 *
 * Centralized export for all API modules
 *
 * Reference: Story 35 AC-3 (API Error Handling & Retry Logic)
 */

// API client and utilities
export { apiClient, createApiClient } from './client';

// Error handling utilities
export {
  ERROR_MESSAGES,
  getErrorMessage,
  getErrorCategory,
  getRecoveryAction,
  isRetryableStatus,
  RECOVERY_ACTIONS,
  type ApiError,
  type ErrorCategory,
} from './error-messages';

// Retry utilities
export {
  addRetryInterceptor,
  createRetryClient,
  retryWithCallback,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig,
} from './retry';

// Domain APIs
export * as tenantsApi from './tenants';
export * as agentsApi from './agents';
export * as llmProvidersApi from './llm-providers';
export * as mcpServersApi from './mcp-servers';
// export * as toolsApi from './tools'; // TODO: Implement tools API
