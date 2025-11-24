/**
 * User Filters Component
 *
 * Filter dropdowns for Status, Role, and Tenant (if super_admin)
 * Implements AC-4 (filtering), AC-6 (RBAC enforcement)
 *
 * IMPORTANT: Uses custom native Select component (/components/ui/select.tsx)
 * NOT shadcn/ui Select with SelectContent/SelectItem/etc.
 */

'use client';

import { Select } from '@/components/ui/Select';
import type { RoleEnum } from '@/lib/api/users';
import { roleLabels } from '@/lib/utils/users';

interface UserFiltersProps {
  statusFilter: boolean | undefined;
  roleFilter: RoleEnum | undefined;
  tenantFilter: string | undefined;
  onStatusChange: (value: boolean | undefined) => void;
  onRoleChange: (value: RoleEnum | undefined) => void;
  onTenantChange: (value: string | undefined) => void;
  isSuperAdmin: boolean;
  tenants?: Array<{ id: string; name: string }>; // Only needed if super_admin
}

/**
 * UserFilters - Filter dropdowns component
 *
 * Features (per AC-4, AC-6):
 * - Status dropdown (All/Active/Inactive) - visible to all
 * - Role dropdown (All roles + specific roles) - visible to all
 * - Tenant dropdown (All tenants + specific tenants) - only visible to super_admin
 * - Clears filters when "All" is selected
 * - Updates URL params via parent component
 *
 * @param statusFilter - Current status filter value
 * @param roleFilter - Current role filter value
 * @param tenantFilter - Current tenant filter value
 * @param onStatusChange - Callback when status filter changes
 * @param onRoleChange - Callback when role filter changes
 * @param onTenantChange - Callback when tenant filter changes
 * @param isSuperAdmin - Whether current user is super_admin (shows tenant filter)
 * @param tenants - List of tenants (only if super_admin)
 */
export function UserFilters({
  statusFilter,
  roleFilter,
  tenantFilter,
  onStatusChange,
  onRoleChange,
  onTenantChange,
  isSuperAdmin,
  tenants = [],
}: UserFiltersProps) {
  // Status filter options (AC-4)
  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  // Role filter options (AC-4)
  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'super_admin', label: roleLabels.super_admin },
    { value: 'tenant_admin', label: roleLabels.tenant_admin },
    { value: 'developer', label: roleLabels.developer },
    { value: 'operator', label: roleLabels.operator },
    { value: 'viewer', label: roleLabels.viewer },
  ];

  // Tenant filter options (AC-6: Only super_admin)
  const tenantOptions = [
    { value: 'all', label: 'All Tenants' },
    ...tenants.map((t) => ({ value: t.id, label: t.name })),
  ];

  // Current status value for controlled select
  const statusValue = statusFilter === undefined ? 'all' : statusFilter ? 'active' : 'inactive';

  // Current role value for controlled select
  const roleValue = roleFilter || 'all';

  // Current tenant value for controlled select
  const tenantValue = tenantFilter || 'all';

  return (
    <div className="flex flex-wrap items-end gap-4">
      {/* Status Filter (AC-4: All users can filter by status) */}
      <div className="w-full sm:w-[180px]">
        <Select
          label="Status"
          value={statusValue}
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'all') {
              onStatusChange(undefined);
            } else {
              onStatusChange(value === 'active');
            }
          }}
          options={statusOptions}
          id="status-filter"
          className="w-full"
        />
      </div>

      {/* Role Filter (AC-4: All users can filter by role) */}
      <div className="w-full sm:w-[200px]">
        <Select
          label="Role"
          value={roleValue}
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'all') {
              onRoleChange(undefined);
            } else {
              onRoleChange(value as RoleEnum);
            }
          }}
          options={roleOptions}
          id="role-filter"
          className="w-full"
        />
      </div>

      {/* Tenant Filter (AC-6: Only super_admin sees this) */}
      {isSuperAdmin && tenants.length > 0 && (
        <div className="w-full sm:w-[220px]">
          <Select
            label="Tenant"
            value={tenantValue}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'all') {
                onTenantChange(undefined);
              } else {
                onTenantChange(value);
              }
            }}
            options={tenantOptions}
            id="tenant-filter"
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
