'use client';

/**
 * System Prompts Page (/prompts)
 * Card grid layout displaying all prompt templates
 * RBAC: tenant_admin + developer (full CRUD), operator + viewer (read-only)
 */

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { usePrompts } from '@/lib/hooks/usePrompts';
import { PromptCards } from '@/components/prompts/PromptCards';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { canEdit as checkCanEdit } from '@/lib/utils/roleUtils';

export default function PromptsPage() {
  const { data: session } = useSession();
  const { data: prompts, isLoading, error } = usePrompts();

  const canEditPrompts = checkCanEdit(session?.user?.roles);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-h1 font-bold text-text-primary">System Prompts</h1>
        </div>
        <Loading size="lg" text="Loading prompts..." />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">
            Failed to load prompts: {(error as Error).message}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-h2 font-bold text-text-primary">System Prompts</h1>
          <p className="text-caption text-text-secondary mt-1">
            Manage LLM prompt templates with variable substitution
          </p>
        </div>
        {canEditPrompts && (
          <Link href="/dashboard/prompts/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Prompt
            </Button>
          </Link>
        )}
      </div>

      <PromptCards prompts={prompts || []} canEdit={canEditPrompts} />
    </DashboardLayout>
  );
}
