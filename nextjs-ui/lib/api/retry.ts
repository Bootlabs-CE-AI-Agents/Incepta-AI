/**
 * Retry Logic with Exponential Backoff
 *
 * Implements automatic retry for transient API errors with exponential backoff.
 * Used by the API client for resilient error handling.
 *
 * Retry Strategy:
 * - Status 429 (Rate Limit): Exponential backoff (1s, 2s, 4s)
 * - Status 503 (Service Unavailable): Exponential backoff
 * - Network timeout: Retry up to 3 times
 * - After max retries: Return error with manual Retry button
 *
 * Reference: Story 35 AC-3 (Retry Logic with Exponential Backoff)
 */

import { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { isRetryableStatus } from "./error-messages";

/**
 * Retry configuration options
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxRetries: number;
  /**
   * HTTP status codes that should trigger retry
   * @default [429, 500, 502, 503, 504]
   */
  retryableStatuses: number[];
  /**
   * Backoff delays in milliseconds for each retry
   * @default [1000, 2000, 4000]
   */
  backoffMs: number[];
  /**
   * Whether to retry on network errors
   * @default true
   */
  retryOnNetworkError: boolean;
  /**
   * Callback when retry is attempted
   */
  onRetry?: (retryCount: number, error: AxiosError, delayMs: number) => void;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryableStatuses: [429, 500, 502, 503, 504],
  backoffMs: [1000, 2000, 4000], // Exponential: 1s, 2s, 4s
  retryOnNetworkError: true,
};

/**
 * Extended request config with retry metadata
 */
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  __retryCount?: number;
  __retryConfig?: RetryConfig;
}

/**
 * Sleep utility for backoff delays
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error should be retried
 *
 * @param error - Axios error
 * @param config - Retry configuration
 * @returns Whether the error should be retried
 */
function shouldRetry(error: AxiosError, config: RetryConfig): boolean {
  // Check if we've exhausted retries
  const requestConfig = error.config as RetryableRequestConfig | undefined;
  const retryCount = requestConfig?.__retryCount || 0;

  if (retryCount >= config.maxRetries) {
    return false;
  }

  // Check for network errors
  if (!error.response) {
    return config.retryOnNetworkError;
  }

  // Check for retryable status codes
  const status = error.response.status;
  return config.retryableStatuses.includes(status) || isRetryableStatus(status);
}

/**
 * Get backoff delay for current retry attempt
 *
 * @param retryCount - Current retry count (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
function getBackoffDelay(retryCount: number, config: RetryConfig): number {
  // Use configured backoff or calculate exponential
  if (retryCount < config.backoffMs.length) {
    return config.backoffMs[retryCount];
  }

  // Fallback: exponential backoff with max 30 seconds
  const exponentialDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);
  return exponentialDelay;
}

/**
 * Add retry interceptor to axios instance
 *
 * Automatically retries failed requests with exponential backoff
 * for transient errors (network, 429, 5xx).
 *
 * @param client - Axios instance to add retry logic to
 * @param config - Retry configuration (optional, uses defaults)
 *
 * @example
 * ```typescript
 * const client = axios.create({ baseURL: '/api' });
 * addRetryInterceptor(client, {
 *   maxRetries: 3,
 *   onRetry: (count, error, delay) => {
 *     console.log(`Retry ${count} after ${delay}ms: ${error.message}`);
 *   }
 * });
 * ```
 */
export function addRetryInterceptor(
  client: AxiosInstance,
  config: Partial<RetryConfig> = {}
): void {
  const retryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

  client.interceptors.response.use(
    // Success handler - pass through
    (response) => response,

    // Error handler - retry logic
    async (error: AxiosError) => {
      const requestConfig = error.config as RetryableRequestConfig | undefined;

      if (!requestConfig) {
        return Promise.reject(error);
      }

      // Initialize retry count if not set
      if (requestConfig.__retryCount === undefined) {
        requestConfig.__retryCount = 0;
        requestConfig.__retryConfig = retryConfig;
      }

      // Check if we should retry
      if (!shouldRetry(error, retryConfig)) {
        return Promise.reject(error);
      }

      // Increment retry count
      requestConfig.__retryCount++;
      const retryCount = requestConfig.__retryCount;

      // Calculate backoff delay
      const delayMs = getBackoffDelay(retryCount - 1, retryConfig);

      // Log retry attempt in development
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[API Retry] Attempt ${retryCount}/${retryConfig.maxRetries} after ${delayMs}ms`,
          {
            url: requestConfig.url,
            method: requestConfig.method,
            status: error.response?.status || "Network Error",
          }
        );
      }

      // Call onRetry callback if provided
      if (retryConfig.onRetry) {
        retryConfig.onRetry(retryCount, error, delayMs);
      }

      // Wait for backoff delay
      await sleep(delayMs);

      // Retry the request
      return client.request(requestConfig);
    }
  );
}

/**
 * Create a retry-enabled axios instance
 *
 * @param baseClient - Base axios instance
 * @param config - Retry configuration
 * @returns New axios instance with retry logic
 */
export function createRetryClient(
  baseClient: AxiosInstance,
  config: Partial<RetryConfig> = {}
): AxiosInstance {
  addRetryInterceptor(baseClient, config);
  return baseClient;
}

/**
 * Manual retry utility for UI components
 *
 * Use this when automatic retry has failed and user clicks "Retry" button.
 *
 * @param fn - Function to retry
 * @param maxAttempts - Maximum retry attempts
 * @param onAttempt - Callback for each attempt
 * @returns Result of successful function call
 * @throws Last error if all attempts fail
 */
export async function retryWithCallback<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  onAttempt?: (attempt: number, maxAttempts: number) => void
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (onAttempt) {
        onAttempt(attempt, maxAttempts);
      }
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        const delay = getBackoffDelay(attempt - 1, DEFAULT_RETRY_CONFIG);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
