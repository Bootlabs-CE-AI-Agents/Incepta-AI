/**
 * Users React Query Hooks
 *
 * Custom hooks for user management operations using TanStack Query v5
 * Implements AC-1 through AC-10 (pagination, filtering, search, RBAC, optimistic updates)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usersApi } from '../api/users';
import type { UserDetail, PaginatedUsersResponse, UsersFilters, UserUpdateRequest, PasswordResetResponse } from '../api/users';

/**
 * Query keys for cache management (AC-10 performance)
 */
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UsersFilters) => [...userKeys.lists(), filters] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};

/**
 * Fetch users with pagination, filters, and search (AC-1, AC-3, AC-4, AC-5)
 *
 * @param filters - Query parameters (tenant_id, is_active, role, search, limit, offset)
 * @returns UseQueryResult<PaginatedUsersResponse, Error>
 *
 * Configuration per AC-10 (Performance):
 * - staleTime: 60s (prevent unnecessary refetches)
 * - refetchOnWindowFocus: false (don't refetch on tab switch)
 * - retry: 3 attempts with exponential backoff
 */
export const useUsers = (filters: UsersFilters = {}) => {
  return useQuery<PaginatedUsersResponse, Error>({
    queryKey: userKeys.list(filters),
    queryFn: () => usersApi.listUsers(filters),
    staleTime: 60 * 1000, // 60 seconds
    refetchOnWindowFocus: false, // AC-10: Don't refetch on window focus
    retry: 3, // AC-10: 3 attempts with exponential backoff
  });
};

/**
 * Update user mutation (AC-7 Deactivate/Activate actions)
 *
 * Implements optimistic UI updates:
 * 1. onMutate: Cancel outgoing queries + snapshot previous data + optimistically update cache
 * 2. onError: Rollback cache to previous snapshot on failure
 * 3. onSettled: Invalidate queries to refetch and ensure consistency
 *
 * @returns useMutation<UserDetail, Error, { userId: string; updates: UserUpdateRequest }>
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation<UserDetail, Error, { userId: string; updates: UserUpdateRequest }>({
    mutationFn: ({ userId, updates }) => usersApi.updateUser(userId, updates),
    // AC-7: Optimistic update for deactivate/activate
    onMutate: async ({ userId, updates }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: userKeys.lists() });

      // Snapshot the previous value
      const previousUsers = queryClient.getQueriesData<PaginatedUsersResponse>({ queryKey: userKeys.lists() });

      // Optimistically update all matching queries
      queryClient.setQueriesData<PaginatedUsersResponse>({ queryKey: userKeys.lists() }, (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          items: oldData.items.map((user) =>
            user.id === userId ? { ...user, ...updates } : user
          ),
        };
      });

      return { previousUsers };
    },
    // If the mutation fails, use the snapshot to roll back
    onError: (err, { userId }, context) => {
      if (context?.previousUsers) {
        context.previousUsers.forEach(([queryKey, data]) => {
          if (data) {
            queryClient.setQueryData(queryKey, data);
          }
        });
      }
      toast.error(`Failed to update user`, {
        description: err instanceof Error ? err.message : 'An error occurred',
      });
    },
    // Always refetch after error or success to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onSuccess: (data, { updates }) => {
      // AC-7: Success toast
      if (updates.is_active !== undefined) {
        toast.success(`User ${updates.is_active ? 'activated' : 'deactivated'} successfully`, {
          description: `${data.email} is now ${updates.is_active ? 'active' : 'inactive'}`,
        });
      }
    },
  });
};

/**
 * Reset user password mutation (AC-7 Reset Password action)
 *
 * @returns useMutation<PasswordResetResponse, Error, string>
 */
export const useResetPassword = () => {
  const queryClient = useQueryClient();

  return useMutation<PasswordResetResponse, Error, string>({
    mutationFn: usersApi.resetPassword,
    onSuccess: (data, userId) => {
      // AC-7: Show temp password in toast
      toast.success('Password reset successfully', {
        description: `Temporary password: ${data.temporary_password} (Please copy now - it won't be shown again)`,
        duration: 10000, // 10 seconds for user to copy password
      });

      // Invalidate user queries to refetch updated data (force_password_change flag)
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
    },
    onError: (err) => {
      toast.error('Failed to reset password', {
        description: err instanceof Error ? err.message : 'An error occurred',
      });
    },
  });
};
