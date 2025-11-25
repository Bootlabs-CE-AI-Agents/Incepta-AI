/**
 * Password Input Component with Show/Hide Toggle
 *
 * Reusable password input with visibility toggle (AC-3)
 * Integrates with React Hook Form
 * Includes PasswordStrengthIndicator for create forms
 *
 * Usage:
 * <PasswordInput
 *   label="Password"
 *   name="password"
 *   register={register}
 *   error={errors.password}
 *   showStrengthIndicator={true}
 *   value={watchedPassword}
 * />
 */

'use client';

import { useState } from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';

interface PasswordInputProps {
  label: string;
  name: string;
  register: UseFormRegisterReturn;
  error?: { message?: string };
  placeholder?: string;
  showStrengthIndicator?: boolean;
  value?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
}

export function PasswordInput({
  label,
  name,
  register,
  error,
  placeholder = 'Enter password',
  showStrengthIndicator = false,
  value = '',
  required = true,
  disabled = false,
  autoComplete = 'current-password',
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="space-y-2">
      {/* Label */}
      <label htmlFor={name} className="block text-sm font-medium text-text-secondary">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Input container with toggle button */}
      <div className="relative">
        <input
          id={name}
          type={showPassword ? 'text' : 'password'}
          autoComplete={autoComplete}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            block w-full rounded-md border-0 py-1.5 pr-10 text-text-primary shadow-sm ring-1 ring-inset
            placeholder:text-text-secondary focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6
            disabled:bg-white/50 dark:disabled:bg-white/5 disabled:text-text-secondary disabled:cursor-not-allowed
            ${error ? 'ring-red-300 focus:ring-red-500' : 'ring-white/50 dark:ring-white/20 focus:ring-accent-blue'}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${name}-error` : undefined}
          {...register}
        />

        {/* Show/Hide toggle button */}
        <button
          type="button"
          onClick={togglePasswordVisibility}
          disabled={disabled}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary hover:text-text-primary disabled:cursor-not-allowed"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <p id={`${name}-error`} className="text-sm text-red-600" role="alert">
          {error.message}
        </p>
      )}

      {/* Password strength indicator (only for create forms) */}
      {showStrengthIndicator && !error && (
        <PasswordStrengthIndicator password={value} />
      )}
    </div>
  );
}
