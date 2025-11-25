/**
 * Assign Role Form Component
 *
 * Form for assigning new roles to users with tenant scoping (AC-4, AC-6, AC-7)
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { useTenants } from '@/lib/hooks/useTenants';
import { useAvailableRoles } from '@/lib/hooks/useRoles';
import { useAssignRole } from '@/lib/hooks/useUserRoles';
import { RoleEnum } from '@/lib/types/role';

export interface AssignRoleFormProps {
  userId: string;
}

/**
 * Assign Role Form (AC-4, AC-6, AC-7)
 *
 * Features:
 * - Tenant dropdown: Searchable select for super_admin, disabled for tenant_admin (AC-6)
 * - Role dropdown: 5 roles with display_name + description (AC-7)
 * - Assign button: Disabled until both fields selected
 * - Form validation: tenant_id (VARCHAR) + role (enum) required
 * - Optimistic update: Adds row immediately, rolls back on error (AC-8)
 * - Error handling: 400 (duplicate), 403 (forbidden), 404 (not found)
 */
export function AssignRoleForm({ userId }: AssignRoleFormProps) {
  const { data: session } = useSession();
  const { data: tenants, isLoading: tenantsLoading } = useTenants();
  const { data: roles, isLoading: rolesLoading } = useAvailableRoles();
  const { mutate: assignRole, isPending } = useAssignRole(userId);

  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<RoleEnum | ''>('');

  // AC-6: Determine if current user is super_admin (can assign for all tenants)
  const isSuperAdmin = session?.user?.roles?.some((r: any) => r.role === 'super_admin') || false;
  const currentUserTenantId = session?.user?.default_tenant_id;

  // AC-6: Pre-select and disable tenant dropdown for tenant_admin
  useEffect(() => {
    if (!isSuperAdmin && currentUserTenantId && tenants) {
      // Find tenant with matching id (UUID)
      const userTenant = tenants.find((t) => t.id === currentUserTenantId);
      if (userTenant) {
        setSelectedTenantId(userTenant.id); // Set to UUID id (API expects UUID)
      }
    }
  }, [isSuperAdmin, currentUserTenantId, tenants]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTenantId || !selectedRole) return;

    assignRole(
      {
        tenant_id: selectedTenantId, // Sending tenant.id (UUID) - API expects UUID per RoleAssignmentCreate schema
        role: selectedRole as RoleEnum,
      },
      {
        onSuccess: () => {
          // Reset form after successful assignment
          if (isSuperAdmin) {
            setSelectedTenantId('');
          }
          setSelectedRole('');
        },
      }
    );
  };

  const isFormValid = selectedTenantId && selectedRole;
  const isFormDisabled = isPending || tenantsLoading || rolesLoading;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tenant Dropdown (AC-6) */}
      <div>
        <label htmlFor="tenant" className="block text-sm font-medium text-text-primary mb-1">
          Tenant {!isSuperAdmin && <span className="text-text-secondary">(assigned tenant)</span>}
        </label>
        <select
          id="tenant"
          value={selectedTenantId}
          onChange={(e) => setSelectedTenantId(e.target.value)}
          disabled={!isSuperAdmin || isFormDisabled}
          className="
            w-full px-3 py-2 rounded-md border border-border
            bg-white dark:bg-white/5
            text-text-primary
            focus:outline-none focus:ring-2 focus:ring-accent-blue
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
          aria-required="true"
          aria-label="Select tenant"
        >
          <option value="">Select tenant...</option>
          {tenantsLoading ? (
            <option disabled>Loading tenants...</option>
          ) : (
            tenants?.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))
          )}
        </select>
        {!isSuperAdmin && (
          <p className="text-xs text-text-secondary mt-1">
            As tenant_admin, you can only assign roles for your own tenant
          </p>
        )}
      </div>

      {/* Role Dropdown (AC-7) */}
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-text-primary mb-1">
          Role
        </label>
        <select
          id="role"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as RoleEnum)}
          disabled={isFormDisabled}
          className="
            w-full px-3 py-2 rounded-md border border-border
            bg-white dark:bg-white/5
            text-text-primary
            focus:outline-none focus:ring-2 focus:ring-accent-blue
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
          aria-required="true"
          aria-label="Select role"
        >
          <option value="">Select role...</option>
          {rolesLoading ? (
            <option disabled>Loading roles...</option>
          ) : (
            roles?.map((role) => (
              <option key={role.role} value={role.role}>
                {role.display_name} - {role.description}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Assign Button (AC-4) */}
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          disabled={!isFormValid || isFormDisabled}
          isLoading={isPending}
          loadingText="Assigning..."
        >
          Assign
        </Button>
      </div>
    </form>
  );
}
