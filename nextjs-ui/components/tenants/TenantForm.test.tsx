/**
 * TenantForm Component Tests - Story 32
 * Complete Field Coverage: BYOK, Budget, Tools, Webhook, Enhancement Prefs, Accordion
 *
 * Focus: Story 32 acceptance criteria only
 * For legacy tests, see TenantForm.test.tsx.old
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TenantForm } from './TenantForm'
import { Tenant } from '@/lib/api/tenants'
import { toast } from 'sonner'

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// Mock CodeMirror
jest.mock('@uiw/react-codemirror', () => ({
  __esModule: true,
  default: ({ value, onChange }: any) => (
    <textarea
      data-testid="codemirror-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}))

jest.mock('@codemirror/lang-json', () => ({
  json: jest.fn(),
}))

describe('TenantForm - Story 32', () => {
  const mockOnSubmit = jest.fn()
  const mockOnCancel = jest.fn()

  const mockTenant: Partial<Tenant> = {
    id: 'tenant-1',
    tenant_id: 'acme-corp',
    name: 'Acme Corp',
    description: 'Main production tenant',
    logo: 'https://example.com/logo.png',
    tool_type: 'servicedesk_plus',
    byok_enabled: false,
    max_budget: 500,
    is_active: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    sessionStorage.clear()
  })

  describe('Story 32: BYOK Section (AC-1)', () => {
    it('should not show API key fields when BYOK is disabled by default', () => {
      render(<TenantForm onSubmit={mockOnSubmit} />)

      // BYOK toggle should be off by default
      const byokToggle = screen.getByRole('switch', { name: /byok enabled toggle/i })
      expect(byokToggle).not.toBeChecked()

      // API key fields should not be visible
      expect(screen.queryByLabelText(/openai api key/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/anthropic api key/i)).not.toBeInTheDocument()
    })

    it('should show API key fields when BYOK toggle is enabled', async () => {
      const user = userEvent.setup()
      render(<TenantForm onSubmit={mockOnSubmit} />)

      // Enable BYOK
      const byokToggle = screen.getByRole('switch', { name: /byok enabled toggle/i })
      await user.click(byokToggle)

      // API key fields should now be visible
      await waitFor(() => {
        expect(screen.getByLabelText(/openai api key/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/anthropic api key/i)).toBeInTheDocument()
      })
    })

    it('should display BYOK fields when defaultValues has byok_enabled=true', () => {
      render(
        <TenantForm
          onSubmit={mockOnSubmit}
          defaultValues={{
            byok_enabled: true,
            byok_openai_key: 'sk-test123',
          }}
        />
      )

      // BYOK toggle should be checked
      const byokToggle = screen.getByRole('switch', { name: /byok enabled toggle/i })
      expect(byokToggle).toBeChecked()

      // API key fields should be visible with values
      expect(screen.getByLabelText(/openai api key/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/openai api key/i)).toHaveValue('sk-test123')
    })

    it('should toggle BYOK fields on and off', async () => {
      const user = userEvent.setup()
      render(<TenantForm onSubmit={mockOnSubmit} />)

      const byokToggle = screen.getByRole('switch', { name: /byok enabled toggle/i })

      // Enable BYOK
      await user.click(byokToggle)
      await waitFor(() => {
        expect(screen.getByLabelText(/openai api key/i)).toBeInTheDocument()
      })

      // Disable BYOK
      await user.click(byokToggle)
      await waitFor(() => {
        expect(screen.queryByLabelText(/openai api key/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Story 32: Budget Section (AC-2)', () => {
    it('should display default budget values', () => {
      render(<TenantForm onSubmit={mockOnSubmit} />)

      // Default budget values from schema
      expect(screen.getByLabelText(/max budget/i)).toHaveValue(500)
      expect(screen.getByLabelText(/alert threshold/i)).toHaveValue(80)
      expect(screen.getByLabelText(/grace threshold/i)).toHaveValue(110)
    })

    it('should display budget values from defaultValues', () => {
      render(
        <TenantForm
          onSubmit={mockOnSubmit}
          defaultValues={{
            max_budget: 1500,
            alert_threshold: 75,
            grace_threshold: 120,
            budget_duration: '60d',
          }}
        />
      )

      expect(screen.getByLabelText(/max budget/i)).toHaveValue(1500)
      expect(screen.getByLabelText(/alert threshold/i)).toHaveValue(75)
      expect(screen.getByLabelText(/grace threshold/i)).toHaveValue(120)
    })

    it('should allow changing budget values', async () => {
      const user = userEvent.setup()
      render(<TenantForm onSubmit={mockOnSubmit} />)

      const maxBudgetInput = screen.getByLabelText(/max budget/i)
      await user.clear(maxBudgetInput)
      await user.type(maxBudgetInput, '2000')

      expect(maxBudgetInput).toHaveValue(2000)
    })

    it('should show budget currency formatting', () => {
      render(
        <TenantForm
          onSubmit={mockOnSubmit}
          defaultValues={{
            max_budget: 1500.50,
          }}
        />
      )

      // Check if currency formatting text is present (actual format: "Current: $1,500.50")
      expect(screen.getByText(/\$1,500\.50/i)).toBeInTheDocument()
    })
  })

  describe('Story 32: Tool Configuration (AC-3)', () => {
    it('should show ServiceDesk fields when tool_type is servicedesk_plus', () => {
      render(
        <TenantForm
          onSubmit={mockOnSubmit}
          defaultValues={{ tool_type: 'servicedesk_plus' }}
        />
      )

      expect(screen.getByLabelText(/servicedesk plus url/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/servicedesk plus api key/i)).toBeInTheDocument()
    })

    it('should show Jira fields when tool_type is jira', async () => {
      const user = userEvent.setup()
      render(<TenantForm onSubmit={mockOnSubmit} />)

      // Change tool type to Jira
      const toolTypeSelect = screen.getByLabelText(/tool type/i)
      await user.selectOptions(toolTypeSelect, 'jira')

      await waitFor(() => {
        expect(screen.getByLabelText(/jira url/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/jira api token/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/jira project key/i)).toBeInTheDocument()
      })

      // ServiceDesk fields should not be visible
      expect(screen.queryByLabelText(/servicedesk plus url/i)).not.toBeInTheDocument()
    })

    it('should hide tool-specific fields when tool_type is none', async () => {
      const user = userEvent.setup()
      render(<TenantForm onSubmit={mockOnSubmit} />)

      // Change tool type to None
      const toolTypeSelect = screen.getByLabelText(/tool type/i)
      await user.selectOptions(toolTypeSelect, 'none')

      await waitFor(() => {
        expect(screen.queryByLabelText(/servicedesk plus url/i)).not.toBeInTheDocument()
        expect(screen.queryByLabelText(/jira url/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Story 32: Webhook Secret Generator (AC-4)', () => {
    it('should generate webhook secret when button clicked', async () => {
      const user = userEvent.setup()
      render(<TenantForm onSubmit={mockOnSubmit} />)

      const generateButton = screen.getByRole('button', { name: /generate webhook secret/i })
      const webhookInput = screen.getByLabelText(/webhook signing secret/i)

      // Initial value should be empty
      expect(webhookInput).toHaveValue('')

      // Click generate
      await user.click(generateButton)

      // Should populate webhook secret
      await waitFor(() => {
        expect(webhookInput).not.toHaveValue('')
        expect((webhookInput as HTMLInputElement).value.length).toBeGreaterThan(20)
      })

      // Should show success toast
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('generated'))
    })

    it('should copy webhook secret to clipboard when copy button clicked', async () => {
      const user = userEvent.setup()

      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
      })

      render(
        <TenantForm
          onSubmit={mockOnSubmit}
          defaultValues={{ webhook_signing_secret: 'test-secret-123' }}
        />
      )

      const copyButton = screen.getByRole('button', { name: /copy webhook secret/i })
      await user.click(copyButton)

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-secret-123')
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('copied'))
      })
    })
  })

  describe('Story 32: Enhancement Preferences Dual-Mode (AC-5)', () => {
    it('should start in simple form mode by default', () => {
      render(<TenantForm onSubmit={mockOnSubmit} />)

      // Simple form fields should be visible
      expect(screen.getByLabelText(/max enhancement length/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/include monitoring/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/knowledge base timeout/i)).toBeInTheDocument()

      // JSON editor should not be visible
      expect(screen.queryByTestId('codemirror-editor')).not.toBeInTheDocument()
    })

    it('should switch to JSON editor mode when toggle clicked', async () => {
      const user = userEvent.setup()
      render(<TenantForm onSubmit={mockOnSubmit} />)

      const toggleButton = screen.getByRole('button', { name: /switch to json editor/i })
      await user.click(toggleButton)

      await waitFor(() => {
        // JSON editor should be visible
        expect(screen.getByTestId('codemirror-editor')).toBeInTheDocument()

        // Simple form fields should not be visible
        expect(screen.queryByLabelText(/max enhancement length/i)).not.toBeInTheDocument()
      })
    })

    it('should persist mode preference in sessionStorage', async () => {
      const user = userEvent.setup()
      render(<TenantForm onSubmit={mockOnSubmit} />)

      const toggleButton = screen.getByRole('button', { name: /switch to json editor/i })
      await user.click(toggleButton)

      await waitFor(() => {
        expect(sessionStorage.getItem('tenant-form-json-mode')).toBe('true')
      })
    })

    it('should preserve data when switching between modes', async () => {
      const user = userEvent.setup()
      render(<TenantForm onSubmit={mockOnSubmit} />)

      // Modify values in simple form
      const maxLengthInput = screen.getByLabelText(/max enhancement length/i)
      await user.clear(maxLengthInput)
      await user.type(maxLengthInput, '1000')

      // Switch to JSON mode
      const toggleButton = screen.getByRole('button', { name: /switch to json editor/i })
      await user.click(toggleButton)

      await waitFor(() => {
        const jsonEditor = screen.getByTestId('codemirror-editor')
        expect(jsonEditor).toHaveValue(expect.stringContaining('"max_enhancement_length": 1000'))
      })
    })

    it('should show error when switching from JSON mode with invalid JSON', async () => {
      const user = userEvent.setup()
      render(<TenantForm onSubmit={mockOnSubmit} />)

      // Switch to JSON mode
      const toggleButton = screen.getByRole('button', { name: /switch to json editor/i })
      await user.click(toggleButton)

      await waitFor(() => {
        expect(screen.getByTestId('codemirror-editor')).toBeInTheDocument()
      })

      // Enter invalid JSON
      const jsonEditor = screen.getByTestId('codemirror-editor')
      await user.clear(jsonEditor)
      await user.type(jsonEditor, '{ invalid json }')

      // Try to switch back to simple form
      const switchBackButton = screen.getByRole('button', { name: /switch to simple form/i })
      await user.click(switchBackButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid json/i)).toBeInTheDocument()
      })

      // Should still be in JSON mode
      expect(screen.getByTestId('codemirror-editor')).toBeInTheDocument()
    })
  })

  describe('Story 32: Is Active Toggle (AC-6)', () => {
    it('should show warning when is_active is toggled to false', async () => {
      const user = userEvent.setup()
      render(<TenantForm onSubmit={mockOnSubmit} />)

      // Find and toggle is_active
      const isActiveToggle = screen.getByRole('switch', { name: /active status/i })
      await user.click(isActiveToggle)

      await waitFor(() => {
        expect(screen.getByText(/deactivating this tenant will prevent all agent executions/i)).toBeInTheDocument()
      })
    })

    it('should not show warning when is_active is true', () => {
      render(
        <TenantForm
          onSubmit={mockOnSubmit}
          defaultValues={{ is_active: true }}
        />
      )

      expect(screen.queryByText(/deactivating this tenant/i)).not.toBeInTheDocument()
    })

    it('should default is_active to true', () => {
      render(<TenantForm onSubmit={mockOnSubmit} />)

      const isActiveToggle = screen.getByRole('switch', { name: /active status/i })
      expect(isActiveToggle).toBeChecked()
    })
  })

  describe('Story 32: Accordion Layout (AC-8)', () => {
    it('should render all accordion sections', () => {
      render(<TenantForm onSubmit={mockOnSubmit} />)

      expect(screen.getByText(/basic information/i)).toBeInTheDocument()
      expect(screen.getByText(/tool configuration/i)).toBeInTheDocument()
      expect(screen.getByText(/webhook configuration/i)).toBeInTheDocument()
      expect(screen.getByText(/enhancement preferences/i)).toBeInTheDocument()
      expect(screen.getByText(/byok configuration/i)).toBeInTheDocument()
      expect(screen.getByText(/budget & limits/i)).toBeInTheDocument()
    })

    it('should have Basic Information section expanded by default', () => {
      render(<TenantForm onSubmit={mockOnSubmit} />)

      const basicTrigger = screen.getByRole('button', { name: /basic information/i })
      expect(basicTrigger).toHaveAttribute('aria-expanded', 'true')
    })

    it('should expand/collapse accordion sections on click', async () => {
      const user = userEvent.setup()
      render(<TenantForm onSubmit={mockOnSubmit} />)

      const byokTrigger = screen.getByRole('button', { name: /byok configuration/i })

      // Initially collapsed
      expect(byokTrigger).toHaveAttribute('aria-expanded', 'false')

      // Click to expand
      await user.click(byokTrigger)

      await waitFor(() => {
        expect(byokTrigger).toHaveAttribute('aria-expanded', 'true')
      })

      // Click to collapse
      await user.click(byokTrigger)

      await waitFor(() => {
        expect(byokTrigger).toHaveAttribute('aria-expanded', 'false')
      })
    })
  })

  describe('Story 32: Accessibility (AC-10)', () => {
    it('should have proper ARIA labels for all switches', () => {
      render(<TenantForm onSubmit={mockOnSubmit} />)

      expect(screen.getByRole('switch', { name: /byok enabled toggle/i })).toBeInTheDocument()
      expect(screen.getByRole('switch', { name: /active status toggle/i })).toBeInTheDocument()
      expect(screen.getByRole('switch', { name: /include monitoring data toggle/i })).toBeInTheDocument()
    })

    it('should have proper ARIA expanded attributes for accordion triggers', () => {
      render(<TenantForm onSubmit={mockOnSubmit} />)

      const basicTrigger = screen.getByRole('button', { name: /basic information/i })
      const byokTrigger = screen.getByRole('button', { name: /byok configuration/i })

      expect(basicTrigger).toHaveAttribute('aria-expanded')
      expect(byokTrigger).toHaveAttribute('aria-expanded')
    })

    it('should support keyboard navigation for generate secret button', async () => {
      const user = userEvent.setup()
      render(<TenantForm onSubmit={mockOnSubmit} />)

      const generateButton = screen.getByRole('button', { name: /generate webhook secret/i })

      // Focus and press Enter
      generateButton.focus()
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled()
      })
    })
  })

  describe('Form Rendering', () => {
    it('should render form in create mode', () => {
      render(<TenantForm onSubmit={mockOnSubmit} mode="create" />)

      expect(screen.getByRole('button', { name: /create tenant/i })).toBeInTheDocument()
    })

    it('should render form in edit mode', () => {
      render(<TenantForm onSubmit={mockOnSubmit} mode="edit" defaultValues={mockTenant} />)

      expect(screen.getByRole('button', { name: /update tenant/i })).toBeInTheDocument()
    })

    it('should render cancel button when onCancel provided', () => {
      render(<TenantForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should not render cancel button when onCancel not provided', () => {
      render(<TenantForm onSubmit={mockOnSubmit} />)

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should disable submit button when isLoading is true', () => {
      render(<TenantForm onSubmit={mockOnSubmit} isLoading={true} mode="create" />)

      const submitButton = screen.getByRole('button', { name: /creating/i })
      expect(submitButton).toBeDisabled()
    })
  })
})

