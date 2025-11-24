/**
 * Auto-Save Draft Hook
 *
 * Automatically saves prompt draft to localStorage every 30 seconds.
 * Story 27 AC-6: Auto-save draft functionality
 */

'use client';

import { useEffect, useRef, useState } from 'react';

interface DraftData {
  content: string;
  variables?: string[];
  timestamp: number;
}

interface UseAutoSaveDraftOptions {
  /** Unique identifier for the prompt (or 'new' for new prompts) */
  promptId: string | null;
  /** Content to auto-save */
  content: string;
  /** Auto-save interval in milliseconds (default: 30000 = 30s) */
  interval?: number;
  /** Whether auto-save is enabled */
  enabled?: boolean;
}

interface UseAutoSaveDraftReturn {
  /** Whether a draft was just saved */
  isSaving: boolean;
  /** Timestamp of last save */
  lastSaved: Date | null;
  /** Clear the draft from localStorage */
  clearDraft: () => void;
  /** Load draft from localStorage */
  loadDraft: () => DraftData | null;
  /** Manually trigger save */
  saveDraft: () => void;
}

const DRAFT_KEY_PREFIX = 'prompt_draft_';
const MAX_DRAFT_AGE_DAYS = 7;

/**
 * Get localStorage key for a prompt draft
 */
function getDraftKey(promptId: string | null): string {
  return `${DRAFT_KEY_PREFIX}${promptId || 'new'}`;
}

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Auto-Save Draft Hook
 *
 * @example
 * ```tsx
 * const { lastSaved, clearDraft, loadDraft } = useAutoSaveDraft({
 *   promptId: prompt?.id || null,
 *   content: promptText,
 *   enabled: true,
 * });
 * ```
 */
export function useAutoSaveDraft({
  promptId,
  content,
  interval = 30000, // 30 seconds
  enabled = true,
}: UseAutoSaveDraftOptions): UseAutoSaveDraftReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const contentRef = useRef(content);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update content ref
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  /**
   * Save draft to localStorage
   */
  const saveDraft = () => {
    if (!isLocalStorageAvailable() || !enabled) return;

    try {
      const draftKey = getDraftKey(promptId);
      const draftData: DraftData = {
        content: contentRef.current,
        timestamp: Date.now(),
      };

      localStorage.setItem(draftKey, JSON.stringify(draftData));
      setLastSaved(new Date());
      setIsSaving(false);
    } catch (error) {
      console.error('Failed to save draft:', error);
      setIsSaving(false);
    }
  };

  /**
   * Load draft from localStorage
   */
  const loadDraft = (): DraftData | null => {
    if (!isLocalStorageAvailable()) return null;

    try {
      const draftKey = getDraftKey(promptId);
      const draftJson = localStorage.getItem(draftKey);

      if (!draftJson) return null;

      const draft: DraftData = JSON.parse(draftJson);

      // Check if draft is too old
      const ageInDays = (Date.now() - draft.timestamp) / (1000 * 60 * 60 * 24);
      if (ageInDays > MAX_DRAFT_AGE_DAYS) {
        // Auto-delete old drafts
        localStorage.removeItem(draftKey);
        return null;
      }

      return draft;
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  };

  /**
   * Clear draft from localStorage
   */
  const clearDraft = () => {
    if (!isLocalStorageAvailable()) return;

    try {
      const draftKey = getDraftKey(promptId);
      localStorage.removeItem(draftKey);
      setLastSaved(null);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  };

  // Auto-save effect
  useEffect(() => {
    if (!enabled || !isLocalStorageAvailable()) return;

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up auto-save interval
    intervalRef.current = setInterval(() => {
      setIsSaving(true);
      // Small delay to show "saving" indicator
      setTimeout(saveDraft, 100);
    }, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, promptId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    lastSaved,
    clearDraft,
    loadDraft,
    saveDraft,
  };
}
