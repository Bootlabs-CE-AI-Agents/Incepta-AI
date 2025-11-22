/**
 * Unit Tests for PromptTemplateLibrary Component
 * Story 0.4.3: System Prompt Editor Part 2 - Part 5
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PromptTemplateLibrary } from './PromptTemplateLibrary';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template_text: string;
  variables: string[];
  tags?: string[];
}

describe('PromptTemplateLibrary', () => {
  const mockOnSelectTemplate = jest.fn();

  const mockTemplates: PromptTemplate[] = [
    {
      id: 'tpl-1',
      name: 'Customer Support Bot',
      description: 'Helpful customer service assistant',
      category: 'conversational',
      template_text: 'You are a friendly customer support agent for {{company_name}}. Help users with {{task}}.',
      variables: ['company_name', 'task'],
      tags: ['support', 'customer'],
    },
    {
      id: 'tpl-2',
      name: 'Code Reviewer',
      description: 'Reviews code for quality',
      category: 'task-oriented',
      template_text: 'Review the following {{language}} code for best practices and bugs.',
      variables: ['language'],
      tags: ['code', 'review'],
    },
    {
      id: 'tpl-3',
      name: 'Data Analyst',
      description: 'Analyzes data and provides insights',
      category: 'analytical',
      template_text: 'Analyze {{data_type}} data and provide insights on {{metric}}.',
      variables: ['data_type', 'metric'],
      tags: ['analytics', 'data'],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Template List Display', () => {
    it('should render all templates', () => {
      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      expect(screen.getByText('Customer Support Bot')).toBeInTheDocument();
      expect(screen.getByText('Code Reviewer')).toBeInTheDocument();
      expect(screen.getByText('Data Analyst')).toBeInTheDocument();
    });

    it('should display template count in header', () => {
      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      expect(screen.getByText(/template library \(3\)/i)).toBeInTheDocument();
    });

    it('should display template descriptions', () => {
      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      expect(screen.getByText('Helpful customer service assistant')).toBeInTheDocument();
      expect(screen.getByText('Reviews code for quality')).toBeInTheDocument();
    });

    it('should display template categories', () => {
      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      expect(screen.getByText('conversational')).toBeInTheDocument();
      expect(screen.getByText('task-oriented')).toBeInTheDocument();
      expect(screen.getByText('analytical')).toBeInTheDocument();
    });

    it('should display template variables', () => {
      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      expect(screen.getByText('{{company_name}}')).toBeInTheDocument();
      expect(screen.getByText('{{task}}')).toBeInTheDocument();
      expect(screen.getByText('{{language}}')).toBeInTheDocument();
    });

    it('should display template tags', () => {
      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      expect(screen.getByText('#support')).toBeInTheDocument();
      expect(screen.getByText('#code')).toBeInTheDocument();
    });

    it('should truncate variables display when more than 3', () => {
      const manyVarsTemplate: PromptTemplate[] = [
        {
          ...mockTemplates[0],
          variables: ['var1', 'var2', 'var3', 'var4', 'var5'],
        },
      ];

      render(
        <PromptTemplateLibrary
          templates={manyVarsTemplate}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      expect(screen.getByText('+2')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter templates by name', async () => {
      const user = userEvent.setup();

      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await user.type(searchInput, 'code');

      expect(screen.getByText('Code Reviewer')).toBeInTheDocument();
      expect(screen.queryByText('Customer Support Bot')).not.toBeInTheDocument();
      expect(screen.queryByText('Data Analyst')).not.toBeInTheDocument();
    });

    it('should filter templates by description', async () => {
      const user = userEvent.setup();

      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await user.type(searchInput, 'quality');

      expect(screen.getByText('Code Reviewer')).toBeInTheDocument();
      expect(screen.queryByText('Customer Support Bot')).not.toBeInTheDocument();
    });

    it('should filter templates by tags', async () => {
      const user = userEvent.setup();

      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await user.type(searchInput, 'analytics');

      expect(screen.getByText('Data Analyst')).toBeInTheDocument();
      expect(screen.queryByText('Code Reviewer')).not.toBeInTheDocument();
    });

    it('should be case insensitive', async () => {
      const user = userEvent.setup();

      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await user.type(searchInput, 'CODE');

      expect(screen.getByText('Code Reviewer')).toBeInTheDocument();
    });

    it('should show no results message when search has no matches', async () => {
      const user = userEvent.setup();

      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
    });
  });

  describe('Category Filtering', () => {
    it('should show all categories including "all"', () => {
      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Conversational')).toBeInTheDocument();
      expect(screen.getByText('Task-oriented')).toBeInTheDocument();
      expect(screen.getByText('Analytical')).toBeInTheDocument();
    });

    it('should filter by category when clicked', async () => {
      const user = userEvent.setup();

      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      const conversationalButton = screen.getByText('Conversational');
      await user.click(conversationalButton);

      expect(screen.getByText('Customer Support Bot')).toBeInTheDocument();
      expect(screen.queryByText('Code Reviewer')).not.toBeInTheDocument();
      expect(screen.queryByText('Data Analyst')).not.toBeInTheDocument();
    });

    it('should show all templates when "all" is selected', async () => {
      const user = userEvent.setup();

      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      // Select a specific category first
      const conversationalButton = screen.getByText('Conversational');
      await user.click(conversationalButton);

      // Then select "all"
      const allButton = screen.getByText('All');
      await user.click(allButton);

      expect(screen.getByText('Customer Support Bot')).toBeInTheDocument();
      expect(screen.getByText('Code Reviewer')).toBeInTheDocument();
      expect(screen.getByText('Data Analyst')).toBeInTheDocument();
    });

    it('should highlight selected category', async () => {
      const user = userEvent.setup();

      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      const analyticalButton = screen.getByText('Analytical');
      await user.click(analyticalButton);

      expect(analyticalButton).toHaveClass('bg-primary');
    });

    it('should combine search and category filters', async () => {
      const user = userEvent.setup();

      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      // Filter by category
      const taskOrientedButton = screen.getByText('Task-oriented');
      await user.click(taskOrientedButton);

      // Then search
      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await user.type(searchInput, 'code');

      expect(screen.getByText('Code Reviewer')).toBeInTheDocument();
      expect(screen.queryByText('Customer Support Bot')).not.toBeInTheDocument();
    });
  });

  describe('Template Preview', () => {
    it('should open preview modal when template is clicked', async () => {
      const user = userEvent.setup();

      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      const templateCard = screen.getByText('Code Reviewer');
      await user.click(templateCard);

      // Modal should show full content
      expect(screen.getByText(/template content/i)).toBeInTheDocument();
      expect(screen.getByText(/review the following/i)).toBeInTheDocument();
    });

    it('should display all variables in preview', async () => {
      const user = userEvent.setup();

      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      const templateCard = screen.getByText('Customer Support Bot');
      await user.click(templateCard);

      await waitFor(() => {
        const companyVars = screen.getAllByText(/{{company_name}}/);
        const taskVars = screen.getAllByText(/{{task}}/);
        expect(companyVars.length).toBeGreaterThan(1); // In card and modal
        expect(taskVars.length).toBeGreaterThan(1);
      });
    });

    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      const templateCard = screen.getByText('Code Reviewer');
      await user.click(templateCard);

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      expect(screen.queryByText(/template content/i)).not.toBeInTheDocument();
    });

    it('should close modal when clicking outside', async () => {
      const user = userEvent.setup();

      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      const templateCard = screen.getByText('Code Reviewer');
      await user.click(templateCard);

      // Click on the backdrop
      const modal = screen.getByText(/template content/i).closest('[class*="fixed"]');
      if (modal?.parentElement) {
        await user.click(modal.parentElement);
      }

      expect(screen.queryByText(/template content/i)).not.toBeInTheDocument();
    });
  });

  describe('Copy Template', () => {
    it('should copy template text to clipboard', async () => {
      const user = userEvent.setup();

      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      const templateCard = screen.getByText('Code Reviewer');
      await user.click(templateCard);

      const copyButton = screen.getByText('Copy');
      await user.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          mockTemplates[1].template_text
        );
      });
    });

    it('should show check icon after successful copy', async () => {
      const user = userEvent.setup();

      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      const templateCard = screen.getByText('Code Reviewer');
      await user.click(templateCard);

      const copyButton = screen.getByText('Copy');
      await user.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });
  });

  describe('Use Template', () => {
    it('should call onSelectTemplate when "Use This Template" is clicked', async () => {
      const user = userEvent.setup();

      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      const templateCard = screen.getByText('Code Reviewer');
      await user.click(templateCard);

      const useButton = screen.getByText('Use This Template');
      await user.click(useButton);

      expect(mockOnSelectTemplate).toHaveBeenCalledWith(mockTemplates[1]);
    });

    it('should close modal after using template', async () => {
      const user = userEvent.setup();

      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      const templateCard = screen.getByText('Code Reviewer');
      await user.click(templateCard);

      const useButton = screen.getByText('Use This Template');
      await user.click(useButton);

      expect(screen.queryByText(/template content/i)).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should display loading spinner when isLoading is true', () => {
      render(
        <PromptTemplateLibrary
          templates={[]}
          onSelectTemplate={mockOnSelectTemplate}
          isLoading={true}
        />
      );

      const spinner = screen.getByRole('generic', { hidden: true });
      expect(spinner).toHaveClass('animate-spin');
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no templates available', () => {
      render(
        <PromptTemplateLibrary
          templates={[]}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle templates without tags', () => {
      const templatesNoTags: PromptTemplate[] = [
        {
          ...mockTemplates[0],
          tags: undefined,
        },
      ];

      render(
        <PromptTemplateLibrary
          templates={templatesNoTags}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      expect(screen.getByText('Customer Support Bot')).toBeInTheDocument();
    });

    it('should handle templates without variables', () => {
      const templatesNoVars: PromptTemplate[] = [
        {
          id: 'tpl-no-vars',
          name: 'Simple Template',
          description: 'No variables',
          category: 'custom',
          template_text: 'Simple prompt with no variables',
          variables: [],
        },
      ];

      render(
        <PromptTemplateLibrary
          templates={templatesNoVars}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      expect(screen.getByText('Simple Template')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should handle empty search gracefully', async () => {
      const user = userEvent.setup();

      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await user.type(searchInput, '   ');
      await user.clear(searchInput);

      // Should show all templates
      expect(screen.getByText('Customer Support Bot')).toBeInTheDocument();
      expect(screen.getByText('Code Reviewer')).toBeInTheDocument();
      expect(screen.getByText('Data Analyst')).toBeInTheDocument();
    });

    it('should update filtered count when filtering', async () => {
      const user = userEvent.setup();

      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      const conversationalButton = screen.getByText('Conversational');
      await user.click(conversationalButton);

      expect(screen.getByText(/template library \(1\)/i)).toBeInTheDocument();
    });

    it('should capitalize category names', () => {
      render(
        <PromptTemplateLibrary
          templates={mockTemplates}
          onSelectTemplate={mockOnSelectTemplate}
        />
      );

      expect(screen.getByText('Task-oriented')).toBeInTheDocument();
    });
  });
});
