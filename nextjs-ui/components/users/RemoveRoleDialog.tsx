/**
 * Remove Role Confirmation Dialog Component
 *
 * Confirmation dialog for role removal with Headless UI (AC-5)
 */

'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRemoveRole } from '@/lib/hooks/useUserRoles';

export interface RemoveRoleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  roleId: string;
  roleName: string;
  tenantName: string;
}

/**
 * Remove Role Confirmation Dialog (AC-5)
 *
 * Features:
 * - Confirmation message with user, role, and tenant info
 * - Cancel and Remove buttons
 * - Accessible via Headless UI Dialog
 * - Calls useRemoveRole mutation with optimistic update (AC-8)
 * - Handles errors: 400 (last super_admin), 403 (forbidden), 404 (not found)
 */
export function RemoveRoleDialog({
  isOpen,
  onClose,
  userId,
  roleId,
  roleName,
  tenantName,
}: RemoveRoleDialogProps) {
  const { mutate: removeRole, isPending } = useRemoveRole(userId);

  const handleRemove = () => {
    removeRole(
      { roleId, roleName, tenantName },
      {
        onSuccess: () => {
          onClose(); // Close dialog after successful removal
        },
        // onError is handled in hook with toast
      }
    );
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        {/* Dialog container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className="
                  glass-card
                  w-full max-w-md
                  transform overflow-hidden rounded-lg
                  p-6 text-left align-middle shadow-xl
                  transition-all
                "
              >
                {/* Icon */}
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" aria-hidden="true" />
                </div>

                {/* Title */}
                <Dialog.Title
                  as="h3"
                  className="text-lg font-semibold text-text-primary mb-2"
                >
                  Remove Role Assignment?
                </Dialog.Title>

                {/* Message */}
                <div className="text-sm text-text-secondary mb-6">
                  <p className="mb-2">
                    Are you sure you want to remove the <strong className="text-text-primary">{roleName}</strong> role
                    from <strong className="text-text-primary">{tenantName}</strong>?
                  </p>
                  <p className="text-red-600 dark:text-red-400">
                    This action cannot be undone.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleRemove}
                    isLoading={isPending}
                    loadingText="Removing..."
                    disabled={isPending}
                  >
                    Remove
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
