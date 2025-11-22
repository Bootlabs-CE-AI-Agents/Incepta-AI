/**
 * Health Badge Component
 *
 * Displays MCP server health status with color-coded badge and tooltip.
 * Story 0.4.1: MCP Tool Discovery UI - Health status indicator
 */

'use client';

import React from 'react';
import type { MCPServerHealth, HealthStatus } from '@/types/tools';

interface HealthBadgeProps {
  /** Server health data (undefined if server not found in health map) */
  health?: MCPServerHealth;
  /** Whether to show full tooltip on hover (default: true) */
  showTooltip?: boolean;
}

/**
 * Get badge color and emoji for health status
 *
 * Color scheme from UX wireframes:
 * - 🟢 Healthy (green): Response < 500ms
 * - 🟡 Degraded (yellow): Response 500-2000ms
 * - 🔴 Down (red): No response or error
 */
function getHealthDisplay(status: HealthStatus): {
  emoji: string;
  color: string;
  bgColor: string;
  label: string;
} {
  switch (status) {
    case 'healthy':
      return {
        emoji: '🟢',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        label: 'Healthy',
      };
    case 'degraded':
      return {
        emoji: '🟡',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        label: 'Degraded',
      };
    case 'down':
      return {
        emoji: '🔴',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        label: 'Down',
      };
  }
}

/**
 * Format timestamp to relative time (e.g., "30s ago", "2m ago")
 */
function getRelativeTime(isoTimestamp: string): string {
  const now = Date.now();
  const then = new Date(isoTimestamp).getTime();
  const diffMs = now - then;

  if (diffMs < 60000) {
    return `${Math.floor(diffMs / 1000)}s ago`;
  }
  if (diffMs < 3600000) {
    return `${Math.floor(diffMs / 60000)}m ago`;
  }
  return `${Math.floor(diffMs / 3600000)}h ago`;
}

export default function HealthBadge({ health, showTooltip = true }: HealthBadgeProps) {
  // If no health data, show unknown status
  if (!health) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-gray-500/10 text-gray-400">
        ⚪ Unknown
      </span>
    );
  }

  const display = getHealthDisplay(health.status);
  const relativeTime = getRelativeTime(health.last_check);

  return (
    <div className="group relative inline-block">
      {/* Badge */}
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${display.bgColor} ${display.color}`}
      >
        <span>{display.emoji}</span>
        <span>{display.label}</span>
      </span>

      {/* Tooltip (shown on hover) */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
          <div className="bg-surface-elevated border border-white/10 rounded-lg shadow-lg px-3 py-2 text-xs space-y-1 min-w-[200px]">
            <div className="font-semibold text-text-primary">{health.server}</div>
            <div className="text-text-secondary">
              Status: <span className={display.color}>{display.label}</span>
            </div>
            <div className="text-text-secondary">Last check: {relativeTime}</div>
            {health.response_time_ms > 0 && (
              <div className="text-text-secondary">
                Response: {health.response_time_ms}ms
              </div>
            )}
            <div className="text-text-secondary">Tools: {health.tools_available}</div>
            {health.error && (
              <div className="text-red-400 text-xs mt-1 pt-1 border-t border-white/10">
                {health.error}
              </div>
            )}
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-surface-elevated border-r border-b border-white/10 rotate-45 -mt-1"></div>
        </div>
      )}
    </div>
  );
}
