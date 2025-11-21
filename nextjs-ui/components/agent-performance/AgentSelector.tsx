/**
 * Agent Selector Component
 * Dropdown for selecting an agent to view performance metrics
 * Refactored to use native Select component
 */

'use client';

import { Select } from '@/components/ui/Select';
import { useAgents } from '@/hooks/useAgents';

interface AgentSelectorProps {
  value: string | null;
  onChange: (agentId: string) => void;
}

export function AgentSelector({ value, onChange }: AgentSelectorProps) {
  const { data: agents, isLoading } = useAgents();

  const options = agents?.map((agent: { id: string; name: string }) => ({
    value: agent.id,
    label: agent.name,
  })) || [];

  return (
    <Select
      label="Select Agent"
      placeholder={isLoading ? 'Loading agents...' : 'Choose an agent'}
      options={options}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={isLoading}
    />
  );
}
