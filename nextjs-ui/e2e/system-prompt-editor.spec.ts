/**
 * System Prompt Editor E2E Tests
 *
 * Tests system prompt CRUD, variable management, versioning, and template library
 * Following Playwright v1.51.0 best practices (2025)
 *
 * Stories: 0.4.2 (System Prompt Editor Part 1), 0.4.3 (System Prompt Editor Part 2)
 * Components: TokenCounter, VariableManager, PromptPreview, PromptVersionHistory, PromptTemplateLibrary
 */

import { test, expect, Page, Route } from '@playwright/test'

test.describe.configure({ mode: 'parallel' })

test.describe('System Prompt Editor', () => {
  const mockPrompts = [
    {
      id: 'prompt-1',
      agent_id: 'agent-1',
      agent_name: 'Ticket Enhancer',
      prompt_text: 'You are a helpful assistant that enhances support tickets with context from {{knowledge_base}} and {{ticket_history}}.',
      version: 3,
      description: 'Latest version with knowledge base integration',
      created_by: 'Alice',
      created_at: '2025-01-18T10:30:00Z',
      is_current: true,
    },
    {
      id: 'prompt-2',
      agent_id: 'agent-2',
      agent_name: 'Code Reviewer',
      prompt_text: 'Review code for security issues and best practices. Focus on {{programming_language}}.',
      version: 1,
      description: 'Initial version',
      created_by: 'Bob',
      created_at: '2025-01-15T09:00:00Z',
      is_current: true,
    },
  ]

  const mockVariables = [
    {
      name: 'knowledge_base',
      description: 'Knowledge base articles',
      defaultValue: '',
      exampleValue: 'Password reset procedure: ...',
      required: true,
    },
    {
      name: 'ticket_history',
      description: 'Related ticket history',
      defaultValue: 'No history',
      exampleValue: 'Ticket #123: User reported similar issue...',
      required: false,
    },
  ]

  const mockVersions = [
    {
      id: 'v3',
      agent_id: 'agent-1',
      version: 3,
      description: 'Latest version with knowledge base integration',
      created_by: 'Alice',
      created_at: '2025-01-18T10:30:00Z',
      is_current: true,
    },
    {
      id: 'v2',
      agent_id: 'agent-1',
      version: 2,
      description: 'Added ticket history',
      created_by: 'Bob',
      created_at: '2025-01-17T14:00:00Z',
      is_current: false,
    },
    {
      id: 'v1',
      agent_id: 'agent-1',
      version: 1,
      description: 'Initial prompt',
      created_by: 'Alice',
      created_at: '2025-01-15T09:00:00Z',
      is_current: false,
    },
  ]

  const mockTemplates = [
    {
      id: 'tpl-1',
      name: 'Customer Support Bot',
      category: 'conversational',
      description: 'Friendly customer support agent',
      template_text: 'You are a friendly customer support assistant. Help users with {{support_topic}}.',
      variables: [{ name: 'support_topic', description: 'Topic to help with', required: true }],
      tags: ['support', 'conversational'],
      usage_count: 45,
    },
    {
      id: 'tpl-2',
      name: 'Code Reviewer',
      category: 'analytical',
      description: 'Reviews code for best practices',
      template_text: 'Review the following {{programming_language}} code for security and best practices:\n\n{{code}}',
      variables: [
        { name: 'programming_language', description: 'Programming language', required: true },
        { name: 'code', description: 'Code to review', required: true },
      ],
      tags: ['code', 'review', 'security'],
      usage_count: 32,
    },
  ]

  test.beforeEach(async ({ page }) => {
    // Mock prompts list
    await page.route('**/api/v1/prompts', async (route: Route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockPrompts, total: 2 }),
        })
      }
    })

    await page.goto('/dashboard/prompts')
    await expect(page.getByRole('heading', { name: /system prompts/i, level: 1 })).toBeVisible()
  })

  test('displays prompts in table format', async ({ page }) => {
    // Verify table headers
    await expect(page.getByRole('columnheader', { name: /agent name/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /version/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /updated/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /actions/i })).toBeVisible()

    // Verify prompt rows
    const enhancerRow = page.getByRole('row').filter({ hasText: 'Ticket Enhancer' })
    await expect(enhancerRow).toBeVisible()
    await expect(enhancerRow.getByText('v3')).toBeVisible()
    await expect(enhancerRow.getByText('Alice')).toBeVisible()

    const reviewerRow = page.getByRole('row').filter({ hasText: 'Code Reviewer' })
    await expect(reviewerRow).toBeVisible()
    await expect(reviewerRow.getByText('v1')).toBeVisible()
  })

  test('creates new prompt with variables and preview', async ({ page }) => {
    const newPrompt = {
      agent_id: 'agent-3',
      prompt_text: 'You are a {{role}} assistant. Help with {{task}}. Use {{tone}} tone.',
      description: 'Configurable assistant prompt',
    }

    // Mock agents for dropdown
    await page.route('**/api/v1/agents', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'agent-3', name: 'New Agent', status: 'active' },
            { id: 'agent-4', name: 'Another Agent', status: 'active' },
          ],
        }),
      })
    })

    // Mock token count
    await page.route('**/api/v1/prompts/count-tokens', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 25, characters: 95, words: 15, model: 'gpt-4' }),
      })
    })

    // Mock POST prompt
    await page.route('**/api/v1/prompts', async (route: Route) => {
      if (route.request().method() === 'POST') {
        const payload = route.request().postDataJSON()
        expect(payload.prompt_text).toBe(newPrompt.prompt_text)

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'prompt-3',
            ...payload,
            version: 1,
            created_at: new Date().toISOString(),
          }),
        })
      }
    })

    // Click Create Prompt
    await page.getByRole('button', { name: /create prompt/i }).click()

    // Select agent
    await page.getByLabel(/agent/i).click()
    await page.getByRole('option', { name: /new agent/i }).click()

    // Fill prompt text
    const promptEditor = page.getByLabel(/prompt text/i).or(page.locator('textarea').first())
    await promptEditor.fill(newPrompt.prompt_text)

    // Verify token counter appears
    await expect(page.getByText(/25 tokens/i)).toBeVisible({ timeout: 2000 })
    await expect(page.getByText(/95.*characters/i).or(page.getByText(/95.*chars/i))).toBeVisible()
    await expect(page.getByText(/15 words/i)).toBeVisible()

    // Verify auto-detected variables
    await expect(page.getByText(/3 undeclared variables/i).or(page.getByText(/{{role}}/i))).toBeVisible()

    // Click Auto-Detect button
    const autoDetectButton = page.getByRole('button', { name: /auto-detect/i })
    if (await autoDetectButton.isVisible()) {
      await autoDetectButton.click()
    }

    // Verify variables detected
    await expect(page.getByText('role')).toBeVisible()
    await expect(page.getByText('task')).toBeVisible()
    await expect(page.getByText('tone')).toBeVisible()

    // Add variable details
    const roleVarRow = page.locator('[data-variable="role"]').or(page.getByText('role').locator('..'))
    await roleVarRow.getByLabel(/description/i).fill('Assistant role')
    await roleVarRow.getByLabel(/default value/i).fill('helpful')
    await roleVarRow.getByLabel(/example value/i).fill('professional')

    // Verify prompt preview with substituted variables
    const previewSection = page.locator('[data-testid="prompt-preview"]').or(page.getByText(/preview/i).locator('..'))
    await expect(previewSection.getByText(/professional assistant/i)).toBeVisible()

    // Toggle preview visibility
    const hidePreviewButton = page.getByRole('button', { name: /hide preview/i }).or(page.getByTitle(/hide preview/i))
    if (await hidePreviewButton.isVisible()) {
      await hidePreviewButton.click()
      await expect(page.getByText(/preview hidden/i)).toBeVisible()
    }

    // Fill description
    await page.getByLabel(/description/i).fill(newPrompt.description)

    // Submit
    await page.getByRole('button', { name: /create prompt/i, exact: true }).click()

    // Verify success
    await expect(page.getByText(/prompt created successfully/i)).toBeVisible({ timeout: 5000 })
  })

  test('uses template library to create prompt', async ({ page }) => {
    // Mock templates
    await page.route('**/api/v1/prompt-templates', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ templates: mockTemplates }),
      })
    })

    // Mock agents
    await page.route('**/api/v1/agents', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [{ id: 'agent-5', name: 'Support Agent', status: 'active' }] }),
      })
    })

    await page.getByRole('button', { name: /create prompt/i }).click()

    // Open template library
    const templateLibraryButton = page.getByRole('button', { name: /browse templates/i }).or(page.getByText(/template library/i))
    await templateLibraryButton.click()

    // Verify template library modal
    await expect(page.getByRole('dialog').or(page.locator('[role="dialog"]'))).toBeVisible()
    await expect(page.getByText('Customer Support Bot')).toBeVisible()
    await expect(page.getByText('Code Reviewer')).toBeVisible()

    // Filter by category
    const conversationalFilter = page.getByRole('button', { name: /conversational/i })
    await conversationalFilter.click()

    // Verify filtering
    await expect(page.getByText('Customer Support Bot')).toBeVisible()
    await expect.soft(page.getByText('Code Reviewer')).not.toBeVisible()

    // Search templates
    const searchInput = page.getByPlaceholder(/search templates/i)
    await searchInput.fill('support')

    await expect(page.getByText('Customer Support Bot')).toBeVisible()

    // Select template
    await page.getByText('Customer Support Bot').click()

    // Verify template preview
    await expect(page.getByText(/friendly customer support assistant/i)).toBeVisible()
    await expect(page.getByText(/support_topic/i)).toBeVisible()

    // Use template
    await page.getByRole('button', { name: /use template/i }).click()

    // Verify template content loaded into editor
    await expect(page.getByText(/friendly customer support assistant/i)).toBeVisible()
    await expect(page.locator('textarea').first()).toHaveValue(/support_topic/)

    // Verify variables imported
    await expect(page.getByText('support_topic')).toBeVisible()
  })

  test('displays version history and reverts to previous version', async ({ page }) => {
    // Mock prompt detail
    await page.route('**/api/v1/prompts/prompt-1', async (route: Route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockPrompts[0],
            variables: mockVariables,
          }),
        })
      }
    })

    // Mock version history
    await page.route('**/api/v1/prompts/prompt-1/versions', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ versions: mockVersions }),
      })
    })

    // Mock version detail
    await page.route('**/api/v1/prompts/prompt-1/versions/v2', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'v2',
          agent_id: 'agent-1',
          prompt_text: 'You are a helpful assistant. Use {{ticket_history}} for context.',
          version: 2,
          description: 'Added ticket history',
          created_by: 'Bob',
          created_at: '2025-01-17T14:00:00Z',
        }),
      })
    })

    // Navigate to prompt detail
    await page.goto('/dashboard/prompts/prompt-1')

    // Verify version history section
    await expect(page.getByText(/version history/i)).toBeVisible()
    await expect(page.getByText(/version 3/i)).toBeVisible()
    await expect(page.getByText(/current/i)).toBeVisible() // Current version badge
    await expect(page.getByText(/latest/i)).toBeVisible() // Latest version badge

    // Verify version 2 and 1 displayed
    await expect(page.getByText(/version 2/i)).toBeVisible()
    await expect(page.getByText(/version 1/i)).toBeVisible()

    // Verify timestamps
    const timestamps = page.locator('text=/ago/i')
    await expect(timestamps.first()).toBeVisible()

    // Click view version 2
    const version2Row = page.locator('text=/version 2/i').locator('..')
    await version2Row.getByRole('button', { name: /view/i }).or(version2Row.getByTitle(/view this version/i)).click()

    // Verify version detail modal
    await expect(page.getByText(/version 2 details/i)).toBeVisible()
    await expect(page.getByText(/use {{ticket_history}} for context/i)).toBeVisible()

    // Mock revert endpoint
    let revertCalled = false
    await page.route('**/api/v1/prompts/prompt-1/revert', async (route: Route) => {
      if (route.request().method() === 'POST') {
        revertCalled = true
        const payload = route.request().postDataJSON()
        expect(payload.version_id).toBe('v2')

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Reverted successfully', new_version: 4 }),
        })
      }
    })

    // Set up confirmation dialog handler
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toMatch(/are you sure/i)
      await dialog.accept()
    })

    // Click Revert button
    await page.getByRole('button', { name: /revert to this version/i }).click()

    // Verify revert was called
    await expect(async () => {
      expect(revertCalled).toBe(true)
    }).toPass({ timeout: 3000 })

    // Verify success message
    await expect(page.getByText(/reverted successfully/i)).toBeVisible({ timeout: 5000 })
  })

  test('validates prompt form fields', async ({ page }) => {
    // Mock agents
    await page.route('**/api/v1/agents', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [{ id: 'agent-6', name: 'Test Agent', status: 'active' }] }),
      })
    })

    await page.getByRole('button', { name: /create prompt/i }).click()

    // Submit empty form
    await page.getByRole('button', { name: /create prompt/i, exact: true }).click()

    // Verify validation errors
    await expect(page.getByText(/agent is required/i).or(page.getByText(/select an agent/i))).toBeVisible()
    await expect(page.getByText(/prompt text must be at least 20 characters/i)).toBeVisible()

    // Fill prompt text too short
    await page.locator('textarea').first().fill('Short')
    await page.getByLabel(/agent/i).click() // Trigger blur
    await expect(page.getByText(/prompt text must be at least 20 characters/i)).toBeVisible()

    // Fill valid prompt
    await page.locator('textarea').first().fill('You are a helpful assistant that provides detailed answers.')
    await expect(page.getByText(/prompt text must be at least 20 characters/i)).not.toBeVisible()
  })

  test('edits existing prompt and creates new version', async ({ page }) => {
    const updatedPrompt = {
      prompt_text: 'You are a helpful assistant that enhances support tickets with context from {{knowledge_base}}, {{ticket_history}}, and {{user_profile}}.',
      description: 'Added user profile context',
    }

    // Mock prompt detail
    await page.route('**/api/v1/prompts/prompt-1', async (route: Route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockPrompts[0],
            variables: mockVariables,
          }),
        })
      } else if (route.request().method() === 'PUT') {
        const payload = route.request().postDataJSON()
        expect(payload.prompt_text).toContain('user_profile')

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'prompt-1',
            ...payload,
            version: 4,
            updated_at: new Date().toISOString(),
          }),
        })
      }
    })

    // Mock versions
    await page.route('**/api/v1/prompts/prompt-1/versions', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ versions: mockVersions }),
      })
    })

    await page.goto('/dashboard/prompts/prompt-1')

    // Click Edit button
    await page.getByRole('button', { name: /edit/i }).click()

    // Update prompt text
    const editor = page.locator('textarea').first()
    await editor.clear()
    await editor.fill(updatedPrompt.prompt_text)

    // Verify new variable detected
    await expect(page.getByText(/user_profile/i)).toBeVisible()

    // Add variable details
    const userProfileVar = page.getByText('user_profile').locator('..')
    await userProfileVar.getByLabel(/description/i).fill('User profile information')

    // Update description
    await page.getByLabel(/description/i).last().fill(updatedPrompt.description)

    // Save
    await page.getByRole('button', { name: /save changes/i }).click()

    // Verify success
    await expect(page.getByText(/prompt updated successfully/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/version 4/i)).toBeVisible()
  })

  test('deletes prompt with confirmation', async ({ page }) => {
    // Mock delete endpoint
    await page.route('**/api/v1/prompts/prompt-1', async (route: Route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204 })
      }
    })

    const promptRow = page.getByRole('row').filter({ hasText: 'Ticket Enhancer' })
    await promptRow.getByRole('button', { name: /delete/i }).click()

    // Verify warning dialog
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(/delete.*ticket enhancer/i)).toBeVisible()
    await expect(dialog.getByText(/cannot be undone/i)).toBeVisible()

    // Confirm
    await dialog.getByRole('button', { name: /delete prompt/i }).click()

    await expect(page.getByText(/prompt deleted/i)).toBeVisible({ timeout: 5000 })
  })

  test('displays empty state when no prompts exist', async ({ page }) => {
    await page.route('**/api/v1/prompts', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0 }),
      })
    })

    await page.reload()

    await expect(page.getByText(/no system prompts/i)).toBeVisible()
    await expect(page.getByText(/create your first prompt/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create prompt/i })).toBeVisible()
  })

  test('copies prompt preview to clipboard', async ({ page }) => {
    // Mock clipboard API
    await page.evaluate(() => {
      Object.assign(navigator, {
        clipboard: {
          writeText: async (text: string) => {
            ;(window as any).__clipboardText = text
          },
        },
      })
    })

    // Mock prompt detail with variables
    await page.route('**/api/v1/prompts/prompt-1', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...mockPrompts[0],
          variables: mockVariables,
        }),
      })
    })

    await page.goto('/dashboard/prompts/prompt-1')

    // Find and click copy button
    const copyButton = page.getByRole('button', { name: /copy preview/i }).or(page.getByTitle(/copy preview/i))
    await copyButton.click()

    // Verify clipboard contains substituted text
    const clipboardText = await page.evaluate(() => (window as any).__clipboardText)
    expect(clipboardText).toContain('Password reset procedure')
    expect(clipboardText).not.toContain('{{knowledge_base}}') // Variables should be substituted

    // Verify success feedback (check icon or toast)
    await expect(page.getByText(/copied/i).or(copyButton.locator('svg').first())).toBeVisible({ timeout: 2000 })
  })

  test('handles token counter with warnings', async ({ page }) => {
    // Mock agents
    await page.route('**/api/v1/agents', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [{ id: 'agent-7', name: 'Test Agent', status: 'active' }] }),
      })
    })

    // Mock token count with high count (approaching limit)
    await page.route('**/api/v1/prompts/count-tokens', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 3500, characters: 14000, words: 2800, model: 'gpt-4' }),
      })
    })

    await page.getByRole('button', { name: /create prompt/i }).click()

    await page.locator('textarea').first().fill('x '.repeat(2800)) // 2800 words

    // Verify warning displayed (assuming 4000 token limit)
    await expect(page.getByText(/approaching limit/i).or(page.getByText(/⚠️/i))).toBeVisible({ timeout: 3000 })

    // Verify warning color (yellow/amber)
    const tokenCountDisplay = page.getByText(/3,500 tokens/i).or(page.getByText(/3500/i))
    await expect(tokenCountDisplay).toHaveClass(/yellow|amber|warning/i)
  })
})
