"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AgentFormData, agentCreateSchema, agentTypeEnum, cognitiveArchitectureEnum } from '@/lib/validations/agents';
import { Form, FormField } from '@/components/forms';
import { Input, Textarea, Button, Select } from '@/components/ui';
import { Agent } from '@/lib/api/agents';
import { useAvailableModels } from '@/lib/hooks/useAvailableModels';
import { RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import MCPToolDiscovery from '@/components/tools/MCPToolDiscovery';
import { SystemPromptEditor } from '@/components/prompts/SystemPromptEditor';
import { useSession } from 'next-auth/react';
import { useTenantStore } from '@/lib/stores/useTenantStore';
import { UnifiedTool, MCPToolAssignment } from '@/types/tools';

/**
 * Agent Form Component
 *
 * Reusable form for creating and editing agents
 * with LLM configuration
 */

interface AgentFormProps {
  onSubmit: (data: AgentFormData) => void;
  defaultValues?: Partial<Agent>;
  isLoading?: boolean;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
}

export function AgentForm({
  onSubmit,
  defaultValues,
  isLoading = false,
  onCancel,
  mode = 'create',
}: AgentFormProps) {
  const { data: session } = useSession();
  const { selectedTenant } = useTenantStore();
  const [forceRefresh, setForceRefresh] = useState(false);
  const { data: availableModels = [], isLoading: modelsLoading, refetch: refetchModels } = useAvailableModels(forceRefresh);

  // Tool selection state - track both IDs and full tool objects
  // Includes both OpenAPI tools (tool_ids) and MCP tools (mcp_tool_assignments)
  // Initialize with both OpenAPI and MCP tool IDs
  const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(() => {
    const toolIds = new Set(defaultValues?.tool_ids || []);
    // Also add MCP tool IDs
    (defaultValues?.mcp_tool_assignments || []).forEach(mcp => {
      toolIds.add(mcp.id);
    });
    return toolIds;
  });
  const [selectedTools, setSelectedTools] = useState<UnifiedTool[]>([]);
  const [selectedMCPAssignments, setSelectedMCPAssignments] = useState<MCPToolAssignment[]>(
    defaultValues?.mcp_tool_assignments || []
  );

  // Get tenant ID from Zustand store (global tenant selection)
  // Falls back to session defaultTenantId, then 'default' (matches backend's AI_AGENTS_DEFAULT_TENANT_ID)
  const tenantId = selectedTenant?.id || session?.user?.defaultTenantId || 'default';

  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentCreateSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      type: defaultValues?.type || 'conversational',
      description: defaultValues?.description || '',
      system_prompt: defaultValues?.system_prompt || '',
      llm_config: defaultValues?.llm_config || {
        provider: 'litellm',  // Story 9.2: Direct LiteLLM integration
        model: '',
        temperature: 0.7,
        max_tokens: undefined,
        top_p: undefined,
      },
      tool_ids: defaultValues?.tool_ids || [],
      is_active: defaultValues?.is_active ?? true,
      cognitive_architecture: (defaultValues?.cognitive_architecture || 'react') as 'react' | 'single_step' | 'plan_and_solve',
    },
  });

  // Reason: Reset form only when defaultValues change AND form is not dirty
  // This prevents clearing user input while still syncing server data
  useEffect(() => {
    if (defaultValues && !form.formState.isDirty) {
      const newValues = {
        name: defaultValues.name || '',
        type: defaultValues.type || 'conversational',
        description: defaultValues.description || '',
        system_prompt: defaultValues.system_prompt || '',
        llm_config: defaultValues.llm_config || {
          provider: 'litellm',
          model: '',
          temperature: 0.7,
          max_tokens: undefined,
          top_p: undefined,
        },
        tool_ids: defaultValues.tool_ids || [],
        is_active: defaultValues.is_active ?? true,
        cognitive_architecture: (defaultValues.cognitive_architecture || 'react') as 'react' | 'single_step' | 'plan_and_solve',
      };
      form.reset(newValues);

      // Also update tool selection state when agent data changes
      const newToolIds = new Set(defaultValues.tool_ids || []);
      // Include MCP tool IDs as well
      (defaultValues.mcp_tool_assignments || []).forEach(mcp => {
        newToolIds.add(mcp.id);
      });
      setSelectedToolIds(newToolIds);
      setSelectedMCPAssignments(defaultValues.mcp_tool_assignments || []);
    }
  }, [defaultValues?.id, defaultValues?.name, defaultValues?.type, defaultValues?.description, form]);

  const handleRefreshModels = async () => {
    setForceRefresh(true);
    await refetchModels();
    setForceRefresh(false);
  };

  return (
    <Form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Basic Information</h3>

        <FormField
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Input
              {...field}
              label="Agent Name"
              placeholder="Customer Support Agent"
              error={fieldState.error?.message}
              required
            />
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field, fieldState }) => (
            <Select
              {...field}
              label="Agent Type"
              error={fieldState.error?.message}
              options={agentTypeEnum.options.map((type) => ({
                value: type,
                label: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
              }))}
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
              placeholder="Brief description of the agent's purpose"
              error={fieldState.error?.message}
              rows={2}
            />
          )}
        />
      </div>

      {/* Cognitive Architecture */}
      <div className="space-y-4 pt-4 border-t border-white/20">
        <h3 className="text-lg font-semibold text-text-primary">Cognitive Architecture</h3>

        <FormField
          control={form.control}
          name="cognitive_architecture"
          render={({ field, fieldState }) => (
            <Select
              {...field}
              label="Execution Strategy"
              error={fieldState.error?.message}
              options={cognitiveArchitectureEnum.options.map((arch) => ({
                value: arch,
                label: arch === 'react' ? 'ReAct (Reasoning + Acting)' :
                  arch === 'single_step' ? 'Single Step (Zero-shot)' :
                    'Plan and Solve',
              }))}
              helpText="How the agent processes and executes tasks"
              required
            />
          )}
        />
      </div>

      {/* LLM Configuration */}
      <div className="space-y-4 pt-4 border-white/20">
        <h3 className="text-lg font-semibold text-text-primary">LLM Configuration</h3>

        {/* LiteLLM Provider (Story 9.2: Direct LiteLLM integration) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">
            LLM Provider
          </label>
          <div className="px-3 py-2 bg-surface/50 border border-white/10 rounded-lg text-sm text-text-secondary">
            🚀 LiteLLM (All models managed through LiteLLM proxy)
          </div>
          <p className="text-xs text-text-tertiary">
            Models are configured and managed through the LiteLLM proxy. Select your model below.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-primary">
              Model <span className="text-destructive">*</span>
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRefreshModels}
              disabled={modelsLoading}
              className="h-7 px-2 text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${modelsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <FormField
            control={form.control}
            name="llm_config.model"
            render={({ field, fieldState }) => (
              availableModels.length > 0 ? (
                <Select
                  {...field}
                  error={fieldState.error?.message}
                  options={availableModels.map((model) => ({
                    value: model.id,
                    label: `${model.name} (${model.provider})`,
                  }))}
                  placeholder={modelsLoading ? "Loading models..." : "Select a model"}
                  required
                  disabled={modelsLoading}
                />
              ) : modelsLoading ? (
                <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading available models from LiteLLM...
                </div>
              ) : (
                <Input
                  {...field}
                  placeholder="gpt-4, claude-3-opus-20240229, etc."
                  error={fieldState.error?.message}
                  helpText="No models available from LiteLLM. Enter model name manually or click Refresh."
                  required
                />
              )
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="llm_config.temperature"
            render={({ field, fieldState }) => (
              <Input
                {...field}
                type="number"
                label="Temperature"
                placeholder="0.7"
                error={fieldState.error?.message}
                min={0}
                max={2}
                step={0.1}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  field.onChange(value);
                }}
                value={field.value ?? ''}
              />
            )}
          />

          <FormField
            control={form.control}
            name="llm_config.max_tokens"
            render={({ field, fieldState }) => (
              <Input
                {...field}
                type="number"
                label="Max Tokens"
                placeholder="4096"
                error={fieldState.error?.message}
                min={1}
                max={128000}
                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                value={field.value || ''}
              />
            )}
          />

          <FormField
            control={form.control}
            name="llm_config.top_p"
            render={({ field, fieldState }) => (
              <Input
                {...field}
                type="number"
                label="Top P"
                placeholder="1.0"
                error={fieldState.error?.message}
                min={0}
                max={1}
                step={0.1}
                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                value={field.value || ''}
              />
            )}
          />
        </div>
      </div>

      {/* System Prompt */}
      <div className="space-y-4 pt-4 border-t border-white/20">
        <h3 className="text-lg font-semibold text-text-primary">System Prompt</h3>

        <FormField
          control={form.control}
          name="system_prompt"
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">
                System Prompt <span className="text-destructive">*</span>
              </label>
              <SystemPromptEditor
                value={field.value}
                onChange={field.onChange}
                placeholder="You are a helpful assistant..."
                error={fieldState.error?.message}
                model={form.watch('llm_config.model') || 'gpt-4'}
                maxTokens={form.watch('llm_config.max_tokens') || 4000}
                disabled={false}
                minHeight={200}
              />
              <p className="text-xs text-text-tertiary">
                Instructions that define the agent&apos;s behavior and personality
              </p>
            </div>
          )}
        />
      </div>

      {/* Tool Assignment & Discovery */}
      <div className="space-y-4 pt-4 border-t border-white/20">
        <h3 className="text-lg font-semibold text-text-primary">
          🛠️ Tool Assignment & Discovery
        </h3>

        <MCPToolDiscovery
          tenantId={tenantId}
          selectedToolIds={selectedToolIds}
          onSelectionChange={(newSelection, tools) => {
            setSelectedToolIds(newSelection);
            setSelectedTools(tools);
            // Separate OpenAPI tools (tool_ids) from MCP tools (mcp_tool_assignments)
            const openapiToolIds = tools
              .filter(t => t.source_type === 'openapi')
              .map(t => t.id);
            const mcpToolAssignments: MCPToolAssignment[] = tools
              .filter(t => t.source_type === 'mcp')
              .map(t => ({
                id: t.id,
                name: t.name,
                source_type: 'mcp' as const,
                mcp_server_id: t.mcp_server_id || '',
                mcp_server_name: t.mcp_server_name || t.mcp_server || '',
                mcp_primitive_type: t.mcp_primitive_type || 'tool',
              }));
            form.setValue('tool_ids', openapiToolIds);
            form.setValue('mcp_tool_assignments', mcpToolAssignments);
          }}
        />
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t border-white/20">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
        >
          {mode === 'create' ? 'Create Agent' : 'Update Agent'}
        </Button>
      </div>
    </Form>
  );
}
