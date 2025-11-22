/**
 * Tool Checkbox Component
 *
 * Individual tool item with checkbox, icon, description, and health badge.
 * Story 0.4.1: MCP Tool Discovery UI - Tool selection item
 */

'use client';

import React from 'react';
import HealthBadge from './HealthBadge';
import type { UnifiedTool, HealthStatusMap } from '@/types/tools';

interface ToolCheckboxProps {
  /** Tool data */
  tool: UnifiedTool;
  /** Health status map for MCP servers */
  healthStatus: HealthStatusMap;
  /** Whether this tool is selected */
  isSelected: boolean;
  /** Callback when selection changes */
  onToggle: (toolId: string) => void;
}

export default function ToolCheckbox({
  tool,
  healthStatus,
  isSelected,
  onToggle,
}: ToolCheckboxProps) {
  // Extract server ID from MCP tool (format: "server_id" in tool.mcp_server field)
  // Note: Backend stores mcp_server_name, not ID. For health lookup, we'll use the name.
  const serverHealth =
    tool.source_type === 'mcp' && tool.mcp_server
      ? Object.values(healthStatus).find(h => h.server === tool.mcp_server)
      : undefined;

  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-white/10 hover:border-white/20 hover:bg-white/5'
      }`}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggle(tool.id)}
        className="mt-0.5 h-4 w-4 rounded border-white/20 bg-surface text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
      />

      {/* Tool info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1">
          {/* Icon + Name */}
          <span className="text-base">{tool.icon}</span>
          <span className="font-medium text-text-primary">{tool.name}</span>

          {/* Source type badge */}
          <span
            className={`px-1.5 py-0.5 text-xs font-medium rounded ${
              tool.source_type === 'mcp'
                ? 'bg-blue-500/10 text-blue-400'
                : 'bg-purple-500/10 text-purple-400'
            }`}
          >
            {tool.source_type === 'mcp' ? '🔌 MCP' : '🔧 OpenAPI'}
          </span>

          {/* Health badge (MCP tools only) */}
          {tool.source_type === 'mcp' && serverHealth && (
            <HealthBadge health={serverHealth} />
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-text-secondary line-clamp-2">{tool.description}</p>

        {/* Server name (MCP tools only) */}
        {tool.source_type === 'mcp' && tool.mcp_server && (
          <p className="text-xs text-text-tertiary mt-1">Server: {tool.mcp_server}</p>
        )}
      </div>
    </label>
  );
}
