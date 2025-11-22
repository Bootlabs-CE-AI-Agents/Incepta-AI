/**
 * Prompt Template Library Browser
 * 
 * Allows users to browse, preview, and use pre-built prompt templates.
 * Story 0.4.3: System Prompt Editor Part 2 - Part 4
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Search, BookOpen, Copy, Check, Filter } from 'lucide-react';

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template_text: string;
  variables: string[];
  tags?: string[];
}

interface PromptTemplateLibraryProps {
  /** Available templates */
  templates: PromptTemplate[];
  /** Callback when user selects a template */
  onSelectTemplate: (template: PromptTemplate) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Prompt Template Library Browser
 * 
 * Features:
 * - Search templates by name/description
 * - Filter by category
 * - Preview template content
 * - Copy or use template
 */
export function PromptTemplateLibrary({
  templates,
  onSelectTemplate,
  isLoading = false,
  className = '',
}: PromptTemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<PromptTemplate | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category));
    return ['all', ...Array.from(cats).sort()];
  }, [templates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      // Category filter
      if (selectedCategory !== 'all' && template.category !== selectedCategory) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          template.name.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query) ||
          template.tags?.some(tag => tag.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [templates, selectedCategory, searchQuery]);

  const handleCopyTemplate = async (template: PromptTemplate) => {
    try {
      await navigator.clipboard.writeText(template.template_text);
      setCopiedId(template.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy template:', err);
    }
  };

  const handleUseTemplate = (template: PromptTemplate) => {
    onSelectTemplate(template);
    setPreviewTemplate(null);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-text-secondary" />
        <h3 className="text-lg font-semibold text-text-primary">
          Template Library ({filteredTemplates.length})
        </h3>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-10 pr-4 py-2 bg-surface border border-white/10 rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-text-tertiary" />
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                selectedCategory === category
                  ? 'bg-primary text-white'
                  : 'bg-surface border border-white/10 text-text-secondary hover:border-primary/50'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="p-8 text-center text-text-tertiary">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No templates found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredTemplates.map(template => (
            <div
              key={template.id}
              className="p-4 bg-surface border border-white/10 rounded-lg hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => setPreviewTemplate(template)}
            >
              {/* Template Info */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-text-primary">
                    {template.name}
                  </h4>
                  <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded shrink-0">
                    {template.category}
                  </span>
                </div>
                
                <p className="text-xs text-text-secondary line-clamp-2">
                  {template.description}
                </p>

                {/* Variables */}
                {template.variables.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {template.variables.slice(0, 3).map(varName => (
                      <span
                        key={varName}
                        className="px-1.5 py-0.5 bg-white/5 text-text-tertiary text-xs rounded font-mono"
                      >
                        {'{{'}{varName}{'}}'}
                      </span>
                    ))}
                    {template.variables.length > 3 && (
                      <span className="text-xs text-text-tertiary">
                        +{template.variables.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Tags */}
                {template.tags && template.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {template.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 bg-white/5 text-text-tertiary text-xs rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setPreviewTemplate(null)}>
          <div className="bg-surface border border-white/10 rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-semibold text-text-primary mb-1">
                    {previewTemplate.name}
                  </h4>
                  <p className="text-sm text-text-secondary">
                    {previewTemplate.description}
                  </p>
                </div>
                <span className="px-2 py-1 bg-primary/20 text-primary text-sm rounded shrink-0">
                  {previewTemplate.category}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Variables */}
              {previewTemplate.variables.length > 0 && (
                <div>
                  <label className="text-xs text-text-tertiary mb-2 block">
                    Variables ({previewTemplate.variables.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {previewTemplate.variables.map(varName => (
                      <span
                        key={varName}
                        className="px-2 py-1 bg-primary/10 text-primary text-sm rounded font-mono"
                      >
                        {'{{'}{varName}{'}}'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Template Content */}
              <div>
                <label className="text-xs text-text-tertiary mb-2 block">Template Content</label>
                <div className="p-4 bg-black/20 border border-white/5 rounded-lg overflow-auto max-h-96">
                  <pre className="text-sm text-text-primary whitespace-pre-wrap font-mono">
                    {previewTemplate.template_text}
                  </pre>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-white/10">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 bg-surface border border-white/10 text-text-primary rounded-md hover:bg-white/5 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleCopyTemplate(previewTemplate)}
                className="px-4 py-2 bg-surface border border-white/10 text-text-primary rounded-md hover:bg-white/5 transition-colors flex items-center gap-2"
              >
                {copiedId === previewTemplate.id ? (
                  <>
                    <Check className="h-4 w-4 text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={() => handleUseTemplate(previewTemplate)}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
              >
                Use This Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
