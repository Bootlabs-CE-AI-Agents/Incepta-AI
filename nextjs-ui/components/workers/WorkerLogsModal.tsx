/**
 * Worker Logs Viewer Modal
 *
 * Full-featured logs viewer with:
 * - Log level filtering (ERROR/WARNING/INFO/DEBUG)
 * - Line count selection (50/100/250/500/1000)
 * - Search/filter logs by text
 * - Auto-refresh toggle (5s/10s/30s/off)
 * - Download logs as .log file
 * - Auto-scroll to bottom (tail mode)
 * - Syntax highlighting & line numbers
 *
 * Story 3.3: Worker Logs Viewer (P1)
 */

'use client';

import React, { useState, useRef, useEffect, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { workersApi } from '@/lib/api/workers';
import { Dialog, Transition } from '@headlessui/react';
import { Button } from '@/components/ui/Button';
import {
  Download,
  Search,
  RefreshCw,
  X,
  AlertCircle,
  Info,
  AlertTriangle,
  Bug,
  XCircle,
} from 'lucide-react';

interface WorkerLogsModalProps {
  hostname: string;
  isOpen: boolean;
  onClose: () => void;
}

type LogLevel = 'ALL' | 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';
type LineCount = 50 | 100 | 250 | 500 | 1000;
type RefreshInterval = 0 | 5000 | 10000 | 30000;

const LOG_LEVEL_COLORS: Record<string, string> = {
  ERROR: 'bg-red-500/10 text-red-500 border-red-500/20',
  WARN: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  WARNING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  INFO: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  DEBUG: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

const LOG_LEVEL_ICONS: Record<string, React.ReactNode> = {
  ERROR: <XCircle className="h-3 w-3" />,
  WARN: <AlertTriangle className="h-3 w-3" />,
  WARNING: <AlertTriangle className="h-3 w-3" />,
  INFO: <Info className="h-3 w-3" />,
  DEBUG: <Bug className="h-3 w-3" />,
};

export function WorkerLogsModal({ hostname, isOpen, onClose }: WorkerLogsModalProps) {
  const [logLevel, setLogLevel] = useState<LogLevel>('ALL');
  const [lineCount, setLineCount] = useState<LineCount>(100);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const {
    data: logsData,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['worker-logs', hostname, lineCount],
    queryFn: () => workersApi.getWorkerLogs(hostname, lineCount),
    enabled: isOpen,
    refetchInterval: refreshInterval,
    refetchOnWindowFocus: false,
  });

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logsData, autoScroll]);

  // Parse log line to extract level, timestamp, and message
  const parseLogLine = (line: string) => {
    // Typical format: "2025-01-21 14:30:45,123 INFO: Message here"
    const logRegex = /^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}[,.]?\d*)\s+(\w+):?\s+(.*)$/;
    const match = line.match(logRegex);

    if (match) {
      return {
        timestamp: match[1],
        level: match[2].toUpperCase(),
        message: match[3],
        raw: line,
      };
    }

    // Fallback if no match
    return {
      timestamp: '',
      level: 'INFO',
      message: line,
      raw: line,
    };
  };

  // Filter logs by level and search query
  const filteredLogs = React.useMemo(() => {
    if (!logsData?.logs) return [];

    return logsData.logs
      .map(parseLogLine)
      .filter((log) => {
        // Level filter
        if (logLevel !== 'ALL' && log.level !== logLevel) return false;

        // Search filter
        if (searchQuery && !log.raw.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }

        return true;
      });
  }, [logsData, logLevel, searchQuery]);

  // Download logs as .log file
  const handleDownloadLogs = () => {
    if (!logsData?.logs) return;

    const blob = new Blob([logsData.logs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${hostname}_${new Date().toISOString()}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
                    {isFetching && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <button
                      onClick={() => refetch()}
                      className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={onClose}
                      className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Filters & Controls */}
                <div className="flex items-center gap-4 flex-wrap mb-4">
                  {/* Log Level Filter */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Level:</label>
                    <select
                      value={logLevel}
                      onChange={(e) => setLogLevel(e.target.value as LogLevel)}
                      className="px-3 py-1.5 text-sm border border-border rounded-md bg-background"
                    >
                      <option value="ALL">All Levels</option>
                      <option value="ERROR">ERROR</option>
                      <option value="WARNING">WARNING</option>
                      <option value="INFO">INFO</option>
                      <option value="DEBUG">DEBUG</option>
                    </select>
                  </div>

                  {/* Line Count */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Lines:</label>
                    <select
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

                  {/* Auto-refresh */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Refresh:</label>
                    <select
                      value={refreshInterval}
                      onChange={(e) => setRefreshInterval(Number(e.target.value) as RefreshInterval)}
                      className="px-3 py-1.5 text-sm border border-border rounded-md bg-background"
                    >
                      <option value={0}>Off</option>
                      <option value={5000}>5s</option>
                      <option value={10000}>10s</option>
                      <option value={30000}>30s</option>
                    </select>
                  </div>

                  {/* Search */}
                  <div className="flex-1 relative min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search logs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-1.5 text-sm border border-border rounded-md bg-background"
                    />
                  </div>

                  {/* Download */}
                  <Button variant="secondary" size="sm" onClick={handleDownloadLogs}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>

                  {/* Auto-scroll toggle */}
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                      className="rounded border-border"
                    />
                    Auto-scroll
                  </label>
                </div>

                {/* Logs Display */}
                <div className="flex-1 overflow-auto bg-gray-950 rounded-md border border-border">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                      Loading logs...
                    </div>
                  ) : isError ? (
                    <div className="flex items-center justify-center h-64 text-red-500">
                      <AlertCircle className="h-6 w-6 mr-2" />
                      Failed to load logs
                    </div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      No logs found
                    </div>
                  ) : (
                    <div className="p-4 font-mono text-xs leading-relaxed">
                      {filteredLogs.map((log, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-[60px_80px_1fr] gap-4 py-1 hover:bg-white/5 px-2 -mx-2 rounded"
                        >
                          {/* Line Number */}
                          <span className="text-gray-600 text-right select-none">{index + 1}</span>

                          {/* Log Level Badge */}
                          <div className="flex items-center">
                            {log.level && (
                              <div
                                className={`${LOG_LEVEL_COLORS[log.level] || 'bg-gray-500/10 text-gray-500'} text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1`}
                              >
                                {LOG_LEVEL_ICONS[log.level]}
                                <span>{log.level}</span>
                              </div>
                            )}
                          </div>

                          {/* Log Content */}
                          <div className="text-gray-300 break-all">
                            {log.timestamp && (
                              <span className="text-gray-500 mr-2">[{log.timestamp}]</span>
                            )}
                            <span>{log.message}</span>
                          </div>
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  )}
                </div>

                {/* Footer Stats */}
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2 mt-4">
                  <div>
                    Showing {filteredLogs.length} of {logsData?.logs.length || 0} lines
                  </div>
                  {refreshInterval > 0 && (
                    <div className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Auto-refreshing every {refreshInterval / 1000}s
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
