'use client';

/**
 * Create Prompt Page (/prompts/new)
 * Form for creating new prompt template
 * Fields: Name (required), Description (optional), Template (CodeMirror)
 */

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreatePrompt } from '@/lib/hooks/usePrompts';
import { useAutoSaveDraft } from '@/lib/hooks/useAutoSaveDraft';
import { PromptEditor } from '@/components/prompts/PromptEditor';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { canEdit } from '@/lib/utils/roleUtils';

const createPromptSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').catch(''),
  template_text: z.string().min(1, 'Template is required'),
});

type CreatePromptForm = z.infer<typeof createPromptSchema>;

const DEFAULT_TEMPLATE = `# System Prompt Template
# Available variables: {{agent_name}}, {{ticket_id}}, {{user_name}}

You are {{agent_name}}, an AI assistant helping with ticket {{ticket_id}}.`;

export default function NewPromptPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const createMutation = useCreatePrompt();

  const [templateText, setTemplateText] = useState(DEFAULT_TEMPLATE);
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  const canCreate = canEdit(session?.user?.roles);

  // Auto-save draft every 30 seconds (AC-6)
  const { isSaving, lastSaved, clearDraft, loadDraft } = useAutoSaveDraft({
    promptId: null, // New prompts use null
    content: templateText,
    enabled: canCreate, // Only auto-save if user has permission
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreatePromptForm>({
    resolver: zodResolver(createPromptSchema),
    defaultValues: {
      name: '',
      description: '',
      template_text: DEFAULT_TEMPLATE,
    },
  });

  // Sync CodeMirror value with form
  useEffect(() => {
    setValue('template_text', templateText);
  }, [templateText, setValue]);

  // Check for existing draft on mount (AC-6)
  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft.content && draft.content !== DEFAULT_TEMPLATE) {
      setShowDraftBanner(true);
    }
  }, [loadDraft]);

  // Redirect if no permission
  useEffect(() => {
    if (session && !canCreate) {
      router.push('/dashboard/prompts');
    }
  }, [session, canCreate, router]);

  const onSubmit = async (data: CreatePromptForm) => {
    const result = await createMutation.mutateAsync(data);
    clearDraft(); // Clear draft after successful save (AC-6)
    router.push(`/dashboard/prompts/${result.id}`);
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

  if (!canCreate) {
    return (
      <DashboardLayout>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-sm text-yellow-800">
            You do not have permission to create prompts.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-screen flex flex-col">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
        {/* Draft Restoration Banner (AC-6) */}
        {showDraftBanner && (
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
              type="button"
              onClick={() => router.push('/dashboard/prompts')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-h1 font-bold text-text-primary">Create Prompt</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Auto-save indicator (AC-6) */}
            {lastSaved && (
              <span className="text-xs text-text-secondary">
                {isSaving ? (
                  '💾 Saving draft...'
                ) : (
                  `✓ Draft saved ${formatLastSaved(lastSaved)}`
                )}
              </span>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Prompt'}
            </Button>
          </div>
        </div>

        {/* Metadata Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="name">Prompt Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Ticket Enhancer Prompt"
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Optional description"
              rows={1}
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">
                {errors.description.message}
              </p>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <PromptEditor
            value={templateText}
            onChange={setTemplateText}
            onSave={handleSubmit(onSubmit)}
            isSubmitting={isSubmitting}
          />
          {errors.template_text && (
            <p className="text-sm text-red-600 mt-2">
              {errors.template_text.message}
            </p>
          )}
        </div>
      </form>
      </div>
    </DashboardLayout>
  );
}
