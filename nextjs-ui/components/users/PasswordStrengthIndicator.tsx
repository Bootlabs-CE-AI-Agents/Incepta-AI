/**
 * Password Strength Indicator Component
 *
 * Visual feedback for password strength (AC-3)
 * Shows label (Weak/Medium/Strong) and progress bar (0-100%)
 * Debounces calculation by 300ms for performance (AC-10)
 *
 * Usage:
 * <PasswordStrengthIndicator password={formPassword} />
 */

'use client';

import { useMemo } from 'react';
import { calculatePasswordStrength } from '@/lib/utils/password';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  // AC-10: Debounce password input by 300ms to avoid excessive calculations
  const debouncedPassword = useDebounce(password, 300);

  // Calculate strength only when debounced value changes
  const strength = useMemo(
    () => calculatePasswordStrength(debouncedPassword),
    [debouncedPassword]
  );

  // Don't show indicator if password is empty
  if (!password) {
    return null;
  }

  // Color mapping for progress bar and label
  const colorClasses = {
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
  };

  const textColorClasses = {
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    green: 'text-green-600',
  };

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-out ${colorClasses[strength.color]}`}
          style={{ width: `${strength.percentage}%` }}
          role="progressbar"
          aria-valuenow={strength.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Password strength: ${strength.label}`}
        />
      </div>

      {/* Strength label */}
      <div className="flex items-center justify-between">
        <span
          className={`text-sm font-medium ${textColorClasses[strength.color]}`}
          aria-live="polite"
        >
          {strength.label}
        </span>

        {/* Score indicator (e.g., "3/5") */}
        <span className="text-xs text-gray-500">
          {strength.score}/5
        </span>
      </div>
    </div>
  );
}
