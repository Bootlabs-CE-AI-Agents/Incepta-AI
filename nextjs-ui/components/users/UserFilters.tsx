/**
 * User Filters Component
 *
 * Filter dropdowns for Status, Role, and Tenant (if super_admin)
 * Implements AC-4 (Status filter), AC-5 (Role filter), AC-6 (Tenant filter for super_admin)
 */

'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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
 * Features (per AC-4, AC-5, AC-6):
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
  return (
    <div className="flex flex-wrap items-end gap-4">
      {/* Status Filter (AC-4: All users can filter by status) */}
      <div className="w-full sm:w-[180px]">
        <Label htmlFor="status-filter" className="text-sm font-medium">
          Status
        </Label>
        <Select
          value={statusFilter === undefined ? 'all' : statusFilter ? 'active' : 'inactive'}
          onValueChange={(value) => {
            if (value === 'all') {
              onStatusChange(undefined);
            } else {
              onStatusChange(value === 'active');
            }
          }}
        >
          <SelectTrigger id="status-filter" className="w-full">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Role Filter (AC-5: All users can filter by role) */}
      <div className="w-full sm:w-[200px]">
        <Label htmlFor="role-filter" className="text-sm font-medium">
          Role
        </Label>
        <Select
          value={roleFilter || 'all'}
          onValueChange={(value) => {
            if (value === 'all') {
              onRoleChange(undefined);
            } else {
              onRoleChange(value as RoleEnum);
            }
          }}
        >
          <SelectTrigger id="role-filter" className="w-full">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="super_admin">{roleLabels.super_admin}</SelectItem>
            <SelectItem value="tenant_admin">{roleLabels.tenant_admin}</SelectItem>
            <SelectItem value="developer">{roleLabels.developer}</SelectItem>
            <SelectItem value="operator">{roleLabels.operator}</SelectItem>
            <SelectItem value="viewer">{roleLabels.viewer}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tenant Filter (AC-6: Only super_admin sees this) */}
      {isSuperAdmin && tenants.length > 0 && (
        <div className="w-full sm:w-[220px]">
          <Label htmlFor="tenant-filter" className="text-sm font-medium">
            Tenant
          </Label>
          <Select
            value={tenantFilter || 'all'}
            onValueChange={(value) => {
              if (value === 'all') {
                onTenantChange(undefined);
              } else {
                onTenantChange(value);
              }
            }}
          >
            <SelectTrigger id="tenant-filter" className="w-full">
              <SelectValue placeholder="Select tenant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tenants</SelectItem>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
