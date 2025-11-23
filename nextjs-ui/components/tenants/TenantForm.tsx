"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { TenantFormData, tenantCreateSchema } from '@/lib/validations/tenants';
import { Form, FormField } from '@/components/forms';
import { Input, Textarea, Button, Select } from '@/components/ui';
import { Tenant } from '@/lib/api/tenants';

/**
 * Tenant Form Component
 *
 * Reusable form for creating and editing tenants
 * Uses React Hook Form with Zod validation
 *
 * @example
 * ```tsx
 * <TenantForm
 *   onSubmit={handleSubmit}
 *   defaultValues={tenant}
 *   isLoading={isSubmitting}
 * />
 * ```
 */

interface TenantFormProps {
  /**
   * Form submission handler
   */
  onSubmit: (data: TenantFormData) => void;
  /**
   * Default values for editing existing tenant
   */
  defaultValues?: Partial<Tenant>;
  /**
   * Loading state for submit button
   */
  isLoading?: boolean;
  /**
   * Cancel button handler
   */
  onCancel?: () => void;
  /**
   * Form mode (create or edit)
   */
  mode?: 'create' | 'edit';
}

export function TenantForm({
  onSubmit,
  defaultValues,
  isLoading = false,
  onCancel,
  mode = 'create',
}: TenantFormProps) {
  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantCreateSchema),
    mode: 'onSubmit',  // Explicitly set validation mode
    reValidateMode: 'onChange',  // Re-validate on change after first submit
    defaultValues: {
      tenant_id: defaultValues?.tenant_id || '',
      name: defaultValues?.name || '',
      description: defaultValues?.description || '',
      logo: defaultValues?.logo || '',
      tool_type: (defaultValues?.tool_type || 'servicedesk_plus') as 'servicedesk_plus' | 'jira',
      servicedesk_url: defaultValues?.servicedesk_url || '',
      servicedesk_api_key: defaultValues?.servicedesk_api_key || '',
      jira_url: defaultValues?.jira_url || '',
      jira_api_token: defaultValues?.jira_api_token || '',
      jira_project_key: defaultValues?.jira_project_key || '',
      webhook_signing_secret: defaultValues?.webhook_signing_secret || '',
      enhancement_preferences: defaultValues?.enhancement_preferences ? {
        max_enhancement_length: defaultValues.enhancement_preferences.max_enhancement_length,
        include_monitoring: defaultValues.enhancement_preferences.include_monitoring,
        kb_timeout_seconds: defaultValues.enhancement_preferences.kb_timeout_seconds,
      } : {
        max_enhancement_length: 500,
        include_monitoring: true,
        kb_timeout_seconds: 10,
      },
    },
  });

  // Track selected tool type for conditional field rendering
  const toolType = form.watch('tool_type');

  // Use React Hook Form's isSubmitting for automatic double-submit prevention
  const isFormSubmitting = form.formState.isSubmitting || isLoading;

  // Helper to check if logo URL is valid and complete for preview
  // Updated to validate image file extensions
  const isValidLogoUrl = (url: string | undefined): boolean => {
    if (!url || url.trim().length === 0) return false;

    // Check for data URI (base64 images)
    if (url.startsWith('data:image/')) return true;

    // Check for complete HTTP(S) URL pointing to an image file
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }

      // Check if URL ends with a valid image extension
      const pathname = parsed.pathname.toLowerCase();
      const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'];
      return validExtensions.some(ext => pathname.endsWith(ext));
    } catch {
      return false;
    }
  };

  return (
    <Form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information Section */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Basic Information</h3>

        {mode === 'create' && (
          <FormField
            control={form.control}
            name="tenant_id"
            render={({ field, fieldState }) => (
              <Input
                {...field}
                label="Tenant ID"
                placeholder="my-tenant-id"
                error={fieldState.error?.message}
                helpText="Unique identifier (lowercase, numbers, hyphens only)"
              />
            )}
          />
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Input
              {...field}
              label="Tenant Name"
              placeholder="Enter tenant name"
              error={fieldState.error?.message}
              helpText="A unique name for this tenant"
              required
            />
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field, fieldState }) => (
            <Textarea
              {...field}
              label="Description"
              placeholder="Enter tenant description (optional)"
              error={fieldState.error?.message}
              helpText="Brief description of this tenant's purpose"
              rows={3}
            />
          )}
        />

        <FormField
          control={form.control}
          name="logo"
          render={({ field, fieldState }) => (
            <Input
              {...field}
              label="Logo URL"
              placeholder="https://example.com/logo.png or data:image/png;base64,..."
              error={fieldState.error?.message}
              helpText="Direct URL to image file (must end in .png, .jpg, .gif, .webp, etc.) or base64-encoded image"
            />
          )}
        />

        {/* Logo Preview */}
        {isValidLogoUrl(form.watch('logo')) && (
          <div className="glass-card p-4">
            <p className="text-sm font-medium text-text-secondary mb-2">
              Logo Preview
            </p>
            <div className="relative w-64 h-32">
              <Image
                src={form.watch('logo') || ''}
                alt="Tenant logo preview"
                fill
                className="object-contain rounded-lg"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkludmFsaWQ8L3RleHQ+PC9zdmc+';
                }}
                unoptimized
              />
            </div>
          </div>
        )}
      </div>

      {/* Tool Configuration Section */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Tool Configuration</h3>

        <FormField
          control={form.control}
          name="tool_type"
          render={({ field, fieldState }) => (
            <Select
              {...field}
              label="Tool Type"
              error={fieldState.error?.message}
              helpText="Select the ticketing system to integrate with"
              options={[
                { value: 'servicedesk_plus', label: 'ServiceDesk Plus' },
                { value: 'jira', label: 'Jira Service Management' },
              ]}
              required
            />
          )}
        />

        {/* ServiceDesk Plus Fields */}
        {toolType === 'servicedesk_plus' && (
          <>
            <FormField
              control={form.control}
              name="servicedesk_url"
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  label="ServiceDesk Plus URL"
                  placeholder="https://servicedesk.example.com"
                  error={fieldState.error?.message}
                  helpText="Your ServiceDesk Plus instance URL"
                  required
                />
              )}
            />
            <FormField
              control={form.control}
              name="servicedesk_api_key"
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  type="password"
                  label="ServiceDesk Plus API Key"
                  placeholder="Enter API key"
                  error={fieldState.error?.message}
                  helpText="API key for ServiceDesk Plus authentication"
                  required
                />
              )}
            />
          </>
        )}

        {/* Jira Fields */}
        {toolType === 'jira' && (
          <>
            <FormField
              control={form.control}
              name="jira_url"
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  label="Jira URL"
                  placeholder="https://your-domain.atlassian.net"
                  error={fieldState.error?.message}
                  helpText="Your Jira instance URL"
                  required
                />
              )}
            />
            <FormField
              control={form.control}
              name="jira_api_token"
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  type="password"
                  label="Jira API Token"
                  placeholder="Enter API token"
                  error={fieldState.error?.message}
                  helpText="API token for Jira authentication"
                  required
                />
              )}
            />
            <FormField
              control={form.control}
              name="jira_project_key"
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  label="Jira Project Key"
                  placeholder="PROJ"
                  error={fieldState.error?.message}
                  helpText="Project key for the Jira project"
                  required
                />
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name="webhook_signing_secret"
          render={({ field, fieldState }) => (
            <Input
              {...field}
              type="password"
              label="Webhook Signing Secret"
              placeholder="Enter webhook signing secret"
              error={fieldState.error?.message}
              helpText="Secret key for validating incoming webhooks"
              required
            />
          )}
        />
      </div>

      {/* Enhancement Preferences Section */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Enhancement Preferences</h3>

        <FormField
          control={form.control}
          name="enhancement_preferences.max_enhancement_length"
          render={({ field, fieldState }) => (
            <Input
              {...field}
              type="number"
              label="Max Enhancement Length"
              placeholder="500"
              error={fieldState.error?.message}
              helpText="Maximum length of generated enhancements (100-2000 characters)"
              onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
              value={field.value || 500}
            />
          )}
        />

        <FormField
          control={form.control}
          name="enhancement_preferences.include_monitoring"
          render={({ field, fieldState }) => (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="include_monitoring"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black/20 text-accent-primary focus:ring-2 focus:ring-accent-primary/50"
              />
              <label htmlFor="include_monitoring" className="text-sm text-text-primary">
                Include monitoring data in context gathering
              </label>
              {fieldState.error && (
                <span className="text-sm text-error">{fieldState.error.message}</span>
              )}
            </div>
          )}
        />

        <FormField
          control={form.control}
          name="enhancement_preferences.kb_timeout_seconds"
          render={({ field, fieldState }) => (
            <Input
              {...field}
              type="number"
              label="Knowledge Base Timeout (seconds)"
              placeholder="10"
              error={fieldState.error?.message}
              helpText="Timeout for knowledge base searches (1-60 seconds)"
              onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
              value={field.value || 10}
            />
          )}
        />
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t border-white/20">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isFormSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          isLoading={isFormSubmitting}
          disabled={isFormSubmitting}
        >
          {mode === 'create' ? 'Create Tenant' : 'Update Tenant'}
        </Button>
      </div>
    </Form>
  );
}
