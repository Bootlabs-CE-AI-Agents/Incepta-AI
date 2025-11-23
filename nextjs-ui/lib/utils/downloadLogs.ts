/**
 * Download Logs Utility
 *
 * Generates and downloads log files as .txt format.
 *
 * Story: nextjs-story-19-workers-logs-viewer
 * AC-6: Download Logs as .txt
 */

import type { ParsedLogLine } from './logParser';

/**
 * Download logs as a .txt file
 *
 * AC-6 Specification:
 * - Filename: worker-{hostname}-logs-{timestamp}.txt
 * - Example: worker-ai-agents-worker-abc123-logs-2025-11-23T14-30-00.txt
 * - Content format: [TIMESTAMP] [LEVEL] MESSAGE
 * - Uses Blob + URL.createObjectURL
 * - Revokes object URL after download
 * - Timestamp in ISO 8601 with colons replaced by hyphens (filesystem-safe)
 *
 * @param hostname - Worker hostname
 * @param logs - Array of parsed log lines (filtered or all)
 */
export function downloadLogs(hostname: string, logs: ParsedLogLine[] | string[]) {
  // Generate filesystem-safe timestamp
  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, '-') // Replace colons with hyphens
    .split('.')[0]; // Remove milliseconds

  const filename = `worker-${hostname}-logs-${timestamp}.txt`;

  // Format log content
  let content: string;

  if (logs.length > 0 && typeof logs[0] === 'object' && 'raw' in logs[0]) {
    // ParsedLogLine[] format
    content = (logs as ParsedLogLine[])
      .map((log) => {
        const ts = log.timestamp ? `[${log.timestamp}]` : '';
        const level = log.level ? `[${log.level}]` : '';
        return `${ts} ${level} ${log.message}`.trim();
      })
      .join('\n');
  } else {
    // string[] format (raw logs)
    content = (logs as string[]).join('\n');
  }

  // Create Blob and trigger download
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    // Always revoke object URL to free memory
    URL.revokeObjectURL(url);
  }
}

/**
 * Get download filename for logs
 *
 * Utility function to generate filename without triggering download.
 * Useful for testing or showing preview.
 *
 * @param hostname - Worker hostname
 * @returns Generated filename
 */
export function getLogFilename(hostname: string): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, '-')
    .split('.')[0];

  return `worker-${hostname}-logs-${timestamp}.txt`;
}
