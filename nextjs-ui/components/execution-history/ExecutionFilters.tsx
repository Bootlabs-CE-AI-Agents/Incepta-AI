/**
 * Execution Filters Component
 *
 * Advanced filter form for execution history with date range,
 * status, agent selection, and search input
 */

import { useState, useEffect } from 'react';
import { Search, Calendar, Filter, X } from 'lucide-react';
import { useAgentOptions, type ExecutionFilters, type ExecutionStatus } from '@/lib/hooks/useExecutions';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

interface ExecutionFiltersProps {
  filters: ExecutionFilters;
  onFiltersChange: (filters: ExecutionFilters) => void;
}

const STATUS_OPTIONS: { value: ExecutionStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function ExecutionFilters({ filters, onFiltersChange }: ExecutionFiltersProps) {
  const { data: agentOptions = [] } = useAgentOptions();

  // Local state for debounced search
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Debounce search input (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ ...filters, search: searchInput, page: 1 });
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handleStatusChange = (statusValue: string) => {
    let newStatus: ExecutionStatus[] = [...(filters.status || [])];
    const status = statusValue as ExecutionStatus;

    if (newStatus.includes(status)) {
      newStatus = newStatus.filter((s) => s !== status);
    } else {
      newStatus.push(status);
    }

    onFiltersChange({ ...filters, status: newStatus, page: 1 });
  };

  const handleAgentChange = (value: string) => {
    onFiltersChange({ ...filters, agent_id: value || undefined, page: 1 });
  };

  const handleDateChange = (field: 'date_from' | 'date_to', value: string) => {
    onFiltersChange({ ...filters, [field]: value || undefined, page: 1 });
  };

  const handleReset = () => {
    setSearchInput('');
    onFiltersChange({
      page: 1,
      limit: filters.limit,
    });
  };

  const hasActiveFilters = !!(
    filters.search ||
    filters.date_from ||
    filters.date_to ||
    (filters.status && filters.status.length > 0) ||
    filters.agent_id
  );

  return (
    <div className="space-y-4 rounded-lg border border-white/50 dark:border-white/20 bg-white/50 dark:bg-white/5 p-4 glass-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-text-secondary" />
          <h3 className="text-sm font-semibold text-text-primary dark:text-white">Filters</h3>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-sm text-text-secondary hover:text-text-primary dark:text-white/60 dark:hover:text-white"
          >
            <X className="h-4 w-4 mr-1" />
            Reset
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input
            type="text"
            placeholder="Search executions..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Agent Filter */}
        <Select
          value={filters.agent_id || ''}
          onChange={(e) => handleAgentChange(e.target.value)}
          options={[
            { value: '', label: 'All Agents' },
            ...agentOptions.map((agent) => ({
              value: agent.id,
              label: agent.name,
            })),
          ]}
        />

        {/* Date From */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
          <Input
            type="datetime-local"
            placeholder="From date"
            value={filters.date_from ? filters.date_from.slice(0, 16) : ''}
            onChange={(e) => handleDateChange('date_from', e.target.value ? new Date(e.target.value).toISOString() : '')}
            className="pl-10"
          />
        </div>

        {/* Date To */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
          <Input
            type="datetime-local"
            placeholder="To date"
            value={filters.date_to ? filters.date_to.slice(0, 16) : ''}
            onChange={(e) => handleDateChange('date_to', e.target.value ? new Date(e.target.value).toISOString() : '')}
            className="pl-10"
          />
        </div>
      </div>

      {/* Status Checkboxes */}
      <div>
        <label className="text-xs font-medium text-text-primary dark:text-white/80 mb-2 block">
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => {
            const isActive = filters.status?.includes(option.value) ?? false;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleStatusChange(option.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-accent-blue text-white'
                    : 'bg-white/50 text-text-primary hover:bg-white/70 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/20'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
