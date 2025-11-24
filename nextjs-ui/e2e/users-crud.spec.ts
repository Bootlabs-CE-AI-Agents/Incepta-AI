/**
 * End-to-End Tests for User CRUD Workflows
 *
 * Tests AC-4 (Create User Flow) and AC-5 (Edit User Flow)
 * Covers:
 * - Full create user workflow (fill form → submit → navigate to list)
 * - Full edit user workflow (load user → edit → save → success toast)
 * - Error scenarios (409 email exists, 400 validation, 403 forbidden)
 * - Cancel with unsaved changes confirmation
 */

import { test, expect } from '@playwright/test';

test.describe('User CRUD Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Assume authentication is handled via session/cookie
    // Navigate to users list page
    await page.goto('/dashboard/users');
  });

  test.describe('Create User Flow (AC-4)', () => {
    test('should create user successfully with all required fields', async ({ page }) => {
      // Click "Create User" button from list page
      await page.click('text=Create User');

      // Verify navigation to create page
      await expect(page).toHaveURL('/dashboard/users/new');
      await expect(page.locator('h1')).toContainText('Create New User');

      // Fill out form with valid data (using timestamp for unique email)
      const timestamp = Date.now();
      await page.fill('input[name="email"]', `newuser${timestamp}@example.com`);
      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
      await page.fill('input[name="full_name"]', 'Test User');

      // Select tenant (assumes at least one tenant exists)
      await page.selectOption('select[name="default_tenant_id"]', { index: 1 });

      // Select role
      await page.selectOption('select[name="initial_role"]', 'developer');

      // Force password change and Is Active should be checked by default
      await expect(page.locator('input[name="force_password_change"]')).toBeChecked();
      await expect(page.locator('input[name="is_active"]')).toBeChecked();

      // Submit form
      await page.click('button[type="submit"]');

      // Verify loading state
      await expect(page.locator('button[type="submit"]')).toContainText('Creating...');
      await expect(page.locator('button[type="submit"]')).toBeDisabled();

      // Verify success: Navigate to list page
      await expect(page).toHaveURL('/dashboard/users', { timeout: 10000 });

      // Verify success toast appears
      await expect(page.locator('text=/User created successfully/i')).toBeVisible({ timeout: 5000 });
    });

    test('should show validation errors for invalid fields', async ({ page }) => {
      await page.goto('/dashboard/users/new');

      // Try to submit empty form
      await page.click('button[type="submit"]');

      // Verify validation errors appear
      await expect(page.locator('text=/Email is required/i')).toBeVisible();
      await expect(page.locator('text=/Password is required/i')).toBeVisible();

      // Fill invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      await page.blur('input[name="email"]');
      await expect(page.locator('text=/Please enter a valid email address/i')).toBeVisible();

      // Fill weak password
      await page.fill('input[name="password"]', 'weak');
      await page.blur('input[name="password"]');
      await expect(page.locator('text=/Password must be at least 8 characters/i')).toBeVisible();
    });

    test('should show password match error when passwords differ', async ({ page }) => {
      await page.goto('/dashboard/users/new');

      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.fill('input[name="confirmPassword"]', 'DifferentPass123!');
      await page.blur('input[name="confirmPassword"]');

      await expect(page.locator('text=/Passwords do not match/i')).toBeVisible();
    });

    test('should handle 409 Conflict error (email already exists)', async ({ page }) => {
      // This test assumes you have a way to mock API responses or an existing user
      await page.goto('/dashboard/users/new');

      // Fill form with existing email (adjust based on your test data)
      await page.fill('input[name="email"]', 'existing@example.com');
      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
      await page.selectOption('select[name="default_tenant_id"]', { index: 1 });
      await page.selectOption('select[name="initial_role"]', 'developer');

      await page.click('button[type="submit"]');

      // Verify 409 error message appears inline on email field
      await expect(page.locator('text=/Email already exists/i')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Edit User Flow (AC-5)', () => {
    test('should load user data and allow editing', async ({ page }) => {
      // Assume we have at least one user in the list
      await page.goto('/dashboard/users');

      // Click "Edit" button on first user (adjust selector based on your table structure)
      await page.click('button[aria-label="Edit user"]:first-of-type');

      // Verify navigation to edit page
      await expect(page).toHaveURL(/\/dashboard\/users\/[^/]+\/edit/);
      await expect(page.locator('h1')).toContainText('Edit User:');

      // Verify form is pre-populated with user data
      const emailInput = page.locator('input[name="email"]');
      await expect(emailInput).not.toBeEmpty();

      // Verify password fields are NOT present (AC-2)
      await expect(page.locator('input[name="password"]')).not.toBeVisible();
      await expect(page.locator('input[name="confirmPassword"]')).not.toBeVisible();

      // Modify full name
      await page.fill('input[name="full_name"]', 'Updated Name');

      // Submit form
      await page.click('button[type="submit"]');

      // Verify loading state
      await expect(page.locator('button[type="submit"]')).toContainText('Saving...');

      // Verify success toast appears
      await expect(page.locator('text=/User updated successfully/i')).toBeVisible({ timeout: 5000 });

      // Verify we stay on edit page (not navigate away)
      await expect(page).toHaveURL(/\/dashboard\/users\/[^/]+\/edit/);
    });

    test('should show 404 error and redirect for non-existent user', async ({ page }) => {
      // Navigate to edit page with non-existent user ID
      await page.goto('/dashboard/users/00000000-0000-0000-0000-000000000000/edit');

      // Verify redirect to list page with error toast
      await expect(page).toHaveURL('/dashboard/users', { timeout: 5000 });
      await expect(page.locator('text=/User not found/i')).toBeVisible();
    });
  });

  test.describe('Cancel and Navigation (AC-7)', () => {
    test('should navigate away immediately if form is pristine', async ({ page }) => {
      await page.goto('/dashboard/users/new');

      // Click Cancel without making any changes
      await page.click('text=Cancel');

      // Should navigate immediately without confirmation
      await expect(page).toHaveURL('/dashboard/users');
    });

    test('should show confirmation dialog when canceling with unsaved changes', async ({ page }) => {
      await page.goto('/dashboard/users/new');

      // Make a change to mark form as dirty
      await page.fill('input[name="email"]', 'test@example.com');

      // Set up dialog handler before clicking cancel
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('unsaved changes');
        await dialog.dismiss(); // Stay on page
      });

      // Click Cancel
      await page.click('text=Cancel');

      // Verify we're still on the create page
      await expect(page).toHaveURL('/dashboard/users/new');
    });

    test('should navigate away when confirming unsaved changes dialog', async ({ page }) => {
      await page.goto('/dashboard/users/new');

      // Make a change
      await page.fill('input[name="email"]', 'test@example.com');

      // Set up dialog handler to accept
      page.on('dialog', async dialog => {
        await dialog.accept(); // Leave without saving
      });

      // Click Cancel
      await page.click('text=Cancel');

      // Verify navigation to list page
      await expect(page).toHaveURL('/dashboard/users');
    });

    test('should show beforeunload confirmation on browser back with dirty form', async ({ page }) => {
      await page.goto('/dashboard/users/new');

      // Make a change to mark form as dirty
      await page.fill('input[name="email"]', 'test@example.com');

      // Set up beforeunload handler
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('beforeunload');
        await dialog.dismiss();
      });

      // Try to navigate back
      await page.goBack();

      // Verify we're still on the create page
      await expect(page).toHaveURL('/dashboard/users/new');
    });
  });

  test.describe('Password Strength Indicator (AC-3)', () => {
    test('should show password strength indicator for weak password', async ({ page }) => {
      await page.goto('/dashboard/users/new');

      await page.fill('input[name="password"]', 'weak123');

      // Verify weak strength indicator
      await expect(page.locator('text=/Weak/i')).toBeVisible();
    });

    test('should show strong indicator for complex password', async ({ page }) => {
      await page.goto('/dashboard/users/new');

      await page.fill('input[name="password"]', 'SecurePass123!@#');

      // Verify strong strength indicator
      await expect(page.locator('text=/Strong/i')).toBeVisible();
    });
  });

  test.describe('Accessibility (AC-9)', () => {
    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/dashboard/users/new');

      // Tab through form fields
      await page.keyboard.press('Tab'); // Email
      await page.keyboard.type('test@example.com');

      await page.keyboard.press('Tab'); // Password
      await page.keyboard.type('SecurePass123!');

      await page.keyboard.press('Tab'); // Confirm Password
      await page.keyboard.type('SecurePass123!');

      await page.keyboard.press('Tab'); // Full Name
      await page.keyboard.type('Test User');

      // Verify all fields are filled via keyboard
      await expect(page.locator('input[name="email"]')).toHaveValue('test@example.com');
      await expect(page.locator('input[name="password"]')).toHaveValue('SecurePass123!');
      await expect(page.locator('input[name="full_name"]')).toHaveValue('Test User');
    });

    test('should submit form with Enter key', async ({ page }) => {
      await page.goto('/dashboard/users/new');

      const timestamp = Date.now();
      // Fill minimal required fields
      await page.fill('input[name="email"]', `keyboard${timestamp}@example.com`);
      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
      await page.selectOption('select[name="default_tenant_id"]', { index: 1 });

      // Press Enter on last field
      await page.locator('input[name="confirmPassword"]').press('Enter');

      // Verify form submits
      await expect(page).toHaveURL('/dashboard/users', { timeout: 10000 });
    });
  });
});
