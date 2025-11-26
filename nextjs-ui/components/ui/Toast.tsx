import { toast as sonnerToast, ExternalToast } from 'sonner';
import { CheckCircle2, XCircle, AlertCircle, Info, X, RefreshCw } from 'lucide-react';
import { getErrorMessage, ErrorCategory } from '@/lib/api/error-messages';

export interface ToastProps {
  /**
   * Toast message content
   */
  message: string;
  /**
   * Toast description (optional secondary text)
   */
  description?: string;
  /**
   * Toast variant: success, error, warning, info
   */
  variant?: 'success' | 'error' | 'warning' | 'info';
  /**
   * Duration in milliseconds (default: 4000ms)
   * Set to Infinity to keep toast open indefinitely
   */
  duration?: number;
  /**
   * Show close button (default: false)
   */
  dismissible?: boolean;
  /**
   * Custom action button
   */
  action?: {
    label: string;
    onClick: () => void;
  };
  /**
   * Callback when toast is dismissed
   */
  onDismiss?: () => void;
}

/**
 * Toast timing configuration per Story 35 spec
 */
const TOAST_DURATION = {
  success: 4000,  // 4s - quick confirmation
  error: 5000,    // 5s - user needs time to read
  warning: 5000,  // 5s - user needs time to read
  info: 4000,     // 4s - informational only
  loading: Infinity, // Dismiss when complete
} as const;

/**
 * ARIA live region configuration by variant
 * - Error/Warning: assertive (immediately announce)
 * - Success/Info: polite (announce when user is idle)
 */
const ARIA_CONFIG = {
  success: { role: 'status' as const, ariaLive: 'polite' as const },
  error: { role: 'alert' as const, ariaLive: 'assertive' as const },
  warning: { role: 'alert' as const, ariaLive: 'assertive' as const },
  info: { role: 'status' as const, ariaLive: 'polite' as const },
};

const variantConfig = {
  success: {
    icon: CheckCircle2,
    className: 'border-accent-green bg-accent-green/10 dark:bg-accent-green/20',
    iconColor: 'text-accent-green',
    ariaLabel: 'Success',
  },
  error: {
    icon: XCircle,
    className: 'border-red-500 bg-red-500/10 dark:bg-red-500/20',
    iconColor: 'text-red-500',
    ariaLabel: 'Error',
  },
  warning: {
    icon: AlertCircle,
    className: 'border-accent-orange bg-accent-orange/10 dark:bg-accent-orange/20',
    iconColor: 'text-accent-orange',
    ariaLabel: 'Warning',
  },
  info: {
    icon: Info,
    className: 'border-accent-blue bg-accent-blue/10 dark:bg-accent-blue/20',
    iconColor: 'text-accent-blue',
    ariaLabel: 'Information',
  },
};

/**
 * Toast notification component using Sonner
 *
 * Provides accessible, customizable toast notifications with:
 * - 4 variants (success, error, warning, info)
 * - Optional description text
 * - Customizable duration
 * - Dismissible option
 * - Action button support
 * - Keyboard navigation (Escape to dismiss)
 * - ARIA live regions for screen readers
 *
 * @example
 * ```tsx
 * import { toast } from '@/components/ui/Toast';
 *
 * // Success toast
 * toast.success('Profile updated successfully!');
 *
 * // Error toast with description
 * toast.error('Failed to save changes', {
 *   description: 'Please try again later.'
 * });
 *
 * // Warning with action button
 * toast.warning('Your session will expire soon', {
 *   action: {
 *     label: 'Extend',
 *     onClick: () => extendSession()
 *   }
 * });
 *
 * // Custom toast
 * toast.custom({
 *   message: 'Custom notification',
 *   variant: 'info',
 *   duration: 5000,
 *   dismissible: true
 * });
 * ```
 */
