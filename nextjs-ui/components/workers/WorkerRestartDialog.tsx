/**
 * Worker Restart Confirmation Dialog
 *
 * Two-step confirmation modal for worker restart (AC-2, AC-3, AC-5, AC-7)
 *
 * Features:
 * - Displays worker details (hostname, status, current task, uptime) (AC-2)
 * - Warning message for active/stuck workers (AC-2)
 * - Info message for idle workers (AC-2)
 * - Keyboard shortcuts (ESC, Enter, Tab) (AC-7)
 * - Error handling with retry (AC-5)
 * - Mobile responsive (stacked buttons) (AC-8)
 */

'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { WorkerStatus } from '@/lib/api/workers';
import { formatUptime } from '@/lib/utils/workers';

export interface WorkerRestartDialogProps {
  /**
   * Worker to restart (null when dialog is closed)
   */
  worker: WorkerStatus | null;
  /**
   * Dialog open state
   */
  isOpen: boolean;
  /**
   * Close dialog callback
   */
  onClose: () => void;
  /**
   * Restart worker mutation function from useRestartWorker hook
   */
  onConfirm: (hostname: string) => Promise<void>;
}

/**
 * Get status badge color (matches WorkersTable color coding per C8)
 *
 * AC-2: Color-coded status badges
 * - active: green
 * - idle: yellow
 * - unresponsive/stuck: red
 */
function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-500 text-white';
    case 'idle':
      return 'bg-yellow-500 text-black';
    case 'unresponsive':
    case 'stuck':
      return 'bg-red-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

/**
 * Restart confirmation dialog component (AC-2, AC-3, AC-5, AC-7, AC-8)
 *
 * Implements two-step confirmation flow with worker context display
 */
export function WorkerRestartDialog({ worker, isOpen, onClose, onConfirm }: WorkerRestartDialogProps) {
  const [isRestarting, setIsRestarting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  if (!worker) {
    return null;
  }

  // AC-2: Determine if worker is processing task
  const statusStr = worker.status as string;
  const isProcessingTask = statusStr === 'active' || statusStr === 'stuck';

  /**
   * Handle confirm restart button click (AC-3, AC-5)
   */
  const handleConfirm = async () => {
    setIsRestarting(true);

    try {
      await onConfirm(worker.hostname);

      // AC-3: Success - close dialog, show success toast, optimistic update
      // Toast is handled in useRestartWorker hook onSuccess callback
      onClose();
      setRetryCount(0);
    } catch (error) {
      // AC-5: Error handling with specific messages
      setIsRestarting(false);

      const errorMessage = error instanceof Error ? error.message : 'An error occurred';

      // Check for specific HTTP error codes (AC-5)
      if (errorMessage.includes('404')) {
        // Worker not found
        toast.error(`Worker ${worker.hostname} not found. It may have been terminated.`);
        onClose();
      } else if (errorMessage.includes('403')) {
        // Insufficient permissions
        toast.error('You do not have permission to restart workers. Contact your admin.');
        onClose();
      } else if (errorMessage.includes('409')) {
        // Already restarting
        toast.error(`Worker ${worker.hostname} is already restarting. Please wait.`);
        onClose();
      } else if (errorMessage.includes('503')) {
        // API unavailable - keep dialog open for retry
        toast.error('Failed to restart worker. API service unavailable.');
        // Dialog stays open, retry button will appear
      } else {
        // Network error or other - keep dialog open for retry
        toast.error('Network error. Check your connection and try again.');
        // Dialog stays open, retry button will appear
      }

      // Increment retry count
      setRetryCount(prev => prev + 1);
    }
  };

  /**
   * Handle retry button click (AC-5)
   */
  const handleRetry = () => {
    if (retryCount >= MAX_RETRIES) {
      toast.error('Maximum retry attempts reached. Please try again later.');
      onClose();
      setRetryCount(0);
    } else {
      handleConfirm();
    }
  };

  /**
   * Handle cancel/close (AC-7)
   */
  const handleClose = () => {
    if (!isRestarting) {
      onClose();
      setRetryCount(0);
    }
  };

  // AC-2: Prepare worker details for display
  const statusBadgeClass = getStatusBadgeClass(statusStr);
  const currentTask = (worker as { current_task_id?: string }).current_task_id || 'None';
  const uptime = formatUptime(worker.uptime_seconds);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Restart Worker Confirmation"
      description="Review worker details before confirming restart"
      size="md" // AC-2: max-w-md for focused decision dialog
      className="max-w-full md:max-w-md" // AC-8: Full width on mobile
    >
      {/* Worker Details (AC-2) */}
      <div className="space-y-3 py-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Hostname:</span>
          <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
            {worker.hostname}
          </code>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
          <Badge className={statusBadgeClass}>
            {worker.status}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Task:</span>
          <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
            {currentTask}
          </code>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Uptime:</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">{uptime}</span>
        </div>
      </div>

      {/* Warning/Info Message (AC-2) */}
      {isProcessingTask ? (
        <div className="flex gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800 dark:text-yellow-300">
            <strong>Warning:</strong> This worker is currently processing task{' '}
            <code className="bg-yellow-100 dark:bg-yellow-800 px-1 py-0.5 rounded">{currentTask}</code>.
            Restarting will terminate this task. The task may be requeued or marked as failed depending on Celery configuration.
          </div>
        </div>
      ) : (
        <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Info:</strong> This worker is idle. Restarting will not affect any tasks.
          </div>
        </div>
      )}

      {/* Actions (AC-3, AC-7, AC-8) */}
      <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 justify-end">
        {/* AC-8: Stack buttons vertically on mobile (Cancel below Confirm when using flex-col-reverse) */}
        <Button
          variant="ghost"
          onClick={handleClose}
          disabled={isRestarting}
          className="w-full sm:w-auto min-h-[44px]" // AC-8: Touch-friendly size
        >
          Cancel
        </Button>

        {/* Show retry button if error occurred and retries remain (AC-5) */}
        {retryCount > 0 && retryCount < MAX_RETRIES && !isRestarting ? (
          <Button
            variant="primary"
            onClick={handleRetry}
            className="w-full sm:w-auto min-h-[44px]"
          >
            Retry Restart ({MAX_RETRIES - retryCount} attempts left)
          </Button>
        ) : (
          <Button
            variant="danger" // AC-2: Danger variant (red) for destructive action
            onClick={handleConfirm}
            disabled={isRestarting}
            className="w-full sm:w-auto min-h-[44px]" // AC-8: Touch-friendly size
          >
            {isRestarting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Restarting...
              </>
            ) : (
              'Confirm Restart'
            )}
          </Button>
        )}
      </div>
    </Modal>
  );
}
