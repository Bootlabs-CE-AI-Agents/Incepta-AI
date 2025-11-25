'use client';

/**
 * ScopeCheckboxGroup - Reusable OAuth2 scope selection UI
 * Features:
 * - Predefined scope checkboxes (read:user, write:user, etc.)
 * - Custom scope addition with validation
 * - Scope pattern validation: [a-z_]+:[a-z_]+
 */

import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';

const PREDEFINED_SCOPES = [
  'read:user',
  'write:user',
  'read:repo',
  'write:repo',
  'read:org',
  'admin:org',
];

const SCOPE_PATTERN = /^[a-z_]+:[a-z_]+$/;

interface ScopeCheckboxGroupProps {
  selectedScopes: string[];
  onChange: (scopes: string[]) => void;
  error?: string;
  disabled?: boolean;
}

export function ScopeCheckboxGroup({
  selectedScopes,
  onChange,
  error,
  disabled = false,
}: ScopeCheckboxGroupProps) {
  const [customScopes, setCustomScopes] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customScopeInput, setCustomScopeInput] = useState('');
  const [customScopeError, setCustomScopeError] = useState('');

  const allScopes = [...PREDEFINED_SCOPES, ...customScopes];

  const handleCheckboxChange = (scope: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedScopes, scope]);
    } else {
      onChange(selectedScopes.filter((s) => s !== scope));
    }
  };

  const handleAddCustomScope = () => {
    const trimmed = customScopeInput.trim();

    // Validation
    if (!trimmed) {
      setCustomScopeError('Scope cannot be empty');
      return;
    }

    if (!SCOPE_PATTERN.test(trimmed)) {
      setCustomScopeError('Invalid scope format (expected pattern: read:user)');
      return;
    }

    if (allScopes.includes(trimmed)) {
      setCustomScopeError('This scope already exists');
      return;
    }

    // Add custom scope
    setCustomScopes([...customScopes, trimmed]);
    onChange([...selectedScopes, trimmed]); // Auto-check the newly added scope
    setCustomScopeInput('');
    setCustomScopeError('');
    setShowCustomInput(false);
  };

  const handleCancelCustomScope = () => {
    setCustomScopeInput('');
    setCustomScopeError('');
    setShowCustomInput(false);
  };

  return (
    <div className="space-y-3">
      <Label>Scopes * (Select at least 1)</Label>

      {/* Checkbox Grid */}
      <div className="grid grid-cols-2 gap-3">
        {allScopes.map((scope) => {
          const isChecked = selectedScopes.includes(scope);
          const isCustom = customScopes.includes(scope);

          return (
            <label
              key={scope}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => handleCheckboxChange(scope, e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`Select ${scope} scope`}
              />
              <span className="text-sm text-gray-700">
                {scope}
                {isCustom && (
                  <span className="ml-1 text-xs text-gray-500">(custom)</span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {/* Validation Error */}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Custom Scope Input */}
      {showCustomInput ? (
        <div className="space-y-2 p-3 bg-gray-50 rounded-md border border-gray-200">
          <Label htmlFor="custom_scope_input" className="text-sm">
            Custom Scope
          </Label>
          <div className="flex gap-2">
            <Input
              id="custom_scope_input"
              value={customScopeInput}
              onChange={(e) => {
                setCustomScopeInput(e.target.value);
                setCustomScopeError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomScope();
                } else if (e.key === 'Escape') {
                  handleCancelCustomScope();
                }
              }}
              placeholder="e.g., read:issues"
              disabled={disabled}
              className="flex-1"
              autoFocus
              aria-label="Enter custom scope"
              aria-describedby={customScopeError ? 'custom-scope-error' : undefined}
            />
            <Button
              type="button"
              onClick={handleAddCustomScope}
              disabled={disabled}
              className="px-3 py-1 text-sm"
            >
              Add
            </Button>
            <Button
              type="button"
              onClick={handleCancelCustomScope}
              disabled={disabled}
              variant="outline"
              className="px-3 py-1 text-sm"
            >
              Cancel
            </Button>
          </div>
          {customScopeError && (
            <p id="custom-scope-error" className="text-sm text-red-600" role="alert">
              {customScopeError}
            </p>
          )}
          <p className="text-xs text-gray-500">
            Pattern: [a-z_]+:[a-z_]+ (e.g., read:user, admin:repo)
          </p>
        </div>
      ) : (
        <Button
          type="button"
          onClick={() => setShowCustomInput(true)}
          disabled={disabled}
          variant="outline"
          className="text-sm"
        >
          + Add Custom Scope
        </Button>
      )}
    </div>
  );
}
