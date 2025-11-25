/**
 * Worker Restart Button Component
 *
 * Triggers restart confirmation dialog for workers (AC-1)
 *
 * Features:
 * - Disabled states for offline/restarting/terminating workers (AC-1)
 * - Tooltip showing restart availability (AC-1)
 * - Icon-only on mobile (<768px) with text on desktop (AC-8)
 * - Touch-friendly size (min 44px height) for mobile (AC-8)
 */

import { Button } from '@/components/ui/Button';
import { RefreshCw } from 'lucide-react';
import type { WorkerStatus } from '@/lib/api/workers';

export interface WorkerRestartButtonProps {
  /**
   * Worker data to check status for disabled state
   */
  worker: WorkerStatus;
  /**
   * Callback when restart button is clicked (opens confirmation dialog)
   */
  onClick: () => void;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Restart button with conditional disabled states (AC-1)
 *
 * Disabled when worker status is:
 * - 'offline' (not running)
 * - 'restarting' (already restarting)
 * - 'terminating' (being shut down)
 *
 * NOTE: TypeScript error expected - WorkerStatusEnum only has 'active'|'idle'|'unresponsive'
 * Backend may return additional statuses not yet in type definition
 * Safe to check against string literals for future-proofing
 */
export function WorkerRestartButton({ worker, onClick, className = '' }: WorkerRestartButtonProps) {
  // AC-1: Disable button for specific statuses
  // Cast to string to handle potential future backend statuses
  const statusStr = worker.status as string;
  const isDisabled = ['offline', 'restarting', 'terminating'].includes(statusStr);

  // AC-1: Tooltip text based on disabled state
  const tooltipText = isDisabled
    ? 'Worker cannot be restarted in current state'
    : 'Restart worker';

  return (
    <div className="relative group">
      <Button
        variant="secondary"
        size="sm"
        onClick={onClick}
        disabled={isDisabled}
        className={`gap-1 ${className}`}
        aria-label={tooltipText}
      >
        <RefreshCw className="h-4 w-4" />
        {/* AC-8: Show text label only on desktop */}
        <span className="hidden md:inline">Restart</span>
      </Button>

      {/* Tooltip (visible on hover for desktop, not shown on mobile) */}
      <div className="
        hidden group-hover:block
        absolute z-10 px-2 py-1
        bg-text-primary text-white text-xs rounded
        -top-8 left-1/2 -translate-x-1/2
        whitespace-nowrap
        pointer-events-none
      ">
        {tooltipText}
      </div>
    </div>
  );
}
