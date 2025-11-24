/**
 * API Client Configuration
 *
 * Axios instance configured for FastAPI backend communication.
 * Automatically includes JWT authentication tokens from NextAuth session.
 * Includes tenant context from Zustand store for multi-tenant operations.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { getSession } from 'next-auth/react';
import { useTenantStore } from '@/lib/stores/useTenantStore';

/**
 * Create configured axios instance for API calls
 *
 * @returns Axios instance with base URL and interceptors
 */
export const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    timeout: 30000, // 30 second timeout
    headers: {
      'Content-Type': 'application/json',
    },
  });

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
      const selectedTenant = useTenantStore.getState().selectedTenant;
      const tenantId = selectedTenant?.id || session?.user?.defaultTenantId;

      if (tenantId) {
        config.headers['X-Tenant-ID'] = tenantId;
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      // Log error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('API Error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          data: error.response?.data,
        });
      }

      // Handle specific error cases
      if (error.response?.status === 401) {
        // Unauthorized - token expired or invalid
        // NextAuth will handle redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/api/auth/signin';
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
};

// Export singleton instance
export const apiClient = createApiClient();
