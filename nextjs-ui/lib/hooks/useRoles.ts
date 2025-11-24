/**
 * Available Roles React Query Hook
 *
 * Custom hook for fetching available roles metadata (AC-7)
 * Static data with long cache duration
 */

import { useQuery } from '@tanstack/react-query';
import { rolesApi } from '../api/roles';
import type { RoleInfo } from '../types/role';

/**
 * Query key for available roles cache
 */
export const rolesKeys = {
  all: ['availableRoles'] as const,
};

/**
 * Fetch all available roles with metadata (AC-7)
 *
 * Returns static list of 5 roles with display names, descriptions, and levels.
 * Used to populate role dropdown in AssignRoleForm.
 *
 * @returns UseQueryResult<RoleInfo[], Error>
 *
 * Configuration:
 * - staleTime: 24 hours (static data, rarely changes)
 * - cacheTime: 24 hours (keep in cache for long duration)
 * - retry: 1 attempt (static data, no need for multiple retries)
 */
export const useAvailableRoles = () => {
  return useQuery<RoleInfo[], Error>({
    queryKey: rolesKeys.all,
    queryFn: rolesApi.fetchAvailableRoles,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 24 * 60 * 60 * 1000, // 24 hours (renamed from cacheTime in v5)
    retry: 1, // Only 1 retry for static data
  });
};
