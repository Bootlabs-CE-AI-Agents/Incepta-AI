/**
 * Tests for WorkerRestartButton component (AC-1)
 *
 * Coverage:
 * - Restart button rendering with icon and text
 * - Disabled states for offline/restarting/terminating workers
 * - Enabled states for active/idle/unresponsive workers
 * - Tooltip display for disabled and enabled states
 * - Mobile responsiveness (icon-only on <768px)
 * - onClick callback execution
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkerRestartButton } from '@/components/workers/WorkerRestartButton';
import type { WorkerStatus } from '@/lib/api/workers';

/**
 * Helper to create mock worker data
 */
function createMockWorker(overrides?: Partial<WorkerStatus>): WorkerStatus {
  return {
    hostname: 'worker-1',
    status: 'active',
    uptime_seconds: 3600,
    active_tasks: 2,
    completed_tasks: 50,
    cpu_percent: 45,
    memory_percent: 60,
    throughput_per_minute: 10,
    ...overrides,
  };
}

describe('WorkerRestartButton', () => {
  /**
   * Test: Button renders with RefreshCw icon and "Restart" text (AC-1)
   */
  it('should render button with icon and text label', () => {
    const mockWorker = createMockWorker();
    const mockOnClick = jest.fn();

    render(<WorkerRestartButton worker={mockWorker} onClick={mockOnClick} />);

    // AC-1: Button should be visible
    const button = screen.getByRole('button', { name: /restart/i });
    expect(button).toBeInTheDocument();

    // AC-1: Icon should be present (lucide-react RefreshCw renders as svg)
    const icon = button.querySelector('svg');
    expect(icon).toBeInTheDocument();

    // AC-1: Text label "Restart" should be present (hidden on mobile via CSS)
    const textLabel = screen.getByText('Restart');
    expect(textLabel).toBeInTheDocument();
  });

  /**
   * Test: Button is enabled when worker status is 'active' (AC-1)
   */
  it('should be enabled for active workers', () => {
    const mockWorker = createMockWorker({ status: 'active' });
    const mockOnClick = jest.fn();

    render(<WorkerRestartButton worker={mockWorker} onClick={mockOnClick} />);

    const button = screen.getByRole('button', { name: /restart/i });
    expect(button).not.toBeDisabled();
  });

  /**
   * Test: Button is enabled when worker status is 'idle' (AC-1)
   */
  it('should be enabled for idle workers', () => {
    const mockWorker = createMockWorker({ status: 'idle' });
    const mockOnClick = jest.fn();

    render(<WorkerRestartButton worker={mockWorker} onClick={mockOnClick} />);

    const button = screen.getByRole('button', { name: /restart/i });
    expect(button).not.toBeDisabled();
  });

  /**
   * Test: Button is enabled when worker status is 'unresponsive' (AC-1)
   */
  it('should be enabled for unresponsive workers', () => {
    const mockWorker = createMockWorker({ status: 'unresponsive' });
    const mockOnClick = jest.fn();

    render(<WorkerRestartButton worker={mockWorker} onClick={mockOnClick} />);

    const button = screen.getByRole('button', { name: /restart/i });
    expect(button).not.toBeDisabled();
  });

  /**
   * Test: Button is disabled when worker status is 'offline' (AC-1)
   */
  it('should be disabled for offline workers', () => {
    // NOTE: 'offline' not in WorkerStatusEnum type but backend may return it
    const mockWorker = createMockWorker({ status: 'offline' as any });
    const mockOnClick = jest.fn();

    render(<WorkerRestartButton worker={mockWorker} onClick={mockOnClick} />);

    const button = screen.getByRole('button', { name: /cannot be restarted/i });
    expect(button).toBeDisabled();
  });

  /**
   * Test: Button is disabled when worker status is 'restarting' (AC-1)
   */
  it('should be disabled for restarting workers', () => {
    const mockWorker = createMockWorker({ status: 'restarting' as any });
    const mockOnClick = jest.fn();

    render(<WorkerRestartButton worker={mockWorker} onClick={mockOnClick} />);

    const button = screen.getByRole('button', { name: /cannot be restarted/i });
    expect(button).toBeDisabled();
  });

  /**
   * Test: Button is disabled when worker status is 'terminating' (AC-1)
   */
  it('should be disabled for terminating workers', () => {
    const mockWorker = createMockWorker({ status: 'terminating' as any });
    const mockOnClick = jest.fn();

    render(<WorkerRestartButton worker={mockWorker} onClick={mockOnClick} />);

    const button = screen.getByRole('button', { name: /cannot be restarted/i });
    expect(button).toBeDisabled();
  });

  /**
   * Test: Disabled button shows tooltip "Worker cannot be restarted in current state" (AC-1)
   */
  it('should show disabled state tooltip for disabled workers', () => {
    const mockWorker = createMockWorker({ status: 'offline' as any });
    const mockOnClick = jest.fn();

    render(<WorkerRestartButton worker={mockWorker} onClick={mockOnClick} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Worker cannot be restarted in current state');
  });

  /**
   * Test: Enabled button shows tooltip "Restart worker" (AC-1)
   */
  it('should show enabled state tooltip for enabled workers', () => {
    const mockWorker = createMockWorker({ status: 'active' });
    const mockOnClick = jest.fn();

    render(<WorkerRestartButton worker={mockWorker} onClick={mockOnClick} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Restart worker');
  });

  /**
   * Test: onClick callback is called when button is clicked (AC-1)
   */
  it('should call onClick when button is clicked', async () => {
    const user = userEvent.setup();
    const mockWorker = createMockWorker();
    const mockOnClick = jest.fn();

    render(<WorkerRestartButton worker={mockWorker} onClick={mockOnClick} />);

    const button = screen.getByRole('button', { name: /restart/i });
    await user.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  /**
   * Test: onClick callback is NOT called when button is disabled
   */
  it('should NOT call onClick when button is disabled', async () => {
    const user = userEvent.setup();
    const mockWorker = createMockWorker({ status: 'offline' as any });
    const mockOnClick = jest.fn();

    render(<WorkerRestartButton worker={mockWorker} onClick={mockOnClick} />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(mockOnClick).not.toHaveBeenCalled();
  });

  /**
   * Test: Custom className is applied (AC-1)
   */
  it('should apply custom className', () => {
    const mockWorker = createMockWorker();
    const mockOnClick = jest.fn();

    render(<WorkerRestartButton worker={mockWorker} onClick={mockOnClick} className="custom-class" />);

    const button = screen.getByRole('button', { name: /restart/i });
    expect(button).toHaveClass('custom-class');
  });

  /**
   * Test: Text label has mobile-specific class (AC-8)
   *
   * NOTE: CSS class 'hidden md:inline' hides text on mobile (<768px)
   * Testing CSS behavior requires integration/E2E tests with viewport resizing
   * This test verifies the class is present
   */
  it('should have mobile-responsive text label class', () => {
    const mockWorker = createMockWorker();
    const mockOnClick = jest.fn();

    render(<WorkerRestartButton worker={mockWorker} onClick={mockOnClick} />);

    const textLabel = screen.getByText('Restart');
    expect(textLabel).toHaveClass('hidden', 'md:inline');
  });
});
