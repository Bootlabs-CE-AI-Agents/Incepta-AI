/**
 * Unit Tests for PromptVersionHistory Component
 * Story 0.4.3: System Prompt Editor Part 2 - Part 5
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PromptVersionHistory } from './PromptVersionHistory';
import type { PromptVersionResponse, PromptVersionDetail } from '@/types/prompts';

// Mock window.confirm
global.confirm = jest.fn();

describe('PromptVersionHistory', () => {
  const mockOnViewVersion = jest.fn();
  const mockOnRevertVersion = jest.fn();

  const mockVersions: PromptVersionResponse[] = [
    {
      id: 'v3',
      agent_id: 'agent-1',
      version: 3,
      description: 'Latest update',
      created_by: 'Alice',
      created_at: '2024-01-15T10:00:00Z',
      is_current: true,
    },
    {
      id: 'v2',
      agent_id: 'agent-1',
      version: 2,
      description: 'Bug fix',
      created_by: 'Bob',
      created_at: '2024-01-14T10:00:00Z',
      is_current: false,
    },
    {
      id: 'v1',
      agent_id: 'agent-1',
      version: 1,
      created_by: 'Alice',
      created_at: '2024-01-13T10:00:00Z',
      is_current: false,
    },
  ];

  const mockVersionDetail: PromptVersionDetail = {
    id: 'v2',
    agent_id: 'agent-1',
    prompt_text: 'You are a helpful assistant. Version 2.',
    version: 2,
    description: 'Bug fix',
    created_by: 'Bob',
    created_at: '2024-01-14T10:00:00Z',
    is_current: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.confirm as jest.Mock).mockReturnValue(true);
  });

  describe('Version List Display', () => {
    it('should render all versions', () => {
      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={mockVersions}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
        />
      );

      expect(screen.getByText('Version 3')).toBeInTheDocument();
      expect(screen.getByText('Version 2')).toBeInTheDocument();
      expect(screen.getByText('Version 1')).toBeInTheDocument();
    });

    it('should display version count in header', () => {
      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={mockVersions}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
        />
      );

      expect(screen.getByText(/version history \(3\)/i)).toBeInTheDocument();
    });

    it('should show current badge for current version', () => {
      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={mockVersions}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
        />
      );

      expect(screen.getByText('Current')).toBeInTheDocument();
    });

    it('should show latest badge for newest version', () => {
      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={mockVersions}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
        />
      );

      expect(screen.getByText('Latest')).toBeInTheDocument();
    });

    it('should display version descriptions', () => {
      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={mockVersions}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
        />
      );

      expect(screen.getByText('Latest update')).toBeInTheDocument();
      expect(screen.getByText('Bug fix')).toBeInTheDocument();
    });

    it('should display creator names', () => {
      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={mockVersions}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
        />
      );

      expect(screen.getByText(/by alice/i)).toBeInTheDocument();
      expect(screen.getByText(/by bob/i)).toBeInTheDocument();
    });

    it('should display relative timestamps', () => {
      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={mockVersions}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
        />
      );

      // Should contain "ago" for relative time
      const timestamps = screen.getAllByText(/ago/i);
      expect(timestamps.length).toBeGreaterThan(0);
    });
  });

  describe('View Version', () => {
    it('should call onViewVersion when view button is clicked', async () => {
      const user = userEvent.setup();
      mockOnViewVersion.mockResolvedValue(mockVersionDetail);

      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={mockVersions}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
        />
      );

      const viewButtons = screen.getAllByTitle(/view this version/i);
      await user.click(viewButtons[1]); // Click second version

      expect(mockOnViewVersion).toHaveBeenCalledWith('v2');
    });

    it('should display version detail modal after viewing', async () => {
      const user = userEvent.setup();
      mockOnViewVersion.mockResolvedValue(mockVersionDetail);

      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={mockVersions}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
        />
      );

      const viewButtons = screen.getAllByTitle(/view this version/i);
      await user.click(viewButtons[1]);

      await waitFor(() => {
        expect(screen.getByText(/version 2 details/i)).toBeInTheDocument();
        expect(screen.getByText(/you are a helpful assistant\. version 2\./i)).toBeInTheDocument();
      });
    });

    it('should show loading state while fetching version', async () => {
      const user = userEvent.setup();
      mockOnViewVersion.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockVersionDetail), 100))
      );

      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={mockVersions}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
        />
      );

      const viewButtons = screen.getAllByTitle(/view this version/i);
      await user.click(viewButtons[1]);

      // View button should be disabled during loading
      expect(viewButtons[1]).toBeDisabled();
    });

    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup();
      mockOnViewVersion.mockResolvedValue(mockVersionDetail);

      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={mockVersions}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
        />
      );

      const viewButtons = screen.getAllByTitle(/view this version/i);
      await user.click(viewButtons[1]);

      await waitFor(() => {
        expect(screen.getByText(/version 2 details/i)).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      expect(screen.queryByText(/version 2 details/i)).not.toBeInTheDocument();
    });
  });

  describe('Revert Version', () => {
    it('should not show revert button for current version', () => {
      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={mockVersions}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
        />
      );

      const revertButtons = screen.queryAllByTitle(/revert to this version/i);
      // Should have revert buttons only for non-current versions (2 out of 3)
      expect(revertButtons.length).toBe(2);
    });

    it('should show confirmation dialog when reverting', async () => {
      const user = userEvent.setup();
      mockOnRevertVersion.mockResolvedValue(undefined);

      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={mockVersions}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
        />
      );

      const revertButtons = screen.getAllByTitle(/revert to this version/i);
      await user.click(revertButtons[0]);

      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure')
      );
    });

    it('should call onRevertVersion when confirmed', async () => {
      const user = userEvent.setup();
      mockOnRevertVersion.mockResolvedValue(undefined);

      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={mockVersions}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
        />
      );

      const revertButtons = screen.getAllByTitle(/revert to this version/i);
      await user.click(revertButtons[0]);

      await waitFor(() => {
        expect(mockOnRevertVersion).toHaveBeenCalledWith('v2');
      });
    });

    it('should not revert when confirmation is cancelled', async () => {
      const user = userEvent.setup();
      (global.confirm as jest.Mock).mockReturnValue(false);

      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={mockVersions}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
        />
      );

      const revertButtons = screen.getAllByTitle(/revert to this version/i);
      await user.click(revertButtons[0]);

      expect(mockOnRevertVersion).not.toHaveBeenCalled();
    });

    it('should show loading spinner during revert', async () => {
      const user = userEvent.setup();
      mockOnRevertVersion.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={mockVersions}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
        />
      );

      const revertButtons = screen.getAllByTitle(/revert to this version/i);
      await user.click(revertButtons[0]);

      // Should show loading spinner
      const spinner = revertButtons[0].querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should revert from version detail modal', async () => {
      const user = userEvent.setup();
      mockOnViewVersion.mockResolvedValue(mockVersionDetail);
      mockOnRevertVersion.mockResolvedValue(undefined);

      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={mockVersions}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
        />
      );

      // Open modal
      const viewButtons = screen.getAllByTitle(/view this version/i);
      await user.click(viewButtons[1]);

      await waitFor(() => {
        expect(screen.getByText(/version 2 details/i)).toBeInTheDocument();
      });

      // Click revert in modal
      const revertButton = screen.getByText(/revert to this version/i);
      await user.click(revertButton);

      await waitFor(() => {
        expect(mockOnRevertVersion).toHaveBeenCalledWith('v2');
      });
    });
  });

  describe('Loading State', () => {
    it('should display loading spinner when isLoading is true', () => {
      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={[]}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
          isLoading={true}
        />
      );

      const spinner = screen.getByRole('generic', { hidden: true });
      expect(spinner).toHaveClass('animate-spin');
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no versions available', () => {
      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={[]}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
        />
      );

      expect(screen.getByText(/no version history available/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle versions without descriptions', () => {
      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={mockVersions}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
        />
      );

      // Version 1 has no description, should still render
      expect(screen.getByText('Version 1')).toBeInTheDocument();
    });

    it('should handle versions without creator', () => {
      const versionsNoCreator: PromptVersionResponse[] = [
        {
          ...mockVersions[0],
          created_by: undefined,
        },
      ];

      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={versionsNoCreator}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
        />
      );

      // Should not crash, should still show timestamp
      expect(screen.getByText(/ago/i)).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={mockVersions}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should handle view version error gracefully', async () => {
      const user = userEvent.setup();
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockOnViewVersion.mockRejectedValue(new Error('API error'));

      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={mockVersions}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
        />
      );

      const viewButtons = screen.getAllByTitle(/view this version/i);
      await user.click(viewButtons[1]);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to load version:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });

    it('should handle revert version error gracefully', async () => {
      const user = userEvent.setup();
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();
      mockOnRevertVersion.mockRejectedValue(new Error('API error'));

      render(
        <PromptVersionHistory
          agentId="agent-1"
          versions={mockVersions}
          currentPrompt="Current"
          onViewVersion={mockOnViewVersion}
          onRevertVersion={mockOnRevertVersion}
        />
      );

      const revertButtons = screen.getAllByTitle(/revert to this version/i);
      await user.click(revertButtons[0]);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith(
          'Failed to revert version. Please try again.'
        );
      });

      consoleError.mockRestore();
      alertSpy.mockRestore();
    });
  });
});
