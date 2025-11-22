/**
 * Prompt Version History Component
 * 
 * Displays version history for agent system prompts with:
 * - Timeline view of all versions
 * - Version comparison/diff
 * - Revert to previous version
 * - Version details (creator, timestamp, description)
 * 
 * Story 0.4.3: System Prompt Editor Part 2 - Part 3
 */

'use client';

import React, { useState } from 'react';
import { History, RotateCcw, Eye, Check, X } from 'lucide-react';
import type { PromptVersionResponse, PromptVersionDetail } from '@/types/prompts';
import { formatDistanceToNow } from 'date-fns';

interface PromptVersionHistoryProps {
  /** Agent ID */
  agentId: string;
  /** Version history list */
  versions: PromptVersionResponse[];
  /** Currently active prompt text */
  currentPrompt: string;
  /** Callback when user requests to view a version */
  onViewVersion: (versionId: string) => Promise<PromptVersionDetail>;
  /** Callback when user reverts to a version */
  onRevertVersion: (versionId: string) => Promise<void>;
  /** Loading state */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Prompt Version History Component
 * 
 * Shows timeline of prompt changes with revert capability
 */
export function PromptVersionHistory({
  agentId, // eslint-disable-line @typescript-eslint/no-unused-vars
  versions,
  currentPrompt, // eslint-disable-line @typescript-eslint/no-unused-vars
  onViewVersion,
  onRevertVersion,
  isLoading = false,
  className = '',
}: PromptVersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<PromptVersionDetail | null>(null);
  const [viewingVersion, setViewingVersion] = useState(false);
  const [revertingId, setRevertingId] = useState<string | null>(null);

  const handleViewVersion = async (versionId: string) => {
    setViewingVersion(true);
    try {
      const detail = await onViewVersion(versionId);
      setSelectedVersion(detail);
    } catch (error) {
      console.error('Failed to load version:', error);
    } finally {
      setViewingVersion(false);
    }
  };

  const handleRevertVersion = async (versionId: string) => {
    if (!confirm('Are you sure you want to revert to this version? This will create a new version with the old content.')) {
      return;
    }

    setRevertingId(versionId);
    try {
      await onRevertVersion(versionId);
      setSelectedVersion(null);
    } catch (error) {
      console.error('Failed to revert version:', error);
      alert('Failed to revert version. Please try again.');
    } finally {
      setRevertingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className={`p-8 text-center text-text-tertiary ${className}`}>
        <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No version history available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-text-secondary" />
        <h3 className="text-lg font-semibold text-text-primary">
          Version History ({versions.length})
        </h3>
      </div>

      {/* Version List */}
      <div className="space-y-2">
        {versions.map((version, index) => {
          const isReverting = revertingId === version.id;
          
          return (
            <div
              key={version.id}
              className={`p-3 bg-surface border rounded-lg hover:border-primary/30 transition-colors ${
                version.is_current ? 'border-primary/50 bg-primary/5' : 'border-white/10'
              } ${selectedVersion?.id === version.id ? 'ring-2 ring-primary' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Version Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-text-primary">
                      Version {version.version}
                    </span>
                    {version.is_current && (
                      <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded">
                        <Check className="inline h-3 w-3 mr-1" />
                        Current
                      </span>
                    )}
                    {index === 0 && !version.is_current && (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                        Latest
                      </span>
                    )}
                  </div>
                  
                  {version.description && (
                    <p className="text-sm text-text-secondary mb-1 truncate">
                      {version.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-3 text-xs text-text-tertiary">
                    {version.created_by && (
                      <span>By {version.created_by}</span>
                    )}
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewVersion(version.id)}
                    disabled={viewingVersion}
                    className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50"
                    title="View this version"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  
                  {!version.is_current && (
                    <button
                      onClick={() => handleRevertVersion(version.id)}
                      disabled={isReverting}
                      className="p-1.5 text-text-secondary hover:text-green-400 hover:bg-green-500/10 rounded transition-colors disabled:opacity-50"
                      title="Revert to this version"
                    >
                      {isReverting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b border-current"></div>
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Version Detail View */}
      {selectedVersion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-white/10 rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h4 className="text-lg font-semibold text-text-primary">
                Version {selectedVersion.version} Details
              </h4>
              <button
                onClick={() => setSelectedVersion(null)}
                className="p-1 text-text-secondary hover:text-text-primary rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-3 mb-4">
                {selectedVersion.description && (
                  <div>
                    <label className="text-xs text-text-tertiary">Description</label>
                    <p className="text-sm text-text-primary">{selectedVersion.description}</p>
                  </div>
                )}
                <div className="flex gap-6 text-xs text-text-tertiary">
                  {selectedVersion.created_by && (
                    <div>
                      <span className="text-text-secondary">Created by:</span> {selectedVersion.created_by}
                    </div>
                  )}
                  <div>
                    <span className="text-text-secondary">Created:</span> {new Date(selectedVersion.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-text-tertiary mb-2 block">Prompt Content</label>
                <div className="p-4 bg-black/20 border border-white/5 rounded-lg overflow-auto max-h-96">
                  <pre className="text-sm text-text-primary whitespace-pre-wrap font-mono">
                    {selectedVersion.prompt_text}
                  </pre>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-white/10">
              <button
                onClick={() => setSelectedVersion(null)}
                className="px-4 py-2 bg-surface border border-white/10 text-text-primary rounded-md hover:bg-white/5 transition-colors"
              >
                Close
              </button>
              {!selectedVersion.is_current && (
                <button
                  onClick={() => handleRevertVersion(selectedVersion.id)}
                  disabled={revertingId === selectedVersion.id}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {revertingId === selectedVersion.id ? 'Reverting...' : 'Revert to This Version'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
