/**
 * Roles API Client
 *
 * Type-safe API client for role assignment endpoints
 * Consumes backend /api/v1/roles endpoints (Story 25)
 *
 * Backend endpoints:
 * - POST /api/v1/users/{user_id}/roles (assign role to user)
 * - DELETE /api/v1/users/{user_id}/roles/{role_id} (revoke role assignment)
 * - GET /api/v1/users/{user_id}/roles (list user's role assignments)
 * - GET /api/v1/roles (list all available roles with metadata)
 */

import { apiClient } from './client';
import type { RoleAssignment, RoleInfo, RoleAssignmentCreate } from '../types/role';

/**
 * Roles API client functions
 */
export const rolesApi = {
  /**
   * Fetch current role assignments for a user (AC-3)
   *
   * GET /api/v1/users/{user_id}/roles
   *
   * Returns user's role assignments with tenant names joined from TenantConfig.
   *
   * RBAC:
   * - super_admin: Can view any user's roles
   * - tenant_admin: Can view roles for users in their tenant
   * - User: Can view only their own roles
   *
   * @param userId - User ID (UUID)
   * @returns Promise<RoleAssignment[]> - Array of role assignments with tenant names
   * @throws 403 if unauthorized to view user's roles
   * @throws 404 if user not found
   */
  fetchUserRoles: async (userId: string): Promise<RoleAssignment[]> => {
    const response = await apiClient.get<RoleAssignment[]>(`/api/v1/users/${userId}/roles`);
    return response.data;
  },

  /**
   * Fetch all available roles with metadata (AC-7)
   *
   * GET /api/v1/roles
   *
   * Returns static list of 5 roles with display names, descriptions, and privilege levels.
   * Used to populate role dropdown in AssignRoleForm.
   *
   * @returns Promise<RoleInfo[]> - Array of 5 roles sorted by level (1=super_admin first, 5=viewer last)
   */
  fetchAvailableRoles: async (): Promise<RoleInfo[]> => {
    const response = await apiClient.get<RoleInfo[]>('/api/v1/roles');
    return response.data;
  },

  /**
   * Assign role to user for specific tenant (AC-4)
   *
   * POST /api/v1/users/{user_id}/roles
   *
   * Request body:
   * {
   *   "tenant_id": "tenant-abc",  // VARCHAR (use TenantConfig.tenant_id NOT .id)
   *   "role": "developer"
   * }
   *
   * RBAC:
   * - super_admin: Can assign any role for any tenant
   * - tenant_admin: Can only assign roles for their own tenant (enforced via UUID comparison)
   *
   * Backend validations:
   * - User exists (404 if not)
   * - Tenant exists (404 if not)
   * - No duplicate assignment (400 if user+tenant+role already exists)
   * - tenant_admin cannot assign for other tenants (403 if unauthorized)
   *
   * @param userId - User ID (UUID)
   * @param data - Role assignment data (tenant_id VARCHAR, role enum)
   * @returns Promise<RoleAssignment> - Created role assignment with tenant_name joined
   * @throws 400 if duplicate assignment or validation fails
   * @throws 403 if tenant_admin trying to assign for other tenant
   * @throws 404 if user or tenant not found
   */
  assignRole: async (userId: string, data: RoleAssignmentCreate): Promise<RoleAssignment> => {
    const response = await apiClient.post<RoleAssignment>(`/api/v1/users/${userId}/roles`, data);
    return response.data;
  },

  /**
   * Revoke role assignment (AC-5)
   *
   * DELETE /api/v1/users/{user_id}/roles/{role_id}
   *
   * RBAC:
   * - super_admin: Can revoke any role assignment
   * - tenant_admin: Can only revoke assignments for their own tenant
   *
   * Backend validations:
   * - Role assignment exists (404 if not)
   * - Not last super_admin role (400 if trying to remove last super_admin from system)
   * - tenant_admin cannot revoke for other tenants (403 if unauthorized)
   *
   * @param userId - User ID (UUID)
   * @param roleId - Role assignment ID (UUID, from RoleAssignment.id)
   * @returns Promise<void> - 204 No Content on success
   * @throws 400 if last super_admin protection triggered
   * @throws 403 if tenant_admin trying to revoke for other tenant
   * @throws 404 if role assignment not found
   */
  removeRole: async (userId: string, roleId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/users/${userId}/roles/${roleId}`);
  },
};
