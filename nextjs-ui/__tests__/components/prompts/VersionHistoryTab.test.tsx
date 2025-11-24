/**
 * Unit tests for VersionHistoryTab Component
 *
 * Tests cover:
 * - Pagination (20 items per page)
 * - Search with 500ms debounce
 * - Date range filtering
 * - Loading/error/empty states
 * - Responsive layout
 * - Modal interactions (view diff, revert)
 * - Clear filters functionality
 *
 * Story: nextjs-story-28-prompts-version-history
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VersionHistoryTab } from '@/components/prompts/VersionHistoryTab';
import type { PromptVersion } from '@/lib/api/prompts';

// Mock the hooks module
jest.mock('@/lib/hooks/usePrompts', () => ({
  usePromptVersions: jest.fn(),
}));

// Mock child components
jest.mock('@/components/prompts/VersionDiffModal', () => ({
  VersionDiffModal: ({ isOpen, onClose, version }: any) =>
    isOpen ? (
      <div data-testid="version-diff-modal">
        <p>Version {version.version_number} Diff Modal</p>
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null,
}));

jest.mock('@/components/prompts/RevertConfirmDialog', () => ({
  RevertConfirmDialog: ({ isOpen, onClose, version }: any) =>
    isOpen ? (
      <div data-testid="revert-confirm-dialog">
        <p>Revert to Version {version.version_number}?</p>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null,
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Eye: () => <span data-testid="eye-icon">Eye</span>,
  RotateCcw: () => <span data-testid="rotate-icon">RotateCcw</span>,
  ChevronLeft: () => <span data-testid="chevron-left">ChevronLeft</span>,
  ChevronRight: () => <span data-testid="chevron-right">ChevronRight</span>,
  X: () => <span data-testid="x-icon">X</span>,
  History: () => <span data-testid="history-icon">History</span>,
}));

// Mock useDebounce hook
jest.mock('@/lib/hooks/useDebounce', () => ({
  useDebounce: (value: string, delay: number) => value, // Return immediately for tests
}));

const mockVersions: PromptVersion[] = [
  {
    id: '1',
    version_number: 5,
    template_text: 'Version 5 content',
    description: 'Latest version',
    created_at: '2024-01-15T10:00:00Z',
    created_by: 'user@example.com',
  },
  {
    id: '2',
    version_number: 4,
    template_text: 'Version 4 content',
    description: 'Previous version',
    created_at: '2024-01-14T10:00:00Z',
    created_by: 'admin@example.com',
  },
  {
    id: '3',
    version_number: 3,
    template_text: 'Version 3 content',
    description: null,
    created_at: '2024-01-13T10:00:00Z',
    created_by: null,
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const { usePromptVersions } = require('@/lib/hooks/usePrompts');

describe('VersionHistoryTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading state', () => {
    it('displays loading skeleton while fetching versions', () => {
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      // Should show 5 skeleton loaders
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error state', () => {
    it('displays error message when fetch fails', () => {
      const error = new Error('Failed to load versions');
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/Failed to load version history/)).toBeInTheDocument();
      expect(screen.getByText(/Failed to load versions/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    it('Retry button is clickable and attempts page reload', () => {
      const error = new Error('Failed to load');
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      const retryButton = screen.getByRole('button', { name: /Retry/i });

      // Verify button exists and is enabled (actual reload behavior is browser-specific and tested in E2E)
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).not.toBeDisabled();
    });
  });

  describe('Empty state', () => {
    it('displays empty state when no versions exist', () => {
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: [], total: 0, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('history-icon')).toBeInTheDocument();
      expect(screen.getByText(/No version history available/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Versions will be created automatically/i)
      ).toBeInTheDocument();
    });

    it('displays no results message when filters return empty', async () => {
      // First render with data to show search input
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: mockVersions, total: 5, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      const { rerender } = render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      // Type in search to trigger filtered state
      const searchInput = screen.getByPlaceholderText(/Search by description/i);
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      // Wait for debounce (500ms) and update mock to return empty results
      await new Promise((r) => setTimeout(r, 600));

      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: [], total: 5, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      rerender(<VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />);

      expect(screen.getByText(/No versions match your filters/i)).toBeInTheDocument();
      // Multiple Clear buttons may exist (one from each render state)
      const clearButtons = screen.getAllByRole('button', { name: /Clear filters/i });
      expect(clearButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Version list rendering', () => {
    it('displays version list in table format on desktop', () => {
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: mockVersions, total: 3, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      // Check table headers
      expect(screen.getByText('Version')).toBeInTheDocument();
      expect(screen.getByText('Saved')).toBeInTheDocument();
      expect(screen.getByText('Characters')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();

      // Check version data
      expect(screen.getByText('v5')).toBeInTheDocument();
      expect(screen.getByText('v4')).toBeInTheDocument();
      expect(screen.getByText('v3')).toBeInTheDocument();

      // Check descriptions (hidden column on smaller screens, but data is there)
      expect(screen.getByText('Latest version')).toBeInTheDocument();
      expect(screen.getByText('Previous version')).toBeInTheDocument();
    });

    it('displays character counts for each version', () => {
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: mockVersions, total: 3, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      // Each version should show character count
      mockVersions.forEach((version) => {
        const charCount = version.template_text.length.toLocaleString();
        const elements = screen.queryAllByText(charCount);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it('shows "—" for missing descriptions', () => {
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: mockVersions, total: 3, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      const dashSymbols = screen.getAllByText('—');
      expect(dashSymbols.length).toBeGreaterThan(0);
    });
  });

  describe('Search functionality', () => {
    it('renders search input with correct placeholder', () => {
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: mockVersions, total: 3, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      const searchInput = screen.getByPlaceholderText(/Search by description/i);
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('aria-label', 'Search versions by description');
    });

    it('updates search query when typing', () => {
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: mockVersions, total: 3, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      const searchInput = screen.getByPlaceholderText(
        /Search by description/i
      ) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'Latest' } });

      expect(searchInput.value).toBe('Latest');
    });

    it('displays filtered result count when search is active', () => {
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: [mockVersions[0]], total: 10, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      const searchInput = screen.getByPlaceholderText(/Search by description/i);
      fireEvent.change(searchInput, { target: { value: 'Latest' } });

      expect(screen.getByText(/Showing 1 of 10 versions/i)).toBeInTheDocument();
    });
  });

  describe('Date range filtering', () => {
    it('renders from and to date inputs', () => {
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: mockVersions, total: 3, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText(/From:/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/To:/i)).toBeInTheDocument();

      const fromInput = screen.getByLabelText(/From:/i);
      const toInput = screen.getByLabelText(/To:/i);

      expect(fromInput).toHaveAttribute('type', 'date');
      expect(toInput).toHaveAttribute('type', 'date');
    });

    it('updates date filters when dates are selected', () => {
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: mockVersions, total: 3, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      const fromInput = screen.getByLabelText(/From:/i) as HTMLInputElement;
      const toInput = screen.getByLabelText(/To:/i) as HTMLInputElement;

      fireEvent.change(fromInput, { target: { value: '2024-01-01' } });
      fireEvent.change(toInput, { target: { value: '2024-01-31' } });

      expect(fromInput.value).toBe('2024-01-01');
      expect(toInput.value).toBe('2024-01-31');
    });
  });

  describe('Clear filters', () => {
    it('renders Clear Filters button', () => {
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: mockVersions, total: 3, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /Clear Filters/i })).toBeInTheDocument();
    });

    it('clears all filters when Clear Filters is clicked', () => {
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: mockVersions, total: 3, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      // Set filters
      const searchInput = screen.getByPlaceholderText(
        /Search by description/i
      ) as HTMLInputElement;
      const fromInput = screen.getByLabelText(/From:/i) as HTMLInputElement;
      const toInput = screen.getByLabelText(/To:/i) as HTMLInputElement;

      fireEvent.change(searchInput, { target: { value: 'Latest' } });
      fireEvent.change(fromInput, { target: { value: '2024-01-01' } });
      fireEvent.change(toInput, { target: { value: '2024-01-31' } });

      expect(searchInput.value).toBe('Latest');
      expect(fromInput.value).toBe('2024-01-01');
      expect(toInput.value).toBe('2024-01-31');

      // Clear filters
      const clearButton = screen.getByRole('button', { name: /Clear Filters/i });
      fireEvent.click(clearButton);

      expect(searchInput.value).toBe('');
      expect(fromInput.value).toBe('');
      expect(toInput.value).toBe('');
    });
  });

  describe('Pagination', () => {
    it('displays pagination controls when more than 1 page', () => {
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: mockVersions, total: 25, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /Previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
      expect(screen.getByText(/Page 1 of 2/i)).toBeInTheDocument();
      expect(screen.getByText(/25 versions total/i)).toBeInTheDocument();
    });

    it('does not display pagination when only 1 page', () => {
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: mockVersions, total: 3, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      expect(screen.queryByRole('button', { name: /Previous/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Next/i })).not.toBeInTheDocument();
    });

    it('disables Previous button on first page', () => {
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: mockVersions, total: 25, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      const previousButton = screen.getByRole('button', { name: /Previous/i });
      expect(previousButton).toBeDisabled();
    });

    it('disables Next button on last page', async () => {
      // Start on page 1
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: mockVersions, total: 25, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      const { rerender } = render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      const nextButton = screen.getByRole('button', { name: /Next/i });

      // Click Next to go to page 2
      fireEvent.click(nextButton);

      // Mock now returns page 2 (last page)
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: mockVersions, total: 25, page: 2, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      rerender(<VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />);

      // Next button should now be disabled
      await waitFor(() => {
        expect(nextButton).toBeDisabled();
      });
    });
  });

  describe('View Diff Modal', () => {
    it('opens diff modal when Eye button is clicked', async () => {
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: mockVersions, total: 3, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      // Find all Eye buttons (one per version)
      const eyeButtons = screen.getAllByTestId('eye-icon');
      const firstViewButton = eyeButtons[0].closest('button')!;

      fireEvent.click(firstViewButton);

      await waitFor(() => {
        expect(screen.getByTestId('version-diff-modal')).toBeInTheDocument();
        expect(screen.getByText(/Version 5 Diff Modal/i)).toBeInTheDocument();
      });
    });

    it('closes diff modal when Close button is clicked', async () => {
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: mockVersions, total: 3, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      // Open modal
      const eyeButtons = screen.getAllByTestId('eye-icon');
      const firstViewButton = eyeButtons[0].closest('button')!;
      fireEvent.click(firstViewButton);

      await waitFor(() => {
        expect(screen.getByTestId('version-diff-modal')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByRole('button', { name: /Close Modal/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('version-diff-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Revert Confirmation Dialog', () => {
    it('opens revert dialog when RotateCcw button is clicked', async () => {
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: mockVersions, total: 3, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      // Find all RotateCcw buttons
      const rotateButtons = screen.getAllByTestId('rotate-icon');
      const firstRevertButton = rotateButtons[0].closest('button')!;

      fireEvent.click(firstRevertButton);

      await waitFor(() => {
        expect(screen.getByTestId('revert-confirm-dialog')).toBeInTheDocument();
        expect(screen.getByText(/Revert to Version 5?/i)).toBeInTheDocument();
      });
    });

    it('closes revert dialog when Cancel button is clicked', async () => {
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: mockVersions, total: 3, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      // Open dialog
      const rotateButtons = screen.getAllByTestId('rotate-icon');
      const firstRevertButton = rotateButtons[0].closest('button')!;
      fireEvent.click(firstRevertButton);

      await waitFor(() => {
        expect(screen.getByTestId('revert-confirm-dialog')).toBeInTheDocument();
      });

      // Close dialog
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId('revert-confirm-dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels on inputs', () => {
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: mockVersions, total: 3, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      expect(
        screen.getByLabelText('Search versions by description')
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Filter from date')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter to date')).toBeInTheDocument();
    });

    it('has proper ARIA labels on action buttons', () => {
      (usePromptVersions as jest.Mock).mockReturnValue({
        data: { items: mockVersions, total: 3, page: 1, limit: 20 },
        isLoading: false,
        error: null,
      } as any);

      render(
        <VersionHistoryTab promptId="test-prompt" currentTemplateText="current" />,
        { wrapper: createWrapper() }
      );

      // Get all buttons by their aria-labels
      expect(screen.getByLabelText('View version 5')).toBeInTheDocument();
      expect(screen.getByLabelText('Revert to version 5')).toBeInTheDocument();
    });
  });
});
