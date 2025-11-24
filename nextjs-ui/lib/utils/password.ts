/**
 * Password strength calculation utility
 *
 * Calculates strength based on 5 criteria:
 * 1. Length >= 8 characters
 * 2. Contains uppercase letter
 * 3. Contains lowercase letter
 * 4. Contains number
 * 5. Contains special character
 *
 * Score mapping:
 * - 0-2: Weak (red)
 * - 3-4: Medium (yellow)
 * - 5: Strong (green)
 *
 * Used in PasswordStrengthIndicator component (AC-3)
 */

export interface PasswordStrength {
  score: number; // 0-5
  label: 'Weak' | 'Medium' | 'Strong';
  color: 'red' | 'yellow' | 'green';
  percentage: number; // 0-100 for progress bar
}

/**
 * Calculate password strength
 *
 * @param password - Password string to evaluate
 * @returns PasswordStrength object with score, label, color, percentage
 *
 * @example
 * calculatePasswordStrength('abc') // { score: 1, label: 'Weak', color: 'red', percentage: 20 }
 * calculatePasswordStrength('Abc123!') // { score: 4, label: 'Medium', color: 'yellow', percentage: 80 }
 * calculatePasswordStrength('SecurePass123!') // { score: 5, label: 'Strong', color: 'green', percentage: 100 }
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;

  // Criteria 1: Length >= 8
  if (password.length >= 8) score++;

  // Criteria 2: Uppercase letter
  if (/[A-Z]/.test(password)) score++;

  // Criteria 3: Lowercase letter
  if (/[a-z]/.test(password)) score++;

  // Criteria 4: Number
  if (/[0-9]/.test(password)) score++;

  // Criteria 5: Special character
  if (/[!@#$%^&*]/.test(password)) score++;

  // Determine label and color
  let label: PasswordStrength['label'];
  let color: PasswordStrength['color'];

  if (score <= 2) {
    label = 'Weak';
    color = 'red';
  } else if (score === 3 || score === 4) {
    label = 'Medium';
    color = 'yellow';
  } else {
    label = 'Strong';
    color = 'green';
  }

  // Calculate percentage (0-100)
  const percentage = (score / 5) * 100;

  return { score, label, color, percentage };
}
