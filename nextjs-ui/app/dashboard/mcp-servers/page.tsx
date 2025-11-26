/**
 * MCP Servers List Page
 *
 * Displays all MCP servers with filtering, CRUD operations, and connection testing.
 *
 * Features:
 * - Loading skeleton while fetching
 * - Error state with retry
 * - Confirmation dialog for delete
 * - Toast notifications for success/error
 *
 * Reference: Story 35 AC-1 (Loading States), AC-2 (Error States), AC-7 (Confirmations)
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Server } from 'lucide-react';
import { Button, Skeleton, ErrorState, EmptyState, ConfirmDialog } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { McpServerTable } from '@/components/mcp-servers/McpServerTable';
import { useMCPServers, useDeleteMCPServer, useTestMCPServerConnection } from '@/lib/hooks/useMCPServers';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

/**
 * Loading skeleton for MCP servers list
 */
function McpServersLoadingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading MCP servers">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-36 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Table skeleton */}
      <div className="glass-card overflow-hidden">
        {/* Table header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        {/* Table rows */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 border-b border-white/5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <div className="flex gap-2">
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
 * MCP Servers List Page
 */
export default function McpServersPage() {
  const { data: servers, isLoading, isError, error, refetch } = useMCPServers();
  const deleteMutation = useDeleteMCPServer();
  const testMutation = useTestMCPServerConnection();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<{ id: string; name: string } | null>(null);

  /**
   * Handle delete server
   */
  const handleDelete = (id: string) => {
    const server = servers?.find((s) => s.id === id);
    if (server) {
      setServerToDelete({ id, name: server.name });
      setDeleteDialogOpen(true);
    }
  };

  /**
   * Confirm delete
   */
  const confirmDelete = async () => {
    if (serverToDelete) {
      deleteMutation.mutate(serverToDelete.id, {
        onSuccess: () => {
          toast.success(`"${serverToDelete.name}" deleted successfully`);
          setDeleteDialogOpen(false);
          setServerToDelete(null);
        },
        onError: (err) => {
          toast.error('Failed to delete server', {
            description: err instanceof Error ? err.message : 'Please try again.',
          });
        },
      });
    }
  };

  /**
   * Handle test connection
   */
  const handleTest = async (id: string) => {
    const server = servers?.find((s) => s.id === id);
    const serverName = server?.name || 'server';

    testMutation.mutate(
      { server_id: id },
      {
        onSuccess: (data) => {
          if (data.status === 'healthy') {
            toast.success(`Connection to "${serverName}" successful`);
          } else {
            toast.warning(`Connection to "${serverName}" unhealthy`, {
              description: data.error || 'Server may be unavailable.',
            });
          }
        },
        onError: (err) => {
          toast.error(`Failed to test "${serverName}"`, {
            description: err instanceof Error ? err.message : 'Connection test failed.',
          });
        },
      }
    );
  };

  // Loading state with skeleton
  if (isLoading) {
    return (
      <DashboardLayout>
        <McpServersLoadingSkeleton />
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
              <h1 className="text-h1 font-bold text-text-primary">MCP Servers</h1>
              <p className="text-muted-foreground mt-2">
                Manage Model Context Protocol server connections
              </p>
            </div>
          </div>
          <ErrorState
            title="Failed to load MCP servers"
            description="We couldn't load the MCP servers list. Please check your connection and try again."
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
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h1 font-bold text-text-primary">MCP Servers</h1>
            <p className="text-muted-foreground mt-2">
              Manage Model Context Protocol server connections
            </p>
          </div>
          <Link href="/dashboard/mcp-servers/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Server
            </Button>
          </Link>
        </div>

        {/* MCP Servers Table or Empty State */}
        {!servers || servers.length === 0 ? (
          <EmptyState
            type="servers"
            title="No MCP servers configured"
            description="Add your first Model Context Protocol server to extend agent capabilities"
            action={
              <Link href="/dashboard/mcp-servers/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Server
                </Button>
              </Link>
            }
          />
        ) : (
          <McpServerTable
            servers={servers}
            onDelete={handleDelete}
            onTest={handleTest}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setServerToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Delete MCP Server"
          description={`Are you sure you want to delete "${serverToDelete?.name}"? This action cannot be undone and agents using this server will lose access to its tools.`}
          confirmLabel="Delete"
          confirmVariant="danger"
          isLoading={deleteMutation.isPending}
          type="delete"
        />
      </div>
    </DashboardLayout>
  );
}
