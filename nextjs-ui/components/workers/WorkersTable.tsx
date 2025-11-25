/**
 * WorkersTable Component
 *
 * Displays workers in sortable, filterable table with status badges and metrics (AC-3, AC-4)
 * Columns: Hostname | Status | Uptime | Active Tasks | CPU % | Memory % | Throughput | Actions
 *
 * Features per AC-4:
 * - Column sorting (click header)
 * - Status filter dropdown
 * - Hostname search (debounced 300ms)
 * - View Logs & Restart actions
 */

'use client';

import React, { useState, useMemo } from 'react';
import { ArrowUpDown, Search, Filter, FileText, RotateCw, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { formatUptime, getCPUMemoryColor } from '@/lib/utils/workers';
import type { WorkerStatus, WorkerStatusEnum } from '@/lib/api/workers';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useWorkerMetrics } from '@/lib/hooks/useWorkers';
import { WorkerPerformanceCharts } from './WorkerPerformanceCharts';
import { WorkerConfigDetails } from './WorkerConfigDetails';

export interface WorkersTableProps {
  /** Array of workers to display */
  workers: WorkerStatus[];
  /** Loading state */
  loading?: boolean;
  /** View Logs handler (Story 19) */
  onViewLogs: (hostname: string) => void;
  /** Restart handler (Story 20) */
  onRestart: (hostname: string) => void;
}

type SortColumn = keyof WorkerStatus | null;
type SortDirection = 'asc' | 'desc';

/**
 * Get status badge variant and color (AC-3)
 */
function getStatusBadge(status: WorkerStatusEnum): { variant: string; className: string; icon?: string } {
  switch (status) {
    case 'active':
      return { variant: 'success', className: 'bg-accent-green text-white', icon: undefined };
    case 'idle':
      return { variant: 'secondary', className: 'bg-text-secondary text-white', icon: undefined };
    case 'unresponsive':
      return { variant: 'destructive', className: 'bg-red-500 text-white', icon: '⚠️' };
  }
}

/**
 * WorkersTable - Sortable, filterable worker monitoring table
 *
 * Implements AC-3 (table layout) and AC-4 (interactions)
 */
