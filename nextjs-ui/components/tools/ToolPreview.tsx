'use client';

/**
 * ToolPreview - Table displaying parsed OpenAPI operations
 * Features: HTTP method badges, expandable rows, selection checkboxes
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { OpenAPIOperation } from '@/lib/api/tools';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface ToolPreviewProps {
  operations: OpenAPIOperation[];
  selectedOperations: string[]; // Array of operationIds
  onSelectionChange: (operationIds: string[]) => void;
}

const METHOD_VARIANTS: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  GET: 'success',
  POST: 'info',
  PUT: 'warning',
  PATCH: 'warning',
  DELETE: 'error',
};

export function ToolPreview({
  operations,
  selectedOperations,
  onSelectionChange,
}: ToolPreviewProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (operationId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(operationId)) {
      newExpanded.delete(operationId);
    } else {
      newExpanded.add(operationId);
    }
    setExpandedRows(newExpanded);
  };

  const toggleSelection = (operationId: string) => {
    if (selectedOperations.includes(operationId)) {
      onSelectionChange(selectedOperations.filter((id) => id !== operationId));
    } else {
      onSelectionChange([...selectedOperations, operationId]);
    }
  };

  const toggleAll = () => {
    if (selectedOperations.length === operations.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(operations.map((op) => op.operationId));
    }
  };

  if (operations.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        <p className="text-sm">No operations found in spec</p>
      </div>
    );
  }

  const allSelected = selectedOperations.length === operations.length;
  const someSelected = selectedOperations.length > 0 && !allSelected;

  return (
    <div className="border border-white/50 dark:border-white/20 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-white/50 dark:bg-white/5 px-4 py-3 border-b border-white/50 dark:border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={toggleAll}
              className="h-4 w-4 text-accent-blue border-white/50 dark:border-white/20 rounded focus:ring-accent-blue"
            />
            <span className="text-sm font-medium text-text-primary dark:text-text-secondary">
              {selectedOperations.length} of {operations.length} selected
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="divide-y divide-white/50 dark:divide-white/20">
        {operations.map((operation) => {
          const isExpanded = expandedRows.has(operation.operationId);
          const isSelected = selectedOperations.includes(operation.operationId);

          return (
            <div key={operation.operationId} className="bg-white dark:bg-white/5 hover:bg-white/50 dark:hover:bg-white/10">
              {/* Row */}
              <div className="flex items-center px-4 py-3 gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelection(operation.operationId)}
                  className="h-4 w-4 text-accent-blue border-white/50 dark:border-white/20 rounded focus:ring-accent-blue"
                />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleRow(operation.operationId)}
                  className="p-0 h-auto"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>

                <Badge variant={METHOD_VARIANTS[operation.method] || 'default'} size="sm">
                  {operation.method}
                </Badge>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-text-primary dark:text-white truncate">
                    {operation.path}
                  </p>
                  <p className="text-xs text-text-secondary truncate">{operation.operationId}</p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-text-secondary truncate max-w-xs">
                    {operation.summary || 'No summary'}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {operation.parameters.length} parameter(s)
                  </p>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 py-3 bg-white/50 dark:bg-white/5 border-t border-white/50 dark:border-white/20">
                  <div className="space-y-3">
                    {operation.description && (
                      <div>
                        <p className="text-xs font-medium text-text-primary dark:text-text-secondary mb-1">
                          Description:
                        </p>
                        <p className="text-sm text-text-secondary">{operation.description}</p>
                      </div>
                    )}

                    {operation.parameters.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-text-primary dark:text-text-secondary mb-2">Parameters:</p>
                        <div className="space-y-1">
                          {operation.parameters.map((param, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-xs text-text-secondary"
                            >
                              <span className="font-mono bg-white/50 dark:bg-white/10 px-2 py-0.5 rounded">
                                {param.name}
                              </span>
                              <Badge variant="default" size="sm">
                                {param.in}
                              </Badge>
                              {param.required && (
                                <Badge variant="error" size="sm">
                                  required
                                </Badge>
                              )}
                              {param.description && (
                                <span className="text-text-secondary">— {param.description}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
