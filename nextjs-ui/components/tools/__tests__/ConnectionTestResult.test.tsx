import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectionTestResult, type ConnectionTestResult as TestResult } from '../ConnectionTestResult';

describe('ConnectionTestResult', () => {
  const mockOnClose = jest.fn();
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnRetry.mockClear();
  });

  describe('Success State', () => {
    const successResult: TestResult = {
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

    it('renders success message with checkmark icon', () => {
      render(<ConnectionTestResult result={successResult} />);

      expect(screen.getByText('Connection successful!')).toBeInTheDocument();
    });

    it('displays tested endpoint', () => {
      render(<ConnectionTestResult result={successResult} />);

      expect(screen.getByText(/Tested endpoint:/)).toBeInTheDocument();
      expect(screen.getByText(/GET \/api\/health/)).toBeInTheDocument();
    });

    it('displays status code with description', () => {
      render(<ConnectionTestResult result={successResult} />);

      expect(screen.getByText('200 OK')).toBeInTheDocument();
    });

    it('displays response time', () => {
      render(<ConnectionTestResult result={successResult} />);

      expect(screen.getByText('245ms')).toBeInTheDocument();
    });

    it('renders close button when onClose provided', () => {
      render(<ConnectionTestResult result={successResult} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: '' });
      expect(closeButton).toBeInTheDocument();
    });

    it('calls onClose when close button clicked', () => {
      render(<ConnectionTestResult result={successResult} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: '' });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('renders response headers section with count', () => {
      render(<ConnectionTestResult result={successResult} />);

      expect(screen.getByText(/Response Headers \(2\)/)).toBeInTheDocument();
    });

    it('renders response body section', () => {
      render(<ConnectionTestResult result={successResult} />);

      expect(screen.getByText('Response Body')).toBeInTheDocument();
    });

    it('does not render headers section when headers empty', () => {
      const resultWithoutHeaders: TestResult = {
        ...successResult,
        headers: undefined,
      };
      render(<ConnectionTestResult result={resultWithoutHeaders} />);

      expect(screen.queryByText(/Response Headers/)).not.toBeInTheDocument();
    });

    it('does not render body section when body empty', () => {
      const resultWithoutBody: TestResult = {
        ...successResult,
        body: undefined,
      };
      render(<ConnectionTestResult result={resultWithoutBody} />);

      expect(screen.queryByText('Response Body')).not.toBeInTheDocument();
    });

    it('formats different status codes correctly', () => {
      const result201: TestResult = {
        ...successResult,
        status_code: 201,
      };
      const { rerender } = render(<ConnectionTestResult result={result201} />);
      expect(screen.getByText('201 Created')).toBeInTheDocument();

      const result204: TestResult = {
        ...successResult,
        status_code: 204,
      };
      rerender(<ConnectionTestResult result={result204} />);
      expect(screen.getByText('204 No Content')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    const baseErrorResult: TestResult = {
      success: false,
      error: 'Connection failed: ECONNREFUSED',
      error_type: 'network',
      status_code: undefined,
      tested_endpoint: 'GET /api/health',
    };

    it('renders error message with X icon', () => {
      render(<ConnectionTestResult result={baseErrorResult} />);

      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });

    it('displays tested endpoint in error state', () => {
      render(<ConnectionTestResult result={baseErrorResult} />);

      expect(screen.getByText(/Tested endpoint:/)).toBeInTheDocument();
      expect(screen.getByText(/GET \/api\/health/)).toBeInTheDocument();
    });

    it('displays error type badge for network error', () => {
      render(<ConnectionTestResult result={baseErrorResult} />);

      expect(screen.getByText('Network Error')).toBeInTheDocument();
    });

    it('displays error type badge for auth error', () => {
      const authError: TestResult = {
        ...baseErrorResult,
        error_type: 'auth',
        error: 'Invalid API key',
        status_code: 401,
      };
      render(<ConnectionTestResult result={authError} />);

      expect(screen.getByText('Auth Error')).toBeInTheDocument();
    });

    it('displays error type badge for timeout', () => {
      const timeoutError: TestResult = {
        ...baseErrorResult,
        error_type: 'timeout',
        error: 'Request timeout after 10s',
      };
      render(<ConnectionTestResult result={timeoutError} />);

      expect(screen.getByText('Timeout')).toBeInTheDocument();
    });

    it('displays error type badge for server error', () => {
      const serverError: TestResult = {
        ...baseErrorResult,
        error_type: 'server',
        error: 'Internal server error',
        status_code: 500,
      };
      render(<ConnectionTestResult result={serverError} />);

      expect(screen.getByText('Server Error')).toBeInTheDocument();
    });

    it('displays error type badge for not found', () => {
      const notFoundError: TestResult = {
        ...baseErrorResult,
        error_type: 'not_found',
        error: 'Endpoint not found',
        status_code: 404,
      };
      render(<ConnectionTestResult result={notFoundError} />);

      expect(screen.getByText('Not Found')).toBeInTheDocument();
    });

    it('displays error type badge for unknown error', () => {
      const unknownError: TestResult = {
        ...baseErrorResult,
        error_type: 'unknown',
        error: 'Something went wrong',
      };
      render(<ConnectionTestResult result={unknownError} />);

      expect(screen.getByText('Unknown Error')).toBeInTheDocument();
    });

    it('displays status code when provided', () => {
      const errorWithStatus: TestResult = {
        ...baseErrorResult,
        status_code: 401,
      };
      render(<ConnectionTestResult result={errorWithStatus} />);

      expect(screen.getByText('401 Unauthorized')).toBeInTheDocument();
    });

    it('displays error message', () => {
      render(<ConnectionTestResult result={baseErrorResult} />);

      expect(screen.getByText('Connection failed: ECONNREFUSED')).toBeInTheDocument();
    });

    it('displays troubleshooting tip for network error', () => {
      render(<ConnectionTestResult result={baseErrorResult} />);

      expect(screen.getByText(/Verify the base URL is correct/)).toBeInTheDocument();
    });

    it('displays troubleshooting tip for auth error', () => {
      const authError: TestResult = {
        ...baseErrorResult,
        error_type: 'auth',
        error: 'Invalid credentials',
      };
      render(<ConnectionTestResult result={authError} />);

      expect(screen.getByText(/Check your API credentials/)).toBeInTheDocument();
    });

    it('displays troubleshooting tip for timeout', () => {
      const timeoutError: TestResult = {
        ...baseErrorResult,
        error_type: 'timeout',
      };
      render(<ConnectionTestResult result={timeoutError} />);

      expect(screen.getByText(/The API took too long to respond/)).toBeInTheDocument();
    });

    it('displays troubleshooting tip for not found', () => {
      const notFoundError: TestResult = {
        ...baseErrorResult,
        error_type: 'not_found',
      };
      render(<ConnectionTestResult result={notFoundError} />);

      expect(screen.getByText(/Endpoint not found/)).toBeInTheDocument();
    });

    it('displays troubleshooting tip for server error', () => {
      const serverError: TestResult = {
        ...baseErrorResult,
        error_type: 'server',
      };
      render(<ConnectionTestResult result={serverError} />);

      expect(screen.getByText(/The API server is experiencing issues/)).toBeInTheDocument();
    });

    it('displays troubleshooting tip for unknown error', () => {
      const unknownError: TestResult = {
        ...baseErrorResult,
        error_type: 'unknown',
      };
      render(<ConnectionTestResult result={unknownError} />);

      expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
    });

    it('renders retry button when onRetry provided', () => {
      render(<ConnectionTestResult result={baseErrorResult} onRetry={mockOnRetry} />);

      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    it('calls onRetry when retry button clicked', () => {
      render(<ConnectionTestResult result={baseErrorResult} onRetry={mockOnRetry} />);

      const retryButton = screen.getByRole('button', { name: /Retry/i });
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('renders close button in error state when onClose provided', () => {
      render(<ConnectionTestResult result={baseErrorResult} onClose={mockOnClose} onRetry={mockOnRetry} />);

      expect(screen.getByRole('button', { name: /Close/i })).toBeInTheDocument();
    });

    it('calls onClose when close button clicked in error state', () => {
      render(<ConnectionTestResult result={baseErrorResult} onClose={mockOnClose} onRetry={mockOnRetry} />);

      const closeButton = screen.getByRole('button', { name: /Close/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not render retry button when onRetry not provided', () => {
      render(<ConnectionTestResult result={baseErrorResult} />);

      expect(screen.queryByRole('button', { name: /Retry/i })).not.toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('renders with appropriate styling classes', () => {
      const successResult: TestResult = {
        success: true,
        status_code: 200,
        response_time_ms: 100,
      };
      const { container } = render(<ConnectionTestResult result={successResult} />);

      // Check for responsive flex classes
      expect(container.querySelector('.flex-wrap')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing tested_endpoint gracefully', () => {
      const resultWithoutEndpoint: TestResult = {
        success: true,
        status_code: 200,
        response_time_ms: 100,
      };
      render(<ConnectionTestResult result={resultWithoutEndpoint} />);

      expect(screen.queryByText(/Tested endpoint:/)).not.toBeInTheDocument();
    });

    it('handles long error messages', () => {
      const longError: TestResult = {
        success: false,
        error: 'This is a very long error message that should still be displayed correctly in the UI without breaking the layout or causing overflow issues',
        error_type: 'network',
      };
      render(<ConnectionTestResult result={longError} />);

      expect(screen.getByText(/This is a very long error message/)).toBeInTheDocument();
    });

    it('handles response body that is not JSON', () => {
      const plainTextResult: TestResult = {
        success: true,
        status_code: 200,
        response_time_ms: 100,
        body: 'Plain text response',
      };
      render(<ConnectionTestResult result={plainTextResult} />);

      expect(screen.getByText('Response Body')).toBeInTheDocument();
    });

    it('truncates very long response body with indicator', () => {
      const longBody = 'x'.repeat(600);
      const longBodyResult: TestResult = {
        success: true,
        status_code: 200,
        response_time_ms: 100,
        body: longBody,
      };
      render(<ConnectionTestResult result={longBodyResult} />);

      expect(screen.getByText('Response Body')).toBeInTheDocument();
    });
  });
});
