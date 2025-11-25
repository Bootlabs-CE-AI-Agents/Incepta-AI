/**
 * Error Detail Modal Component
 * Story 15: Agent Performance Dashboard - Error Analysis
 * AC #4: Full error message, stack trace, metadata, clickable execution IDs, ESC/X close
 */

'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import Link from 'next/link';
import type { ErrorAnalysisDTO } from '@/types/agent-performance';

interface ErrorDetailModalProps {
  error: ErrorAnalysisDTO | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ErrorDetailModal({ error, isOpen, onClose }: ErrorDetailModalProps) {
  // ESC key handler (AC #4)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !error) return null;

  // Format timestamp for display
  const formatTimestamp = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="error-modal-title"
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-white/50 dark:border-white/20 px-6 py-4 flex items-center justify-between">
          <h2 id="error-modal-title" className="text-xl font-semibold text-text-primary dark:text-white">
            Error Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] px-6 py-4">
          {/* Error Message Section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-text-primary dark:text-text-secondary mb-2">Error Message</h3>
            <p className="text-base text-text-primary dark:text-white whitespace-pre-wrap break-words">
              {error.error_message}
            </p>
          </div>

          {/* Metadata Table */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-text-primary dark:text-text-secondary mb-2">Metadata</h3>
            <table className="min-w-full divide-y divide-white/50 dark:divide-white/20 border border-white/50 dark:border-white/20 rounded-md">
              <tbody className="divide-y divide-white/50 dark:divide-white/20 bg-white dark:bg-white/5">
                <tr>
                  <td className="px-4 py-2 text-sm font-medium text-text-primary dark:text-text-secondary bg-white/50 dark:bg-white/5 w-1/3">
                    Error Type
                  </td>
                  <td className="px-4 py-2 text-sm text-text-primary dark:text-white">{error.error_type}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm font-medium text-text-primary dark:text-text-secondary bg-white/50 dark:bg-white/5">
                    Occurrences
                  </td>
                  <td className="px-4 py-2 text-sm text-text-primary dark:text-white">{error.occurrences}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm font-medium text-text-primary dark:text-text-secondary bg-white/50 dark:bg-white/5">
                    First Seen
                  </td>
                  <td className="px-4 py-2 text-sm text-text-primary dark:text-white">
                    {formatTimestamp(error.first_seen)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm font-medium text-text-primary dark:text-text-secondary bg-white/50 dark:bg-white/5">
                    Last Seen
                  </td>
                  <td className="px-4 py-2 text-sm text-text-primary dark:text-white">
                    {formatTimestamp(error.last_seen)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm font-medium text-text-primary dark:text-text-secondary bg-white/50 dark:bg-white/5">
                    Affected Executions
                  </td>
                  <td className="px-4 py-2 text-sm text-text-primary dark:text-white">{error.affected_executions}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Stack Trace Section */}
          {error.sample_stack_trace && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-text-primary dark:text-text-secondary mb-2">Stack Trace</h3>
              <pre className="bg-surface text-text-primary rounded-md p-4 overflow-x-auto text-xs font-mono whitespace-pre-wrap break-words">
                {error.sample_stack_trace}
              </pre>
            </div>
          )}

          {/* Affected Execution IDs Section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-text-primary dark:text-text-secondary mb-2">
              Affected Executions ({error.execution_ids.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {error.execution_ids.map((execId) => (
                <Link
                  key={execId}
                  href={`/dashboard/execution-history/${execId}`}
                  className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                  aria-label={`View execution ${execId}`}
                >
                  {execId}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
