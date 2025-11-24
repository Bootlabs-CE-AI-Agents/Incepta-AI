/**
 * Unit Tests for UserFilters component
 *
 * Tests cover:
 * - Task 12.4: Filter dropdowns (status, role, tenant) with selection and URL sync
 * - AC-4: Filtering by status, role, tenant
 * - AC-6: RBAC enforcement (tenant filter only for super_admin)
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { UserFilters } from '../UserFilters';

describe('UserFilters', () => {
  const mockOnStatusChange = jest.fn();
  const mockOnRoleChange = jest.fn();
  const mockOnTenantChange = jest.fn();

  const defaultProps = {
    statusFilter: undefined,
    roleFilter: undefined,
    tenantFilter: undefined,
    onStatusChange: mockOnStatusChange,
    onRoleChange: mockOnRoleChange,
    onTenantChange: mockOnTenantChange,
    isSuperAdmin: false,
    tenants: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Renders status filter dropdown
  test('renders status filter dropdown with all options (AC-4: status filter)', () => {
    render(<UserFilters {...defaultProps} />);

    const statusSelect = screen.getByLabelText('Status');
    expect(statusSelect).toBeInTheDocument();

    // Check options exist (All, Active, Inactive)
    const options = statusSelect.querySelectorAll('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('All');
    expect(options[1]).toHaveTextContent('Active');
    expect(options[2]).toHaveTextContent('Inactive');
  });

  // Test 2: Renders role filter dropdown
  test('renders role filter dropdown with all role options (AC-4: role filter)', () => {
    render(<UserFilters {...defaultProps} />);

    const roleSelect = screen.getByLabelText('Role');
    expect(roleSelect).toBeInTheDocument();

    // Check role options exist (All Roles, Admin, Tenant Admin, Developer, Operator, Viewer)
    const options = roleSelect.querySelectorAll('option');
    expect(options).toHaveLength(6);
    expect(options[0]).toHaveTextContent('All Roles');
    expect(options[1]).toHaveTextContent('Admin');
    expect(options[2]).toHaveTextContent('Tenant Admin');
    expect(options[3]).toHaveTextContent('Developer');
    expect(options[4]).toHaveTextContent('Operator');
    expect(options[5]).toHaveTextContent('Viewer');
  });

  // Test 3: Status filter change to Active
  test('calls onStatusChange with true when Active is selected (AC-4: status filter interaction)', () => {
    render(<UserFilters {...defaultProps} />);

    const statusSelect = screen.getByLabelText('Status');
    fireEvent.change(statusSelect, { target: { value: 'active' } });

    expect(mockOnStatusChange).toHaveBeenCalledWith(true);
  });

  // Test 4: Status filter change to Inactive
  test('calls onStatusChange with false when Inactive is selected (AC-4: status filter interaction)', () => {
    render(<UserFilters {...defaultProps} />);

    const statusSelect = screen.getByLabelText('Status');
    fireEvent.change(statusSelect, { target: { value: 'inactive' } });

    expect(mockOnStatusChange).toHaveBeenCalledWith(false);
  });

  // Test 5: Status filter clear (All)
  test('calls onStatusChange with undefined when All is selected (AC-4: clear filter)', () => {
    render(<UserFilters {...defaultProps} statusFilter={true} />);

    const statusSelect = screen.getByLabelText('Status');
    fireEvent.change(statusSelect, { target: { value: 'all' } });

    expect(mockOnStatusChange).toHaveBeenCalledWith(undefined);
  });

  // Test 6: Role filter change
  test('calls onRoleChange when a role is selected (AC-4: role filter interaction)', () => {
    render(<UserFilters {...defaultProps} />);

    const roleSelect = screen.getByLabelText('Role');
    fireEvent.change(roleSelect, { target: { value: 'super_admin' } });

    expect(mockOnRoleChange).toHaveBeenCalledWith('super_admin');
  });

  // Test 7: Role filter clear (All Roles)
  test('calls onRoleChange with undefined when All Roles is selected (AC-4: clear filter)', () => {
    render(<UserFilters {...defaultProps} roleFilter={'developer' as const} />);

    const roleSelect = screen.getByLabelText('Role');
    fireEvent.change(roleSelect, { target: { value: 'all' } });

    expect(mockOnRoleChange).toHaveBeenCalledWith(undefined);
  });

  // Test 8: Tenant filter not shown for non-super_admin
  test('does not show tenant filter for non-super_admin users (AC-6: RBAC enforcement)', () => {
    render(<UserFilters {...defaultProps} isSuperAdmin={false} tenants={[{ id: 't1', name: 'Tenant A' }]} />);

    const tenantSelect = screen.queryByLabelText('Tenant');
    expect(tenantSelect).not.toBeInTheDocument();
  });

  // Test 9: Tenant filter shown for super_admin
  test('shows tenant filter for super_admin users (AC-6: super_admin privilege)', () => {
    render(<UserFilters {...defaultProps} isSuperAdmin={true} tenants={[{ id: 't1', name: 'Tenant A' }]} />);

    const tenantSelect = screen.getByLabelText('Tenant');
    expect(tenantSelect).toBeInTheDocument();
  });

  // Test 10: Tenant filter has correct options
  test('tenant filter displays all tenant options (AC-6: tenant filter)', () => {
    const tenants = [
      { id: 't1', name: 'Tenant A' },
      { id: 't2', name: 'Tenant B' },
    ];

    render(<UserFilters {...defaultProps} isSuperAdmin={true} tenants={tenants} />);

    const tenantSelect = screen.getByLabelText('Tenant');
    const options = tenantSelect.querySelectorAll('option');

    expect(options).toHaveLength(3); // All Tenants + 2 tenants
    expect(options[0]).toHaveTextContent('All Tenants');
    expect(options[1]).toHaveTextContent('Tenant A');
    expect(options[2]).toHaveTextContent('Tenant B');
  });

  // Test 11: Tenant filter change
  test('calls onTenantChange when a tenant is selected (AC-6: tenant filter interaction)', () => {
    const tenants = [{ id: 't1', name: 'Tenant A' }];

    render(<UserFilters {...defaultProps} isSuperAdmin={true} tenants={tenants} />);

    const tenantSelect = screen.getByLabelText('Tenant');
    fireEvent.change(tenantSelect, { target: { value: 't1' } });

    expect(mockOnTenantChange).toHaveBeenCalledWith('t1');
  });

  // Test 12: Tenant filter clear (All Tenants)
  test('calls onTenantChange with undefined when All Tenants is selected (AC-6: clear filter)', () => {
    const tenants = [{ id: 't1', name: 'Tenant A' }];

    render(<UserFilters {...defaultProps} isSuperAdmin={true} tenants={tenants} tenantFilter="t1" />);

    const tenantSelect = screen.getByLabelText('Tenant');
    fireEvent.change(tenantSelect, { target: { value: 'all' } });

    expect(mockOnTenantChange).toHaveBeenCalledWith(undefined);
  });

  // Test 13: Controlled status value (active)
  test('displays correct value when statusFilter is true (AC-4: controlled component)', () => {
    render(<UserFilters {...defaultProps} statusFilter={true} />);

    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
    expect(statusSelect.value).toBe('active');
  });

  // Test 14: Controlled status value (inactive)
  test('displays correct value when statusFilter is false (AC-4: controlled component)', () => {
    render(<UserFilters {...defaultProps} statusFilter={false} />);

    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
    expect(statusSelect.value).toBe('inactive');
  });

  // Test 15: Controlled role value
  test('displays correct value when roleFilter is set (AC-4: controlled component)', () => {
    render(<UserFilters {...defaultProps} roleFilter={'developer' as const} />);

    const roleSelect = screen.getByLabelText('Role') as HTMLSelectElement;
    expect(roleSelect.value).toBe('developer');
  });
});
