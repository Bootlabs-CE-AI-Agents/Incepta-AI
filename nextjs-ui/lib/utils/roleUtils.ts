/**
 * Role Utilities for Session-based RBAC
 *
 * Extracts and validates user roles from NextAuth session.
 * The session stores roles as an array: session.user.roles
 * Each role object: { role: string, tenant_id: string, tenant_name: string }
 */

/**
 * Role priority order (highest to lowest)
 * Used to determine the user's "effective" role across tenants
 */
export const ROLE_PRIORITY: Record<string, number> = {
  super_admin: 100,
  tenant_admin: 80,
  developer: 60,
  operator: 40,
  viewer: 20,
};

/**
 * Role entry from session.user.roles array
 */
export interface RoleEntry {
  role: string;
  tenant_id?: string;
  tenant_name?: string;
}

/**
 * Get the user's highest role across all tenants
 *
 * @param roles - Array of role entries from session.user.roles
 * @returns The highest role string, or 'viewer' as default
 *
 * @example
 * ```tsx
 * const { data: session } = useSession();
 * const userRole = getHighestRole(session?.user?.roles);
 * const canEdit = hasEditPermission(userRole);
 * ```
 */
export function getHighestRole(roles?: RoleEntry[] | null): string {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return "viewer";
  }

  let highestRole = "viewer";
  let highestPriority = 0;

  for (const entry of roles) {
    const priority = ROLE_PRIORITY[entry.role] || 0;
    if (priority > highestPriority) {
      highestPriority = priority;
      highestRole = entry.role;
    }
  }

  return highestRole;
}

/**
 * Get the user's role for a specific tenant
 *
 * @param roles - Array of role entries from session.user.roles
 * @param tenantId - The tenant ID to check
 * @returns The role for that tenant, or null if no role exists
 */
export function getRoleForTenant(
  roles?: RoleEntry[] | null,
  tenantId?: string | null
): string | null {
  if (!roles || !tenantId) return null;

  const entry = roles.find((r) => r.tenant_id === tenantId);
  return entry?.role || null;
}

/**
 * Check if user has any of the specified roles
 *
 * @param roles - Array of role entries from session.user.roles
 * @param allowedRoles - Array of roles to check against
 * @returns True if user has any of the allowed roles
 *
 * @example
 * ```tsx
 * const canEdit = hasRole(session?.user?.roles, ['super_admin', 'tenant_admin', 'developer']);
 * ```
 */
export function hasRole(
  roles?: RoleEntry[] | null,
  allowedRoles: string[] = []
): boolean {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return false;
  }

  return roles.some((entry) => allowedRoles.includes(entry.role));
}

/**
 * Check if user can edit content (super_admin, tenant_admin, or developer)
 *
 * @param roles - Array of role entries from session.user.roles
 * @returns True if user has edit permissions
 */
export function canEdit(roles?: RoleEntry[] | null): boolean {
  return hasRole(roles, ["super_admin", "tenant_admin", "developer"]);
}

/**
 * Check if user is a super admin
 *
 * @param roles - Array of role entries from session.user.roles
 * @returns True if user is super_admin
 */
export function isSuperAdmin(roles?: RoleEntry[] | null): boolean {
  return hasRole(roles, ["super_admin"]);
}

/**
 * Check if user can manage (super_admin or tenant_admin)
 *
 * @param roles - Array of role entries from session.user.roles
 * @returns True if user has management permissions
 */
export function canManage(roles?: RoleEntry[] | null): boolean {
  return hasRole(roles, ["super_admin", "tenant_admin"]);
}
