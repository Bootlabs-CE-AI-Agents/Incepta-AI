/**
 * Revert Confirmation Dialog Component
 *
 * Displays confirmation dialog before reverting to a previous prompt version.
 * Shows warning message, version details, and handles revert operation.
 *
 * Story: nextjs-story-28-prompts-version-history
 * AC: AC-3 (Revert Version with Confirmation)
 */

'use client';

import React from 'react';
import { Dialog } from '@headlessui/react';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useRevertPromptVersion, usePrompt } from '@/lib/hooks/usePrompts';
import type { PromptVersion } from '@/lib/api/prompts';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

interface RevertConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  version: PromptVersion;
  promptId: string;
}

export function RevertConfirmDialog({
  isOpen,
  onClose,
  version,
  promptId,
}: RevertConfirmDialogProps) {
  const { data: currentPrompt } = usePrompt(promptId);
  const revertMutation = useRevertPromptVersion();

  // Handle revert action (AC-3)
  const handleRevert = async () => {
    try {
      await revertMutation.mutateAsync({
        id: promptId,
        versionId: version.id,
      });
      // Success handled by mutation (toast + invalidate queries)
      onClose();
    } catch (error) {
      // Error handled by mutation (toast)
      console.error('Revert failed:', error);
      // Keep dialog open for retry
    }
  };

  // Handle ESC key to cancel (AC-10: Keyboard accessibility)
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && !revertMutation.isPending) {
      onClose();
    }
    if (event.key === 'Enter' && !revertMutation.isPending) {
      handleRevert();
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={revertMutation.isPending ? () => {} : onClose}
      className="relative z-50"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-start gap-4 px-6 py-5">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="flex-1">
              <Dialog.Title className="text-lg font-semibold text-text-primary dark:text-white mb-2">
                Revert to Version {version.version_number}?
              </Dialog.Title>
              <p className="text-sm text-text-secondary">
                Current prompt will be saved as a new version before reverting.
                This action cannot be undone.
              </p>
            </div>
          </div>

          {/* Version Details (AC-3) */}
          <div className="px-6 py-4 bg-white/50 dark:bg-white/5 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Selected Version:</span>
              <span className="font-medium text-text-primary dark:text-white">v{version.version_number}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Saved:</span>
              <span className="font-medium text-text-primary dark:text-white">
                {format(new Date(version.created_at), 'MMM dd, yyyy')}
              </span>
            </div>
            {currentPrompt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Current will become:</span>
                <span className="font-medium text-text-primary dark:text-white">
                  v{(currentPrompt.updated_at ? parseInt(currentPrompt.id, 10) : 0) + 1}
                </span>
              </div>
            )}
            {version.description && (
              <div className="text-sm">
                <span className="text-text-secondary">Description:</span>
                <p className="font-medium text-text-primary dark:text-white mt-1">{version.description}</p>
              </div>
            )}
          </div>

          {/* Actions (AC-3) */}
          <div className="flex items-center justify-end gap-3 px-6 py-4">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={revertMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRevert}
              disabled={revertMutation.isPending}
              aria-label={`Confirm revert to version ${version.version_number}`}
            >
              {revertMutation.isPending ? 'Reverting...' : 'Confirm Revert'}
            </Button>
          </div>

          {/* Error Display (AC-3: Error handling) */}
          {revertMutation.isError && (
            <div className="px-6 pb-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">
                  Failed to revert: {(revertMutation.error as Error).message}
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleRevert}
                  className="mt-2 text-red-600"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
