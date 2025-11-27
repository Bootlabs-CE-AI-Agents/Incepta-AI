import "next-auth";
import "next-auth/jwt";

/**
 * Type declarations for extending NextAuth Session and JWT types
 * Adds custom fields: accessToken, userId, tokenVersion, roles, defaultTenantId
 *
 * Note: roles is an array of role assignments across tenants:
 * [{ role: string, tenant_id: string, tenant_name: string }, ...]
 */

/**
 * Role entry from user's roles array
 */
interface RoleEntry {
  role: string;
  tenant_id?: string;
  tenant_name?: string;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      /** @deprecated Use roles array instead */
      role?: string;
      /** Array of role assignments across tenants */
      roles?: RoleEntry[];
      defaultTenantId?: string;
      default_tenant_id?: string;
      default_tenant_name?: string;
      is_active?: boolean;
      last_login_at?: string;
      created_at?: string;
    };
    accessToken: string;
    tokenVersion: number;
  }

  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
    accessToken: string;
    tokenVersion: number;
    /** @deprecated Use roles array instead */
    role?: string | null;
    /** Array of role assignments across tenants */
    roles?: RoleEntry[];
    defaultTenantId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string;
    userId: string;
    tokenVersion: number;
    /** @deprecated Use roles array instead */
    role?: string | null;
    /** Array of role assignments across tenants */
    roles?: RoleEntry[];
    defaultTenantId?: string | null;
  }
}
