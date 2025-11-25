'use client';

/**
 * Worker Performance Charts Component (Story 21)
 *
 * Displays dual-axis line chart (CPU% + Memory%) and throughput mini-chart
 * for worker performance monitoring over 7 days.
 *
 * Features:
 * - Dual Y-axes: Left (CPU%), Right (Memory%) - AC-2
 * - Throughput bar chart with color coding - AC-3
 * - Legend click-to-toggle line visibility - AC-2
 * - Hover tooltip with timestamp + percentages - AC-2
 * - Responsive layout (stacks vertically on mobile) - AC-8
 */

import React, { useState } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  BarChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import type { CpuMemoryDataPoint, ThroughputDataPoint } from '@/lib/api/workers';

interface WorkerPerformanceChartsProps {
  cpuHistory: CpuMemoryDataPoint[];
  memoryHistory: CpuMemoryDataPoint[];
  throughputHistory: ThroughputDataPoint[];
}

/**
 * Merge CPU and Memory histories into single dataset for dual-axis chart
 */
function mergeChartData(
  cpuHistory: CpuMemoryDataPoint[],
  memoryHistory: CpuMemoryDataPoint[]
) {
  const dataMap = new Map<string, { timestamp: string; cpu_percent?: number; memory_percent?: number }>();

  cpuHistory.forEach((point) => {
    dataMap.set(point.timestamp, { timestamp: point.timestamp, cpu_percent: point.percent });
  });

  memoryHistory.forEach((point) => {
    const existing = dataMap.get(point.timestamp);
    if (existing) {
      existing.memory_percent = point.percent;
    } else {
      dataMap.set(point.timestamp, { timestamp: point.timestamp, memory_percent: point.percent });
    }
  });

  return Array.from(dataMap.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Convert throughput data to tasks per minute
 */
function prepareThroughputData(throughputHistory: ThroughputDataPoint[]) {
  return throughputHistory.map((point) => ({
    timestamp: point.timestamp,
    tasks_per_minute: Math.round(point.tasks_completed / 60 * 100) / 100, // Convert to tasks/min with 2 decimals
  }));
}

/**
 * Get throughput bar color based on load (AC-3)
 */
function getThroughputColor(tasksPerMin: number): string {
  if (tasksPerMin < 10) return '#10b981'; // green - normal
  if (tasksPerMin < 50) return '#f59e0b'; // yellow - moderate
  return '#ef4444'; // red - high load
}

export function WorkerPerformanceCharts({
  cpuHistory,
  memoryHistory,
  throughputHistory,
}: WorkerPerformanceChartsProps) {
  const [hiddenLines, setHiddenLines] = useState<string[]>([]);

  // Handle legend click to toggle line visibility (AC-2)
  const handleLegendClick = (dataKey: string) => {
    setHiddenLines((prev) =>
      prev.includes(dataKey) ? prev.filter((key) => key !== dataKey) : [...prev, dataKey]
    );
  };

  const chartData = mergeChartData(cpuHistory, memoryHistory);
  const throughputData = prepareThroughputData(throughputHistory);

  // Edge case: No data available
  if (chartData.length === 0 && throughputData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        No metrics data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dual-Axis CPU/Memory Chart (AC-2) */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-2">CPU & Memory Usage (7 Days)</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />

              {/* X-Axis: Timestamps */}
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                stroke="rgba(255,255,255,0.5)"
                style={{ fontSize: '12px' }}
              />

              {/* Left Y-Axis: CPU% */}
              <YAxis
                yAxisId="left"
                domain={[0, 100]}
                ticks={[0, 20, 40, 60, 80, 100]}
                stroke="#3b82f6"
                label={{ value: 'CPU%', angle: -90, position: 'insideLeft', style: { fill: '#3b82f6' } }}
                style={{ fontSize: '12px' }}
              />

              {/* Right Y-Axis: Memory% */}
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                ticks={[0, 20, 40, 60, 80, 100]}
                stroke="#10b981"
                label={{ value: 'Memory%', angle: 90, position: 'insideRight', style: { fill: '#10b981' } }}
                style={{ fontSize: '12px' }}
              />

              {/* Tooltip */}
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '4px' }}
                labelFormatter={(value) => format(new Date(value), 'PPpp')}
                formatter={(value: number) => [`${value.toFixed(2)}%`]}
              />

              {/* Legend (click to toggle) */}
              <Legend
                onClick={(e) => handleLegendClick(e.dataKey as string)}
                wrapperStyle={{ cursor: 'pointer', paddingTop: '10px' }}
              />

              {/* CPU Line (blue) */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="cpu_percent"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="CPU%"
                hide={hiddenLines.includes('cpu_percent')}
              />

              {/* Memory Line (green) */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="memory_percent"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="Memory%"
                hide={hiddenLines.includes('memory_percent')}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-text-secondary">
            {chartData.length === 0 && cpuHistory.length + memoryHistory.length > 0
              ? `Showing ${cpuHistory.length + memoryHistory.length} partial data points (worker created recently)`
              : 'No CPU/Memory history available'}
          </div>
        )}
      </div>

      {/* Throughput Mini-Chart (AC-3) */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-2">Throughput (tasks/min)</h3>
        {throughputData.length > 0 ? (
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={throughputData}>
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                stroke="rgba(255,255,255,0.5)"
                style={{ fontSize: '11px' }}
              />
              <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: '11px' }} />
              <Bar dataKey="tasks_per_minute">
                {throughputData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getThroughputColor(entry.tasks_per_minute)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-24 text-text-secondary text-sm">
            No task throughput data
          </div>
        )}
      </div>
    </div>
  );
}
