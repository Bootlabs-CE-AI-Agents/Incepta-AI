'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Global Error Boundary
 *
 * Next.js App Router global error boundary for the entire application.
 * This catches errors in root layout and provides a full-page error recovery UI.
 *
 * Note: This component MUST include its own <html> and <body> tags
 * because it replaces the root layout when an error occurs.
 *
 * Features:
 * - Full-page error display with retry action
 * - Error details in development mode
 * - Error logging for debugging
 * - Standalone (no layout dependencies)
 *
 * Accessibility (WCAG 2.1 AA):
 * - role="alert" for screen reader announcement
 * - Keyboard accessible actions
 *
 * Reference: Story 35 AC-2 (Error Boundaries), AC-8 (Unhandled Errors)
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling#handling-errors-in-root-layouts
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Log error for debugging
  useEffect(() => {
    console.error('Global Error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-gray-50 dark:bg-gray-900">
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen flex flex-col items-center justify-center px-4"
        >
          {/* Screen reader announcement */}
          <span className="sr-only">
            A critical error occurred. {error.message || 'Something went wrong'}
          </span>

          {/* Error Icon */}
          <div className="mb-6 p-4 rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertTriangle
              className="w-16 h-16 text-red-500 dark:text-red-400"
              aria-hidden="true"
            />
          </div>

          {/* Error Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
            Something went wrong
          </h1>

          {/* Error Description */}
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
            We encountered an unexpected error. Please try again or contact support
            if the problem persists.
          </p>

          {/* Error Details (Development Only) */}
          {isDevelopment && (
            <details className="mb-6 w-full max-w-lg">
              <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
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
            <button
              onClick={() => reset()}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Try again
            </button>
            <a
              href="/"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              <Home className="w-4 h-4" aria-hidden="true" />
              Go to Home
            </a>
          </div>

          {/* Support Link */}
          <p className="mt-8 text-xs text-gray-500 dark:text-gray-400">
            If this problem persists, please{' '}
            <a
              href="mailto:support@example.com"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              contact support
            </a>
            {error.digest && (
              <span> with error reference: <code className="text-xs">{error.digest}</code></span>
            )}
          </p>
        </div>
      </body>
    </html>
  );
}
