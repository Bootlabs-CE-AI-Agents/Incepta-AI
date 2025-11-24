/**
 * Unit Tests for AssignRoleForm component
 *
 * Tests cover:
 * - Story 26 AC-4: Tenant and role dropdowns with assign button
 * - Story 26 AC-6: Tenant scoping (super_admin vs tenant_admin)
 * - Story 26 AC-7: Role dropdown with display names and descriptions
 * - Form validation and submission
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { AssignRoleForm } from '../AssignRoleForm';
import { useTenants } from '@/lib/hooks/useTenants';
import { useAvailableRoles } from '@/lib/hooks/useRoles';
import { useAssignRole } from '@/lib/hooks/useUserRoles';
import { RoleEnum } from '@/lib/types/role';

// Mock the hooks
jest.mock('@/lib/hooks/useTenants');
jest.mock('@/lib/hooks/useRoles');
jest.mock('@/lib/hooks/useUserRoles');

const mockTenants = [
  { id: 'uuid-1', tenant_id: 'tenant-abc', name: 'Acme Corp' },
  { id: 'uuid-2', tenant_id: 'tenant-xyz', name: 'Tech Inc' },
  { id: 'uuid-3', tenant_id: 'tenant-def', name: 'Global Systems' },
];

const mockRoles = [
  {
    role: RoleEnum.SUPER_ADMIN,
    display_name: 'Super Admin',
    description: 'Full system access',
  },
  {
    role: RoleEnum.TENANT_ADMIN,
    display_name: 'Tenant Admin',
    description: 'Tenant management',
  },
  {
    role: RoleEnum.DEVELOPER,
    display_name: 'Developer',
    description: 'Development access',
  },
  {
    role: RoleEnum.OPERATOR,
    display_name: 'Operator',
    description: 'Operational access',
  },
  {
    role: RoleEnum.VIEWER,
    display_name: 'Viewer',
    description: 'Read-only access',
  },
];

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

describe('AssignRoleForm', () => {
  const mockAssignRole = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useTenants as jest.Mock).mockReturnValue({
      data: mockTenants,
      isLoading: false,
    });

    (useAvailableRoles as jest.Mock).mockReturnValue({
      data: mockRoles,
      isLoading: false,
    });

    (useAssignRole as jest.Mock).mockReturnValue({
      mutate: mockAssignRole,
      isPending: false,
    });
  });

  // Test 1: Renders tenant and role dropdowns (AC-4)
  test('renders tenant and role dropdowns (AC-4: form fields)', () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'admin@example.com',
        role: 'super_admin',
        default_tenant_id: 'tenant-abc',
      },
    };

    render(<AssignRoleForm userId="user-456" />, {
      wrapper: createWrapper(mockSession),
    });

    expect(screen.getByLabelText(/tenant/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /assign/i })).toBeInTheDocument();
  });

  // Test 2: Super admin can select all tenants (AC-6)
  test('super admin can select from all tenants (AC-6: super_admin tenant access)', () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'admin@example.com',
        role: 'super_admin',
        default_tenant_id: 'tenant-abc',
      },
    };

    render(<AssignRoleForm userId="user-456" />, {
      wrapper: createWrapper(mockSession),
    });

    const tenantSelect = screen.getByLabelText(/tenant/i) as HTMLSelectElement;

    // Should not be disabled for super_admin
    expect(tenantSelect).not.toBeDisabled();

    // Should have all tenant options
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Tech Inc')).toBeInTheDocument();
    expect(screen.getByText('Global Systems')).toBeInTheDocument();
  });

  // Test 3: Tenant admin sees only their tenant (AC-6)
  test('tenant admin sees only their own tenant (AC-6: tenant_admin scoping)', async () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'tenant-admin@example.com',
        role: 'tenant_admin',
        default_tenant_id: 'tenant-abc', // Matches uuid-1
      },
    };

    render(<AssignRoleForm userId="user-456" />, {
      wrapper: createWrapper(mockSession),
    });

    const tenantSelect = screen.getByLabelText(/tenant/i) as HTMLSelectElement;

    // Should be disabled for tenant_admin
    expect(tenantSelect).toBeDisabled();

    // Should be pre-selected to their tenant
    await waitFor(() => {
      expect(tenantSelect.value).toBe('tenant-abc');
    });

    // Should show helper text
    expect(screen.getByText(/you can only assign roles for your own tenant/i)).toBeInTheDocument();
  });

  // Test 4: Role dropdown shows all 5 roles with descriptions (AC-7)
  test('role dropdown shows all 5 roles with descriptions (AC-7: role options)', () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'admin@example.com',
        role: 'super_admin',
        default_tenant_id: 'tenant-abc',
      },
    };

    render(<AssignRoleForm userId="user-456" />, {
      wrapper: createWrapper(mockSession),
    });

    // Check that all 5 roles are present with descriptions
    expect(screen.getByText('Super Admin - Full system access')).toBeInTheDocument();
    expect(screen.getByText('Tenant Admin - Tenant management')).toBeInTheDocument();
    expect(screen.getByText('Developer - Development access')).toBeInTheDocument();
    expect(screen.getByText('Operator - Operational access')).toBeInTheDocument();
    expect(screen.getByText('Viewer - Read-only access')).toBeInTheDocument();
  });

  // Test 5: Assign button disabled when fields empty (AC-4)
  test('assign button disabled when fields are empty (AC-4: form validation)', () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'admin@example.com',
        role: 'super_admin',
        default_tenant_id: 'tenant-abc',
      },
    };

    render(<AssignRoleForm userId="user-456" />, {
      wrapper: createWrapper(mockSession),
    });

    const assignButton = screen.getByRole('button', { name: /assign/i });

    // Should be disabled when fields are empty
    expect(assignButton).toBeDisabled();
  });

  // Test 6: Assign button enabled when fields filled (AC-4)
  test('assign button enabled when both fields are filled (AC-4: form validation)', () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'admin@example.com',
        role: 'super_admin',
        default_tenant_id: 'tenant-abc',
      },
    };

    render(<AssignRoleForm userId="user-456" />, {
      wrapper: createWrapper(mockSession),
    });

    const tenantSelect = screen.getByLabelText(/tenant/i);
    const roleSelect = screen.getByLabelText(/role/i);
    const assignButton = screen.getByRole('button', { name: /assign/i });

    // Fill in both fields
    fireEvent.change(tenantSelect, { target: { value: 'tenant-abc' } });
    fireEvent.change(roleSelect, { target: { value: RoleEnum.DEVELOPER } });

    // Button should now be enabled
    expect(assignButton).not.toBeDisabled();
  });

  // Test 7: Form submission calls assignRole mutation (AC-4 + AC-8)
  test('form submission calls assignRole with correct data (AC-4: form submission)', async () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'admin@example.com',
        role: 'super_admin',
        default_tenant_id: 'tenant-abc',
      },
    };

    render(<AssignRoleForm userId="user-456" />, {
      wrapper: createWrapper(mockSession),
    });

    const tenantSelect = screen.getByLabelText(/tenant/i);
    const roleSelect = screen.getByLabelText(/role/i);
    const assignButton = screen.getByRole('button', { name: /assign/i });

    // Fill form
    fireEvent.change(tenantSelect, { target: { value: 'tenant-xyz' } });
    fireEvent.change(roleSelect, { target: { value: RoleEnum.OPERATOR } });

    // Submit form
    fireEvent.click(assignButton);

    await waitFor(() => {
      expect(mockAssignRole).toHaveBeenCalledWith(
        {
          tenant_id: 'tenant-xyz', // CRITICAL: Uses VARCHAR tenant_id, not UUID id
          role: RoleEnum.OPERATOR,
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
        })
      );
    });
  });

  // Test 8: Form resets after successful assignment (AC-4 + AC-8)
  test('form resets after successful assignment (AC-4: form reset)', async () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'admin@example.com',
        role: 'super_admin',
        default_tenant_id: 'tenant-abc',
      },
    };

    // Mock successful mutation
    (useAssignRole as jest.Mock).mockReturnValue({
      mutate: (_data: any, options: any) => {
        options.onSuccess();
      },
      isPending: false,
    });

    render(<AssignRoleForm userId="user-456" />, {
      wrapper: createWrapper(mockSession),
    });

    const tenantSelect = screen.getByLabelText(/tenant/i) as HTMLSelectElement;
    const roleSelect = screen.getByLabelText(/role/i) as HTMLSelectElement;

    // Fill form
    fireEvent.change(tenantSelect, { target: { value: 'tenant-abc' } });
    fireEvent.change(roleSelect, { target: { value: RoleEnum.DEVELOPER } });

    // Submit
    const assignButton = screen.getByRole('button', { name: /assign/i });
    fireEvent.click(assignButton);

    // Form should reset (for super_admin)
    await waitFor(() => {
      expect(roleSelect.value).toBe('');
    });
  });

  // Test 9: Loading state during tenant/role fetch (AC-4)
  test('shows loading state while fetching tenants and roles (AC-4: loading)', () => {
    (useTenants as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    (useAvailableRoles as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const mockSession = {
      user: {
        id: 'user-123',
        email: 'admin@example.com',
        role: 'super_admin',
        default_tenant_id: 'tenant-abc',
      },
    };

    render(<AssignRoleForm userId="user-456" />, {
      wrapper: createWrapper(mockSession),
    });

    expect(screen.getByText('Loading tenants...')).toBeInTheDocument();
    expect(screen.getByText('Loading roles...')).toBeInTheDocument();
  });

  // Test 10: Loading state during assignment (AC-4 + AC-8)
  test('shows loading state during role assignment (AC-4: submit loading)', () => {
    (useAssignRole as jest.Mock).mockReturnValue({
      mutate: mockAssignRole,
      isPending: true,
    });

    const mockSession = {
      user: {
        id: 'user-123',
        email: 'admin@example.com',
        role: 'super_admin',
        default_tenant_id: 'tenant-abc',
      },
    };

    render(<AssignRoleForm userId="user-456" />, {
      wrapper: createWrapper(mockSession),
    });

    // Button should show loading state
    const assignButton = screen.getByRole('button', { name: /assigning/i });
    expect(assignButton).toBeInTheDocument();
    expect(assignButton).toBeDisabled();
  });
});
