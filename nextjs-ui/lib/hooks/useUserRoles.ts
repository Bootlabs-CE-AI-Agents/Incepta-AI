/**
 * User Roles React Query Hooks
 *
 * Custom hooks for role assignment operations using TanStack Query v5
 * Implements AC-3 (fetch), AC-4 (assign), AC-5 (remove), AC-8 (optimistic updates)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { rolesApi } from '../api/roles';
import type { RoleAssignment, RoleAssignmentCreate } from '../types/role';

/**
 * Query keys for cache management (AC-8 optimistic updates)
 */
export const userRoleKeys = {
  all: ['userRoles'] as const,
  user: (userId: string) => [...userRoleKeys.all, userId] as const,
};

/**
 * Fetch user's role assignments (AC-3)
 *
 * @param userId - User ID
 * @returns UseQueryResult<RoleAssignment[], Error>
 *
 * Configuration:
 * - staleTime: 60s (prevent unnecessary refetches)
 * - retry: 3 attempts with exponential backoff
 */
export const useUserRoles = (userId: string | null) => {
  return useQuery<RoleAssignment[], Error>({
    queryKey: userRoleKeys.user(userId || ''),
    queryFn: () => rolesApi.fetchUserRoles(userId!),
    enabled: !!userId, // Only fetch if userId is provided
    staleTime: 60 * 1000, // 60 seconds
    retry: 3,
  });
};

/**
 * Assign role mutation (AC-4, AC-8)
 *
 * Implements optimistic UI updates with rollback:
 * 1. onMutate: Cancel outgoing queries + snapshot previous data + optimistically add role to cache
 * 2. onError: Rollback cache to previous snapshot + show error toast
 * 3. onSuccess: Show success toast
 * 4. onSettled: Invalidate query to refetch and ensure consistency
 *
 * @returns useMutation<RoleAssignment, Error, { userId: string; data: RoleAssignmentCreate }>
 */
export const useAssignRole = (userId: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    RoleAssignment,
    Error,
    RoleAssignmentCreate,
    { previousRoles: RoleAssignment[] | undefined }
  >({
    mutationFn: (data) => rolesApi.assignRole(userId, data),
    // AC-8: Optimistic update - add new role immediately before API confirmation
    onMutate: async (newRole) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: userRoleKeys.user(userId) });

      // Snapshot the previous value
      const previousRoles = queryClient.getQueryData<RoleAssignment[]>(userRoleKeys.user(userId));

      // Optimistically update cache with temporary role (will be replaced with real data from API)
      queryClient.setQueryData<RoleAssignment[]>(userRoleKeys.user(userId), (old = []) => [
        ...old,
        {
          id: 'temp-' + Date.now(), // Temporary ID, will be replaced by real UUID from API
          user_id: userId,
          tenant_id: newRole.tenant_id,
          tenant_name: 'Loading...', // Will be replaced by real tenant name from API
          role: newRole.role,
          created_at: new Date().toISOString(),
          created_by: 'current-user', // Will be replaced by real creator UUID from API
        } as RoleAssignment,
      ]);

      return { previousRoles };
    },
    // AC-8: Rollback on error
    onError: (err, _variables, context) => {
      // Rollback to previous snapshot
      if (context?.previousRoles !== undefined) {
        queryClient.setQueryData(userRoleKeys.user(userId), context.previousRoles);
      }

      // AC-4: Show error toast based on HTTP status code and backend detail message
      if (err instanceof AxiosError) {
        const status = err.response?.status;
        const detail = err.response?.data?.detail || 'An unexpected error occurred';

        switch (status) {
          case 409:
            toast.error('Role already assigned', {
              description: 'This user already has this role for the selected tenant',
            });
            break;
          case 403:
            toast.error('Permission denied', {
              description: 'You do not have permission to assign roles for this tenant',
            });
            break;
          case 404:
            toast.error('Not found', {
              description: 'User or tenant not found',
            });
            break;
          default:
            toast.error('Failed to assign role', {
              description: detail,
            });
        }
      } else {
        // Fallback for non-Axios errors
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        toast.error('Failed to assign role', {
          description: errorMessage,
        });
      }
    },
    // AC-8: Always refetch after mutation to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userRoleKeys.user(userId) });
    },
    // AC-4: Success toast
    onSuccess: (data) => {
      toast.success('Role assigned successfully', {
        description: `Assigned ${data.role} role for ${data.tenant_name}`,
      });
    },
  });
};

/**
 * Remove role assignment mutation (AC-5, AC-8)
 *
 * Implements optimistic UI updates with rollback:
 * 1. onMutate: Cancel outgoing queries + snapshot previous data + optimistically remove role from cache
 * 2. onError: Rollback cache to previous snapshot + show error toast
 * 3. onSuccess: Show success toast
 * 4. onSettled: Invalidate query to refetch and ensure consistency
 *
 * @returns useMutation<void, Error, { roleId: string; roleName: string; tenantName: string }>
 */
export const useRemoveRole = (userId: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { roleId: string; roleName: string; tenantName: string },
    { previousRoles: RoleAssignment[] | undefined }
  >({
    mutationFn: ({ roleId }) => rolesApi.removeRole(userId, roleId),
    // AC-8: Optimistic update - remove role immediately before API confirmation
    onMutate: async ({ roleId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: userRoleKeys.user(userId) });

      // Snapshot the previous value
      const previousRoles = queryClient.getQueryData<RoleAssignment[]>(userRoleKeys.user(userId));

      // Optimistically remove role from cache
      queryClient.setQueryData<RoleAssignment[]>(
        userRoleKeys.user(userId),
        (old = []) => old.filter((role) => role.id !== roleId)
      );

      return { previousRoles };
    },
    // AC-8: Rollback on error
    onError: (err, _variables, context) => {
      // Rollback to previous snapshot (re-add removed role)
      if (context?.previousRoles !== undefined) {
        queryClient.setQueryData(userRoleKeys.user(userId), context.previousRoles);
      }

      // AC-5: Show error toast based on HTTP status code and backend detail message
      if (err instanceof AxiosError) {
        const status = err.response?.status;
        const detail = err.response?.data?.detail || 'An unexpected error occurred';

        switch (status) {
          case 400:
            // Last super_admin protection
            toast.error('Cannot remove role', {
              description: 'Cannot remove the last super_admin role from the system',
            });
            break;
          case 403:
            toast.error('Permission denied', {
              description: 'You do not have permission to revoke roles for this tenant',
            });
            break;
          case 404:
            toast.error('Not found', {
              description: 'Role assignment not found',
            });
            break;
          default:
            toast.error('Failed to remove role', {
              description: detail,
            });
        }
      } else {
        // Fallback for non-Axios errors
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        toast.error('Failed to remove role', {
          description: errorMessage,
        });
      }
    },
    // AC-8: Always refetch after mutation to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userRoleKeys.user(userId) });
    },
    // AC-5: Success toast
    onSuccess: (_data, { roleName, tenantName }) => {
      toast.success('Role removed successfully', {
        description: `Removed ${roleName} role from ${tenantName}`,
      });
    },
  });
};
