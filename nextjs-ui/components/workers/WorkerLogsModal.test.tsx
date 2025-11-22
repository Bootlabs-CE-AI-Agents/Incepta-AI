/**
 * WorkerLogsModal Component Tests
 *
 * Tests for worker logs viewer modal with filtering, search, auto-refresh, and download.
 * Covers: rendering, loading/error states, log parsing, filtering, search, auto-scroll, download.
 *
 * Story 3.3: Worker Logs Viewer (P1)
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkerLogsModal } from './WorkerLogsModal';
import { workersApi } from '@/lib/api/workers';

// Mock the workers API module
jest.mock('@/lib/api/workers', () => ({
  workersApi: {
    getWorkerLogs: jest.fn(),
    listWorkers: jest.fn(),
    restartWorker: jest.fn(),
  },
}));

const mockGetWorkerLogs = workersApi.getWorkerLogs as jest.MockedFunction<typeof workersApi.getWorkerLogs>;

// Mock data
const mockLogsResponse = {
  hostname: 'worker-1',
  logs: [
    '2025-01-21 14:30:45,123 ERROR: Failed to connect to database',
    '2025-01-21 14:30:46,234 WARNING: Retrying connection in 5s',
    '2025-01-21 14:30:51,345 INFO: Connection established successfully',
    '2025-01-21 14:30:52,456 DEBUG: Loaded 42 records from cache',
    '2025-01-21 14:30:53,567 INFO: Processing task queue',
    'Invalid log line without proper format',
  ],
};

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
}

describe('WorkerLogsModal', () => {
  const defaultProps = {
    hostname: 'worker-1.example.com',
    isOpen: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful logs fetch by default
    mockGetWorkerLogs.mockResolvedValue(mockLogsResponse);
    // Mock scrollIntoView which is not available in jsdom
    Element.prototype.scrollIntoView = jest.fn();
  });

  describe('Rendering', () => {
    it('should render modal when isOpen is true', async () => {
      render(<WorkerLogsModal {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Worker Logs:/i)).toBeInTheDocument();
        expect(screen.getByText(defaultProps.hostname)).toBeInTheDocument();
      });
    });

    it('should not render modal when isOpen is false', () => {
      render(<WorkerLogsModal {...defaultProps} isOpen={false} />, { wrapper: createWrapper() });

      expect(screen.queryByText(/Worker Logs:/i)).not.toBeInTheDocument();
    });

    it('should render all filter controls', async () => {
      render(<WorkerLogsModal {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/Level:/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Lines:/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Refresh:/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Search logs/i)).toBeInTheDocument();
        expect(screen.getByText(/Download/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Auto-scroll/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator while fetching logs', () => {
      mockGetWorkerLogs.mockReturnValue(new Promise(() => {})); // Never resolves

      render(<WorkerLogsModal {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText(/Loading logs/i)).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when fetch fails', async () => {
      mockGetWorkerLogs.mockRejectedValue(new Error('Network error'));

      render(<WorkerLogsModal {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Failed to load logs/i)).toBeInTheDocument();
      });
    });
  });

  describe('Log Display', () => {
    it('should display parsed logs with correct formatting', async () => {
      render(<WorkerLogsModal {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Failed to connect to database/i)).toBeInTheDocument();
        expect(screen.getByText(/Retrying connection in 5s/i)).toBeInTheDocument();
        expect(screen.getByText(/Connection established successfully/i)).toBeInTheDocument();
      });
    });

    it('should display log level badges', async () => {
      render(<WorkerLogsModal {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('ERROR')).toBeInTheDocument();
        expect(screen.getByText('WARNING')).toBeInTheDocument();
        expect(screen.getAllByText('INFO')).toHaveLength(2);
        expect(screen.getByText('DEBUG')).toBeInTheDocument();
      });
    });

    it('should handle unparseable log lines gracefully', async () => {
      render(<WorkerLogsModal {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Invalid log line without proper format/i)).toBeInTheDocument();
      });
    });

    it('should show "No logs found" when logs array is empty', async () => {
      mockGetWorkerLogs.mockResolvedValue({ hostname: 'worker-1', logs: [] });

      render(<WorkerLogsModal {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/No logs found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Log Level Filtering', () => {
    it('should filter logs by ERROR level', async () => {
      const user = userEvent.setup();
      render(<WorkerLogsModal {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Failed to connect to database/i)).toBeInTheDocument();
      });

      const levelSelect = screen.getByLabelText(/Level:/i);
      await user.selectOptions(levelSelect, 'ERROR');

      await waitFor(() => {
        expect(screen.getByText(/Failed to connect to database/i)).toBeInTheDocument();
        expect(screen.queryByText(/Retrying connection in 5s/i)).not.toBeInTheDocument();
      });
    });

    it('should show all logs when level is ALL', async () => {
      const user = userEvent.setup();
      render(<WorkerLogsModal {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Failed to connect to database/i)).toBeInTheDocument();
      });

      const levelSelect = screen.getByLabelText(/Level:/i);
      await user.selectOptions(levelSelect, 'ALL');

      await waitFor(() => {
        expect(screen.getByText(/Failed to connect to database/i)).toBeInTheDocument();
        expect(screen.getByText(/Retrying connection in 5s/i)).toBeInTheDocument();
        expect(screen.getByText(/Connection established successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search Filtering', () => {
    it('should filter logs by search query (case-insensitive)', async () => {
      const user = userEvent.setup();
      render(<WorkerLogsModal {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Failed to connect to database/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search logs/i);
      await user.type(searchInput, 'connection');

      await waitFor(() => {
        expect(screen.getByText(/Failed to connect to database/i)).toBeInTheDocument();
        expect(screen.getByText(/Retrying connection in 5s/i)).toBeInTheDocument();
        expect(screen.queryByText(/Loaded 42 records from cache/i)).not.toBeInTheDocument();
      });
    });

    it('should show "No logs found" when search has no matches', async () => {
      const user = userEvent.setup();
      render(<WorkerLogsModal {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Failed to connect to database/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search logs/i);
      await user.type(searchInput, 'nonexistent-text-xyz');

      await waitFor(() => {
        expect(screen.getByText(/No logs found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Line Count Selection', () => {
    it('should fetch 50 lines when selected', async () => {
      const user = userEvent.setup();
      render(<WorkerLogsModal {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockGetWorkerLogs).toHaveBeenCalledWith(defaultProps.hostname, 100);
      });

      const lineCountSelect = screen.getByLabelText(/Lines:/i);
      await user.selectOptions(lineCountSelect, '50');

      await waitFor(() => {
        expect(mockGetWorkerLogs).toHaveBeenCalledWith(defaultProps.hostname, 50);
      });
    });
  });

  describe('Auto-Scroll Toggle', () => {
    it('should have auto-scroll enabled by default', async () => {
      render(<WorkerLogsModal {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        const autoScrollCheckbox = screen.getByLabelText(/Auto-scroll/i);
        expect(autoScrollCheckbox).toBeChecked();
      });
    });

    it('should toggle auto-scroll when checkbox clicked', async () => {
      const user = userEvent.setup();
      render(<WorkerLogsModal {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        const autoScrollCheckbox = screen.getByLabelText(/Auto-scroll/i);
        expect(autoScrollCheckbox).toBeChecked();
      });

      const autoScrollCheckbox = screen.getByLabelText(/Auto-scroll/i);
      await user.click(autoScrollCheckbox);

      expect(autoScrollCheckbox).not.toBeChecked();
    });
  });

  describe('Footer Stats', () => {
    it('should display correct log count', async () => {
      render(<WorkerLogsModal {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Showing 6 of 6 lines/i)).toBeInTheDocument();
      });
    });

    it('should display filtered count when filters applied', async () => {
      const user = userEvent.setup();
      render(<WorkerLogsModal {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Showing 6 of 6 lines/i)).toBeInTheDocument();
      });

      const levelSelect = screen.getByLabelText(/Level:/i);
      await user.selectOptions(levelSelect, 'ERROR');

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 6 lines/i)).toBeInTheDocument();
      });
    });
  });

  describe('Log Parsing', () => {
    it('should parse standard log format correctly', async () => {
      render(<WorkerLogsModal {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Verify timestamp is extracted
        expect(screen.getByText(/\[2025-01-21 14:30:45,123\]/i)).toBeInTheDocument();
        // Verify level is extracted
        expect(screen.getByText('ERROR')).toBeInTheDocument();
        // Verify message is extracted
        expect(screen.getByText(/Failed to connect to database/i)).toBeInTheDocument();
      });
    });
  });
});
