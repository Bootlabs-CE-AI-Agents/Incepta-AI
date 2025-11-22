/**
 * MCP Tool Discovery Container
 *
 * Main container for unified tool discovery UI (OpenAPI + MCP tools).
 * Includes tabs, search, filters, and tool selection management.
 * Story 0.4.1: MCP Tool Discovery UI - Complete implementation
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useUnifiedTools } from '@/hooks/useUnifiedTools';
import { useMCPServerHealth } from '@/hooks/useMCPServerHealth';
import ToolCheckbox from './ToolCheckbox';

interface MCPToolDiscoveryProps {
  /** Tenant ID for fetching tools */
  tenantId: string;
  /** Currently selected tool IDs */
  selectedToolIds: Set<string>;
  /** Callback when tool selection changes */
  onSelectionChange: (selectedIds: Set<string>) => void;
}

type TabId = 'all' | 'openapi' | 'mcp';

export default function MCPToolDiscovery({
  tenantId,
  selectedToolIds,
  onSelectionChange,
}: MCPToolDiscoveryProps) {
  // Fetch tools and health status
  const { data: tools = [], isLoading: toolsLoading } = useUnifiedTools(tenantId);
  const { data: healthStatus = {} } = useMCPServerHealth(tenantId);

  // Local state
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServer, setSelectedServer] = useState<string>('');

  // Filter tools by tab
  const filteredByTab = useMemo(() => {
    if (activeTab === 'all') return tools;
    return tools.filter(t => t.source_type === activeTab);
  }, [tools, activeTab]);

  // Filter by search query
  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return filteredByTab;
    const query = searchQuery.toLowerCase();
    return filteredByTab.filter(
      t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        (t.mcp_server && t.mcp_server.toLowerCase().includes(query))
    );
  }, [filteredByTab, searchQuery]);

  // Filter by MCP server (only for MCP tab)
  const filteredTools = useMemo(() => {
    if (!selectedServer || activeTab !== 'mcp') return filteredBySearch;
    return filteredBySearch.filter(t => t.mcp_server === selectedServer);
  }, [filteredBySearch, selectedServer, activeTab]);

  // Get unique MCP server names for filter
  const mcpServers = useMemo(() => {
    const servers = new Set<string>();
    tools.forEach(t => {
      if (t.source_type === 'mcp' && t.mcp_server) {
        servers.add(t.mcp_server);
      }
    });
    return Array.from(servers).sort();
  }, [tools]);

  // Tool counts by type
  const counts = useMemo(() => {
    return {
      all: tools.length,
      openapi: tools.filter(t => t.source_type === 'openapi').length,
      mcp: tools.filter(t => t.source_type === 'mcp').length,
    };
  }, [tools]);

  // Selection handlers
  const handleToggleTool = (toolId: string) => {
    const newSelection = new Set(selectedToolIds);
    if (newSelection.has(toolId)) {
      newSelection.delete(toolId);
    } else {
      newSelection.add(toolId);
    }
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    const visibleIds = new Set(filteredTools.map(t => t.id));
    const combined = new Set([
      ...Array.from(selectedToolIds),
      ...Array.from(visibleIds)
    ]);
    onSelectionChange(combined);
  };

  const handleClearAll = () => {
    const visibleIds = new Set(filteredTools.map(t => t.id));
    const newSelection = new Set(
      Array.from(selectedToolIds).filter(id => !visibleIds.has(id))
    );
    onSelectionChange(newSelection);
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {[
          { id: 'all' as const, label: '📋 All Tools', count: counts.all },
          { id: 'openapi' as const, label: '🔧 OpenAPI', count: counts.openapi },
          { id: 'mcp' as const, label: '🔌 MCP Tools', count: counts.mcp },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* MCP Server filter (only on MCP tab) */}
        {activeTab === 'mcp' && mcpServers.length > 0 && (
          <select
            value={selectedServer}
            onChange={e => setSelectedServer(e.target.value)}
            className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Servers ({counts.mcp})</option>
            {mcpServers.map(server => {
              const serverTools = tools.filter(
                t => t.source_type === 'mcp' && t.mcp_server === server
              );
              return (
                <option key={server} value={server}>
                  {server} ({serverTools.length})
                </option>
              );
            })}
          </select>
        )}

        {/* Batch actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            disabled={filteredTools.length === 0}
            className="px-3 py-2 text-sm font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Select All
          </button>
          <button
            onClick={handleClearAll}
            disabled={filteredTools.length === 0}
            className="px-3 py-2 text-sm font-medium bg-white/5 text-text-secondary rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Tool list */}
      <div className="space-y-2">
        {toolsLoading ? (
          <div className="text-center py-8 text-text-secondary">Loading tools...</div>
        ) : filteredTools.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            {searchQuery || selectedServer
              ? 'No tools match your filters'
              : 'No tools available'}
          </div>
        ) : (
          filteredTools.map(tool => (
            <ToolCheckbox
              key={tool.id}
              tool={tool}
              healthStatus={healthStatus}
              isSelected={selectedToolIds.has(tool.id)}
              onToggle={handleToggleTool}
            />
          ))
        )}
      </div>

      {/* Selection summary */}
      {selectedToolIds.size > 0 && (
        <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm font-medium text-text-primary">
            {selectedToolIds.size} tool{selectedToolIds.size !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}
    </div>
  );
}
