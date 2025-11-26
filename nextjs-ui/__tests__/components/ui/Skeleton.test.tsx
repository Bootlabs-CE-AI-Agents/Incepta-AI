import { render, screen } from '@testing-library/react';
import { Skeleton, SkeletonDark, SkeletonResponsive, LoadingContainer, useReducedMotion } from '@/components/ui/Skeleton';
import { renderHook } from '@testing-library/react';

// Mock matchMedia
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

describe('Skeleton', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  describe('rendering', () => {
    it('renders with default styles', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('animate-pulse');
      expect(skeleton).toHaveClass('bg-white/50');
    });

    it('accepts custom className', () => {
      render(<Skeleton data-testid="skeleton" className="h-8 w-32" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('h-8');
      expect(skeleton).toHaveClass('w-32');
    });

    it('renders rounded corners by default', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('rounded-md');
    });
  });

  describe('reduced motion', () => {
    it('shows static background when prefers-reduced-motion is set', () => {
      mockMatchMedia(true);
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      // When reduced motion is preferred, animation should be disabled
      expect(skeleton).not.toHaveClass('animate-pulse');
    });
  });

  describe('accessibility', () => {
    it('is hidden from screen readers with aria-hidden', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    });
  });
});

describe('SkeletonDark', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('renders with dark mode styles', () => {
    render(<SkeletonDark data-testid="skeleton-dark" />);
    const skeleton = screen.getByTestId('skeleton-dark');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('dark:bg-white/10');
  });

  it('accepts custom className', () => {
    render(<SkeletonDark data-testid="skeleton-dark" className="h-4 w-48" />);
    const skeleton = screen.getByTestId('skeleton-dark');
    expect(skeleton).toHaveClass('h-4');
    expect(skeleton).toHaveClass('w-48');
  });
});

describe('SkeletonResponsive', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('renders with responsive styles', () => {
    render(<SkeletonResponsive data-testid="skeleton-responsive" />);
    const skeleton = screen.getByTestId('skeleton-responsive');
    expect(skeleton).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    render(<SkeletonResponsive data-testid="skeleton-responsive" className="h-6 w-full" />);
    const skeleton = screen.getByTestId('skeleton-responsive');
    expect(skeleton).toHaveClass('h-6');
    expect(skeleton).toHaveClass('w-full');
  });
});

describe('LoadingContainer', () => {
  it('renders children when isLoading is false', () => {
    render(
      <LoadingContainer isLoading={false} skeleton={<div>Loading...</div>}>
        <div data-testid="content">Content</div>
      </LoadingContainer>
    );
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('renders skeleton when isLoading is true', () => {
    render(
      <LoadingContainer isLoading={true} skeleton={<div data-testid="skeleton">Loading...</div>}>
        <div data-testid="content">Content</div>
      </LoadingContainer>
    );
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('has aria-busy attribute when loading', () => {
    render(
      <LoadingContainer isLoading={true} skeleton={<div>Loading...</div>}>
        <div>Content</div>
      </LoadingContainer>
    );
    // The container should have aria-busy when loading
    const container = screen.getByText('Loading...').closest('div');
    expect(container?.parentElement).toHaveAttribute('aria-busy', 'true');
  });

  it('does not have aria-busy when not loading', () => {
    render(
      <LoadingContainer isLoading={false} skeleton={<div>Loading...</div>}>
        <div data-testid="content">Content</div>
      </LoadingContainer>
    );
    const container = screen.getByTestId('content').parentElement;
    expect(container).toHaveAttribute('aria-busy', 'false');
  });

  it('accepts custom className', () => {
    render(
      <LoadingContainer isLoading={false} skeleton={<div>Loading...</div>} className="custom-class">
        <div>Content</div>
      </LoadingContainer>
    );
    expect(screen.getByText('Content').parentElement).toHaveClass('custom-class');
  });

  it('accepts custom loadingLabel', () => {
    render(
      <LoadingContainer
        isLoading={true}
        skeleton={<div>Loading...</div>}
        loadingLabel="Fetching data"
      >
        <div>Content</div>
      </LoadingContainer>
    );
    const container = screen.getByText('Loading...').closest('div');
    expect(container?.parentElement).toHaveAttribute('aria-label', 'Fetching data');
  });
});

describe('useReducedMotion', () => {
  it('returns false when prefers-reduced-motion is not set', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when prefers-reduced-motion is set', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });
});
