/**
 * Unit tests for VersionDiffModal Component
 *
 * Tests cover:
 * - Modal rendering and visibility
 * - Diff generation and parsing
 * - Version metadata display
 * - Side-by-side diff view
 * - Legend display
 * - Close functionality
 * - Accessibility
 *
 * Story: nextjs-story-28-prompts-version-history
 * AC: AC-2 (View Version Modal with Diff View)
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { VersionDiffModal } from '@/components/prompts/VersionDiffModal';
import type { PromptVersion } from '@/lib/api/prompts';

// Mock react-diff-view
jest.mock('react-diff-view', () => ({
  parseDiff: jest.fn((diffText: string) => {
    // Simple mock parser
    if (diffText.includes('No differences')) {
      return [];
    }
    return [
      {
        type: 'modify',
        hunks: [
          {
            content: '@@ -1,3 +1,3 @@',
            oldStart: 1,
            oldLines: 3,
            newStart: 1,
            newLines: 3,
            changes: [
              { type: 'normal', content: 'line 1' },
              { type: 'delete', content: 'old line' },
              { type: 'insert', content: 'new line' },
            ],
          },
        ],
      },
    ];
  }),
  Diff: ({ children, hunks }: any) => (
    <div data-testid="diff-component">
      {children && children(hunks)}
    </div>
  ),
  Hunk: ({ hunk }: any) => (
    <div data-testid="hunk">{hunk.content}</div>
  ),
}));

// Mock diff package
jest.mock('diff', () => ({
  createTwoFilesPatch: jest.fn(
    (oldFileName: string, newFileName: string, oldStr: string, newStr: string) => {
      // Simple mock that returns unified diff format
      if (oldStr === newStr) {
        return '';
      }
      return `--- ${oldFileName}\n+++ ${newFileName}\n@@ -1,3 +1,3 @@\n line 1\n-old line\n+new line`;
    }
  ),
}));

// Mock Headless UI Dialog
jest.mock('@headlessui/react', () => {
  const MockDialog = ({ open, onClose, children }: any) =>
    open ? (
      <div data-testid="dialog">
        {children}
      </div>
    ) : null;

  MockDialog.Panel = ({ children }: any) => <div>{children}</div>;
  MockDialog.Title = ({ children }: any) => <h2>{children}</h2>;

  return {
    Dialog: MockDialog,
  };
});

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: (date: Date, formatStr: string) => {
    return '2024-01-15, 10:00 AM';
  },
}));

const mockVersion: PromptVersion = {
  id: '1',
  version_number: 3,
  template_text: 'Version 3 content\nold line\nlast line',
  description: 'Test version description',
  created_at: '2024-01-15T10:00:00Z',
  created_by: 'user@example.com',
};

const currentText = 'Version 3 content\nnew line\nlast line';

describe('VersionDiffModal', () => {
  describe('Modal visibility', () => {
    it('renders modal when isOpen is true', () => {
      render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    it('does not render modal when isOpen is false', () => {
      render(
        <VersionDiffModal
          isOpen={false}
          onClose={jest.fn()}
          version={mockVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Version metadata display', () => {
    it('displays version number in title', () => {
      render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      expect(screen.getByText(/Version 3 Comparison/i)).toBeInTheDocument();
    });

    it('displays saved date and time', () => {
      render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      expect(screen.getByText(/Saved:/i)).toBeInTheDocument();
      expect(screen.getByText(/2024-01-15, 10:00 AM/i)).toBeInTheDocument();
    });

    it('displays character count', () => {
      render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      const charCount = mockVersion.template_text.length.toLocaleString();
      expect(screen.getByText(new RegExp(`Characters:.*${charCount}`, 'i'))).toBeInTheDocument();
    });

    it('displays description when provided', () => {
      render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      expect(screen.getByText(/Description:.*Test version description/i)).toBeInTheDocument();
    });

    it('does not display description section when not provided', () => {
      const versionWithoutDescription = { ...mockVersion, description: null };

      render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={versionWithoutDescription}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      // Description label should not be present
      const descriptionElements = screen.queryAllByText(/Description:/i);
      expect(descriptionElements.length).toBe(0);
    });

    it('displays created_by when provided', () => {
      render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      expect(screen.getByText(/Created by:.*user@example\.com/i)).toBeInTheDocument();
    });

    it('does not display created_by when not provided', () => {
      const versionWithoutCreator = { ...mockVersion, created_by: null };

      render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={versionWithoutCreator}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      const createdByElements = screen.queryAllByText(/Created by:/i);
      expect(createdByElements.length).toBe(0);
    });
  });

  describe('Diff rendering', () => {
    it('renders diff component when differences exist', () => {
      render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      expect(screen.getByTestId('diff-component')).toBeInTheDocument();
    });

    it('displays hunks from parsed diff', () => {
      render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      const hunks = screen.getAllByTestId('hunk');
      expect(hunks.length).toBeGreaterThan(0);
    });

    it('shows no differences message when content is identical', () => {
      const identicalText = mockVersion.template_text;

      // Mock parseDiff to return empty array for identical content
      const { parseDiff } = require('react-diff-view');
      parseDiff.mockReturnValueOnce([]);

      render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          currentText={identicalText}
          promptId="test-prompt"
        />
      );

      expect(screen.getByText(/No differences found/i)).toBeInTheDocument();
    });
  });

  describe('Legend display', () => {
    it('displays color-coded legend for diff changes', () => {
      render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      expect(screen.getByText('Added')).toBeInTheDocument();
      expect(screen.getByText('Removed')).toBeInTheDocument();
      expect(screen.getByText('Modified')).toBeInTheDocument();
    });

    it('legend has colored boxes for each change type', () => {
      const { container } = render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      // Check for colored legend boxes (bg-green, bg-red, bg-yellow)
      const legendItems = container.querySelectorAll('.bg-green-100, .bg-red-100, .bg-yellow-100');
      expect(legendItems.length).toBeGreaterThan(0);
    });
  });

  describe('Close functionality', () => {
    it('calls onClose when close button is clicked', () => {
      const onCloseMock = jest.fn();

      render(
        <VersionDiffModal
          isOpen={true}
          onClose={onCloseMock}
          version={mockVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Close button in footer is clicked', () => {
      const onCloseMock = jest.fn();

      render(
        <VersionDiffModal
          isOpen={true}
          onClose={onCloseMock}
          version={mockVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      // Get all close buttons and find the footer one (not the X icon)
      const closeButtons = screen.getAllByRole('button', { name: /Close/i });
      const footerCloseButton = closeButtons.find(btn => btn.textContent === 'Close');

      fireEvent.click(footerCloseButton!);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('renders close icon in header', () => {
      render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });
  });

  describe('Diff generation', () => {
    it('generates unified diff format correctly', () => {
      const { createTwoFilesPatch } = require('diff');

      render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      // Verify createTwoFilesPatch was called with correct arguments
      expect(createTwoFilesPatch).toHaveBeenCalledWith(
        'Version 3',
        'Current Version',
        mockVersion.template_text,
        currentText,
        '',
        '',
        { context: 3 }
      );
    });

    it('includes version labels in diff header', () => {
      const { parseDiff } = require('react-diff-view');

      render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      // Check that parseDiff was called with unified diff containing version labels
      const callArgs = parseDiff.mock.calls[0][0];
      expect(callArgs).toContain('Version 3');
      expect(callArgs).toContain('Current Version');
    });
  });

  describe('Modal layout', () => {
    it('renders modal with proper structure', () => {
      render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      // Verify modal renders with expected content
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Version 3 Comparison/i)).toBeInTheDocument();
    });

    it('has scrollable content area', () => {
      const { container } = render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      // Check for overflow-auto on content area
      const contentArea = container.querySelector('.overflow-auto');
      expect(contentArea).toBeInTheDocument();
    });

    it('has fixed header and footer', () => {
      const { container } = render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      // Check for border separators
      const borders = container.querySelectorAll('.border-b, .border-t');
      expect(borders.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label on close button', () => {
      render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });

    it('uses semantic heading for title', () => {
      render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      const title = screen.getByText(/Version 3 Comparison/i);
      expect(title.tagName).toBe('H2');
    });
  });

  describe('Edge cases', () => {
    it('handles empty version text', () => {
      const emptyVersion = { ...mockVersion, template_text: '' };

      render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={emptyVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      // Should not crash and should render
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    it('handles empty current text', () => {
      render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={mockVersion}
          currentText=""
          promptId="test-prompt"
        />
      );

      // Should not crash and should render
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    it('handles very long version text', () => {
      const longText = 'A'.repeat(10000);
      const longVersion = { ...mockVersion, template_text: longText };

      render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={longVersion}
          currentText={currentText}
          promptId="test-prompt"
        />
      );

      // Should display large character count
      expect(screen.getByText(/Characters:.*10,000/i)).toBeInTheDocument();
    });

    it('handles multi-line diffs correctly', () => {
      const multiLineOld = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      const multiLineNew = 'Line 1\nModified Line 2\nLine 3\nNew Line 4\nLine 5';
      const multiLineVersion = { ...mockVersion, template_text: multiLineOld };

      render(
        <VersionDiffModal
          isOpen={true}
          onClose={jest.fn()}
          version={multiLineVersion}
          currentText={multiLineNew}
          promptId="test-prompt"
        />
      );

      // Should render diff component
      expect(screen.getByTestId('diff-component')).toBeInTheDocument();
    });
  });
});
