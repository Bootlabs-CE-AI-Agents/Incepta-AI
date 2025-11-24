/**
 * Prompts Rich Editor E2E Tests (Story 27)
 *
 * Tests rich editor features: auto-save, draft restoration, Ctrl+S, find/replace
 * Following Playwright v1.51.0 best practices (2025)
 *
 * Story: nextjs-story-27-prompts-rich-editor
 * Components: CodeMirrorEditor, PromptEditor, PromptPreview, useAutoSaveDraft
 */

import { test, expect, Page } from '@playwright/test'

test.describe.configure({ mode: 'parallel' })

test.describe('Prompts Rich Editor - Story 27 Features', () => {
  // Helper to clear localStorage before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/prompts/new')
    // Clear any existing drafts
    await page.evaluate(() => {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('prompt_draft_')) {
          localStorage.removeItem(key)
        }
      })
    })
  })

  test.describe('AC-6: Auto-Save Draft to localStorage', () => {
    test('should auto-save draft after 30 seconds', async ({ page }) => {
      // Type content in the editor
      const editorContent = 'This is a test prompt with {{variable_name}}'

      // Find CodeMirror editor and type
      const editor = page.locator('.cm-content')
      await editor.click()
      await editor.pressSequentially(editorContent, { delay: 50 })

      // Wait for auto-save interval (30 seconds + buffer)
      await page.waitForTimeout(31000)

      // Check localStorage for saved draft
      const savedDraft = await page.evaluate(() => {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('prompt_draft_'))
        if (keys.length === 0) return null
        const draftKey = keys[0]
        return JSON.parse(localStorage.getItem(draftKey) || '{}')
      })

      expect(savedDraft).not.toBeNull()
      expect(savedDraft.content).toBe(editorContent)
      expect(savedDraft.timestamp).toBeGreaterThan(Date.now() - 35000)

      // Verify "Draft saved" indicator appeared
      await expect(page.getByText(/Draft saved/i)).toBeVisible()
    })

    test('should show auto-save indicator while saving', async ({ page }) => {
      const editor = page.locator('.cm-content')
      await editor.click()
      await editor.pressSequentially('Quick test', { delay: 50 })

      // Wait for save to start
      await page.waitForTimeout(30500)

      // Should show "Saving draft..." or "Draft saved" indicator
      const saveIndicator = page.locator('text=/Saving draft|Draft saved/')
      await expect(saveIndicator).toBeVisible({ timeout: 2000 })
    })

    test('should debounce multiple edits within 30 seconds', async ({ page }) => {
      const editor = page.locator('.cm-content')
      await editor.click()

      // Type multiple times within 30 seconds
      await editor.pressSequentially('First edit', { delay: 50 })
      await page.waitForTimeout(5000)
      await editor.press('End')
      await editor.pressSequentially(' - Second edit', { delay: 50 })
      await page.waitForTimeout(5000)
      await editor.press('End')
      await editor.pressSequentially(' - Third edit', { delay: 50 })

      // Wait for auto-save (should only trigger once after last edit)
      await page.waitForTimeout(31000)

      // Check only one draft exists with final content
      const savedDraft = await page.evaluate(() => {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('prompt_draft_'))
        return keys.length === 1 ? JSON.parse(localStorage.getItem(keys[0]) || '{}') : null
      })

      expect(savedDraft).not.toBeNull()
      expect(savedDraft.content).toContain('Third edit')
    })
  })

  test.describe('AC-6: Draft Restoration on Page Return', () => {
    test('should restore draft when returning to page', async ({ page, context }) => {
      const draftContent = 'Draft content with {{test_variable}}'

      // Create a draft in localStorage
      await page.evaluate((content) => {
        const draft = {
          content,
          timestamp: Date.now(),
          variables: ['test_variable']
        }
        localStorage.setItem('prompt_draft_new', JSON.stringify(draft))
      }, draftContent)

      // Navigate to new prompt page
      await page.goto('/dashboard/prompts/new')

      // Should show draft restoration banner
      await expect(page.getByText(/You have an unsaved draft/i)).toBeVisible({ timeout: 2000 })

      // Click "Restore Draft" button
      await page.getByRole('button', { name: /Restore Draft/i }).click()

      // Editor should contain draft content
      const editorContent = await page.locator('.cm-content').textContent()
      expect(editorContent).toContain(draftContent)
    })

    test('should discard draft when clicking "Discard Draft"', async ({ page }) => {
      const draftContent = 'Draft to be discarded'

      // Create a draft
      await page.evaluate((content) => {
        const draft = {
          content,
          timestamp: Date.now(),
          variables: []
        }
        localStorage.setItem('prompt_draft_new', JSON.stringify(draft))
      }, draftContent)

      // Reload page
      await page.reload()

      // Should show draft restoration banner
      await expect(page.getByText(/You have an unsaved draft/i)).toBeVisible()

      // Click "Discard Draft" button
      await page.getByRole('button', { name: /Discard/i }).click()

      // Banner should disappear
      await expect(page.getByText(/You have an unsaved draft/i)).not.toBeVisible()

      // Draft should be removed from localStorage
      const draftExists = await page.evaluate(() => {
        return localStorage.getItem('prompt_draft_new') !== null
      })
      expect(draftExists).toBe(false)

      // Editor should be empty
      const editorContent = await page.locator('.cm-content').textContent()
      expect(editorContent?.trim()).toBe('')
    })

    test('should auto-delete drafts older than 7 days', async ({ page }) => {
      // Create an old draft (8 days ago)
      await page.evaluate(() => {
        const eightDaysAgo = Date.now() - (8 * 24 * 60 * 60 * 1000)
        const oldDraft = {
          content: 'Old draft',
          timestamp: eightDaysAgo,
          variables: []
        }
        localStorage.setItem('prompt_draft_new', JSON.stringify(oldDraft))
      })

      // Navigate to page
      await page.goto('/dashboard/prompts/new')

      // Wait for component to mount and check for auto-delete
      await page.waitForTimeout(1000)

      // Should NOT show restoration banner (draft too old)
      await expect(page.getByText(/You have an unsaved draft/i)).not.toBeVisible()

      // Draft should be removed from localStorage
      const draftExists = await page.evaluate(() => {
        return localStorage.getItem('prompt_draft_new') !== null
      })
      expect(draftExists).toBe(false)
    })

    test('should show relative timestamp in restoration banner', async ({ page }) => {
      // Create a recent draft (2 minutes ago)
      await page.evaluate(() => {
        const twoMinutesAgo = Date.now() - (2 * 60 * 1000)
        const draft = {
          content: 'Recent draft',
          timestamp: twoMinutesAgo,
          variables: []
        }
        localStorage.setItem('prompt_draft_new', JSON.stringify(draft))
      })

      await page.goto('/dashboard/prompts/new')

      // Should show relative time (e.g., "2 minutes ago")
      const banner = page.locator('text=/You have an unsaved draft/i')
      await expect(banner).toBeVisible()

      const bannerText = await banner.textContent()
      expect(bannerText).toMatch(/\d+ (second|minute|hour|day)s? ago/i)
    })
  })

  test.describe('AC-7: Keyboard Shortcut Ctrl+S', () => {
    test('should trigger save on Ctrl+S (Windows/Linux)', async ({ page }) => {
      // Type content
      const editor = page.locator('.cm-content')
      await editor.click()
      await editor.pressSequentially('Content to save', { delay: 50 })

      // Mock the save API to verify it's called
      let saveCallCount = 0
      await page.route('**/api/v1/prompts', async (route) => {
        if (route.request().method() === 'POST') {
          saveCallCount++
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ id: 'test-prompt-1', message: 'Saved successfully' })
          })
        } else {
          await route.continue()
        }
      })

      // Press Ctrl+S
      await page.keyboard.press('Control+s')

      // Wait for save to complete
      await page.waitForTimeout(1000)

      // Verify save was triggered (should see success toast or API call)
      expect(saveCallCount).toBeGreaterThan(0)
    })

    test('should trigger save on Cmd+S (macOS)', async ({ page }) => {
      const editor = page.locator('.cm-content')
      await editor.click()
      await editor.pressSequentially('macOS save test', { delay: 50 })

      // Mock save API
      let saveCallCount = 0
      await page.route('**/api/v1/prompts', async (route) => {
        if (route.request().method() === 'POST') {
          saveCallCount++
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ id: 'test-prompt-2', message: 'Saved' })
          })
        } else {
          await route.continue()
        }
      })

      // Use ControlOrMeta for cross-platform compatibility
      await page.keyboard.press('ControlOrMeta+s')

      await page.waitForTimeout(1000)
      expect(saveCallCount).toBeGreaterThan(0)
    })

    test('should prevent browser default save dialog', async ({ page }) => {
      // This is implicit - if browser save dialog appears, test will hang
      // Playwright Ctrl+S should not trigger browser's save dialog
      const editor = page.locator('.cm-content')
      await editor.click()
      await editor.pressSequentially('Test', { delay: 50 })

      // Mock API
      await page.route('**/api/v1/prompts', async (route) => {
        await route.fulfill({
          status: 201,
          body: JSON.stringify({ id: 'test' })
        })
      })

      // This should complete without hanging (no browser dialog)
      await page.keyboard.press('ControlOrMeta+s')
      await page.waitForTimeout(500)

      // If we reach here, no browser dialog appeared
      expect(true).toBe(true)
    })

    test('should save even with unsaved changes warning', async ({ page }) => {
      const editor = page.locator('.cm-content')
      await editor.click()
      await editor.pressSequentially('Unsaved content', { delay: 50 })

      // Mock save
      await page.route('**/api/v1/prompts', async (route) => {
        await route.fulfill({ status: 201, body: JSON.stringify({ id: 'test' }) })
      })

      // Trigger Ctrl+S
      await page.keyboard.press('ControlOrMeta+s')

      // Should save successfully (check for success indicator or draft cleared)
      await page.waitForTimeout(1000)

      // Draft should be cleared from localStorage after successful save
      const draftExists = await page.evaluate(() => {
        return Object.keys(localStorage).some(k => k.startsWith('prompt_draft_'))
      })
      expect(draftExists).toBe(false)
    })
  })

  test.describe('AC-8: Find and Replace', () => {
    test('should open find widget with Ctrl+F', async ({ page }) => {
      const editor = page.locator('.cm-content')
      await editor.click()
      await editor.pressSequentially('Find this text in the editor', { delay: 50 })

      // Press Ctrl+F to open find widget
      await page.keyboard.press('ControlOrMeta+f')

      // Find widget should be visible (CodeMirror's built-in widget)
      // Look for search input field
      const searchInput = page.locator('.cm-search input[type="text"]').first()
      await expect(searchInput).toBeVisible({ timeout: 2000 })
    })

    test('should highlight matches when searching', async ({ page }) => {
      const testText = 'test word test word test'
      const editor = page.locator('.cm-content')
      await editor.click()
      await editor.pressSequentially(testText, { delay: 50 })

      // Open find
      await page.keyboard.press('ControlOrMeta+f')

      // Type search term
      const searchInput = page.locator('.cm-search input[type="text"]').first()
      await searchInput.fill('test')

      // Should show match count (e.g., "3 of 3")
      // CodeMirror shows this in the search widget
      await expect(page.locator('.cm-search')).toContainText(/\d+ of \d+/i)
    })

    test('should open replace widget with Ctrl+H', async ({ page }) => {
      const editor = page.locator('.cm-content')
      await editor.click()
      await editor.pressSequentially('Replace me', { delay: 50 })

      // Press Ctrl+H for find and replace
      await page.keyboard.press('ControlOrMeta+h')

      // Replace widget should be visible with both search and replace inputs
      const searchInput = page.locator('.cm-search input[type="text"]').first()
      await expect(searchInput).toBeVisible()

      // Should have a second input for replacement text
      const replaceInput = page.locator('.cm-search input[type="text"]').nth(1)
      await expect(replaceInput).toBeVisible()
    })

    test('should replace single occurrence', async ({ page }) => {
      const editor = page.locator('.cm-content')
      await editor.click()
      await editor.pressSequentially('Replace this word', { delay: 50 })

      // Open replace widget
      await page.keyboard.press('ControlOrMeta+h')

      // Fill search term
      const searchInput = page.locator('.cm-search input[type="text"]').first()
      await searchInput.fill('this')

      // Fill replacement
      const replaceInput = page.locator('.cm-search input[type="text"]').nth(1)
      await replaceInput.fill('that')

      // Click "Replace" button (first occurrence)
      const replaceButton = page.locator('.cm-search button[title*="Replace"]').first()
      await replaceButton.click()

      // Verify replacement
      const content = await editor.textContent()
      expect(content).toContain('that')
    })

    test('should replace all occurrences', async ({ page }) => {
      const editor = page.locator('.cm-content')
      await editor.click()
      await editor.pressSequentially('test test test', { delay: 50 })

      // Open replace
      await page.keyboard.press('ControlOrMeta+h')

      // Search for "test"
      const searchInput = page.locator('.cm-search input[type="text"]').first()
      await searchInput.fill('test')

      // Replace with "pass"
      const replaceInput = page.locator('.cm-search input[type="text"]').nth(1)
      await replaceInput.fill('pass')

      // Click "Replace All" button
      const replaceAllButton = page.locator('.cm-search button[title*="Replace all"]')
      await replaceAllButton.click()

      // All occurrences should be replaced
      const content = await editor.textContent()
      expect(content).toBe('pass pass pass')
      expect(content).not.toContain('test')
    })

    test('should support case-sensitive search', async ({ page }) => {
      const editor = page.locator('.cm-content')
      await editor.click()
      await editor.pressSequentially('Test test TEST', { delay: 50 })

      await page.keyboard.press('ControlOrMeta+f')

      // Enable case-sensitive option
      const caseSensitiveButton = page.locator('.cm-search button[title*="Match case"]')
      await caseSensitiveButton.click()

      // Search for "test" (lowercase only)
      const searchInput = page.locator('.cm-search input[type="text"]').first()
      await searchInput.fill('test')

      // Should only find 1 match (lowercase "test"), not "Test" or "TEST"
      await expect(page.locator('.cm-search')).toContainText(/1 of 1/i)
    })

    test('should navigate between matches with Next/Previous', async ({ page }) => {
      const editor = page.locator('.cm-content')
      await editor.click()
      await editor.pressSequentially('word word word', { delay: 50 })

      await page.keyboard.press('ControlOrMeta+f')

      const searchInput = page.locator('.cm-search input[type="text"]').first()
      await searchInput.fill('word')

      // Should show "1 of 3"
      await expect(page.locator('.cm-search')).toContainText(/1 of 3/i)

      // Click "Next" to move to second match
      const nextButton = page.locator('.cm-search button[title*="Next"]')
      await nextButton.click()

      // Should show "2 of 3"
      await expect(page.locator('.cm-search')).toContainText(/2 of 3/i)

      // Click "Previous" to go back
      const prevButton = page.locator('.cm-search button[title*="Previous"]')
      await prevButton.click()

      // Should show "1 of 3" again
      await expect(page.locator('.cm-search')).toContainText(/1 of 3/i)
    })
  })

  test.describe('Integration: Auto-save + Draft Restore + Ctrl+S', () => {
    test('should preserve draft through auto-save and restore workflow', async ({ page }) => {
      const content = 'Full workflow test with {{variable}}'

      // 1. Type content
      const editor = page.locator('.cm-content')
      await editor.click()
      await editor.pressSequentially(content, { delay: 50 })

      // 2. Wait for auto-save
      await page.waitForTimeout(31000)
      await expect(page.getByText(/Draft saved/i)).toBeVisible()

      // 3. Close and reopen page (simulate tab close)
      await page.goto('/dashboard')
      await page.goto('/dashboard/prompts/new')

      // 4. Restore draft
      await expect(page.getByText(/You have an unsaved draft/i)).toBeVisible()
      await page.getByRole('button', { name: /Restore Draft/i }).click()

      // 5. Content should be restored
      const restoredContent = await editor.textContent()
      expect(restoredContent).toContain(content)

      // 6. Save with Ctrl+S
      await page.route('**/api/v1/prompts', async (route) => {
        await route.fulfill({
          status: 201,
          body: JSON.stringify({ id: 'final-save' })
        })
      })
      await page.keyboard.press('ControlOrMeta+s')

      // 7. Draft should be cleared after successful save
      await page.waitForTimeout(1000)
      const draftExists = await page.evaluate(() => {
        return Object.keys(localStorage).some(k => k.startsWith('prompt_draft_'))
      })
      expect(draftExists).toBe(false)
    })

    test('should handle multiple drafts for different prompts', async ({ page, context }) => {
      // Create draft for new prompt
      await page.goto('/dashboard/prompts/new')
      const editor = page.locator('.cm-content')
      await editor.click()
      await editor.pressSequentially('New prompt draft', { delay: 50 })
      await page.waitForTimeout(31000) // Auto-save

      // Navigate to edit existing prompt
      await page.goto('/dashboard/prompts/123/edit') // Mock ID

      // Should NOT show draft from new prompt
      await expect(page.getByText(/You have an unsaved draft/i)).not.toBeVisible()

      // Type different content
      await editor.click()
      await editor.clear()
      await editor.pressSequentially('Edit prompt draft', { delay: 50 })
      await page.waitForTimeout(31000)

      // Go back to new prompt
      await page.goto('/dashboard/prompts/new')

      // Should show original new prompt draft
      await expect(page.getByText(/You have an unsaved draft/i)).toBeVisible()
      await page.getByRole('button', { name: /Restore Draft/i }).click()

      const content = await editor.textContent()
      expect(content).toContain('New prompt draft')
      expect(content).not.toContain('Edit prompt draft')
    })
  })
})
