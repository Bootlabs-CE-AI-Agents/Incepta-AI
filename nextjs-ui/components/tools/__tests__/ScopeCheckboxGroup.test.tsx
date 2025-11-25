import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScopeCheckboxGroup } from '../ScopeCheckboxGroup';

describe('ScopeCheckboxGroup', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Rendering', () => {
    it('renders predefined scopes as checkboxes', () => {
      render(
        <ScopeCheckboxGroup
          selectedScopes={[]}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByLabelText('Select read:user scope')).toBeInTheDocument();
      expect(screen.getByLabelText('Select write:user scope')).toBeInTheDocument();
      expect(screen.getByLabelText('Select read:repo scope')).toBeInTheDocument();
      expect(screen.getByLabelText('Select write:repo scope')).toBeInTheDocument();
      expect(screen.getByLabelText('Select read:org scope')).toBeInTheDocument();
      expect(screen.getByLabelText('Select admin:org scope')).toBeInTheDocument();
    });

    it('renders "Add Custom Scope" button', () => {
      render(
        <ScopeCheckboxGroup
          selectedScopes={[]}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('button', { name: '+ Add Custom Scope' })).toBeInTheDocument();
    });

    it('displays error message when error prop is provided', () => {
      render(
        <ScopeCheckboxGroup
          selectedScopes={[]}
          onChange={mockOnChange}
          error="At least 1 scope required"
        />
      );

      expect(screen.getByRole('alert')).toHaveTextContent('At least 1 scope required');
    });
  });

  describe('Checkbox Selection', () => {
    it('calls onChange when checkbox is clicked', () => {
      render(
        <ScopeCheckboxGroup
          selectedScopes={[]}
          onChange={mockOnChange}
        />
      );

      const checkbox = screen.getByLabelText('Select read:user scope');
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledWith(['read:user']);
    });

    it('allows multiple checkboxes to be selected', () => {
      render(
        <ScopeCheckboxGroup
          selectedScopes={['read:user']}
          onChange={mockOnChange}
        />
      );

      const checkbox = screen.getByLabelText('Select write:user scope');
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledWith(['read:user', 'write:user']);
    });

    it('removes scope when unchecking checkbox', () => {
      render(
        <ScopeCheckboxGroup
          selectedScopes={['read:user', 'write:user']}
          onChange={mockOnChange}
        />
      );

      const checkbox = screen.getByLabelText('Select read:user scope');
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledWith(['write:user']);
    });

    it('reflects selected scopes from props', () => {
      render(
        <ScopeCheckboxGroup
          selectedScopes={['read:user', 'admin:org']}
          onChange={mockOnChange}
        />
      );

      const readUserCheckbox = screen.getByLabelText('Select read:user scope') as HTMLInputElement;
      const adminOrgCheckbox = screen.getByLabelText('Select admin:org scope') as HTMLInputElement;
      const writeUserCheckbox = screen.getByLabelText('Select write:user scope') as HTMLInputElement;

      expect(readUserCheckbox.checked).toBe(true);
      expect(adminOrgCheckbox.checked).toBe(true);
      expect(writeUserCheckbox.checked).toBe(false);
    });
  });

  describe('Custom Scope Addition', () => {
    it('shows custom scope input when "+ Add Custom Scope" is clicked', () => {
      render(
        <ScopeCheckboxGroup
          selectedScopes={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '+ Add Custom Scope' }));

      expect(screen.getByLabelText('Enter custom scope')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('adds valid custom scope to the list', () => {
      render(
        <ScopeCheckboxGroup
          selectedScopes={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '+ Add Custom Scope' }));

      const input = screen.getByLabelText('Enter custom scope');
      fireEvent.change(input, { target: { value: 'read:issues' } });
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));

      // Custom scope should be added and auto-checked
      expect(mockOnChange).toHaveBeenCalledWith(['read:issues']);

      // Custom scope checkbox should appear
      waitFor(() => {
        expect(screen.getByLabelText('Select read:issues scope')).toBeInTheDocument();
      });
    });

    it('validates custom scope pattern', () => {
      render(
        <ScopeCheckboxGroup
          selectedScopes={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '+ Add Custom Scope' }));

      const input = screen.getByLabelText('Enter custom scope');
      fireEvent.change(input, { target: { value: 'invalid-scope' } });
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));

      expect(screen.getByRole('alert')).toHaveTextContent('Invalid scope format (expected pattern: read:user)');
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('prevents duplicate scopes', () => {
      render(
        <ScopeCheckboxGroup
          selectedScopes={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '+ Add Custom Scope' }));

      const input = screen.getByLabelText('Enter custom scope');
      fireEvent.change(input, { target: { value: 'read:user' } });
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));

      expect(screen.getByRole('alert')).toHaveTextContent('This scope already exists');
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('validates empty custom scope', () => {
      render(
        <ScopeCheckboxGroup
          selectedScopes={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '+ Add Custom Scope' }));

      fireEvent.click(screen.getByRole('button', { name: 'Add' }));

      expect(screen.getByRole('alert')).toHaveTextContent('Scope cannot be empty');
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('closes custom scope input when Cancel is clicked', () => {
      render(
        <ScopeCheckboxGroup
          selectedScopes={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '+ Add Custom Scope' }));

      const input = screen.getByLabelText('Enter custom scope');
      fireEvent.change(input, { target: { value: 'read:issues' } });
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByLabelText('Enter custom scope')).not.toBeInTheDocument();
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('supports Enter key to add custom scope', () => {
      render(
        <ScopeCheckboxGroup
          selectedScopes={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '+ Add Custom Scope' }));

      const input = screen.getByLabelText('Enter custom scope');
      fireEvent.change(input, { target: { value: 'read:issues' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnChange).toHaveBeenCalledWith(['read:issues']);
    });

    it('supports Escape key to cancel custom scope', () => {
      render(
        <ScopeCheckboxGroup
          selectedScopes={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '+ Add Custom Scope' }));

      const input = screen.getByLabelText('Enter custom scope');
      fireEvent.change(input, { target: { value: 'read:issues' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(screen.queryByLabelText('Enter custom scope')).not.toBeInTheDocument();
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('disables checkboxes when disabled prop is true', () => {
      render(
        <ScopeCheckboxGroup
          selectedScopes={[]}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const checkbox = screen.getByLabelText('Select read:user scope') as HTMLInputElement;
      expect(checkbox.disabled).toBe(true);
    });

    it('disables "+ Add Custom Scope" button when disabled', () => {
      render(
        <ScopeCheckboxGroup
          selectedScopes={[]}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const button = screen.getByRole('button', { name: '+ Add Custom Scope' }) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it('prevents opening custom scope input when disabled', () => {
      render(
        <ScopeCheckboxGroup
          selectedScopes={[]}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      // Button is disabled, clicking won't open input
      fireEvent.click(screen.getByRole('button', { name: '+ Add Custom Scope' }));

      expect(screen.queryByLabelText('Enter custom scope')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for checkboxes', () => {
      render(
        <ScopeCheckboxGroup
          selectedScopes={[]}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByLabelText('Select read:user scope')).toHaveAttribute('aria-label', 'Select read:user scope');
    });

    it('has proper ARIA label for custom scope input', () => {
      render(
        <ScopeCheckboxGroup
          selectedScopes={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '+ Add Custom Scope' }));

      expect(screen.getByLabelText('Enter custom scope')).toHaveAttribute('aria-label', 'Enter custom scope');
    });

    it('associates error message with custom scope input using aria-describedby', () => {
      render(
        <ScopeCheckboxGroup
          selectedScopes={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '+ Add Custom Scope' }));

      const input = screen.getByLabelText('Enter custom scope');
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));

      expect(input).toHaveAttribute('aria-describedby', 'custom-scope-error');
    });
  });
});
