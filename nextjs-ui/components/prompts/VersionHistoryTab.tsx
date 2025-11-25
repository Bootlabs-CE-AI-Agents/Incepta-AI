/**
 * Version History Tab Component
 *
 * Displays paginated version history with search, filters, and actions:
 * - Pagination (20 versions per page)
 * - Search by description (debounced 500ms)
 * - Date range filter (From/To)
 * - View diff modal
 * - Revert confirmation
 *
 * Story: nextjs-story-28-prompts-version-history
 * ACs: AC-1, AC-4, AC-5, AC-6, AC-7, AC-8
 */

'use client';

import React, { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Eye, RotateCcw, ChevronLeft, ChevronRight, X, History } from 'lucide-react';
import { usePromptVersions } from '@/lib/hooks/usePrompts';
import { useDebounce } from '@/lib/hooks/useDebounce';
import type { PromptVersion } from '@/lib/api/prompts';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { VersionDiffModal } from './VersionDiffModal';
import { RevertConfirmDialog } from './RevertConfirmDialog';

interface VersionHistoryTabProps {
  promptId: string;
  currentTemplateText: string;
}

export function VersionHistoryTab({ promptId, currentTemplateText }: VersionHistoryTabProps) {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null);
  const [revertingVersion, setRevertingVersion] = useState<PromptVersion | null>(null);

  // Debounce search query (AC-4: 500ms debounce)
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch versions with pagination and filters (AC-1, AC-4, AC-5)
  const { data, isLoading, error } = usePromptVersions(promptId, {
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
  });

  const versions = data?.items || [];
  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  // Clear all filters (AC-4)
  const handleClearFilters = () => {
    setSearchQuery('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  // Loading skeleton (AC-8)
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-white/50 dark:bg-white/10 rounded-lg h-24"
          />
        ))}
      </div>
    );
  }

  // Error state (AC-8)
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-sm text-red-800 mb-3">
          Failed to load version history: {(error as Error).message}
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  // Empty state (AC-6)
  if (versions.length === 0 && !debouncedSearch && !fromDate && !toDate) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <History className="h-16 w-16 text-text-secondary mb-4" />
        <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-2">
          No version history available
        </h3>
        <p className="text-sm text-text-secondary max-w-md">
          Versions will be created automatically when you save changes to this prompt.
        </p>
      </div>
    );
  }

  // No results after filtering
  if (versions.length === 0) {
    return (
      <div className="space-y-4">
        {/* Filters UI */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Search by description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button variant="secondary" size="sm" onClick={handleClearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-primary dark:text-text-secondary whitespace-nowrap">From:</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="flex-1"
            />
            <label className="text-sm text-text-primary dark:text-text-secondary whitespace-nowrap">To:</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        {/* No results message */}
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <p className="text-text-secondary">No versions match your filters</p>
          <Button variant="link" size="sm" onClick={handleClearFilters} className="mt-2">
            Clear filters
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters (AC-4) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Search by description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
            aria-label="Search versions by description"
          />
          <Button variant="secondary" size="sm" onClick={handleClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear Filters
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="from-date" className="text-sm text-text-primary dark:text-text-secondary whitespace-nowrap">
            From:
          </label>
          <Input
            id="from-date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="flex-1"
            aria-label="Filter from date"
          />
          <label htmlFor="to-date" className="text-sm text-text-primary dark:text-text-secondary whitespace-nowrap">
            To:
          </label>
          <Input
            id="to-date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="flex-1"
            aria-label="Filter to date"
          />
        </div>
      </div>

      {/* Filtered count (AC-4) */}
      {(debouncedSearch || fromDate || toDate) && data && (
        <p className="text-sm text-text-secondary">
          Showing {versions.length} of {data.total} versions
        </p>
      )}

      {/* Version List Table (AC-1) - Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-white/50 dark:divide-white/20">
          <thead className="bg-white/50 dark:bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Version
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Saved
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider hidden lg:table-cell">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Characters
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-white/5 divide-y divide-white/50 dark:divide-white/20">
            {versions.map((version) => (
              <tr key={version.id} className="hover:bg-white/50 dark:hover:bg-white/10">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-text-primary dark:text-white">
                  v{version.version_number}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                  {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary hidden lg:table-cell">
                  {version.description || '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                  {version.template_text.length.toLocaleString()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedVersion(version)}
                    aria-label={`View version ${version.version_number}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRevertingVersion(version)}
                    aria-label={`Revert to version ${version.version_number}`}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Version List Cards (AC-7) - Mobile */}
      <div className="md:hidden space-y-3">
        {versions.map((version) => (
          <div
            key={version.id}
            className="bg-white dark:bg-white/5 border border-white/50 dark:border-white/20 rounded-lg p-4 space-y-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-text-primary dark:text-white">Version {version.version_number}</p>
                <p className="text-sm text-text-secondary">
                  {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  {version.template_text.length.toLocaleString()} characters
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedVersion(version)}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRevertingVersion(version)}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Revert
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination (AC-5) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/50 dark:border-white/20 pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-text-primary dark:text-text-secondary">
            Page {page} of {totalPages} • {data?.total || 0} versions total
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* View Diff Modal (AC-2) */}
      {selectedVersion && (
        <VersionDiffModal
          isOpen={!!selectedVersion}
          onClose={() => setSelectedVersion(null)}
          version={selectedVersion}
          currentText={currentTemplateText}
          promptId={promptId}
        />
      )}

      {/* Revert Confirmation Dialog (AC-3) */}
      {revertingVersion && (
        <RevertConfirmDialog
          isOpen={!!revertingVersion}
          onClose={() => setRevertingVersion(null)}
          version={revertingVersion}
          promptId={promptId}
        />
      )}
    </div>
  );
}
