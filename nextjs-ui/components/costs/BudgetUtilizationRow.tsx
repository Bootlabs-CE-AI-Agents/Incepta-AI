"use client";

import { BudgetProgressBar } from "./BudgetProgressBar";
import { formatCurrency } from "@/lib/utils/budget";
import type { BudgetUtilizationDTO } from "@/types/costs";
import { cn } from "@/lib/utils/cn";

interface BudgetUtilizationRowProps {
  /** Tenant budget utilization data */
  tenant: BudgetUtilizationDTO;

  /** Optional custom className for the row */
  className?: string;
}

/**
 * BudgetUtilizationRow Component
 *
 * Collapsible row displaying tenant budget utilization.
 * Clicking the row expands to show agent-level breakdown.
 *
 * Features:
 * - Tenant name and budget summary
 * - Color-coded progress bar
 * - Expand/collapse animation
 * - Agent breakdown table in expanded state
 * - Keyboard accessible (Enter/Space to toggle)
 *
 * @param tenant - Tenant budget utilization data
 * @param className - Optional custom classes for row container
 *
 * @example
 * ```tsx
 * const tenant = {
 *   tenant_id: "tenant-abc",
 *   tenant_name: "Acme Corporation",
 *   budget_amount: 5000.00,
 *   spent_amount: 4750.50,
 *   utilization_percentage: 95.01,
 *   agent_breakdown: [...],
 *   last_updated: "2025-01-21T14:30:00Z",
 * };
 *
 * <BudgetUtilizationRow tenant={tenant} />
 * ```
 */
export function BudgetUtilizationRow({
  tenant,
  className,
}: BudgetUtilizationRowProps) {
  return (
    <div
      className={cn(
        "border-b border-gray-200 transition-colors duration-150",
        className
      )}
    >
      {/* Main Row (Non-clickable until agent breakdown is supported) */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Tenant Info */}
          <div className="flex-1 min-w-0">
            {/* Tenant Name */}
            <h3 className="font-semibold text-text-primary mb-1">
              {tenant.tenant_name}
            </h3>

            {/* Budget Summary */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
              <span>
                Spent: <span className="font-medium tabular-nums">{formatCurrency(tenant.current_spend)}</span>
              </span>
              <span className="text-gray-300">|</span>
              <span>
                Budget: <span className="font-medium tabular-nums">{formatCurrency(tenant.budget_limit)}</span>
              </span>
            </div>

            {/* Progress Bar */}
            <BudgetProgressBar
              utilized={tenant.utilization_pct}
              budget={tenant.budget_limit}
              spent={tenant.current_spend}
            />
          </div>
        </div>
      </div>

      {/* Expanded Section (Agent Breakdown) - Not yet supported by backend */}
      {/* TODO: Enable when backend supports agent_breakdown field */}
      {/* {isExpanded && (
        <div
          className="bg-gray-50 px-4 py-4 animate-slideDown"
          role="region"
          aria-label={`Agent breakdown for ${tenant.tenant_name}`}
        >
          <h4 className="text-sm font-semibold text-text-primary mb-3">
            Agent Breakdown
          </h4>
          <AgentBreakdownTable agents={tenant.agent_breakdown} />
        </div>
      )} */}
    </div>
  );
}
