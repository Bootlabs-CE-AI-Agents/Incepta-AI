/**
 * Unit Tests for useRoles hook
 *
 * Tests cover:
 * - Story 26 AC-7: Fetching available roles with display names and descriptions
 * - Caching behavior (24 hour staleTime)
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAvailableRoles } from '../useRoles';
import { rolesApi } from '@/lib/api/roles';
import { RoleEnum } from '@/lib/types/role';
import type { RoleInfo } from '@/lib/types/role';

// Mock dependencies
jest.mock('@/lib/api/roles', () => ({
  rolesApi: {
    fetchAvailableRoles: jest.fn(),
  },
}));

const mockedFetchAvailableRoles = rolesApi.fetchAvailableRoles as jest.MockedFunction<typeof rolesApi.fetchAvailableRoles>;

describe('useAvailableRoles hook', () => {
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

  const mockRoles: RoleInfo[] = [
    {
      role: RoleEnum.SUPER_ADMIN,
      display_name: 'Super Admin',
      description: 'Full system access across all tenants',
      level: 1,
    },
    {
      role: RoleEnum.TENANT_ADMIN,
      display_name: 'Tenant Admin',
      description: 'Full access within assigned tenant',
      level: 2,
    },
    {
      role: RoleEnum.DEVELOPER,
      display_name: 'Developer',
      description: 'Can create and manage agents, prompts, and workflows',
      level: 3,
    },
    {
      role: RoleEnum.OPERATOR,
      display_name: 'Operator',
      description: 'Can execute agents and view results',
      level: 4,
    },
    {
      role: RoleEnum.VIEWER,
      display_name: 'Viewer',
      description: 'Read-only access to agents and executions',
      level: 5,
    },
  ];

  // Test 1: Successfully fetch all 5 roles
  test('fetches all 5 available roles (AC-7: fetch roles)', async () => {
    mockedFetchAvailableRoles.mockResolvedValue(mockRoles);

    const { result } = renderHook(() => useAvailableRoles(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedFetchAvailableRoles).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockRoles);
    expect(result.current.data).toHaveLength(5);
  });

  // Test 2: Each role has required fields
  test('each role has display_name and description (AC-7: role metadata)', async () => {
    mockedFetchAvailableRoles.mockResolvedValue(mockRoles);

    const { result } = renderHook(() => useAvailableRoles(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    result.current.data?.forEach((role) => {
      expect(role).toHaveProperty('role');
      expect(role).toHaveProperty('display_name');
      expect(role).toHaveProperty('description');
      expect(role).toHaveProperty('level');
      expect(typeof role.display_name).toBe('string');
      expect(typeof role.description).toBe('string');
      expect(role.display_name.length).toBeGreaterThan(0);
      expect(role.description.length).toBeGreaterThan(0);
    });
  });

  // Test 3: Roles are in correct order (level 1-5)
  test('roles are ordered by level (AC-7: role hierarchy)', async () => {
    mockedFetchAvailableRoles.mockResolvedValue(mockRoles);

    const { result } = renderHook(() => useAvailableRoles(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const levels = result.current.data?.map(role => role.level);
    expect(levels).toEqual([1, 2, 3, 4, 5]);
  });

  // Test 4: Caching behavior (24 hour staleTime)
  test('uses cached data for 24 hours (AC-7: static data caching)', async () => {
    mockedFetchAvailableRoles.mockResolvedValue(mockRoles);

    // First call
    const { result: result1 } = renderHook(() => useAvailableRoles(), { wrapper });
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));

    // Second call should use cache
    const { result: result2 } = renderHook(() => useAvailableRoles(), { wrapper });
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));

    // API should only be called once due to caching
    expect(mockedFetchAvailableRoles).toHaveBeenCalledTimes(1);
    expect(result2.current.data).toEqual(mockRoles);
  });

  // Test 5: Error handling
  test('handles fetch error correctly (AC-7: error handling)', async () => {
    const error = new Error('Failed to fetch roles');
    mockedFetchAvailableRoles.mockRejectedValue(error);

    const { result } = renderHook(() => useAvailableRoles(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
    expect(result.current.data).toBeUndefined();
  });

  // Test 6: Retry on error (single retry)
  test('retries once on error (AC-7: error recovery)', async () => {
    const error = new Error('Network error');
    mockedFetchAvailableRoles.mockRejectedValueOnce(error).mockResolvedValueOnce(mockRoles);

    const { result } = renderHook(() => useAvailableRoles(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should retry once, so 2 total calls
    expect(mockedFetchAvailableRoles).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual(mockRoles);
  });

  // Test 7: All role enums are present
  test('includes all 5 role enums (AC-7: complete role set)', async () => {
    mockedFetchAvailableRoles.mockResolvedValue(mockRoles);

    const { result } = renderHook(() => useAvailableRoles(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const roleEnums = result.current.data?.map(role => role.role);
    expect(roleEnums).toContain(RoleEnum.SUPER_ADMIN);
    expect(roleEnums).toContain(RoleEnum.TENANT_ADMIN);
    expect(roleEnums).toContain(RoleEnum.DEVELOPER);
    expect(roleEnums).toContain(RoleEnum.OPERATOR);
    expect(roleEnums).toContain(RoleEnum.VIEWER);
  });

  // Test 8: Display names match expected format
  test('display names are properly formatted (AC-7: UI display)', async () => {
    mockedFetchAvailableRoles.mockResolvedValue(mockRoles);

    const { result } = renderHook(() => useAvailableRoles(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const displayNames = result.current.data?.map(role => role.display_name);
    expect(displayNames).toContain('Super Admin');
    expect(displayNames).toContain('Tenant Admin');
    expect(displayNames).toContain('Developer');
    expect(displayNames).toContain('Operator');
    expect(displayNames).toContain('Viewer');
  });
});
