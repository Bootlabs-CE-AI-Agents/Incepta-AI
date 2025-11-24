'use client';

/**
 * Worker Configuration Details Component (Story 21 AC-4)
 *
 * Displays worker system information and configuration in a clean grid layout.
 */

import React from 'react';
import type { WorkerConfig } from '@/lib/api/workers';

interface WorkerConfigDetailsProps {
  config: WorkerConfig | null;
}

export function WorkerConfigDetails({ config }: WorkerConfigDetailsProps) {
  if (!config) {
    return (
      <div className="text-sm text-gray-400">
        Worker configuration unavailable
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-white">Worker Configuration</h3>
      
      {/* System Information */}
      <div>
        <h4 className="text-xs font-medium text-gray-400 mb-2">System Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ConfigItem label="OS" value={config.os_name} />
          <ConfigItem label="Python Version" value={config.python_version} />
          <ConfigItem label="Celery Version" value={config.celery_version} />
        </div>
      </div>

      {/* Worker Configuration */}
      <div>
        <h4 className="text-xs font-medium text-gray-400 mb-2">Worker Settings</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ConfigItem 
            label="Connected Queues" 
            value={config.queues.join(', ')} 
          />
          <ConfigItem 
            label="Max Tasks Per Child" 
            value={config.max_tasks_per_child !== null ? config.max_tasks_per_child.toString() : 'Unlimited'} 
          />
          <ConfigItem 
            label="Concurrency" 
            value={`${config.concurrency} workers`} 
          />
          <ConfigItem 
            label="Pool Type" 
            value={config.pool_type} 
          />
        </div>
      </div>
    </div>
  );
}

interface ConfigItemProps {
  label: string;
  value: string;
}

function ConfigItem({ label, value }: ConfigItemProps) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <span className="text-sm text-white mt-0.5">{value || 'N/A'}</span>
    </div>
  );
}
