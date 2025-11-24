/**
 * Unit tests for PasswordStrengthIndicator component
 *
 * Tests cover:
 * - Rendering with different password strengths
 * - Debouncing behavior (300ms delay)
 * - Color and label mapping
 * - Progress bar width
 * - Accessibility attributes
 */

import { render, screen, waitFor } from '@testing-library/react';
import { PasswordStrengthIndicator } from '../PasswordStrengthIndicator';

// Mock the useDebounce hook
jest.mock('@/lib/hooks/useDebounce', () => ({
  useDebounce: (value: string, delay: number) => value, // Return immediately for testing
}));

describe('PasswordStrengthIndicator', () => {
  describe('Rendering', () => {
    it('should not render when password is empty', () => {
      const { container } = render(<PasswordStrengthIndicator password="" />);
      expect(container.firstChild).toBeNull();
    });

    it('should render with weak password', () => {
      render(<PasswordStrengthIndicator password="abc" />);
      expect(screen.getByText('Weak')).toBeInTheDocument();
    });

    it('should render with medium password', () => {
      render(<PasswordStrengthIndicator password="Abcd1234" />);
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('should render with strong password', () => {
      render(<PasswordStrengthIndicator password="Abcd123!" />);
      expect(screen.getByText('Strong')).toBeInTheDocument();
    });
  });

  describe('Progress bar', () => {
    it('should display correct width for weak password (score 2)', () => {
      render(<PasswordStrengthIndicator password="abcdefgh" />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '40%' }); // 2/5 * 100 = 40%
    });

    it('should display correct width for medium password (score 4)', () => {
      render(<PasswordStrengthIndicator password="Abcd1234" />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '80%' }); // 4/5 * 100 = 80%
    });

    it('should display correct width for strong password (score 5)', () => {
      render(<PasswordStrengthIndicator password="Abcd123!" />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '100%' }); // 5/5 * 100 = 100%
    });
  });

  describe('Color classes', () => {
    it('should apply red color for weak password', () => {
      render(<PasswordStrengthIndicator password="abc" />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('bg-red-500');
    });

    it('should apply yellow color for medium password', () => {
      render(<PasswordStrengthIndicator password="Abcd1234" />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('bg-yellow-500');
    });

    it('should apply green color for strong password', () => {
      render(<PasswordStrengthIndicator password="Abcd123!" />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('bg-green-500');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<PasswordStrengthIndicator password="Abcd123!" />);
      const progressBar = screen.getByRole('progressbar');

      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should update ARIA attributes for different strengths', () => {
      const { rerender } = render(<PasswordStrengthIndicator password="abc" />);
      let progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '20'); // score 1/5 = 20%

      rerender(<PasswordStrengthIndicator password="Abcd1234" />);
      progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '80'); // score 4/5 = 80%
    });
  });

  describe('Debouncing behavior', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should use debounced password value', async () => {
      // Re-mock with actual debounce behavior for this test
      jest.unmock('@/lib/hooks/useDebounce');
      jest.mock('@/lib/hooks/useDebounce', () => ({
        useDebounce: jest.fn((value: string) => value),
      }));

      const { useDebounce } = require('@/lib/hooks/useDebounce');

      render(<PasswordStrengthIndicator password="Abcd123!" />);

      expect(useDebounce).toHaveBeenCalledWith('Abcd123!', 300);
    });
  });

  describe('Label text color', () => {
    it('should apply red text color for weak password', () => {
      render(<PasswordStrengthIndicator password="abc" />);
      const label = screen.getByText('Weak');
      expect(label).toHaveClass('text-red-600');
    });

    it('should apply yellow text color for medium password', () => {
      render(<PasswordStrengthIndicator password="Abcd1234" />);
      const label = screen.getByText('Medium');
      expect(label).toHaveClass('text-yellow-600');
    });

    it('should apply green text color for strong password', () => {
      render(<PasswordStrengthIndicator password="Abcd123!" />);
      const label = screen.getByText('Strong');
      expect(label).toHaveClass('text-green-600');
    });
  });

  describe('Transition classes', () => {
    it('should have transition classes on progress bar', () => {
      render(<PasswordStrengthIndicator password="Abcd123!" />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('transition-all', 'duration-300');
    });
  });
});
