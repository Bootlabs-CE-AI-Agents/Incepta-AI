/**
 * Prompt Editor Types
 *
 * TypeScript types for the System Prompt Editor feature.
 * Story 0.4.2: System Prompt Editor Part 1 - Type definitions
 */

/**
 * Variable placeholder in prompt templates
 *
 * Format: {{variable_name}}
 * Example: "Hello {{user_name}}, you are a {{role}}"
 */
export interface PromptVariable {
  /** Variable name (without braces) */
  name: string;
  /** Optional description of what this variable represents */
  description?: string;
  /** Default value if not provided */
  defaultValue?: string;
  /** Example value for preview */
  exampleValue?: string;
  /** Whether this variable is required */
  required: boolean;
}

/**
 * Prompt template for reusable system prompts
 */
export interface PromptTemplate {
  /** Unique template ID */
  id: string;
  /** Template name */
  name: string;
  /** Template description */
  description: string;
  /** Category for organization */
  category: 'conversational' | 'task-oriented' | 'analytical' | 'creative' | 'custom';
  /** Template content with variable placeholders */
  content: string;
  /** Variables used in this template */
  variables: PromptVariable[];
  /** Template tags for search/filter */
  tags: string[];
  /** Author/creator */
  author?: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last modified timestamp */
  updatedAt: string;
  /** Number of times this template was used */
  usageCount: number;
  /** Whether this is a system/built-in template */
  isSystem: boolean;
}

/**
 * Prompt validation result
 */
export interface PromptValidation {
  /** Whether the prompt is valid */
  isValid: boolean;
  /** List of validation errors */
  errors: string[];
  /** List of validation warnings */
  warnings: string[];
  /** Missing required variables */
  missingVariables: string[];
  /** Unused variables */
  unusedVariables: string[];
}

/**
 * Token count estimate
 */
export interface TokenCount {
  /** Estimated token count */
  count: number;
  /** Character count */
  characters: number;
  /** Word count */
  words: number;
  /** Model used for estimation */
  model: string;
  /** Cost estimate (if available) */
  estimatedCost?: number;
}

/**
 * Prompt preview configuration
 */
export interface PromptPreviewConfig {
  /** Variable values for preview */
  variableValues: Record<string, string>;
  /** Whether to highlight variables in preview */
  highlightVariables: boolean;
  /** Whether to show token count */
  showTokenCount: boolean;
}

/**
 * Syntax highlighting theme
 */
export type SyntaxTheme = 'light' | 'dark' | 'github' | 'monokai';

/**
 * Editor settings
 */
export interface EditorSettings {
  /** Syntax highlighting theme */
  theme: SyntaxTheme;
  /** Font size */
  fontSize: number;
  /** Line numbers visibility */
  showLineNumbers: boolean;
  /** Line wrap */
  lineWrap: boolean;
  /** Auto-save enabled */
  autoSave: boolean;
  /** Auto-save interval in milliseconds */
  autoSaveInterval: number;
}

/**
 * Prompt history entry
 */
export interface PromptHistoryEntry {
  /** Unique entry ID */
  id: string;
  /** Prompt content */
  content: string;
  /** Timestamp */
  timestamp: string;
  /** Optional label/description */
  label?: string;
  /** Token count at this version */
  tokenCount?: number;
}

/**
 * Prompt Version Response from API
 * (matches backend PromptVersionResponse schema)
 */
export interface PromptVersionResponse {
  id: string;
  agent_id: string;
  version: number;
  description?: string;
  created_by?: string;
  created_at: string;
  is_current: boolean;
}

/**
 * Prompt Version Detail from API
 * (matches backend PromptVersionDetail schema - includes full prompt_text)
 */
export interface PromptVersionDetail {
  id: string;
  agent_id: string;
  prompt_text: string;
  version: number;
  description?: string;
  created_by?: string;
  created_at: string;
  is_current: boolean;
}

/**
 * Request to revert to a version
 */
export interface RevertVersionRequest {
  version_id: string;
  created_by?: string;
}
