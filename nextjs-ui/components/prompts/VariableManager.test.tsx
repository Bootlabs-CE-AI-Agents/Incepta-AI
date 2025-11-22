/**
 * Unit Tests for VariableManager Component
 * Story 0.4.3: System Prompt Editor Part 2 - Part 5
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { VariableManager } from './VariableManager';
import type { PromptVariable } from '@/types/prompts';

describe('VariableManager', () => {
  const mockOnChange = jest.fn();

  const mockVariables: PromptVariable[] = [
    {
      name: 'user_name',
      description: 'User name',
      defaultValue: 'John',
      exampleValue: 'Alice',
      required: true,
    },
    {
      name: 'role',
      description: 'User role',
      defaultValue: 'user',
      required: false,
    },
  ];

  const promptWithVariables = 'Hello {{user_name}}, you are a {{role}}';
  const promptWithUndeclared = 'Hello {{user_name}}, {{age}} years old, role: {{role}}';

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Variable List Display', () => {
    it('should render all variables', () => {
      render(
        <VariableManager
          promptText={promptWithVariables}
          variables={mockVariables}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('user_name')).toBeInTheDocument();
      expect(screen.getByText('role')).toBeInTheDocument();
    });

    it('should display variable descriptions', () => {
      render(
        <VariableManager
          promptText={promptWithVariables}
          variables={mockVariables}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('User name')).toBeInTheDocument();
      expect(screen.getByText('User role')).toBeInTheDocument();
    });

    it('should show required badge for required variables', () => {
      render(
        <VariableManager
          promptText={promptWithVariables}
          variables={mockVariables}
          onChange={mockOnChange}
        />
      );

      const requiredBadges = screen.getAllByText('Required');
      expect(requiredBadges.length).toBeGreaterThan(0);
    });

    it('should show default values when available', () => {
      render(
        <VariableManager
          promptText={promptWithVariables}
          variables={mockVariables}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('user')).toBeInTheDocument();
    });

    it('should show example values when available', () => {
      render(
        <VariableManager
          promptText={promptWithVariables}
          variables={mockVariables}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    });
  });

  describe('Undeclared Variables Detection', () => {
    it('should detect undeclared variables in prompt', () => {
      render(
        <VariableManager
          promptText={promptWithUndeclared}
          variables={mockVariables}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/1 undeclared variable/i)).toBeInTheDocument();
      expect(screen.getByText(/{{age}}/i)).toBeInTheDocument();
    });

    it('should show auto-detect button when undeclared variables exist', () => {
      render(
        <VariableManager
          promptText={promptWithUndeclared}
          variables={mockVariables}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/auto-detect/i)).toBeInTheDocument();
    });

    it('should add undeclared variables on auto-detect click', async () => {
      const user = userEvent.setup();

      render(
        <VariableManager
          promptText={promptWithUndeclared}
          variables={mockVariables}
          onChange={mockOnChange}
        />
      );

      const autoDetectButton = screen.getByText(/auto-detect/i);
      await user.click(autoDetectButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ name: 'age' }),
          ])
        );
      });
    });

    it('should not show undeclared warning when all variables are declared', () => {
      render(
        <VariableManager
          promptText={promptWithVariables}
          variables={mockVariables}
          onChange={mockOnChange}
        />
      );

      expect(screen.queryByText(/undeclared variable/i)).not.toBeInTheDocument();
    });
  });

  describe('Unused Variables Detection', () => {
    it('should detect unused variables', () => {
      const unusedVariables: PromptVariable[] = [
        ...mockVariables,
        {
          name: 'unused_var',
          description: 'Not used',
          required: false,
        },
      ];

      render(
        <VariableManager
          promptText={promptWithVariables}
          variables={unusedVariables}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/1 unused variable/i)).toBeInTheDocument();
      expect(screen.getByText(/unused_var/i)).toBeInTheDocument();
    });

    it('should show warning icon for unused variables', () => {
      const unusedVariables: PromptVariable[] = [
        ...mockVariables,
        {
          name: 'unused_var',
          description: 'Not used',
          required: false,
        },
      ];

      const { container } = render(
        <VariableManager
          promptText={promptWithVariables}
          variables={unusedVariables}
          onChange={mockOnChange}
        />
      );

      // Check for warning icon (AlertCircle)
      const warningIcons = container.querySelectorAll('svg');
      expect(warningIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Add New Variable', () => {
    it('should show add variable button', () => {
      render(
        <VariableManager
          promptText={promptWithVariables}
          variables={mockVariables}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/add variable/i)).toBeInTheDocument();
    });

    it('should open add form when add button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <VariableManager
          promptText={promptWithVariables}
          variables={mockVariables}
          onChange={mockOnChange}
        />
      );

      const addButton = screen.getByText(/add variable/i);
      await user.click(addButton);

      expect(screen.getByPlaceholderText(/variable_name/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/description/i)).toBeInTheDocument();
    });

    it('should add new variable when form is submitted', async () => {
      const user = userEvent.setup();

      render(
        <VariableManager
          promptText={promptWithVariables}
          variables={mockVariables}
          onChange={mockOnChange}
        />
      );

      const addButton = screen.getByText(/add variable/i);
      await user.click(addButton);

      const nameInput = screen.getByPlaceholderText(/variable_name/i);
      await user.type(nameInput, 'new_var');

      const descInput = screen.getByPlaceholderText(/description/i);
      await user.type(descInput, 'New variable');

      const saveButton = screen.getByText('Add Variable');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              name: 'new_var',
              description: 'New variable',
            }),
          ])
        );
      });
    });

    it('should cancel add form when cancel is clicked', async () => {
      const user = userEvent.setup();

      render(
        <VariableManager
          promptText={promptWithVariables}
          variables={mockVariables}
          onChange={mockOnChange}
        />
      );

      const addButton = screen.getByText(/add variable/i);
      await user.click(addButton);

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(screen.queryByPlaceholderText(/variable_name/i)).not.toBeInTheDocument();
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Edit Variable', () => {
    it('should open edit form when edit button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <VariableManager
          promptText={promptWithVariables}
          variables={mockVariables}
          onChange={mockOnChange}
        />
      );

      // Find edit button for first variable
      const editButtons = screen.getAllByTitle(/edit/i);
      await user.click(editButtons[0]);

      // Form should be populated with existing values
      expect(screen.getByDisplayValue('user_name')).toBeInTheDocument();
      expect(screen.getByDisplayValue('User name')).toBeInTheDocument();
    });

    it('should update variable when edit form is submitted', async () => {
      const user = userEvent.setup();

      render(
        <VariableManager
          promptText={promptWithVariables}
          variables={mockVariables}
          onChange={mockOnChange}
        />
      );

      const editButtons = screen.getAllByTitle(/edit/i);
      await user.click(editButtons[0]);

      const descInput = screen.getByDisplayValue('User name');
      await user.clear(descInput);
      await user.type(descInput, 'Updated description');

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              name: 'user_name',
              description: 'Updated description',
            }),
          ])
        );
      });
    });
  });

  describe('Delete Variable', () => {
    it('should delete variable when delete button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <VariableManager
          promptText={promptWithVariables}
          variables={mockVariables}
          onChange={mockOnChange}
        />
      );

      const deleteButtons = screen.getAllByTitle(/delete/i);
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.not.arrayContaining([
            expect.objectContaining({ name: 'user_name' }),
          ])
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty variable list', () => {
      render(
        <VariableManager
          promptText={promptWithVariables}
          variables={[]}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/no variables defined/i)).toBeInTheDocument();
    });

    it('should handle empty prompt text', () => {
      render(
        <VariableManager
          promptText=""
          variables={mockVariables}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/2 unused variables/i)).toBeInTheDocument();
    });

    it('should handle prompt with no variables', () => {
      render(
        <VariableManager
          promptText="No variables here"
          variables={mockVariables}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/2 unused variables/i)).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <VariableManager
          promptText={promptWithVariables}
          variables={mockVariables}
          onChange={mockOnChange}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Variable Validation', () => {
    it('should not allow duplicate variable names', async () => {
      const user = userEvent.setup();

      render(
        <VariableManager
          promptText={promptWithVariables}
          variables={mockVariables}
          onChange={mockOnChange}
        />
      );

      const addButton = screen.getByText(/add variable/i);
      await user.click(addButton);

      const nameInput = screen.getByPlaceholderText(/variable_name/i);
      await user.type(nameInput, 'user_name'); // Duplicate

      const saveButton = screen.getByText('Add Variable');
      await user.click(saveButton);

      // Should not call onChange for duplicate
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });
});
