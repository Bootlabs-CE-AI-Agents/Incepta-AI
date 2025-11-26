"use client";

import { useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Description } from '@headlessui/react';
import { Button } from './Button';
import { AlertTriangle, Trash2, RefreshCw, LogOut, X } from 'lucide-react';

/**
 * Confirmation Dialog Component
 *
 * Accessible confirmation modal for destructive actions with:
 * - Focus trapping (keyboard navigation stays within dialog)
 * - Escape key closes dialog
 * - Cancel button receives initial focus (safer default)
 * - role="alertdialog" for screen readers
 * - Loading state support
 *
 * Keyboard Navigation:
 * - Tab: Move focus to next element
 * - Shift+Tab: Move focus to previous element
 * - Escape: Close dialog (Cancel action)
 * - Enter/Space: Activate focused button
 *
 * Accessibility (WCAG 2.1 AA):
 * - role="alertdialog" and aria-modal="true"
 * - aria-labelledby for title
 * - aria-describedby for description
 * - Focus trapped within dialog
 * - Focus returns to trigger element on close
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   isOpen={isDeleteOpen}
 *   onClose={() => setIsDeleteOpen(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Tenant"
 *   description="Are you sure you want to delete this tenant? This action cannot be undone."
 *   confirmLabel="Delete"
 *   confirmVariant="danger"
 * />
 * ```
 *
 * Reference: Story 35 AC-7 (Confirmation Dialogs for Destructive Actions)
 */

interface ConfirmDialogProps {
  /**
   * Controls the dialog's open/closed state
   */
  isOpen: boolean;
  /**
   * Callback fired when dialog should close (Escape key, Cancel button, or backdrop)
   */
  onClose: () => void;
  /**
   * Callback fired when user confirms the action
   */
  onConfirm: () => void | Promise<void>;
  /**
   * Dialog title (required for accessibility)
   */
  title: string;
  /**
   * Dialog description explaining the action
   */
  description: string;
  /**
   * Text for the confirm button
   * @default "Confirm"
   */
  confirmLabel?: string;
  /**
   * Text for the cancel button
   * @default "Cancel"
   */
  cancelLabel?: string;
  /**
   * Confirm button style: 'primary' or 'danger'
   * Use 'danger' for destructive actions (delete, reset, etc.)
   * @default "primary"
   */
  confirmVariant?: 'primary' | 'danger';
  /**
   * Shows loading spinner on confirm button and disables both buttons
   * @default false
   */
  isLoading?: boolean;
  /**
   * Type of confirmation for icon display
   * @default "delete"
   */
  type?: 'delete' | 'reset' | 'logout' | 'warning' | 'custom';
  /**
   * Custom icon to display (only used when type="custom")
   */
  icon?: React.ReactNode;
}

const typeConfig = {
  delete: {
    icon: Trash2,
    iconBg: 'bg-red-100 dark:bg-red-900/20',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  reset: {
    icon: RefreshCw,
    iconBg: 'bg-orange-100 dark:bg-orange-900/20',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  logout: {
    icon: LogOut,
    iconBg: 'bg-blue-100 dark:bg-blue-900/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
  },
  custom: {
    icon: AlertTriangle,
    iconBg: 'bg-gray-100 dark:bg-gray-900/20',
    iconColor: 'text-gray-600 dark:text-gray-400',
  },
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  isLoading = false,
  type = 'delete',
  icon,
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const config = typeConfig[type];
  const IconComponent = config.icon;

  // Handle escape key - Headless UI does this automatically,
  // but we ensure it calls onClose
  const handleClose = useCallback(() => {
    if (!isLoading) {
      onClose();
    }
  }, [isLoading, onClose]);

  // Focus cancel button when dialog opens (safer default)
  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      // Small delay to ensure dialog is fully rendered
      const timer = setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      className="relative z-50"
      initialFocus={cancelButtonRef}
    >
      {/* Backdrop with blur effect */}
      <DialogBackdrop
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* Full-screen container to center the panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          className="
            max-w-sm w-full
            glass-card p-6 shadow-2xl
            transform transition-all duration-300
          "
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
        >
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`p-3 rounded-full ${config.iconBg}`}>
              {icon || <IconComponent size={24} className={config.iconColor} aria-hidden="true" />}
            </div>
          </div>

          {/* Title */}
          <DialogTitle
            id="confirm-dialog-title"
            className="text-lg font-semibold text-center text-text-primary dark:text-white"
          >
            {title}
          </DialogTitle>

          {/* Description */}
          <Description
            id="confirm-dialog-description"
            className="mt-2 text-sm text-center text-text-secondary dark:text-text-secondary"
          >
            {description}
          </Description>

          {/* Action Buttons */}
          <div
            className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3"
            role="group"
            aria-label="Dialog actions"
          >
            {/* Cancel Button - receives initial focus (safer default) */}
            <Button
              ref={cancelButtonRef}
              variant="ghost"
              onClick={handleClose}
              disabled={isLoading}
              className="sm:order-1"
              aria-label={`${cancelLabel} and close dialog`}
            >
              {cancelLabel}
            </Button>

            {/* Confirm Button */}
            <Button
              variant={confirmVariant}
              onClick={onConfirm}
              isLoading={isLoading}
              disabled={isLoading}
              className="sm:order-2"
              aria-label={`${confirmLabel} this action`}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export default ConfirmDialog;
