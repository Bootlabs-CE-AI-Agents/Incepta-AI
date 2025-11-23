/**
 * Worker utility functions
 *
 * Formatting and color-coding helpers for worker monitoring UI
 */

/**
 * Format uptime seconds to human-readable duration (AC-3)
 *
 * @param seconds - Uptime in seconds
 * @returns Formatted string (e.g., "< 1m", "45m", "5h 30m", "2d 5h")
 *
 * @example
 * formatUptime(45) // "< 1m"
 * formatUptime(3600) // "1h"
 * formatUptime(90000) // "1d 1h"
 */
export function formatUptime(seconds: number): string {
  if (seconds < 60) {
    return '< 1m';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

/**
 * Get Tailwind color class for CPU/Memory percentage (AC-3)
 *
 * Color coding thresholds:
 * - < 70%: Green (healthy)
 * - 70-85%: Yellow (warning)
 * - > 85%: Red + bold (critical)
 *
 * @param percent - CPU or Memory utilization (0-100)
 * @returns Tailwind class string
 *
 * @example
 * getCPUMemoryColor(65) // "text-green-600"
 * getCPUMemoryColor(75) // "text-yellow-600"
 * getCPUMemoryColor(90) // "text-red-600 font-bold"
 */
export function getCPUMemoryColor(percent: number): string {
  if (percent < 70) {
    return 'text-green-600';
  } else if (percent <= 85) {
    return 'text-yellow-600';
  } else {
    return 'text-red-600 font-bold';
  }
}

/**
 * Abbreviate large numbers for display (AC-2)
 *
 * @param num - Number to abbreviate
 * @returns Formatted string with abbreviation (e.g., "1.2K", "45.3K", "1.5M")
 *
 * @example
 * abbreviateNumber(1234) // "1.2K"
 * abbreviateNumber(45300) // "45.3K"
 * abbreviateNumber(1500000) // "1.5M"
 */
export function abbreviateNumber(num: number): string {
  if (num < 1000) {
    return num.toString();
  }

  if (num < 1_000_000) {
    return `${(num / 1000).toFixed(1)}K`;
  }

  if (num < 1_000_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }

  return `${(num / 1_000_000_000).toFixed(1)}B`;
}
