/**
 * Tenant BYOK Configuration E2E Tests
 *
 * Tests BYOK configuration flow: mode toggle, key validation, enable BYOK, platform keys.
 * Following Playwright v1.51.0 best practices (2025)
 *
 * Sprint 4: Testing & Quality - E2E Tests
 * Story: P1-1 BYOK Configuration UI
 */

import { test, expect } from '@playwright/test';
import type { Route } from '@playwright/test';

test.describe.configure({ mode: 'parallel' });

test.describe('Tenant BYOK Configuration', () => {
  const mockTenant = {
    id: 'tenant-123',
    name: 'Acme Corp',
    slug: 'acme-corp',
    has_virtual_key: false,
  };

  const mockValidationSuccess = {
    openai: {
      valid: true,
      models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      error: null,
    },
    anthropic: {
      valid: true,
      models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      error: null,
    },
  };

  const mockValidationOpenAIOnly = {
    openai: {
      valid: true,
      models: ['gpt-4', 'gpt-4-turbo'],
      error: null,
    },
    anthropic: {
      valid: false,
      models: [],
      error: 'Invalid API key',
    },
  };

  const mockEnableSuccess = {
    success: true,
    providers_configured: ['openai', 'anthropic'],
  };

  const mockInitPlatformKeysSuccess = {
    success: true,
  };

  test.beforeEach(async ({ page }) => {
    // Mock tenant detail
    await page.route('**/api/v1/tenants/tenant-123', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTenant),
      });
    });

    await page.goto('/dashboard/tenants/tenant-123');
    await expect(page.getByRole('heading', { name: /BYOK Configuration/i })).toBeVisible();
  });

  test.describe('Mode Selection', () => {
    test('defaults to platform mode', async ({ page }) => {
      const platformButton = page.getByRole('button', { name: /Use platform keys/i });
      const byokButton = page.getByRole('button', { name: /Use own keys \(BYOK\)/i });

      // Platform mode should have selected styling
      await expect(platformButton).toHaveClass(/border-accent-blue/);
      await expect(byokButton).not.toHaveClass(/border-accent-blue/);
    });

    test('switches to BYOK mode when BYOK button clicked', async ({ page }) => {
      const byokButton = page.getByRole('button', { name: /Use own keys \(BYOK\)/i });

      await byokButton.click();

      // BYOK mode should now have selected styling
      await expect(byokButton).toHaveClass(/border-accent-blue/);

      // BYOK configuration section should appear
      await expect(page.getByText(/You will provide your own OpenAI\/Anthropic API keys/i)).toBeVisible();
    });

    test('switches back to platform mode', async ({ page }) => {
      const platformButton = page.getByRole('button', { name: /Use platform keys/i });
      const byokButton = page.getByRole('button', { name: /Use own keys \(BYOK\)/i });

      // Switch to BYOK
      await byokButton.click();
      await expect(byokButton).toHaveClass(/border-accent-blue/);

      // Switch back to platform
      await platformButton.click();
      await expect(platformButton).toHaveClass(/border-accent-blue/);
      await expect(byokButton).not.toHaveClass(/border-accent-blue/);

      // BYOK configuration section should disappear
      await expect(page.getByText(/You will provide your own OpenAI\/Anthropic API keys/i)).not.toBeVisible();
    });
  });

  test.describe('Platform Mode', () => {
    test('shows warning when no virtual key configured', async ({ page }) => {
      await expect(page.getByText(/Platform virtual key not configured/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Initialize Platform Keys/i })).toBeVisible();
    });

    test('initializes platform keys successfully', async ({ page }) => {
      // Mock POST /api/v1/tenants/{id}/init-platform-keys
      await page.route('**/api/v1/tenants/tenant-123/init-platform-keys', async (route: Route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockInitPlatformKeysSuccess),
          });
        }
      });

      const initButton = page.getByRole('button', { name: /Initialize Platform Keys/i });
      await initButton.click();

      // Verify success toast
      await expect(page.getByText(/Platform keys initialized successfully/i)).toBeVisible({ timeout: 5000 });
    });

    test('shows error when platform keys initialization fails', async ({ page }) => {
      // Mock POST /api/v1/tenants/{id}/init-platform-keys with error
      await page.route('**/api/v1/tenants/tenant-123/init-platform-keys', async (route: Route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'LiteLLM service unavailable' }),
          });
        }
      });

      const initButton = page.getByRole('button', { name: /Initialize Platform Keys/i });
      await initButton.click();

      // Verify error toast
      await expect(page.getByText(/Failed to initialize platform keys/i)).toBeVisible({ timeout: 5000 });
    });

    test('shows success state when virtual key already configured', async ({ page }) => {
      // Mock tenant with virtual key
      await page.route('**/api/v1/tenants/tenant-123', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ...mockTenant, has_virtual_key: true }),
        });
      });

      await page.goto('/dashboard/tenants/tenant-123');

      await expect(page.getByText(/Using platform-managed API keys for all LLM calls/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Initialize Platform Keys/i })).not.toBeVisible();
    });
  });

  test.describe('BYOK Mode - Key Input', () => {
    test.beforeEach(async ({ page }) => {
      // Switch to BYOK mode
      await page.getByRole('button', { name: /Use own keys \(BYOK\)/i }).click();
    });

    test('accepts OpenAI key input', async ({ page }) => {
      const openaiInput = page.getByLabel(/OpenAI API Key/i);
      await openaiInput.fill('sk-test-openai-key-12345');

      await expect(openaiInput).toHaveValue('sk-test-openai-key-12345');
    });

    test('accepts Anthropic key input', async ({ page }) => {
      const anthropicInput = page.getByLabel(/Anthropic API Key/i);
      await anthropicInput.fill('sk-ant-test-anthropic-key-67890');

      await expect(anthropicInput).toHaveValue('sk-ant-test-anthropic-key-67890');
    });

    test('shows password field type for security', async ({ page }) => {
      const openaiInput = page.getByLabel(/OpenAI API Key/i);
      const anthropicInput = page.getByLabel(/Anthropic API Key/i);

      await expect(openaiInput).toHaveAttribute('type', 'password');
      await expect(anthropicInput).toHaveAttribute('type', 'password');
    });
  });

  test.describe('BYOK Mode - Key Validation', () => {
    test.beforeEach(async ({ page }) => {
      // Switch to BYOK mode
      await page.getByRole('button', { name: /Use own keys \(BYOK\)/i }).click();
    });

    test('validates OpenAI key format (must start with sk-)', async ({ page }) => {
      await page.getByLabel(/OpenAI API Key/i).fill('invalid-key-format');

      const testButton = page.getByRole('button', { name: /Test Keys/i });
      await testButton.click();

      await expect(page.getByText(/OpenAI key must start with "sk-"/i)).toBeVisible({ timeout: 5000 });
    });

    test('validates Anthropic key format (must start with sk-ant-)', async ({ page }) => {
      await page.getByLabel(/Anthropic API Key/i).fill('sk-invalid-format');

      const testButton = page.getByRole('button', { name: /Test Keys/i });
      await testButton.click();

      await expect(page.getByText(/Anthropic key must start with "sk-ant-"/i)).toBeVisible({ timeout: 5000 });
    });

    test('requires at least one API key', async ({ page }) => {
      const testButton = page.getByRole('button', { name: /Test Keys/i });
      await testButton.click();

      await expect(page.getByText(/Provide at least one API key/i)).toBeVisible({ timeout: 5000 });
    });

    test('tests OpenAI key successfully', async ({ page }) => {
      // Mock POST /api/v1/tenants/{id}/test-byok-keys
      await page.route('**/api/v1/tenants/tenant-123/test-byok-keys', async (route: Route) => {
        if (route.request().method() === 'POST') {
          const payload = route.request().postDataJSON();
          expect(payload.openai_key).toBe('sk-test-openai-key-12345');

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              openai: mockValidationSuccess.openai,
            }),
          });
        }
      });

      await page.getByLabel(/OpenAI API Key/i).fill('sk-test-openai-key-12345');

      const testButton = page.getByRole('button', { name: /Test Keys/i });
      await testButton.click();

      // Verify success toast
      await expect(page.getByText(/Keys validated successfully/i)).toBeVisible({ timeout: 5000 });

      // Verify validation results displayed
      await expect(page.getByText(/OpenAI Valid/i)).toBeVisible();
      await expect(page.getByText(/3 models available/i)).toBeVisible();
      await expect(page.getByText(/gpt-4/i)).toBeVisible();
    });

    test('tests both OpenAI and Anthropic keys successfully', async ({ page }) => {
      // Mock POST /api/v1/tenants/{id}/test-byok-keys
      await page.route('**/api/v1/tenants/tenant-123/test-byok-keys', async (route: Route) => {
        if (route.request().method() === 'POST') {
          const payload = route.request().postDataJSON();
          expect(payload.openai_key).toBe('sk-test-openai-key-12345');
          expect(payload.anthropic_key).toBe('sk-ant-test-anthropic-key-67890');

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockValidationSuccess),
          });
        }
      });

      await page.getByLabel(/OpenAI API Key/i).fill('sk-test-openai-key-12345');
      await page.getByLabel(/Anthropic API Key/i).fill('sk-ant-test-anthropic-key-67890');

      const testButton = page.getByRole('button', { name: /Test Keys/i });
      await testButton.click();

      // Verify success toast
      await expect(page.getByText(/Keys validated successfully/i)).toBeVisible({ timeout: 5000 });

      // Verify both validation results displayed
      await expect(page.getByText(/OpenAI Valid/i)).toBeVisible();
      await expect(page.getByText(/Anthropic Valid/i)).toBeVisible();
    });

    test('shows error when key validation fails', async ({ page }) => {
      // Mock POST /api/v1/tenants/{id}/test-byok-keys with error
      await page.route('**/api/v1/tenants/tenant-123/test-byok-keys', async (route: Route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'Invalid API key' }),
          });
        }
      });

      await page.getByLabel(/OpenAI API Key/i).fill('sk-invalid-key');

      const testButton = page.getByRole('button', { name: /Test Keys/i });
      await testButton.click();

      // Verify error toast
      await expect(page.getByText(/Failed to test keys/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/Invalid API key/i)).toBeVisible();
    });

    test('shows partial success when one key fails', async ({ page }) => {
      // Mock POST /api/v1/tenants/{id}/test-byok-keys
      await page.route('**/api/v1/tenants/tenant-123/test-byok-keys', async (route: Route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockValidationOpenAIOnly),
          });
        }
      });

      await page.getByLabel(/OpenAI API Key/i).fill('sk-valid-openai-key');
      await page.getByLabel(/Anthropic API Key/i).fill('sk-ant-invalid-anthropic-key');

      const testButton = page.getByRole('button', { name: /Test Keys/i });
      await testButton.click();

      // Verify success toast (at least one key valid)
      await expect(page.getByText(/Keys validated successfully/i)).toBeVisible({ timeout: 5000 });

      // Verify validation results
      await expect(page.getByText(/OpenAI Valid/i)).toBeVisible();
      await expect(page.getByText(/Anthropic Invalid/i)).toBeVisible();
      await expect(page.getByText(/Invalid API key/i)).toBeVisible();
    });
  });

  test.describe('BYOK Mode - Enable BYOK', () => {
    test.beforeEach(async ({ page }) => {
      // Switch to BYOK mode
      await page.getByRole('button', { name: /Use own keys \(BYOK\)/i }).click();

      // Mock successful validation
      await page.route('**/api/v1/tenants/tenant-123/test-byok-keys', async (route: Route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockValidationSuccess),
          });
        }
      });
    });

    test('Save button appears only after successful validation', async ({ page }) => {
      // Save button should not be visible initially
      await expect(page.getByRole('button', { name: /Save BYOK Configuration/i })).not.toBeVisible();

      // Enter keys and test
      await page.getByLabel(/OpenAI API Key/i).fill('sk-test-openai-key-12345');
      const testButton = page.getByRole('button', { name: /Test Keys/i });
      await testButton.click();

      // Wait for validation success
      await expect(page.getByText(/Keys validated successfully/i)).toBeVisible({ timeout: 5000 });

      // Save button should now be visible
      await expect(page.getByRole('button', { name: /Save BYOK Configuration/i })).toBeVisible();
    });

    test('enables BYOK successfully', async ({ page }) => {
      // Mock POST /api/v1/tenants/{id}/enable-byok
      await page.route('**/api/v1/tenants/tenant-123/enable-byok', async (route: Route) => {
        if (route.request().method() === 'POST') {
          const payload = route.request().postDataJSON();
          expect(payload.openai_key).toBe('sk-test-openai-key-12345');
          expect(payload.anthropic_key).toBe('sk-ant-test-anthropic-key-67890');

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockEnableSuccess),
          });
        }
      });

      // Enter and validate keys
      await page.getByLabel(/OpenAI API Key/i).fill('sk-test-openai-key-12345');
      await page.getByLabel(/Anthropic API Key/i).fill('sk-ant-test-anthropic-key-67890');

      await page.getByRole('button', { name: /Test Keys/i }).click();
      await expect(page.getByText(/Keys validated successfully/i)).toBeVisible({ timeout: 5000 });

      // Enable BYOK
      const saveButton = page.getByRole('button', { name: /Save BYOK Configuration/i });
      await saveButton.click();

      // Verify success toast
      await expect(page.getByText(/BYOK enabled successfully/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/Configured providers: openai, anthropic/i)).toBeVisible();
    });

    test('shows error when BYOK enable fails', async ({ page }) => {
      // Mock POST /api/v1/tenants/{id}/enable-byok with error
      await page.route('**/api/v1/tenants/tenant-123/enable-byok', async (route: Route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'Failed to create LiteLLM virtual key' }),
          });
        }
      });

      // Enter and validate keys
      await page.getByLabel(/OpenAI API Key/i).fill('sk-test-openai-key-12345');

      await page.getByRole('button', { name: /Test Keys/i }).click();
      await expect(page.getByText(/Keys validated successfully/i)).toBeVisible({ timeout: 5000 });

      // Attempt to enable BYOK
      const saveButton = page.getByRole('button', { name: /Save BYOK Configuration/i });
      await saveButton.click();

      // Verify error toast
      await expect(page.getByText(/Failed to enable BYOK/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/Failed to create LiteLLM virtual key/i)).toBeVisible();
    });

    test('resets form after successful BYOK enable', async ({ page }) => {
      // Mock POST /api/v1/tenants/{id}/enable-byok
      await page.route('**/api/v1/tenants/tenant-123/enable-byok', async (route: Route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockEnableSuccess),
          });
        }
      });

      // Enter and validate keys
      await page.getByLabel(/OpenAI API Key/i).fill('sk-test-openai-key-12345');

      await page.getByRole('button', { name: /Test Keys/i }).click();
      await expect(page.getByText(/Keys validated successfully/i)).toBeVisible({ timeout: 5000 });

      // Enable BYOK
      await page.getByRole('button', { name: /Save BYOK Configuration/i }).click();
      await expect(page.getByText(/BYOK enabled successfully/i)).toBeVisible({ timeout: 5000 });

      // Verify form reset
      await expect(page.getByLabel(/OpenAI API Key/i)).toHaveValue('');
      await expect(page.getByRole('button', { name: /Save BYOK Configuration/i })).not.toBeVisible();
    });
  });

  test.describe('BYOK Mode - Loading States', () => {
    test.beforeEach(async ({ page }) => {
      // Switch to BYOK mode
      await page.getByRole('button', { name: /Use own keys \(BYOK\)/i }).click();
    });

    test('shows loading state while testing keys', async ({ page }) => {
      // Mock slow validation response
      await page.route('**/api/v1/tenants/tenant-123/test-byok-keys', async (route: Route) => {
        if (route.request().method() === 'POST') {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockValidationSuccess),
          });
        }
      });

      await page.getByLabel(/OpenAI API Key/i).fill('sk-test-openai-key-12345');

      const testButton = page.getByRole('button', { name: /Test Keys/i });
      await testButton.click();

      // Verify button shows loading state
      await expect(testButton).toBeDisabled();
    });

    test('shows loading state while enabling BYOK', async ({ page }) => {
      // Mock successful validation
      await page.route('**/api/v1/tenants/tenant-123/test-byok-keys', async (route: Route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockValidationSuccess),
          });
        }
      });

      // Mock slow enable response
      await page.route('**/api/v1/tenants/tenant-123/enable-byok', async (route: Route) => {
        if (route.request().method() === 'POST') {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockEnableSuccess),
          });
        }
      });

      // Enter and validate keys
      await page.getByLabel(/OpenAI API Key/i).fill('sk-test-openai-key-12345');
      await page.getByRole('button', { name: /Test Keys/i }).click();
      await expect(page.getByText(/Keys validated successfully/i)).toBeVisible({ timeout: 5000 });

      // Enable BYOK
      const saveButton = page.getByRole('button', { name: /Save BYOK Configuration/i });
      await saveButton.click();

      // Verify button shows loading state
      await expect(saveButton).toBeDisabled();
    });
  });
});
