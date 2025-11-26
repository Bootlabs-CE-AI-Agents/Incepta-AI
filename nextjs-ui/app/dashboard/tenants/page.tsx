"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TenantsTable } from '@/components/tenants/TenantsTable';
import { Button, EmptyState, ConfirmDialog, ErrorState, Skeleton } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useTenants, useDeleteTenant } from '@/lib/hooks/useTenants';
import { Tenant } from '@/lib/api/tenants';
import { Plus, Building2 } from 'lucide-react';

/**
 * Loading skeleton for tenants list
 * Matches the table structure for seamless loading transition
 */
function TenantsLoadingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading tenants">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Table skeleton */}
      <div className="glass-card overflow-hidden">
        {/* Table header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        {/* Table rows */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 border-b border-white/5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Tenants List Page
 *
 * Displays all tenants with CRUD operations
 * Reference: tech-spec Epic 3, Story 4
 */

export default function TenantsPage() {
  const router = useRouter();
  const { data: tenants = [], isLoading, isError, error, refetch } = useTenants();
  const deleteTenantMutation = useDeleteTenant();

  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);

  const handleEdit = (tenant: Tenant) => {
    router.push(`/dashboard/tenants/${tenant.id}`);
  };

  const handleDelete = (tenant: Tenant) => {
    setTenantToDelete(tenant);
  };

  const confirmDelete = async () => {
    if (!tenantToDelete) return;

    deleteTenantMutation.mutate(tenantToDelete.id, {
      onSuccess: () => {
        toast.success(`"${tenantToDelete.name}" deleted successfully`);
        setTenantToDelete(null);
      },
      onError: (err) => {
        toast.error('Failed to delete tenant', {
          description: err instanceof Error ? err.message : 'Please try again.',
        });
      },
    });
  };

  // Loading state with skeleton
  if (isLoading) {
    return (
      <DashboardLayout>
        <TenantsLoadingSkeleton />
      </DashboardLayout>
    );
  }

  // Error state with retry
  if (isError) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-h1 font-bold text-text-primary">Tenants</h1>
              <p className="text-sm text-text-secondary mt-1">
                Manage tenant organizations and their configurations
              </p>
            </div>
          </div>
          <ErrorState
            title="Failed to load tenants"
            description="We couldn't load the tenants list. Please check your connection and try again."
            error={error instanceof Error ? error : null}
            onRetry={() => refetch()}
            showDetails={process.env.NODE_ENV === 'development'}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h1 font-bold text-text-primary">Tenants</h1>
            <p className="text-sm text-text-secondary mt-1">
              Manage tenant organizations and their configurations
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => router.push('/dashboard/tenants/new')}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Tenant
          </Button>
        </div>

        {/* Content - Empty state or table */}
        {tenants.length === 0 ? (
          <EmptyState
            type="tenants"
            title="No tenants found"
            description="Get started by creating your first tenant organization"
            action={
              <Button onClick={() => router.push('/dashboard/tenants/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Tenant
              </Button>
            }
          />
        ) : (
          <TenantsTable
            tenants={tenants}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={!!tenantToDelete}
          onClose={() => setTenantToDelete(null)}
          onConfirm={confirmDelete}
          title="Delete Tenant"
          description={`Are you sure you want to delete "${tenantToDelete?.name}"? This action cannot be undone and will affect ${tenantToDelete?.agent_count || 0} associated agents.`}
          confirmLabel="Delete"
          confirmVariant="danger"
          isLoading={deleteTenantMutation.isPending}
          type="delete"
        />
      </div>
    </DashboardLayout>
  );
}
