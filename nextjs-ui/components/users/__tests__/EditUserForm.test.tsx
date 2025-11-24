/**
 * Unit tests for EditUserForm component
 *
 * Tests cover:
 * - Form rendering with defaultValues
 * - NO password fields (AC-2 requirement)
 * - Form submission with valid data
 * - Validation errors
 * - Cancel with unsaved changes confirmation
 * - Form reset when defaultValues change
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditUserForm } from '../EditUserForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { UserDetail } from '@/lib/api/users';

// Mock the hooks
jest.mock('@/lib/hooks/useTenants', () => ({
  useTenants: () => ({
    data: [
      { id: 'tenant-1', name: 'Tenant 1' },
      { id: 'tenant-2', name: 'Tenant 2' },
    ],
    isLoading: false,
  }),
}));

// Create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('EditUserForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  const mockDefaultValues: Partial<UserDetail> = {
    id: 'user-1',
    email: 'existing@example.com',
    default_tenant_id: 'tenant-1',
    force_password_change: false,
    is_active: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.confirm = jest.fn(() => true); // Mock window.confirm
  });

  const renderForm = (props = {}) => {
    return render(
      <EditUserForm
        defaultValues={mockDefaultValues}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
        {...props}
      />,
      { wrapper: createWrapper() }
    );
  };

  describe('Form rendering', () => {
    it('should render all form fields (NO password fields)', () => {
      renderForm();

      // Should have these fields
      expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Default Tenant/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Require password change on next login/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Account active/)).toBeInTheDocument();

      // Should NOT have password fields (AC-2)
      expect(screen.queryByLabelText(/^Password$/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Confirm Password/)).not.toBeInTheDocument();
      expect(screen.queryByTestId('password-input-password')).not.toBeInTheDocument();
    });

    it('should NOT render Initial Role field (AC-2: role management in Story 26)', () => {
      renderForm();

      expect(screen.queryByLabelText(/Initial Role/)).not.toBeInTheDocument();
    });

    it('should render submit and cancel buttons', () => {
      renderForm();

      expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('should populate form fields with defaultValues', () => {
      renderForm();

      const emailInput = screen.getByLabelText(/Email/) as HTMLInputElement;
      const tenantSelect = screen.getByLabelText(/Default Tenant/) as HTMLSelectElement;
      const forcePasswordChange = screen.getByLabelText(/Require password change on next login/) as HTMLInputElement;
      const isActive = screen.getByLabelText(/Account active/) as HTMLInputElement;

      expect(emailInput.value).toBe('existing@example.com');
      expect(tenantSelect.value).toBe('tenant-1');
      expect(forcePasswordChange.checked).toBe(false);
      expect(isActive.checked).toBe(true);
    });
  });

  describe('Form validation', () => {
    it('should show email validation error for invalid email', async () => {
      const user = userEvent.setup();
      renderForm();

      const emailInput = screen.getByLabelText(/Email/);
      const submitButton = screen.getByRole('button', { name: /Save Changes/i });

      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('should show email required error when empty', async () => {
      const user = userEvent.setup();
      renderForm();

      const emailInput = screen.getByLabelText(/Email/);
      const submitButton = screen.getByRole('button', { name: /Save Changes/i });

      await user.clear(emailInput);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
      });
    });

    it('should show tenant selection required error', async () => {
      const user = userEvent.setup();
      renderForm();

      const tenantSelect = screen.getByLabelText(/Default Tenant/);
      const submitButton = screen.getByRole('button', { name: /Save Changes/i });

      await user.selectOptions(tenantSelect, '');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Please select a valid tenant/i)).toBeInTheDocument();
      });
    });

    it('should validate full_name max length', async () => {
      const user = userEvent.setup();
      renderForm();

      const fullNameInput = screen.getByLabelText(/Full Name/);
      const submitButton = screen.getByRole('button', { name: /Save Changes/i });

      // Type more than 100 characters
      const longName = 'A'.repeat(101);
      await user.type(fullNameInput, longName);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Full name cannot exceed 100 characters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form submission', () => {
    it('should call onSubmit with valid data', async () => {
      const user = userEvent.setup();
      renderForm();

      const emailInput = screen.getByLabelText(/Email/);
      const fullNameInput = screen.getByLabelText(/Full Name/);
      const submitButton = screen.getByRole('button', { name: /Save Changes/i });

      await user.clear(emailInput);
      await user.type(emailInput, 'updated@example.com');
      await user.type(fullNameInput, 'Updated Name');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: 'updated@example.com',
          full_name: 'Updated Name',
          default_tenant_id: 'tenant-1',
          force_password_change: false,
          is_active: true,
        });
      });
    });

    it('should handle force_password_change toggle', async () => {
      const user = userEvent.setup();
      renderForm();

      const forcePasswordChange = screen.getByLabelText(/Require password change on next login/);
      const submitButton = screen.getByRole('button', { name: /Save Changes/i });

      await user.click(forcePasswordChange);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            force_password_change: true,
          })
        );
      });
    });

    it('should handle is_active toggle', async () => {
      const user = userEvent.setup();
      renderForm();

      const isActive = screen.getByLabelText(/Account active/);
      const submitButton = screen.getByRole('button', { name: /Save Changes/i });

      await user.click(isActive); // Toggle to false
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            is_active: false,
          })
        );
      });
    });

    it('should handle optional full_name field', async () => {
      const user = userEvent.setup();
      renderForm();

      const submitButton = screen.getByRole('button', { name: /Save Changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            full_name: '',
          })
        );
      });
    });
  });

  describe('Form reset when defaultValues change', () => {
    it('should reset form when defaultValues prop changes', async () => {
      const { rerender } = renderForm();

      const emailInput = screen.getByLabelText(/Email/) as HTMLInputElement;
      expect(emailInput.value).toBe('existing@example.com');

      const newDefaultValues: Partial<UserDetail> = {
        id: 'user-2',
        email: 'newuser@example.com',
        default_tenant_id: 'tenant-2',
        force_password_change: true,
        is_active: false,
      };

      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <EditUserForm
            defaultValues={newDefaultValues}
            onSubmit={mockOnSubmit}
            onCancel={mockOnCancel}
            isLoading={false}
          />
        </QueryClientProvider>
      );

      await waitFor(() => {
        const updatedEmailInput = screen.getByLabelText(/Email/) as HTMLInputElement;
        const tenantSelect = screen.getByLabelText(/Default Tenant/) as HTMLSelectElement;
        const forcePasswordChange = screen.getByLabelText(/Require password change on next login/) as HTMLInputElement;
        const isActive = screen.getByLabelText(/Account active/) as HTMLInputElement;

        expect(updatedEmailInput.value).toBe('newuser@example.com');
        expect(tenantSelect.value).toBe('tenant-2');
        expect(forcePasswordChange.checked).toBe(true);
        expect(isActive.checked).toBe(false);
      });
    });
  });

  describe('Cancel functionality', () => {
    it('should call onCancel when cancel button is clicked with no changes', async () => {
      const user = userEvent.setup();
      renderForm();

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
      expect(global.confirm).not.toHaveBeenCalled();
    });

    it('should show confirmation dialog when canceling with unsaved changes', async () => {
      const user = userEvent.setup();
      renderForm();

      const emailInput = screen.getByLabelText(/Email/);
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });

      await user.clear(emailInput);
      await user.type(emailInput, 'changed@example.com');
      await user.click(cancelButton);

      expect(global.confirm).toHaveBeenCalledWith(
        'You have unsaved changes. Are you sure you want to discard them?'
      );
    });

    it('should not call onCancel if user cancels the confirmation', async () => {
      global.confirm = jest.fn(() => false);
      const user = userEvent.setup();
      renderForm();

      const emailInput = screen.getByLabelText(/Email/);
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });

      await user.clear(emailInput);
      await user.type(emailInput, 'changed@example.com');
      await user.click(cancelButton);

      expect(global.confirm).toHaveBeenCalled();
      expect(mockOnCancel).not.toHaveBeenCalled();
    });
  });

  describe('Loading state', () => {
    it('should disable all fields when isLoading is true', () => {
      renderForm({ isLoading: true });

      expect(screen.getByLabelText(/Email/)).toBeDisabled();
      expect(screen.getByLabelText(/Full Name/)).toBeDisabled();
      expect(screen.getByLabelText(/Default Tenant/)).toBeDisabled();
      expect(screen.getByLabelText(/Require password change on next login/)).toBeDisabled();
      expect(screen.getByLabelText(/Account active/)).toBeDisabled();
    });

    it('should disable submit button when isLoading is true', () => {
      renderForm({ isLoading: true });

      const submitButton = screen.getByRole('button', { name: /Save Changes/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Tenant dropdown', () => {
    it('should show all available tenants in dropdown', () => {
      renderForm();

      const tenantSelect = screen.getByLabelText(/Default Tenant/);
      expect(tenantSelect).toBeInTheDocument();

      // Check that both tenants are available
      expect(screen.getByRole('option', { name: 'Tenant 1' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Tenant 2' })).toBeInTheDocument();
    });

    it('should allow changing tenant', async () => {
      const user = userEvent.setup();
      renderForm();

      const tenantSelect = screen.getByLabelText(/Default Tenant/);
      const submitButton = screen.getByRole('button', { name: /Save Changes/i });

      await user.selectOptions(tenantSelect, 'tenant-2');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            default_tenant_id: 'tenant-2',
          })
        );
      });
    });
  });
});
