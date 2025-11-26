/**
 * LLM Providers List Page
 *
 * Displays all LLM providers in a card grid layout with:
 * - Provider cards (3 columns desktop, 1 mobile)
 * - Status filter (All, Healthy, Unhealthy)
 * - Add Provider button
 * - Test connection and delete actions
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ProviderGrid } from '@/components/llm-providers/ProviderGrid';
import { Button, ConfirmDialog, Skeleton, ErrorState, EmptyState } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useLLMProviders, useDeleteLLMProvider } from '@/lib/hooks/useLLMProviders';
import { Plus, Cpu } from 'lucide-react';

/**
 * Loading skeleton for LLM providers grid
 */
function ProvidersLoadingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading LLM providers">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Filters skeleton */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-20 rounded-lg" />
          <Skeleton className="h-10 w-20 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>

      {/* Grid skeleton - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="pt-4 border-t border-white/10 flex gap-2">
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LLMProvidersPage() {
  const router = useRouter();
  const { data: providers, isLoading, isError, error, refetch } = useLLMProviders();
  const deleteProviderMutation = useDeleteLLMProvider();

  const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'unhealthy'>('all');
  const [deleteDialogState, setDeleteDialogState] = useState<{
    isOpen: boolean;
    providerId: string | null;
    providerName: string;
  }>({
    isOpen: false,
    providerId: null,
    providerName: '',
  });

  const handleTest = (id: string) => {
    // Navigate to detail page with test tab
    router.push(`/dashboard/llm-providers/${id}?tab=test`);
  };

  const handleDelete = (id: string) => {
    const provider = providers?.find((p) => p.id === id);
    if (provider) {
      setDeleteDialogState({
        isOpen: true,
        providerId: id,
        providerName: provider.name,
      });
    }
  };

  const confirmDelete = () => {
    if (deleteDialogState.providerId) {
      deleteProviderMutation.mutate(deleteDialogState.providerId, {
        onSuccess: () => {
          toast.success(`"${deleteDialogState.providerName}" deleted successfully`);
          setDeleteDialogState({ isOpen: false, providerId: null, providerName: '' });
        },
        onError: (err) => {
          toast.error('Failed to delete provider', {
            description: err instanceof Error ? err.message : 'Please try again.',
          });
        },
      });
    }
  };

  // Filter providers by status
  const filteredProviders = providers?.filter((provider) => {
    if (statusFilter === 'all') return true;
    return provider.status === statusFilter;
  }) || [];

  // Loading state with skeleton
  if (isLoading) {
    return (
      <DashboardLayout>
        <ProvidersLoadingSkeleton />
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
              <h1 className="text-h1 font-bold text-text-primary">
                LLM Providers
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                Manage AI model providers and configurations
              </p>
            </div>
          </div>
          <ErrorState
            title="Failed to load providers"
            description="We couldn't load the LLM providers list. Please check your connection and try again."
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
            <h1 className="text-h1 font-bold text-text-primary">
              LLM Providers
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Manage AI model providers and configurations
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard/llm-providers/new')} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Provider
          </Button>
        </div>

        {/* Filters */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">Filter by status:</span>
            <div className="flex gap-2">
              {(['all', 'healthy', 'unhealthy'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === filter
                      ? 'bg-accent-primary text-white'
                      : 'bg-glass-surface text-text-secondary hover:bg-glass-surface-hover'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
            <span className="text-sm text-text-tertiary ml-auto">
              {filteredProviders.length} provider{filteredProviders.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Provider Grid or Empty State */}
        {!providers || providers.length === 0 ? (
          <EmptyState
            icon={<Cpu className="w-12 h-12" />}
            title="No LLM providers configured"
            description="Add your first AI model provider to start using agents"
            action={
              <Button onClick={() => router.push('/dashboard/llm-providers/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Provider
              </Button>
            }
          />
        ) : filteredProviders.length === 0 ? (
          <EmptyState
            type="search"
            title="No matching providers"
            description={`No providers found with status "${statusFilter}". Try a different filter.`}
            action={
              <Button variant="ghost" onClick={() => setStatusFilter('all')}>
                Clear filter
              </Button>
            }
          />
        ) : (
          <ProviderGrid
            providers={filteredProviders}
            onTest={handleTest}
            onDelete={handleDelete}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={deleteDialogState.isOpen}
          onClose={() => setDeleteDialogState({ isOpen: false, providerId: null, providerName: '' })}
          onConfirm={confirmDelete}
          title={`Delete ${deleteDialogState.providerName}?`}
          description="Agents using this provider will fail until reassigned to another provider. This action cannot be undone."
          confirmLabel="Delete Provider"
          confirmVariant="danger"
          isLoading={deleteProviderMutation.isPending}
          type="delete"
        />
      </div>
    </DashboardLayout>
  );
}
