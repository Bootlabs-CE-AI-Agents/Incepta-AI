/**
 * Unit tests for useAutoSaveDraft hook
 * Tests auto-save functionality, draft management, and localStorage integration
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSaveDraft } from '../useAutoSaveDraft';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('useAutoSaveDraft', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    mockLocalStorage.clear();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Draft saving', () => {
    it('should save draft after 30 seconds by default', async () => {
      const { result } = renderHook(() =>
        useAutoSaveDraft({
          promptId: 'test-123',
          content: 'Test content',
          enabled: true,
        })
      );

      // Initially, no draft should be saved
      expect(result.current.lastSaved).toBeNull();

      // Fast-forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Wait for the save to complete
      await waitFor(() => {
        expect(result.current.lastSaved).not.toBeNull();
      });

      // Verify draft was saved to localStorage
      const savedDraft = mockLocalStorage.getItem('prompt_draft_test-123');
      expect(savedDraft).toBeTruthy();
      const parsed = JSON.parse(savedDraft!);
      expect(parsed.content).toBe('Test content');
    });

    it('should save draft with null promptId for new prompts', async () => {
      const { result } = renderHook(() =>
        useAutoSaveDraft({
          promptId: null,
          content: 'New prompt content',
          enabled: true,
        })
      );

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(result.current.lastSaved).not.toBeNull();
      });

      const savedDraft = mockLocalStorage.getItem('prompt_draft_new');
      expect(savedDraft).toBeTruthy();
      const parsed = JSON.parse(savedDraft!);
      expect(parsed.content).toBe('New prompt content');
    });

    it('should use custom interval when provided', async () => {
      const { result } = renderHook(() =>
        useAutoSaveDraft({
          promptId: 'test-123',
          content: 'Test content',
          interval: 10000, // 10 seconds
          enabled: true,
        })
      );

      // Fast-forward 10 seconds (custom interval)
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(result.current.lastSaved).not.toBeNull();
      });
    });

    it('should not save when enabled is false', async () => {
      const { result } = renderHook(() =>
        useAutoSaveDraft({
          promptId: 'test-123',
          content: 'Test content',
          enabled: false, // Disabled
        })
      );

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should not have saved
      expect(result.current.lastSaved).toBeNull();
      const savedDraft = mockLocalStorage.getItem('prompt_draft_test-123');
      expect(savedDraft).toBeNull();
    });

    it('should update saved content when content changes', async () => {
      const { result, rerender } = renderHook(
        ({ content }) =>
          useAutoSaveDraft({
            promptId: 'test-123',
            content,
            enabled: true,
          }),
        { initialProps: { content: 'Initial content' } }
      );

      // Save initial content
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(result.current.lastSaved).not.toBeNull();
      });

      // Update content
      rerender({ content: 'Updated content' });

      // Wait for another save cycle
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        const savedDraft = mockLocalStorage.getItem('prompt_draft_test-123');
        const parsed = JSON.parse(savedDraft!);
        expect(parsed.content).toBe('Updated content');
      });
    });
  });

  describe('Draft loading', () => {
    it('should load existing draft from localStorage', () => {
      // Pre-populate localStorage with a draft
      const draftData = {
        content: 'Saved draft content',
        timestamp: Date.now(),
      };
      mockLocalStorage.setItem('prompt_draft_test-123', JSON.stringify(draftData));

      const { result } = renderHook(() =>
        useAutoSaveDraft({
          promptId: 'test-123',
          content: 'Current content',
          enabled: true,
        })
      );

      const loadedDraft = result.current.loadDraft();
      expect(loadedDraft).not.toBeNull();
      expect(loadedDraft?.content).toBe('Saved draft content');
    });

    it('should return null when no draft exists', () => {
      const { result } = renderHook(() =>
        useAutoSaveDraft({
          promptId: 'test-123',
          content: 'Current content',
          enabled: true,
        })
      );

      const loadedDraft = result.current.loadDraft();
      expect(loadedDraft).toBeNull();
    });

    it('should delete drafts older than 7 days', () => {
      // Create a draft from 8 days ago
      const oldTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000;
      const oldDraft = {
        content: 'Old draft',
        timestamp: oldTimestamp,
      };
      mockLocalStorage.setItem('prompt_draft_test-123', JSON.stringify(oldDraft));

      const { result } = renderHook(() =>
        useAutoSaveDraft({
          promptId: 'test-123',
          content: 'Current content',
          enabled: true,
        })
      );

      const loadedDraft = result.current.loadDraft();
      expect(loadedDraft).toBeNull();

      // Verify draft was deleted
      const savedDraft = mockLocalStorage.getItem('prompt_draft_test-123');
      expect(savedDraft).toBeNull();
    });

    it('should keep drafts newer than 7 days', () => {
      // Create a draft from 6 days ago
      const recentTimestamp = Date.now() - 6 * 24 * 60 * 60 * 1000;
      const recentDraft = {
        content: 'Recent draft',
        timestamp: recentTimestamp,
      };
      mockLocalStorage.setItem('prompt_draft_test-123', JSON.stringify(recentDraft));

      const { result } = renderHook(() =>
        useAutoSaveDraft({
          promptId: 'test-123',
          content: 'Current content',
          enabled: true,
        })
      );

      const loadedDraft = result.current.loadDraft();
      expect(loadedDraft).not.toBeNull();
      expect(loadedDraft?.content).toBe('Recent draft');
    });
  });

  describe('Draft clearing', () => {
    it('should clear draft from localStorage', () => {
      // Pre-populate localStorage with a draft
      const draftData = {
        content: 'Draft to be cleared',
        timestamp: Date.now(),
      };
      mockLocalStorage.setItem('prompt_draft_test-123', JSON.stringify(draftData));

      const { result } = renderHook(() =>
        useAutoSaveDraft({
          promptId: 'test-123',
          content: 'Current content',
          enabled: true,
        })
      );

      // Clear the draft
      act(() => {
        result.current.clearDraft();
      });

      // Verify draft was removed
      const savedDraft = mockLocalStorage.getItem('prompt_draft_test-123');
      expect(savedDraft).toBeNull();
    });

    it('should handle clearing non-existent draft gracefully', () => {
      const { result } = renderHook(() =>
        useAutoSaveDraft({
          promptId: 'test-123',
          content: 'Current content',
          enabled: true,
        })
      );

      // Should not throw error
      expect(() => {
        act(() => {
          result.current.clearDraft();
        });
      }).not.toThrow();
    });
  });

  describe('Manual save', () => {
    it('should allow manual save via saveDraft function', async () => {
      const { result } = renderHook(() =>
        useAutoSaveDraft({
          promptId: 'test-123',
          content: 'Test content',
          enabled: true,
        })
      );

      // Manually trigger save
      act(() => {
        result.current.saveDraft();
      });

      await waitFor(() => {
        expect(result.current.lastSaved).not.toBeNull();
      });

      const savedDraft = mockLocalStorage.getItem('prompt_draft_test-123');
      expect(savedDraft).toBeTruthy();
    });
  });

  describe('Saving state', () => {
    it('should set isSaving to true during save', async () => {
      const { result } = renderHook(() =>
        useAutoSaveDraft({
          promptId: 'test-123',
          content: 'Test content',
          enabled: true,
        })
      );

      expect(result.current.isSaving).toBe(false);

      // Trigger auto-save
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should be saving
      await waitFor(() => {
        expect(result.current.isSaving).toBe(true);
      });

      // Should finish saving
      await waitFor(() => {
        expect(result.current.isSaving).toBe(false);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle localStorage being unavailable', () => {
      // Mock localStorage as unavailable
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      });

      const { result } = renderHook(() =>
        useAutoSaveDraft({
          promptId: 'test-123',
          content: 'Test content',
          enabled: true,
        })
      );

      // Should not throw error
      expect(() => {
        act(() => {
          jest.advanceTimersByTime(30000);
        });
      }).not.toThrow();

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });

    it('should handle empty content', async () => {
      const { result } = renderHook(() =>
        useAutoSaveDraft({
          promptId: 'test-123',
          content: '',
          enabled: true,
        })
      );

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(result.current.lastSaved).not.toBeNull();
      });

      const savedDraft = mockLocalStorage.getItem('prompt_draft_test-123');
      expect(savedDraft).toBeTruthy();
      const parsed = JSON.parse(savedDraft!);
      expect(parsed.content).toBe('');
    });

    it('should handle very long content', async () => {
      const longContent = 'A'.repeat(50000); // 50KB of text

      const { result } = renderHook(() =>
        useAutoSaveDraft({
          promptId: 'test-123',
          content: longContent,
          enabled: true,
        })
      );

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(result.current.lastSaved).not.toBeNull();
      });

      const savedDraft = mockLocalStorage.getItem('prompt_draft_test-123');
      expect(savedDraft).toBeTruthy();
      const parsed = JSON.parse(savedDraft!);
      expect(parsed.content).toBe(longContent);
    });
  });
});
