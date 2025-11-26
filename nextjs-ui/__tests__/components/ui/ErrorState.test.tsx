import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState, InlineErrorState } from '@/components/ui/ErrorState';

describe('ErrorState', () => {
  describe('rendering', () => {
    it('renders with default props', () => {
      render(<ErrorState />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders custom title', () => {
      render(<ErrorState title="Custom Error Title" />);
      expect(screen.getByText('Custom Error Title')).toBeInTheDocument();
    });

    it('renders custom description', () => {
      render(<ErrorState description="Custom error description" />);
      expect(screen.getByText('Custom error description')).toBeInTheDocument();
    });

    it('renders error message from error object', () => {
      const error = new Error('API request failed');
      render(<ErrorState error={error} />);
      expect(screen.getByText('API request failed')).toBeInTheDocument();
    });
  });

  describe('error types', () => {
    it('renders default type with AlertCircle icon', () => {
      render(<ErrorState type="default" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('renders network type', () => {
      render(<ErrorState type="network" />);
      expect(screen.getByText('Connection lost')).toBeInTheDocument();
    });

    it('renders auth type', () => {
      render(<ErrorState type="auth" />);
      expect(screen.getByText('Session expired')).toBeInTheDocument();
    });

    it('renders server type', () => {
      render(<ErrorState type="server" />);
      expect(screen.getByText('Server unavailable')).toBeInTheDocument();
    });

    it('renders notFound type', () => {
      render(<ErrorState type="notFound" />);
      expect(screen.getByText('Not found')).toBeInTheDocument();
    });
  });

  describe('retry button', () => {
    it('renders retry button when onRetry is provided', () => {
      const onRetry = jest.fn();
      render(<ErrorState onRetry={onRetry} />);
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('does not render retry button when onRetry is not provided', () => {
      render(<ErrorState />);
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', async () => {
      const onRetry = jest.fn();
      const user = userEvent.setup();
      render(<ErrorState onRetry={onRetry} />);

      await user.click(screen.getByRole('button', { name: /try again/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('renders custom retry label', () => {
      render(<ErrorState onRetry={() => {}} retryLabel="Retry Now" />);
      expect(screen.getByRole('button', { name: /retry now/i })).toBeInTheDocument();
    });
  });

  describe('error details', () => {
    it('does not show error details by default', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      render(<ErrorState error={error} />);
      expect(screen.queryByText('Show error details')).not.toBeInTheDocument();
    });

    it('shows error details when showDetails is true', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      render(<ErrorState error={error} showDetails />);
      expect(screen.getByText('Show error details')).toBeInTheDocument();
    });

    it('shows stack trace when details are expanded', async () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at someFunction';
      render(<ErrorState error={error} showDetails />);

      fireEvent.click(screen.getByText('Show error details'));
      expect(screen.getByText(/Error: Test error/)).toBeInTheDocument();
    });
  });

  describe('sizes', () => {
    it('renders small size', () => {
      render(<ErrorState size="sm" />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('py-6');
    });

    it('renders medium size by default', () => {
      render(<ErrorState />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('py-12');
    });

    it('renders large size', () => {
      render(<ErrorState size="lg" />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('py-16');
    });
  });

  describe('card styling', () => {
    it('shows card background by default', () => {
      render(<ErrorState />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('glass-card');
    });

    it('hides card background when showCard is false', () => {
      render(<ErrorState showCard={false} />);
      const alert = screen.getByRole('alert');
      expect(alert).not.toHaveClass('glass-card');
    });
  });

  describe('accessibility', () => {
    it('has role="alert"', () => {
      render(<ErrorState />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('has aria-live="assertive"', () => {
      render(<ErrorState />);
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    });

    it('has aria-atomic="true"', () => {
      render(<ErrorState />);
      expect(screen.getByRole('alert')).toHaveAttribute('aria-atomic', 'true');
    });

    it('has screen reader announcement', () => {
      render(<ErrorState title="Error Title" description="Error description" />);
      expect(screen.getByText(/Error: Error Title. Error description/)).toBeInTheDocument();
    });

    it('accepts custom className', () => {
      render(<ErrorState className="custom-class" />);
      expect(screen.getByRole('alert')).toHaveClass('custom-class');
    });
  });
});

describe('InlineErrorState', () => {
  it('renders with default message', () => {
    render(<InlineErrorState />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<InlineErrorState message="Custom inline error" />);
    expect(screen.getByText('Custom inline error')).toBeInTheDocument();
  });

  it('renders retry button when onRetry is provided', () => {
    const onRetry = jest.fn();
    render(<InlineErrorState onRetry={onRetry} />);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();
    render(<InlineErrorState onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(<InlineErrorState />);
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('has role="alert"', () => {
    render(<InlineErrorState />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    render(<InlineErrorState className="custom-class" />);
    expect(screen.getByRole('alert')).toHaveClass('custom-class');
  });
});
