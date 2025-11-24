/**
 * User Action Buttons Component
 *
 * Action buttons with confirmation dialogs for user management
 * Implements AC-7 (Deactivate/Activate, Reset Password actions)
 * Implements HIGH-SEC-1 (Disabled states for security)
 */

'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Loader2 } from 'lucide-react';
import type { UserDetail } from '@/lib/api/users';
import { useUpdateUser, useResetPassword } from '@/lib/hooks/useUsers';
import { isLastSuperAdmin } from '@/lib/utils/users';

interface UserActionButtonsProps {
  user: UserDetail;
  currentUser: UserDetail | null;
  isSuperAdmin: boolean;
  allUsers: UserDetail[];
}

/**
 * UserActionButtons - Action buttons with confirmation dialogs
 *
 * Features (per AC-7):
 * - Deactivate/Activate button (toggles is_active with confirmation)
 * - Reset Password button (shows temp password in toast)
 * - Confirmation dialogs for all destructive actions
 * - Loading states during mutations
 * - Optimistic UI updates via useUpdateUser/useResetPassword hooks
 *
 * Security (HIGH-SEC-1):
 * - Cannot modify own account
 * - Cannot deactivate last super_admin
 * - tenant_admin can only modify users in their tenant
 *
 * @param user - User object from table row
 * @param currentUser - Current logged-in user
 * @param isSuperAdmin - Whether current user is super_admin
 * @param allUsers - All users in current view (for last admin check)
 */
export function UserActionButtons({ user, currentUser, isSuperAdmin, allUsers }: UserActionButtonsProps) {
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);

  const updateUserMutation = useUpdateUser();
  const resetPasswordMutation = useResetPassword();

  // HIGH-SEC-1: Security checks for action button permissions
  const canModify = useMemo(() => {
    // Cannot modify own account
    if (user.id === currentUser?.id) return false;

    // Cannot deactivate last active super_admin
    if (user.is_active && user.roles.some((r) => r.role === 'super_admin')) {
      if (isLastSuperAdmin(user.id, allUsers)) return false;
    }

    // tenant_admin can only modify users in their tenant
    if (!isSuperAdmin && user.default_tenant_id !== currentUser?.default_tenant_id) {
      return false;
    }

    return true;
  }, [user, currentUser, isSuperAdmin, allUsers]);

  // Handle deactivate/activate action (AC-7)
  const handleToggleActive = () => {
    updateUserMutation.mutate({
      userId: user.id,
      updates: { is_active: !user.is_active },
    });
    setShowDeactivateDialog(false);
  };

  // Handle reset password action (AC-7)
  const handleResetPassword = () => {
    resetPasswordMutation.mutate(user.id);
    setShowResetPasswordDialog(false);
  };

  const isLoading = updateUserMutation.isPending || resetPasswordMutation.isPending;

  return (
    <div className="flex items-center gap-2">
      {/* Deactivate/Activate Button */}
      <Button
        variant={user.is_active ? 'secondary' : 'primary'}
        size="sm"
        onClick={() => setShowDeactivateDialog(true)}
        disabled={!canModify || isLoading}
        title={
          !canModify
            ? user.id === currentUser?.id
              ? 'Cannot modify your own account'
              : !isSuperAdmin && user.default_tenant_id !== currentUser?.default_tenant_id
              ? 'Cannot modify users outside your tenant'
              : 'Cannot deactivate the last super admin'
            : undefined
        }
      >
        {updateUserMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : user.is_active ? (
          'Deactivate'
        ) : (
          'Activate'
        )}
      </Button>

      {/* Reset Password Button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setShowResetPasswordDialog(true)}
        disabled={!canModify || isLoading}
        title={
          !canModify
            ? user.id === currentUser?.id
              ? 'Cannot modify your own account'
              : !isSuperAdmin && user.default_tenant_id !== currentUser?.default_tenant_id
              ? 'Cannot modify users outside your tenant'
              : 'Cannot reset password for the last super admin'
            : undefined
        }
      >
        {resetPasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset Password'}
      </Button>

      {/* Deactivate/Activate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeactivateDialog}
        onClose={() => setShowDeactivateDialog(false)}
        onConfirm={handleToggleActive}
        title={user.is_active ? 'Deactivate User?' : 'Activate User?'}
        description={
          user.is_active
            ? `Are you sure you want to deactivate ${user.email}? This user will no longer be able to log in.`
            : `Are you sure you want to activate ${user.email}? This user will be able to log in again.`
        }
        confirmLabel={user.is_active ? 'Deactivate' : 'Activate'}
        confirmVariant={user.is_active ? 'danger' : 'primary'}
        isLoading={updateUserMutation.isPending}
      />

      {/* Reset Password Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetPasswordDialog}
        onClose={() => setShowResetPasswordDialog(false)}
        onConfirm={handleResetPassword}
        title="Reset Password?"
        description={`Are you sure you want to reset the password for ${user.email}? A temporary password will be generated and displayed once. The user will be required to change it on next login.`}
        confirmLabel="Reset Password"
        confirmVariant="primary"
        isLoading={resetPasswordMutation.isPending}
      />
    </div>
  );
}
