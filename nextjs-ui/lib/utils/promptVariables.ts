/**
 * Prompt Variable Utilities
 *
 * Functions for extracting and managing variables in prompt templates.
 * Story 0.4.2: System Prompt Editor Part 1 - Variable management
 */

import type { PromptVariable, PromptValidation } from '@/types/prompts';

/**
 * Regular expression to match variable placeholders
 *
 * Matches: {{variable_name}} or {{ variable_name }}
 * Captures the variable name
 */
const VARIABLE_REGEX = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

/**
 * Extract variables from prompt text
 *
 * Finds all {{variable_name}} placeholders and returns unique variable names.
 *
 * @param text - Prompt text to analyze
 * @returns Array of unique variable names (without braces)
 *
 * @example
 * extractVariables("Hello {{user_name}}, you are a {{role}}")
 * // ["user_name", "role"]
 */
export function extractVariables(text: string): string[] {
  const matches = Array.from(text.matchAll(VARIABLE_REGEX));
  const variables = matches.map(match => match[1]);
  return Array.from(new Set(variables)); // Remove duplicates
}

/**
 * Replace variables in prompt text with values
 *
 * @param text - Prompt text with variables
 * @param values - Variable name -> value mapping
 * @param options - Replacement options
 * @returns Text with variables replaced
 *
 * @example
 * substituteVariables(
 *   "Hello {{user_name}}, you are a {{role}}",
 *   { user_name: "Alice", role: "assistant" }
 * )
 * // "Hello Alice, you are a assistant"
 */
export function substituteVariables(
  text: string,
  values: Record<string, string>,
  options: {
    /** Use default value for missing variables */
    useDefaults?: boolean;
    /** Default values map */
    defaults?: Record<string, string>;
    /** Keep placeholder if value missing */
    keepMissing?: boolean;
  } = {}
): string {
  return text.replace(VARIABLE_REGEX, (match, varName) => {
    // Check if value is provided
    if (values[varName] !== undefined) {
      return values[varName];
    }

    // Try default value
    if (options.useDefaults && options.defaults?.[varName] !== undefined) {
      return options.defaults[varName];
    }

    // Keep placeholder or replace with empty
    return options.keepMissing ? match : '';
  });
}

/**
 * Validate prompt variables
 *
 * Checks for missing required variables, unused variables, and other issues.
 *
 * @param text - Prompt text
 * @param declaredVariables - Variables that should be present
 * @param providedValues - Values provided for substitution
 * @returns Validation result
 *
 * @example
 * validatePrompt(
 *   "Hello {{user_name}}",
 *   [{ name: "user_name", required: true }, { name: "role", required: false }],
 *   { user_name: "Alice" }
 * )
 * // { isValid: true, errors: [], warnings: ["Variable 'role' declared but not used"], ... }
 */
export function validatePrompt(
  text: string,
  declaredVariables: PromptVariable[],
  providedValues: Record<string, string> = {}
): PromptValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const extractedVars = extractVariables(text);
  const missingVariables: string[] = [];
  const unusedVariables: string[] = [];

  // Check for required variables that are missing values
  for (const declaredVar of declaredVariables) {
    // Check if variable is used in text
    const isUsed = extractedVars.includes(declaredVar.name);

    if (!isUsed) {
      unusedVariables.push(declaredVar.name);
      warnings.push(`Variable '${declaredVar.name}' declared but not used in prompt`);
      continue;
    }

    // Check if required variable has a value
    if (declaredVar.required && !providedValues[declaredVar.name] && !declaredVar.defaultValue) {
      missingVariables.push(declaredVar.name);
      errors.push(`Required variable '${declaredVar.name}' is missing a value`);
    }
  }

  // Check for variables used in text but not declared
  const declaredNames = new Set(declaredVariables.map(v => v.name));
  for (const extractedVar of extractedVars) {
    if (!declaredNames.has(extractedVar)) {
      warnings.push(`Variable '${extractedVar}' used in prompt but not declared`);
    }
  }

  // Check for empty prompt
  if (text.trim().length === 0) {
    errors.push('Prompt cannot be empty');
  }

  // Check for very short prompt (potential issue)
  if (text.trim().length > 0 && text.trim().length < 10) {
    warnings.push('Prompt is very short (< 10 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    missingVariables,
    unusedVariables,
  };
}

/**
 * Create prompt variables from extracted names
 *
 * Generates PromptVariable objects from variable names found in text.
 * Useful for auto-detecting variables in existing prompts.
 *
 * @param text - Prompt text to analyze
 * @returns Array of PromptVariable objects
 *
 * @example
 * createVariablesFromText("Hello {{user_name}}, you are a {{role}}")
 * // [
 * //   { name: "user_name", required: true, ... },
 * //   { name: "role", required: true, ... }
 * // ]
 */
export function createVariablesFromText(text: string): PromptVariable[] {
  const varNames = extractVariables(text);

  return varNames.map(name => ({
    name,
    description: `Auto-detected variable: ${name}`,
    required: true, // Assume required by default
    exampleValue: `example_${name}`,
  }));
}

/**
 * Format variable for display in UI
 *
 * @param variable - PromptVariable object
 * @returns Formatted string for display
 *
 * @example
 * formatVariable({ name: "user_name", required: true, description: "User's name" })
 * // "{{user_name}} * - User's name"
 */
export function formatVariable(variable: PromptVariable): string {
  const parts: string[] = [];

  // Variable name with braces
  parts.push(`{{${variable.name}}}`);

  // Required indicator
  if (variable.required) {
    parts.push('*');
  }

  // Description
  if (variable.description) {
    parts.push(`- ${variable.description}`);
  }

  return parts.join(' ');
}

/**
 * Highlight variables in text for syntax highlighting
 *
 * Returns text with variable placeholders marked for highlighting.
 *
 * @param text - Prompt text
 * @returns HTML string with highlighted variables
 *
 * @example
 * highlightVariables("Hello {{user_name}}")
 * // 'Hello <span class="variable">{{user_name}}</span>'
 */
export function highlightVariables(text: string): string {
  return text.replace(
    VARIABLE_REGEX,
    '<span class="prompt-variable">$&</span>'
  );
}
