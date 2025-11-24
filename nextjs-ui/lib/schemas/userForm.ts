/**
 * Zod validation schemas for user create/edit forms
 *
 * Following 2025 best practices from Context7 MCP:
 * - zodResolver integration with React Hook Form
 * - Custom refinement with path targeting for confirmPassword
 * - Email validation using z.email() with default Gmail-compatible regex
 * - Password complexity validation using regex patterns
 *
 * @see https://github.com/react-hook-form/documentation (Trust 89.9)
 * @see https://github.com/colinhacks/zod (Trust 90.4)
 */

import { z } from 'zod';

/**
 * Password complexity regex patterns
 * Backend validation (src/schemas/user.py) requires:
 * - Min 8 chars, uppercase, lowercase, number, special (!@#$%^&*), no whitespace
 */
const PASSWORD_MIN_LENGTH = 8;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_LOWERCASE = /[a-z]/;
const HAS_NUMBER = /[0-9]/;
const HAS_SPECIAL = /[!@#$%^&*]/;
const NO_WHITESPACE = /^\S*$/;

/**
 * Role enum matching backend RoleEnum
 * @see src/database/models.py UserRole
 */
export const RoleEnum = z.enum([
  'super_admin',
  'tenant_admin',
  'developer',
  'operator',
  'viewer',
]);

export type RoleType = z.infer<typeof RoleEnum>;

/**
 * Create User Form Schema
 *
 * Used for /dashboard/users/new page (AC-1)
 * Includes password fields and initial_role
 */
export const createUserSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),

    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
      .regex(HAS_UPPERCASE, 'Password must contain at least one uppercase letter')
      .regex(HAS_LOWERCASE, 'Password must contain at least one lowercase letter')
      .regex(HAS_NUMBER, 'Password must contain at least one number')
      .regex(HAS_SPECIAL, 'Password must contain at least one special character (!@#$%^&*)')
      .regex(NO_WHITESPACE, 'Password cannot contain whitespace'),

    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),

    full_name: z
      .string()
      .max(100, 'Full name cannot exceed 100 characters')
      .optional()
      .or(z.literal('')), // Allow empty string

    default_tenant_id: z
      .string()
      .uuid('Please select a valid tenant'),

    initial_role: RoleEnum,

    force_password_change: z.boolean(),

    is_active: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'], // Error displayed on confirmPassword field
  });

export type CreateUserFormData = z.infer<typeof createUserSchema>;

/**
 * Edit User Form Schema
 *
 * Used for /dashboard/users/{userId}/edit page (AC-2)
 * NO password fields (use Reset Password button from list instead)
 * NO initial_role (role management in separate Story 26)
 */
export const editUserSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),

  full_name: z
    .string()
    .max(100, 'Full name cannot exceed 100 characters')
    .optional()
    .or(z.literal('')), // Allow empty string

  default_tenant_id: z
    .string()
    .uuid('Please select a valid tenant'),

  force_password_change: z.boolean(),

  is_active: z.boolean(),
});

export type EditUserFormData = z.infer<typeof editUserSchema>;

/**
 * Helper to convert form data to API payload
 * Removes empty strings and undefined values
 */
export function sanitizeUserFormData<T extends CreateUserFormData | EditUserFormData>(
  data: T
): Partial<T> {
  const sanitized: Partial<T> = { ...data };

  // Remove empty full_name
  if ('full_name' in sanitized && sanitized.full_name === '') {
    delete sanitized.full_name;
  }

  return sanitized;
}
