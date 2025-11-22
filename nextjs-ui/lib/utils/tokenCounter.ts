/**
 * Token Counter Utility
 *
 * Estimates token count for LLM prompts using character-based approximation.
 * Story 0.4.2: System Prompt Editor Part 1 - Token counting
 *
 * Note: This is an approximation. For exact counts, integration with
 * tiktoken or model-specific tokenizers would be needed.
 */

import type { TokenCount } from '@/types/prompts';

/**
 * Average tokens per character for different model families
 *
 * Based on empirical analysis:
 * - GPT models: ~1 token per 4 characters (0.25)
 * - Claude models: ~1 token per 3.5 characters (0.28)
 * - Other models: ~1 token per 4 characters (conservative estimate)
 */
const TOKENS_PER_CHAR: Record<string, number> = {
  'gpt-4': 0.25,
  'gpt-3.5': 0.25,
  'claude-3': 0.28,
  'claude-2': 0.28,
  default: 0.25,
};

/**
 * Estimate cost per 1K tokens (USD)
 *
 * Approximate costs as of 2025:
 * - GPT-4: $0.03/1K input tokens
 * - GPT-3.5: $0.0015/1K input tokens
 * - Claude-3 Opus: $0.015/1K input tokens
 * - Claude-3 Sonnet: $0.003/1K input tokens
 */
const COST_PER_1K_TOKENS: Record<string, number> = {
  'gpt-4': 0.03,
  'gpt-3.5-turbo': 0.0015,
  'claude-3-opus': 0.015,
  'claude-3-sonnet': 0.003,
  'claude-3-haiku': 0.00025,
  default: 0.01, // Conservative estimate
};

/**
 * Get model family from full model name
 *
 * @param model - Full model name (e.g., "gpt-4-turbo", "claude-3-opus-20240229")
 * @returns Model family key
 */
function getModelFamily(model: string): string {
  const lowerModel = model.toLowerCase();

  if (lowerModel.includes('gpt-4')) return 'gpt-4';
  if (lowerModel.includes('gpt-3.5')) return 'gpt-3.5';
  if (lowerModel.includes('claude-3')) return 'claude-3';
  if (lowerModel.includes('claude-2')) return 'claude-2';

  return 'default';
}

/**
 * Count words in text
 *
 * @param text - Input text
 * @returns Word count
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Estimate token count for given text
 *
 * Uses character-based approximation with model-specific ratios.
 * For production use, consider integrating with tiktoken or model-specific tokenizers.
 *
 * @param text - Input text to count tokens for
 * @param model - Optional model name for accurate estimation
 * @returns Token count estimate
 *
 * @example
 * const count = estimateTokenCount("You are a helpful assistant.", "gpt-4");
 * console.log(count.count); // ~7 tokens
 */
export function estimateTokenCount(
  text: string,
  model: string = 'default'
): TokenCount {
  const characters = text.length;
  const words = countWords(text);
  const modelFamily = getModelFamily(model);
  const tokensPerChar = TOKENS_PER_CHAR[modelFamily] || TOKENS_PER_CHAR.default;

  // Estimate token count (rounded up)
  const count = Math.ceil(characters * tokensPerChar);

  // Estimate cost (input tokens only)
  const costRate = COST_PER_1K_TOKENS[model] || COST_PER_1K_TOKENS.default;
  const estimatedCost = (count / 1000) * costRate;

  return {
    count,
    characters,
    words,
    model,
    estimatedCost: Math.round(estimatedCost * 100000) / 100000, // Round to 5 decimal places
  };
}

/**
 * Format token count for display
 *
 * @param tokenCount - Token count object
 * @returns Formatted string
 *
 * @example
 * formatTokenCount({ count: 1500, characters: 6000, words: 1000, model: "gpt-4" })
 * // "1,500 tokens (~1,000 words, ~$0.045)"
 */
export function formatTokenCount(tokenCount: TokenCount): string {
  const parts: string[] = [];

  // Format token count with commas
  parts.push(`${tokenCount.count.toLocaleString()} token${tokenCount.count !== 1 ? 's' : ''}`);

  // Add word count
  if (tokenCount.words > 0) {
    parts.push(`~${tokenCount.words.toLocaleString()} word${tokenCount.words !== 1 ? 's' : ''}`);
  }

  // Add cost estimate if available
  if (tokenCount.estimatedCost !== undefined && tokenCount.estimatedCost > 0) {
    parts.push(`~$${tokenCount.estimatedCost.toFixed(5)}`);
  }

  return parts.join(', ');
}

/**
 * Check if token count exceeds a threshold
 *
 * @param tokenCount - Token count object
 * @param threshold - Maximum allowed tokens
 * @returns Whether threshold is exceeded
 */
export function exceedsTokenLimit(tokenCount: TokenCount, threshold: number): boolean {
  return tokenCount.count > threshold;
}

/**
 * Get token limit warning level
 *
 * @param tokenCount - Token count object
 * @param limit - Maximum token limit
 * @returns Warning level: 'safe' | 'warning' | 'danger'
 */
export function getTokenLimitWarning(
  tokenCount: TokenCount,
  limit: number
): 'safe' | 'warning' | 'danger' {
  const percentage = (tokenCount.count / limit) * 100;

  if (percentage >= 90) return 'danger';
  if (percentage >= 75) return 'warning';
  return 'safe';
}
