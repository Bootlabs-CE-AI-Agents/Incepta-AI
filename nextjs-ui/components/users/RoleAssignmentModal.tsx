/**
 * Role Assignment Modal Component
 *
 * Main modal component for managing user role assignments (AC-2)
 * Uses Headless UI Dialog for accessibility (keyboard nav, ESC to close, focus trap)
 */

'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CurrentAssignmentsTable } from './CurrentAssignmentsTable';
import { AssignRoleForm } from './AssignRoleForm';
import type { UserDetail } from '@/lib/api/users';

export interface RoleAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserDetail | null;
}

/**
 * Role Assignment Modal (AC-2)
 *
 * Modal structure:
 * - Header: User name, email, close button
 * - Current Assignments Table: Tenant, Role badge, Remove button
 * - Assign New Role Form: Tenant dropdown, Role dropdown, Assign button
 * - Footer: Close button
 *
 * Features:
 * - Glassmorphic design (.glass-card class)
 * - Accessible via Headless UI Dialog (keyboard nav, ESC close)
 * - Mobile responsive: Full-screen < 768px, 600px width ≥ 768px
 */
export function RoleAssignmentModal({ isOpen, onClose, user }: RoleAssignmentModalProps) {
  if (!user) return null;

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

        {/* Modal container */}
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
                  w-full max-w-2xl
                  transform overflow-hidden rounded-lg
                  p-6 text-left align-middle shadow-xl
                  transition-all
                  sm:max-w-lg md:max-w-2xl
                "
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-semibold text-text-primary leading-6"
                  >
                    Manage Roles for {user.email}
                    <span className="block text-sm font-normal text-text-secondary mt-1">
                      User ID: {user.id.slice(0, 8)}...
                    </span>
                  </Dialog.Title>
                  <button
                    type="button"
                    className="
                      rounded-md text-text-secondary hover:text-text-primary
                      focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2
                      transition-colors
                    "
                    onClick={onClose}
                    aria-label="Close modal"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                {/* Current Assignments Table (AC-3, AC-5) */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-text-primary mb-3">
                    Current Role Assignments
                  </h4>
                  <CurrentAssignmentsTable userId={user.id} />
                </div>

                {/* Divider */}
                <div className="border-t border-border mb-6" />

                {/* Assign New Role Form (AC-4, AC-6, AC-7) */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-text-primary mb-3">
                    Assign New Role
                  </h4>
                  <AssignRoleForm userId={user.id} />
                </div>

                {/* Footer */}
                <div className="flex justify-end">
                  <Button variant="secondary" onClick={onClose}>
                    Close
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
