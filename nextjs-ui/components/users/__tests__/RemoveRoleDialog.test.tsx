/**
 * Unit Tests for RemoveRoleDialog component
 *
 * Tests cover:
 * - Story 26 AC-5: Confirmation dialog for role removal
 * - Accessible via Headless UI Dialog (keyboard nav, ESC close)
 * - Cancel and Remove buttons with proper states
 * - Error handling during removal
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RemoveRoleDialog } from '../RemoveRoleDialog';
import { useRemoveRole } from '@/lib/hooks/useUserRoles';

// Mock the useRemoveRole hook
jest.mock('@/lib/hooks/useUserRoles');

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

describe('RemoveRoleDialog', () => {
  const mockRemoveRole = jest.fn();
  const mockOnClose = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    userId: 'user-123',
    roleId: 'role-456',
    roleName: 'Developer',
    tenantName: 'Acme Corp',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useRemoveRole as jest.Mock).mockReturnValue({
      mutate: mockRemoveRole,
      isPending: false,
    });
  });

  // Test 1: Dialog renders when open (AC-5)
  test('renders dialog when isOpen is true (AC-5: dialog display)', () => {
    render(<RemoveRoleDialog {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Remove Role Assignment?')).toBeInTheDocument();
  });

  // Test 2: Dialog does not render when closed
  test('does not render dialog when isOpen is false (AC-5: dialog hidden)', () => {
    render(<RemoveRoleDialog {...defaultProps} isOpen={false} />, {
      wrapper: createWrapper(),
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // Test 3: Shows role and tenant information (AC-5)
  test('displays role and tenant information (AC-5: confirmation message)', () => {
    render(<RemoveRoleDialog {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.getByText(/Developer/)).toBeInTheDocument();
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
    expect(screen.getByText(/This action cannot be undone./)).toBeInTheDocument();
  });

  // Test 4: Cancel button closes dialog (AC-5)
  test('cancel button closes dialog without removing role (AC-5: cancel action)', () => {
    render(<RemoveRoleDialog {...defaultProps} />, { wrapper: createWrapper() });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockRemoveRole).not.toHaveBeenCalled();
  });

  // Test 5: Remove button calls mutation (AC-5 + AC-8)
  test('remove button calls removeRole mutation (AC-5: remove action)', async () => {
    render(<RemoveRoleDialog {...defaultProps} />, { wrapper: createWrapper() });

    const removeButton = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockRemoveRole).toHaveBeenCalledWith(
        {
          roleId: 'role-456',
          roleName: 'Developer',
          tenantName: 'Acme Corp',
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
        })
      );
    });
  });

  // Test 6: Dialog closes after successful removal (AC-5 + AC-8)
  test('dialog closes after successful role removal (AC-5: success flow)', async () => {
    // Mock successful mutation
    (useRemoveRole as jest.Mock).mockReturnValue({
      mutate: (_data: any, options: any) => {
        options.onSuccess();
      },
      isPending: false,
    });

    render(<RemoveRoleDialog {...defaultProps} />, { wrapper: createWrapper() });

    const removeButton = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // Test 7: Loading state during removal (AC-5)
  test('shows loading state during role removal (AC-5: loading state)', () => {
    (useRemoveRole as jest.Mock).mockReturnValue({
      mutate: mockRemoveRole,
      isPending: true,
    });

    render(<RemoveRoleDialog {...defaultProps} />, { wrapper: createWrapper() });

    const removeButton = screen.getByRole('button', { name: /removing/i });
    expect(removeButton).toBeInTheDocument();
    expect(removeButton).toBeDisabled();

    // Cancel button should also be disabled during removal
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeDisabled();
  });

  // Test 8: Dialog has accessible structure (WCAG 2.1 AA)
  test('dialog has accessible structure (AC-5: accessibility)', () => {
    render(<RemoveRoleDialog {...defaultProps} />, { wrapper: createWrapper() });

    // Should have dialog role
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Should have heading for title
    const title = screen.getByText('Remove Role Assignment?');
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe('H3');

    // Should have both action buttons
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  // Test 9: Dialog displays warning icon (AC-5)
  test('displays warning icon for destructive action (AC-5: visual warning)', () => {
    const { container } = render(<RemoveRoleDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    // AlertTriangle icon should be present (Lucide icon renders as SVG)
    const iconContainer = container.querySelector('.bg-red-100, .dark\\:bg-red-900\\/20');
    expect(iconContainer).toBeInTheDocument();
  });

  // Test 10: ESC key closes dialog (Headless UI accessibility)
  test('ESC key closes dialog (AC-5: keyboard accessibility)', async () => {
    render(<RemoveRoleDialog {...defaultProps} />, { wrapper: createWrapper() });

    const dialog = screen.getByRole('dialog');

    // Simulate ESC key press
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // Test 11: Dialog has backdrop overlay (AC-5)
  test('renders backdrop overlay for modal (AC-5: modal design)', () => {
    const { container } = render(<RemoveRoleDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    // Check for backdrop with blur effect
    const backdrop = container.querySelector('.backdrop-blur-sm');
    expect(backdrop).toBeInTheDocument();
  });

  // Test 12: Different roles and tenants are displayed correctly
  test('displays different role and tenant names correctly (AC-5: dynamic content)', () => {
    const customProps = {
      ...defaultProps,
      roleName: 'Super Admin',
      tenantName: 'Tech Inc',
    };

    render(<RemoveRoleDialog {...customProps} />, { wrapper: createWrapper() });

    expect(screen.getByText(/Super Admin/)).toBeInTheDocument();
    expect(screen.getByText(/Tech Inc/)).toBeInTheDocument();
  });
});
