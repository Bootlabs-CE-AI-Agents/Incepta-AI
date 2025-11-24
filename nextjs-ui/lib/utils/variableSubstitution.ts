/**
 * Variable Detection and Substitution Utilities
 * Detects {{variable}} patterns and performs substitution
 *
 * Story: nextjs-story-29-prompts-llm-test
 * AC: AC-7 (Variable Substitution Preview)
 */

// Regex pattern from Story 27 (consistent variable handling)
const VARIABLE_PATTERN = /{{([^}]+)}}/g;

/**
 * Extract all unique variables from text
 * Returns array of variable names (without braces)
 */
export function extractVariables(text: string): string[] {
  const variables = new Set<string>();
  let match;

  while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
    variables.add(match[1].trim());
  }

  // Reset regex state
  VARIABLE_PATTERN.lastIndex = 0;

  return Array.from(variables);
}

/**
 * Substitute variables with provided values
 * Returns new text with {{variable}} replaced
 */
export function substituteVariables(
  text: string,
  values: Record<string, string>
): string {
  return text.replace(VARIABLE_PATTERN, (match, variableName) => {
    const trimmedName = variableName.trim();
    return values[trimmedName] !== undefined ? values[trimmedName] : match;
  });
}

/**
 * Get default values for common variable names
 */
export function getDefaultVariableValues(
  variableNames: string[]
): Record<string, string> {
  const defaults: Record<string, string> = {};

  for (const name of variableNames) {
    const lowerName = name.toLowerCase();

    // Provide sensible defaults based on variable name
    if (lowerName.includes('ticket') && lowerName.includes('id')) {
      defaults[name] = 'SAMPLE-123';
    } else if (lowerName.includes('tenant')) {
      defaults[name] = 'Test Tenant';
    } else if (lowerName.includes('user') && lowerName.includes('name')) {
      defaults[name] = 'John Doe';
    } else if (lowerName.includes('email')) {
      defaults[name] = 'user@example.com';
    } else if (lowerName.includes('date')) {
      defaults[name] = new Date().toISOString().split('T')[0];
    } else if (lowerName.includes('time')) {
      defaults[name] = new Date().toLocaleTimeString();
    } else {
      defaults[name] = `[${name}]`;
    }
  }

  return defaults;
}

/**
 * Validate that all variables have values
 * Returns array of missing variable names
 */
export function getMissingVariables(
  variableNames: string[],
  values: Record<string, string>
): string[] {
  return variableNames.filter(
    (name) => values[name] === undefined || values[name].trim() === ''
  );
}
