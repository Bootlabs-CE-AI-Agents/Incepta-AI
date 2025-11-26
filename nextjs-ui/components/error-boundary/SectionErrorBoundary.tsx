"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface SectionErrorBoundaryProps {
  children: ReactNode;
  /**
   * Section title for error display
   */
  title?: string;
  /**
   * Whether the section can be retried
   */
  retryable?: boolean;
  /**
   * Custom fallback UI (optional)
   */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /**
   * Error callback for logging (e.g., Sentry)
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /**
   * Custom class name for the error container
   */
  className?: string;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

/**
 * SectionErrorBoundary Component
 *
 * Section-level error boundary for graceful degradation.
 * Unlike the page-level ErrorBoundary, this displays inline errors
 * allowing other sections to remain functional.
 *
 * Features:
 * - Catches errors within a section without crashing the whole page
 * - Shows inline error message with optional retry button
 * - Expandable error details in development mode
 * - Accessible (role="alert", aria-live, keyboard navigation)
 * - Graceful degradation - other sections continue working
 *
 * Use Cases:
 * - Dashboard widgets that may fail independently
 * - Data tables that load asynchronously
 * - Charts or metrics panels
 * - Any component that shouldn't crash the entire page
 *
 * @example
 * ```tsx
 * // Wrap dashboard sections
 * <SectionErrorBoundary title="Metrics" retryable>
 *   <MetricsPanel />
 * </SectionErrorBoundary>
 *
 * // Wrap data table
 * <SectionErrorBoundary title="Agent List" retryable>
 *   <AgentTable />
 * </SectionErrorBoundary>
 * ```
 *
 * Reference: Story 35 AC-2, AC-4, AC-8 (Section Error Boundaries)
 */
export class SectionErrorBoundary extends Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<SectionErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Call onError callback for logging
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error(
        `SectionErrorBoundary [${this.props.title || "Unnamed"}] caught:`,
        error,
        errorInfo
      );
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    const { title = "Section", retryable = true, className = "" } = this.props;

    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Default inline error UI
      return (
        <div
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className={`p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-lg ${className}`}
        >
          {/* Error Header */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-1.5 bg-red-100 dark:bg-red-900/30 rounded-full">
              <AlertTriangle
                size={20}
                className="text-red-600 dark:text-red-400"
                aria-hidden="true"
              />
            </div>

            <div className="flex-1 min-w-0">
              {/* Error Title */}
              <h3 className="font-medium text-red-800 dark:text-red-200">
                Failed to load {title}
              </h3>

              {/* Error Message */}
              <p className="mt-1 text-sm text-red-600 dark:text-red-300">
                This section encountered an error. Other parts of the page are still working.
              </p>

              {/* Actions */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {/* Retry Button */}
                {retryable && (
                  <button
                    onClick={this.handleReset}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                    aria-label={`Retry loading ${title}`}
                  >
                    <RefreshCw size={14} aria-hidden="true" />
                    Retry
                  </button>
                )}

                {/* Show/Hide Details (Dev Mode) */}
                {process.env.NODE_ENV === "development" && (
                  <button
                    onClick={this.toggleDetails}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                    aria-expanded={this.state.showDetails}
                    aria-controls="error-details"
                  >
                    {this.state.showDetails ? (
                      <>
                        <ChevronUp size={14} aria-hidden="true" />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} aria-hidden="true" />
                        Show Details
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Error Details (Dev Mode) */}
              {process.env.NODE_ENV === "development" && this.state.showDetails && (
                <div
                  id="error-details"
                  className="mt-3 p-3 bg-white/50 dark:bg-black/20 rounded-md border border-red-200 dark:border-red-800/50"
                >
                  <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">
                    Error Message:
                  </p>
                  <pre className="text-xs font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap break-words mb-2">
                    {this.state.error.message}
                  </pre>

                  {this.state.error.stack && (
                    <>
                      <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1 mt-2">
                        Stack Trace:
                      </p>
                      <pre className="text-xs font-mono text-red-500 dark:text-red-500 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                        {this.state.error.stack}
                      </pre>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SectionErrorBoundary;
