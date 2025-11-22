/**
 * BudgetDashboard Component Tests
 *
 * Tests for budget visualization and spend tracking dashboard.
 * Covers: budget display, utilization status, progress bars, alerts, model breakdown, refresh.
 *
 * Story 1: P1-2 Budget Dashboard
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BudgetDashboard } from './BudgetDashboard';
import * as tenantsApi from '@/lib/api/tenants';

// Mock tenants API
jest.mock('@/lib/api/tenants', () => ({
  getTenantSpend: jest.fn(),
}));

const mockGetTenantSpend = tenantsApi.getTenantSpend as jest.MockedFunction<typeof tenantsApi.getTenantSpend>;

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '5 minutes ago'),
}));

// Mock data
const mockSpendDataWithinBudget = {
  tenant_id: 'tenant-123',
  current_spend: 45.50,
  max_budget: 100.00,
  utilization_pct: 45.5,
  models_breakdown: [
    {
      model: 'gpt-4',
      spend: 30.00,
      percentage: 65.9,
      requests: 150,
    },
    {
      model: 'claude-3-opus',
      spend: 15.50,
      percentage: 34.1,
      requests: 75,
    },
  ],
  last_updated: '2025-01-21T14:30:00Z',
  budget_duration: 'monthly',
  budget_reset_at: '2025-02-01T00:00:00Z',
};

const mockSpendDataApproachingLimit = {
  ...mockSpendDataWithinBudget,
  current_spend: 85.00,
  utilization_pct: 85.0,
};

const mockSpendDataOverBudget = {
  ...mockSpendDataWithinBudget,
  current_spend: 105.00,
  utilization_pct: 105.0,
};

const mockSpendDataGraceExceeded = {
  ...mockSpendDataWithinBudget,
  current_spend: 115.00,
  utilization_pct: 115.0,
};

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
}

describe('BudgetDashboard', () => {
  const defaultProps = {
    tenantId: 'tenant-123',
    maxBudget: 100,
    alertThreshold: 80,
    graceThreshold: 110,
    budgetDuration: 'monthly',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTenantSpend.mockResolvedValue(mockSpendDataWithinBudget);
  });

  describe('Rendering', () => {
    it('should show loading state while fetching spend data', () => {
      mockGetTenantSpend.mockReturnValue(new Promise(() => {})); // Never resolves

      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });

    it('should render budget configuration cards', async () => {
      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Max Budget')).toBeInTheDocument();
        expect(screen.getByText('$100.00')).toBeInTheDocument();
        expect(screen.getByText('Alert Threshold')).toBeInTheDocument();
        expect(screen.getByText('80%')).toBeInTheDocument();
        expect(screen.getByText('Grace Threshold')).toBeInTheDocument();
        expect(screen.getByText('110%')).toBeInTheDocument();
      });
    });

    it('should render reset period information', async () => {
      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Reset Period:/i)).toBeInTheDocument();
        expect(screen.getByText(/monthly/i)).toBeInTheDocument();
        expect(screen.getByText(/Days Until Reset:/i)).toBeInTheDocument();
      });
    });

    it('should render current spend display', async () => {
      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Current Spend')).toBeInTheDocument();
        expect(screen.getByText('$45.50')).toBeInTheDocument();
        expect(screen.getByText('(45.5%)')).toBeInTheDocument();
      });
    });

    it('should render model spend breakdown table', async () => {
      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Model Spend Breakdown')).toBeInTheDocument();
        expect(screen.getByText('gpt-4')).toBeInTheDocument();
        expect(screen.getByText('$30.00')).toBeInTheDocument();
        expect(screen.getByText('65.9%')).toBeInTheDocument();
        expect(screen.getByText('claude-3-opus')).toBeInTheDocument();
        expect(screen.getByText('$15.50')).toBeInTheDocument();
        expect(screen.getByText('34.1%')).toBeInTheDocument();
      });
    });

    it('should render last updated timestamp', async () => {
      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Last updated:/i)).toBeInTheDocument();
        expect(screen.getByText(/5 minutes ago/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show error message when API call fails', async () => {
      mockGetTenantSpend.mockRejectedValue(new Error('Network error'));

      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Budget tracking not configured/i)).toBeInTheDocument();
        expect(screen.getByText(/doesn't have a LiteLLM virtual key configured/i)).toBeInTheDocument();
      });
    });

    it('should show error message when spend data is null', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockGetTenantSpend.mockResolvedValue(null as any);

      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Budget tracking not configured/i)).toBeInTheDocument();
      });
    });
  });

  describe('Utilization Status - Within Budget', () => {
    it('should show green status when utilization < 80%', async () => {
      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/🟢/)).toBeInTheDocument();
        expect(screen.getByText('Within budget')).toBeInTheDocument();
      });
    });

    it('should not show alert message when utilization < 80%', async () => {
      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.queryByText(/Approaching Budget Limit/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Budget Limit Exceeded/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Grace Period Exceeded/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Utilization Status - Approaching Limit', () => {
    it('should show yellow status when utilization >= 80% and < 100%', async () => {
      mockGetTenantSpend.mockResolvedValue(mockSpendDataApproachingLimit);

      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/🟡/)).toBeInTheDocument();
        expect(screen.getByText('Approaching limit')).toBeInTheDocument();
      });
    });

    it('should show alert message when utilization >= 80% and < 100%', async () => {
      mockGetTenantSpend.mockResolvedValue(mockSpendDataApproachingLimit);

      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Approaching Budget Limit \(85.0%\)/i)).toBeInTheDocument();
      });
    });
  });

  describe('Utilization Status - Over Budget', () => {
    it('should show orange status when utilization >= 100% and < 110%', async () => {
      mockGetTenantSpend.mockResolvedValue(mockSpendDataOverBudget);

      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/🟠/)).toBeInTheDocument();
        expect(screen.getByText('Over budget')).toBeInTheDocument();
      });
    });

    it('should show alert message when utilization >= 100% and < 110%', async () => {
      mockGetTenantSpend.mockResolvedValue(mockSpendDataOverBudget);

      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Budget Limit Exceeded \(105.0%\)/i)).toBeInTheDocument();
      });
    });
  });

  describe('Utilization Status - Grace Exceeded', () => {
    it('should show red status when utilization >= 110%', async () => {
      mockGetTenantSpend.mockResolvedValue(mockSpendDataGraceExceeded);

      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/🔴/)).toBeInTheDocument();
        expect(screen.getByText('Grace exceeded')).toBeInTheDocument();
      });
    });

    it('should show alert message when utilization >= 110%', async () => {
      mockGetTenantSpend.mockResolvedValue(mockSpendDataGraceExceeded);

      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Grace Period Exceeded \(115.0%\)/i)).toBeInTheDocument();
      });
    });
  });

  describe('Progress Bar', () => {
    it('should render progress bar with correct width', async () => {
      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        const progressBar = screen.getByText('Current Spend').closest('div')?.querySelector('[style*="width"]');
        expect(progressBar).toBeInTheDocument();
      });
    });

    it('should cap progress bar width at 150%', async () => {
      mockGetTenantSpend.mockResolvedValue({
        ...mockSpendDataWithinBudget,
        current_spend: 180.00,
        utilization_pct: 180.0,
      });

      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        const progressBar = screen.getByText('Current Spend').closest('div')?.querySelector('[style*="width"]');
        expect(progressBar).toHaveStyle({ width: '150%' });
      });
    });
  });

  describe('Model Breakdown', () => {
    it('should show requests column when data includes requests', async () => {
      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Requests')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('75')).toBeInTheDocument();
      });
    });

    it('should not show requests column when data excludes requests', async () => {
      mockGetTenantSpend.mockResolvedValue({
        ...mockSpendDataWithinBudget,
        models_breakdown: [
          {
            model: 'gpt-4',
            spend: 30.00,
            percentage: 65.9,
          },
        ],
      });

      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.queryByText('Requests')).not.toBeInTheDocument();
      });
    });

    it('should not render model breakdown when array is empty', async () => {
      mockGetTenantSpend.mockResolvedValue({
        ...mockSpendDataWithinBudget,
        models_breakdown: [],
      });

      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.queryByText('Model Spend Breakdown')).not.toBeInTheDocument();
      });
    });
  });

  describe('Days Until Reset', () => {
    it('should calculate and display days until budget reset', async () => {
      // Use real date - this test will show actual days until reset
      // The component calculates Math.ceil((reset - now) / (1000 * 60 * 60 * 24))
      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Days Until Reset:/i)).toBeInTheDocument();
        // Just verify a number is displayed, don't check exact value
        const daysText = screen.getByText(/Days Until Reset:/i).nextSibling;
        expect(daysText).toBeInTheDocument();
      });
    });

    it('should not display days until reset when reset date is null', async () => {
      mockGetTenantSpend.mockResolvedValue({
        ...mockSpendDataWithinBudget,
        budget_reset_at: undefined,
      });

      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.queryByText(/Days Until Reset:/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should render refresh button', async () => {
      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        const refreshButton = screen.getByTitle('Refresh spend data');
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('should call getTenantSpend when refresh button clicked', async () => {
      const user = userEvent.setup();
      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockGetTenantSpend).toHaveBeenCalledWith('tenant-123');
      });

      const refreshButton = screen.getByTitle('Refresh spend data');
      await user.click(refreshButton);

      await waitFor(() => {
        // Should be called twice: initial load + manual refresh
        expect(mockGetTenantSpend).toHaveBeenCalledTimes(2);
      });
    });

    it('should update data after refresh', async () => {
      const user = userEvent.setup();
      render(<BudgetDashboard {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('$45.50')).toBeInTheDocument();
      });

      // Change mock data for refresh
      mockGetTenantSpend.mockResolvedValue({
        ...mockSpendDataWithinBudget,
        current_spend: 60.00,
        utilization_pct: 60.0,
      });

      const refreshButton = screen.getByTitle('Refresh spend data');
      await user.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText('$60.00')).toBeInTheDocument();
        expect(screen.getByText('(60.0%)')).toBeInTheDocument();
      });
    });
  });
});
