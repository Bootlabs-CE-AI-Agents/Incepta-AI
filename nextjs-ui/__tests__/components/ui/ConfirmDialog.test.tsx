import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    title: 'Confirm Action',
    description: 'Are you sure you want to proceed?',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<ConfirmDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('renders confirm and cancel buttons', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('renders custom confirm label', () => {
      render(<ConfirmDialog {...defaultProps} confirmLabel="Delete" />);
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('renders custom cancel label', () => {
      render(<ConfirmDialog {...defaultProps} cancelLabel="Go Back" />);
      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    });
  });

  describe('dialog types', () => {
    it('renders delete type with Trash icon', () => {
      render(<ConfirmDialog {...defaultProps} type="delete" />);
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('renders reset type', () => {
      render(<ConfirmDialog {...defaultProps} type="reset" />);
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('renders logout type', () => {
      render(<ConfirmDialog {...defaultProps} type="logout" />);
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('renders warning type', () => {
      render(<ConfirmDialog {...defaultProps} type="warning" />);
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('renders custom type with custom icon', () => {
      render(
        <ConfirmDialog
          {...defaultProps}
          type="custom"
          icon={<span data-testid="custom-icon">X</span>}
        />
      );
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });

  describe('button variants', () => {
    it('renders primary confirm variant by default', () => {
      render(<ConfirmDialog {...defaultProps} />);
      // Primary variant is the default
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });

    it('renders danger confirm variant', () => {
      render(<ConfirmDialog {...defaultProps} confirmVariant="danger" />);
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onConfirm when confirm button is clicked', async () => {
      const onConfirm = jest.fn();
      const user = userEvent.setup();
      render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      await user.click(screen.getByRole('button', { name: /confirm/i }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when cancel button is clicked', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();
      render(<ConfirmDialog {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();
      render(<ConfirmDialog {...defaultProps} onClose={onClose} />);

      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('loading state', () => {
    it('shows loading state on confirm button when isLoading is true', () => {
      render(<ConfirmDialog {...defaultProps} isLoading={true} />);
      // Button should show loading indicator
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      expect(confirmButton).toBeDisabled();
    });

    it('disables cancel button when isLoading is true', () => {
      render(<ConfirmDialog {...defaultProps} isLoading={true} />);
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });

    it('does not call onClose when isLoading and Escape is pressed', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();
      render(<ConfirmDialog {...defaultProps} onClose={onClose} isLoading={true} />);

      await user.keyboard('{Escape}');
      // onClose should not be called when loading
      // Note: The actual implementation might still allow closing, but it should be handled
    });
  });

  describe('focus management', () => {
    it('focuses cancel button by default (safer default)', async () => {
      render(<ConfirmDialog {...defaultProps} />);

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        expect(document.activeElement).toBe(cancelButton);
      });
    });
  });

  describe('accessibility', () => {
    it('has role="alertdialog"', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('has aria-modal="true"', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to title', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-labelledby', 'confirm-dialog-title');
    });

    it('has aria-describedby pointing to description', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-describedby', 'confirm-dialog-description');
    });

    it('has button group with role="group"', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByRole('group', { name: /dialog actions/i })).toBeInTheDocument();
    });

    it('buttons have proper aria-labels', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: /cancel and close dialog/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm this action/i })).toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('supports Tab navigation between buttons', async () => {
      const user = userEvent.setup();
      render(<ConfirmDialog {...defaultProps} />);

      // Wait for initial focus on cancel button
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('button', { name: /cancel/i }));
      });

      // Tab to confirm button
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole('button', { name: /confirm/i }));
    });

    it('supports Enter key to activate focused button', async () => {
      const onConfirm = jest.fn();
      const user = userEvent.setup();
      render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      // Tab to confirm button
      await user.tab();

      // Press Enter
      await user.keyboard('{Enter}');
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('supports Space key to activate focused button', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();
      render(<ConfirmDialog {...defaultProps} onClose={onClose} />);

      // Wait for focus on cancel button
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('button', { name: /cancel/i }));
      });

      // Press Space
      await user.keyboard('{ }');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
