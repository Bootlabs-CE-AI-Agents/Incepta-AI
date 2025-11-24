/**
 * Unit tests for CreateUserForm component
 *
 * Tests cover:
 * - Form submission with valid data
 * - Validation errors for all fields
 * - Password confirmation mismatch
 * - Cancel with unsaved changes confirmation
 * - Loading state
 * - Tenant dropdown integration
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateUserForm } from '../CreateUserForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

// Mock PasswordInput component
jest.mock('../PasswordInput', () => ({
  PasswordInput: ({ label, name, register, error, value }: any) => (
    <div data-testid={`password-input-${name}`}>
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        type="password"
        {...register}
        data-error={error?.message}
      />
      {error && <span className="error">{error.message}</span>}
    </div>
  ),
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

describe('CreateUserForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.confirm = jest.fn(() => true); // Mock window.confirm
  });

  const renderForm = (props = {}) => {
    return render(
      <CreateUserForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
        {...props}
      />,
      { wrapper: createWrapper() }
    );
  };

  describe('Form rendering', () => {
    it('should render all form fields', () => {
      renderForm();

      expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument();
      expect(screen.getByTestId('password-input-password')).toBeInTheDocument();
      expect(screen.getByTestId('password-input-confirmPassword')).toBeInTheDocument();
      expect(screen.getByLabelText(/Default Tenant/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Initial Role/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Require password change on next login/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Account active/)).toBeInTheDocument();
    });

    it('should render submit and cancel buttons', () => {
      renderForm();

      expect(screen.getByRole('button', { name: /Create User/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('should have force_password_change and is_active checked by default', () => {
      renderForm();

      const forcePasswordChange = screen.getByLabelText(/Require password change on next login/) as HTMLInputElement;
      const isActive = screen.getByLabelText(/Account active/) as HTMLInputElement;

      expect(forcePasswordChange.checked).toBe(true);
      expect(isActive.checked).toBe(true);
    });
  });

  describe('Form validation', () => {
    it('should show email validation error for invalid email', async () => {
      const user = userEvent.setup();
      renderForm();

      const emailInput = screen.getByLabelText(/Email/);
      const submitButton = screen.getByRole('button', { name: /Create User/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('should show email required error when empty', async () => {
      const user = userEvent.setup();
      renderForm();

      const submitButton = screen.getByRole('button', { name: /Create User/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
      });
    });

    it('should show password validation errors', async () => {
      const user = userEvent.setup();
      renderForm();

      const submitButton = screen.getByRole('button', { name: /Create User/i });
      const emailInput = screen.getByLabelText(/Email/);

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        const passwordInput = screen.getByTestId('password-input-password');
        const errorMessage = passwordInput.getAttribute('data-error');
        expect(errorMessage).toBeTruthy();
      });
    });

    it('should show password mismatch error', async () => {
      const user = userEvent.setup();
      renderForm();

      const emailInput = screen.getByLabelText(/Email/);
      const passwordContainer = screen.getByTestId('password-input-password');
      const confirmPasswordContainer = screen.getByTestId('password-input-confirmPassword');
      const passwordInput = within(passwordContainer).getByLabelText(/Password/);
      const confirmPasswordInput = within(confirmPasswordContainer).getByLabelText(/Confirm Password/);
      const submitButton = screen.getByRole('button', { name: /Create User/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'ValidP@ss123');
      await user.type(confirmPasswordInput, 'DifferentP@ss123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('should show tenant selection required error', async () => {
      const user = userEvent.setup();
      renderForm();

      const emailInput = screen.getByLabelText(/Email/);
      const passwordContainer = screen.getByTestId('password-input-password');
      const confirmPasswordContainer = screen.getByTestId('password-input-confirmPassword');
      const passwordInput = within(passwordContainer).getByLabelText(/Password/);
      const confirmPasswordInput = within(confirmPasswordContainer).getByLabelText(/Confirm Password/);
      const submitButton = screen.getByRole('button', { name: /Create User/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'ValidP@ss123');
      await user.type(confirmPasswordInput, 'ValidP@ss123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Please select a valid tenant/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form submission', () => {
    it('should call onSubmit with valid data', async () => {
      const user = userEvent.setup();
      renderForm();

      const emailInput = screen.getByLabelText(/Email/);
      const fullNameInput = screen.getByLabelText(/Full Name/);
      const passwordContainer = screen.getByTestId('password-input-password');
      const confirmPasswordContainer = screen.getByTestId('password-input-confirmPassword');
      const passwordInput = within(passwordContainer).getByLabelText(/Password/);
      const confirmPasswordInput = within(confirmPasswordContainer).getByLabelText(/Confirm Password/);
      const tenantSelect = screen.getByLabelText(/Default Tenant/);
      const roleSelect = screen.getByLabelText(/Initial Role/);
      const submitButton = screen.getByRole('button', { name: /Create User/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(fullNameInput, 'Test User');
      await user.type(passwordInput, 'ValidP@ss123');
      await user.type(confirmPasswordInput, 'ValidP@ss123');
      await user.selectOptions(tenantSelect, 'tenant-1');
      await user.selectOptions(roleSelect, 'developer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: 'test@example.com',
          full_name: 'Test User',
          password: 'ValidP@ss123',
          confirmPassword: 'ValidP@ss123',
          default_tenant_id: 'tenant-1',
          initial_role: 'developer',
          force_password_change: true,
          is_active: true,
        });
      });
    });

    it('should handle optional full_name field', async () => {
      const user = userEvent.setup();
      renderForm();

      const emailInput = screen.getByLabelText(/Email/);
      const passwordContainer = screen.getByTestId('password-input-password');
      const confirmPasswordContainer = screen.getByTestId('password-input-confirmPassword');
      const passwordInput = within(passwordContainer).getByLabelText(/Password/);
      const confirmPasswordInput = within(confirmPasswordContainer).getByLabelText(/Confirm Password/);
      const tenantSelect = screen.getByLabelText(/Default Tenant/);
      const submitButton = screen.getByRole('button', { name: /Create User/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'ValidP@ss123');
      await user.type(confirmPasswordInput, 'ValidP@ss123');
      await user.selectOptions(tenantSelect, 'tenant-1');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'test@example.com',
            full_name: '',
          })
        );
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

      await user.type(emailInput, 'test@example.com');
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

      await user.type(emailInput, 'test@example.com');
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
      expect(screen.getByLabelText(/Initial Role/)).toBeDisabled();
      expect(screen.getByLabelText(/Require password change on next login/)).toBeDisabled();
      expect(screen.getByLabelText(/Account active/)).toBeDisabled();
    });

    it('should disable submit button when isLoading is true', () => {
      renderForm({ isLoading: true });

      const submitButton = screen.getByRole('button', { name: /Create User/i });
      expect(submitButton).toBeDisabled();
    });
  });
});
