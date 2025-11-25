/**
 * Unit tests for PasswordInput component
 *
 * Tests cover:
 * - Show/hide password toggle functionality
 * - Strength indicator display (when enabled)
 * - Error message display
 * - Required field indicator
 * - Disabled state
 * - React Hook Form integration
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordInput } from '../PasswordInput';

// Mock the PasswordStrengthIndicator component
jest.mock('../PasswordStrengthIndicator', () => ({
  PasswordStrengthIndicator: ({ password }: { password: string }) => (
    <div data-testid="password-strength-indicator">Strength: {password.length > 0 ? 'shown' : 'hidden'}</div>
  ),
}));

// Mock Eye icons from lucide-react
jest.mock('lucide-react', () => ({
  Eye: () => <span data-testid="eye-icon">Eye</span>,
  EyeOff: () => <span data-testid="eye-off-icon">EyeOff</span>,
}));

describe('PasswordInput', () => {
  const mockRegister = jest.fn(() => ({
    name: 'password',
    onChange: jest.fn(),
    onBlur: jest.fn(),
    ref: jest.fn(),
  }));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('should render label with required indicator', () => {
      render(
        <PasswordInput
          label="Password"
          name="password"
          register={mockRegister()}
          required={true}
        />
      );

      expect(screen.getByText('Password')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
      expect(screen.getByText('*')).toHaveClass('text-red-500');
    });

    it('should render without required indicator when not required', () => {
      render(
        <PasswordInput
          label="Password"
          name="password"
          register={mockRegister()}
          required={false}
        />
      );

      expect(screen.getByText('Password')).toBeInTheDocument();
      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(
        <PasswordInput
          label="Password"
          name="password"
          register={mockRegister()}
          placeholder="Enter your password"
        />
      );

      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    });
  });

  describe('Password visibility toggle', () => {
    it('should initially render password as hidden (type="password")', () => {
      render(
        <PasswordInput
          label="Password"
          name="password"
          register={mockRegister()}
        />
      );

      const input = screen.getByLabelText(/Password/);
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should show password when toggle button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <PasswordInput
          label="Password"
          name="password"
          register={mockRegister()}
        />
      );

      const input = screen.getByLabelText(/Password/);
      const toggleButton = screen.getByRole('button');

      expect(input).toHaveAttribute('type', 'password');
      expect(screen.getByTestId('eye-icon')).toBeInTheDocument();

      await user.click(toggleButton);

      expect(input).toHaveAttribute('type', 'text');
      expect(screen.getByTestId('eye-off-icon')).toBeInTheDocument();
    });

    it('should toggle password visibility multiple times', async () => {
      const user = userEvent.setup();
      render(
        <PasswordInput
          label="Password"
          name="password"
          register={mockRegister()}
        />
      );

      const input = screen.getByLabelText(/Password/);
      const toggleButton = screen.getByRole('button');

      // Initially hidden
      expect(input).toHaveAttribute('type', 'password');

      // Click to show
      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'text');

      // Click to hide
      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'password');

      // Click to show again
      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'text');
    });
  });

  describe('Error handling', () => {
    it('should display error message when error prop is provided', () => {
      const error = { message: 'Password is required' };
      render(
        <PasswordInput
          label="Password"
          name="password"
          register={mockRegister()}
          error={error}
        />
      );

      expect(screen.getByText('Password is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toHaveClass('text-red-600');
    });

    it('should apply error styling to input when error exists', () => {
      const error = { message: 'Password is required' };
      render(
        <PasswordInput
          label="Password"
          name="password"
          register={mockRegister()}
          error={error}
        />
      );

      const input = screen.getByLabelText(/Password/);
      expect(input).toHaveClass('ring-red-300', 'focus:ring-red-500');
    });

    it('should apply normal styling to input when no error', () => {
      render(
        <PasswordInput
          label="Password"
          name="password"
          register={mockRegister()}
        />
      );

      const input = screen.getByLabelText(/Password/);
      expect(input).toHaveClass('ring-white/50', 'focus:ring-accent-blue');
    });
  });

  describe('Password strength indicator', () => {
    it('should show strength indicator when showStrengthIndicator is true', () => {
      render(
        <PasswordInput
          label="Password"
          name="password"
          register={mockRegister()}
          showStrengthIndicator={true}
          value="MyPassword"
        />
      );

      expect(screen.getByTestId('password-strength-indicator')).toBeInTheDocument();
    });

    it('should not show strength indicator when showStrengthIndicator is false', () => {
      render(
        <PasswordInput
          label="Password"
          name="password"
          register={mockRegister()}
          showStrengthIndicator={false}
          value="MyPassword"
        />
      );

      expect(screen.queryByTestId('password-strength-indicator')).not.toBeInTheDocument();
    });

    it('should not show strength indicator when there is an error', () => {
      const error = { message: 'Password is required' };
      render(
        <PasswordInput
          label="Password"
          name="password"
          register={mockRegister()}
          showStrengthIndicator={true}
          value="MyPassword"
          error={error}
        />
      );

      expect(screen.queryByTestId('password-strength-indicator')).not.toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });

    it('should pass password value to strength indicator', () => {
      render(
        <PasswordInput
          label="Password"
          name="password"
          register={mockRegister()}
          showStrengthIndicator={true}
          value="TestPassword123"
        />
      );

      const indicator = screen.getByTestId('password-strength-indicator');
      expect(indicator).toHaveTextContent('Strength: shown');
    });
  });

  describe('Disabled state', () => {
    it('should disable input when disabled prop is true', () => {
      render(
        <PasswordInput
          label="Password"
          name="password"
          register={mockRegister()}
          disabled={true}
        />
      );

      const input = screen.getByLabelText(/Password/);
      expect(input).toBeDisabled();
    });

    it('should not disable input when disabled prop is false', () => {
      render(
        <PasswordInput
          label="Password"
          name="password"
          register={mockRegister()}
          disabled={false}
        />
      );

      const input = screen.getByLabelText(/Password/);
      expect(input).not.toBeDisabled();
    });
  });

  describe('AutoComplete attribute', () => {
    it('should use custom autoComplete value', () => {
      render(
        <PasswordInput
          label="Password"
          name="password"
          register={mockRegister()}
          autoComplete="new-password"
        />
      );

      const input = screen.getByLabelText(/Password/);
      expect(input).toHaveAttribute('autocomplete', 'new-password');
    });

    it('should use default autoComplete value when not specified', () => {
      render(
        <PasswordInput
          label="Password"
          name="password"
          register={mockRegister()}
        />
      );

      const input = screen.getByLabelText(/Password/);
      expect(input).toHaveAttribute('autocomplete', 'current-password');
    });
  });

  describe('React Hook Form integration', () => {
    it('should apply register props to input', () => {
      const mockRegisterReturn = {
        name: 'password',
        onChange: jest.fn(),
        onBlur: jest.fn(),
        ref: jest.fn(),
      };
      const mockRegisterFn = jest.fn(() => mockRegisterReturn);

      render(
        <PasswordInput
          label="Password"
          name="password"
          register={mockRegisterFn()}
        />
      );

      const input = screen.getByLabelText(/Password/);
      expect(input).toHaveAttribute('name', 'password');
    });

    it('should use name prop for input id and label htmlFor', () => {
      render(
        <PasswordInput
          label="Password"
          name="custom-password"
          register={mockRegister()}
        />
      );

      const input = screen.getByLabelText(/Password/);
      const label = screen.getByText('Password');

      expect(input).toHaveAttribute('id', 'custom-password');
      expect(label).toHaveAttribute('for', 'custom-password');
    });
  });

  describe('Accessibility', () => {
    it('should have proper label association', () => {
      render(
        <PasswordInput
          label="Password"
          name="password"
          register={mockRegister()}
        />
      );

      const input = screen.getByLabelText(/Password/);
      expect(input).toBeInTheDocument();
    });

    it('should have toggle button without default type (defaults to button)', () => {
      render(
        <PasswordInput
          label="Password"
          name="password"
          register={mockRegister()}
        />
      );

      const toggleButton = screen.getByRole('button');
      expect(toggleButton).toHaveAttribute('type', 'button');
    });
  });
});
