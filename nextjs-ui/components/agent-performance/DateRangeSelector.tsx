/**
 * Date Range Selector Component
 * Tabs for preset date ranges (Last 7/30 days, Custom)
 * Refactored to use Headless UI Tabs component
 */

'use client';

import { Tabs, TabItem } from '@/components/ui/Tabs';
import { Calendar } from 'lucide-react';

type DateRangePreset = 'last_7' | 'last_30' | 'custom';

interface DateRangeSelectorProps {
  value: DateRangePreset;
  onChange: (preset: DateRangePreset) => void;
  onDateChange?: (startDate: string, endDate: string) => void;
}

export function DateRangeSelector({ value, onChange, onDateChange }: DateRangeSelectorProps) {
  const presets: DateRangePreset[] = ['last_7', 'last_30', 'custom'];

  const tabs: TabItem[] = presets.map((preset) => ({
    key: preset,
    label: preset === 'last_7' ? 'Last 7 Days' : preset === 'last_30' ? 'Last 30 Days' : 'Custom',
    icon: preset === 'custom' ? <Calendar className="h-4 w-4" /> : undefined,
    content: (
      <div className="py-2">
        {preset === 'custom' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                onChange={(e) => {
                  if (onDateChange) {
                    const endDate = new Date().toISOString().split('T')[0];
                    onDateChange(e.target.value, endDate);
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                defaultValue={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  if (onDateChange) {
                    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                    onDateChange(startDate, e.target.value);
                  }
                }}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            Showing data for the {preset === 'last_7' ? 'last 7 days' : 'last 30 days'}
          </p>
        )}
      </div>
    ),
  }));

  const selectedIndex = presets.indexOf(value);

  return (
    <Tabs
      tabs={tabs}
      selectedIndex={selectedIndex}
      onChange={(index) => onChange(presets[index])}
      variant="pills"
      fullWidth={false}
    />
  );
}
