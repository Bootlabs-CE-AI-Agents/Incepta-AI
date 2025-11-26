import { AlertCircle, RefreshCw, WifiOff, ShieldX, ServerOff } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils/cn';

/**
 * Error State Component
 *
 * Displays when data fetching fails with customizable error messages,
 * retry action, and appropriate icons based on error type.
 *
 * Accessibility (WCAG 2.1 AA):
 * - role="alert" for screen reader announcement
 * - aria-live="assertive" for immediate announcement
 * - Proper heading structure
 * - Keyboard accessible retry button
 *
 * @example
 * ```tsx
 * // Basic error with retry
 * <ErrorState
 *   onRetry={() => refetch()}
 *   error={error}
 * />
 *
 * // Network error
 * <ErrorState
 *   type="network"
 *   onRetry={() => refetch()}
 * />
 *
 * // Custom error message
 * <ErrorState
 *   title="Failed to load agents"
 *   description="The agents service is currently unavailable."
 *   onRetry={() => refetch()}
 * />
 * ```
 *
 * Reference: Story 35 AC-2 (Error Boundaries), AC-3 (Error Handling)
 */

/**
 * Error type presets
 */
export type ErrorType =
  | 'default'
  | 'network'
  | 'auth'
  | 'server'
  | 'notFound';

const typeConfig: Record<ErrorType, {
  icon: typeof AlertCircle;
  iconColor: string;
  title: string;
  description: string;
}> = {
  default: {
    icon: AlertCircle,
    iconColor: 'text-red-500 dark:text-red-400',
    title: 'Something went wrong',
    description: 'We encountered an error loading this content. Please try again.',
  },
  network: {
    icon: WifiOff,
    iconColor: 'text-orange-500 dark:text-orange-400',
    title: 'Connection lost',
    description: 'Please check your internet connection and try again.',
  },
  auth: {
    icon: ShieldX,
    iconColor: 'text-yellow-500 dark:text-yellow-400',
    title: 'Session expired',
    description: 'Your session has expired. Please sign in again to continue.',
  },
  server: {
    icon: ServerOff,
    iconColor: 'text-red-500 dark:text-red-400',
    title: 'Server unavailable',
    description: 'The server is temporarily unavailable. Please try again in a few moments.',
  },
  notFound: {
    icon: AlertCircle,
    iconColor: 'text-gray-500 dark:text-gray-400',
    title: 'Not found',
    description: 'The requested resource could not be found.',
  },
};

interface ErrorStateProps {
  /**
   * Error type preset with default icon and messages
   * @default "default"
   */
  type?: ErrorType;
  /**
   * Custom title (overrides type preset)
   */
  title?: string;
  /**
   * Custom description (overrides type preset)
   */
  description?: string;
  /**
   * Error object for extracting message
   */
  error?: Error | null;
  /**
   * Show error details (useful for development)
   * @default false
   */
  showDetails?: boolean;
  /**
   * Retry callback function
   */
  onRetry?: () => void;
  /**
   * Retry button label
   * @default "Try again"
   */
  retryLabel?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Size variant
   * @default "md"
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether to show card background
   * @default true
   */
  showCard?: boolean;
}

const sizeConfig = {
  sm: {
    padding: 'py-6 px-4',
    iconSize: 'w-8 h-8',
    titleSize: 'text-base',
    descriptionSize: 'text-xs',
  },
  md: {
    padding: 'py-12 px-6',
    iconSize: 'w-12 h-12',
    titleSize: 'text-lg',
    descriptionSize: 'text-sm',
  },
  lg: {
    padding: 'py-16 px-8',
    iconSize: 'w-16 h-16',
    titleSize: 'text-xl',
    descriptionSize: 'text-base',
  },
};

export function ErrorState({
  type = 'default',
  title,
  description,
  error,
  showDetails = false,
  onRetry,
  retryLabel = 'Try again',
  className,
  size = 'md',
  showCard = true,
}: ErrorStateProps) {
  const config = typeConfig[type];
  const sizeStyles = sizeConfig[size];
  const IconComponent = config.icon;

  // Use custom title/description or fall back to type preset
  const displayTitle = title || config.title;
  const displayDescription = description || error?.message || config.description;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeStyles.padding,
        showCard && 'glass-card rounded-lg',
        className
      )}
    >
      {/* Screen reader announcement */}
      <span className="sr-only">
        Error: {displayTitle}. {displayDescription}
      </span>

      {/* Icon */}
      <div className={cn('mb-4', config.iconColor)} aria-hidden="true">
        <IconComponent className={sizeStyles.iconSize} />
      </div>

      {/* Title */}
      <h3
        className={cn(
          'font-semibold text-text-primary dark:text-white mb-2',
          sizeStyles.titleSize
        )}
      >
        {displayTitle}
      </h3>

      {/* Description */}
      <p
        className={cn(
          'text-text-secondary dark:text-text-secondary max-w-md',
          sizeStyles.descriptionSize,
          (onRetry || showDetails) ? 'mb-6' : ''
        )}
      >
        {displayDescription}
      </p>

      {/* Error details (dev mode) */}
      {showDetails && error && (
        <details className="mb-6 w-full max-w-md">
          <summary className="text-xs text-text-tertiary cursor-pointer hover:text-text-secondary">
            Show error details
          </summary>
          <pre className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-300 overflow-auto text-left">
            {error.stack || error.message}
          </pre>
        </details>
      )}

      {/* Retry Button */}
      {onRetry && (
        <Button
          variant="primary"
          onClick={onRetry}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * Inline Error State
 *
 * Compact error display for use within cards or smaller sections.
 *
 * @example
 * ```tsx
 * <InlineErrorState
 *   message="Failed to load chart data"
 *   onRetry={() => refetch()}
 * />
 * ```
 */
export function InlineErrorState({
  message = 'Failed to load',
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-red-500" aria-hidden="true" />
        <span className="text-sm text-red-700 dark:text-red-300">{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-red-600 dark:text-red-400 hover:underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default ErrorState;
