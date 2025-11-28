/**
 * HTTP/SSE/WebSocket Connection Configuration Component
 *
 * Form fields for configuring HTTP, SSE, and WebSocket MCP servers
 * (URL, headers, timeout)
 *
 * Supports all network-based transport types:
 * - streamable_http: Modern HTTP MCP for /mcp endpoints
 * - sse: Server-Sent Events for /sse endpoints
 * - websocket: WebSocket transport for ws:// or wss:// endpoints
 * - http_sse: Deprecated alias
 */

'use client';

import React, { useState } from 'react';
import { Control, useWatch } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { Globe } from 'lucide-react';
import type { MCPServerCreateData } from '@/lib/validations';

interface ConnectionConfigProps {
  control: Control<MCPServerCreateData>;
}

export function ConnectionConfig({ control }: ConnectionConfigProps) {
  const transportType = useWatch({ control, name: 'transport_type' });
  // Track raw text input for headers field (allows invalid JSON while typing)
  const [headersText, setHeadersText] = useState<string>('');
  // Track if headers JSON is currently invalid (for visual feedback)
  const [headersJsonError, setHeadersJsonError] = useState<string | null>(null);

  // Helper function to get transport-specific labels
  const getTransportLabel = () => {
    switch (transportType) {
      case 'streamable_http':
        return 'Streamable HTTP Connection';
      case 'sse':
        return 'SSE Connection';
      case 'websocket':
        return 'WebSocket Connection';
      case 'http_sse':
        return 'HTTP+SSE Connection (Deprecated)';
      default:
        return 'Network Connection';
    }
  };

  const getUrlPlaceholder = () => {
    switch (transportType) {
      case 'streamable_http':
        return 'https://api.example.com/mcp';
      case 'sse':
        return 'https://api.example.com/sse';
      case 'websocket':
        return 'wss://api.example.com/ws';
      case 'http_sse':
        return 'https://api.example.com/sse';
      default:
        return 'https://api.example.com/mcp';
    }
  };

  const getUrlHelpText = () => {
    switch (transportType) {
      case 'streamable_http':
        return 'Modern HTTP MCP endpoint URL (typically /mcp path)';
      case 'sse':
        return 'Server-Sent Events endpoint URL (typically /sse path)';
      case 'websocket':
        return 'WebSocket endpoint URL (must start with ws:// or wss://)';
      case 'http_sse':
        return '⚠️ Deprecated: SSE endpoint URL - consider using Streamable HTTP';
      default:
        return 'MCP server endpoint URL';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-accent-blue" />
        <h3 className="text-lg font-semibold text-text-primary">
          {getTransportLabel()}
        </h3>
      </div>

      {/* URL */}
      <FormField
        control={control}
        name="url"
        render={({ field, fieldState }) => (
          <Input
            {...field}
            label="Server URL"
            placeholder={getUrlPlaceholder()}
            error={fieldState.error?.message}
            helpText={getUrlHelpText()}
            required
          />
        )}
      />

      {/* Headers (JSON) */}
      <FormField
        control={control}
        name="headers"
        render={({ field, fieldState }) => {
          // Initialize headersText from field value on first render
          const displayValue = headersText || (
            typeof field.value === 'object' && field.value !== null
              ? JSON.stringify(field.value, null, 2)
              : '{}'
          );

          return (
            <Textarea
              {...field}
              value={displayValue}
              onChange={(e) => {
                const rawText = e.target.value;
                setHeadersText(rawText);

                // Try to parse as JSON
                if (!rawText || rawText.trim() === '') {
                  // Empty input - valid, set to empty object
                  field.onChange({});
                  setHeadersJsonError(null);
                } else {
                  try {
                    const parsed = JSON.parse(rawText);
                    // Validate it's actually an object (not array, null, etc.)
                    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                      field.onChange(parsed);
                      setHeadersJsonError(null);
                    } else {
                      // Valid JSON but not an object - keep previous valid value
                      setHeadersJsonError('Headers must be a JSON object, not an array or primitive');
                    }
                  } catch {
                    // Invalid JSON - keep previous valid value in form state
                    // but show error to user
                    setHeadersJsonError('Invalid JSON format');
                  }
                }
              }}
              onBlur={(e) => {
                // On blur, if there's an error, reset to the valid form value
                if (headersJsonError) {
                  const validValue = typeof field.value === 'object' && field.value !== null
                    ? JSON.stringify(field.value, null, 2)
                    : '{}';
                  setHeadersText(validValue);
                  setHeadersJsonError(null);
                }
                field.onBlur();
              }}
              label="Headers (JSON)"
              placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
              error={headersJsonError || fieldState.error?.message}
              helpText="Optional HTTP headers as JSON object"
              rows={3}
            />
          );
        }}
      />

      {/* Timeout */}
      <FormField
        control={control}
        name="timeout"
        render={({ field, fieldState }) => (
          <Input
            {...field}
            value={field.value ?? 30000}
            onChange={(e) => {
              const value = e.target.value;
              // Convert string to number for Zod validation
              field.onChange(value === '' ? 30000 : parseInt(value, 10));
            }}
            type="number"
            label="Timeout (ms)"
            placeholder="30000"
            error={fieldState.error?.message}
            helpText="Connection timeout in milliseconds (default: 30000)"
            min={1000}
            max={300000}
          />
        )}
      />

      {/* Info Box */}
      <div className="glass-card p-4 bg-blue-50 border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          {getTransportLabel()} Info
        </h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          {transportType === 'streamable_http' && (
            <>
              <li>Modern HTTP MCP protocol for stateless communication</li>
              <li>Used by Exa AI, Brave Search, and other modern MCP servers</li>
              <li>Endpoints typically use /mcp path</li>
              <li>Recommended for most HTTP-based MCP servers</li>
            </>
          )}
          {transportType === 'sse' && (
            <>
              <li>Server-Sent Events for persistent streaming connections</li>
              <li>Legacy protocol for older MCP servers</li>
              <li>Endpoints typically use /sse path</li>
              <li>Maintains long-lived connection for real-time updates</li>
            </>
          )}
          {transportType === 'websocket' && (
            <>
              <li>Full-duplex WebSocket communication</li>
              <li>Bidirectional real-time messaging</li>
              <li>URL must start with ws:// or wss://</li>
              <li>Best for high-frequency, low-latency interactions</li>
            </>
          )}
          {transportType === 'http_sse' && (
            <>
              <li className="text-amber-700">⚠️ This transport type is deprecated</li>
              <li>Consider migrating to Streamable HTTP or SSE</li>
              <li>Uses Server-Sent Events (SSE) protocol</li>
              <li>Supported for backward compatibility</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
