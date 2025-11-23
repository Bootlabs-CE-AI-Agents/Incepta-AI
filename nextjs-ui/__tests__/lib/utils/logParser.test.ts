/**
 * Unit tests for logParser utility
 *
 * Story: nextjs-story-19-workers-logs-viewer
 * Task 10: Write unit tests for logParser.ts (level detection, color mapping)
 */

import {
  parseLogLine,
  getLogLevelColor,
  formatLogTimestamp,
} from '@/lib/utils/logParser';

describe('logParser', () => {
  describe('parseLogLine', () => {
    it('parses log line with ISO timestamp and level', () => {
      const line = '2025-01-21T14:30:45.123Z INFO: Application started';
      const result = parseLogLine(line);

      expect(result).toEqual({
        timestamp: '2025-01-21T14:30:45.123Z',
        level: 'INFO',
        message: 'Application started',
        raw: line,
      });
    });

    it('parses log line with space-separated timestamp and level', () => {
      const line = '2025-01-21 14:30:45,123 ERROR: Connection failed';
      const result = parseLogLine(line);

      expect(result).toEqual({
        timestamp: '2025-01-21 14:30:45,123',
        level: 'ERROR',
        message: 'Connection failed',
        raw: line,
      });
    });

    it('parses log line with bracketed level', () => {
      const line = '2025-01-21T14:30:45.123Z [WARN] Low disk space';
      const result = parseLogLine(line);

      expect(result).toEqual({
        timestamp: '2025-01-21T14:30:45.123Z',
        level: 'WARN',
        message: 'Low disk space',
        raw: line,
      });
    });

    it('parses log line with level only (no timestamp)', () => {
      const line = 'DEBUG: Verbose logging enabled';
      const result = parseLogLine(line);

      expect(result).toEqual({
        timestamp: '',
        level: 'DEBUG',
        message: 'Verbose logging enabled',
        raw: line,
      });
    });

    it('detects level keyword in message (no structured format)', () => {
      const line = 'Something went wrong: ERROR occurred in module X';
      const result = parseLogLine(line);

      expect(result.level).toBe('ERROR');
      expect(result.message).toBe(line);
      expect(result.raw).toBe(line);
    });

    it('defaults to INFO for unrecognized format', () => {
      const line = 'Plain text message with no level';
      const result = parseLogLine(line);

      expect(result).toEqual({
        timestamp: '',
        level: 'INFO',
        message: line,
        raw: line,
      });
    });

    it('normalizes level to uppercase', () => {
      const line = 'error: Something failed';
      const result = parseLogLine(line);

      expect(result.level).toBe('ERROR');
    });

    it('handles multi-line messages', () => {
      const line = 'ERROR: Traceback (most recent call last):\n  File "app.py", line 42';
      const result = parseLogLine(line);

      expect(result.level).toBe('ERROR');
      expect(result.message).toContain('Traceback');
      expect(result.raw).toBe(line);
    });
  });

  describe('getLogLevelColor', () => {
    it('returns text-red-600 for ERROR', () => {
      expect(getLogLevelColor('ERROR')).toBe('text-red-600');
    });

    it('returns text-yellow-600 for WARN', () => {
      expect(getLogLevelColor('WARN')).toBe('text-yellow-600');
    });

    it('returns text-yellow-600 for WARNING', () => {
      expect(getLogLevelColor('WARNING')).toBe('text-yellow-600');
    });

    it('returns text-blue-600 for INFO', () => {
      expect(getLogLevelColor('INFO')).toBe('text-blue-600');
    });

    it('returns text-gray-500 for DEBUG', () => {
      expect(getLogLevelColor('DEBUG')).toBe('text-gray-500');
    });

    it('returns text-white for unknown level', () => {
      expect(getLogLevelColor('UNKNOWN')).toBe('text-white');
      expect(getLogLevelColor('CUSTOM')).toBe('text-white');
    });

    it('is case-insensitive', () => {
      expect(getLogLevelColor('error')).toBe('text-red-600');
      expect(getLogLevelColor('Info')).toBe('text-blue-600');
    });
  });

  describe('formatLogTimestamp', () => {
    it('formats ISO timestamp to HH:mm:ss', () => {
      const timestamp = '2025-01-21T14:30:45.123Z';
      const result = formatLogTimestamp(timestamp);

      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it('extracts HH:mm:ss from formatted string', () => {
      const timestamp = '2025-01-21 14:30:45,123';
      const result = formatLogTimestamp(timestamp);

      expect(result).toBe('14:30:45');
    });

    it('returns empty string for empty input', () => {
      expect(formatLogTimestamp('')).toBe('');
    });

    it('returns original string if no time pattern found', () => {
      const timestamp = 'Not a timestamp';
      const result = formatLogTimestamp(timestamp);

      expect(result).toBe('Not a timestamp');
    });

    it('handles timestamps with milliseconds', () => {
      const timestamp = '2025-01-21T14:30:45.999Z';
      const result = formatLogTimestamp(timestamp);

      // Time may vary due to timezone conversion, just check format
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Edge cases', () => {
    it('handles empty string input', () => {
      const result = parseLogLine('');
      expect(result.raw).toBe('');
      expect(result.level).toBe('INFO'); // Default
    });

    it('handles very long log lines', () => {
      const longMessage = 'A'.repeat(10000);
      const line = `ERROR: ${longMessage}`;
      const result = parseLogLine(line);

      expect(result.level).toBe('ERROR');
      expect(result.message).toBe(longMessage);
    });

    it('handles special characters in messages', () => {
      const line = 'INFO: Message with <html> & "quotes" \' and \\ backslashes';
      const result = parseLogLine(line);

      expect(result.message).toContain('<html>');
      expect(result.message).toContain('"quotes"');
      expect(result.message).toContain('\\');
    });

    it('handles Unicode characters', () => {
      const line = 'INFO: 你好世界 🌍 Emoji test';
      const result = parseLogLine(line);

      expect(result.message).toContain('你好世界');
      expect(result.message).toContain('🌍');
    });
  });
});
