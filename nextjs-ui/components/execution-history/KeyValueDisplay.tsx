/**
 * KeyValueDisplay Component
 *
 * Renders JSON/object data as readable key-value pairs instead of raw JSON.
 * Inspired by LangSmith and Datadog LLM Observability trace UIs.
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

interface KeyValueDisplayProps {
  data: unknown;
  maxDepth?: number;
  currentDepth?: number;
  showCopyButton?: boolean;
}

const COLORS = {
  key: '#7c3aed',        // Purple for keys
  string: '#059669',     // Green for strings
  number: '#2563eb',     // Blue for numbers
  boolean: '#dc2626',    // Red for booleans
  null: '#6b7280',       // Gray for null
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  bgAlt: '#f8fafc',
};

/**
 * Format a value for display
 */
function formatValue(value: unknown): { display: string; color: string; isComplex: boolean } {
  if (value === null) {
    return { display: 'null', color: COLORS.null, isComplex: false };
  }
  if (value === undefined) {
    return { display: 'undefined', color: COLORS.null, isComplex: false };
  }
  if (typeof value === 'string') {
    // Truncate very long strings for preview
    const truncated = value.length > 200 ? value.slice(0, 200) + '...' : value;
    return { display: truncated, color: COLORS.string, isComplex: value.length > 200 };
  }
  if (typeof value === 'number') {
    return { display: String(value), color: COLORS.number, isComplex: false };
  }
  if (typeof value === 'boolean') {
    return { display: String(value), color: COLORS.boolean, isComplex: false };
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { display: '[]', color: COLORS.textSecondary, isComplex: false };
    }
    return { display: `Array(${value.length})`, color: COLORS.textSecondary, isComplex: true };
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return { display: '{}', color: COLORS.textSecondary, isComplex: false };
    }
    return { display: `Object(${keys.length} keys)`, color: COLORS.textSecondary, isComplex: true };
  }
  return { display: String(value), color: COLORS.textPrimary, isComplex: false };
}

/**
 * Render a single key-value pair
 */
function KeyValuePair({
  keyName,
  value,
  maxDepth,
  currentDepth,
}: {
  keyName: string;
  value: unknown;
  maxDepth: number;
  currentDepth: number;
}) {
  const [isExpanded, setIsExpanded] = useState(currentDepth < 2); // Auto-expand first 2 levels
  const formatted = formatValue(value);
  const canExpand = formatted.isComplex && currentDepth < maxDepth;
  const isObject = typeof value === 'object' && value !== null;

  return (
    <div className="py-1.5">
      <div className="flex items-start gap-2">
        {/* Expand/collapse button for complex values */}
        {canExpand ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 hover:bg-slate-100 rounded transition-colors flex-shrink-0 mt-0.5"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" style={{ color: COLORS.textSecondary }} />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" style={{ color: COLORS.textSecondary }} />
            )}
          </button>
        ) : (
          <div className="w-4.5 flex-shrink-0" /> // Spacer for alignment
        )}

        {/* Key name */}
        <span
          className="font-medium text-sm flex-shrink-0"
          style={{ color: COLORS.key }}
        >
          {keyName}:
        </span>

        {/* Value */}
        {!canExpand || !isExpanded ? (
          <span
            className="text-sm break-all"
            style={{ color: formatted.color }}
          >
            {typeof value === 'string' && value.length > 200 ? (
              <span className="whitespace-pre-wrap">{formatted.display}</span>
            ) : (
              formatted.display
            )}
          </span>
        ) : null}
      </div>

      {/* Expanded nested content */}
      {canExpand && isExpanded && isObject && (
        <div className="ml-6 mt-1 pl-3 border-l-2" style={{ borderColor: COLORS.border }}>
          {Array.isArray(value) ? (
            value.map((item, index) => (
              <KeyValuePair
                key={index}
                keyName={`[${index}]`}
                value={item}
                maxDepth={maxDepth}
                currentDepth={currentDepth + 1}
              />
            ))
          ) : (
            Object.entries(value as Record<string, unknown>).map(([k, v]) => (
              <KeyValuePair
                key={k}
                keyName={k}
                value={v}
                maxDepth={maxDepth}
                currentDepth={currentDepth + 1}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Main KeyValueDisplay component
 */
export function KeyValueDisplay({
  data,
  maxDepth = 5,
  currentDepth = 0,
  showCopyButton = true,
}: KeyValueDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Handle primitive values at root
  if (data === null || data === undefined || typeof data !== 'object') {
    const formatted = formatValue(data);
    return (
      <div className="p-3 rounded-lg" style={{ backgroundColor: COLORS.bgAlt, border: `1px solid ${COLORS.border}` }}>
        <span className="text-sm" style={{ color: formatted.color }}>
          {formatted.display}
        </span>
      </div>
    );
  }

  // Handle empty objects/arrays
  const entries = Array.isArray(data)
    ? data.map((item, index) => [`[${index}]`, item] as [string, unknown])
    : Object.entries(data);

  if (entries.length === 0) {
    return (
      <div
        className="p-4 text-center text-sm rounded-lg"
        style={{ backgroundColor: COLORS.bgAlt, border: `1px solid ${COLORS.border}`, color: COLORS.textSecondary }}
      >
        No data
      </div>
    );
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: COLORS.bgAlt, border: `1px solid ${COLORS.border}` }}
    >
      {/* Header with copy button */}
      {showCopyButton && (
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${COLORS.border}` }}
        >
          <span className="text-xs font-medium" style={{ color: COLORS.textSecondary }}>
            {Array.isArray(data) ? `${data.length} items` : `${entries.length} fields`}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-slate-200 transition-colors"
            style={{ color: copied ? '#10b981' : COLORS.textSecondary }}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="px-3 py-2 max-h-96 overflow-y-auto">
        {entries.map(([key, value]) => (
          <KeyValuePair
            key={key}
            keyName={key}
            value={value}
            maxDepth={maxDepth}
            currentDepth={currentDepth}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Inline key-value display for simple data (single line)
 */
export function InlineKeyValue({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span style={{ color: COLORS.textSecondary }}>{label}:</span>
      <span className="font-medium" style={{ color: valueColor || COLORS.textPrimary }}>
        {value}
      </span>
    </div>
  );
}
