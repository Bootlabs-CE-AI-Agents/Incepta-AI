/**
 * Queue Operations E2E Tests
 *
 * Tests queue management functionality: status metrics, pause/resume, depth chart, task list.
 * Following Playwright v1.51.0 best practices (2025)
 *
 * Sprint 4: Testing & Quality - E2E Tests
 * Story 5: Operations / Queue Management Page
 */

import { test, expect } from '@playwright/test';
import type { Route } from '@playwright/test';

test.describe.configure({ mode: 'parallel' });

test.describe('Queue Operations', () => {
  const mockQueueStatus = {
    depth: 15,
    processing_rate: 12,
    avg_wait_time: 2.5,
    failed_tasks_24h: 3,
    is_paused: false,
  };

  const mockQueueStatusPaused = {
    ...mockQueueStatus,
    is_paused: true,
  };

  const mockDepthHistory = [
    { timestamp: '2025-01-21T14:00:00Z', depth: 10 },
    { timestamp: '2025-01-21T14:05:00Z', depth: 12 },
    { timestamp: '2025-01-21T14:10:00Z', depth: 15 },
    { timestamp: '2025-01-21T14:15:00Z', depth: 18 },
    { timestamp: '2025-01-21T14:20:00Z', depth: 14 },
    { timestamp: '2025-01-21T14:25:00Z', depth: 11 },
    { timestamp: '2025-01-21T14:30:00Z', depth: 15 },
  ];

  const mockTasks = {
    tasks: [
      {
        id: 'task-001',
        name: 'enhance_ticket_12345',
        status: 'pending',
        agent_name: 'Ticket Enhancer',
        queued_at: '2025-01-21T14:30:45Z',
        started_at: null,
        completed_at: null,
        wait_time: 120,
      },
      {
        id: 'task-002',
        name: 'enhance_ticket_12346',
        status: 'processing',
        agent_name: 'Ticket Enhancer',
        queued_at: '2025-01-21T14:30:30Z',
        started_at: '2025-01-21T14:30:40Z',
        completed_at: null,
        wait_time: 10,
      },
      {
        id: 'task-003',
        name: 'enhance_ticket_12347',
        status: 'completed',
        agent_name: 'Ticket Enhancer',
        queued_at: '2025-01-21T14:29:00Z',
        started_at: '2025-01-21T14:29:05Z',
        completed_at: '2025-01-21T14:29:45Z',
        wait_time: 5,
      },
      {
        id: 'task-004',
        name: 'enhance_ticket_12348',
        status: 'failed',
        agent_name: 'Ticket Enhancer',
        queued_at: '2025-01-21T14:28:00Z',
        started_at: '2025-01-21T14:28:05Z',
        completed_at: '2025-01-21T14:28:15Z',
        wait_time: 5,
        error: 'Connection timeout',
      },
    ],
    total: 4,
    page: 1,
    page_size: 10,
  };

  test.beforeEach(async ({ page }) => {
    // Mock queue status
    await page.route('**/api/v1/queue/status', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockQueueStatus),
      });
    });

    // Mock queue depth history
    await page.route('**/api/v1/queue/depth-history*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDepthHistory),
      });
    });

    // Mock queue tasks
    await page.route('**/api/v1/queue/tasks*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTasks),
      });
    });

    await page.goto('/dashboard/operations');
    await expect(page.getByRole('heading', { name: /Queue Management/i })).toBeVisible();
  });

  test.describe('Queue Status Metrics', () => {
    test('displays queue depth metric', async ({ page }) => {
      await expect(page.getByText('Queue Depth')).toBeVisible();
      await expect(page.getByText('15')).toBeVisible();
    });

    test('displays processing rate metric', async ({ page }) => {
      await expect(page.getByText('Processing Rate')).toBeVisible();
      await expect(page.getByText('12')).toBeVisible();
      await expect(page.getByText(/tasks\/min/i)).toBeVisible();
    });

    test('displays average wait time metric', async ({ page }) => {
      await expect(page.getByText(/Avg Wait Time/i)).toBeVisible();
      await expect(page.getByText(/2\.5/)).toBeVisible();
      await expect(page.getByText(/seconds/i)).toBeVisible();
    });

    test('displays failed tasks count', async ({ page }) => {
      await expect(page.getByText(/Failed Tasks/i)).toBeVisible();
      await expect(page.getByText(/3/)).toBeVisible();
      await expect(page.getByText(/24h/i)).toBeVisible();
    });

    test('shows green status when queue is active', async ({ page }) => {
      // Status indicator should show active/running state
      await expect(page.getByText(/Active/i).or(page.getByText(/Running/i))).toBeVisible();
    });

    test('refreshes status metrics automatically', async ({ page }) => {
      let apiCallCount = 1; // One initial call

      await page.route('**/api/v1/queue/status', async (route: Route) => {
        apiCallCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockQueueStatus,
            depth: 20, // Changed value
          }),
        });
      });

      // Wait for auto-refresh (3s interval mentioned in page.tsx comments)
      await page.waitForTimeout(4000);

      // Verify API was called again
      expect(apiCallCount).toBeGreaterThan(1);
    });
  });

  test.describe('Queue Pause/Resume', () => {
    test('pauses queue when pause button clicked', async ({ page }) => {
      // Mock POST /queue/pause
      await page.route('**/api/v1/queue/pause', async (route: Route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, is_paused: true }),
          });
        }
      });

      // Update status endpoint to return paused state
      await page.route('**/api/v1/queue/status', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockQueueStatusPaused),
        });
      });

      const pauseButton = page.getByRole('button', { name: /Pause Queue/i });
      await pauseButton.click();

      // Verify success message
      await expect(page.getByText(/Queue paused/i)).toBeVisible({ timeout: 5000 });

      // Verify button text changed to Resume
      await expect(page.getByRole('button', { name: /Resume Queue/i })).toBeVisible();
    });

    test('resumes queue when resume button clicked', async ({ page }) => {
      // Start with paused state
      await page.route('**/api/v1/queue/status', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockQueueStatusPaused),
        });
      });

      await page.goto('/dashboard/operations');

      // Mock POST /queue/resume
      await page.route('**/api/v1/queue/resume', async (route: Route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, is_paused: false }),
          });
        }
      });

      // Update status to active
      await page.route('**/api/v1/queue/status', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockQueueStatus),
        });
      });

      const resumeButton = page.getByRole('button', { name: /Resume Queue/i });
      await resumeButton.click();

      // Verify success message
      await expect(page.getByText(/Queue resumed/i)).toBeVisible({ timeout: 5000 });

      // Verify button text changed back to Pause
      await expect(page.getByRole('button', { name: /Pause Queue/i })).toBeVisible();
    });

    test('shows error when pause operation fails', async ({ page }) => {
      // Mock POST /queue/pause with error
      await page.route('**/api/v1/queue/pause', async (route: Route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'Redis connection failed' }),
          });
        }
      });

      const pauseButton = page.getByRole('button', { name: /Pause Queue/i });
      await pauseButton.click();

      // Verify error message
      await expect(page.getByText(/Failed to pause queue/i)).toBeVisible({ timeout: 5000 });
    });

    test('shows warning when queue is paused', async ({ page }) => {
      // Start with paused state
      await page.route('**/api/v1/queue/status', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockQueueStatusPaused),
        });
      });

      await page.goto('/dashboard/operations');

      // Should show paused status/warning
      await expect(page.getByText(/Paused/i).or(page.getByText(/Queue is paused/i))).toBeVisible();
    });
  });

  test.describe('Queue Depth Chart', () => {
    test('renders depth chart with historical data', async ({ page }) => {
      // Verify chart title
      await expect(page.getByText(/Queue Depth/i)).toBeVisible();
      await expect(page.getByText(/Last 60 Minutes/i).or(page.getByText(/Last Hour/i))).toBeVisible();
    });

    test('displays time series data points', async ({ page }) => {
      // Chart should render (Recharts components)
      const chartContainer = page.locator('[class*="recharts"]').first();
      await expect(chartContainer).toBeVisible();
    });

    test('refreshes chart data automatically', async ({ page }) => {
      let apiCallCount = 1;

      await page.route('**/api/v1/queue/depth-history*', async (route: Route) => {
        apiCallCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockDepthHistory),
        });
      });

      // Wait for auto-refresh (10s interval mentioned in page.tsx comments)
      await page.waitForTimeout(11000);

      // Verify API was called again
      expect(apiCallCount).toBeGreaterThan(1);
    });
  });

  test.describe('Task List', () => {
    test('displays task list table', async ({ page }) => {
      await expect(page.getByText('Task Name')).toBeVisible();
      await expect(page.getByText('Status')).toBeVisible();
      await expect(page.getByText('Agent')).toBeVisible();
      await expect(page.getByText('Queued At')).toBeVisible();
    });

    test('displays pending task', async ({ page }) => {
      await expect(page.getByText('enhance_ticket_12345')).toBeVisible();
      await expect(page.getByText('pending').or(page.getByText('Pending'))).toBeVisible();
    });

    test('displays processing task', async ({ page }) => {
      await expect(page.getByText('enhance_ticket_12346')).toBeVisible();
      await expect(page.getByText('processing').or(page.getByText('Processing'))).toBeVisible();
    });

    test('displays completed task', async ({ page }) => {
      await expect(page.getByText('enhance_ticket_12347')).toBeVisible();
      await expect(page.getByText('completed').or(page.getByText('Completed'))).toBeVisible();
    });

    test('displays failed task with error', async ({ page }) => {
      await expect(page.getByText('enhance_ticket_12348')).toBeVisible();
      await expect(page.getByText('failed').or(page.getByText('Failed'))).toBeVisible();
      await expect(page.getByText(/Connection timeout/i)).toBeVisible();
    });

    test('shows agent name for each task', async ({ page }) => {
      await expect(page.getByText('Ticket Enhancer').first()).toBeVisible();
    });

    test('shows wait time for tasks', async ({ page }) => {
      // Wait time should be displayed (in seconds or formatted)
      await expect(page.getByText(/120/)).toBeVisible();
      await expect(page.getByText(/10/)).toBeVisible();
      await expect(page.getByText(/5/)).toBeVisible();
    });
  });

  test.describe('Task Filtering', () => {
    test('filters tasks by status: pending', async ({ page }) => {
      const statusFilter = page.getByLabel(/Status/i).or(page.locator('select').filter({ hasText: /All|Pending|Processing/ }));
      await statusFilter.selectOption('pending');

      // Only pending tasks should be visible
      await expect(page.getByText('enhance_ticket_12345')).toBeVisible();
      await expect(page.getByText('enhance_ticket_12346')).not.toBeVisible();
    });

    test('filters tasks by status: processing', async ({ page }) => {
      const statusFilter = page.getByLabel(/Status/i).or(page.locator('select').filter({ hasText: /All|Pending|Processing/ }));
      await statusFilter.selectOption('processing');

      // Only processing tasks should be visible
      await expect(page.getByText('enhance_ticket_12346')).toBeVisible();
      await expect(page.getByText('enhance_ticket_12345')).not.toBeVisible();
    });

    test('filters tasks by status: failed', async ({ page }) => {
      const statusFilter = page.getByLabel(/Status/i).or(page.locator('select').filter({ hasText: /All|Pending|Processing/ }));
      await statusFilter.selectOption('failed');

      // Only failed tasks should be visible
      await expect(page.getByText('enhance_ticket_12348')).toBeVisible();
      await expect(page.getByText('enhance_ticket_12345')).not.toBeVisible();
    });

    test('shows all tasks when filter is "All"', async ({ page }) => {
      const statusFilter = page.getByLabel(/Status/i).or(page.locator('select').filter({ hasText: /All|Pending|Processing/ }));

      // First filter to pending
      await statusFilter.selectOption('pending');
      await expect(page.getByText('enhance_ticket_12346')).not.toBeVisible();

      // Then back to all
      await statusFilter.selectOption('all');

      // All tasks should be visible
      await expect(page.getByText('enhance_ticket_12345')).toBeVisible();
      await expect(page.getByText('enhance_ticket_12346')).toBeVisible();
      await expect(page.getByText('enhance_ticket_12347')).toBeVisible();
      await expect(page.getByText('enhance_ticket_12348')).toBeVisible();
    });
  });

  test.describe('Task Pagination', () => {
    const mockManyTasks = {
      tasks: Array.from({ length: 10 }, (_, i) => ({
        id: `task-${i + 1}`,
        name: `enhance_ticket_${12340 + i}`,
        status: i % 4 === 0 ? 'pending' : i % 4 === 1 ? 'processing' : i % 4 === 2 ? 'completed' : 'failed',
        agent_name: 'Ticket Enhancer',
        queued_at: `2025-01-21T14:${30 + i}:00Z`,
        started_at: null,
        completed_at: null,
        wait_time: 10 + i,
      })),
      total: 25,
      page: 1,
      page_size: 10,
    };

    test.beforeEach(async ({ page }) => {
      await page.route('**/api/v1/queue/tasks*', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockManyTasks),
        });
      });

      await page.goto('/dashboard/operations');
    });

    test('displays pagination controls when there are multiple pages', async ({ page }) => {
      await expect(page.getByText(/Showing 1-10 of 25/i).or(page.getByText(/Page 1 of 3/i))).toBeVisible();
    });

    test('navigates to next page', async ({ page }) => {
      const page2Tasks = {
        ...mockManyTasks,
        tasks: Array.from({ length: 10 }, (_, i) => ({
          id: `task-${i + 11}`,
          name: `enhance_ticket_${12350 + i}`,
          status: 'pending',
          agent_name: 'Ticket Enhancer',
          queued_at: `2025-01-21T14:${40 + i}:00Z`,
          started_at: null,
          completed_at: null,
          wait_time: 20 + i,
        })),
        page: 2,
      };

      await page.route('**/api/v1/queue/tasks*page=2*', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(page2Tasks),
        });
      });

      const nextButton = page.getByRole('button', { name: /Next/i }).or(page.getByLabel(/Next page/i));
      await nextButton.click();

      // Verify page 2 content
      await expect(page.getByText('enhance_ticket_12350')).toBeVisible();
    });
  });

  test.describe('Task Cancellation', () => {
    test('cancels pending task when cancel button clicked', async ({ page }) => {
      // Mock POST /queue/tasks/{id}/cancel
      await page.route('**/api/v1/queue/tasks/task-001/cancel', async (route: Route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, message: 'Task cancelled successfully' }),
          });
        }
      });

      const cancelButton = page.getByRole('row', { name: /enhance_ticket_12345/ })
        .getByRole('button', { name: /Cancel/i });
      await cancelButton.click();

      // Verify success message
      await expect(page.getByText(/Task cancelled/i)).toBeVisible({ timeout: 5000 });
    });

    test('shows error when task cancellation fails', async ({ page }) => {
      // Mock POST /queue/tasks/{id}/cancel with error
      await page.route('**/api/v1/queue/tasks/task-001/cancel', async (route: Route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'Task not found in Celery' }),
          });
        }
      });

      const cancelButton = page.getByRole('row', { name: /enhance_ticket_12345/ })
        .getByRole('button', { name: /Cancel/i });
      await cancelButton.click();

      // Verify error message
      await expect(page.getByText(/Failed to cancel task/i)).toBeVisible({ timeout: 5000 });
    });

    test('cancel button only visible for pending/processing tasks', async ({ page }) => {
      // Pending task should have cancel button
      const pendingRow = page.getByRole('row', { name: /enhance_ticket_12345/ });
      await expect(pendingRow.getByRole('button', { name: /Cancel/i })).toBeVisible();

      // Completed task should not have cancel button
      const completedRow = page.getByRole('row', { name: /enhance_ticket_12347/ });
      await expect(completedRow.getByRole('button', { name: /Cancel/i })).not.toBeVisible();

      // Failed task should not have cancel button
      const failedRow = page.getByRole('row', { name: /enhance_ticket_12348/ });
      await expect(failedRow.getByRole('button', { name: /Cancel/i })).not.toBeVisible();
    });
  });

  test.describe('Error States', () => {
    test('shows error when queue status API fails', async ({ page }) => {
      // Mock API error
      await page.route('**/api/v1/queue/status', async (route: Route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Redis connection failed' }),
        });
      });

      await page.goto('/dashboard/operations');

      // Error message should be displayed
      await expect(page.getByText(/Failed to load queue status/i).or(page.getByText(/Error/i))).toBeVisible();
    });

    test('shows error when tasks API fails', async ({ page }) => {
      // Mock API error
      await page.route('**/api/v1/queue/tasks*', async (route: Route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Database connection failed' }),
        });
      });

      await page.goto('/dashboard/operations');

      // Error message should be displayed in task list section
      await expect(page.getByText(/Failed to load tasks/i).or(page.getByText(/Error/i))).toBeVisible();
    });

    test('shows "No tasks" when task list is empty', async ({ page }) => {
      // Mock empty tasks response
      await page.route('**/api/v1/queue/tasks*', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ tasks: [], total: 0, page: 1, page_size: 10 }),
        });
      });

      await page.goto('/dashboard/operations');

      await expect(page.getByText(/No tasks/i).or(page.getByText(/Queue is empty/i))).toBeVisible();
    });
  });

  test.describe('Real-time Updates', () => {
    test('automatically refreshes task list', async ({ page }) => {
      let apiCallCount = 1;

      await page.route('**/api/v1/queue/tasks*', async (route: Route) => {
        apiCallCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockTasks),
        });
      });

      // Wait for auto-refresh (5s interval mentioned in page.tsx comments)
      await page.waitForTimeout(6000);

      // Verify API was called again
      expect(apiCallCount).toBeGreaterThan(1);
    });
  });
});
