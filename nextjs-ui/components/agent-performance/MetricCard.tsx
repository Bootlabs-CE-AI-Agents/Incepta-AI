/**
 * Metric Card Component
 * Displays a single performance metric with optional color coding and trend
 * Uses glass-kpi class for glass effect with fluid background animation visibility.
 *
 * Reference: UX Design Specification - Section 6.1 Component Strategy
 */

'use client';

import { cn } from '@/lib/utils/cn';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  colorClass?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  isLoading?: boolean;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  colorClass = 'text-foreground',
  trend,
  isLoading = false
}: MetricCardProps) {
  // Skeleton loading state
  if (isLoading) {
    return (
      <div
        className="glass-kpi p-6 animate-pulse"
        role="status"
        aria-label="Loading metric"
      >
        <div className="h-4 bg-gray-200/50 rounded w-24 mb-4" />
        <div className="h-8 bg-gray-200/60 rounded w-32 mb-2" />
        {subtitle && <div className="h-4 bg-gray-200/50 rounded w-36" />}
      </div>
    );
  }

  return (
    <div className="glass-kpi p-6">
      {/* Header with title and optional icon */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-muted-foreground">
          {title}
        </p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>

      {/* Value */}
      <div className={cn("text-h3 font-bold tabular-nums", colorClass)}>
        {value}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
      )}

      {/* Trend indicator */}
      {trend && (
        <div className={cn(
          "text-xs mt-2 flex items-center gap-1 tabular-nums font-medium",
          trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
        )}>
          <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
          <span>{Math.abs(trend.value).toFixed(1)}% vs previous period</span>
        </div>
      )}
    </div>
  );
}
