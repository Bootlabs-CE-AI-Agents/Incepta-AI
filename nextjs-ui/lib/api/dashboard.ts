/**
 * Dashboard API Functions
 *
 * API client functions for dashboard summary metrics
 * including active agents, executions, response times, and activity feed
 */

import { apiClient } from './client';

/**
 * Metric Change Indicator
 */
export interface MetricChange {
  value: string;
  is_positive: boolean;
}

/**
 * Active Agents Metric
 */
export interface ActiveAgentsMetric {
  count: number;
  change: MetricChange | null;
}

/**
 * Executions Today Metric (IST timezone)
 */
export interface ExecutionsTodayMetric {
  total: number;
  successful: number;
  success_rate: number;
}

/**
 * Response Time Metric
 */
export interface ResponseTimeMetric {
  value: string;
  value_ms: number;
  change: MetricChange | null;
  threshold_exceeded: boolean;
}

/**
 * Error Rate Metric
 */
export interface ErrorRateMetric {
  percentage: number;
  status_message: string;
  is_critical: boolean;
}

/**
 * Activity Type Enum
 */
export type ActivityType =
  | 'execution_success'
  | 'execution_failure'
  | 'agent_created'
  | 'agent_updated'
  | 'prompt_created'
  | 'plugin_connected'
  | 'tenant_created';

/**
 * Activity Status Enum
 */
export type ActivityStatus = 'success' | 'error' | 'info' | 'warning';

/**
 * Recent Activity Item
 */
export interface RecentActivity {
  id: string;
  type: ActivityType;
  title: string;
  timestamp: string;
  status: ActivityStatus;
  details: string | null;
}

/**
 * Dashboard Summary Response
 */
export interface DashboardSummary {
  active_agents: ActiveAgentsMetric;
  executions_today: ExecutionsTodayMetric;
  avg_response_time: ResponseTimeMetric;
  error_rate: ErrorRateMetric;
  recent_activity: RecentActivity[];
  generated_at: string;
  timezone: string;
}

/**
 * Get Dashboard Summary
 *
 * Fetches comprehensive dashboard metrics including:
 * - Active agents count with week-over-week change
 * - Today's execution stats (IST timezone)
 * - Average response time (24h rolling)
 * - Error rate with industry threshold classification
 * - Recent activity feed (last 10 events)
 *
 * Results are cached on backend for 60 seconds.
 *
 * @returns Dashboard summary with all metrics
 * @throws Error if API request fails
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await apiClient.get<DashboardSummary>('/api/v1/dashboard/summary');
  return response.data;
}
