"use client";

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Loading } from '@/components/ui';
import { getTenantSpend } from '@/lib/api/tenants';
import type { TenantSpendResponse } from '@/lib/api/tenants';
import { RefreshCw, AlertCircle, DollarSign } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * Budget Dashboard Component
 *
 * Displays real-time budget utilization and spend data for a tenant.
 * Reference: src/admin/pages/_2_tenants_ui_helpers.py lines 427-524
 */

interface BudgetDashboardProps {
  tenantId: string;
  maxBudget: number;
  alertThreshold: number;
  graceThreshold: number;
  budgetDuration: string;
}

export function BudgetDashboard({
  tenantId,
  alertThreshold,
  graceThreshold,
  budgetDuration,
}: BudgetDashboardProps) {
  const queryClient = useQueryClient();

  // Fetch spend data with 60-second cache
  const { data: spendData, isLoading, error } = useQuery<TenantSpendResponse>({
    queryKey: ['tenant-spend', tenantId],
    queryFn: () => getTenantSpend(tenantId),
    staleTime: 60000, // 60 seconds
    retry: 1,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['tenant-spend', tenantId] });
  };

  // Determine status color and message based on utilization
  const getUtilizationStatus = (utilizationPct: number) => {
    if (utilizationPct < 80) {
      return {
        color: 'text-accent-green',
        bgColor: 'bg-accent-green/10',
        borderColor: 'border-accent-green/30',
        icon: '🟢',
        status: 'Within budget',
      };
    } else if (utilizationPct < 100) {
      return {
        color: 'text-accent-yellow',
        bgColor: 'bg-accent-yellow/10',
        borderColor: 'border-accent-yellow/30',
        icon: '🟡',
        status: 'Approaching limit',
      };
    } else if (utilizationPct < 110) {
      return {
        color: 'text-accent-orange',
        bgColor: 'bg-accent-orange/10',
        borderColor: 'border-accent-orange/30',
        icon: '🟠',
        status: 'Over budget',
      };
    } else {
      return {
        color: 'text-accent-red',
        bgColor: 'bg-accent-red/10',
        borderColor: 'border-accent-red/30',
        icon: '🔴',
        status: 'Grace exceeded',
      };
    }
  };

  // Calculate days until budget reset
  const calculateDaysUntilReset = (resetDate: string | undefined) => {
    if (!resetDate) return null;

    try {
      const reset = new Date(resetDate);
      const now = new Date();
      const diffTime = reset.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    } catch {
      return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading />
      </div>
    );
  }

  // Handle error or no virtual key configured
  if (error || !spendData) {
    return (
      <div className="p-6 rounded-lg bg-accent-yellow/10 border border-accent-yellow/30">
        <div className="flex items-center gap-2 text-accent-yellow mb-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Budget tracking not configured</span>
        </div>
        <p className="text-sm text-text-secondary">
          This tenant doesn&apos;t have a LiteLLM virtual key configured. Enable
          BYOK or platform keys to see spend data.
        </p>
      </div>
    );
  }

  const utilizationStatus = getUtilizationStatus(spendData.utilization_pct);
  const daysUntilReset = calculateDaysUntilReset(spendData.budget_reset_at);

  return (
    <div className="space-y-6">
      {/* Budget Configuration */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-white/5 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-text-secondary" />
            <span className="text-sm text-text-secondary">Max Budget</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            ${spendData.max_budget.toFixed(2)}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-white/5 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-text-secondary" />
            <span className="text-sm text-text-secondary">Alert Threshold</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {alertThreshold}%
          </p>
        </div>

        <div className="p-4 rounded-lg bg-white/5 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-text-secondary" />
            <span className="text-sm text-text-secondary">Grace Threshold</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {graceThreshold}%
          </p>
        </div>
      </div>

      {/* Reset Period */}
      <div className="flex items-center gap-4 text-sm text-text-secondary">
        <span>
          <span className="font-medium text-text-primary">Reset Period:</span>{' '}
          {budgetDuration}
        </span>
        {daysUntilReset !== null && (
          <span>
            <span className="font-medium text-text-primary">
              Days Until Reset:
            </span>{' '}
            {daysUntilReset}
          </span>
        )}
      </div>

      {/* Current Spend */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm text-text-secondary mb-1">
              Current Spend
            </div>
            <div className="text-2xl font-bold text-text-primary">
              ${spendData.current_spend.toFixed(2)}{' '}
              <span className="text-base font-normal text-text-secondary">
                / ${spendData.max_budget.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-sm font-medium ${utilizationStatus.color}`}>
                {utilizationStatus.icon} {utilizationStatus.status}
              </span>
              <span className="text-sm text-text-secondary">
                ({spendData.utilization_pct.toFixed(1)}%)
              </span>
            </div>
          </div>

          <Button
            onClick={handleRefresh}
            variant="ghost"
            size="sm"
            title="Refresh spend data"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="relative h-3 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
              spendData.utilization_pct < 80
                ? 'bg-accent-green'
                : spendData.utilization_pct < 100
                ? 'bg-accent-yellow'
                : spendData.utilization_pct < 110
                ? 'bg-accent-orange'
                : 'bg-accent-red'
            }`}
            style={{
              width: `${Math.min(spendData.utilization_pct, 150)}%`,
            }}
          />
        </div>
      </div>

      {/* Alert Messages */}
      {spendData.utilization_pct >= 110 && (
        <div
          className={`p-4 rounded-lg border ${utilizationStatus.borderColor} ${utilizationStatus.bgColor}`}
        >
          <div className={`flex items-center gap-2 ${utilizationStatus.color}`}>
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">
              Grace Period Exceeded ({spendData.utilization_pct.toFixed(1)}%)
            </span>
          </div>
        </div>
      )}

      {spendData.utilization_pct >= 100 && spendData.utilization_pct < 110 && (
        <div
          className={`p-4 rounded-lg border ${utilizationStatus.borderColor} ${utilizationStatus.bgColor}`}
        >
          <div className={`flex items-center gap-2 ${utilizationStatus.color}`}>
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">
              Budget Limit Exceeded ({spendData.utilization_pct.toFixed(1)}%)
            </span>
          </div>
        </div>
      )}

      {spendData.utilization_pct >= 80 && spendData.utilization_pct < 100 && (
        <div
          className={`p-4 rounded-lg border ${utilizationStatus.borderColor} ${utilizationStatus.bgColor}`}
        >
          <div className={`flex items-center gap-2 ${utilizationStatus.color}`}>
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">
              Approaching Budget Limit ({spendData.utilization_pct.toFixed(1)}%)
            </span>
          </div>
        </div>
      )}

      {/* Model Spend Breakdown */}
      {spendData.models_breakdown && spendData.models_breakdown.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-3">
            Model Spend Breakdown
          </h4>
          <div className="overflow-hidden rounded-lg border border-white/20">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Spend
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Share
                  </th>
                  {spendData.models_breakdown[0].requests !== undefined && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Requests
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {spendData.models_breakdown.map((model, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-sm text-text-primary font-medium">
                      {model.model}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary text-right">
                      ${model.spend.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary text-right">
                      {model.percentage.toFixed(1)}%
                    </td>
                    {model.requests !== undefined && (
                      <td className="px-4 py-3 text-sm text-text-secondary text-right">
                        {model.requests.toLocaleString()}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-xs text-text-secondary">
        Last updated:{' '}
        {formatDistanceToNow(new Date(spendData.last_updated), {
          addSuffix: true,
        })}
      </div>
    </div>
  );
}
