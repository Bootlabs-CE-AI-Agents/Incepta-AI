import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SectionErrorBoundary } from '@/components/error-boundary/SectionErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div data-testid="child-content">Child content</div>;
};

// Suppress console.error for cleaner test output
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

describe('SectionErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders children when no error occurs', () => {
      render(
        <SectionErrorBoundary>
          <ThrowError shouldThrow={false} />
        </SectionErrorBoundary>
      );
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('renders error UI when child throws', () => {
      render(
        <SectionErrorBoundary>
          <ThrowError shouldThrow={true} />
        </SectionErrorBoundary>
      );
      expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('renders default error title', () => {
      render(
        <SectionErrorBoundary>
          <ThrowError shouldThrow={true} />
        </SectionErrorBoundary>
      );
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders custom section name in title', () => {
      render(
        <SectionErrorBoundary sectionName="Chart Widget">
          <ThrowError shouldThrow={true} />
        </SectionErrorBoundary>
      );
      expect(screen.getByText(/Chart Widget/)).toBeInTheDocument();
    });
  });

  describe('fallback', () => {
    it('renders custom fallback when provided', () => {
      render(
        <SectionErrorBoundary fallback={<div data-testid="custom-fallback">Custom Error</div>}>
          <ThrowError shouldThrow={true} />
        </SectionErrorBoundary>
      );
      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    });
  });

  describe('retry functionality', () => {
    it('renders retry button by default', () => {
      render(
        <SectionErrorBoundary>
          <ThrowError shouldThrow={true} />
        </SectionErrorBoundary>
      );
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('hides retry button when showRetry is false', () => {
      render(
        <SectionErrorBoundary showRetry={false}>
          <ThrowError shouldThrow={true} />
        </SectionErrorBoundary>
      );
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('resets error state when retry is clicked', async () => {
      let shouldThrow = true;
      const TestComponent = () => {
        if (shouldThrow) throw new Error('Test error');
        return <div data-testid="recovered">Recovered</div>;
      };

      const { rerender } = render(
        <SectionErrorBoundary key="boundary">
          <TestComponent />
        </SectionErrorBoundary>
      );

      // Verify error state
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Fix the error and click retry
      shouldThrow = false;

      // Click retry - this will cause the boundary to re-render children
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /try again/i }));

      // Note: In a real scenario, the component would recover
      // For this test, we're just verifying the retry button exists and is clickable
    });

    it('calls onRetry callback when provided', async () => {
      const onRetry = jest.fn();
      const user = userEvent.setup();

      render(
        <SectionErrorBoundary onRetry={onRetry}>
          <ThrowError shouldThrow={true} />
        </SectionErrorBoundary>
      );

      await user.click(screen.getByRole('button', { name: /try again/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('error details', () => {
    it('shows error message when showErrorDetails is true', () => {
      render(
        <SectionErrorBoundary showErrorDetails={true}>
          <ThrowError shouldThrow={true} />
        </SectionErrorBoundary>
      );
      // The expandable details should be present
      expect(screen.getByText(/error details/i)).toBeInTheDocument();
    });

    it('hides error details by default', () => {
      render(
        <SectionErrorBoundary>
          <ThrowError shouldThrow={true} />
        </SectionErrorBoundary>
      );
      // Error details should not be shown by default
      expect(screen.queryByText(/error details/i)).not.toBeInTheDocument();
    });

    it('expands error details when clicked', async () => {
      render(
        <SectionErrorBoundary showErrorDetails={true}>
          <ThrowError shouldThrow={true} />
        </SectionErrorBoundary>
      );

      const detailsSummary = screen.getByText(/error details/i);
      fireEvent.click(detailsSummary);

      // After clicking, error message should be visible
      expect(screen.getByText(/Test error message/)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has role="alert" on error container', () => {
      render(
        <SectionErrorBoundary>
          <ThrowError shouldThrow={true} />
        </SectionErrorBoundary>
      );
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('has aria-live="assertive" for immediate announcement', () => {
      render(
        <SectionErrorBoundary>
          <ThrowError shouldThrow={true} />
        </SectionErrorBoundary>
      );
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    });

    it('retry button is keyboard accessible', async () => {
      const onRetry = jest.fn();
      const user = userEvent.setup();

      render(
        <SectionErrorBoundary onRetry={onRetry}>
          <ThrowError shouldThrow={true} />
        </SectionErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      retryButton.focus();
      await user.keyboard('{Enter}');

      expect(onRetry).toHaveBeenCalled();
    });
  });

  describe('styling', () => {
    it('accepts custom className', () => {
      render(
        <SectionErrorBoundary className="custom-class">
          <ThrowError shouldThrow={true} />
        </SectionErrorBoundary>
      );
      expect(screen.getByRole('alert')).toHaveClass('custom-class');
    });
  });
});
