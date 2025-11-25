'use client';

/**
 * Create User Page (/users/new)
 * Form for creating new user account
 * Fields: Email, Password, Tenant, Role, Send Welcome Email
 */

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCreateUser } from '@/lib/hooks/useUsers';
import { useTenants } from '@/lib/hooks/useTenants';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import type { RoleEnum } from '@/lib/api/users';

/**
 * Password strength validation rules (matching backend validation)
 * 1. At least 12 characters
 * 2. Contains uppercase letter
 * 3. Contains lowercase letter
 * 4. Contains number
 * 5. Contains special character
 */
const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  default_tenant_id: z.string().min(1, 'Tenant is required'),
  initial_role: z.enum(['super_admin', 'tenant_admin', 'developer', 'operator', 'viewer'] as const),
  send_welcome_email: z.boolean().default(true),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

const ROLE_OPTIONS: { value: RoleEnum; label: string; description: string }[] = [
  {
    value: 'super_admin',
    label: 'Super Admin',
    description: 'Full system access across all tenants',
  },
  {
    value: 'tenant_admin',
    label: 'Tenant Admin',
    description: 'Admin access within assigned tenant',
  },
  {
    value: 'developer',
    label: 'Developer',
    description: 'Can configure agents, prompts, and tools',
  },
  {
    value: 'operator',
    label: 'Operator',
    description: 'Can view and execute agents',
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Read-only access',
  },
];

export default function NewUserPage() {
  console.log('🔍 NewUserPage: Component rendering...');

  const router = useRouter();
  console.log('🔍 NewUserPage: router initialized');

  const { user, isLoading: authLoading } = useAuth();
  console.log('🔍 NewUserPage: useAuth result:', { user, authLoading });

  const createMutation = useCreateUser();
  console.log('🔍 NewUserPage: useCreateUser initialized');

  const { data: tenantsData, isLoading: tenantsLoading } = useTenants();
  console.log('🔍 NewUserPage: useTenants result:', { tenantsData, tenantsLoading });

  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');

  const isSuperAdmin = user?.roles?.some((r) => r.role === 'super_admin') || false;
  const isTenantAdmin = user?.roles?.some((r) => r.role === 'tenant_admin') || false;
  const canCreate = isSuperAdmin || isTenantAdmin;
  console.log('🔍 NewUserPage: Permissions:', { isSuperAdmin, isTenantAdmin, canCreate });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      default_tenant_id: '',
      initial_role: 'viewer',
      send_welcome_email: true,
    },
  });
  console.log('🔍 NewUserPage: useForm initialized');

  // Watch password for strength indicator
  const password = watch('password');
  useEffect(() => {
    setPasswordValue(password || '');
  }, [password]);

  // Redirect if no permission
  useEffect(() => {
    if (!authLoading && user && !canCreate) {
      router.push('/dashboard/users');
    }
  }, [authLoading, user, canCreate, router]);

  // Password strength checks
  const passwordChecks = {
    length: passwordValue.length >= 12,
    uppercase: /[A-Z]/.test(passwordValue),
    lowercase: /[a-z]/.test(passwordValue),
    number: /[0-9]/.test(passwordValue),
    special: /[^A-Za-z0-9]/.test(passwordValue),
  };

  const onSubmit = async (data: CreateUserForm) => {
    try {
      const result = await createMutation.mutateAsync(data);
      router.push('/dashboard/users');
    } catch (error) {
      // Error handling is done by the mutation hook
      console.error('Failed to create user:', error);
    }
  };

  // Loading state during auth check
  if (authLoading) {
    console.log('🔍 NewUserPage: Rendering loading state');
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
            <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!canCreate) {
    console.log('🔍 NewUserPage: Rendering no permission message');
    return (
      <DashboardLayout>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-sm text-yellow-800">
            You do not have permission to create users.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  console.log('🔍 NewUserPage: Rendering main form');

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Create New User</h1>
              <p className="text-muted-foreground mt-1">
                Add a new user account with role assignment
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="glass-card p-6 space-y-6">
            {/* Email */}
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="user@example.com"
                className="mt-2"
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password">Password *</Label>
              <div className="relative mt-2">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="Enter secure password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
              )}

              {/* Password Strength Indicator */}
              {passwordValue && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Password Requirements:</p>
                  <div className="grid grid-cols-1 gap-1">
                    <PasswordCheck met={passwordChecks.length} label="At least 12 characters" />
                    <PasswordCheck met={passwordChecks.uppercase} label="One uppercase letter (A-Z)" />
                    <PasswordCheck met={passwordChecks.lowercase} label="One lowercase letter (a-z)" />
                    <PasswordCheck met={passwordChecks.number} label="One number (0-9)" />
                    <PasswordCheck met={passwordChecks.special} label="One special character (!@#$%...)" />
                  </div>
                </div>
              )}
            </div>

            {/* Tenant Selection */}
            <div>
              <Label htmlFor="default_tenant_id">Default Tenant *</Label>
              <select
                id="default_tenant_id"
                {...register('default_tenant_id')}
                className="mt-2 w-full px-4 py-2 rounded-lg bg-white/50 border border-white/50 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all duration-fast backdrop-blur-glass"
                disabled={tenantsLoading}
              >
                <option value="">Select a tenant...</option>
                {(tenantsData || []).map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
              {errors.default_tenant_id && (
                <p className="text-sm text-red-500 mt-1">{errors.default_tenant_id.message}</p>
              )}
              {tenantsLoading && (
                <p className="text-sm text-muted-foreground mt-1">Loading tenants...</p>
              )}
            </div>

            {/* Role Selection */}
            <div>
              <Label htmlFor="initial_role">Initial Role *</Label>
              <select
                id="initial_role"
                {...register('initial_role')}
                className="mt-2 w-full px-4 py-2 rounded-lg bg-white/50 border border-white/50 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all duration-fast backdrop-blur-glass"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label} - {role.description}
                  </option>
                ))}
              </select>
              {errors.initial_role && (
                <p className="text-sm text-red-500 mt-1">{errors.initial_role.message}</p>
              )}
            </div>

            {/* Send Welcome Email */}
            <div className="flex items-center gap-2">
              <input
                id="send_welcome_email"
                type="checkbox"
                {...register('send_welcome_email')}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="send_welcome_email" className="!mb-0">
                Send welcome email with login instructions
              </Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || Object.keys(errors).length > 0}
            >
              {isSubmitting ? 'Creating...' : 'Create User'}
            </Button>
          </div>

          {/* Error Message */}
          {createMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : 'Failed to create user. Please try again.'}
              </p>
            </div>
          )}
        </form>
      </div>
    </DashboardLayout>
  );
}

/**
 * Password requirement check indicator
 */
function PasswordCheck({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={`text-sm ${met ? 'text-green-700' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  );
}
