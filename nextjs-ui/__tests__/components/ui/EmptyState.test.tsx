import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState, SearchEmptyState, ErrorEmptyState } from '@/components/ui/EmptyState';
import { Bot } from 'lucide-react';

describe('EmptyState', () => {
  describe('rendering', () => {
    it('renders with required title', () => {
      render(<EmptyState title="No items found" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('No items found')).toBeInTheDocument();
    });

    it('renders description when provided', () => {
      render(
        <EmptyState
          title="No items"
          description="Get started by creating your first item"
        />
      );
      expect(screen.getByText('Get started by creating your first item')).toBeInTheDocument();
    });

    it('renders action button when provided', () => {
      render(
        <EmptyState
          title="No items"
          action={<button>Create Item</button>}
        />
      );
      expect(screen.getByRole('button', { name: /create item/i })).toBeInTheDocument();
    });

    it('renders custom icon when provided', () => {
      render(
        <EmptyState
          title="No items"
          icon={<Bot data-testid="custom-icon" className="w-12 h-12" />}
        />
      );
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });

  describe('preset types', () => {
    it('renders default type', () => {
      render(<EmptyState title="No items" type="default" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders search type', () => {
      render(<EmptyState title="No results" type="search" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders agents type', () => {
      render(<EmptyState title="No agents" type="agents" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders tenants type', () => {
      render(<EmptyState title="No tenants" type="tenants" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders servers type', () => {
      render(<EmptyState title="No servers" type="servers" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders error type', () => {
      render(<EmptyState title="Error" type="error" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('sizes', () => {
    it('renders small size', () => {
      render(<EmptyState title="No items" size="sm" />);
      const status = screen.getByRole('status');
      expect(status).toHaveClass('py-6');
    });

    it('renders medium size by default', () => {
      render(<EmptyState title="No items" />);
      const status = screen.getByRole('status');
      expect(status).toHaveClass('py-12');
    });

    it('renders large size', () => {
      render(<EmptyState title="No items" size="lg" />);
      const status = screen.getByRole('status');
      expect(status).toHaveClass('py-16');
    });
  });

  describe('card styling', () => {
    it('shows card background by default', () => {
      render(<EmptyState title="No items" />);
      const status = screen.getByRole('status');
      expect(status).toHaveClass('glass-card');
    });

    it('hides card background when showCard is false', () => {
      render(<EmptyState title="No items" showCard={false} />);
      const status = screen.getByRole('status');
      expect(status).not.toHaveClass('glass-card');
    });
  });

  describe('accessibility', () => {
    it('has role="status"', () => {
      render(<EmptyState title="No items" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-live="polite"', () => {
      render(<EmptyState title="No items" />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });

    it('has aria-atomic="true"', () => {
      render(<EmptyState title="No items" />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'true');
    });

    it('has aria-labelledby pointing to title', () => {
      render(<EmptyState title="No items" />);
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-labelledby');
    });

    it('has aria-describedby pointing to description when provided', () => {
      render(<EmptyState title="No items" description="Some description" />);
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-describedby');
    });

    it('has screen reader announcement', () => {
      render(<EmptyState title="No items" description="Create an item" />);
      expect(screen.getByText(/No items. Create an item/)).toBeInTheDocument();
    });

    it('accepts custom className', () => {
      render(<EmptyState title="No items" className="custom-class" />);
      expect(screen.getByRole('status')).toHaveClass('custom-class');
    });
  });
});

describe('SearchEmptyState', () => {
  it('renders with search query', () => {
    render(<SearchEmptyState query="foobar" />);
    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.getByText(/No items match "foobar"/)).toBeInTheDocument();
  });

  it('renders clear search button when onClearSearch is provided', () => {
    const onClearSearch = jest.fn();
    render(<SearchEmptyState query="test" onClearSearch={onClearSearch} />);
    expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
  });

  it('calls onClearSearch when button is clicked', async () => {
    const onClearSearch = jest.fn();
    const user = userEvent.setup();
    render(<SearchEmptyState query="test" onClearSearch={onClearSearch} />);

    await user.click(screen.getByRole('button', { name: /clear search/i }));
    expect(onClearSearch).toHaveBeenCalledTimes(1);
  });

  it('does not render clear button when onClearSearch is not provided', () => {
    render(<SearchEmptyState query="test" />);
    expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument();
  });

  it('accepts custom className', () => {
    render(<SearchEmptyState query="test" className="custom-class" />);
    expect(screen.getByRole('status')).toHaveClass('custom-class');
  });
});

describe('ErrorEmptyState', () => {
  it('renders with default title', () => {
    render(<ErrorEmptyState />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders with default description', () => {
    render(<ErrorEmptyState />);
    expect(screen.getByText('We encountered an error loading this content.')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<ErrorEmptyState title="Custom Error" />);
    expect(screen.getByText('Custom Error')).toBeInTheDocument();
  });

  it('renders custom description', () => {
    render(<ErrorEmptyState description="Custom error description" />);
    expect(screen.getByText('Custom error description')).toBeInTheDocument();
  });

  it('renders retry button when onRetry is provided', () => {
    const onRetry = jest.fn();
    render(<ErrorEmptyState onRetry={onRetry} />);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('calls onRetry when button is clicked', async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();
    render(<ErrorEmptyState onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(<ErrorEmptyState />);
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('accepts custom className', () => {
    render(<ErrorEmptyState className="custom-class" />);
    expect(screen.getByRole('status')).toHaveClass('custom-class');
  });
});
