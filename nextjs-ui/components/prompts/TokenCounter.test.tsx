/**
 * Unit Tests for TokenCounter Component
 * Story 0.4.3: System Prompt Editor Part 2 - Part 5
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TokenCounter } from './TokenCounter';
import type { TokenCount } from '@/types/prompts';

describe('TokenCounter', () => {
  const mockTokenCount: TokenCount = {
    count: 1000,
    characters: 4000,
    words: 800,
    model: 'gpt-4',
  };

  describe('Compact Mode', () => {
    it('should render compact mode by default', () => {
      render(<TokenCounter tokenCount={mockTokenCount} />);

      expect(screen.getByText(/1,000 tokens/i)).toBeInTheDocument();
      expect(screen.queryByText(/character count/i)).not.toBeInTheDocument();
    });

    it('should display safe color when under 70% limit', () => {
      render(<TokenCounter tokenCount={mockTokenCount} maxTokens={2000} />);

      const tokenText = screen.getByText(/1,000 tokens/i);
      expect(tokenText).toHaveClass('text-green-400');
    });

    it('should display warning color when between 70-90% limit', () => {
      render(<TokenCounter tokenCount={mockTokenCount} maxTokens={1200} />);

      const tokenText = screen.getByText(/1,000 tokens/i);
      expect(tokenText).toHaveClass('text-yellow-400');
    });

    it('should display danger color when over 90% limit', () => {
      render(<TokenCounter tokenCount={mockTokenCount} maxTokens={1050} />);

      const tokenText = screen.getByText(/1,000 tokens/i);
      expect(tokenText).toHaveClass('text-red-400');
    });

    it('should show warning icon when at warning level', () => {
      render(
        <TokenCounter tokenCount={mockTokenCount} maxTokens={1200} />
      );

      // Warning icon is shown as emoji, not SVG
      expect(screen.getByText(/⚠️/)).toBeInTheDocument();
    });

    it('should show warning text when approaching limit', () => {
      render(<TokenCounter tokenCount={mockTokenCount} maxTokens={1200} />);

      // Compact mode shows warning text, not percentage
      expect(screen.getByText(/approaching limit/i)).toBeInTheDocument();
    });
  });

  describe('Detailed Mode', () => {
    it('should render detailed mode when specified', () => {
      render(<TokenCounter tokenCount={mockTokenCount} mode="detailed" />);

      expect(screen.getByText(/token usage/i)).toBeInTheDocument();
      expect(screen.getByText(/1,000 tokens/i)).toBeInTheDocument();
      expect(screen.getByText(/4,000 chars/i)).toBeInTheDocument();
      // 800 appears in both formatted count and detail section
      const wordElements = screen.getAllByText(/800 words/i);
      expect(wordElements.length).toBeGreaterThan(0);
    });

    it('should display progress bar with correct percentage', () => {
      const { container } = render(
        <TokenCounter tokenCount={mockTokenCount} maxTokens={2000} mode="detailed" />
      );

      const progressBar = container.querySelector('[style*="width"]');
      expect(progressBar).toHaveStyle({ width: '50%' });
    });

    it('should show model name', () => {
      render(<TokenCounter tokenCount={mockTokenCount} mode="detailed" />);

      expect(screen.getByText(/gpt-4/i)).toBeInTheDocument();
    });

    it('should display estimated cost when available', () => {
      const tokenCountWithCost: TokenCount = {
        ...mockTokenCount,
        estimatedCost: 0.05,
      };

      render(<TokenCounter tokenCount={tokenCountWithCost} mode="detailed" />);

      // Cost appears both in formatted string and in detail display
      const costElements = screen.getAllByText(/\$0\.05/i);
      expect(costElements.length).toBeGreaterThan(0);
    });

    it('should not display cost when unavailable', () => {
      render(<TokenCounter tokenCount={mockTokenCount} mode="detailed" />);

      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    });
  });

  describe('Token Limit Warnings', () => {
    it('should show safe background when under 70%', () => {
      const { container } = render(
        <TokenCounter tokenCount={mockTokenCount} maxTokens={2000} mode="detailed" />
      );

      const detailedView = container.querySelector('.border');
      expect(detailedView).toHaveClass('border-green-500/20');
    });

    it('should show warning background when between 70-90%', () => {
      const { container } = render(
        <TokenCounter tokenCount={mockTokenCount} maxTokens={1200} mode="detailed" />
      );

      const detailedView = container.querySelector('.border');
      expect(detailedView).toHaveClass('border-yellow-500/20');
    });

    it('should show danger background when over 90%', () => {
      const { container } = render(
        <TokenCounter tokenCount={mockTokenCount} maxTokens={1050} mode="detailed" />
      );

      const detailedView = container.querySelector('.border');
      expect(detailedView).toHaveClass('border-red-500/20');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero tokens', () => {
      const zeroTokens: TokenCount = {
        count: 0,
        characters: 0,
        words: 0,
        model: 'gpt-4',
      };

      render(<TokenCounter tokenCount={zeroTokens} />);

      expect(screen.getByText(/0 tokens/i)).toBeInTheDocument();
    });

    it('should handle very large token counts', () => {
      const largeTokens: TokenCount = {
        count: 1234567,
        characters: 5000000,
        words: 1000000,
        model: 'gpt-4',
      };

      render(<TokenCounter tokenCount={largeTokens} />);

      // Large count triggers "Over limit" warning
      expect(screen.getByText(/over limit/i)).toBeInTheDocument();
    });

    it('should cap progress bar at 100%', () => {
      const excessiveTokens: TokenCount = {
        count: 5000,
        characters: 20000,
        words: 4000,
        model: 'gpt-4',
      };

      const { container } = render(
        <TokenCounter tokenCount={excessiveTokens} maxTokens={1000} mode="detailed" />
      );

      const progressBar = container.querySelector('[style*="width"]');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });

    it('should apply custom className', () => {
      const { container } = render(
        <TokenCounter tokenCount={mockTokenCount} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Number Formatting', () => {
    it('should format token count with thousand separators', () => {
      const tokens: TokenCount = {
        count: 12345,
        characters: 50000,
        words: 10000,
        model: 'gpt-4',
      };

      render(<TokenCounter tokenCount={tokens} mode="detailed" />);

      // Should contain formatted numbers with thousand separators
      expect(screen.getByText(/12,345 tokens/i)).toBeInTheDocument();
      const charText = screen.getByText(/50,000.*chars/i);
      expect(charText).toBeInTheDocument();
      const wordElements = screen.getAllByText(/10,000/i);
      expect(wordElements.length).toBeGreaterThan(0); // Can appear in summary and detail
    });
  });
});
