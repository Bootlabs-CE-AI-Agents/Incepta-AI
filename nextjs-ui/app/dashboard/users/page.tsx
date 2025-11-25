/**
 * Users Management Page
 *
 * Main page for user list, search, filters, and CRUD actions
 * Implements all 10 Acceptance Criteria from Story 23
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { SortingState } from '@tanstack/react-table';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { AlertCircle, RefreshCw, Plus } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useUsers } from '@/lib/hooks/useUsers';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { UsersTable } from '@/components/users/UsersTable';
import { UserFilters } from '@/components/users/UserFilters';
import { UserSearchInput } from '@/components/users/UserSearchInput';
import { RoleAssignmentModal } from '@/components/users/RoleAssignmentModal';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import type { RoleEnum } from '@/lib/api/users';
import type { UserDetail } from '@/lib/api/users';

const ITEMS_PER_PAGE = 20; // AC-5: Pagination with 20 items per page

/**
 * UsersPage - Main users management page
 *
 * Features (per AC-1 through AC-10):
 * - AC-1: Table display with 6 columns (Email, Roles, Status, Last Login, Created, Actions)
 * - AC-2: Client-side sorting on all columns except Actions
 * - AC-3: Email search with 300ms debounce
 * - AC-4: Status filter (All/Active/Inactive)
 * - AC-5: Role filter (All/Super Admin/Tenant Admin/Developer/Operator/Viewer)
 * - AC-6: Tenant filter (only for super_admin)
 * - AC-7: RBAC enforcement (super_admin sees all, tenant_admin scoped to default_tenant_id)
 * - AC-8: Action buttons (Deactivate/Activate, Reset Password)
 * - AC-9: Loading, error, and empty states
 * - AC-10: Responsive layout (desktop table, mobile cards)
 */
export default function UsersPage() {
  const router = useRouter();
  const { user: currentUser, isLoading: authLoading } = useAuth();

  // State management
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);
  const [roleFilter, setRoleFilter] = useState<RoleEnum | undefined>(undefined);
  const [tenantFilter, setTenantFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([]);

  // Role Assignment Modal state (Story 26 AC-1)
  const [roleModalState, setRoleModalState] = useState<{
    isOpen: boolean;
    user: UserDetail | null;
  }>({
    isOpen: false,
    user: null,
  });

  // Debounced search (AC-3: 300ms debounce)
  const debouncedSearch = useDebounce(search, 300);

  // RBAC enforcement (AC-7)
  useEffect(() => {
    if (!authLoading && currentUser && currentUser.roles) {
      const isSuperAdmin = currentUser.roles.some((r) => r.role === 'super_admin');
      const isTenantAdmin = currentUser.roles.some((r) => r.role === 'tenant_admin');

      // Redirect if user doesn't have permission
      if (!isSuperAdmin && !isTenantAdmin) {
        router.push('/dashboard');
        return;
      }

      // Auto-scope tenant_admin to their default_tenant_id (AC-7)
      if (isTenantAdmin && !isSuperAdmin) {
        setTenantFilter(currentUser.default_tenant_id);
      }
    }
  }, [authLoading, currentUser, router]);

  // Determine permissions
  const isSuperAdmin = currentUser?.roles?.some((r) => r.role === 'super_admin') || false;

  // Fetch users with filters (AC-1, AC-3, AC-4, AC-5, AC-6)
  const {
    data: usersData,
    isLoading,
    isError,
    error,
    refetch,
  } = useUsers({
    search: debouncedSearch || undefined,
    is_active: statusFilter,
    role: roleFilter,
    tenant_id: tenantFilter,
    limit: ITEMS_PER_PAGE,
    offset: page * ITEMS_PER_PAGE,
  });

  // Extract mock tenant list for super_admin (AC-6)
  // In real implementation, this would come from a useTenants() hook
  const tenants = useMemo(() => {
    if (!isSuperAdmin || !usersData) return [];

    // Extract unique tenants from users
    const tenantMap = new Map<string, string | null>();
    usersData.items.forEach((user) => {
      if (!tenantMap.has(user.default_tenant_id)) {
        tenantMap.set(user.default_tenant_id, user.default_tenant_name || user.default_tenant_id);
      }
    });

    return Array.from(tenantMap.entries()).map(([id, name]) => ({ id, name: name || id }));
  }, [isSuperAdmin, usersData]);

  // Total pages for pagination (AC-5)
  const totalPages = usersData ? Math.ceil(usersData.total / ITEMS_PER_PAGE) : 0;

  // Loading state during auth check (AC-9)
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Error state (AC-9)
  if (isError) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <EmptyState
            icon={<AlertCircle className="w-12 h-12 text-red-500" />}
            title="Failed to load users"
            description={error instanceof Error ? error.message : 'An error occurred while loading users. Please try again.'}
            action={
              <Button onClick={() => refetch()} variant="primary">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            }
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Page Header (AC-1: Title + Create User button) */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-h1 font-bold text-text-primary">Users Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
            {!isSuperAdmin && ' (scoped to your tenant)'}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/dashboard/users/new')}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create User
        </Button>
      </div>

      {/* Search and Filters (AC-3, AC-4, AC-5, AC-6) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {/* Search Input */}
        <UserSearchInput value={search} onChange={setSearch} />

        {/* Filters */}
        <UserFilters
          statusFilter={statusFilter}
          roleFilter={roleFilter}
          tenantFilter={tenantFilter}
          onStatusChange={setStatusFilter}
          onRoleChange={setRoleFilter}
          onTenantChange={setTenantFilter}
          isSuperAdmin={isSuperAdmin}
          tenants={tenants}
        />
      </div>

      {/* Users Table (AC-1, AC-2, AC-8) */}
      <UsersTable
        users={usersData?.items || []}
        isLoading={isLoading}
        sorting={sorting}
        onSortingChange={setSorting}
        currentUser={currentUser}
        isSuperAdmin={isSuperAdmin}
        onManageRoles={(user) =>
          setRoleModalState({ isOpen: true, user })
        }
      />

      {/* Pagination Controls (AC-5) */}
      {usersData && usersData.total > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            Showing {page * ITEMS_PER_PAGE + 1} to {Math.min((page + 1) * ITEMS_PER_PAGE, usersData.total)} of{' '}
            {usersData.total} users
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <div className="text-sm">
              Page {page + 1} of {totalPages}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Empty State (AC-9) */}
      {!isLoading && usersData && usersData.total === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No users found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {search || statusFilter !== undefined || roleFilter || tenantFilter
              ? 'Try adjusting your search or filters'
              : 'No users have been created yet'}
          </p>
          {(search || statusFilter !== undefined || roleFilter || tenantFilter) && (
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setStatusFilter(undefined);
                setRoleFilter(undefined);
                if (isSuperAdmin) {
                  setTenantFilter(undefined);
                }
                setPage(0);
              }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Role Assignment Modal (Story 26 AC-1, AC-2) */}
      <RoleAssignmentModal
        isOpen={roleModalState.isOpen}
        onClose={() => setRoleModalState({ isOpen: false, user: null })}
        user={roleModalState.user}
      />
      </div>
    </DashboardLayout>
  );
}
