/**
 * Unified User Form Component
 *
 * Single reusable form with mode prop ('create' | 'edit') per AC-1 & AC-2
 * Replaces separate CreateUserForm and EditUserForm to avoid duplication
 *
 * Features:
 * - React Hook Form + Zod validation
 * - Conditional password fields (create only)
 * - Tenant and role selection
 * - Unsaved changes confirmation
 * - beforeunload event listener
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from './PasswordInput';
import { useTenants } from '@/lib/hooks/useTenants';
import {
  createUserSchema,
  editUserSchema,
  type CreateUserFormData,
  type EditUserFormData,
} from '@/lib/schemas/userForm';
import { roleLabels } from '@/lib/utils/users';
import type { RoleEnum } from '@/lib/api/users';

interface UserFormProps {
  mode: 'create' | 'edit';
  initialData?: EditUserFormData;
  onSubmit: (data: CreateUserFormData | EditUserFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function UserForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: UserFormProps) {
  const { data: tenants = [], isLoading: tenantsLoading } = useTenants();

  // Conditional schema based on mode
  const schema = mode === 'create' ? createUserSchema : editUserSchema;

  const form = useForm<CreateUserFormData | EditUserFormData>({
    resolver: zodResolver(schema),
    defaultValues: mode === 'create'
      ? {
          email: '',
          password: '',
          confirmPassword: '',
          full_name: '',
          default_tenant_id: '',
          initial_role: 'viewer' as RoleEnum,
          force_password_change: true,
          is_active: true,
        }
      : initialData || {
          email: '',
          full_name: '',
          default_tenant_id: '',
          force_password_change: false,
          is_active: true,
        },
  });

  const { handleSubmit, register, formState: { errors, isDirty }, watch } = form;
  const watchedPassword = mode === 'create' ? watch('password' as any) : undefined;

  // beforeunload event listener for unsaved changes (AC-7)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleCancel = () => {
    if (isDirty) {
      const confirmDiscard = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );
      if (!confirmDiscard) return;
    }
    onCancel();
  };

  const roles: RoleEnum[] = [
    'super_admin',
    'tenant_admin',
    'developer',
    'operator',
    'viewer',
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1.5">
          Email *
        </label>
        <Input
          id="email"
          type="email"
          placeholder="user@example.com"
          {...register('email')}
          disabled={isLoading}
          aria-required="true"
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="text-sm text-red-600 mt-1" role="alert" aria-live="polite">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password Fields (Create mode only) */}
      {mode === 'create' && (
        <>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5">
              Password *
            </label>
            <PasswordInput
              id="password"
              {...register('password' as any)}
              disabled={isLoading}
              currentPassword={watchedPassword}
              aria-required="true"
              aria-invalid={!!(errors as any).password}
            />
            {(errors as any).password && (
              <p className="text-sm text-red-600 mt-1" role="alert" aria-live="polite">
                {(errors as any).password.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1.5">
              Confirm Password *
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              {...register('confirmPassword' as any)}
              disabled={isLoading}
              aria-required="true"
              aria-invalid={!!(errors as any).confirmPassword}
            />
            {(errors as any).confirmPassword && (
              <p className="text-sm text-red-600 mt-1" role="alert" aria-live="polite">
                {(errors as any).confirmPassword.message}
              </p>
            )}
          </div>
        </>
      )}

      {/* Full Name Field */}
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium mb-1.5">
          Full Name
        </label>
        <Input
          id="full_name"
          type="text"
          placeholder="John Doe"
          {...register('full_name')}
          disabled={isLoading}
        />
        {errors.full_name && (
          <p className="text-sm text-red-600 mt-1" role="alert" aria-live="polite">
            {errors.full_name.message}
          </p>
        )}
      </div>

      {/* Default Tenant Dropdown */}
      <div>
        <label htmlFor="default_tenant_id" className="block text-sm font-medium mb-1.5">
          Default Tenant *
        </label>
        <Select
          id="default_tenant_id"
          {...register('default_tenant_id')}
          disabled={isLoading || tenantsLoading}
          aria-required="true"
          aria-invalid={!!errors.default_tenant_id}
        >
          <option value="">Select a tenant</option>
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name}
            </option>
          ))}
        </Select>
        {errors.default_tenant_id && (
          <p className="text-sm text-red-600 mt-1" role="alert" aria-live="polite">
            {errors.default_tenant_id.message}
          </p>
        )}
      </div>

      {/* Initial Role Dropdown (Create mode only) */}
      {mode === 'create' && (
        <div>
          <label htmlFor="initial_role" className="block text-sm font-medium mb-1.5">
            Initial Role *
          </label>
          <Select
            id="initial_role"
            {...register('initial_role' as any)}
            disabled={isLoading}
            aria-required="true"
            aria-invalid={!!(errors as any).initial_role}
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </Select>
          {(errors as any).initial_role && (
            <p className="text-sm text-red-600 mt-1" role="alert" aria-live="polite">
              {(errors as any).initial_role.message}
            </p>
          )}
        </div>
      )}

      {/* Force Password Change Checkbox */}
      <div className="flex items-center gap-2">
        <input
          id="force_password_change"
          type="checkbox"
          {...register('force_password_change')}
          disabled={isLoading}
          className="w-4 h-4 text-accent-blue border-white/50 dark:border-white/20 rounded focus:ring-accent-blue"
        />
        <label htmlFor="force_password_change" className="text-sm font-medium">
          Force password change on next login
        </label>
      </div>

      {/* Is Active Checkbox */}
      <div className="flex items-center gap-2">
        <input
          id="is_active"
          type="checkbox"
          {...register('is_active')}
          disabled={isLoading}
          className="w-4 h-4 text-accent-blue border-white/50 dark:border-white/20 rounded focus:ring-accent-blue"
        />
        <label htmlFor="is_active" className="text-sm font-medium">
          Is Active
        </label>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t border-white/50 dark:border-white/20">
        <Button
          type="button"
          variant="ghost"
          onClick={handleCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          variant="primary"
          disabled={isLoading || tenantsLoading}
          isLoading={isLoading}
          loadingText={mode === 'create' ? 'Creating...' : 'Saving...'}
        >
          {mode === 'create' ? 'Create User' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
