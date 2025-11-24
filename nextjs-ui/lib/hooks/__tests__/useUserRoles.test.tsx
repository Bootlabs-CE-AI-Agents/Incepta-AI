/**
 * Integration Tests for useUserRoles hooks with MSW
 *
 * Tests cover:
 * - Story 26 AC-3: Fetching user roles
 * - Story 26 AC-4: Assigning roles with validation
 * - Story 26 AC-5: Removing roles
 * - Story 26 AC-8: Optimistic UI updates with rollback
 * - Error handling (400, 403, 404, 409)
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useUserRoles, useAssignRole, useRemoveRole, userRoleKeys } from '../useUserRoles';
import { rolesApi } from '@/lib/api/roles';
import { toast } from 'sonner';
import { RoleEnum } from '@/lib/types/role';
import type { RoleAssignment } from '@/lib/types/role';

// Mock dependencies
jest.mock('@/lib/api/roles', () => ({
  rolesApi: {
    fetchUserRoles: jest.fn(),
    assignRole: jest.fn(),
    removeRole: jest.fn(),
  },
}));
jest.mock('sonner');

const mockedFetchUserRoles = rolesApi.fetchUserRoles as jest.MockedFunction<typeof rolesApi.fetchUserRoles>;
const mockedAssignRole = rolesApi.assignRole as jest.MockedFunction<typeof rolesApi.assignRole>;
const mockedRemoveRole = rolesApi.removeRole as jest.MockedFunction<typeof rolesApi.removeRole>;
const mockedToast = toast as jest.Mocked<typeof toast>;

describe('useUserRoles hooks', () => {
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

  describe('useUserRoles - Fetching roles (AC-3)', () => {
    // Test 1: Successfully fetch user roles
    test('fetches user roles successfully (AC-3: fetch roles)', async () => {
      mockedFetchUserRoles.mockResolvedValue(mockRoles);

      const { result } = renderHook(() => useUserRoles('user-123'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedFetchUserRoles).toHaveBeenCalledWith('user-123');
      expect(result.current.data).toEqual(mockRoles);
      expect(result.current.data).toHaveLength(2);
    });

    // Test 2: Empty roles array
    test('returns empty array when user has no roles (AC-3: empty state)', async () => {
      mockedFetchUserRoles.mockResolvedValue([]);

      const { result } = renderHook(() => useUserRoles('user-456'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
      expect(result.current.data).toHaveLength(0);
    });

    // Test 3: Error handling
    test('handles fetch error correctly (AC-3: error handling)', async () => {
      const error = new Error('Failed to fetch roles');
      mockedFetchUserRoles.mockRejectedValue(error);

      const { result } = renderHook(() => useUserRoles('user-123'), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(error);
      expect(result.current.data).toBeUndefined();
    });

    // Test 4: Caching behavior
    test('uses cached data on subsequent calls (AC-3: caching)', async () => {
      mockedFetchUserRoles.mockResolvedValue(mockRoles);

      const { result: result1 } = renderHook(() => useUserRoles('user-123'), { wrapper });
      await waitFor(() => expect(result1.current.isSuccess).toBe(true));

      // Second hook call should use cache
      const { result: result2 } = renderHook(() => useUserRoles('user-123'), { wrapper });
      await waitFor(() => expect(result2.current.isSuccess).toBe(true));

      // API should only be called once due to caching
      expect(mockedFetchUserRoles).toHaveBeenCalledTimes(1);
      expect(result2.current.data).toEqual(mockRoles);
    });
  });

  describe('useAssignRole - Assigning roles (AC-4, AC-8)', () => {
    // Test 5: Successfully assign role
    test('assigns role successfully (AC-4: assign role)', async () => {
      const newRole: RoleAssignment = {
        id: 'role-3',
        user_id: 'user-123',
        tenant_id: 'tenant-def',
        tenant_name: 'Global Systems',
        role: RoleEnum.OPERATOR,
        created_at: '2024-03-10T09:15:00Z',
        created_by: 'admin-user',
      };

      mockedAssignRole.mockResolvedValue(newRole);

      const { result } = renderHook(() => useAssignRole('user-123'), { wrapper });

      await act(async () => {
        result.current.mutate({
          tenant_id: 'tenant-def',
          role: RoleEnum.OPERATOR,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedAssignRole).toHaveBeenCalledWith('user-123', {
        tenant_id: 'tenant-def',
        role: RoleEnum.OPERATOR,
      });
      expect(mockedToast.success).toHaveBeenCalledWith('Role assigned successfully', {
        description: 'Assigned operator role for Global Systems',
      });
    });

    // Test 6: Optimistic update adds role immediately (AC-8)
    test('optimistically adds role before API confirmation (AC-8: optimistic update)', async () => {
      // Pre-populate cache with existing roles
      queryClient.setQueryData(userRoleKeys.user('user-123'), mockRoles);

      const newRole: RoleAssignment = {
        id: 'role-3',
        user_id: 'user-123',
        tenant_id: 'tenant-def',
        tenant_name: 'Global Systems',
        role: RoleEnum.VIEWER,
        created_at: new Date().toISOString(),
        created_by: 'admin-user',
      };

      // Delay API response to observe optimistic update
      mockedAssignRole.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(newRole), 100)));

      const { result } = renderHook(() => useAssignRole('user-123'), { wrapper });

      act(() => {
        result.current.mutate({
          tenant_id: 'tenant-def',
          role: RoleEnum.VIEWER,
        });
      });

      // Check cache immediately (should have optimistic role)
      const cachedData = queryClient.getQueryData(userRoleKeys.user('user-123')) as RoleAssignment[];
      expect(cachedData).toHaveLength(3); // 2 original + 1 optimistic
      expect(cachedData[2].tenant_id).toBe('tenant-def');
      expect(cachedData[2].role).toBe(RoleEnum.VIEWER);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    // Test 7: Rollback on error (AC-8)
    test('rolls back optimistic update on error (AC-8: rollback)', async () => {
      // Pre-populate cache
      queryClient.setQueryData(userRoleKeys.user('user-123'), mockRoles);

      const error = new Error('Duplicate role assignment');
      mockedAssignRole.mockRejectedValue(error);

      const { result } = renderHook(() => useAssignRole('user-123'), { wrapper });

      await act(async () => {
        result.current.mutate({
          tenant_id: 'tenant-abc',
          role: RoleEnum.SUPER_ADMIN,
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Cache should be rolled back to original 2 roles
      const cachedData = queryClient.getQueryData(userRoleKeys.user('user-123')) as RoleAssignment[];
      expect(cachedData).toEqual(mockRoles);
      expect(cachedData).toHaveLength(2);
    });

    // Test 8: Handle 409 Duplicate error
    test('handles 409 duplicate role error (AC-4: duplicate validation)', async () => {
      const error = new AxiosError('Role already assigned');
      error.response = { status: 409, data: { detail: 'Role already assigned' }, statusText: 'Conflict', headers: {}, config: {} as any };
      mockedAssignRole.mockRejectedValue(error);

      const { result } = renderHook(() => useAssignRole('user-123'), { wrapper });

      await act(async () => {
        result.current.mutate({
          tenant_id: 'tenant-abc',
          role: RoleEnum.DEVELOPER,
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockedToast.error).toHaveBeenCalledWith(
        'Role already assigned',
        { description: 'This user already has this role for the selected tenant' }
      );
    });

    // Test 9: Handle 403 Forbidden error
    test('handles 403 forbidden error (AC-4: permission error)', async () => {
      const error = new AxiosError('Forbidden');
      error.response = { status: 403, data: { detail: 'Forbidden' }, statusText: 'Forbidden', headers: {}, config: {} as any };
      mockedAssignRole.mockRejectedValue(error);

      const { result } = renderHook(() => useAssignRole('user-123'), { wrapper });

      await act(async () => {
        result.current.mutate({
          tenant_id: 'tenant-xyz',
          role: RoleEnum.TENANT_ADMIN,
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockedToast.error).toHaveBeenCalledWith(
        'Permission denied',
        { description: 'You do not have permission to assign roles for this tenant' }
      );
    });

    // Test 10: Handle 404 Not Found error
    test('handles 404 not found error (AC-4: validation)', async () => {
      const error = new AxiosError('Not found');
      error.response = { status: 404, data: { detail: 'Not found' }, statusText: 'Not Found', headers: {}, config: {} as any };
      mockedAssignRole.mockRejectedValue(error);

      const { result } = renderHook(() => useAssignRole('user-999'), { wrapper });

      await act(async () => {
        result.current.mutate({
          tenant_id: 'tenant-abc',
          role: RoleEnum.OPERATOR,
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockedToast.error).toHaveBeenCalledWith(
        'Not found',
        { description: 'User or tenant not found' }
      );
    });
  });

  describe('useRemoveRole - Removing roles (AC-5, AC-8)', () => {
    // Test 11: Successfully remove role
    test('removes role successfully (AC-5: remove role)', async () => {
      mockedRemoveRole.mockResolvedValue();

      const { result } = renderHook(() => useRemoveRole('user-123'), { wrapper });

      await act(async () => {
        result.current.mutate({
          roleId: 'role-2',
          roleName: 'Developer',
          tenantName: 'Tech Inc',
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedRemoveRole).toHaveBeenCalledWith('user-123', 'role-2');
      expect(mockedToast.success).toHaveBeenCalledWith('Role removed successfully', {
        description: 'Removed Developer role from Tech Inc',
      });
    });

    // Test 12: Optimistic removal (AC-8)
    test('optimistically removes role before API confirmation (AC-8: optimistic removal)', async () => {
      // Pre-populate cache with 2 roles
      queryClient.setQueryData(userRoleKeys.user('user-123'), mockRoles);

      // Delay API response
      mockedRemoveRole.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const { result } = renderHook(() => useRemoveRole('user-123'), { wrapper });

      act(() => {
        result.current.mutate({
          roleId: 'role-2',
          roleName: 'Developer',
          tenantName: 'Tech Inc',
        });
      });

      // Check cache immediately (should have 1 role after optimistic removal)
      const cachedData = queryClient.getQueryData(userRoleKeys.user('user-123')) as RoleAssignment[];
      expect(cachedData).toHaveLength(1);
      expect(cachedData[0].id).toBe('role-1'); // Only super_admin role left

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    // Test 13: Rollback removal on error (AC-8)
    test('rolls back optimistic removal on error (AC-8: rollback removal)', async () => {
      // Pre-populate cache
      queryClient.setQueryData(userRoleKeys.user('user-123'), mockRoles);

      const error = new Error('Cannot remove last super_admin');
      mockedRemoveRole.mockRejectedValue(error);

      const { result } = renderHook(() => useRemoveRole('user-123'), { wrapper });

      await act(async () => {
        result.current.mutate({
          roleId: 'role-1',
          roleName: 'Super Admin',
          tenantName: 'Acme Corp',
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Cache should be rolled back to original 2 roles
      const cachedData = queryClient.getQueryData(userRoleKeys.user('user-123')) as RoleAssignment[];
      expect(cachedData).toEqual(mockRoles);
      expect(cachedData).toHaveLength(2);
    });

    // Test 14: Handle 400 Last Super Admin error
    test('handles 400 last super_admin error (AC-5: protection)', async () => {
      const error = new AxiosError('Cannot remove last super_admin');
      error.response = { status: 400, data: { detail: 'Cannot remove the last super_admin role from the system' }, statusText: 'Bad Request', headers: {}, config: {} as any };
      mockedRemoveRole.mockRejectedValue(error);

      const { result } = renderHook(() => useRemoveRole('user-123'), { wrapper });

      await act(async () => {
        result.current.mutate({
          roleId: 'role-1',
          roleName: 'Super Admin',
          tenantName: 'Acme Corp',
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockedToast.error).toHaveBeenCalledWith(
        'Cannot remove role',
        { description: 'Cannot remove the last super_admin role from the system' }
      );
    });

    // Test 15: Handle 403 Forbidden on removal
    test('handles 403 forbidden error on removal (AC-5: permission)', async () => {
      const error = new AxiosError('Forbidden');
      error.response = { status: 403, data: { detail: 'Forbidden' }, statusText: 'Forbidden', headers: {}, config: {} as any };
      mockedRemoveRole.mockRejectedValue(error);

      const { result } = renderHook(() => useRemoveRole('user-123'), { wrapper });

      await act(async () => {
        result.current.mutate({
          roleId: 'role-2',
          roleName: 'Developer',
          tenantName: 'Tech Inc',
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockedToast.error).toHaveBeenCalledWith(
        'Permission denied',
        { description: 'You do not have permission to revoke roles for this tenant' }
      );
    });

    // Test 16: Handle 404 Not Found on removal
    test('handles 404 not found error on removal (AC-5: validation)', async () => {
      const error = new AxiosError('Not found');
      error.response = { status: 404, data: { detail: 'Not found' }, statusText: 'Not Found', headers: {}, config: {} as any };
      mockedRemoveRole.mockRejectedValue(error);

      const { result } = renderHook(() => useRemoveRole('user-123'), { wrapper });

      await act(async () => {
        result.current.mutate({
          roleId: 'role-999',
          roleName: 'Developer',
          tenantName: 'Tech Inc',
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockedToast.error).toHaveBeenCalledWith(
        'Not found',
        { description: 'Role assignment not found' }
      );
    });
  });
});
