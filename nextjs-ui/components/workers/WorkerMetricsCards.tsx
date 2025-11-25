/**
 * WorkerMetricsCards Component
 *
 * Displays 4 summary metric cards for worker monitoring dashboard (AC-2)
 * - Active Workers (green)
 * - Total Active Tasks (blue)
 * - Total Completed Tasks (gray)
 * - Average Throughput (purple)
 *
 * Responsive layout per AC-1:
 * - Desktop (≥1024px): 4 cards in row
 * - Tablet (768-1023px): 2 cards per row
 * - Mobile (≤767px): 1 card per column, stacked
 */

'use client';

import React, { useMemo } from 'react';
import { MetricCard } from '@/components/costs/MetricCard';
import { abbreviateNumber } from '@/lib/utils/workers';
import type { WorkerStatus } from '@/lib/api/workers';

export interface WorkerMetricsCardsProps {
  /** Array of worker statuses from API */
  workers: WorkerStatus[];
  /** Loading state - shows skeleton loaders */
  loading?: boolean;
}

/**
 * Calculate aggregate metrics from workers array (AC-2)
 */
function calculateMetrics(workers: WorkerStatus[]) {
  // Active workers: Count workers with status !== "unresponsive" (AC-2)
  const activeWorkers = workers.filter((w) => w.status !== 'unresponsive').length;

  // Total active tasks: Sum of active_tasks across all workers (AC-2)
  const totalActiveTasks = workers.reduce((sum, w) => sum + w.active_tasks, 0);

  // Total completed: Sum of completed_tasks across all workers (AC-2)
  const totalCompleted = workers.reduce((sum, w) => sum + w.completed_tasks, 0);

  // Average throughput: Mean of throughput_per_minute across all workers (AC-2)
  const avgThroughput =
    workers.length > 0
      ? workers.reduce((sum, w) => sum + w.throughput_per_minute, 0) / workers.length
      : 0;

  return {
    activeWorkers,
    totalActiveTasks,
    totalCompleted,
    avgThroughput,
  };
}

/**
 * WorkerMetricsCards - Summary metrics for workers dashboard
 *
 * Renders 4 metric cards in responsive grid layout:
 * 1. Active Workers (green theme)
 * 2. Total Active Tasks (blue theme)
 * 3. Total Completed Tasks (gray theme, abbreviated)
 * 4. Average Throughput (purple theme, 1 decimal)
 *
 * @example
 * ```tsx
 * <WorkerMetricsCards workers={workersData} loading={isLoading} />
 * ```
 */
export function WorkerMetricsCards({ workers, loading = false }: WorkerMetricsCardsProps) {
  const metrics = useMemo(() => calculateMetrics(workers), [workers]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Card 1: Active Workers (AC-2) */}
      <MetricCard
        label="Active Workers"
        value={loading ? '—' : metrics.activeWorkers.toString()}
        loading={loading}
        className="border-l-4 border-l-green-500"
      />

      {/* Card 2: Total Active Tasks (AC-2) */}
      <MetricCard
        label="Active Tasks"
        value={loading ? '—' : metrics.totalActiveTasks.toString()}
        loading={loading}
        className="border-l-4 border-l-blue-500"
      />

      {/* Card 3: Total Completed Tasks (AC-2) - Abbreviated */}
      <MetricCard
        label="Completed Tasks (All Time)"
        value={loading ? '—' : abbreviateNumber(metrics.totalCompleted)}
        loading={loading}
        className="border-l-4 border-l-text-secondary"
      />

      {/* Card 4: Average Throughput (AC-2) - 1 decimal */}
      <MetricCard
        label="Tasks/Min (Avg)"
        value={loading ? '—' : metrics.avgThroughput.toFixed(1)}
        loading={loading}
        className="border-l-4 border-l-purple-500"
      />
    </div>
  );
}
