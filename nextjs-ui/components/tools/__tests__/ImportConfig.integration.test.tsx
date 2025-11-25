import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as toolsApi from '@/lib/api/tools';
import { ImportConfig } from '../ImportConfig';
import type { TestConnectionResponse } from '@/lib/api/tools';

// Mock the entire tools API module
jest.mock('@/lib/api/tools', () => ({
  testConnection: jest.fn(),
}));

const mockTestConnection = toolsApi.testConnection as jest.MockedFunction<typeof toolsApi.testConnection>;

/**
 * Integration tests for Test Connection feature (Story 31)
 *
 * Tests the full flow: ImportConfig → testConnection API → ConnectionTestResult display
 */

// Mock OpenAPI spec for testing
const mockSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Test API',
    version: '1.0.0',
  },
  servers: [
    {
      url: 'https://api.example.com',
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: {
          '200': {
            description: 'OK',
          },
        },
      },
    },
  },
};

describe('ImportConfig - Test Connection Integration', () => {
  let queryClient: QueryClient;
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    // Create a new QueryClient for each test to ensure isolation
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset mocks
    mockOnSubmit.mockClear();
    mockTestConnection.mockClear();
  });

  const renderWithQueryClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    );
  };

  describe('Test Connection Button Visibility (AC-1)', () => {
    it('does not show test connection button when auth type is "none"', () => {
      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      expect(screen.queryByRole('button', { name: /Test Connection/i })).not.toBeInTheDocument();
    });

    it('shows test connection button when auth type is "api_key"', () => {
      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'api_key' } });

      expect(screen.getByRole('button', { name: /Test Connection/i })).toBeInTheDocument();
    });

    it('shows test connection button when auth type is "bearer"', () => {
      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'bearer' } });

      expect(screen.getByRole('button', { name: /Test Connection/i })).toBeInTheDocument();
    });

    it('shows test connection button when auth type is "basic"', () => {
      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'basic' } });

      expect(screen.getByRole('button', { name: /Test Connection/i })).toBeInTheDocument();
    });

    it('shows test connection button when auth type is "oauth2"', () => {
      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'oauth2' } });

      expect(screen.getByRole('button', { name: /Test Connection/i })).toBeInTheDocument();
    });

    it('does not show test connection button when spec is not provided', () => {
      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={undefined} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'bearer' } });

      expect(screen.queryByRole('button', { name: /Test Connection/i })).not.toBeInTheDocument();
    });
  });

  describe('Test Connection - Successful Response (AC-3)', () => {
    it('displays success result with status code and response time', async () => {
      const successResponse: TestConnectionResponse = {
        success: true,
        status_code: 200,
        response_time_ms: 245,
        headers: {
          'content-type': 'application/json',
          'x-api-version': '1.0',
        },
        body: '{"status":"ok","version":"1.0.0"}',
        tested_endpoint: 'GET /api/health',
      };

      mockTestConnection.mockResolvedValueOnce(successResponse);

      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      // Select bearer auth and fill in required fields
      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'bearer' } });
      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });
      fireEvent.change(screen.getByLabelText(/Bearer Token/i), { target: { value: 'test-token-123' } });

      // Wait for form validation
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Click test connection button
      const testButton = screen.getByRole('button', { name: /Test Connection/i });

      await act(async () => {
        fireEvent.click(testButton);
      });

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/Connection successful!/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify success details
      expect(screen.getByText('200 OK')).toBeInTheDocument();
      expect(screen.getByText('245ms')).toBeInTheDocument();
      expect(screen.getByText(/GET \/api\/health/)).toBeInTheDocument();
    });

    it('displays collapsible response headers', async () => {
      const successResponse: TestConnectionResponse = {
        success: true,
        status_code: 200,
        response_time_ms: 100,
        headers: {
          'content-type': 'application/json',
          'x-custom-header': 'test-value',
        },
        tested_endpoint: 'GET /health',
      };

      mockTestConnection.mockResolvedValueOnce(successResponse);

      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'bearer' } });
      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });
      fireEvent.change(screen.getByLabelText(/Bearer Token/i), { target: { value: 'test-token' } });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const testButton = screen.getByRole('button', { name: /Test Connection/i });

      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Response Headers \(2\)/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('displays collapsible response body with JSON formatting', async () => {
      const successResponse: TestConnectionResponse = {
        success: true,
        status_code: 200,
        response_time_ms: 150,
        body: '{"status":"healthy","uptime":3600}',
        tested_endpoint: 'GET /health',
      };

      mockTestConnection.mockResolvedValueOnce(successResponse);

      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'api_key' } });
      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });
      fireEvent.change(screen.getByLabelText(/API Key Value/i), { target: { value: 'key-123' } });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const testButton = screen.getByRole('button', { name: /Test Connection/i });

      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Response Body')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Test Connection - Error Responses (AC-4)', () => {
    it('displays auth error with error badge and troubleshooting tip', async () => {
      const errorResponse: TestConnectionResponse = {
        success: false,
        error: 'Invalid API credentials',
        error_type: 'auth',
        status_code: 401,
        tested_endpoint: 'GET /api/health',
        response_time_ms: 0,
      };

      mockTestConnection.mockResolvedValueOnce(errorResponse);

      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'bearer' } });
      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });
      fireEvent.change(screen.getByLabelText(/Bearer Token/i), { target: { value: 'invalid-token' } });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const testButton = screen.getByRole('button', { name: /Test Connection/i });

      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText('Auth Error')).toBeInTheDocument();
      expect(screen.getByText('401 Unauthorized')).toBeInTheDocument();
      expect(screen.getByText(/Check your API credentials/i)).toBeInTheDocument();
    });

    it('displays network error with error badge and troubleshooting tip', async () => {
      const errorResponse: TestConnectionResponse = {
        success: false,
        error: 'Connection refused: ECONNREFUSED',
        error_type: 'network',
        tested_endpoint: 'GET /health',
        response_time_ms: 0,
      };

      mockTestConnection.mockResolvedValueOnce(errorResponse);

      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'basic' } });
      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://unreachable.example.com' } });
      fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'user' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'pass' } });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const testButton = screen.getByRole('button', { name: /Test Connection/i });

      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Network Error')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText(/Verify the base URL is correct/i)).toBeInTheDocument();
    });

    it('displays timeout error with error badge', async () => {
      const errorResponse: TestConnectionResponse = {
        success: false,
        error: 'Request timeout after 10s',
        error_type: 'timeout',
        tested_endpoint: 'GET /slow',
        response_time_ms: 0,
      };

      mockTestConnection.mockResolvedValueOnce(errorResponse);

      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'bearer' } });
      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://slow.example.com' } });
      fireEvent.change(screen.getByLabelText(/Bearer Token/i), { target: { value: 'token' } });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const testButton = screen.getByRole('button', { name: /Test Connection/i });

      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Timeout')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText(/The API took too long to respond/i)).toBeInTheDocument();
    });

    it('displays server error (500) with error badge', async () => {
      const errorResponse: TestConnectionResponse = {
        success: false,
        error: 'Internal server error',
        error_type: 'server',
        status_code: 500,
        tested_endpoint: 'GET /health',
        response_time_ms: 0,
      };

      mockTestConnection.mockResolvedValueOnce(errorResponse);

      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'api_key' } });
      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });
      fireEvent.change(screen.getByLabelText(/API Key Value/i), { target: { value: 'key' } });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const testButton = screen.getByRole('button', { name: /Test Connection/i });

      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Server Error')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText('500 Internal Server Error')).toBeInTheDocument();
    });

    it('displays not found error (404)', async () => {
      const errorResponse: TestConnectionResponse = {
        success: false,
        error: 'Endpoint not found',
        error_type: 'not_found',
        status_code: 404,
        tested_endpoint: 'GET /missing',
        response_time_ms: 0,
      };

      mockTestConnection.mockResolvedValueOnce(errorResponse);

      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'bearer' } });
      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });
      fireEvent.change(screen.getByLabelText(/Bearer Token/i), { target: { value: 'token' } });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const testButton = screen.getByRole('button', { name: /Test Connection/i });

      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Not Found')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText('404 Not Found')).toBeInTheDocument();
    });

    it('displays retry button on error', async () => {
      const errorResponse: TestConnectionResponse = {
        success: false,
        error: 'Connection failed',
        error_type: 'network',
        response_time_ms: 0,
      };

      mockTestConnection.mockResolvedValueOnce(errorResponse);

      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'bearer' } });
      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });
      fireEvent.change(screen.getByLabelText(/Bearer Token/i), { target: { value: 'token' } });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const testButton = screen.getByRole('button', { name: /Test Connection/i });

      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Loading State (AC-2)', () => {
    it('shows loading spinner and "Testing..." text during API call', async () => {
      // Delay the response to test loading state
      mockTestConnection.mockImplementation(
        () => new Promise((resolve) =>
          setTimeout(() =>
            resolve({
              success: true,
              status_code: 200,
              response_time_ms: 100,
            }),
            200
          )
        )
      );

      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'bearer' } });
      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });
      fireEvent.change(screen.getByLabelText(/Bearer Token/i), { target: { value: 'token' } });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const testButton = screen.getByRole('button', { name: /Test Connection/i });

      await act(async () => {
        fireEvent.click(testButton);
      });

      // Check loading state
      expect(screen.getByRole('button', { name: /Testing.../i })).toBeInTheDocument();
      expect(testButton).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Test Connection/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('disables test button during API call', async () => {
      mockTestConnection.mockImplementation(
        () => new Promise((resolve) =>
          setTimeout(() =>
            resolve({
              success: true,
              status_code: 200,
              response_time_ms: 100,
            }),
            200
          )
        )
      );

      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'bearer' } });
      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });
      fireEvent.change(screen.getByLabelText(/Bearer Token/i), { target: { value: 'token' } });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const testButton = screen.getByRole('button', { name: /Test Connection/i });

      await act(async () => {
        fireEvent.click(testButton);
      });

      // Button should be disabled during loading
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Testing.../i })).toBeDisabled();
      }, { timeout: 1000 });
    });
  });

  describe('Form Validation (AC-6)', () => {
    it('disables test button when form is invalid (missing base URL)', () => {
      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'bearer' } });
      fireEvent.change(screen.getByLabelText(/Bearer Token/i), { target: { value: 'token' } });

      const testButton = screen.getByRole('button', { name: /Test Connection/i });
      expect(testButton).toBeDisabled();
    });

    it('enables test button when all required fields are filled', async () => {
      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'bearer' } });
      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });
      fireEvent.change(screen.getByLabelText(/Bearer Token/i), { target: { value: 'token' } });

      await waitFor(() => {
        const testButton = screen.getByRole('button', { name: /Test Connection/i });
        expect(testButton).not.toBeDisabled();
      });
    });
  });

  describe('Retry Functionality', () => {
    it('retries API call when retry button is clicked', async () => {
      const errorResponse: TestConnectionResponse = {
        success: false,
        error: 'Network error',
        error_type: 'network',
        response_time_ms: 0,
      };

      // Mock two error responses
      mockTestConnection.mockResolvedValue(errorResponse);

      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'bearer' } });
      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });
      fireEvent.change(screen.getByLabelText(/Bearer Token/i), { target: { value: 'token' } });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // First attempt
      const testButton = screen.getByRole('button', { name: /Test Connection/i });

      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(mockTestConnection).toHaveBeenCalledTimes(1);

      // Retry
      const retryButton = screen.getByRole('button', { name: /Retry/i });

      await act(async () => {
        fireEvent.click(retryButton);
      });

      await waitFor(() => {
        expect(mockTestConnection).toHaveBeenCalledTimes(2);
      }, { timeout: 3000 });
    });
  });

  describe('Close Functionality', () => {
    it('closes success result when close button is clicked', async () => {
      const successResponse: TestConnectionResponse = {
        success: true,
        status_code: 200,
        response_time_ms: 100,
        tested_endpoint: 'GET /health',
      };

      mockTestConnection.mockResolvedValueOnce(successResponse);

      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'bearer' } });
      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });
      fireEvent.change(screen.getByLabelText(/Bearer Token/i), { target: { value: 'token' } });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const testButton = screen.getByRole('button', { name: /Test Connection/i });

      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Connection successful!/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Close result
      const closeButtons = screen.getAllByRole('button', { name: '' });
      const closeButton = closeButtons[0]; // First close button (X icon)

      await act(async () => {
        fireEvent.click(closeButton);
      });

      await waitFor(() => {
        expect(screen.queryByText(/Connection successful!/i)).not.toBeInTheDocument();
      });
    });

    it('closes error result when close button is clicked', async () => {
      const errorResponse: TestConnectionResponse = {
        success: false,
        error: 'Auth error',
        error_type: 'auth',
        response_time_ms: 0,
      };

      mockTestConnection.mockResolvedValueOnce(errorResponse);

      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'bearer' } });
      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });
      fireEvent.change(screen.getByLabelText(/Bearer Token/i), { target: { value: 'token' } });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const testButton = screen.getByRole('button', { name: /Test Connection/i });

      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Close result
      const closeButton = screen.getByRole('button', { name: /Close/i });

      await act(async () => {
        fireEvent.click(closeButton);
      });

      await waitFor(() => {
        expect(screen.queryByText(/Connection failed/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Import Flow Not Blocked (AC-10)', () => {
    it('allows form submission even after failed test', async () => {
      const errorResponse: TestConnectionResponse = {
        success: false,
        error: 'Network error',
        error_type: 'network',
        response_time_ms: 0,
      };

      mockTestConnection.mockResolvedValueOnce(errorResponse);

      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'bearer' } });
      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });
      fireEvent.change(screen.getByLabelText(/Bearer Token/i), { target: { value: 'token' } });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Test connection (will fail)
      const testButton = screen.getByRole('button', { name: /Test Connection/i });

      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Import should still be possible
      const importButton = screen.getByRole('button', { name: /Import Tools/i });

      await act(async () => {
        fireEvent.click(importButton);
      });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          namePrefix: undefined,
          baseUrl: 'https://api.example.com',
          authConfig: {
            type: 'bearer',
            bearer_token: 'token',
          },
        });
      });
    });

    it('allows form submission without testing connection', async () => {
      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={mockSpec} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'bearer' } });
      fireEvent.change(screen.getByLabelText(/Base URL/i), { target: { value: 'https://api.example.com' } });
      fireEvent.change(screen.getByLabelText(/Bearer Token/i), { target: { value: 'token' } });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Import directly without testing
      const importButton = screen.getByRole('button', { name: /Import Tools/i });

      await act(async () => {
        fireEvent.click(importButton);
      });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          namePrefix: undefined,
          baseUrl: 'https://api.example.com',
          authConfig: {
            type: 'bearer',
            bearer_token: 'token',
          },
        });
      });
    });
  });

  describe('No Spec Handling', () => {
    it('hides test button when spec is not provided', () => {
      renderWithQueryClient(
        <ImportConfig onSubmit={mockOnSubmit} spec={undefined} />
      );

      const select = screen.getByLabelText(/Authentication Type/i);
      fireEvent.change(select, { target: { value: 'bearer' } });

      // Test button should not be visible without spec
      expect(screen.queryByRole('button', { name: /Test Connection/i })).not.toBeInTheDocument();
    });
  });
});