export function WorkersTable({ workers, loading = false, onViewLogs, onRestart }: WorkersTableProps) {
  // Sorting state (AC-4)
  const [sortColumn, setSortColumn] = useState<SortColumn>('hostname');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Filtering state (AC-4)
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Debounced search (AC-4: 300ms)
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Expandable row state (Story 21 AC-1, AC-6, AC-7)
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);

  /**
   * Handle column sort toggle (AC-4)
   */
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  /**
   * Handle row click to expand/collapse worker details (Story 21 AC-1, AC-6, AC-7)
   */
  const handleRowClick = (hostname: string) => {
    setExpandedWorker((prev) => (prev === hostname ? null : hostname));
  };

  // Fetch worker metrics for expanded row (Story 21 AC-5)
  const { data: workerMetrics, isLoading: metricsLoading, error: metricsError } = useWorkerMetrics(
    expandedWorker,
    !!expandedWorker
  );

  /**
   * Filter and sort workers (AC-4)
   */
  const filteredAndSortedWorkers = useMemo(() => {
    let result = [...workers];

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((w) => w.status === statusFilter);
    }

    // Apply hostname search (case-insensitive)
    if (debouncedSearch) {
      result = result.filter((w) =>
        w.hostname.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }

    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        return 0;
      });
    }

    return result;
  }, [workers, statusFilter, debouncedSearch, sortColumn, sortDirection]);

  // Empty state (AC-3)
  if (!loading && workers.length === 0) {
    return (
      <div className="glass-card p-12 text-center rounded-xl border border-border/50">
        <div className="text-muted-foreground text-lg mb-4">
          No workers found. Check Celery deployment.
        </div>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Row (AC-4) */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'idle', label: 'Idle' },
              { value: 'unresponsive', label: 'Unresponsive' },
            ]}
            className="w-[180px]"
          />
        </div>

        {/* Hostname Search */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by hostname..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredAndSortedWorkers.length} of {workers.length} workers
        </div>
      </div>

      {/* Table (AC-3) */}
      <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {/* Hostname Column */}
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70"
                  onClick={() => handleSort('hostname')}
                >
                  <div className="flex items-center gap-2">
                    Hostname
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>

                {/* Status Column */}
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>

                {/* Uptime Column */}
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70"
                  onClick={() => handleSort('uptime_seconds')}
                >
                  <div className="flex items-center gap-2">
                    Uptime
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>

                {/* Active Tasks Column */}
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70"
                  onClick={() => handleSort('active_tasks')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Active Tasks
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>

                {/* Completed Tasks Column */}
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70"
                  onClick={() => handleSort('completed_tasks')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Completed Tasks
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>

                {/* CPU % Column */}
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70"
                  onClick={() => handleSort('cpu_percent')}
                >
                  <div className="flex items-center justify-end gap-2">
                    CPU %
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>

                {/* Memory % Column */}
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70"
                  onClick={() => handleSort('memory_percent')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Memory %
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>

                {/* Throughput Column */}
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70"
                  onClick={() => handleSort('throughput_per_minute')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Throughput
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>

                {/* Actions Column */}
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {filteredAndSortedWorkers.map((worker) => {
                const statusBadge = getStatusBadge(worker.status);
                const isExpanded = expandedWorker === worker.hostname;

                return (
                  <React.Fragment key={worker.hostname}>
                    {/* Main Row */}
                    <tr
                      onClick={() => handleRowClick(worker.hostname)}
                      className={`cursor-pointer transition-colors ${
                        isExpanded ? 'bg-muted/50' : 'hover:bg-muted/30'
                      }`}
                    >
                      {/* Hostname */}
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                          {worker.hostname}
                        </div>
                      </td>

                      {/* Status Badge (AC-3) */}
                      <td className="px-4 py-3 text-sm">
                        <Badge className={statusBadge.className}>
                          {statusBadge.icon && <span className="mr-1">{statusBadge.icon}</span>}
                          {worker.status.toUpperCase()}
                        </Badge>
                      </td>

                      {/* Uptime (AC-3: formatted) */}
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatUptime(worker.uptime_seconds)}
                      </td>

                      {/* Active Tasks */}
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        {worker.active_tasks}
                      </td>

                      {/* Completed Tasks */}
                      <td className="px-4 py-3 text-sm text-right font-mono text-muted-foreground">
                        {worker.completed_tasks.toLocaleString()}
                      </td>

                      {/* CPU % (AC-3: color-coded with alert) */}
                      <td className={`px-4 py-3 text-sm text-right font-mono ${getCPUMemoryColor(worker.cpu_percent)}`}>
                        <div className="flex items-center justify-end gap-1">
                          {worker.cpu_percent.toFixed(1)}%
                          {worker.cpu_percent > 80 && (
                            <span title="High CPU usage">
                              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" aria-label="High CPU usage" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Memory % (AC-3: color-coded) */}
                      <td className={`px-4 py-3 text-sm text-right font-mono ${getCPUMemoryColor(worker.memory_percent)}`}>
                        {worker.memory_percent.toFixed(1)}%
                      </td>

                      {/* Throughput (AC-3: 1 decimal) */}
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        {worker.throughput_per_minute.toFixed(1)}
                      </td>

                      {/* Actions (AC-4) */}
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewLogs(worker.hostname)}
                            aria-label={`View logs for ${worker.hostname}`}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRestart(worker.hostname)}
                            aria-label={`Restart ${worker.hostname}`}
                          >
                            <RotateCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Section (Story 21 AC-1, AC-2, AC-3, AC-4, AC-5) */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="bg-muted/20 px-8 py-6">
                          <div className="space-y-6">
                            {/* Collapse Button (AC-7) */}
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedWorker(null)}
                                className="gap-2"
                              >
                                <ChevronUp className="h-4 w-4" />
                                Collapse
                              </Button>
                            </div>

                            {/* Loading State */}
                            {metricsLoading && (
                              <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <span className="ml-3 text-sm text-muted-foreground">Loading metrics...</span>
                              </div>
                            )}

                            {/* Error State */}
                            {metricsError && (
                              <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                  <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
                                  <p className="text-sm text-destructive">Failed to load metrics</p>
                                  <p className="text-xs text-muted-foreground mt-1">{metricsError.message}</p>
                                </div>
                              </div>
                            )}

                            {/* Worker Metrics - Performance Charts & Config (AC-2, AC-3, AC-4) */}
                            {workerMetrics && !metricsLoading && !metricsError && (
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Performance Charts (2/3 width on desktop) - AC-2, AC-3 */}
                                <div className="lg:col-span-2">
                                  <WorkerPerformanceCharts
                                    cpuHistory={workerMetrics.cpu_history}
                                    memoryHistory={workerMetrics.memory_history}
                                    throughputHistory={workerMetrics.throughput_history}
                                  />
                                </div>

                                {/* Worker Configuration (1/3 width on desktop) - AC-4 */}
                                <div className="lg:col-span-1">
                                  <WorkerConfigDetails config={workerMetrics.worker_config} />
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
