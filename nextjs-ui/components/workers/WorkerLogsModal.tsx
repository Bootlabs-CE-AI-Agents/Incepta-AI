/**
 * Worker Logs Viewer Modal
 *
 * Full-featured logs viewer with virtualization for performance.
 *
 * Features (All 9 ACs):
 * - AC-1: Modal opens with log display, controls, dark theme
 * - AC-2: Log level color coding (ERROR/WARN/INFO/DEBUG)
 * - AC-3: Search/filter with debouncing (300ms)
 * - AC-4: Auto-scroll toggle with session storage
 * - AC-5: Refresh logs with Ctrl+R/Cmd+R
 * - AC-6: Download logs as .txt file
 * - AC-7: Virtualized list for performance (TanStack Virtual)
 * - AC-8: Full keyboard navigation (ESC, Ctrl+F, Ctrl+R, Ctrl+D)
 * - AC-9: Enhanced error handling (404/503/network)
 *
 * Story: nextjs-story-19-workers-logs-viewer
 */

'use client';

import React, { useState, useRef, useEffect, Fragment, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@/components/ui/Button';
import { useWorkerLogs } from '@/lib/hooks/useWorkers';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { getLogLevelColor, formatLogTimestamp } from '@/lib/utils/logParser';
import { downloadLogs } from '@/lib/utils/downloadLogs';
import {
  Download,
  Search,
  RefreshCw,
  X,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface WorkerLogsModalProps {
  hostname: string;
  isOpen: boolean;
  onClose: () => void;
}

type LineCount = 50 | 100 | 250 | 500 | 1000;

// Session storage key for auto-scroll preference
const getAutoScrollKey = (hostname: string) => `worker-logs-autoscroll-${hostname}`;

export function WorkerLogsModal({ hostname, isOpen, onClose }: WorkerLogsModalProps) {
  const [lineCount, setLineCount] = useState<LineCount>(100);
  const [searchQuery, setSearchQuery] = useState('');
  const [logLevelFilter, setLogLevelFilter] = useState<string>('all'); // Log level filter
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // AC-3: 300ms debounce

  // AC-4: Auto-scroll with session storage
  const [autoScroll, setAutoScroll] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = sessionStorage.getItem(getAutoScrollKey(hostname));
    return stored === 'true' || stored === null; // Default ON
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastRefreshTimeRef = useRef<Date>(new Date());

  // Fetch logs with React Query
  const {
    data: logsData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useWorkerLogs(hostname, lineCount, isOpen);

  // Backend already returns structured logs - no parsing needed
  const parsedLogs = useMemo(() => {
    if (!logsData?.logs) return [];
    // API returns LogEntryDTO objects with timestamp, level, message, task_id
    // Convert to ParsedLogLine format expected by component
    return logsData.logs.map(log => ({
      timestamp: log.timestamp,
      level: log.level,
      message: log.message,
      raw: `[${log.level}] ${log.message}`, // Construct raw for search
    }));
  }, [logsData]);

  const filteredLogs = useMemo(() => {
    let result = parsedLogs;

    // Apply log level filter first
    if (logLevelFilter !== 'all') {
      result = result.filter((log) => log.level === logLevelFilter);
    }

    // Then apply search filter
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      result = result.filter((log) => log.raw.toLowerCase().includes(query));
    }

    return result;
  }, [parsedLogs, logLevelFilter, debouncedSearchQuery]);

  // AC-7: Virtualization with TanStack Virtual
  const rowVirtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // Fixed row height (font-mono text-xs with py-1)
    overscan: 10, // Buffer rows (AC-7 requirement: 10 rows above/below)
  });

  // AC-4: Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && filteredLogs.length > 0) {
      rowVirtualizer.scrollToIndex(filteredLogs.length - 1, {
        align: 'end',
        behavior: 'smooth',
      });
    }
  }, [filteredLogs.length, autoScroll, rowVirtualizer]);

  // AC-4: Persist auto-scroll preference to session storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(getAutoScrollKey(hostname), String(autoScroll));
    }
  }, [autoScroll, hostname]);

  // AC-8: Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F / Cmd+F: Focus search input
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Ctrl+R / Cmd+R: Refresh logs
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      }

      // Ctrl+D / Cmd+D: Download logs
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        handleDownload();
      }

      // ESC: Close modal (handled by Headless UI, but explicit for clarity)
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filteredLogs]); // eslint-disable-line react-hooks/exhaustive-deps

  // AC-8: Focus management - focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // AC-5: Refresh logs
  const handleRefresh = async () => {
    lastRefreshTimeRef.current = new Date();
    await refetch();
    if (autoScroll && filteredLogs.length > 0) {
      rowVirtualizer.scrollToIndex(filteredLogs.length - 1, { align: 'end' });
    }
  };

  // AC-6: Download logs
  const handleDownload = () => {
    if (!filteredLogs.length) {
      toast.error('No logs to download');
      return;
    }

    downloadLogs(hostname, filteredLogs);
    toast.success('Logs downloaded');
  };

  // AC-9: Error handling - detect specific error types
  const errorType = useMemo(() => {
    if (!isError || !error) return null;

    const err = error as { response?: { status?: number }; message?: string; code?: string };
    if (err.response?.status === 404) return '404';
    if (err.response?.status === 503) return '503';
    if (err.message?.includes('Network') || err.code === 'ERR_NETWORK') return 'network';
    return 'unknown';
  }, [isError, error]);

  // AC-9: Error state rendering
  const renderErrorState = () => {
    switch (errorType) {
      case '404':
        return (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <XCircle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-red-500 font-semibold mb-2">
              Worker {hostname} not found
            </p>
            <p className="text-muted-foreground text-sm mb-4">
              It may have been terminated or the hostname is incorrect.
            </p>
            <p className="text-xs text-muted-foreground">
              Refresh button is disabled. Close this modal and try again.
            </p>
          </div>
        );

      case '503':
        return (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
            <p className="text-yellow-500 font-semibold mb-2">
              API service unavailable
            </p>
            <p className="text-muted-foreground text-sm mb-4">
              The backend service is temporarily unavailable.
            </p>
            <Button onClick={() => refetch()} variant="secondary" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        );

      case 'network':
        return (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <AlertCircle className="h-12 w-12 text-orange-500 mb-4" />
            <p className="text-orange-500 font-semibold mb-2">Network error</p>
            <p className="text-muted-foreground text-sm mb-4">
              Check your connection and try again.
            </p>
            <Button onClick={() => refetch()} variant="secondary" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-red-500 font-semibold mb-2">Failed to load logs</p>
            <p className="text-muted-foreground text-sm mb-4">
              {(error as { message?: string })?.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={() => refetch()} variant="secondary" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        );
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-background-secondary border border-border p-6 shadow-xl transition-all flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold text-text-primary">
                    Worker Logs: {hostname}
                  </Dialog.Title>
                  <div className="flex items-center gap-2">
                    {isFetching && (
                      <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    <button
                      onClick={handleRefresh}
                      disabled={errorType === '404'} // AC-9: Disable refresh on 404
                      className="p-1.5 rounded-md hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Refresh logs"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={onClose}
                      className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                      aria-label="Close modal"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Filters & Controls */}
                <div className="flex items-center gap-4 flex-wrap mb-4">
                  {/* Line Count */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground" htmlFor="line-count">
                      Lines:
                    </label>
                    <select
                      id="line-count"
                      value={lineCount}
                      onChange={(e) => setLineCount(Number(e.target.value) as LineCount)}
                      className="px-3 py-1.5 text-sm border border-border rounded-md bg-background"
                    >
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={250}>250</option>
                      <option value={500}>500</option>
                      <option value={1000}>1000</option>
                    </select>
                  </div>

                  {/* Log Level Filter */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground" htmlFor="log-level">
                      Level:
                    </label>
                    <select
                      id="log-level"
                      value={logLevelFilter}
                      onChange={(e) => setLogLevelFilter(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-border rounded-md bg-background"
                    >
                      <option value="all">All</option>
                      <option value="ERROR">ERROR</option>
                      <option value="WARNING">WARNING</option>
                      <option value="INFO">INFO</option>
                      <option value="DEBUG">DEBUG</option>
                    </select>
                  </div>

                  {/* Search - AC-3 */}
                  <div className="flex-1 relative min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search logs... (Ctrl+F)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-10 py-1.5 text-sm border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                      aria-label="Search logs"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-text-primary"
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Download - AC-6 */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDownload}
                    disabled={!filteredLogs.length}
                    title="Ctrl+D / Cmd+D"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>

                  {/* Auto-scroll toggle - AC-4 */}
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                      className="rounded border-border"
                      aria-label="Auto-scroll to bottom"
                    />
                    Auto-scroll
                  </label>
                </div>

                {/* Logs Display - AC-7: Virtualized */}
                <div
                  ref={parentRef}
                  className="flex-1 overflow-auto bg-gray-950 rounded-md border border-border"
                  style={{ height: '500px' }}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                      Loading logs...
                    </div>
                  ) : isError ? (
                    renderErrorState()
                  ) : filteredLogs.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      {searchQuery
                        ? `No logs match your search: "${searchQuery}"`
                        : 'No logs found'}
                    </div>
                  ) : (
                    <div
                      style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                      }}
                    >
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const log = filteredLogs[virtualRow.index];
                        const colorClass = getLogLevelColor(log.level);

                        return (
                          <div
                            key={virtualRow.key}
                            data-index={virtualRow.index}
                            ref={rowVirtualizer.measureElement}
                            className="absolute top-0 left-0 w-full grid grid-cols-[60px_1fr] gap-4 px-4 py-1 hover:bg-white/5 font-mono text-xs"
                            style={{
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                          >
                            {/* Line Number - AC-2 */}
                            <span className="text-gray-600 text-right select-none">
                              {virtualRow.index + 1}
                            </span>

                            {/* Log Content - AC-2 */}
                            <div className={`break-all ${colorClass}`}>
                              {log.timestamp && (
                                <span className="text-gray-500 mr-2">
                                  [{formatLogTimestamp(log.timestamp)}]
                                </span>
                              )}
                              {log.level && (
                                <span className="font-semibold mr-2">[{log.level}]</span>
                              )}
                              <span>{log.message}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer Stats */}
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2 mt-4">
                  <div>
                    Showing {filteredLogs.length} of {parsedLogs.length} lines
                    {searchQuery && ` (filtered)`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last refreshed: {lastRefreshTimeRef.current.toLocaleTimeString()}
                  </div>
                </div>

                {/* Keyboard Shortcuts Help - AC-8 */}
                <div className="text-xs text-muted-foreground mt-2 flex gap-4 flex-wrap">
                  <span>ESC: Close</span>
                  <span>Ctrl+F: Search</span>
                  <span>Ctrl+R: Refresh</span>
                  <span>Ctrl+D: Download</span>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
