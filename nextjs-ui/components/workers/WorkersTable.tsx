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
import { ArrowUpDown, Search, Filter, FileText, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { formatUptime, getCPUMemoryColor } from '@/lib/utils/workers';
import type { WorkerStatus, WorkerStatusEnum } from '@/lib/api/workers';
import { useDebounce } from '@/lib/hooks/useDebounce';

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
      return { variant: 'success', className: 'bg-green-500 text-white', icon: undefined };
    case 'idle':
      return { variant: 'secondary', className: 'bg-gray-400 text-white', icon: undefined };
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

                return (
                  <tr key={worker.hostname} className="hover:bg-muted/30 transition-colors">
                    {/* Hostname */}
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {worker.hostname}
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

                    {/* CPU % (AC-3: color-coded) */}
                    <td className={`px-4 py-3 text-sm text-right font-mono ${getCPUMemoryColor(worker.cpu_percent)}`}>
                      {worker.cpu_percent.toFixed(1)}%
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
                    <td className="px-4 py-3 text-center">
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
