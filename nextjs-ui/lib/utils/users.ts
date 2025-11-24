/**
 * User Utility Functions
 *
 * Formatters and helpers for user management UI
 * Implements AC-1 (date formatting, role display)
 */

import { formatDistanceToNow, format } from 'date-fns';
import type { UserRoleDetail, RoleEnum } from '../api/users';

/**
 * Role labels for display (AC-1: Roles column)
 */
export const roleLabels: Record<RoleEnum, string> = {
  super_admin: 'Admin',
  tenant_admin: 'Tenant Admin',
  developer: 'Developer',
  operator: 'Operator',
  viewer: 'Viewer',
};

/**
 * Format last login date to relative time (AC-1: "2 hours ago", "Never")
 *
 * @param date - ISO 8601 date string or null
 * @returns Formatted string ("2 hours ago", "Never")
 */
export function formatLastLogin(date: string | null): string {
  if (!date) return 'Never';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/**
 * Format created date to formatted date (AC-1: "Nov 24, 2025")
 *
 * @param date - ISO 8601 date string
 * @returns Formatted date string ("Nov 24, 2025")
 */
export function formatCreatedDate(date: string): string {
  return format(new Date(date), 'MMM dd, yyyy');
}

/**
 * Format roles array to display string (AC-1: "Admin (Tenant A), Viewer (Tenant B)")
 *
 * @param roles - Array of user roles with tenant names
 * @returns Comma-separated string with role labels and tenant names
 */
export function formatRoles(roles: UserRoleDetail[]): string {
  if (!roles || roles.length === 0) return 'No roles';
  return roles.map((r) => `${roleLabels[r.role]} (${r.tenant_name})`).join(', ');
}

/**
 * Get status badge variant (AC-1: green for active, gray for inactive)
 *
 * @param isActive - User active status
 * @returns Badge variant object
 */
export function getStatusBadge(isActive: boolean): { variant: 'success' | 'default'; className: string; label: string } {
  if (isActive) {
    return {
      variant: 'success',
      className: 'bg-green-500 text-white',
      label: 'Active',
    };
  }
  return {
    variant: 'default',
    className: 'bg-gray-400 text-white',
    label: 'Inactive',
  };
}

/**
 * Check if a user is the last active super_admin
 *
 * @param userId - User ID to check
 * @param allUsers - Array of all users from the current view
 * @returns True if this is the last active super_admin
 */
export function isLastSuperAdmin(userId: string, allUsers: import('../api/users').UserDetail[]): boolean {
  // Count OTHER active super_admins (excluding the user being checked)
  const otherActiveSuperAdmins = allUsers.filter((u) => {
    // Skip the user we're checking
    if (u.id === userId) return false;

    // Check if user is active and has super_admin role
    const hasSuperAdmin = u.roles.some((r) => r.role === 'super_admin');
    return u.is_active && hasSuperAdmin;
  });

  // If there are no other active super_admins, this is the last one
  return otherActiveSuperAdmins.length === 0;
}