export const toast = {
  /**
   * Show a success toast
   */
  success: (message: string, options?: Omit<ToastProps, 'message' | 'variant'>) => {
    return showToast({ message, variant: 'success', ...options });
  },

  /**
   * Show an error toast
   */
  error: (message: string, options?: Omit<ToastProps, 'message' | 'variant'>) => {
    return showToast({ message, variant: 'error', ...options });
  },

  /**
   * Show a warning toast
   */
  warning: (message: string, options?: Omit<ToastProps, 'message' | 'variant'>) => {
    return showToast({ message, variant: 'warning', ...options });
  },

  /**
   * Show an info toast
   */
  info: (message: string, options?: Omit<ToastProps, 'message' | 'variant'>) => {
    return showToast({ message, variant: 'info', ...options });
  },

  /**
   * Show a custom toast with full configuration
   */
  custom: (props: ToastProps) => {
    return showToast(props);
  },

  /**
   * Dismiss a specific toast by ID
   */
  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  },

  /**
   * Dismiss all active toasts
   */
  dismissAll: () => {
    sonnerToast.dismiss();
  },

  /**
   * Show a loading toast (infinite duration)
   */
  loading: (message: string, options?: Omit<ToastProps, 'message' | 'variant' | 'duration'>) => {
    return sonnerToast.loading(message, {
      description: options?.description,
      duration: Infinity,
    });
  },

  /**
   * Promise-based toast for async operations
   *
   * @example
   * ```tsx
   * toast.promise(saveProfile(), {
   *   loading: 'Saving profile...',
   *   success: 'Profile saved!',
   *   error: 'Failed to save profile'
   * });
   * ```
   */
  promise: <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
      description?: string;
    }
  ) => {
    return sonnerToast.promise(promise, options);
  },

  /**
   * Show API error toast with user-friendly message
   *
   * Automatically maps HTTP status codes to user-friendly messages.
   * Use this for handling API errors from the apiClient.
   *
   * @example
   * ```tsx
   * try {
   *   await apiClient.delete('/agents/' + id);
   *   toast.success('Agent deleted');
   * } catch (error) {
   *   toast.apiError(error.response?.status, {
   *     onRetry: () => handleDelete(id)
   *   });
   * }
   * ```
   */
  apiError: (
    status: number | undefined,
    options?: {
      customMessage?: string;
      onRetry?: () => void;
      description?: string;
    }
  ) => {
    const message = options?.customMessage || getErrorMessage(status);
    return showToast({
      message,
      variant: 'error',
      description: options?.description,
      action: options?.onRetry
        ? {
            label: 'Retry',
            onClick: options.onRetry,
          }
        : undefined,
    });
  },

  /**
   * Show network error toast with retry action
   *
   * @example
   * ```tsx
   * toast.networkError(() => refetch());
   * ```
   */
  networkError: (onRetry?: () => void) => {
    return showToast({
      message: 'Connection lost',
      variant: 'error',
      description: 'Check your connection and try again.',
      action: onRetry
        ? {
            label: 'Retry',
            onClick: onRetry,
          }
        : undefined,
    });
  },
};

/**
 * Internal helper to show toast with custom rendering
 *
 * Accessibility features:
 * - role="alert" or role="status" based on variant
 * - aria-live="assertive" for errors, "polite" for others
 * - Screen reader announcement prefix (e.g., "Error: ")
 * - Keyboard accessible close and action buttons
 *
 * Reference: Story 35 AC-4 (Accessibility)
 */
function showToast(props: ToastProps): string | number {
  const {
    message,
    description,
    variant = 'info',
    duration,
    dismissible = false,
    action,
    onDismiss,
  } = props;

  // Use variant-specific duration if not provided
  const effectiveDuration = duration ?? TOAST_DURATION[variant];

  const config = variantConfig[variant];
  const ariaConfig = ARIA_CONFIG[variant];
  const Icon = config.icon;

  const sonnerOptions: ExternalToast = {
    duration: effectiveDuration,
    onDismiss,
    className: `glass-card border-2 ${config.className}`,
    description,
    cancel: dismissible
      ? {
          label: <X size={16} />,
          onClick: () => {},
        }
      : undefined,
    action: action
      ? {
          label: action.label,
          onClick: action.onClick,
        }
      : undefined,
  };

  return sonnerToast.custom(
    (t) => (
      <div
        className="flex items-start gap-3 p-4 w-full"
        role={ariaConfig.role}
        aria-live={ariaConfig.ariaLive}
        aria-atomic="true"
      >
        {/* Screen reader announcement prefix */}
        <span className="sr-only">{config.ariaLabel}: </span>

        <Icon
          size={20}
          className={`flex-shrink-0 ${config.iconColor}`}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-text-primary dark:text-white">
            {message}
          </div>
          {description && (
            <div className="mt-1 text-sm text-text-secondary dark:text-text-secondary">
              {description}
            </div>
          )}
          {action && (
            <button
              onClick={() => {
                action.onClick();
                sonnerToast.dismiss(t);
              }}
              className="mt-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-white/5 border border-white/50 dark:border-white/20 hover:bg-white/70 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              {action.label}
            </button>
          )}
        </div>
        {dismissible && (
          <button
            onClick={() => sonnerToast.dismiss(t)}
            className="flex-shrink-0 p-1 rounded hover:bg-white/50 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            aria-label="Dismiss notification"
          >
            <X size={16} className="text-text-secondary dark:text-text-secondary" aria-hidden="true" />
          </button>
        )}
      </div>
    ),
    sonnerOptions
  );
}

/**
 * Toast component (for Storybook and testing)
 *
 * Note: This is a utility component, not a React component to render.
 * Use the `toast` API instead:
 *
 * @example
 * ```tsx
 * import { toast } from '@/components/ui/Toast';
 * toast.success('Success message');
 * ```
 */
export const Toast = () => null;
