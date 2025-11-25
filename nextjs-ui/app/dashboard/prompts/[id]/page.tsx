'use client';

/**
 * Prompt Editor Page (/prompts/[id])
 * Tab-based interface: Editor | Preview | Version History | Test
 * Features: CodeMirror editor, variable extraction, preview rendering, version history
 *
 * Story: nextjs-story-28-prompts-version-history
 * AC: AC-9 (Integration with Existing Prompts Page)
 */

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { ArrowLeft, Trash2, X } from 'lucide-react';
import { usePrompt, useUpdatePrompt, useDeletePrompt } from '@/lib/hooks/usePrompts';
import { useAutoSaveDraft } from '@/lib/hooks/useAutoSaveDraft';
import { PromptEditor } from '@/components/prompts/PromptEditor';
import { PromptPreview } from '@/components/prompts/PromptPreview';
import { VersionHistoryTab } from '@/components/prompts/VersionHistoryTab';
import { PromptTestTab } from '@/components/prompts/PromptTestTab';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Loading } from '@/components/ui/Loading';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export default function PromptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const id = params.id as string;

  // Tab state with URL sync (AC-9)
  const tabParam = searchParams.get('tab');
  const tabIndex = tabParam === 'preview' ? 1 : tabParam === 'versions' ? 2 : tabParam === 'test' ? 3 : 0;
  const [selectedTab, setSelectedTab] = useState(tabIndex);

  const { data: prompt, isLoading, error } = usePrompt(id);
  const updateMutation = useUpdatePrompt();
  const deleteMutation = useDeletePrompt();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateText, setTemplateText] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const userRole = session?.user?.role || 'viewer';
  const canEdit = ['super_admin', 'tenant_admin', 'developer'].includes(userRole);

  // RBAC check for Version History (AC-9: developer/admin only)
  const canViewVersionHistory = ['tenant_admin', 'developer', 'super_admin'].includes(userRole);

  // RBAC check for Test tab (AC-8: developer/admin only)
  const canViewTestTab = ['tenant_admin', 'developer', 'super_admin'].includes(userRole);

  // Update URL when tab changes (AC-9)
  const handleTabChange = (index: number) => {
    setSelectedTab(index);
    const tabs = ['editor', 'preview', 'versions', 'test'];
    const newTab = tabs[index];
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newTab);
    window.history.pushState({}, '', url.toString());
  };

  // Auto-save draft every 30 seconds (AC-6)
  const { isSaving, lastSaved, clearDraft, loadDraft } = useAutoSaveDraft({
    promptId: id,
    content: templateText,
    enabled: canEdit && !!prompt, // Only auto-save if user can edit and prompt is loaded
  });

  // Initialize form when prompt loads
  useEffect(() => {
    if (prompt) {
      setName(prompt.name);
      setDescription(prompt.description || '');
      setTemplateText(prompt.template_text);
    }
  }, [prompt]);

  // Check for existing draft on mount (AC-6)
  useEffect(() => {
    if (prompt) {
      const draft = loadDraft();
      if (draft && draft.content && draft.content !== prompt.template_text) {
        setShowDraftBanner(true);
      }
    }
  }, [prompt, loadDraft]);

  // Track changes
  useEffect(() => {
    if (prompt) {
      const changed =
        name !== prompt.name ||
        description !== (prompt.description || '') ||
        templateText !== prompt.template_text;
      setHasChanges(changed);
    }
  }, [name, description, templateText, prompt]);

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      id,
      data: {
        name,
        description: description || undefined,
        template_text: templateText,
      },
    });
    clearDraft(); // Clear draft after successful save (AC-6)
    setHasChanges(false);
  };

  const handleRevert = () => {
    if (prompt) {
      setName(prompt.name);
      setDescription(prompt.description || '');
      setTemplateText(prompt.template_text);
      setHasChanges(false);
    }
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id);
    router.push('/dashboard/prompts');
  };

  const handleRestoreDraft = () => {
    const draft = loadDraft();
    if (draft && draft.content) {
      setTemplateText(draft.content);
      setShowDraftBanner(false);
    }
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftBanner(false);
  };

  const formatLastSaved = (date: Date): string => {
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 10) return 'just now';
    if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
    if (diffSeconds < 3600) {
      const minutes = Math.floor(diffSeconds / 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    return date.toLocaleTimeString();
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <Loading size="lg" text="Loading prompt..." />
      </DashboardLayout>
    );
  }

  if (error || !prompt) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">
            Failed to load prompt: {error ? (error as Error).message : 'Not found'}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-screen flex flex-col">
        {/* Draft Restoration Banner (AC-6) */}
        {showDraftBanner && canEdit && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-blue-800 text-sm">
                📝 A saved draft was found for this prompt.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleRestoreDraft}
              >
                Restore Draft
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDiscardDraft}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/prompts')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Prompt</h1>
          {/* Auto-save indicator (AC-6) */}
          {canEdit && lastSaved && (
            <span className="text-xs text-gray-500">
              {isSaving ? (
                '💾 Saving draft...'
              ) : (
                `✓ Draft saved ${formatLastSaved(lastSaved)}`
              )}
            </span>
          )}
        </div>
        {canEdit && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        )}
      </div>

      {/* Metadata Fields */}
      {canEdit ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="name">Prompt Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Ticket Enhancer Prompt"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={1}
            />
          </div>
        </div>
      ) : (
        <div className="mb-4 p-4 bg-gray-50 rounded-md">
          <h2 className="text-lg font-semibold">{prompt.name}</h2>
          {prompt.description && (
            <p className="text-sm text-gray-600 mt-1">{prompt.description}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Read-only view (no edit permission)
          </p>
        </div>
      )}

      {/* Tab Navigation (AC-9) */}
      <Tab.Group selectedIndex={selectedTab} onChange={handleTabChange}>
        <Tab.List className="flex space-x-1 border-b border-gray-200 mb-4">
          <Tab
            className={({ selected }) =>
              `px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                selected
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`
            }
          >
            Editor
          </Tab>
          <Tab
            className={({ selected }) =>
              `px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                selected
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`
            }
          >
            Preview
          </Tab>
          {canViewVersionHistory && (
            <Tab
              className={({ selected }) =>
                `px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  selected
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`
              }
            >
              Version History
            </Tab>
          )}
          {canViewTestTab && (
            <Tab
              className={({ selected }) =>
                `px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  selected
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`
              }
            >
              Test
            </Tab>
          )}
        </Tab.List>

        <Tab.Panels className="flex-1 overflow-hidden">
          {/* Editor Tab (AC-9: Preserve editor state) */}
          <Tab.Panel className="h-full">
            {canEdit ? (
              <PromptEditor
                value={templateText}
                onChange={setTemplateText}
                onSave={handleSave}
                onRevert={hasChanges ? handleRevert : undefined}
                isSubmitting={updateMutation.isPending}
              />
            ) : (
              <div className="border border-gray-200 rounded-md p-4 bg-gray-50 h-full overflow-auto">
                <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono">
                  {prompt.template_text}
                </pre>
              </div>
            )}
          </Tab.Panel>

          {/* Preview Tab */}
          <Tab.Panel className="h-full overflow-auto">
            <PromptPreview
              promptText={templateText}
              variables={[]}
            />
          </Tab.Panel>

          {/* Version History Tab (AC-9: RBAC) */}
          {canViewVersionHistory && (
            <Tab.Panel className="h-full overflow-auto">
              <VersionHistoryTab
                promptId={id}
                currentTemplateText={templateText}
              />
            </Tab.Panel>
          )}

          {/* Test Tab (AC-8) */}
          {canViewTestTab && (
            <Tab.Panel className="h-full overflow-auto p-6">
              <PromptTestTab
                promptId={id}
                currentPromptContent={templateText}
              />
            </Tab.Panel>
          )}
        </Tab.Panels>
      </Tab.Group>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          title="Delete Prompt"
          description={`Are you sure you want to delete "${prompt.name}"? This action cannot be undone.`}
          confirmLabel="Delete Prompt"
          onConfirm={handleDelete}
          confirmVariant="danger"
          isLoading={deleteMutation.isPending}
        />
      </div>
    </DashboardLayout>
  );
}
