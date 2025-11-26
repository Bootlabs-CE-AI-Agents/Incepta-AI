/**
 * Error Message Mapping
 *
 * User-friendly error messages for API and network errors.
 * Follows error message standards from Story 35 AC-3.
 *
 * Principles:
 * - User-focused: Write for users, not developers
 * - Actionable: Tell users what to do next
 * - Consistent: Same tone and format everywhere
 * - Clear: Avoid jargon and technical terms
 *
 * Format: [What happened] + [Why (optional)] + [What to do next]
 *
 * Reference: Story 35 AC-3, AC-6 (Error Handling & User Feedback)
 */

/**
 * Standard error messages by error type
 */
export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: "Connection lost. Check your connection and try again.",
  TIMEOUT_ERROR: "Request took too long. Please try again.",
  DNS_ERROR: "Unable to reach server. Check your connection.",

  // Authentication errors (4xx)
  AUTH_EXPIRED: "Your session expired. Please login again.",
  FORBIDDEN: "You don't have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
  CONFLICT: "This item already exists or conflicts with another.",
  VALIDATION_ERROR: "Please check your input and try again.",
  BAD_REQUEST: "Invalid request. Please check your input.",

  // Server errors (5xx)
  SERVER_ERROR: "Server error. Please try again later.",
  SERVICE_UNAVAILABLE: "Service temporarily unavailable. Please try again.",
  GATEWAY_ERROR: "Server temporarily unavailable. Please try again.",
  GATEWAY_TIMEOUT: "Server took too long to respond. Please try again.",

  // Generic fallback
  UNKNOWN_ERROR: "An unexpected error occurred. Please try again.",
} as const;

/**
 * Error type for API errors with user-friendly message
 */
export interface ApiError {
  status: number | undefined;
  code: string;
  message: string;
  userMessage: string;
  details?: Record<string, string>;
  retryable: boolean;
}

/**
 * Map HTTP status code to user-friendly error message
 *
 * @param status - HTTP status code (undefined for network errors)
 * @returns User-friendly error message
 */
export function getErrorMessage(status: number | undefined): string {
  if (status === undefined) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  switch (status) {
    case 400:
      return ERROR_MESSAGES.BAD_REQUEST;
    case 401:
      return ERROR_MESSAGES.AUTH_EXPIRED;
    case 403:
      return ERROR_MESSAGES.FORBIDDEN;
    case 404:
      return ERROR_MESSAGES.NOT_FOUND;
    case 409:
      return ERROR_MESSAGES.CONFLICT;
    case 422:
      return ERROR_MESSAGES.VALIDATION_ERROR;
    case 429:
      return ERROR_MESSAGES.RATE_LIMITED;
    case 500:
      return ERROR_MESSAGES.SERVER_ERROR;
    case 502:
      return ERROR_MESSAGES.GATEWAY_ERROR;
    case 503:
      return ERROR_MESSAGES.SERVICE_UNAVAILABLE;
    case 504:
      return ERROR_MESSAGES.GATEWAY_TIMEOUT;
    default:
      if (status >= 400 && status < 500) {
        return ERROR_MESSAGES.BAD_REQUEST;
      }
      if (status >= 500) {
        return ERROR_MESSAGES.SERVER_ERROR;
      }
      return ERROR_MESSAGES.UNKNOWN_ERROR;
  }
}

/**
 * Check if an error status code is retryable
 *
 * @param status - HTTP status code
 * @returns Whether the error can be retried
 */
export function isRetryableStatus(status: number | undefined): boolean {
  if (status === undefined) {
    // Network errors are retryable
    return true;
  }

  // Retryable status codes
  const retryableStatuses = [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error (sometimes transient)
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
  ];

  return retryableStatuses.includes(status);
}

/**
 * Error categories for consistent handling
 */
export type ErrorCategory =
  | "network"
  | "auth"
  | "permission"
  | "validation"
  | "not_found"
  | "rate_limit"
  | "server"
  | "unknown";

/**
 * Get error category from status code
 *
 * @param status - HTTP status code
 * @returns Error category
 */
export function getErrorCategory(status: number | undefined): ErrorCategory {
  if (status === undefined) {
    return "network";
  }

  switch (status) {
    case 401:
      return "auth";
    case 403:
      return "permission";
    case 404:
      return "not_found";
    case 422:
    case 400:
      return "validation";
    case 429:
      return "rate_limit";
    default:
      if (status >= 500) {
        return "server";
      }
      return "unknown";
  }
}

/**
 * Recovery actions by error category
 */
export const RECOVERY_ACTIONS: Record<ErrorCategory, string> = {
  network: "Check your connection and try again",
  auth: "Login again",
  permission: "Contact your administrator",
  validation: "Fix the highlighted fields",
  not_found: "Go back or check the URL",
  rate_limit: "Wait a moment and try again",
  server: "Try again or contact support",
  unknown: "Try again or contact support",
};

/**
 * Get recovery action for error
 *
 * @param status - HTTP status code
 * @returns Recovery action text
 */
export function getRecoveryAction(status: number | undefined): string {
  const category = getErrorCategory(status);
  return RECOVERY_ACTIONS[category];
}
