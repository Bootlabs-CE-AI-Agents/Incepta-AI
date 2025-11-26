'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

/**
 * Dashboard Error Boundary
 *
 * Next.js App Router error boundary for the dashboard section.
 * Catches unhandled errors in dashboard pages and displays a user-friendly error UI.
 *
 * Features:
 * - Full-page error display with retry action
 * - Error details in development mode
 * - Navigation options (home, retry)
 * - Error logging for debugging
 *
 * Accessibility (WCAG 2.1 AA):
 * - role="alert" for screen reader announcement
 * - aria-live="assertive" for immediate announcement
 * - Keyboard accessible actions
 *
 * Reference: Story 35 AC-2 (Error Boundaries), AC-8 (Unhandled Errors)
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Log error for debugging
  useEffect(() => {
    // Log to console in development
    console.error('Dashboard Error:', error);

    // In production, you could send to error tracking service
    // e.g., Sentry, LogRocket, etc.
    if (!isDevelopment) {
      // Example: logErrorToService(error);
    }
  }, [error, isDevelopment]);

  return (
    <DashboardLayout>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="flex flex-col items-center justify-center min-h-[60vh] px-4"
      >
        {/* Screen reader announcement */}
        <span className="sr-only">
          An error occurred. {error.message || 'Something went wrong'}
        </span>

        {/* Error Icon */}
        <div className="mb-6 p-4 rounded-full bg-red-100 dark:bg-red-900/20">
          <AlertTriangle
            className="w-16 h-16 text-red-500 dark:text-red-400"
            aria-hidden="true"
          />
        </div>

        {/* Error Title */}
        <h1 className="text-2xl font-bold text-text-primary dark:text-white mb-2 text-center">
          Something went wrong
        </h1>

        {/* Error Description */}
        <p className="text-text-secondary dark:text-text-secondary text-center max-w-md mb-6">
          We encountered an unexpected error while loading this page.
          Please try again or contact support if the problem persists.
        </p>

        {/* Error Details (Development Only) */}
        {isDevelopment && (
          <details className="mb-6 w-full max-w-lg">
            <summary className="flex items-center gap-2 text-sm text-text-tertiary cursor-pointer hover:text-text-secondary">
              <Bug className="w-4 h-4" aria-hidden="true" />
              Error details (development only)
            </summary>
            <div className="mt-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg overflow-auto">
              <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                {error.name}: {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                  Digest: {error.digest}
                </p>
              )}
              {error.stack && (
                <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">
                  {error.stack}
                </pre>
              )}
            </div>
          </details>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="primary"
            onClick={() => reset()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Try again
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="gap-2"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            Go to Dashboard
          </Button>
        </div>

        {/* Support Link */}
        <p className="mt-8 text-xs text-text-tertiary">
          If this problem persists, please{' '}
          <a
            href="mailto:support@example.com"
            className="text-accent-blue hover:underline focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2 rounded"
          >
            contact support
          </a>
          {error.digest && (
            <span> with error reference: <code className="text-xs">{error.digest}</code></span>
          )}
        </p>
      </div>
    </DashboardLayout>
  );
}
