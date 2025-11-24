/**
 * Log Parser Utility
 *
 * Parses log lines to extract level, timestamp, and message.
 * Provides color mapping for different log levels.
 *
 * Story: nextjs-story-19-workers-logs-viewer
 * AC-2: Log Level Color Coding Works
 */

export interface ParsedLogLine {
  timestamp: string;
  level: string;
  message: string;
  raw: string;
}

/**
 * Parse a log line to extract structured information
 *
 * Supports multiple log formats:
 * - "2025-01-21 14:30:45,123 INFO: Message here"
 * - "2025-01-21T14:30:45.123Z [INFO] Message"
 * - "ERROR: Something went wrong"
 *
 * @param line - Raw log line string
 * @returns Parsed log line with timestamp, level, message
 */
export function parseLogLine(line: string): ParsedLogLine {
  // Regex for common log formats
  const formats = [
    // ISO timestamp + level + message
    /^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[.,]?\d*Z?)\s+\[?(\w+)\]?:?\s+(.*)$/,
    // Level + message (no timestamp)
    /^(\w+):\s+(.*)$/,
  ];

  for (const regex of formats) {
    const match = line.match(regex);
    if (match) {
      if (match.length === 4) {
        // Format with timestamp
        return {
          timestamp: match[1],
          level: match[2].toUpperCase(),
          message: match[3],
          raw: line,
        };
      } else if (match.length === 3) {
        // Format without timestamp
        return {
          timestamp: '',
          level: match[1].toUpperCase(),
          message: match[2],
          raw: line,
        };
      }
    }
  }

  // Fallback: Check if line contains log level keywords
  const levelKeywords = ['ERROR', 'WARN', 'WARNING', 'INFO', 'DEBUG'];
  for (const keyword of levelKeywords) {
    if (line.toUpperCase().includes(keyword)) {
      return {
        timestamp: '',
        level: keyword,
        message: line,
        raw: line,
      };
    }
  }

  // No match found - default to INFO
  return {
    timestamp: '',
    level: 'INFO',
    message: line,
    raw: line,
  };
}

/**
 * Get Tailwind CSS color class for a log level
 *
 * AC-2 Specification:
 * - ERROR: text-red-600
 * - WARN/WARNING: text-yellow-600
 * - INFO: text-blue-600
 * - DEBUG: text-gray-500
 * - Default: text-white
 *
 * @param level - Log level (ERROR, WARN, INFO, DEBUG)
 * @returns Tailwind CSS color class
 */
export function getLogLevelColor(level: string): string {
  const colorMap: Record<string, string> = {
    ERROR: 'text-red-600',
    WARN: 'text-yellow-600',
    WARNING: 'text-yellow-600',
    INFO: 'text-blue-600',
    DEBUG: 'text-gray-500',
  };

  return colorMap[level.toUpperCase()] || 'text-white';
}

/**
 * Format timestamp for display (HH:mm:ss)
 *
 * AC-1 Specification: Timestamp formatted as HH:mm:ss
 *
 * Industry best practice: Defensive programming with proper error handling
 * for API data that may have unexpected formats.
 *
 * @param timestamp - ISO timestamp or formatted string
 * @returns Formatted time string (HH:mm:ss)
 */
export function formatLogTimestamp(timestamp: string | null | undefined): string {
  // Defensive check for null/undefined (best practice for API data)
  if (!timestamp || typeof timestamp !== 'string') return '';

  try {
    // Try parsing as ISO date
    const date = new Date(timestamp);

    // Validate the date object is valid (best practice)
    if (date instanceof Date && !isNaN(date.getTime()) && isFinite(date.getTime())) {
      // Safe to call toLocaleTimeString
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    }
  } catch (error) {
    // Log error in development for debugging (best practice)
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to parse timestamp:', timestamp, error);
    }
  }

  // Try extracting HH:mm:ss from string (fallback)
  try {
    const timeMatch = timestamp.match(/(\d{2}):(\d{2}):(\d{2})/);
    if (timeMatch) {
      return `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`;
    }
  } catch {
    // Ignore regex errors
  }

  // Final fallback: return empty string for safety (best practice)
  return '';
}
