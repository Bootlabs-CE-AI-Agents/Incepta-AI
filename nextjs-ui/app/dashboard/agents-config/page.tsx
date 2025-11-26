"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AgentsTable } from '@/components/agents/AgentsTable';
import { Button, EmptyState, ConfirmDialog, ErrorState, Skeleton } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useAgents, useDeleteAgent } from '@/lib/hooks/useAgents';
import { Agent } from '@/lib/api/agents';
import { Plus, Bot } from 'lucide-react';

/**
 * Loading skeleton for agents list
 * Matches the table structure for seamless loading transition
 */
function AgentsLoadingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading agents">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-28 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Table skeleton */}
      <div className="glass-card overflow-hidden">
        {/* Table header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        {/* Table rows */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 border-b border-white/5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Agents List Page
 *
 * Displays all agents with CRUD operations
 * Reference: tech-spec Epic 3, Story 5
 */

export default function AgentsPage() {
  const router = useRouter();
  const { data: agents = [], isLoading, isError, error, refetch } = useAgents();
  const deleteAgentMutation = useDeleteAgent();

  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  const handleEdit = (agent: Agent) => {
    router.push(`/dashboard/agents-config/${agent.id}`);
  };

  const handleDelete = (agent: Agent) => {
    setAgentToDelete(agent);
  };

  const handleTest = (agent: Agent) => {
    router.push(`/dashboard/agents-config/${agent.id}?tab=test`);
  };

  const confirmDelete = async () => {
    if (!agentToDelete) return;

    deleteAgentMutation.mutate(agentToDelete.id, {
      onSuccess: () => {
        toast.success(`"${agentToDelete.name}" deleted successfully`);
        setAgentToDelete(null);
      },
      onError: (err) => {
        toast.error('Failed to delete agent', {
          description: err instanceof Error ? err.message : 'Please try again.',
        });
      },
    });
  };

  // Loading state with skeleton
  if (isLoading) {
    return (
      <DashboardLayout>
        <AgentsLoadingSkeleton />
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
              <h1 className="text-h1 font-bold text-text-primary">Agents</h1>
              <p className="text-sm text-text-secondary mt-1">
                Manage AI agents with custom LLM configurations and tool assignments
              </p>
            </div>
          </div>
          <ErrorState
            title="Failed to load agents"
            description="We couldn't load the agents list. Please check your connection and try again."
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
            <h1 className="text-h1 font-bold text-text-primary">Agents</h1>
            <p className="text-sm text-text-secondary mt-1">
              Manage AI agents with custom LLM configurations and tool assignments
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => router.push('/dashboard/agents-config/new')}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Agent
          </Button>
        </div>

        {/* Content - Empty state or table */}
        {agents.length === 0 ? (
          <EmptyState
            type="agents"
            title="No agents found"
            description="Get started by creating your first AI agent with custom LLM configuration"
            action={
              <Button onClick={() => router.push('/dashboard/agents-config/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Agent
              </Button>
            }
          />
        ) : (
          <AgentsTable
            agents={agents}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onTest={handleTest}
            isLoading={isLoading}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={!!agentToDelete}
          onClose={() => setAgentToDelete(null)}
          onConfirm={confirmDelete}
          title="Delete Agent"
          description={`Are you sure you want to delete "${agentToDelete?.name}"? This action cannot be undone and will affect any workflows using this agent.`}
          confirmLabel="Delete"
          confirmVariant="danger"
          isLoading={deleteAgentMutation.isPending}
          type="delete"
        />
      </div>
    </DashboardLayout>
  );
}
