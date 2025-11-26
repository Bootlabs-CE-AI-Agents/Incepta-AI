/**
 * Execution Table Component
 *
 * Sortable, paginated table using TanStack Table v8 with status badges,
 * duration formatting, and click-to-view-details functionality
 */

import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type OnChangeFn,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, Eye } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { AgentExecution, ExecutionStatus } from '@/lib/hooks/useExecutions';

interface ExecutionTableProps {
  executions: AgentExecution[];
  onRowClick: (execution: AgentExecution) => void;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
}

const STATUS_COLORS: Record<ExecutionStatus, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  completed: 'success',
  processing: 'info',
  pending: 'default',
  failed: 'error',
  cancelled: 'warning',
};

// Direct color values to ensure visibility (bypassing Tailwind color issues)
const COLORS = {
  textPrimary: '#1e293b',      // Very dark slate
  textSecondary: '#475569',    // Medium slate
  textMuted: '#64748b',        // Lighter slate
  headerBg: '#e2e8f0',         // Light slate background
  rowAltBg: '#f8fafc',         // Very light slate
  border: '#cbd5e1',           // Slate border
};

function formatDuration(ms: number | null): string {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function ExecutionTable({ executions, onRowClick, sorting = [], onSortingChange }: ExecutionTableProps) {
  const columns = useMemo<ColumnDef<AgentExecution>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Execution ID',
        cell: ({ row }) => (
          <div
            className="font-mono text-xs truncate max-w-[120px]"
            style={{ color: COLORS.textSecondary }}
          >
            {row.original.id.slice(0, 8)}
          </div>
        ),
        size: 120,
      },
      {
        accessorKey: 'agent_name',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting()}
            className="flex items-center gap-1 transition-colors"
            style={{ color: COLORS.textPrimary }}
          >
            Agent
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <div
            className="font-semibold"
            style={{ color: COLORS.textPrimary }}
          >
            {row.original.agent_name}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting()}
            className="flex items-center gap-1 transition-colors"
            style={{ color: COLORS.textPrimary }}
          >
            Status
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <Badge variant={STATUS_COLORS[row.original.status]} size="sm">
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: 'duration_ms',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting()}
            className="flex items-center gap-1 transition-colors"
            style={{ color: COLORS.textPrimary }}
          >
            Duration
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <div
            className="tabular-nums font-medium"
            style={{ color: COLORS.textPrimary }}
          >
            {formatDuration(row.original.duration_ms)}
          </div>
        ),
      },
      {
        accessorKey: 'started_at',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting()}
            className="flex items-center gap-1 transition-colors"
            style={{ color: COLORS.textPrimary }}
          >
            Started
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const date = new Date(row.original.started_at);
          return (
            <div className="text-sm">
              <div
                className="font-medium"
                style={{ color: COLORS.textPrimary }}
              >
                {formatDistanceToNow(date, { addSuffix: true })}
              </div>
              <div
                className="text-xs"
                style={{ color: COLORS.textSecondary }}
              >
                {format(date, 'MMM d, HH:mm:ss')}
              </div>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRowClick(row.original);
            }}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        ),
        size: 80,
      },
    ],
    [onRowClick]
  );

  const table = useReactTable({
    data: executions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    onSortingChange: onSortingChange,
    enableSortingRemoval: false, // Cycle between asc/desc only
  });

  if (executions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-2">
          <Eye className="h-12 w-12 mx-auto mb-4" style={{ color: COLORS.textMuted }} />
          <p className="text-lg font-semibold" style={{ color: COLORS.textPrimary }}>
            No executions found
          </p>
          <p className="text-sm" style={{ color: COLORS.textSecondary }}>
            Try adjusting your filters
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-lg shadow-sm"
      style={{ border: `1px solid ${COLORS.border}` }}
    >
      <table className="w-full">
        <thead style={{ backgroundColor: COLORS.headerBg, borderBottom: `1px solid ${COLORS.border}` }}>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider"
                  style={{
                    width: header.column.columnDef.size,
                    color: COLORS.textPrimary,
                  }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, idx) => (
            <tr
              key={row.id}
              onClick={() => onRowClick(row.original)}
              className="cursor-pointer transition-colors hover:bg-blue-50"
              style={{
                backgroundColor: idx % 2 === 0 ? '#ffffff' : COLORS.rowAltBg,
                borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-4 py-3 text-sm"
                  style={{ color: COLORS.textPrimary }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
