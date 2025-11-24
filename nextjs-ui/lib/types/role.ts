/**
 * Role Type Definitions
 *
 * TypeScript interfaces and enums for role assignment system.
 * Matches backend API contracts from src/api/roles.py and src/schemas/user.py
 */

// Role enum matching backend UserRole from src/database/models.py:80-85
export enum RoleEnum {
  SUPER_ADMIN = 'super_admin',
  TENANT_ADMIN = 'tenant_admin',
  DEVELOPER = 'developer',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
}

// Role assignment data from backend
// Matches RoleAssignmentResponse from src/schemas/user.py:408-458
export interface RoleAssignment {
  id: string;                    // UUID
  user_id: string;               // UUID
  tenant_id: string;             // VARCHAR (critical: use TenantConfig.tenant_id NOT .id)
  tenant_name: string;           // Joined from TenantConfig.name
  role: RoleEnum;                // enum value
  created_at: string;            // ISO 8601 datetime
  created_by: string;            // UUID of admin who assigned
}

// Role metadata from GET /api/v1/roles
// Matches RoleInfo from src/schemas/user.py:461-494
export interface RoleInfo {
  role: RoleEnum;
  display_name: string;          // e.g., "Super Admin"
  description: string;           // e.g., "Full system access across all tenants"
  level: number;                 // 1-5 (1=highest privilege: super_admin, 5=lowest: viewer)
}

// Request body for POST /api/v1/users/{user_id}/roles
// Matches RoleAssignmentCreate from src/schemas/user.py:367-406
export interface RoleAssignmentCreate {
  tenant_id: string;             // VARCHAR (use tenant.tenant_id NOT tenant.id)
  role: RoleEnum;
}

// Display names for roles (used in badges, dropdowns)
export const ROLE_DISPLAY_NAMES: Record<RoleEnum, string> = {
  [RoleEnum.SUPER_ADMIN]: 'Super Admin',
  [RoleEnum.TENANT_ADMIN]: 'Tenant Admin',
  [RoleEnum.DEVELOPER]: 'Developer',
  [RoleEnum.OPERATOR]: 'Operator',
  [RoleEnum.VIEWER]: 'Viewer',
};

// Badge color variants for each role (AC-2)
export const ROLE_BADGE_COLORS: Record<RoleEnum, string> = {
  [RoleEnum.SUPER_ADMIN]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [RoleEnum.TENANT_ADMIN]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  [RoleEnum.DEVELOPER]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [RoleEnum.OPERATOR]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  [RoleEnum.VIEWER]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};
