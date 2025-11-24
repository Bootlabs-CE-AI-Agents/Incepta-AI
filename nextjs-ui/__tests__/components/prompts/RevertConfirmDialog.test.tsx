/**
 * Unit tests for RevertConfirmDialog Component
 *
 * Tests cover:
 * - Dialog visibility and rendering
 * - Version details display
 * - Confirm/cancel actions
 * - Loading states
 * - Error handling with retry
 * - Keyboard accessibility (ESC, Enter)
 * - Disable state during mutation
 *
 * Story: nextjs-story-28-prompts-version-history
 * AC: AC-3 (Revert Version with Confirmation)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RevertConfirmDialog } from '@/components/prompts/RevertConfirmDialog';
import type { PromptVersion } from '@/lib/api/prompts';

// Mock the hooks module
jest.mock('@/lib/hooks/usePrompts', () => ({
  usePrompt: jest.fn(),
  useRevertPromptVersion: jest.fn(),
}));

// Mock Headless UI Dialog
jest.mock('@headlessui/react', () => {
  const MockDialog = ({ open, onClose, children, onKeyDown }: any) =>
    open ? (
      <div data-testid="dialog" onKeyDown={onKeyDown}>
        {children}
      </div>
    ) : null;

  MockDialog.Panel = ({ children }: any) => <div>{children}</div>;
  MockDialog.Title = ({ children }: any) => <h2>{children}</h2>;

  return {
    Dialog: MockDialog,
  };
});

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  AlertTriangle: () => <span data-testid="alert-icon">AlertTriangle</span>,
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: (date: Date, formatStr: string) => {
    return 'Jan 15, 2024';
  },
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockVersion: PromptVersion = {
  id: 'version-1',
  version_number: 3,
  template_text: 'Version 3 content',
  description: 'Previous stable version',
  created_at: '2024-01-15T10:00:00Z',
  created_by: 'user@example.com',
};

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

const { usePrompt, useRevertPromptVersion } = require('@/lib/hooks/usePrompts');

describe('RevertConfirmDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dialog visibility', () => {
    it('renders dialog when isOpen is true', () => {
      (useRevertPromptVersion as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
        isError: false,
        error: null,
      });

      (usePrompt as jest.Mock).mockReturnValue({
        data: { id: 'prompt-1', name: 'Test Prompt' },
      });

      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    it('does not render dialog when isOpen is false', () => {
      (useRevertPromptVersion as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
        isError: false,
        error: null,
      } as any);

      (usePrompt as jest.Mock).mockReturnValue({
        data: { id: 'prompt-1', name: 'Test Prompt' },
      } as any);

      render(
        <RevertConfirmDialog
          isOpen={false}
          onClose={jest.fn()}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Content rendering', () => {
    beforeEach(() => {
      (useRevertPromptVersion as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
        isError: false,
        error: null,
      } as any);

      (usePrompt as jest.Mock).mockReturnValue({
        data: { id: 'prompt-1', name: 'Test Prompt', updated_at: '2024-01-20T10:00:00Z' },
      } as any);
    });

    it('displays alert icon', () => {
      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
    });

    it('displays dialog title with version number', () => {
      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/Revert to Version 3?/i)).toBeInTheDocument();
    });

    it('displays warning message', () => {
      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      expect(
        screen.getByText(/Current prompt will be saved as a new version/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument();
    });

    it('displays selected version number', () => {
      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Selected Version:')).toBeInTheDocument();
      expect(screen.getByText('v3')).toBeInTheDocument();
    });

    it('displays saved date', () => {
      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Saved:')).toBeInTheDocument();
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
    });

    it('displays version description when provided', () => {
      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Description:')).toBeInTheDocument();
      expect(screen.getByText('Previous stable version')).toBeInTheDocument();
    });

    it('does not display description when not provided', () => {
      const versionWithoutDescription = { ...mockVersion, description: null };

      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={jest.fn()}
          version={versionWithoutDescription}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.queryByText('Description:')).not.toBeInTheDocument();
    });
  });

  describe('Action buttons', () => {
    beforeEach(() => {
      (usePrompt as jest.Mock).mockReturnValue({
        data: { id: 'prompt-1', name: 'Test Prompt' },
      } as any);
    });

    it('renders Cancel button', () => {
      (useRevertPromptVersion as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
        isError: false,
        error: null,
      } as any);

      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('renders Confirm Revert button', () => {
      (useRevertPromptVersion as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
        isError: false,
        error: null,
      } as any);

      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      const confirmButton = screen.getByLabelText(/Confirm revert to version 3/i);
      expect(confirmButton).toBeInTheDocument();
      expect(confirmButton).toHaveTextContent('Confirm Revert');
    });

    it('calls onClose when Cancel button is clicked', () => {
      const onCloseMock = jest.fn();

      (useRevertPromptVersion as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
        isError: false,
        error: null,
      } as any);

      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={onCloseMock}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('calls mutateAsync when Confirm button is clicked', async () => {
      const mutateAsyncMock = jest.fn().mockResolvedValue({});
      const onCloseMock = jest.fn();

      (useRevertPromptVersion as jest.Mock).mockReturnValue({
        mutateAsync: mutateAsyncMock,
        isPending: false,
        isError: false,
        error: null,
      } as any);

      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={onCloseMock}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      const confirmButton = screen.getByLabelText(/Confirm revert to version 3/i);
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mutateAsyncMock).toHaveBeenCalledWith({
          id: 'prompt-1',
          versionId: 'version-1',
        });
      });
    });

    it('closes dialog after successful revert', async () => {
      const mutateAsyncMock = jest.fn().mockResolvedValue({});
      const onCloseMock = jest.fn();

      (useRevertPromptVersion as jest.Mock).mockReturnValue({
        mutateAsync: mutateAsyncMock,
        isPending: false,
        isError: false,
        error: null,
      } as any);

      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={onCloseMock}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      const confirmButton = screen.getByLabelText(/Confirm revert to version 3/i);
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(onCloseMock).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Loading state', () => {
    it('shows "Reverting..." text when mutation is pending', async () => {
      (useRevertPromptVersion as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: true,
        isError: false,
        error: null,
      } as any);

      (usePrompt as jest.Mock).mockReturnValue({
        data: { id: 'prompt-1', name: 'Test Prompt' },
      } as any);

      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      // Wait for component to render with pending state
      const confirmButton = await screen.findByText('Reverting...');
      expect(confirmButton).toBeInTheDocument();
      expect(confirmButton).toBeDisabled();
    });

    it('disables both buttons during mutation', async () => {
      (useRevertPromptVersion as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: true,
        isError: false,
        error: null,
      } as any);

      (usePrompt as jest.Mock).mockReturnValue({
        data: { id: 'prompt-1', name: 'Test Prompt' },
      } as any);

      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      // Wait for buttons to render
      const cancelButton = await screen.findByText('Cancel');
      const confirmButton = await screen.findByText('Reverting...');

      expect(cancelButton).toBeDisabled();
      expect(confirmButton).toBeDisabled();
    });

    it('prevents dialog close during mutation', () => {
      const onCloseMock = jest.fn();

      (useRevertPromptVersion as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: true,
        isError: false,
        error: null,
      } as any);

      (usePrompt as jest.Mock).mockReturnValue({
        data: { id: 'prompt-1', name: 'Test Prompt' },
      } as any);

      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={onCloseMock}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      // Dialog should not call onClose during mutation
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      // onClose should not be called because mutation is pending
      expect(onCloseMock).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('displays error message when revert fails', () => {
      const error = new Error('Network error');

      (useRevertPromptVersion as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
        isError: true,
        error,
      } as any);

      (usePrompt as jest.Mock).mockReturnValue({
        data: { id: 'prompt-1', name: 'Test Prompt' },
      } as any);

      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/Failed to revert:/i)).toBeInTheDocument();
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });

    it('shows Retry button when error occurs', () => {
      const error = new Error('Network error');

      (useRevertPromptVersion as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
        isError: true,
        error,
      } as any);

      (usePrompt as jest.Mock).mockReturnValue({
        data: { id: 'prompt-1', name: 'Test Prompt' },
      } as any);

      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    it('retries revert when Retry button is clicked', async () => {
      const error = new Error('Network error');
      const mutateAsyncMock = jest.fn().mockRejectedValue(error);

      (useRevertPromptVersion as jest.Mock).mockReturnValue({
        mutateAsync: mutateAsyncMock,
        isPending: false,
        isError: true,
        error,
      } as any);

      (usePrompt as jest.Mock).mockReturnValue({
        data: { id: 'prompt-1', name: 'Test Prompt' },
      } as any);

      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      const retryButton = screen.getByRole('button', { name: /Retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mutateAsyncMock).toHaveBeenCalled();
      });
    });

    it('keeps dialog open after error for retry opportunity', async () => {
      const error = new Error('Network error');
      const mutateAsyncMock = jest.fn().mockRejectedValue(error);
      const onCloseMock = jest.fn();

      (useRevertPromptVersion as jest.Mock).mockReturnValue({
        mutateAsync: mutateAsyncMock,
        isPending: false,
        isError: true,
        error,
      } as any);

      (usePrompt as jest.Mock).mockReturnValue({
        data: { id: 'prompt-1', name: 'Test Prompt' },
      } as any);

      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={onCloseMock}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      // Dialog should still be open
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      // onClose should not have been called
      expect(onCloseMock).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard accessibility', () => {
    it('closes dialog when ESC key is pressed', () => {
      const onCloseMock = jest.fn();

      (useRevertPromptVersion as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
        isError: false,
        error: null,
      } as any);

      (usePrompt as jest.Mock).mockReturnValue({
        data: { id: 'prompt-1', name: 'Test Prompt' },
      } as any);

      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={onCloseMock}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      const dialog = screen.getByTestId('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape' });

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('triggers revert when Enter key is pressed', async () => {
      const mutateAsyncMock = jest.fn().mockResolvedValue({});

      (useRevertPromptVersion as jest.Mock).mockReturnValue({
        mutateAsync: mutateAsyncMock,
        isPending: false,
        isError: false,
        error: null,
      } as any);

      (usePrompt as jest.Mock).mockReturnValue({
        data: { id: 'prompt-1', name: 'Test Prompt' },
      } as any);

      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      const dialog = screen.getByTestId('dialog');
      fireEvent.keyDown(dialog, { key: 'Enter' });

      await waitFor(() => {
        expect(mutateAsyncMock).toHaveBeenCalledWith({
          id: 'prompt-1',
          versionId: 'version-1',
        });
      });
    });

    it('prevents ESC during mutation', () => {
      const onCloseMock = jest.fn();

      (useRevertPromptVersion as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: true,
        isError: false,
        error: null,
      } as any);

      (usePrompt as jest.Mock).mockReturnValue({
        data: { id: 'prompt-1', name: 'Test Prompt' },
      } as any);

      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={onCloseMock}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      const dialog = screen.getByTestId('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape' });

      // onClose should not be called during mutation
      expect(onCloseMock).not.toHaveBeenCalled();
    });

    it('prevents Enter during mutation', () => {
      const mutateAsyncMock = jest.fn();

      (useRevertPromptVersion as jest.Mock).mockReturnValue({
        mutateAsync: mutateAsyncMock,
        isPending: true,
        isError: false,
        error: null,
      } as any);

      (usePrompt as jest.Mock).mockReturnValue({
        data: { id: 'prompt-1', name: 'Test Prompt' },
      } as any);

      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      const dialog = screen.getByTestId('dialog');
      fireEvent.keyDown(dialog, { key: 'Enter' });

      // mutateAsync should not be called again during pending mutation
      expect(mutateAsyncMock).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label on confirm button', () => {
      (useRevertPromptVersion as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
        isError: false,
        error: null,
      } as any);

      (usePrompt as jest.Mock).mockReturnValue({
        data: { id: 'prompt-1', name: 'Test Prompt' },
      } as any);

      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText(/Confirm revert to version 3/i)).toBeInTheDocument();
    });

    it('uses semantic heading for title', () => {
      (useRevertPromptVersion as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
        isError: false,
        error: null,
      } as any);

      (usePrompt as jest.Mock).mockReturnValue({
        data: { id: 'prompt-1', name: 'Test Prompt' },
      } as any);

      render(
        <RevertConfirmDialog
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          promptId="prompt-1"
        />,
        { wrapper: createWrapper() }
      );

      const title = screen.getByText(/Revert to Version 3?/i);
      expect(title.tagName).toBe('H2');
    });
  });
});
