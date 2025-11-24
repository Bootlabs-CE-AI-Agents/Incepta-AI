/**
 * Unit Tests for RoleAssignmentModal component
 *
 * Tests cover:
 * - Story 26 AC-2: Modal structure with header, current assignments, assign form
 * - Headless UI Dialog accessibility (keyboard nav, ESC close, focus trap)
 * - Mobile responsive design
 * - Integration of child components
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { RoleAssignmentModal } from '../RoleAssignmentModal';
import type { UserDetail } from '@/lib/api/users';

// Mock child components
jest.mock('../CurrentAssignmentsTable', () => ({
  CurrentAssignmentsTable: ({ userId }: { userId: string }) => (
    <div data-testid="current-assignments-table">CurrentAssignmentsTable for {userId}</div>
  ),
}));

jest.mock('../AssignRoleForm', () => ({
  AssignRoleForm: ({ userId }: { userId: string }) => (
    <div data-testid="assign-role-form">AssignRoleForm for {userId}</div>
  ),
}));

const mockUser: UserDetail = {
  id: 'user-123-uuid',
  email: 'developer@example.com',
  is_active: true,
  roles: [
    {
      id: 'role-1',
      role: 'developer',
      tenant_id: 'tenant-abc',
      tenant_name: 'Acme Corp',
    },
  ],
  default_tenant_id: 'tenant-abc',
  default_tenant_name: 'Acme Corp',
  force_password_change: false,
  last_login: '2024-01-15T10:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const createWrapper = (session: any = null) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  );
};

describe('RoleAssignmentModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Modal renders when open with user (AC-2)
  test('renders modal when isOpen is true with valid user (AC-2: modal display)', () => {
    render(
      <RoleAssignmentModal isOpen={true} onClose={mockOnClose} user={mockUser} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Manage Roles for developer@example\.com/i)).toBeInTheDocument();
  });

  // Test 2: Modal does not render when closed
  test('does not render modal when isOpen is false (AC-2: modal hidden)', () => {
    render(
      <RoleAssignmentModal isOpen={false} onClose={mockOnClose} user={mockUser} />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // Test 3: Modal does not render when user is null
  test('does not render modal when user is null (AC-2: null check)', () => {
    render(
      <RoleAssignmentModal isOpen={true} onClose={mockOnClose} user={null} />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // Test 4: Displays user email in header (AC-2)
  test('displays user email in modal header (AC-2: header content)', () => {
    render(
      <RoleAssignmentModal isOpen={true} onClose={mockOnClose} user={mockUser} />,
      { wrapper: createWrapper() }
    );

    const header = screen.getByText(/Manage Roles for developer@example\.com/i);
    expect(header).toBeInTheDocument();
    expect(header.tagName).toBe('H3');
  });

  // Test 5: Displays truncated user ID (AC-2)
  test('displays truncated user ID in header (AC-2: user identification)', () => {
    render(
      <RoleAssignmentModal isOpen={true} onClose={mockOnClose} user={mockUser} />,
      { wrapper: createWrapper() }
    );

    // Should show first 8 characters + ...
    expect(screen.getByText(/User ID: user-123\.\.\.$/)).toBeInTheDocument();
  });

  // Test 6: Renders CurrentAssignmentsTable (AC-2 + AC-3)
  test('renders CurrentAssignmentsTable component (AC-2: current assignments section)', () => {
    render(
      <RoleAssignmentModal isOpen={true} onClose={mockOnClose} user={mockUser} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Current Role Assignments')).toBeInTheDocument();
    expect(screen.getByTestId('current-assignments-table')).toBeInTheDocument();
    expect(screen.getByText('CurrentAssignmentsTable for user-123-uuid')).toBeInTheDocument();
  });

  // Test 7: Renders AssignRoleForm (AC-2 + AC-4)
  test('renders AssignRoleForm component (AC-2: assign new role section)', () => {
    render(
      <RoleAssignmentModal isOpen={true} onClose={mockOnClose} user={mockUser} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Assign New Role')).toBeInTheDocument();
    expect(screen.getByTestId('assign-role-form')).toBeInTheDocument();
    expect(screen.getByText('AssignRoleForm for user-123-uuid')).toBeInTheDocument();
  });

  // Test 8: Close button in header (AC-2)
  test('close button in header closes modal (AC-2: close button)', () => {
    render(
      <RoleAssignmentModal isOpen={true} onClose={mockOnClose} user={mockUser} />,
      { wrapper: createWrapper() }
    );

    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // Test 9: Close button in footer (AC-2)
  test('close button in footer closes modal (AC-2: footer close button)', () => {
    render(
      <RoleAssignmentModal isOpen={true} onClose={mockOnClose} user={mockUser} />,
      { wrapper: createWrapper() }
    );

    const footerCloseButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(footerCloseButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // Test 10: ESC key closes modal (Headless UI accessibility)
  test('ESC key closes modal (AC-2: keyboard accessibility)', async () => {
    render(
      <RoleAssignmentModal isOpen={true} onClose={mockOnClose} user={mockUser} />,
      { wrapper: createWrapper() }
    );

    const dialog = screen.getByRole('dialog');

    // Simulate ESC key press
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // Test 11: Modal has glassmorphic styling (AC-2)
  test('modal has glassmorphic styling (AC-2: design system)', () => {
    const { container } = render(
      <RoleAssignmentModal isOpen={true} onClose={mockOnClose} user={mockUser} />,
      { wrapper: createWrapper() }
    );

    const modalPanel = container.querySelector('.glass-card');
    expect(modalPanel).toBeInTheDocument();
  });

  // Test 12: Modal has backdrop overlay (AC-2)
  test('renders backdrop overlay for modal (AC-2: modal backdrop)', () => {
    const { container } = render(
      <RoleAssignmentModal isOpen={true} onClose={mockOnClose} user={mockUser} />,
      { wrapper: createWrapper() }
    );

    // Check for backdrop with blur effect
    const backdrop = container.querySelector('.backdrop-blur-sm');
    expect(backdrop).toBeInTheDocument();
  });

  // Test 13: Modal has divider between sections (AC-2)
  test('displays divider between current assignments and assign form (AC-2: visual separation)', () => {
    const { container } = render(
      <RoleAssignmentModal isOpen={true} onClose={mockOnClose} user={mockUser} />,
      { wrapper: createWrapper() }
    );

    const divider = container.querySelector('.border-t.border-border');
    expect(divider).toBeInTheDocument();
  });

  // Test 14: Modal is responsive (AC-9)
  test('modal has responsive width classes (AC-9: mobile responsive)', () => {
    const { container } = render(
      <RoleAssignmentModal isOpen={true} onClose={mockOnClose} user={mockUser} />,
      { wrapper: createWrapper() }
    );

    const modalPanel = container.querySelector('.max-w-2xl');
    expect(modalPanel).toBeInTheDocument();
    expect(modalPanel).toHaveClass('sm:max-w-lg', 'md:max-w-2xl');
  });

  // Test 15: Modal has accessible structure (WCAG 2.1 AA)
  test('modal has accessible structure (AC-2: accessibility)', () => {
    render(
      <RoleAssignmentModal isOpen={true} onClose={mockOnClose} user={mockUser} />,
      { wrapper: createWrapper() }
    );

    // Should have dialog role
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Should have heading for title
    const title = screen.getByText(/Manage Roles for/);
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe('H3');

    // Should have close button with aria-label
    const closeButton = screen.getByLabelText('Close modal');
    expect(closeButton).toBeInTheDocument();
  });

  // Test 16: Different user emails are displayed correctly
  test('displays different user emails correctly (AC-2: dynamic user data)', () => {
    const differentUser: UserDetail = {
      ...mockUser,
      id: 'user-456-uuid',
      email: 'admin@techcorp.com',
    };

    render(
      <RoleAssignmentModal isOpen={true} onClose={mockOnClose} user={differentUser} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/Manage Roles for admin@techcorp\.com/i)).toBeInTheDocument();
    expect(screen.getByText(/User ID: user-456\.\.\.$/)).toBeInTheDocument();
  });
});
