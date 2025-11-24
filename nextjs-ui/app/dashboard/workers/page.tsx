/**
 * Workers Page - Worker Monitoring Dashboard
 *
 * Implements AC-1 through AC-8:
 * - Page layout with RBAC (AC-1)
 * - Summary metrics cards (AC-2)
 * - Workers table with status/metrics (AC-3)
 * - Table interactions (sorting/filtering) (AC-4)
 * - Auto-refresh with toggle (AC-5)
 * - Loading & error states (AC-6)
 * - Accessibility & responsive design (AC-7)
 * - Backend API integration (AC-8)
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { RefreshCw, RotateCcw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { WorkerMetricsCards } from '@/components/workers/WorkerMetricsCards';
import { WorkersTable } from '@/components/workers/WorkersTable';
import { WorkerLogsModal } from '@/components/workers/WorkerLogsModal';
import { WorkerRestartDialog } from '@/components/workers/WorkerRestartDialog';
import { useWorkers, useRestartWorker } from '@/lib/hooks/useWorkers';
import { formatDistanceToNow } from '@/lib/utils/date';
import type { WorkerStatus } from '@/lib/api/workers';

/**
 * Workers Page Component
 *
 * Admin-only page for monitoring Celery workers
 */
export default function WorkersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Auto-refresh state (AC-5)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // Logs modal state (Story 19)
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [selectedWorkerHostname, setSelectedWorkerHostname] = useState<string>('');

  // Restart dialog state (Story 20)
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [selectedWorkerForRestart, setSelectedWorkerForRestart] = useState<WorkerStatus | null>(null);

  // Performance charts state (Historical performance tracking)
  const [selectedWorkerForCharts, setSelectedWorkerForCharts] = useState<string>('');
  const [showCharts, setShowCharts] = useState(false);

  // Fetch workers with auto-refresh (AC-5, AC-8)
  const { data: workers, isLoading, isError, error, refetch, dataUpdatedAt, isFetching } = useWorkers(autoRefreshEnabled);

  // Restart worker mutation
  const { mutateAsync: restartWorkerAsync } = useRestartWorker();

  // RBAC enforcement (AC-1): Redirect non-admins to dashboard
  React.useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    // Check if user has admin role (super_admin or tenant_admin from backend)
    const isAdmin = session.user?.role === 'super_admin' || session.user?.role === 'tenant_admin';

    if (!isAdmin) {
      toast.error('Access denied. Admin access required.');
      router.push('/dashboard');
    }
  }, [session, status, router]);

  /**
   * Handle manual refresh (AC-5)
   */
  const handleManualRefresh = () => {
    refetch();
  };

  /**
   * Handle view logs action - Opens logs modal (Story 19)
   */
  const handleViewLogs = (hostname: string) => {
    setSelectedWorkerHostname(hostname);
    setLogsModalOpen(true);
  };

  /**
   * Handle restart action (Story 20) - Open confirmation dialog (AC-2)
   */
  const handleRestart = (hostname: string) => {
    const worker = workers?.find((w) => w.hostname === hostname);
    if (!worker) {
      toast.error('Worker not found');
      return;
    }

    setSelectedWorkerForRestart(worker);
    setRestartDialogOpen(true);
  };

  /**
   * Handle restart confirmation from dialog (AC-3)
   */
  const handleConfirmRestart = async (hostname: string) => {
    await restartWorkerAsync(hostname);
  };

  // Loading state check for RBAC redirect
  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  // Calculate "last refreshed" timestamp (AC-5)
  const lastRefreshed = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  const lastRefreshedText = lastRefreshed ? formatDistanceToNow(lastRefreshed) : 'Never';

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header (AC-1) */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Worker Monitoring</h1>
            <p className="text-muted-foreground mt-1">
              Monitor Celery worker health, status, and performance
            </p>
          </div>

          {/* Refresh Controls (AC-5) */}
          <div className="flex items-center gap-4">
            {/* Last Refreshed (AC-5) */}
            <div className="text-sm text-muted-foreground">
              {isFetching ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Updating...
                </span>
              ) : (
                <span>Updated {lastRefreshedText}</span>
              )}
            </div>

            {/* Auto-refresh Toggle (AC-5) */}
            <div className="flex items-center gap-2">
              <Switch
                checked={autoRefreshEnabled}
                onCheckedChange={setAutoRefreshEnabled}
                aria-label="Auto-refresh toggle"
              />
              <label htmlFor="auto-refresh" className="text-sm font-medium cursor-pointer">
                Auto-refresh (30s)
              </label>
            </div>

            {/* Manual Refresh Button (AC-5) */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isFetching}
              aria-label="Refresh workers data"
            >
              <RotateCcw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error State (AC-6) */}
        {isError && (
          <div className="glass-card p-6 rounded-xl border border-red-500/50 bg-red-500/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-red-600">Failed to load workers</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {error instanceof Error ? error.message : 'An error occurred while fetching workers'}
                </p>
              </div>
              <Button variant="danger" onClick={handleManualRefresh}>
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Summary Metrics Cards (AC-2) */}
        <WorkerMetricsCards workers={workers || []} loading={isLoading} />

        {/* Workers Table (AC-3, AC-4) */}
        <WorkersTable
          workers={workers || []}
          loading={isLoading}
          onViewLogs={handleViewLogs}
          onRestart={handleRestart}
        />

        {/* Historical Performance Charts Section */}
        {workers && workers.length > 0 && (
          <div className="glass-card rounded-xl border border-border/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-xl font-bold text-foreground">Historical Performance</h2>
                  <p className="text-sm text-muted-foreground">View detailed performance metrics over time</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Worker Selector */}
                <select
                  value={selectedWorkerForCharts}
                  onChange={(e) => {
                    setSelectedWorkerForCharts(e.target.value);
                    setShowCharts(!!e.target.value);
                  }}
                  className="px-4 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="">Select worker to view charts...</option>
                  {workers.map((worker) => (
                    <option key={worker.hostname} value={worker.hostname}>
                      {worker.hostname} ({worker.status})
                    </option>
                  ))}
                </select>

                {selectedWorkerForCharts && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedWorkerForCharts('');
                      setShowCharts(false);
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Charts Display - Story 21: Charts now appear in expandable table rows (AC-1) */}
            {/* TODO: Remove this section after confirming expandable row charts work correctly */}
            {showCharts && selectedWorkerForCharts && (
              <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Performance charts are now available in the expandable table rows.</p>
                <p className="text-xs mt-2">Click on any worker row in the table above to view detailed metrics.</p>
              </div>
            )}

            {!showCharts && (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Click on any worker row in the table above to view performance charts</p>
              </div>
            )}
          </div>
        )}

        {/* Worker Logs Modal (Story 19) */}
        {logsModalOpen && selectedWorkerHostname && (
          <WorkerLogsModal
            hostname={selectedWorkerHostname}
            isOpen={logsModalOpen}
            onClose={() => {
              setLogsModalOpen(false);
              setSelectedWorkerHostname('');
            }}
          />
        )}

        {/* Worker Restart Confirmation Dialog (Story 20) */}
        <WorkerRestartDialog
          worker={selectedWorkerForRestart}
          isOpen={restartDialogOpen}
          onClose={() => {
            setRestartDialogOpen(false);
            setSelectedWorkerForRestart(null);
          }}
          onConfirm={handleConfirmRestart}
        />
      </div>
    </DashboardLayout>
  );
}
