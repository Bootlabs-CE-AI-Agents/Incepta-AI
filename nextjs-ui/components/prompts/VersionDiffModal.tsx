/**
 * Version Diff Modal Component
 *
 * Displays side-by-side diff comparison between current version and selected version.
 * Uses react-diff-view for rendering diff with syntax highlighting.
 *
 * Story: nextjs-story-28-prompts-version-history
 * AC: AC-2 (View Version Modal with Diff View)
 */

'use client';

import React, { useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { parseDiff, Diff, Hunk } from 'react-diff-view';
import { createTwoFilesPatch } from 'diff';
import type { PromptVersion } from '@/lib/api/prompts';
import { Button } from '@/components/ui/Button';
import 'react-diff-view/style/index.css';

interface VersionDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  version: PromptVersion;
  currentText: string;
  promptId: string;
}

export function VersionDiffModal({
  isOpen,
  onClose,
  version,
  currentText,
}: VersionDiffModalProps) {
  // Generate diff between current and selected version (AC-2)
  const diffText = useMemo(() => {
    // Use diff package to generate unified diff format
    const unifiedDiff = createTwoFilesPatch(
      `Version ${version.version_number}`,
      'Current Version',
      version.template_text,
      currentText,
      '',
      '',
      { context: 3 }
    );
    return unifiedDiff;
  }, [version, currentText]);

  // Parse diff for rendering
  const files = useMemo(() => {
    try {
      return parseDiff(diffText);
    } catch (error) {
      console.error('Failed to parse diff:', error);
      return [];
    }
  }, [diffText]);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
          {/* Header (AC-2: Version metadata) */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/50 dark:border-white/20">
            <div>
              <Dialog.Title className="text-lg font-semibold text-text-primary dark:text-white">
                Version {version.version_number} Comparison
              </Dialog.Title>
              <div className="mt-1 space-y-1">
                <p className="text-sm text-text-secondary">
                  Saved: {format(new Date(version.created_at), 'MMM dd, yyyy, h:mm a')}
                </p>
                <p className="text-sm text-text-secondary">
                  Characters: {version.template_text.length.toLocaleString()}
                </p>
                {version.description && (
                  <p className="text-sm text-text-secondary">
                    Description: {version.description}
                  </p>
                )}
                {version.created_by && (
                  <p className="text-sm text-text-secondary">
                    Created by: {version.created_by}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Diff Content (AC-2: Side-by-side comparison) */}
          <div className="flex-1 overflow-auto px-6 py-4">
            {files.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-secondary">No differences found</p>
              </div>
            ) : (
              files.map((file, index) => (
                <div key={index} className="border border-white/50 dark:border-white/20 rounded-lg overflow-hidden">
                  {/* Diff view with side-by-side split */}
                  <Diff
                    viewType="split"
                    diffType={file.type}
                    hunks={file.hunks || []}
                    optimizeSelection
                  >
                    {(hunks) =>
                      hunks.map((hunk) => (
                        <Hunk key={hunk.content} hunk={hunk} />
                      ))
                    }
                  </Diff>
                </div>
              ))
            )}

            {/* Legend */}
            <div className="mt-4 flex items-center gap-6 text-xs text-text-secondary">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
                <span>Added</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded" />
                <span>Removed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded" />
                <span>Modified</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/50 dark:border-white/20">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
