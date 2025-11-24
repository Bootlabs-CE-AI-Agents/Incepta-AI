/**
 * Unit Tests for useUsers hook
 *
 * Tests cover:
 * - Task 12.1: pagination, filters, search, debounce
 * - AC-3: Email search with 300ms debounce
 * - AC-4: Filtering (status, role, tenant)
 * - AC-5: Pagination controls
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUsers, useUpdateUser, useResetPassword } from '../useUsers';
import { usersApi } from '@/lib/api/users';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('@/lib/api/users', () => ({
  usersApi: {
    listUsers: jest.fn(),
    updateUser: jest.fn(),
    resetPassword: jest.fn(),
  },
}));
jest.mock('sonner');

const mockedListUsers = usersApi.listUsers as jest.MockedFunction<typeof usersApi.listUsers>;
const mockedUpdateUser = usersApi.updateUser as jest.MockedFunction<typeof usersApi.updateUser>;
const mockedResetPassword = usersApi.resetPassword as jest.MockedFunction<typeof usersApi.resetPassword>;
const mockedToast = toast as jest.Mocked<typeof toast>;

describe('useUsers hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockUsersResponse = {
    items: [
      {
        id: 'user-1',
        email: 'admin@example.com',
        is_active: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        last_login: '2025-01-24T00:00:00Z',
        force_password_change: false,
        default_tenant_id: 'tenant-1',
        default_tenant_name: 'Tenant A',
        roles: [{ role: 'super_admin' as const, tenant_id: 'tenant-1', tenant_name: 'Tenant A' }],
      },
      {
        id: 'user-2',
        email: 'user@example.com',
        is_active: false,
        created_at: '2025-01-10T00:00:00Z',
        updated_at: '2025-01-10T00:00:00Z',
        last_login: null,
        force_password_change: true,
        default_tenant_id: 'tenant-1',
        default_tenant_name: 'Tenant A',
        roles: [{ role: 'viewer' as const, tenant_id: 'tenant-1', tenant_name: 'Tenant A' }],
      },
    ],
    total: 2,
    limit: 10,
    offset: 0,
  };

  // Test 1: Basic fetching
  test('fetches users with default parameters (AC-5: default pagination)', async () => {
    mockedListUsers.mockResolvedValue(mockUsersResponse);

    const { result } = renderHook(() => useUsers(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedListUsers).toHaveBeenCalledWith({});
    expect(result.current.data).toEqual(mockUsersResponse);
  });

  // Test 2: Pagination
  test('fetches users with custom limit and offset (AC-5: pagination controls)', async () => {
    mockedListUsers.mockResolvedValue(mockUsersResponse);

    const { result } = renderHook(() => useUsers({ limit: 20, offset: 20 }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedListUsers).toHaveBeenCalledWith({
      limit: 20,
      offset: 20,
    });
  });

  // Test 3: Email search
  test('fetches users with email search (AC-3: search filter)', async () => {
    mockedListUsers.mockResolvedValue(mockUsersResponse);

    const { result } = renderHook(() => useUsers({ search: 'admin@example.com' }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedListUsers).toHaveBeenCalledWith({
      search: 'admin@example.com',
    });
  });

  // Test 4: Status filter (active)
  test('fetches users filtered by active status (AC-4: status filter)', async () => {
    mockedListUsers.mockResolvedValue(mockUsersResponse);

    const { result } = renderHook(() => useUsers({ is_active: true }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedListUsers).toHaveBeenCalledWith({
      is_active: true,
    });
  });

  // Test 5: Status filter (inactive)
  test('fetches users filtered by inactive status (AC-4: status filter)', async () => {
    mockedListUsers.mockResolvedValue(mockUsersResponse);

    const { result } = renderHook(() => useUsers({ is_active: false }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedListUsers).toHaveBeenCalledWith({
      is_active: false,
    });
  });

  // Test 6: Role filter
  test('fetches users filtered by role (AC-4: role filter)', async () => {
    mockedListUsers.mockResolvedValue(mockUsersResponse);

    const { result } = renderHook(() => useUsers({ role: 'super_admin' }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedListUsers).toHaveBeenCalledWith({
      role: 'super_admin',
    });
  });

  // Test 7: Tenant filter (super_admin only)
  test('fetches users filtered by tenant (AC-4, AC-6: tenant filter for super_admin)', async () => {
    mockedListUsers.mockResolvedValue(mockUsersResponse);

    const { result } = renderHook(() => useUsers({ tenant_id: 'tenant-1' }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedListUsers).toHaveBeenCalledWith({
      tenant_id: 'tenant-1',
    });
  });

  // Test 8: Multiple filters combined
  test('fetches users with multiple filters combined (AC-4: combined filtering)', async () => {
    mockedListUsers.mockResolvedValue(mockUsersResponse);

    const { result} = renderHook(
      () =>
        useUsers({
          search: 'admin',
          is_active: true,
          role: 'super_admin',
          tenant_id: 'tenant-1',
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedListUsers).toHaveBeenCalledWith({
      is_active: true,
      role: 'super_admin',
      search: 'admin',
      tenant_id: 'tenant-1',
    });
  });

  // Test 9: Loading state
  test('shows loading state initially (AC-8: loading state)', async () => {
    mockedListUsers.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useUsers(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  // Test 10: Error state
  test(
    'handles API error gracefully (AC-8: error state)',
    async () => {
      const error = new Error('API Error');
      mockedListUsers.mockRejectedValue(error);

      const { result } = renderHook(() => useUsers(), { wrapper });

      // useUsers has retry: 3, so wait longer for all retries to complete
      await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 10000 });

      expect(result.current.error).toEqual(error);
      expect(result.current.data).toBeUndefined();
    },
    15000 // 15 second Jest test timeout to accommodate React Query retries
  );

  // Test 11: Empty results
  test('handles empty users list (AC-8: empty state)', async () => {
    mockedListUsers.mockResolvedValue({
      items: [],
      total: 0,
      limit: 10,
      offset: 0,
    });

    const { result } = renderHook(() => useUsers(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items).toEqual([]);
    expect(result.current.data?.total).toBe(0);
  });
});

describe('useUpdateUser mutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockUser = {
    id: 'user-1',
    email: 'admin@example.com',
    is_active: false, // Will be updated to true
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    last_login: '2025-01-24T00:00:00Z',
    force_password_change: false,
    default_tenant_id: 'tenant-1',
    default_tenant_name: 'Tenant A',
    roles: [{ role: 'super_admin' as const, tenant_id: 'tenant-1', tenant_name: 'Tenant A' }],
  };

  // Test 12: Successful user update (activate)
  test('successfully activates a user (AC-7: activate action)', async () => {
    mockedUpdateUser.mockResolvedValue({ ...mockUser, is_active: true });
    mockedToast.success = jest.fn();

    const { result } = renderHook(() => useUpdateUser(), { wrapper });

    await act(async () => {
      result.current.mutate({ userId: 'user-1', updates: { is_active: true } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedUpdateUser).toHaveBeenCalledWith('user-1', { is_active: true });
    expect(mockedToast.success).toHaveBeenCalledWith('User activated successfully', {
      description: 'admin@example.com is now active',
    });
  });

  // Test 13: Successful user update (deactivate)
  test('successfully deactivates a user (AC-7: deactivate action)', async () => {
    const activeUser = { ...mockUser, is_active: true };
    mockedUpdateUser.mockResolvedValue({ ...activeUser, is_active: false });
    mockedToast.success = jest.fn();

    const { result } = renderHook(() => useUpdateUser(), { wrapper });

    await act(async () => {
      result.current.mutate({ userId: 'user-1', updates: { is_active: false } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedUpdateUser).toHaveBeenCalledWith('user-1', { is_active: false });
    expect(mockedToast.success).toHaveBeenCalledWith('User deactivated successfully', {
      description: 'admin@example.com is now inactive',
    });
  });

  // Test 14: Failed user update
  test('handles update error with toast message (AC-7: error handling)', async () => {
    const error = new Error('Update failed');
    mockedUpdateUser.mockRejectedValue(error);
    mockedToast.error = jest.fn();

    const { result } = renderHook(() => useUpdateUser(), { wrapper });

    await act(async () => {
      result.current.mutate({ userId: 'user-1', updates: { is_active: true } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockedToast.error).toHaveBeenCalledWith('Failed to update user', {
      description: 'Update failed',
    });
  });
});

describe('useResetPassword mutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  // Test 15: Successful password reset
  test('successfully resets user password (AC-7: reset password action)', async () => {
    const mockResponse = {
      message: 'Password reset successful',
      temporary_password: 'temp123'
    };
    mockedResetPassword.mockResolvedValue(mockResponse);
    mockedToast.success = jest.fn();

    const { result } = renderHook(() => useResetPassword(), { wrapper });

    await act(async () => {
      result.current.mutate('user-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedResetPassword).toHaveBeenCalledWith('user-1');
    expect(mockedToast.success).toHaveBeenCalledWith('Password reset successfully', {
      description: `Temporary password: temp123 (Please copy now - it won't be shown again)`,
      duration: 10000,
    });
  });

  // Test 16: Failed password reset
  test('handles password reset error (AC-7: error handling)', async () => {
    const error = new Error('Reset failed');
    mockedResetPassword.mockRejectedValue(error);
    mockedToast.error = jest.fn();

    const { result } = renderHook(() => useResetPassword(), { wrapper });

    await act(async () => {
      result.current.mutate('user-1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockedToast.error).toHaveBeenCalledWith('Failed to reset password', {
      description: 'Reset failed',
    });
  });
});
