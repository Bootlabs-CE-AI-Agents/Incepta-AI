/**
 * Users API Client
 *
 * Type-safe API client for user management endpoints
 * Integrates with backend /api/v1/users endpoints (Story 22)
 */

import { apiClient } from './client';

/**
 * Role enum matching backend RoleEnum (src/database/models.py)
 */
export type RoleEnum = 'super_admin' | 'tenant_admin' | 'developer' | 'operator' | 'viewer';

/**
 * User role with tenant association (for "Roles" column display)
 */
export interface UserRoleDetail {
  role: RoleEnum;
  tenant_id: string;
  tenant_name: string;
}

/**
 * User detail object (matches UserDetailDTO from backend)
 */
export interface UserDetail {
  id: string;
  email: string;
  is_active: boolean;
  default_tenant_id: string;
  default_tenant_name: string;
  roles: UserRoleDetail[];
  last_login: string | null;
  created_at: string;
  updated_at: string;
  force_password_change?: boolean; // Optional - only used in some contexts
}

/**
 * Paginated users response (matches PaginatedUsersResponse from backend)
 */
export interface PaginatedUsersResponse {
  items: UserDetail[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Password reset response (AC-7 Reset Password action)
 */
export interface PasswordResetResponse {
  temporary_password: string;
  message: string;
}

/**
 * User create request DTO (AC-4)
 * Matches UserCreateRequest from src/schemas/user.py
 */
export interface UserCreateRequest {
  email: string;
  password: string;
  full_name?: string;
  default_tenant_id: string;
  initial_role: RoleEnum;
  force_password_change?: boolean;
  is_active?: boolean;
}

/**
 * User update request DTO (for deactivate/activate actions + AC-5 edit form)
 */
export interface UserUpdateRequest {
  is_active?: boolean;
  email?: string;
  full_name?: string;
  default_tenant_id?: string;
  force_password_change?: boolean;
}

/**
 * Filters for GET /api/v1/users (AC-3, AC-4)
 */
export interface UsersFilters {
  tenant_id?: string;
  is_active?: boolean;
  role?: RoleEnum;
  search?: string; // Email search substring (AC-3)
  limit?: number;
  offset?: number;
}

/**
 * Users API client functions
 */
export const usersApi = {
  /**
   * List users with pagination and filters (AC-1, AC-3, AC-4, AC-5)
   *
   * GET /api/v1/users?tenant_id={uuid}&is_active={bool}&role={string}&limit={int}&offset={int}
   *
   * @param filters - Query parameters for filtering and pagination
   * @returns Promise<PaginatedUsersResponse>
   */
  listUsers: async (filters: UsersFilters = {}): Promise<PaginatedUsersResponse> => {
    const params = new URLSearchParams();

    if (filters.tenant_id) params.append('tenant_id', filters.tenant_id);
    if (filters.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters.role) params.append('role', filters.role);
    if (filters.search) params.append('search', filters.search);
    if (filters.limit !== undefined) params.append('limit', String(filters.limit));
    if (filters.offset !== undefined) params.append('offset', String(filters.offset));

    const response = await apiClient.get<PaginatedUsersResponse>(`/api/v1/users?${params.toString()}`);
    return response.data;
  },

  /**
   * Get single user by ID (AC-8 edit form data fetch)
   *
   * GET /api/v1/users/{id}
   *
   * @param userId - User ID
   * @returns Promise<UserDetail> - User object with all fields
   */
  getUser: async (userId: string): Promise<UserDetail> => {
    const response = await apiClient.get<UserDetail>(`/api/v1/users/${userId}`);
    return response.data;
  },

  /**
   * Create new user (AC-4)
   *
   * POST /api/v1/users
   *
   * @param userData - User creation data
   * @returns Promise<UserDetail> - Created user object
   */
  createUser: async (userData: UserCreateRequest): Promise<UserDetail> => {
    const response = await apiClient.post<UserDetail>('/api/v1/users', userData);
    return response.data;
  },

  /**
   * Update user (AC-5 edit form + AC-7 Deactivate/Activate actions)
   *
   * PUT /api/v1/users/{id}
   *
   * @param userId - User ID
   * @param updates - Fields to update (email, full_name, default_tenant_id, force_password_change, is_active)
   * @returns Promise<UserDetail> - Updated user object
   */
  updateUser: async (userId: string, updates: UserUpdateRequest): Promise<UserDetail> => {
    const response = await apiClient.put<UserDetail>(`/api/v1/users/${userId}`, updates);
    return response.data;
  },

  /**
   * Reset user password (AC-7 Reset Password action)
   *
   * POST /api/v1/users/{id}/reset-password
   *
   * @param userId - User ID
   * @returns Promise<PasswordResetResponse> - Contains temporary_password to show in toast
   */
  resetPassword: async (userId: string): Promise<PasswordResetResponse> => {
    const response = await apiClient.post<PasswordResetResponse>(`/api/v1/users/${userId}/reset-password`);
    return response.data;
  },
};
