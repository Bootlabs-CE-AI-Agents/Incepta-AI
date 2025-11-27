/**
 * API Client Configuration
 *
 * Axios instance configured for FastAPI backend communication.
 * Automatically includes JWT authentication tokens from NextAuth session.
 * Includes tenant context from Zustand store for multi-tenant operations.
 *
 * Features:
 * - JWT authentication via NextAuth session
 * - Multi-tenant support via X-Tenant-ID header
 * - Automatic retry with exponential backoff for transient errors
 * - User-friendly error messages
 * - Error logging for debugging
 *
 * Reference: Story 35 AC-3 (API Error Handling & Retry Logic)
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { getSession } from 'next-auth/react';
import { useTenantStore } from '@/lib/stores/useTenantStore';
import { getErrorMessage, getErrorCategory, ApiError } from './error-messages';
import { addRetryInterceptor, RetryConfig } from './retry';
import { getApiBaseUrl } from './config';

/**
 * Retry configuration for API client
 */
const RETRY_CONFIG: Partial<RetryConfig> = {
  maxRetries: 3,
  retryableStatuses: [429, 500, 502, 503, 504],
  backoffMs: [1000, 2000, 4000], // Exponential: 1s, 2s, 4s
  retryOnNetworkError: true,
  onRetry: (retryCount, error, delayMs) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[API Retry] Attempt ${retryCount} after ${delayMs}ms:`,
        error.config?.url
      );
    }
  },
};

/**
 * Create configured axios instance for API calls
 *
 * @returns Axios instance with base URL, interceptors, and retry logic
 */
export const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 30000, // 30 second timeout
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add retry interceptor for transient errors
  addRetryInterceptor(client, RETRY_CONFIG);

  // Request interceptor to add auth token and tenant ID
  client.interceptors.request.use(
    async (config) => {
      // Get NextAuth session for JWT token and tenant info
      const session = await getSession();

      if (session?.accessToken) {
        config.headers.Authorization = `Bearer ${session.accessToken}`;
      }

      // Add X-Tenant-ID header from Zustand store (global tenant selection)
      // Falls back to session defaultTenantId if no tenant selected in UI
      // Backend uses this to determine which tenant the request belongs to
      // Note: Use tenant_id (slug like 'default') not id (UUID) - API expects tenant_id
      const selectedTenant = useTenantStore.getState().selectedTenant;
      const tenantId = selectedTenant?.tenant_id || session?.user?.defaultTenantId;

      if (tenantId) {
        config.headers['X-Tenant-ID'] = tenantId;
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling and user-friendly messages
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const status = error.response?.status;
      const userMessage = getErrorMessage(status);
      const category = getErrorCategory(status);

      // Log error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('API Error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: status || 'Network Error',
          category,
          userMessage,
          data: error.response?.data,
        });
      }

      // Handle specific error cases
      if (status === 401) {
        // Unauthorized - token expired or invalid
        // NextAuth will handle redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/api/auth/signin';
        }
      }

      // Enhance error with user-friendly message
      const enhancedError = error as AxiosError & { userMessage: string; category: string };
      enhancedError.userMessage = userMessage;
      enhancedError.category = category;

      return Promise.reject(enhancedError);
    }
  );

  return client;
};

// Export singleton instance
export const apiClient = createApiClient();
