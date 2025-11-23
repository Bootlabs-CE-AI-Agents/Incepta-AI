"use client";

import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AgentForm } from '@/components/agents/AgentForm';
import { ToolAssignment } from '@/components/agents/ToolAssignment';
import { TestSandbox } from '@/components/agents/TestSandbox';
import { Button, Loading, Badge, ConfirmDialog, Tabs } from '@/components/ui';
import { useAgent, useUpdateAgent, useDeleteAgent, useAssignTools, useActivateAgent } from '@/lib/hooks/useAgents';
import { AgentUpdateData } from '@/lib/validations/agents';
import { ArrowLeft, Trash2, Settings, Wrench, TestTube, Copy, Check, Power } from 'lucide-react';

/**
 * Agent Detail Page
 *
 * View and edit agent with 3 tabs:
 * 1. Overview - Basic info and LLM config
 * 2. Tools - Tool assignment (drag-and-drop)
 * 3. Test - Agent sandbox testing
 *
 * Reference: tech-spec Epic 3, Story 5
 */

export default function AgentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const agentId = params.id as string;
  const defaultTab = searchParams.get('tab') || 'overview';

  const { data: agent, isLoading } = useAgent(agentId);
  const updateAgentMutation = useUpdateAgent();
  const deleteAgentMutation = useDeleteAgent();
  const assignToolsMutation = useAssignTools();
  const activateAgentMutation = useActivateAgent();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Mock tools data - in real app, fetch from API
  const mockTools = [
    { id: '1', name: 'Web Search', description: 'Search the web for information', category: 'Search' },
    { id: '2', name: 'Calculator', description: 'Perform mathematical calculations', category: 'Math' },
    { id: '3', name: 'File Reader', description: 'Read and parse files', category: 'Files' },
    { id: '4', name: 'Database Query', description: 'Query databases', category: 'Data' },
    { id: '5', name: 'Email Sender', description: 'Send emails', category: 'Communication' },
    { id: '6', name: 'Code Executor', description: 'Execute code snippets', category: 'Development' },
    { id: '7', name: 'Image Generator', description: 'Generate images from text', category: 'Media' },
    { id: '8', name: 'Translation', description: 'Translate between languages', category: 'Language' },
  ];

  const handleSubmit = (data: AgentUpdateData) => {
    updateAgentMutation.mutate(
      { id: agentId, data },
      {
        onSuccess: () => {
          // Stay on page after successful update
        },
      }
    );
  };

  const handleDelete = () => {
    deleteAgentMutation.mutate(agentId, {
      onSuccess: () => {
        router.push('/dashboard/agents-config');
      },
    });
  };

  const handleCancel = () => {
    router.push('/dashboard/agents-config');
  };

  const handleAssignTools = (toolIds: string[]) => {
    assignToolsMutation.mutate({ id: agentId, toolIds });
  };

  const handleActivate = () => {
    activateAgentMutation.mutate(agentId);
  };

  const copyToClipboard = async (text: string, type: 'webhook' | 'secret') => {
    await navigator.clipboard.writeText(text);
    if (type === 'webhook') {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </DashboardLayout>
    );
  }

  if (!agent) {
    return (
      <DashboardLayout>
        <div className="glass-card p-12 text-center">
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            Agent not found
          </h3>
          <p className="text-text-secondary mb-6">
            The agent you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <Button onClick={() => router.push('/dashboard/agents-config')}>
            Back to Agents
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleCancel} size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Agent
          </Button>
        </div>

        {/* Agent Info */}
        <div className="glass-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-h2 font-bold text-text-primary">
                {agent.name}
              </h2>
              {agent.description && (
                <p className="text-sm text-text-secondary mt-1">
                  {agent.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {agent.status === 'draft' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleActivate}
                  disabled={activateAgentMutation.isPending}
                >
                  <Power className="w-4 h-4 mr-2" />
                  {activateAgentMutation.isPending ? 'Activating...' : 'Activate Agent'}
                </Button>
              )}
              <Badge variant={
                agent.status === 'active' ? 'success' :
                agent.status === 'draft' ? 'warning' :
                agent.status === 'suspended' ? 'warning' :
                'default'
              }>
                {agent.status === 'active' ? 'Active' :
                 agent.status === 'draft' ? 'Draft' :
                 agent.status === 'suspended' ? 'Suspended' :
                 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Webhook Information */}
        {agent.webhook_url && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Webhook Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Webhook URL
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-background-secondary rounded-lg text-sm font-mono text-text-primary">
                    {agent.webhook_url}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(agent.webhook_url!, 'webhook')}
                  >
                    {copiedWebhook ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              {agent.hmac_secret_masked && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    HMAC Secret (Masked)
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-background-secondary rounded-lg text-sm font-mono text-text-primary">
                      {agent.hmac_secret_masked}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(agent.hmac_secret_masked!, 'secret')}
                    >
                      {copiedSecret ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-text-secondary mt-2">
                    Use the &quot;Show Secret&quot; endpoint to retrieve the full HMAC secret for webhook signature validation.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabbed Content */}
        <Tabs
          defaultIndex={defaultTab === 'tools' ? 1 : defaultTab === 'test' ? 2 : 0}
          variant="underline"
          className="w-full"
          tabs={[
            {
              key: 'overview',
              label: 'Overview',
              icon: <Settings className="w-4 h-4" />,
              content: (
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">
                    Edit Agent
                  </h3>
                  <AgentForm
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                    defaultValues={agent}
                    isLoading={updateAgentMutation.isPending}
                    mode="edit"
                  />
                </div>
              ),
            },
            {
              key: 'tools',
              label: 'Tools',
              icon: <Wrench className="w-4 h-4" />,
              content: (
                <div className="glass-card p-6">
                  <ToolAssignment
                    availableTools={mockTools}
                    assignedToolIds={agent.tool_ids || []}
                    onAssign={handleAssignTools}
                    isLoading={assignToolsMutation.isPending}
                  />
                </div>
              ),
            },
            {
              key: 'test',
              label: 'Test',
              icon: <TestTube className="w-4 h-4" />,
              content: (
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold text-text-primary mb-6">
                    Test Sandbox
                  </h3>
                  <TestSandbox agentId={agentId} />
                </div>
              ),
            },
          ]}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDelete}
          title="Delete Agent"
          description={`Are you sure you want to delete "${agent.name}"? This action cannot be undone and will affect any workflows using this agent.`}
          confirmLabel="Delete"
          confirmVariant="danger"
          isLoading={deleteAgentMutation.isPending}
        />
      </div>
    </DashboardLayout>
  );
}
