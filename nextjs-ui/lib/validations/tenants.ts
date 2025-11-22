/**
 * Tenant Form Validation Schemas
 *
 * Zod schemas for tenant CRUD operations following 2025 best practices:
 * - Type-safe validation with z.infer
 * - Email validation with custom patterns
 * - Required field constraints
 * - Cross-field validation with refine
 *
 * @see https://zod.dev (Zod v3 documentation)
 */

import { z } from 'zod';

/**
 * Enhancement Preferences Schema
 * Tenant-specific enhancement processing preferences
 */
export const enhancementPreferencesSchema = z.object({
  max_enhancement_length: z
    .number()
    .int()
    .min(100, { message: "Must be at least 100 characters" })
    .max(2000, { message: "Must be at most 2000 characters" }),
  include_monitoring: z.boolean(),
  kb_timeout_seconds: z
    .number()
    .int()
    .min(1, { message: "Must be at least 1 second" })
    .max(60, { message: "Must be at most 60 seconds" }),
});

/**
 * Base Tenant Schema
 * Used for creating and updating tenants
 */
export const tenantSchema = z.object({
  tenant_id: z
    .string()
    .max(100, { message: "Tenant ID must be at most 100 characters" })
    .refine(
      (val) => val === '' || /^[a-z0-9\-]+$/.test(val),
      { message: "Only lowercase letters, numbers, and hyphens allowed" }
    )
    .optional(),

  name: z
    .string()
    .min(1, { message: "Name is required" })
    .refine((val) => val.trim().length >= 3, {
      message: "Name must be at least 3 characters",
    })
    .refine((val) => val.trim().length <= 255, {
      message: "Name must be at most 255 characters",
    }),

  description: z
    .string()
    .refine((val) => !val || val.trim().length <= 500, {
      message: "Description must be at most 500 characters",
    })
    .optional(),

  // Logo upload - optional base64 string or URL
  logo: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === '') return true;
        // Check for valid URL
        try {
          const url = new URL(val);
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
          // Check for valid base64 image
          return /^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(val);
        }
      },
      { message: "Logo must be a valid URL or base64 image" }
    ),

  tool_type: z
    .enum(['servicedesk_plus', 'jira'])
    .optional(),

  // ServiceDesk Plus fields (required if tool_type='servicedesk_plus')
  servicedesk_url: z.union([z.string().length(0), z.string().url({ message: "Must be a valid URL" })]).optional(),
  servicedesk_api_key: z.union([z.string().length(0), z.string().min(1)]).optional(),

  // Jira fields (required if tool_type='jira')
  jira_url: z.union([z.string().length(0), z.string().url({ message: "Must be a valid URL" })]).optional(),
  jira_api_token: z.union([z.string().length(0), z.string().min(1)]).optional(),
  jira_project_key: z.union([z.string().length(0), z.string().min(1)]).optional(),

  webhook_signing_secret: z.string().min(1, { message: "Webhook signing secret is required" }),

  enhancement_preferences: enhancementPreferencesSchema.optional(),
}).superRefine((data, ctx) => {
  // Validate tool-specific fields based on tool_type
  const toolType = data.tool_type || 'servicedesk_plus'; // Default to servicedesk_plus

  if (toolType === 'servicedesk_plus') {
    if (!data.servicedesk_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ServiceDesk Plus URL is required",
        path: ['servicedesk_url'],
      });
    }
    if (!data.servicedesk_api_key) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ServiceDesk Plus API Key is required",
        path: ['servicedesk_api_key'],
      });
    }
  } else if (toolType === 'jira') {
    if (!data.jira_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Jira URL is required",
        path: ['jira_url'],
      });
    }
    if (!data.jira_api_token) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Jira API Token is required",
        path: ['jira_api_token'],
      });
    }
    if (!data.jira_project_key) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Jira Project Key is required",
        path: ['jira_project_key'],
      });
    }
  }
});

/**
 * Tenant Create Schema
 * Same as base schema (refinements prevent .extend())
 */
export const tenantCreateSchema = tenantSchema;

/**
 * Tenant Update Schema
 * All fields optional for partial updates
 * Note: Cannot use .partial() on schemas with refinements,
 * so we create a new schema from the base object schema before refinement
 */
export const tenantUpdateSchema = z.object({
  tenant_id: z
    .string()
    .min(1, { message: "Tenant ID is required" })
    .regex(/^[a-z0-9\-]+$/, { message: "Only lowercase letters, numbers, and hyphens allowed" })
    .max(100, { message: "Tenant ID must be at most 100 characters" })
    .optional(),
  name: z.string().min(1, { message: "Name is required" }).optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
  tool_type: z.enum(['servicedesk_plus', 'jira']).optional(),
  servicedesk_url: z.string().url({ message: "Must be a valid URL" }).optional(),
  servicedesk_api_key: z.string().min(1).optional(),
  jira_url: z.string().url({ message: "Must be a valid URL" }).optional(),
  jira_api_token: z.string().min(1).optional(),
  jira_project_key: z.string().min(1).optional(),
  webhook_signing_secret: z.string().min(1).optional(),
  enhancement_preferences: enhancementPreferencesSchema.partial().optional(),
});

/**
 * Type exports for TypeScript integration
 */
export type EnhancementPreferencesData = z.infer<typeof enhancementPreferencesSchema>;
export type TenantFormData = z.infer<typeof tenantSchema>;
export type TenantCreateData = z.infer<typeof tenantCreateSchema>;
export type TenantUpdateData = z.infer<typeof tenantUpdateSchema>;
