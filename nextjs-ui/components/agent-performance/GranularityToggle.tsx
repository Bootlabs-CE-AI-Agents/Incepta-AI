'use client';

import { Tab, TabGroup, TabList } from '@headlessui/react';
import type { TrendGranularity } from '@/types/agent-performance';

interface GranularityToggleProps {
  value: TrendGranularity;
  onChange: (value: TrendGranularity) => void;
}

const GRANULARITIES: TrendGranularity[] = ['hourly', 'daily'];

/**
 * Toggle between hourly and daily granularity for trend charts.
 */
export function GranularityToggle({
  value,
  onChange,
}: GranularityToggleProps) {
  const selectedIndex = GRANULARITIES.indexOf(value);

  const handleChange = (index: number) => {
    onChange(GRANULARITIES[index]);
  };

  return (
    <TabGroup selectedIndex={selectedIndex} onChange={handleChange}>
      <TabList className="flex inline-flex bg-white/50 dark:bg-white/5 p-1 rounded-xl space-x-1">
        {GRANULARITIES.map((granularity) => (
          <Tab
            key={granularity}
            className={({ selected }) =>
              `rounded-lg px-4 py-2.5 text-sm font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                selected
                  ? 'bg-white dark:bg-white/10 text-primary dark:text-primary shadow'
                  : 'text-text-secondary dark:text-text-secondary hover:bg-white/50 dark:hover:bg-white/10'
              }`
            }
          >
            {granularity.charAt(0).toUpperCase() + granularity.slice(1)}
          </Tab>
        ))}
      </TabList>
    </TabGroup>
  );
}
