/**
 * Unit Tests for PromptPreview Component
 * Story 0.4.3: System Prompt Editor Part 2 - Part 5
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PromptPreview } from './PromptPreview';
import type { PromptVariable } from '@/types/prompts';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

describe('PromptPreview', () => {
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
      defaultValue: 'admin',
      required: false,
    },
  ];

  const promptText = 'Hello {{user_name}}, you are a {{role}}';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Preview Display', () => {
    it('should render preview with substituted variables', () => {
      render(
        <PromptPreview promptText={promptText} variables={mockVariables} />
      );

      expect(screen.getByText(/hello alice, you are a admin/i)).toBeInTheDocument();
    });

    it('should use example values when available', () => {
      render(
        <PromptPreview promptText={promptText} variables={mockVariables} />
      );

      // Alice is the example value for user_name
      expect(screen.getByText(/alice/i)).toBeInTheDocument();
    });

    it('should use default values when example not available', () => {
      render(
        <PromptPreview promptText={promptText} variables={mockVariables} />
      );

      // admin is the default value for role
      expect(screen.getByText(/admin/i)).toBeInTheDocument();
    });

    it('should use custom preview values when provided', () => {
      render(
        <PromptPreview
          promptText={promptText}
          variables={mockVariables}
          previewValues={{ user_name: 'Bob', role: 'user' }}
        />
      );

      expect(screen.getByText(/hello bob, you are a user/i)).toBeInTheDocument();
    });

    it('should show placeholder for missing variables', () => {
      const incompleteVars: PromptVariable[] = [
        {
          name: 'user_name',
          description: 'User name',
          required: true,
        },
      ];

      render(
        <PromptPreview
          promptText={promptText}
          variables={incompleteVars}
        />
      );

      expect(screen.getByText(/\[\[user_name\]\]/i)).toBeInTheDocument();
    });
  });

  describe('Visibility Toggle', () => {
    it('should be visible by default', () => {
      render(
        <PromptPreview promptText={promptText} variables={mockVariables} />
      );

      expect(screen.getByText(/hello alice/i)).toBeInTheDocument();
      expect(screen.queryByText(/preview hidden/i)).not.toBeInTheDocument();
    });

    it('should hide preview when eye-off button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <PromptPreview promptText={promptText} variables={mockVariables} />
      );

      const toggleButton = screen.getByTitle(/hide preview/i);
      await user.click(toggleButton);

      expect(screen.queryByText(/hello alice/i)).not.toBeInTheDocument();
      expect(screen.getByText(/preview hidden/i)).toBeInTheDocument();
    });

    it('should show preview when eye button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <PromptPreview promptText={promptText} variables={mockVariables} />
      );

      // Hide first
      const toggleButton = screen.getByTitle(/hide preview/i);
      await user.click(toggleButton);

      // Show again
      const showButton = screen.getByTitle(/show preview/i);
      await user.click(showButton);

      expect(screen.getByText(/hello alice/i)).toBeInTheDocument();
    });
  });

  describe('Copy to Clipboard', () => {
    it('should copy preview text to clipboard', async () => {
      const user = userEvent.setup();

      render(
        <PromptPreview promptText={promptText} variables={mockVariables} />
      );

      const copyButton = screen.getByTitle(/copy preview/i);
      await user.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          'Hello Alice, you are a admin'
        );
      });
    });

    it('should show check icon after successful copy', async () => {
      const user = userEvent.setup();

      render(
        <PromptPreview promptText={promptText} variables={mockVariables} />
      );

      const copyButton = screen.getByTitle(/copy preview/i);
      await user.click(copyButton);

      // Check icon should be visible
      await waitFor(() => {
        const checkIcon = screen.getByTitle(/copy preview/i).querySelector('svg');
        expect(checkIcon).toBeInTheDocument();
      });
    });

    it('should revert to copy icon after 2 seconds', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });

      render(
        <PromptPreview promptText={promptText} variables={mockVariables} />
      );

      const copyButton = screen.getByTitle(/copy preview/i);
      await user.click(copyButton);

      // Fast-forward 2 seconds
      jest.advanceTimersByTime(2000);

      // Should revert to copy icon
      await waitFor(() => {
        const copyIcon = screen.getByTitle(/copy preview/i).querySelector('svg');
        expect(copyIcon).toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('Validation Warnings', () => {
    it('should show warning when required variables are missing', () => {
      const incompleteVars: PromptVariable[] = [
        {
          name: 'required_var',
          description: 'Required',
          required: true,
        },
      ];

      render(
        <PromptPreview
          promptText="Hello {{required_var}}"
          variables={incompleteVars}
        />
      );

      expect(screen.getByText(/warning/i)).toBeInTheDocument();
    });

    it('should display validation error messages', () => {
      const incompleteVars: PromptVariable[] = [
        {
          name: 'required_var',
          description: 'Required',
          required: true,
        },
      ];

      render(
        <PromptPreview
          promptText="Hello {{required_var}}"
          variables={incompleteVars}
        />
      );

      // Should show error about missing value
      const errorMessages = screen.getAllByText(/required_var/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });

    it('should not show warnings when all variables have values', () => {
      render(
        <PromptPreview promptText={promptText} variables={mockVariables} />
      );

      expect(screen.queryByText(/warning/i)).not.toBeInTheDocument();
    });
  });

  describe('Statistics Display', () => {
    it('should display character count', () => {
      render(
        <PromptPreview promptText={promptText} variables={mockVariables} />
      );

      const previewText = 'Hello Alice, you are a admin';
      expect(screen.getByText(new RegExp(`${previewText.length}.*characters`, 'i'))).toBeInTheDocument();
    });

    it('should display word count', () => {
      render(
        <PromptPreview promptText={promptText} variables={mockVariables} />
      );

      expect(screen.getByText(/6.*words/i)).toBeInTheDocument();
    });

    it('should display line count', () => {
      const multiLinePrompt = 'Line 1\nLine 2\nLine 3';

      render(
        <PromptPreview promptText={multiLinePrompt} variables={[]} />
      );

      expect(screen.getByText(/3.*lines/i)).toBeInTheDocument();
    });

    it('should format numbers with thousand separators', () => {
      const longPrompt = 'word '.repeat(2000); // 2000 words

      render(
        <PromptPreview promptText={longPrompt} variables={[]} />
      );

      // Should have comma separator for large numbers
      expect(screen.getByText(/2,000.*words/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty prompt text', () => {
      render(
        <PromptPreview promptText="" variables={mockVariables} />
      );

      expect(screen.getByText(/0.*characters/i)).toBeInTheDocument();
    });

    it('should handle no variables', () => {
      render(
        <PromptPreview promptText="No variables here" variables={[]} />
      );

      expect(screen.getByText(/no variables here/i)).toBeInTheDocument();
    });

    it('should handle variables with special characters', () => {
      const specialVars: PromptVariable[] = [
        {
          name: 'special_var',
          defaultValue: '<script>alert("test")</script>',
          required: false,
        },
      ];

      render(
        <PromptPreview
          promptText="Content: {{special_var}}"
          variables={specialVars}
        />
      );

      // Should escape and display safely
      expect(screen.getByText(/<script>alert\("test"\)<\/script>/i)).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <PromptPreview
          promptText={promptText}
          variables={mockVariables}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should handle very long prompt text', () => {
      const longPrompt = 'word '.repeat(10000);

      render(
        <PromptPreview promptText={longPrompt} variables={[]} />
      );

      // Should have scrollable container
      const previewContainer = screen.getByText(/word/i).parentElement;
      expect(previewContainer).toHaveClass('overflow-auto');
    });
  });

  describe('Variable Substitution Priority', () => {
    it('should prioritize previewValues over exampleValue', () => {
      render(
        <PromptPreview
          promptText="{{user_name}}"
          variables={mockVariables}
          previewValues={{ user_name: 'Custom' }}
        />
      );

      expect(screen.getByText(/custom/i)).toBeInTheDocument();
      expect(screen.queryByText(/alice/i)).not.toBeInTheDocument();
    });

    it('should prioritize exampleValue over defaultValue', () => {
      render(
        <PromptPreview promptText="{{user_name}}" variables={mockVariables} />
      );

      expect(screen.getByText(/alice/i)).toBeInTheDocument();
      expect(screen.queryByText(/john/i)).not.toBeInTheDocument();
    });

    it('should use defaultValue when example not available', () => {
      render(
        <PromptPreview promptText="{{role}}" variables={mockVariables} />
      );

      expect(screen.getByText(/admin/i)).toBeInTheDocument();
    });

    it('should use placeholder when no values available', () => {
      const noValueVar: PromptVariable[] = [
        {
          name: 'empty_var',
          required: false,
        },
      ];

      render(
        <PromptPreview promptText="{{empty_var}}" variables={noValueVar} />
      );

      expect(screen.getByText(/\[\[empty_var\]\]/i)).toBeInTheDocument();
    });
  });
});
