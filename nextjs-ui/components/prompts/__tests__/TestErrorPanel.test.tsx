/**
 * Unit Tests for TestErrorPanel Component
 * Story: nextjs-story-29-prompts-llm-test
 * Task 10: Unit tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { TestErrorPanel } from '../TestErrorPanel';
import type { LLMTestError } from '@/lib/hooks/useLLMTest';

describe('TestErrorPanel', () => {
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    mockOnRetry.mockClear();
  });

  it('should render network error', () => {
    const error: LLMTestError = {
      type: 'network',
      message: 'Unable to connect',
      details: 'Check your internet connection',
    };

    render(<TestErrorPanel error={error} onRetry={mockOnRetry} />);

    expect(screen.getByText('Network Error')).toBeInTheDocument();
    expect(screen.getByText('Unable to connect')).toBeInTheDocument();
    expect(
      screen.getByText('Check your internet connection')
    ).toBeInTheDocument();
  });

  it('should render API error', () => {
    const error: LLMTestError = {
      type: 'api',
      message: 'LLM service error',
      details: 'Please try again later',
      status: 500,
    };

    render(<TestErrorPanel error={error} onRetry={mockOnRetry} />);

    expect(screen.getByText('API Error')).toBeInTheDocument();
    expect(screen.getByText('LLM service error')).toBeInTheDocument();
    expect(screen.getByText('Please try again later')).toBeInTheDocument();
    expect(screen.getByText('Status code: 500')).toBeInTheDocument();
  });

  it('should render timeout error', () => {
    const error: LLMTestError = {
      type: 'timeout',
      message: 'Request timed out after 60s',
      details: 'Try reducing max tokens',
    };

    render(<TestErrorPanel error={error} onRetry={mockOnRetry} />);

    expect(screen.getByText('Timeout')).toBeInTheDocument();
    expect(
      screen.getByText('Request timed out after 60s')
    ).toBeInTheDocument();
    expect(screen.getByText('Try reducing max tokens')).toBeInTheDocument();
  });

  it('should render rate limit error', () => {
    const error: LLMTestError = {
      type: 'rate_limit',
      message: 'Rate limit exceeded',
      details: 'Wait a moment and retry',
      status: 429,
    };

    render(<TestErrorPanel error={error} onRetry={mockOnRetry} />);

    expect(screen.getByText('Rate Limit Exceeded')).toBeInTheDocument();
    expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
    expect(screen.getByText('Wait a moment and retry')).toBeInTheDocument();
    expect(screen.getByText('Status code: 429')).toBeInTheDocument();
  });

  it('should render invalid model error', () => {
    const error: LLMTestError = {
      type: 'invalid_model',
      message: 'Invalid model or parameters',
      details: 'Check your configuration',
      status: 400,
    };

    render(<TestErrorPanel error={error} onRetry={mockOnRetry} />);

    expect(screen.getByText('Invalid Model')).toBeInTheDocument();
    expect(
      screen.getByText('Invalid model or parameters')
    ).toBeInTheDocument();
    expect(screen.getByText('Check your configuration')).toBeInTheDocument();
    expect(screen.getByText('Status code: 400')).toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', () => {
    const error: LLMTestError = {
      type: 'network',
      message: 'Unable to connect',
    };

    render(<TestErrorPanel error={error} onRetry={mockOnRetry} />);

    const retryButton = screen.getByRole('button', { name: /retry test/i });
    fireEvent.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('should render error without details', () => {
    const error: LLMTestError = {
      type: 'api',
      message: 'Something went wrong',
    };

    render(<TestErrorPanel error={error} onRetry={mockOnRetry} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByText(/details/i)).not.toBeInTheDocument();
  });

  it('should render error without status code', () => {
    const error: LLMTestError = {
      type: 'timeout',
      message: 'Timeout error',
    };

    render(<TestErrorPanel error={error} onRetry={mockOnRetry} />);

    expect(screen.queryByText(/status code/i)).not.toBeInTheDocument();
  });

  it('should display fail emoji', () => {
    const error: LLMTestError = {
      type: 'network',
      message: 'Error',
    };

    render(<TestErrorPanel error={error} onRetry={mockOnRetry} />);

    expect(screen.getByText('❌ Test Failed')).toBeInTheDocument();
  });

  it('should have proper error styling classes', () => {
    const error: LLMTestError = {
      type: 'api',
      message: 'Error',
    };

    const { container } = render(
      <TestErrorPanel error={error} onRetry={mockOnRetry} />
    );

    const errorPanel = container.firstChild;
    expect(errorPanel).toHaveClass('border-red-200');
    expect(errorPanel).toHaveClass('bg-red-50');
  });
});
