"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { formatDistanceToNow } from "date-fns";

/**
 * Dashboard Home Page
 *
 * Displays real-time overview metrics and stats cards with Liquid Glass design
 * Data sourced from backend API with IST timezone support
 *
 * Reference: Story 0.1 - Dashboard Real Data Integration
 */
export default function DashboardPage() {
  const { data, error, isLoading } = useDashboardSummary(30000); // Refresh every 30s

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <h2 className="text-h2 font-bold text-text-primary">Dashboard</h2>
          {/* Loading skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-card p-6 animate-pulse">
                <div className="h-4 bg-white/20 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-white/30 rounded w-2/3 mb-2"></div>
                <div className="h-3 bg-white/20 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <h2 className="text-h2 font-bold text-text-primary">Dashboard</h2>
          <div className="glass-card p-6 border-2 border-accent-orange/50">
            <div className="text-accent-orange font-semibold mb-2">
              Failed to load dashboard data
            </div>
            <div className="text-small text-text-secondary">
              {error instanceof Error ? error.message : "Unknown error occurred"}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return null;
  }

  // Helper to get status color class
  const getChangeColor = (change: { is_positive: boolean } | null) => {
    if (!change) return "text-text-secondary";
    return change.is_positive ? "text-accent-green" : "text-accent-orange";
  };

  // Helper to get activity status badge color
  const getActivityStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-accent-green/20 text-accent-green";
      case "error":
        return "bg-accent-orange/20 text-accent-orange";
      case "info":
        return "bg-accent-blue/20 text-accent-blue";
      case "warning":
        return "bg-accent-orange/20 text-accent-orange";
      default:
        return "bg-white/20 text-text-secondary";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-h2 font-bold text-text-primary">Dashboard</h2>
          <div className="text-small text-text-secondary">
            Updated {formatDistanceToNow(new Date(data.generated_at), { addSuffix: true })}
          </div>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Active Agents */}
          <div className="glass-card p-6">
            <div className="text-caption text-text-secondary mb-2">
              Active Agents
            </div>
            <div className="text-h2 font-bold text-text-primary">
              {data.active_agents.count}
            </div>
            {data.active_agents.change && (
              <div className={`text-small mt-2 ${getChangeColor(data.active_agents.change)}`}>
                {data.active_agents.change.value}
              </div>
            )}
          </div>

          {/* Executions Today */}
          <div className="glass-card p-6">
            <div className="text-caption text-text-secondary mb-2">
              Executions Today
            </div>
            <div className="text-h2 font-bold text-text-primary">
              {data.executions_today.total}
            </div>
            <div className="text-small text-accent-blue mt-2">
              {data.executions_today.successful} successful ({data.executions_today.success_rate.toFixed(1)}%)
            </div>
          </div>

          {/* Avg Response Time */}
          <div className="glass-card p-6">
            <div className="text-caption text-text-secondary mb-2">
              Avg Response Time
            </div>
            <div className="text-h2 font-bold text-text-primary">
              {data.avg_response_time.value}
            </div>
            {data.avg_response_time.change ? (
              <div className={`text-small mt-2 ${getChangeColor(data.avg_response_time.change)}`}>
                {data.avg_response_time.change.value}
              </div>
            ) : (
              <div className="text-small text-text-secondary mt-2">
                {data.avg_response_time.threshold_exceeded ? "Above 500ms threshold" : "Within threshold"}
              </div>
            )}
          </div>

          {/* Error Rate */}
          <div className="glass-card p-6">
            <div className="text-caption text-text-secondary mb-2">
              Error Rate
            </div>
            <div className="text-h2 font-bold text-text-primary">
              {data.error_rate.percentage.toFixed(1)}%
            </div>
            <div className={`text-small mt-2 ${data.error_rate.is_critical ? "text-accent-orange" : "text-accent-green"}`}>
              {data.error_rate.status_message}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-6">
          <h3 className="text-h3 font-semibold text-text-primary mb-4">
            Recent Activity
          </h3>
          {data.recent_activity.length === 0 ? (
            <div className="text-center text-text-secondary py-8">
              No recent activity
            </div>
          ) : (
            <div className="space-y-3">
              {data.recent_activity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text-primary">
                      {activity.title}
                    </div>
                    <div className="text-small text-text-secondary">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </div>
                    {activity.details && (
                      <div className="text-small text-text-secondary mt-1 truncate max-w-md">
                        {activity.details}
                      </div>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 rounded-md text-small font-medium ${getActivityStatusColor(activity.status)}`}
                  >
                    {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
