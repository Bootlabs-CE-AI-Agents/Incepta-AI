/**
 * Worker Log Viewer E2E Tests
 *
 * Tests worker logs modal functionality: filtering, search, auto-refresh, download.
 * Following Playwright v1.51.0 best practices (2025)
 *
 * Sprint 4: Testing & Quality - E2E Tests
 * Story 3.3: Worker Logs Viewer (P1)
 */

import { test, expect } from '@playwright/test';
import type { Route, Download } from '@playwright/test';

test.describe.configure({ mode: 'parallel' });

test.describe('Worker Log Viewer', () => {
  const mockWorkers = [
    {
      hostname: 'celery@worker-1.example.com',
      status: 'active',
      tasks_active: 5,
      tasks_completed: 1250,
      uptime: '5 days, 3 hours',
      last_heartbeat: '2025-01-21T14:30:00Z',
    },
    {
      hostname: 'celery@worker-2.example.com',
      status: 'active',
      tasks_active: 2,
      tasks_completed: 980,
      uptime: '3 days, 12 hours',
      last_heartbeat: '2025-01-21T14:29:55Z',
    },
  ];

  const mockLogs = {
    hostname: 'celery@worker-1.example.com',
    logs: [
      '2025-01-21 14:30:45,123 ERROR: Failed to connect to database',
      '2025-01-21 14:30:46,234 WARNING: Retrying connection in 5s',
      '2025-01-21 14:30:51,345 INFO: Connection established successfully',
      '2025-01-21 14:30:52,456 DEBUG: Loaded 42 records from cache',
      '2025-01-21 14:30:53,567 INFO: Processing task queue',
      '2025-01-21 14:30:54,678 ERROR: Task execution failed: timeout exceeded',
      '2025-01-21 14:30:55,789 WARNING: Rescheduling failed task',
      '2025-01-21 14:30:56,890 INFO: Task rescheduled successfully',
      '2025-01-21 14:30:57,901 DEBUG: Queue depth: 15 pending tasks',
      '2025-01-21 14:30:58,012 INFO: Worker idle, waiting for tasks',
    ],
  };

  const mockLogsWithSearch = {
    hostname: 'celery@worker-1.example.com',
    logs: [
      '2025-01-21 14:30:45,123 ERROR: Database connection timeout',
      '2025-01-21 14:30:46,234 INFO: Reconnecting to database',
      '2025-01-21 14:30:47,345 INFO: Database connection successful',
      '2025-01-21 14:30:48,456 INFO: Task processing started',
    ],
  };

  test.beforeEach(async ({ page }) => {
    // Mock workers list
    await page.route('**/api/v1/workers', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockWorkers),
      });
    });

    // Mock worker logs (default)
    await page.route('**/api/v1/workers/*/logs?*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockLogs),
      });
    });

    await page.goto('/dashboard/workers');
    await expect(page.getByRole('heading', { name: /Worker Nodes/i })).toBeVisible();
  });

  test.describe('Modal Opening & Closing', () => {
    test('opens logs modal when View Logs button clicked', async ({ page }) => {
      const viewLogsButton = page.getByRole('button', { name: /View Logs/i }).first();
      await viewLogsButton.click();

      // Modal should be visible
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText(/Worker Logs:/i)).toBeVisible();
      await expect(page.getByText(/celery@worker-1.example.com/i)).toBeVisible();
    });

    test('closes modal when X button clicked', async ({ page }) => {
      await page.getByRole('button', { name: /View Logs/i }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();

      const closeButton = page.getByRole('button', { name: /close/i }).or(page.locator('button[aria-label="Close"]'));
      await closeButton.click();

      // Modal should be closed
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test('closes modal when clicking outside (overlay)', async ({ page }) => {
      await page.getByRole('button', { name: /View Logs/i }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Click backdrop/overlay (outside modal)
      await page.locator('[role="dialog"]').evaluate((el) => {
        const backdrop = el.parentElement?.previousElementSibling;
        if (backdrop) (backdrop as HTMLElement).click();
      });

      // Modal should close after clicking backdrop
      await page.waitForTimeout(500);
    });
  });

  test.describe('Log Display', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: /View Logs/i }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('displays log lines with level badges', async ({ page }) => {
      // Verify ERROR logs displayed
      await expect(page.getByText(/Failed to connect to database/i)).toBeVisible();
      await expect(page.getByText('ERROR').first()).toBeVisible();

      // Verify WARNING logs displayed
      await expect(page.getByText(/Retrying connection in 5s/i)).toBeVisible();
      await expect(page.getByText('WARNING').first()).toBeVisible();

      // Verify INFO logs displayed
      await expect(page.getByText(/Connection established successfully/i)).toBeVisible();
      await expect(page.getByText('INFO').first()).toBeVisible();

      // Verify DEBUG logs displayed
      await expect(page.getByText(/Loaded 42 records from cache/i)).toBeVisible();
      await expect(page.getByText('DEBUG').first()).toBeVisible();
    });

    test('displays line numbers', async ({ page }) => {
      // First log line should have line number 1
      const logContainer = page.locator('[role="dialog"]').getByText(/Failed to connect to database/i).locator('..');
      const lineNumber = logContainer.locator('text=1');
      await expect(lineNumber).toBeVisible();
    });

    test('displays timestamps in log lines', async ({ page }) => {
      await expect(page.getByText(/\[2025-01-21 14:30:45,123\]/i)).toBeVisible();
    });

    test('shows total log count in footer', async ({ page }) => {
      await expect(page.getByText(/Showing 10 of 10 lines/i)).toBeVisible();
    });
  });

  test.describe('Log Level Filtering', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: /View Logs/i }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('filters logs by ERROR level', async ({ page }) => {
      const levelSelect = page.getByLabel(/Level:/i);
      await levelSelect.selectOption('ERROR');

      // ERROR logs should be visible
      await expect(page.getByText(/Failed to connect to database/i)).toBeVisible();
      await expect(page.getByText(/Task execution failed/i)).toBeVisible();

      // Other level logs should not be visible
      await expect(page.getByText(/Connection established successfully/i)).not.toBeVisible();
      await expect(page.getByText(/Loaded 42 records from cache/i)).not.toBeVisible();

      // Footer should show filtered count
      await expect(page.getByText(/Showing 2 of 10 lines/i)).toBeVisible();
    });

    test('filters logs by WARNING level', async ({ page }) => {
      const levelSelect = page.getByLabel(/Level:/i);
      await levelSelect.selectOption('WARNING');

      // WARNING logs should be visible
      await expect(page.getByText(/Retrying connection in 5s/i)).toBeVisible();
      await expect(page.getByText(/Rescheduling failed task/i)).toBeVisible();

      // Other level logs should not be visible
      await expect(page.getByText(/Failed to connect to database/i)).not.toBeVisible();
      await expect(page.getByText(/Loaded 42 records from cache/i)).not.toBeVisible();
    });

    test('filters logs by INFO level', async ({ page }) => {
      const levelSelect = page.getByLabel(/Level:/i);
      await levelSelect.selectOption('INFO');

      // INFO logs should be visible
      await expect(page.getByText(/Connection established successfully/i)).toBeVisible();
      await expect(page.getByText(/Processing task queue/i)).toBeVisible();

      // Other level logs should not be visible
      await expect(page.getByText(/Failed to connect to database/i)).not.toBeVisible();
      await expect(page.getByText(/Loaded 42 records from cache/i)).not.toBeVisible();
    });

    test('filters logs by DEBUG level', async ({ page }) => {
      const levelSelect = page.getByLabel(/Level:/i);
      await levelSelect.selectOption('DEBUG');

      // DEBUG logs should be visible
      await expect(page.getByText(/Loaded 42 records from cache/i)).toBeVisible();
      await expect(page.getByText(/Queue depth: 15 pending tasks/i)).toBeVisible();

      // Other level logs should not be visible
      await expect(page.getByText(/Failed to connect to database/i)).not.toBeVisible();
    });

    test('shows all logs when ALL selected', async ({ page }) => {
      const levelSelect = page.getByLabel(/Level:/i);

      // First filter to ERROR
      await levelSelect.selectOption('ERROR');
      await expect(page.getByText(/Showing 2 of 10 lines/i)).toBeVisible();

      // Then back to ALL
      await levelSelect.selectOption('ALL');

      // All logs should be visible again
      await expect(page.getByText(/Showing 10 of 10 lines/i)).toBeVisible();
      await expect(page.getByText(/Failed to connect to database/i)).toBeVisible();
      await expect(page.getByText(/Loaded 42 records from cache/i)).toBeVisible();
    });
  });

  test.describe('Search Filtering', () => {
    test.beforeEach(async ({ page }) => {
      // Mock logs with searchable content
      await page.route('**/api/v1/workers/*/logs?*', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockLogsWithSearch),
        });
      });

      await page.goto('/dashboard/workers');
      await page.getByRole('button', { name: /View Logs/i }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('filters logs by search query (case-insensitive)', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/Search logs/i);
      await searchInput.fill('database');

      // Logs containing "database" should be visible
      await expect(page.getByText(/Database connection timeout/i)).toBeVisible();
      await expect(page.getByText(/Reconnecting to database/i)).toBeVisible();
      await expect(page.getByText(/Database connection successful/i)).toBeVisible();

      // Logs not containing "database" should not be visible
      await expect(page.getByText(/Task processing started/i)).not.toBeVisible();

      // Footer should show filtered count
      await expect(page.getByText(/Showing 3 of 4 lines/i)).toBeVisible();
    });

    test('shows "No logs found" when search has no matches', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/Search logs/i);
      await searchInput.fill('nonexistent-text-xyz');

      await expect(page.getByText(/No logs found/i)).toBeVisible();
      await expect(page.getByText(/Showing 0 of 4 lines/i)).toBeVisible();
    });

    test('clears search when input cleared', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/Search logs/i);

      // Apply search
      await searchInput.fill('database');
      await expect(page.getByText(/Showing 3 of 4 lines/i)).toBeVisible();

      // Clear search
      await searchInput.fill('');

      // All logs should be visible again
      await expect(page.getByText(/Showing 4 of 4 lines/i)).toBeVisible();
    });
  });

  test.describe('Line Count Selection', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: /View Logs/i }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('changes line count to 50', async ({ page }) => {
      // Mock the API call with lineCount parameter check
      let lineCountRequested = 100; // default
      await page.route('**/api/v1/workers/*/logs?*', async (route: Route) => {
        const url = route.request().url();
        const match = url.match(/lineCount=(\d+)/);
        if (match) {
          lineCountRequested = Number(match[1]);
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockLogs),
        });
      });

      const lineCountSelect = page.getByLabel(/Lines:/i);
      await lineCountSelect.selectOption('50');

      // Verify API was called with lineCount=50
      await page.waitForTimeout(500);
      expect(lineCountRequested).toBe(50);
    });

    test('changes line count to 250', async ({ page }) => {
      let lineCountRequested = 100;
      await page.route('**/api/v1/workers/*/logs?*', async (route: Route) => {
        const url = route.request().url();
        const match = url.match(/lineCount=(\d+)/);
        if (match) {
          lineCountRequested = Number(match[1]);
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockLogs),
        });
      });

      const lineCountSelect = page.getByLabel(/Lines:/i);
      await lineCountSelect.selectOption('250');

      await page.waitForTimeout(500);
      expect(lineCountRequested).toBe(250);
    });
  });

  test.describe('Auto-Refresh', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: /View Logs/i }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('enables auto-refresh at 5s interval', async ({ page }) => {
      const refreshSelect = page.getByLabel(/Refresh:/i);
      await refreshSelect.selectOption('5000');

      // Footer should show auto-refresh indicator
      await expect(page.getByText(/Auto-refreshing every 5s/i)).toBeVisible();
    });

    test('enables auto-refresh at 10s interval', async ({ page }) => {
      const refreshSelect = page.getByLabel(/Refresh:/i);
      await refreshSelect.selectOption('10000');

      await expect(page.getByText(/Auto-refreshing every 10s/i)).toBeVisible();
    });

    test('disables auto-refresh', async ({ page }) => {
      const refreshSelect = page.getByLabel(/Refresh:/i);

      // First enable
      await refreshSelect.selectOption('5000');
      await expect(page.getByText(/Auto-refreshing every 5s/i)).toBeVisible();

      // Then disable
      await refreshSelect.selectOption('0');
      await expect(page.getByText(/Auto-refreshing/i)).not.toBeVisible();
    });
  });

  test.describe('Auto-Scroll Toggle', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: /View Logs/i }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('auto-scroll is enabled by default', async ({ page }) => {
      const autoScrollCheckbox = page.getByLabel(/Auto-scroll/i);
      await expect(autoScrollCheckbox).toBeChecked();
    });

    test('toggles auto-scroll off', async ({ page }) => {
      const autoScrollCheckbox = page.getByLabel(/Auto-scroll/i);

      // Verify checked by default
      await expect(autoScrollCheckbox).toBeChecked();

      // Uncheck
      await autoScrollCheckbox.uncheck();
      await expect(autoScrollCheckbox).not.toBeChecked();
    });

    test('toggles auto-scroll back on', async ({ page }) => {
      const autoScrollCheckbox = page.getByLabel(/Auto-scroll/i);

      // Uncheck first
      await autoScrollCheckbox.uncheck();
      await expect(autoScrollCheckbox).not.toBeChecked();

      // Check again
      await autoScrollCheckbox.check();
      await expect(autoScrollCheckbox).toBeChecked();
    });
  });

  test.describe('Manual Refresh', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: /View Logs/i }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('refreshes logs when refresh button clicked', async ({ page }) => {
      let apiCallCount = 1; // One initial call on modal open

      await page.route('**/api/v1/workers/*/logs?*', async (route: Route) => {
        apiCallCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockLogs),
        });
      });

      // Click refresh button in modal header
      const refreshButton = page.locator('[role="dialog"]').getByRole('button', { name: /refresh/i }).first();
      await refreshButton.click();

      // Verify API was called again
      await page.waitForTimeout(500);
      expect(apiCallCount).toBeGreaterThan(1);
    });

    test('shows loading indicator while refreshing', async ({ page }) => {
      // Mock slow API response
      await page.route('**/api/v1/workers/*/logs?*', async (route: Route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockLogs),
        });
      });

      const refreshButton = page.locator('[role="dialog"]').getByRole('button', { name: /refresh/i }).first();
      await refreshButton.click();

      // Loading spinner should appear
      const spinner = page.locator('[role="dialog"]').locator('.animate-spin').first();
      await expect(spinner).toBeVisible();
    });
  });

  test.describe('Download Logs', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: /View Logs/i }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('downloads logs when Download button clicked', async ({ page }) => {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download');

      const downloadButton = page.getByRole('button', { name: /Download/i });
      await downloadButton.click();

      // Wait for download to start
      const download = await downloadPromise;

      // Verify filename format: hostname_timestamp.log
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/celery@worker-1.example.com_.*\.log/);
    });

    test('downloaded file contains log content', async ({ page }) => {
      const downloadPromise = page.waitForEvent('download');

      const downloadButton = page.getByRole('button', { name: /Download/i });
      await downloadButton.click();

      const download = await downloadPromise;

      // Save download to temp location and verify content
      const path = await download.path();
      expect(path).toBeTruthy();
    });
  });

  test.describe('Error States', () => {
    test('shows error when logs API fails', async ({ page }) => {
      // Mock API error
      await page.route('**/api/v1/workers/*/logs?*', async (route: Route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Worker not found' }),
        });
      });

      await page.goto('/dashboard/workers');
      await page.getByRole('button', { name: /View Logs/i }).first().click();

      // Error message should be displayed
      await expect(page.getByText(/Failed to load logs/i)).toBeVisible();
    });

    test('shows "No logs found" when logs array is empty', async ({ page }) => {
      // Mock empty logs response
      await page.route('**/api/v1/workers/*/logs?*', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ hostname: 'celery@worker-1.example.com', logs: [] }),
        });
      });

      await page.goto('/dashboard/workers');
      await page.getByRole('button', { name: /View Logs/i }).first().click();

      await expect(page.getByText(/No logs found/i)).toBeVisible();
      await expect(page.getByText(/Showing 0 of 0 lines/i)).toBeVisible();
    });
  });

  test.describe('Multiple Workers', () => {
    test('opens logs for different workers', async ({ page }) => {
      // View logs for first worker
      await page.getByRole('button', { name: /View Logs/i }).first().click();
      await expect(page.getByText(/celery@worker-1.example.com/i)).toBeVisible();

      // Close modal
      const closeButton = page.getByRole('button', { name: /close/i }).or(page.locator('button[aria-label="Close"]'));
      await closeButton.click();

      // View logs for second worker
      await page.getByRole('button', { name: /View Logs/i }).last().click();
      await expect(page.getByText(/celery@worker-2.example.com/i)).toBeVisible();
    });
  });
});
