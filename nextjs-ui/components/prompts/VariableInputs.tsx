/**
 * VariableInputs Component
 * Dynamic input fields for prompt variables
 *
 * Story: nextjs-story-29-prompts-llm-test
 * AC: AC-7 (Variable Substitution Preview)
 */

'use client';

import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

interface VariableInputsProps {
  variables: string[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  className?: string;
}

export function VariableInputs({
  variables,
  values,
  onChange,
  className = '',
}: VariableInputsProps) {
  if (variables.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Variables Detected ({variables.length})
      </Label>
      <div className="space-y-2">
        {variables.map((variable) => (
          <div key={variable} className="flex items-center space-x-2">
            <Label
              htmlFor={`var-${variable}`}
              className="text-xs text-gray-600 dark:text-gray-400 w-32 shrink-0"
            >
              {`{{${variable}}}:`}
            </Label>
            <Input
              id={`var-${variable}`}
              type="text"
              value={values[variable] || ''}
              onChange={(e) => onChange(variable, e.target.value)}
              placeholder={`Value for ${variable}`}
              className="flex-1 text-sm"
              aria-label={`Value for variable ${variable}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
