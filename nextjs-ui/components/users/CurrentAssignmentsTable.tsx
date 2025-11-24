/**
 * Current Assignments Table Component
 *
 * Displays user's current role assignments with remove functionality (AC-3, AC-5, AC-10)
 * Implements loading, error, and empty states per AC-10
 */

'use client';

import { useState } from 'react';
import { Trash2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RemoveRoleDialog } from './RemoveRoleDialog';
import { useUserRoles } from '@/lib/hooks/useUserRoles';
import { ROLE_DISPLAY_NAMES, ROLE_BADGE_COLORS, type RoleEnum } from '@/lib/types/role';

export interface CurrentAssignmentsTableProps {
  userId: string;
}

/**
 * Current Assignments Table (AC-3, AC-5, AC-10)
 *
 * Features:
 * - Fetches user roles via useUserRoles hook (AC-3)
 * - Color-coded role badges (AC-2)
 * - Remove button with trash icon (AC-5)
 * - Loading state: 3 skeleton rows (AC-10)
 * - Error state: Error banner with retry button (AC-10)
 * - Empty state: "No role assignments yet" message with icon (AC-10)
 * - Mobile responsive: Cards < 768px, table ≥ 768px (AC-9)
 */
export function CurrentAssignmentsTable({ userId }: CurrentAssignmentsTableProps) {
  const { data: roles, isLoading, isError, error, refetch } = useUserRoles(userId);
  const [removeDialogState, setRemoveDialogState] = useState<{
    isOpen: boolean;
    roleId: string;
    roleName: string;
    tenantName: string;
  }>({
    isOpen: false,
    roleId: '',
    roleName: '',
    tenantName: '',
  });

  // AC-10: Loading state with 3 skeleton rows
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
            aria-label="Loading role assignments"
          />
        ))}
      </div>
    );
  }

  // AC-10: Error state with retry button
  if (isError) {
    return (
      <div
        className="
          glass-card p-4 rounded-lg border border-red-200 dark:border-red-800
          bg-red-50 dark:bg-red-900/20
        "
        role="alert"
      >
        <div className="flex items-start justify-between">
          <div>
            <h5 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
              Failed to load role assignments
            </h5>
            <p className="text-sm text-red-700 dark:text-red-300">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // AC-10: Empty state
  if (!roles || roles.length === 0) {
    return (
      <div className="glass-card p-8 rounded-lg text-center">
        <Shield className="w-12 h-12 text-text-secondary mx-auto mb-3" aria-hidden="true" />
        <p className="text-text-secondary text-sm">
          No role assignments yet. Assign a role below to get started.
        </p>
      </div>
    );
  }

  // AC-2: Data state with table (desktop) / cards (mobile)
  return (
    <>
      {/* Desktop table (≥ 768px) */}
      <div className="hidden md:block overflow-hidden rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
              >
                Tenant
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
              >
                Role
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-border">
            {roles.map((role) => (
              <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">
                  {role.tenant_name}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`
                      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${ROLE_BADGE_COLORS[role.role as RoleEnum]}
                    `}
                  >
                    {ROLE_DISPLAY_NAMES[role.role as RoleEnum]}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setRemoveDialogState({
                        isOpen: true,
                        roleId: role.id,
                        roleName: ROLE_DISPLAY_NAMES[role.role as RoleEnum],
                        tenantName: role.tenant_name,
                      })
                    }
                    aria-label={`Remove ${ROLE_DISPLAY_NAMES[role.role as RoleEnum]} role from ${role.tenant_name}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards (< 768px) */}
      <div className="md:hidden space-y-3">
        {roles.map((role) => (
          <div key={role.id} className="glass-card p-4 rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-primary mb-1">
                  {role.tenant_name}
                </p>
                <span
                  className={`
                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${ROLE_BADGE_COLORS[role.role as RoleEnum]}
                  `}
                >
                  {ROLE_DISPLAY_NAMES[role.role as RoleEnum]}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setRemoveDialogState({
                    isOpen: true,
                    roleId: role.id,
                    roleName: ROLE_DISPLAY_NAMES[role.role as RoleEnum],
                    tenantName: role.tenant_name,
                  })
                }
                aria-label={`Remove ${ROLE_DISPLAY_NAMES[role.role as RoleEnum]} role from ${role.tenant_name}`}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
            <p className="text-xs text-text-secondary">
              Assigned: {new Date(role.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      {/* Remove confirmation dialog */}
      <RemoveRoleDialog
        isOpen={removeDialogState.isOpen}
        onClose={() => setRemoveDialogState({ ...removeDialogState, isOpen: false })}
        userId={userId}
        roleId={removeDialogState.roleId}
        roleName={removeDialogState.roleName}
        tenantName={removeDialogState.tenantName}
      />
    </>
  );
}
