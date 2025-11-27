"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { TenantFormData, tenantCreateSchema, tenantUpdateSchema, TenantUpdateData } from '@/lib/validations/tenants';
import { Form, FormField } from '@/components/forms';
import {
  Input,
  Textarea,
  Button,
  Select,
  Switch,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from '@/components/ui';
import { Tenant } from '@/lib/api/tenants';
import { AlertCircle, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';

/**
 * Tenant Form Component
 *
 * Complete tenant configuration form with BYOK, budget, tools, webhooks
 * Story 32: Added accordion layout, BYOK fields, budget configuration,
 * is_active toggle, webhook secret generator, enhancement prefs JSON editor
 */

interface TenantFormProps {
  onSubmit: (data: TenantFormData | TenantUpdateData) => void;
  defaultValues?: Partial<Tenant>;
  isLoading?: boolean;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
}

export function TenantForm({
  onSubmit,
  defaultValues,
  isLoading = false,
  onCancel,
  mode = 'create',
}: TenantFormProps) {
  // Use appropriate validation schema based on mode
  // Edit mode uses a relaxed schema that doesn't require API keys (they're masked)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validationSchema = mode === 'edit' ? tenantUpdateSchema : tenantCreateSchema;

  const form = useForm<TenantFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(validationSchema) as any,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      tenant_id: defaultValues?.tenant_id || '',
      name: defaultValues?.name || '',
      description: defaultValues?.description || '',
      logo: defaultValues?.logo || '',
      tool_type: (defaultValues?.tool_type || 'servicedesk_plus') as any,
      servicedesk_url: defaultValues?.servicedesk_url || '',
      servicedesk_api_key: defaultValues?.servicedesk_api_key || '',
      jira_url: defaultValues?.jira_url || '',
      jira_api_token: defaultValues?.jira_api_token || '',
      jira_project_key: defaultValues?.jira_project_key || '',
      webhook_signing_secret: defaultValues?.webhook_signing_secret || '',
      enhancement_preferences: defaultValues?.enhancement_preferences || {
        max_enhancement_length: 500,
        include_monitoring: true,
        kb_timeout_seconds: 10,
      },
      byok_enabled: defaultValues?.byok_enabled || false,
      byok_openai_key: defaultValues?.byok_openai_key || '',
      byok_anthropic_key: defaultValues?.byok_anthropic_key || '',
      max_budget: defaultValues?.max_budget || 500,
      alert_threshold: defaultValues?.alert_threshold || 80,
      grace_threshold: defaultValues?.grace_threshold || 110,
      budget_duration: (defaultValues?.budget_duration || '30d') as '30d' | '60d' | '90d',
      is_active: defaultValues?.is_active !== undefined ? defaultValues.is_active : true,
    },
  });

  // Watch form values for conditional rendering
  const toolType = form.watch('tool_type');
  const byokEnabled = form.watch('byok_enabled');
  const isActive = form.watch('is_active');
  const logoUrl = form.watch('logo');

  // Enhancement preferences JSON editor state
  const [useJsonEditor, setUseJsonEditor] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('tenant-form-json-mode') === 'true';
    }
    return false;
  });
  const [jsonEditorValue, setJsonEditorValue] = useState('');
  const [jsonError, setJsonError] = useState('');

  // Initialize JSON editor value
  useEffect(() => {
    if (useJsonEditor) {
      const prefs = form.getValues('enhancement_preferences');
      setJsonEditorValue(JSON.stringify(prefs, null, 2));
    }
  }, [useJsonEditor, form]);

  // Persist JSON mode preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('tenant-form-json-mode', String(useJsonEditor));
    }
  }, [useJsonEditor]);

  const isFormSubmitting = form.formState.isSubmitting || isLoading;

  // Logo URL validation
  const isValidLogoUrl = (url: string | undefined): boolean => {
    if (!url || url.trim().length === 0) return false;
    if (url.startsWith('data:image/')) return true;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
      const pathname = parsed.pathname.toLowerCase();
      const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'];
      return validExtensions.some(ext => pathname.endsWith(ext));
    } catch {
      return false;
    }
  };

  // Generate secure webhook secret (AC-4)
  const generateWebhookSecret = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const secret = btoa(String.fromCharCode(...array));
    form.setValue('webhook_signing_secret', secret);
    toast.success('Webhook secret generated. Copy it now!');
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // Toggle enhancement preferences mode (AC-5)
  const toggleEditorMode = () => {
    if (useJsonEditor) {
      // JSON → Simple Form
      try {
        const parsed = JSON.parse(jsonEditorValue);
        form.setValue('enhancement_preferences', parsed);
        setJsonError('');
        setUseJsonEditor(false);
      } catch (e) {
        setJsonError('Invalid JSON. Please fix errors before switching.');
      }
    } else {
      // Simple Form → JSON
      const prefs = form.getValues('enhancement_preferences');
      setJsonEditorValue(JSON.stringify(prefs, null, 2));
      setUseJsonEditor(true);
    }
  };

  // Format currency for display (AC-2)
  const formatCurrency = (value: number): string => {
    return `$${value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
  };

  // Handle form submission with error logging
  const handleFormSubmit = form.handleSubmit(
    (data) => {
      console.log('Form submitted successfully with data:', data);
      onSubmit(data);
    },
    (errors) => {
      console.error('Form validation errors:', errors);
      // Show toast with first error
      const firstError = Object.entries(errors)[0];
      if (firstError) {
        const [field, error] = firstError;
        toast.error(`Validation error: ${field}`, {
          description: (error as { message?: string })?.message || 'Invalid value',
        });
      }
    }
  );

  return (
    <Form onSubmit={handleFormSubmit} className="w-full max-w-[800px] mx-auto space-y-6">
      <Accordion defaultValue={["basic"]}>
        {/* AC-8: Basic Information Section (expanded by default) */}
        <AccordionItem value="basic">
          <AccordionTrigger>Basic Information</AccordionTrigger>
          <AccordionContent>
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
                    aria-required="true"
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
                  aria-required="true"
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
                  placeholder="https://example.com/logo.png"
                  error={fieldState.error?.message}
                  helpText="URL to tenant logo image (PNG, JPG, SVG)"
                />
              )}
            />

            {/* AC-7: Logo Preview with 500ms debounce */}
            {isValidLogoUrl(logoUrl) && (
              <div className="glass-card p-4">
                <p className="text-sm font-medium text-text-secondary mb-2">Logo Preview</p>
                <div className="relative w-[100px] h-[100px]">
                  <Image
                    src={logoUrl || ''}
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

            {/* AC-6: Is Active Toggle */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Active status toggle"
                    />
                    <label htmlFor="is_active" className="text-sm font-medium text-text-primary">
                      Active
                    </label>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Inactive tenants cannot create agents or execute workflows
                  </p>
                  {!isActive && (
                    <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <p className="text-sm text-yellow-500">
                        ⚠️ Deactivating this tenant will prevent all agent executions and API access.
                      </p>
                    </div>
                  )}
                </div>
              )}
            />
          </AccordionContent>
        </AccordionItem>

        {/* AC-3: Tool Configuration Section */}
        <AccordionItem value="tools">
          <AccordionTrigger>Tool Configuration</AccordionTrigger>
          <AccordionContent>
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
                    { value: 'none', label: 'None' },
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
                      helpText="Your ServiceDesk Plus instance URL (HTTPS required)"
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
                      helpText="Your Jira instance URL (HTTPS required)"
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
          </AccordionContent>
        </AccordionItem>

        {/* AC-4: Webhook Configuration Section */}
        <AccordionItem value="webhook">
          <AccordionTrigger>Webhook Configuration</AccordionTrigger>
          <AccordionContent>
            <FormField
              control={form.control}
              name="webhook_signing_secret"
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">
                    Webhook Signing Secret
                  </label>
                  <div className="flex gap-2">
                    <Input
                      {...field}
                      type="password"
                      placeholder="Enter webhook signing secret"
                      error={fieldState.error?.message}
                      helpText="Secret for validating incoming webhooks (leave empty to auto-generate)"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={generateWebhookSecret}
                      disabled={isFormSubmitting}
                      aria-label="Generate webhook secret"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    {field.value && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => copyToClipboard(field.value)}
                        disabled={isFormSubmitting}
                        aria-label="Copy webhook secret"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            />
          </AccordionContent>
        </AccordionItem>

        {/* AC-5: Enhancement Preferences Section (Dual-Mode) */}
        <AccordionItem value="enhancements">
          <AccordionTrigger>Enhancement Preferences</AccordionTrigger>
          <AccordionContent>
            <div className="flex justify-end mb-4">
              <Button
                type="button"
                variant="ghost"
                onClick={toggleEditorMode}
                disabled={isFormSubmitting}
              >
                {useJsonEditor ? 'Switch to Simple Form' : 'Switch to JSON Editor'}
              </Button>
            </div>

            {jsonError && (
              <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-500" role="alert" aria-live="polite">
                  {jsonError}
                </p>
              </div>
            )}

            {!useJsonEditor ? (
              /* Simple Form Mode */
              <>
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
                      helpText="Maximum characters for AI-generated enhancements (100-2000)"
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                      value={field.value || 500}
                    />
                  )}
                />

                <FormField
                  control={form.control}
                  name="enhancement_preferences.include_monitoring"
                  render={({ field }) => (
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label="Include monitoring data toggle"
                      />
                      <label className="text-sm text-text-primary">
                        Include monitoring data in context
                      </label>
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
                      helpText="Timeout for knowledge base searches (5-60 seconds)"
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                      value={field.value || 10}
                    />
                  )}
                />
              </>
            ) : (
              /* JSON Editor Mode */
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">
                  JSON Configuration
                </label>
                <CodeMirror
                  value={jsonEditorValue}
                  height="200px"
                  extensions={[json()]}
                  onChange={(value) => setJsonEditorValue(value)}
                  theme="dark"
                  className="border border-white/20 rounded-lg overflow-hidden"
                />
                <p className="text-xs text-text-secondary">
                  Edit JSON directly. Click "Switch to Simple Form" to apply changes.
                </p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* AC-1: BYOK Configuration Section */}
        <AccordionItem value="byok">
          <AccordionTrigger>BYOK Configuration</AccordionTrigger>
          <AccordionContent>
            <FormField
              control={form.control}
              name="byok_enabled"
              render={({ field }) => (
                <div className="flex items-center gap-3 mb-4">
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="BYOK enabled toggle"
                  />
                  <label className="text-sm font-medium text-text-primary">
                    BYOK Enabled
                  </label>
                </div>
              )}
            />

            {byokEnabled && (
              <>
                <FormField
                  control={form.control}
                  name="byok_openai_key"
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      type="password"
                      label="OpenAI API Key"
                      placeholder="sk-..."
                      error={fieldState.error?.message}
                      helpText="Your own OpenAI API key for this tenant"
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="byok_anthropic_key"
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      type="password"
                      label="Anthropic API Key"
                      placeholder="sk-ant-..."
                      error={fieldState.error?.message}
                      helpText="Your own Anthropic API key for this tenant"
                    />
                  )}
                />
                <p className="text-xs text-yellow-500">
                  At least one API key is required when BYOK is enabled
                </p>
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* AC-2: Budget Configuration Section */}
        <AccordionItem value="budget">
          <AccordionTrigger>Budget Configuration</AccordionTrigger>
          <AccordionContent>
            <FormField
              control={form.control}
              name="max_budget"
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Input
                    {...field}
                    type="number"
                    label="Max Budget (USD)"
                    placeholder="500.00"
                    error={fieldState.error?.message}
                    helpText="Maximum LLM spend per budget period ($0 - $10,000)"
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    value={field.value || 500}
                    step="0.01"
                  />
                  {field.value !== undefined && (
                    <p className="text-sm text-text-secondary">
                      Display: {formatCurrency(field.value)}
                    </p>
                  )}
                </div>
              )}
            />

            <FormField
              control={form.control}
              name="alert_threshold"
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  type="number"
                  label="Alert Threshold (%)"
                  placeholder="80"
                  error={fieldState.error?.message}
                  helpText="Warn when spend reaches this % of max budget (50-100%)"
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                  value={field.value || 80}
                />
              )}
            />

            <FormField
              control={form.control}
              name="grace_threshold"
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  type="number"
                  label="Grace Threshold (%)"
                  placeholder="110"
                  error={fieldState.error?.message}
                  helpText="Block requests when spend exceeds this % (100-150%, must be > alert threshold)"
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                  value={field.value || 110}
                />
              )}
            />

            <FormField
              control={form.control}
              name="budget_duration"
              render={({ field, fieldState }) => (
                <Select
                  {...field}
                  label="Budget Duration"
                  error={fieldState.error?.message}
                  helpText="Budget resets automatically after this period"
                  options={[
                    { value: '30d', label: '30 days' },
                    { value: '60d', label: '60 days' },
                    { value: '90d', label: '90 days' },
                  ]}
                />
              )}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Form Actions */}
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
