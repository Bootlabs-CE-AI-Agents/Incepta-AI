/**
 * Unit Tests for CurrentAssignmentsTable component
 *
 * Tests cover:
 * - Story 26 AC-3: Current role assignments table with color-coded badges
 * - Story 26 AC-5: Remove button functionality
 * - Story 26 AC-9: Mobile responsive design (table vs cards)
 * - Story 26 AC-10: Loading, error, and empty states
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CurrentAssignmentsTable } from '../CurrentAssignmentsTable';
import { useUserRoles } from '@/lib/hooks/useUserRoles';
import type { RoleAssignment } from '@/lib/types/role';
import { RoleEnum } from '@/lib/types/role';

// Mock the useUserRoles hook
jest.mock('@/lib/hooks/useUserRoles');

// Mock the RemoveRoleDialog component
jest.mock('../RemoveRoleDialog', () => ({
  RemoveRoleDialog: ({ isOpen, onClose, roleId, roleName, tenantName }: any) => (
    isOpen ? (
      <div data-testid="remove-role-dialog">
        <p>Remove {roleName} from {tenantName}?</p>
        <button onClick={onClose}>Cancel</button>
        <button onClick={() => onClose()}>Confirm</button>
      </div>
    ) : null
  ),
}));

const mockRoles: RoleAssignment[] = [
  {
    id: 'role-1',
    user_id: 'user-123',
    tenant_id: 'tenant-abc',
    tenant_name: 'Acme Corp',
    role: RoleEnum.SUPER_ADMIN,
    created_at: '2024-01-15T10:00:00Z',
    created_by: 'admin-user',
  },
  {
    id: 'role-2',
    user_id: 'user-123',
    tenant_id: 'tenant-xyz',
    tenant_name: 'Tech Inc',
    role: RoleEnum.DEVELOPER,
    created_at: '2024-02-20T14:30:00Z',
    created_by: 'admin-user',
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

describe('CurrentAssignmentsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Loading state (AC-10)
  test('renders loading state with skeleton rows (AC-10: loading state)', () => {
    (useUserRoles as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<CurrentAssignmentsTable userId="user-123" />, { wrapper: createWrapper() });

    // Should render 3 skeleton rows
    const skeletons = screen.getAllByLabelText('Loading role assignments');
    expect(skeletons).toHaveLength(3);
  });

  // Test 2: Error state (AC-10)
  test('renders error state with retry button (AC-10: error state)', () => {
    const mockRefetch = jest.fn();
    const mockError = new Error('Failed to fetch roles');

    (useUserRoles as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: mockError,
      refetch: mockRefetch,
    });

    render(<CurrentAssignmentsTable userId="user-123" />, { wrapper: createWrapper() });

    expect(screen.getByText('Failed to load role assignments')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch roles')).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  // Test 3: Empty state (AC-10)
  test('renders empty state when no roles assigned (AC-10: empty state)', () => {
    (useUserRoles as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<CurrentAssignmentsTable userId="user-123" />, { wrapper: createWrapper() });

    expect(screen.getByText('No role assignments yet. Assign a role below to get started.')).toBeInTheDocument();
  });

  // Test 4: Renders desktop table with role data (AC-3)
  test('renders desktop table with role assignments (AC-3: table display)', () => {
    (useUserRoles as jest.Mock).mockReturnValue({
      data: mockRoles,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<CurrentAssignmentsTable userId="user-123" />, { wrapper: createWrapper() });

    // Check table headers (desktop view)
    expect(screen.getByText('Tenant')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();

    // Check role data is displayed
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Tech Inc')).toBeInTheDocument();
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  // Test 5: Color-coded role badges (AC-3)
  test('displays color-coded role badges (AC-3: role badges)', () => {
    (useUserRoles as jest.Mock).mockReturnValue({
      data: mockRoles,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { container } = render(<CurrentAssignmentsTable userId="user-123" />, { wrapper: createWrapper() });

    // Super Admin badge should have red background
    const superAdminBadge = screen.getByText('Super Admin').parentElement;
    expect(superAdminBadge).toHaveClass('bg-red-100', 'text-red-800');

    // Developer badge should have green background
    const developerBadge = screen.getByText('Developer').parentElement;
    expect(developerBadge).toHaveClass('bg-green-100', 'text-green-800');
  });

  // Test 6: Remove button triggers dialog (AC-5)
  test('clicking remove button opens confirmation dialog (AC-5: remove button)', async () => {
    (useUserRoles as jest.Mock).mockReturnValue({
      data: mockRoles,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<CurrentAssignmentsTable userId="user-123" />, { wrapper: createWrapper() });

    // Find and click the first remove button
    const removeButtons = screen.getAllByLabelText(/remove .* role from .*/i);
    fireEvent.click(removeButtons[0]);

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByTestId('remove-role-dialog')).toBeInTheDocument();
      expect(screen.getByText(/Remove Super Admin from Acme Corp?/i)).toBeInTheDocument();
    });
  });

  // Test 7: Remove button has accessible label (AC-5 + WCAG 2.1 AA)
  test('remove buttons have accessible aria-labels (AC-5: accessibility)', () => {
    (useUserRoles as jest.Mock).mockReturnValue({
      data: mockRoles,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<CurrentAssignmentsTable userId="user-123" />, { wrapper: createWrapper() });

    expect(screen.getByLabelText('Remove Super Admin role from Acme Corp')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Developer role from Tech Inc')).toBeInTheDocument();
  });

  // Test 8: Mobile responsive cards (AC-9)
  test('renders mobile card layout for small screens (AC-9: mobile responsive)', () => {
    (useUserRoles as jest.Mock).mockReturnValue({
      data: mockRoles,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { container } = render(<CurrentAssignmentsTable userId="user-123" />, { wrapper: createWrapper() });

    // Desktop table should have hidden class on mobile (md:block)
    const desktopTable = container.querySelector('.hidden.md\\:block');
    expect(desktopTable).toBeInTheDocument();

    // Mobile cards should have visible class (md:hidden)
    const mobileCards = container.querySelector('.md\\:hidden.space-y-3');
    expect(mobileCards).toBeInTheDocument();
  });

  // Test 9: Shows created date in mobile view (AC-9)
  test('displays created date in mobile card view (AC-9: mobile details)', () => {
    (useUserRoles as jest.Mock).mockReturnValue({
      data: mockRoles,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<CurrentAssignmentsTable userId="user-123" />, { wrapper: createWrapper() });

    // Mobile view should show "Assigned: <date>"
    const assignedDates = screen.getAllByText(/Assigned:/);
    expect(assignedDates.length).toBeGreaterThan(0);
  });

  // Test 10: All roles are rendered
  test('renders all role assignments from API (AC-3: complete data)', () => {
    const threeRoles: RoleAssignment[] = [
      ...mockRoles,
      {
        id: 'role-3',
        user_id: 'user-123',
        tenant_id: 'tenant-def',
        tenant_name: 'Global Systems',
        role: RoleEnum.VIEWER,
        created_at: '2024-03-10T09:15:00Z',
        created_by: 'admin-user',
      },
    ];

    (useUserRoles as jest.Mock).mockReturnValue({
      data: threeRoles,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<CurrentAssignmentsTable userId="user-123" />, { wrapper: createWrapper() });

    // All three tenants should be visible
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Tech Inc')).toBeInTheDocument();
    expect(screen.getByText('Global Systems')).toBeInTheDocument();

    // All three roles should be visible
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
    expect(screen.getByText('Viewer')).toBeInTheDocument();
  });
});
