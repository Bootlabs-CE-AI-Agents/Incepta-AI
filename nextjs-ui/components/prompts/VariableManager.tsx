'use client';

/**
 * Variable Manager Component
 * 
 * Manages variables in prompt templates:
 * - Auto-detect variables from prompt text
 * - Add/edit/remove variable definitions
 * - Set default values and descriptions
 * - Mark variables as required/optional
 * 
 * Story 0.4.2: System Prompt Editor Part 1 - Part 4
 */

import React, { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import type { PromptVariable } from '@/types/prompts';
import { createVariablesFromText, extractVariables } from '@/lib/utils/promptVariables';

interface VariableManagerProps {
  /** Current prompt text */
  promptText: string;
  /** Declared variables */
  variables: PromptVariable[];
  /** Callback when variables change */
  onChange: (variables: PromptVariable[]) => void;
}

export function VariableManager({
  promptText,
  variables,
  onChange,
}: VariableManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newVarName, setNewVarName] = useState('');

  // Extract variables from current prompt text
  const extractedVars = extractVariables(promptText);
  
  // Find undeclared variables (used in text but not in variables list)
  const undeclaredVars = extractedVars.filter(
    varName => !variables.find(v => v.name === varName)
  );

  // Find unused variables (in list but not used in text)
  const unusedVars = variables.filter(
    v => !extractedVars.includes(v.name)
  );

  const handleAutoDetect = () => {
    const autoDetected = createVariablesFromText(promptText);
    // Merge with existing, keeping existing definitions
    const merged = [...variables];
    autoDetected.forEach(newVar => {
      if (!merged.find(v => v.name === newVar.name)) {
        merged.push(newVar);
      }
    });
    onChange(merged);
  };

  const handleAddVariable = () => {
    if (!newVarName.trim()) return;
    
    // Validate variable name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newVarName)) {
      alert('Variable name must start with a letter or underscore and contain only letters, numbers, and underscores');
      return;
    }

    // Check if already exists
    if (variables.find(v => v.name === newVarName)) {
      alert('Variable already exists');
      return;
    }

    onChange([
      ...variables,
      {
        name: newVarName,
        description: '',
        required: true,
        exampleValue: '',
      },
    ]);
    
    setNewVarName('');
    setIsAdding(false);
  };

  const handleUpdateVariable = (index: number, updates: Partial<PromptVariable>) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const handleDeleteVariable = (index: number) => {
    onChange(variables.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">
          Variables ({variables.length})
        </h3>
        <button
          onClick={handleAutoDetect}
          className="px-3 py-1.5 text-sm bg-primary/10 text-primary border border-primary/20 rounded-md hover:bg-primary/20 transition-colors"
        >
          Auto-Detect Variables
        </button>
      </div>

      {/* Undeclared variables warning */}
      {undeclaredVars.length > 0 && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
          <p className="text-sm text-yellow-400 font-medium">
            ⚠️ Undeclared Variables: {undeclaredVars.map(varName => `{{${varName}}}`).join(', ')}
          </p>
          <button
            onClick={handleAutoDetect}
            className="mt-2 text-xs text-yellow-400 hover:underline"
          >
            Click to auto-detect and add them
          </button>
        </div>
      )}

      {/* Variables list */}
      <div className="space-y-2">
        {variables.map((variable, index) => {
          const isUnused = unusedVars.includes(variable);
          
          return (
            <div
              key={variable.name}
              className={`p-3 bg-surface border rounded-md ${
                isUnused ? 'border-yellow-500/20' : 'border-white/10'
              }`}
            >
              <div className="space-y-2">
                {/* Variable name and controls */}
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-primary/10 text-primary text-sm font-mono rounded">
                    {'{{'}{variable.name}{'}}'
}
                  </span>
                  <input
                    type="checkbox"
                    checked={variable.required}
                    onChange={(e) => handleUpdateVariable(index, { required: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-xs text-text-secondary">Required</label>
                  {isUnused && (
                    <span className="text-xs text-yellow-400">⚠️ Unused</span>
                  )}
                  <button
                    onClick={() => handleDeleteVariable(index)}
                    className="ml-auto p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Description */}
                <input
                  type="text"
                  value={variable.description || ''}
                  onChange={(e) => handleUpdateVariable(index, { description: e.target.value })}
                  placeholder="Description (optional)"
                  className="w-full px-2 py-1 text-sm bg-white/5 border border-white/10 rounded text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary"
                />

                {/* Default value */}
                <input
                  type="text"
                  value={variable.defaultValue || ''}
                  onChange={(e) => handleUpdateVariable(index, { defaultValue: e.target.value })}
                  placeholder="Default value (optional)"
                  className="w-full px-2 py-1 text-sm bg-white/5 border border-white/10 rounded text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary"
                />

                {/* Example value */}
                <input
                  type="text"
                  value={variable.exampleValue || ''}
                  onChange={(e) => handleUpdateVariable(index, { exampleValue: e.target.value })}
                  placeholder="Example value (optional)"
                  className="w-full px-2 py-1 text-sm bg-white/5 border border-white/10 rounded text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Add variable */}
      {isAdding ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newVarName}
            onChange={(e) => setNewVarName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddVariable()}
            placeholder="Variable name (e.g. user_name)"
            className="flex-1 px-3 py-2 bg-surface border border-white/10 rounded-md text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <button
            onClick={handleAddVariable}
            className="px-3 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            <Check className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              setIsAdding(false);
              setNewVarName('');
            }}
            className="px-3 py-2 bg-surface border border-white/10 text-text-primary rounded-md hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full px-3 py-2 border-2 border-dashed border-white/10 text-text-secondary rounded-md hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Variable
        </button>
      )}
    </div>
  );
}
