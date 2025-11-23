/**
 * Unit tests for downloadLogs utility
 *
 * Story: nextjs-story-19-workers-logs-viewer
 * Task 11: Write unit tests for downloadLogs.ts (filename generation, content format)
 */

import { downloadLogs, getLogFilename } from '@/lib/utils/downloadLogs';
import type { ParsedLogLine } from '@/lib/utils/logParser';

describe('downloadLogs', () => {
  let createElementSpy: jest.SpyInstance;
  let createObjectURLSpy: jest.Mock;
  let revokeObjectURLSpy: jest.Mock;
  let mockAnchorElement: {
    href: string;
    download: string;
    click: jest.Mock;
    style: { display: string };
  };

  beforeEach(() => {
    // Mock anchor element
    mockAnchorElement = {
      href: '',
      download: '',
      click: jest.fn(),
      style: { display: '' },
    };

    // Mock URL API (not available in Jest DOM environment)
    createObjectURLSpy = jest.fn().mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = jest.fn();
    global.URL.createObjectURL = createObjectURLSpy;
    global.URL.revokeObjectURL = revokeObjectURLSpy;

    // Mock Blob constructor
    global.Blob = jest.fn((parts, options) => ({
      size: parts[0].length,
      type: options?.type || '',
      parts,
    })) as any;

    // Mock document.createElement
    createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockAnchorElement as any);

    // Mock appendChild and removeChild
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('downloadLogs with ParsedLogLine[]', () => {
    it('creates correct filename format', () => {
      const hostname = 'ai-agents-worker-abc123';
      const logs: ParsedLogLine[] = [
        {
          timestamp: '2025-01-21T14:30:45.123Z',
          level: 'INFO',
          message: 'Test message',
          raw: 'INFO: Test message',
        },
      ];

      downloadLogs(hostname, logs);

      expect(mockAnchorElement.download).toMatch(
        /^worker-ai-agents-worker-abc123-logs-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.txt$/
      );
    });

    it('formats log content correctly with timestamp and level', () => {
      const hostname = 'test-worker';
      const logs: ParsedLogLine[] = [
        {
          timestamp: '2025-01-21T14:30:45.123Z',
          level: 'ERROR',
          message: 'Connection failed',
          raw: 'ERROR: Connection failed',
        },
        {
          timestamp: '2025-01-21T14:30:46.456Z',
          level: 'INFO',
          message: 'Retrying connection',
          raw: 'INFO: Retrying connection',
        },
      ];

      downloadLogs(hostname, logs);

      const blobContent = (Blob as any).mock.calls[0][0][0];
      expect(blobContent).toContain('[2025-01-21T14:30:45.123Z] [ERROR] Connection failed');
      expect(blobContent).toContain('[2025-01-21T14:30:46.456Z] [INFO] Retrying connection');
    });

    it('handles logs without timestamps', () => {
      const hostname = 'test-worker';
      const logs: ParsedLogLine[] = [
        {
          timestamp: '',
          level: 'WARN',
          message: 'No timestamp log',
          raw: 'WARN: No timestamp log',
        },
      ];

      downloadLogs(hostname, logs);

      const blobContent = (Blob as any).mock.calls[0][0][0];
      expect(blobContent).toBe('[WARN] No timestamp log');
    });

    it('creates Blob with correct MIME type', () => {
      const hostname = 'test-worker';
      const logs: ParsedLogLine[] = [
        {
          timestamp: '',
          level: 'INFO',
          message: 'Test',
          raw: 'INFO: Test',
        },
      ];

      downloadLogs(hostname, logs);

      const blobOptions = (Blob as any).mock.calls[0][1];
      expect(blobOptions.type).toBe('text/plain;charset=utf-8');
    });

    it('triggers download and revokes object URL', () => {
      const hostname = 'test-worker';
      const logs: ParsedLogLine[] = [
        {
          timestamp: '',
          level: 'INFO',
          message: 'Test',
          raw: 'INFO: Test',
        },
      ];

      downloadLogs(hostname, logs);

      expect(mockAnchorElement.click).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });

    it('handles empty logs array gracefully', () => {
      const hostname = 'test-worker';
      const logs: ParsedLogLine[] = [];

      downloadLogs(hostname, logs);

      const blobContent = (Blob as any).mock.calls[0][0][0];
      expect(blobContent).toBe('');
    });
  });

  describe('downloadLogs with string[]', () => {
    it('formats raw string logs correctly', () => {
      const hostname = 'test-worker';
      const logs = [
        'ERROR: Connection failed',
        'INFO: Retrying connection',
        'DEBUG: Verbose output',
      ];

      downloadLogs(hostname, logs);

      const blobContent = (Blob as any).mock.calls[0][0][0];
      expect(blobContent).toBe(
        'ERROR: Connection failed\nINFO: Retrying connection\nDEBUG: Verbose output'
      );
    });

    it('preserves original formatting for string logs', () => {
      const hostname = 'test-worker';
      const logs = [
        'Plain text line 1',
        '  Indented line',
        'Line with\ttab',
      ];

      downloadLogs(hostname, logs);

      const blobContent = (Blob as any).mock.calls[0][0][0];
      expect(blobContent).toContain('  Indented line');
      expect(blobContent).toContain('Line with\ttab');
    });
  });

  describe('getLogFilename', () => {
    it('generates filename with correct format', () => {
      const hostname = 'test-worker-123';
      const filename = getLogFilename(hostname);

      expect(filename).toMatch(
        /^worker-test-worker-123-logs-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.txt$/
      );
    });

    it('replaces colons with hyphens in timestamp', () => {
      const hostname = 'test';
      const filename = getLogFilename(hostname);

      expect(filename).not.toContain(':');
      expect(filename).toMatch(/\d{2}-\d{2}-\d{2}/); // HH-MM-SS format
    });

    it('includes hostname in filename', () => {
      const hostname = 'my-custom-worker';
      const filename = getLogFilename(hostname);

      expect(filename).toContain('my-custom-worker');
    });

    it('ends with .txt extension', () => {
      const hostname = 'test';
      const filename = getLogFilename(hostname);

      expect(filename).toMatch(/\.txt$/);
    });
  });

  describe('Edge cases', () => {
    it('handles hostname with special characters', () => {
      const hostname = 'worker-with_special.chars-123';
      const logs: ParsedLogLine[] = [];

      downloadLogs(hostname, logs);

      expect(mockAnchorElement.download).toContain('worker-with_special.chars-123');
    });

    it('handles very long log messages', () => {
      const hostname = 'test';
      const longMessage = 'A'.repeat(100000);
      const logs: ParsedLogLine[] = [
        {
          timestamp: '',
          level: 'INFO',
          message: longMessage,
          raw: `INFO: ${longMessage}`,
        },
      ];

      downloadLogs(hostname, logs);

      const blobContent = (Blob as any).mock.calls[0][0][0];
      expect(blobContent.length).toBeGreaterThan(100000);
    });

    it('handles logs with newlines in messages', () => {
      const hostname = 'test';
      const logs: ParsedLogLine[] = [
        {
          timestamp: '',
          level: 'ERROR',
          message: 'Multi\nline\nmessage',
          raw: 'ERROR: Multi\nline\nmessage',
        },
      ];

      downloadLogs(hostname, logs);

      const blobContent = (Blob as any).mock.calls[0][0][0];
      expect(blobContent).toContain('Multi\nline\nmessage');
    });

    it('handles Unicode and emoji in logs', () => {
      const hostname = 'test';
      const logs: ParsedLogLine[] = [
        {
          timestamp: '',
          level: 'INFO',
          message: 'Message with 你好 and 🚀 emoji',
          raw: 'INFO: Message with 你好 and 🚀 emoji',
        },
      ];

      downloadLogs(hostname, logs);

      const blobContent = (Blob as any).mock.calls[0][0][0];
      expect(blobContent).toContain('你好');
      expect(blobContent).toContain('🚀');
    });
  });
});
