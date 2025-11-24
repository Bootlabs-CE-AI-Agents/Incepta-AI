/**
 * React Query hooks for System Prompt Templates
 * Provides data fetching, mutations, and optimistic updates
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreatePromptRequest,
  PromptTemplate,
  TestPromptRequest,
  UpdatePromptRequest,
} from '../api/prompts';
import * as promptsApi from '../api/prompts';
import { toast } from 'sonner';

/**
 * Fetch all prompts for current tenant
 */
export function usePrompts() {
  return useQuery({
    queryKey: ['prompts'],
    queryFn: promptsApi.listPrompts,
  });
}

/**
 * Fetch single prompt by ID
 */
export function usePrompt(id: string) {
  return useQuery({
    queryKey: ['prompts', id],
    queryFn: () => promptsApi.getPrompt(id),
    enabled: !!id,
  });
}

/**
 * Fetch version history for a prompt with pagination and filters
 */
export function usePromptVersions(
  id: string,
  params?: promptsApi.VersionsQueryParams
) {
  return useQuery({
    queryKey: ['prompts', id, 'versions', params],
    queryFn: () => promptsApi.getPromptVersions(id, params),
    enabled: !!id,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch single version details
 */
export function usePromptVersion(id: string, versionId: string) {
  return useQuery({
    queryKey: ['prompts', id, 'versions', versionId],
    queryFn: () => promptsApi.getPromptVersion(id, versionId),
    enabled: !!id && !!versionId,
  });
}

/**
 * Create new prompt template
 */
export function useCreatePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePromptRequest) => promptsApi.createPrompt(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      toast.success('Prompt created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create prompt: ${error.message}`);
    },
  });
}

/**
 * Update existing prompt template
 */
export function useUpdatePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePromptRequest }) =>
      promptsApi.updatePrompt(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['prompts', id] });

      // Snapshot previous value
      const previousPrompt = queryClient.getQueryData<PromptTemplate>([
        'prompts',
        id,
      ]);

      // Optimistically update
      if (previousPrompt) {
        queryClient.setQueryData<PromptTemplate>(['prompts', id], {
          ...previousPrompt,
          ...data,
          updated_at: new Date().toISOString(),
        });
      }

      return { previousPrompt };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      queryClient.invalidateQueries({ queryKey: ['prompts', variables.id] });
      toast.success('Prompt updated successfully');
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousPrompt) {
        queryClient.setQueryData(
          ['prompts', variables.id],
          context.previousPrompt
        );
      }
      toast.error(`Failed to update prompt: ${error.message}`);
    },
  });
}

/**
 * Delete prompt template
 */
export function useDeletePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => promptsApi.deletePrompt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      toast.success('Prompt deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete prompt: ${error.message}`);
    },
  });
}

/**
 * Test prompt with sample variables
 */
export function useTestPrompt() {
  return useMutation({
    mutationFn: (data: TestPromptRequest) => promptsApi.testPrompt(data),
    onError: (error: Error) => {
      toast.error(`Failed to test prompt: ${error.message}`);
    },
  });
}

/**
 * Revert prompt to previous version
 */
export function useRevertPromptVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, versionId }: { id: string; versionId: string }) =>
      promptsApi.revertPromptVersion(id, versionId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      queryClient.invalidateQueries({ queryKey: ['prompts', variables.id] });
      queryClient.invalidateQueries({
        queryKey: ['prompts', variables.id, 'versions'],
      });
      toast.success('Reverted to previous version');
    },
    onError: (error: Error) => {
      toast.error(`Failed to revert prompt: ${error.message}`);
    },
  });
}
