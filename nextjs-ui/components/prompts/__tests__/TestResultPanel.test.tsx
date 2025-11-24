/**
 * Unit Tests for TestResultPanel Component
 * Story: nextjs-story-29-prompts-llm-test
 * Task 10: Unit tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestResultPanel } from '../TestResultPanel';
import type { LLMTestResponse } from '@/lib/hooks/useLLMTest';

// Mock react-markdown and react-syntax-highlighter
jest.mock('react-markdown', () => {
  return function ReactMarkdown({ children }: { children: string }) {
    return <div data-testid="markdown-content">{children}</div>;
  };
});

jest.mock('react-syntax-highlighter', () => ({
  Prism: function SyntaxHighlighter({ children }: { children: string }) {
    return <pre data-testid="syntax-highlighter">{children}</pre>;
  },
}));

jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  dark: {},
}));

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('TestResultPanel', () => {
  const mockResult: LLMTestResponse = {
    response: 'This is a test response',
    usage: {
      input_tokens: 10,
      output_tokens: 8,
      total_tokens: 18,
    },
    execution_time: 1.5,
    cost: 0.0025,
    model: 'gpt-4',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render LLM response', () => {
    render(<TestResultPanel result={mockResult} />);

    expect(screen.getByTestId('markdown-content')).toHaveTextContent(
      'This is a test response'
    );
  });

  it('should display token usage metrics', () => {
    render(<TestResultPanel result={mockResult} />);

    expect(screen.getByText(/10 input/)).toBeInTheDocument();
    expect(screen.getByText(/8 output/)).toBeInTheDocument();
    expect(screen.getByText(/18 total tokens/)).toBeInTheDocument();
  });

  it('should display execution time', () => {
    render(<TestResultPanel result={mockResult} />);

    expect(screen.getByText('1.5s execution time')).toBeInTheDocument();
  });

  it('should display cost', () => {
    render(<TestResultPanel result={mockResult} />);

    expect(screen.getByText('$0.0025 USD cost')).toBeInTheDocument();
  });

  it('should display model name', () => {
    render(<TestResultPanel result={mockResult} />);

    expect(screen.getByText('Model: gpt-4')).toBeInTheDocument();
  });

  it('should copy response to clipboard on copy button click', async () => {
    const { toast } = require('sonner');

    render(<TestResultPanel result={mockResult} />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'This is a test response'
      );
    });

    expect(toast.success).toHaveBeenCalledWith('Response copied to clipboard');
  });

  it('should show "Copied" text after successful copy', async () => {
    render(<TestResultPanel result={mockResult} />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });
  });

  it('should handle clipboard copy error', async () => {
    const { toast } = require('sonner');
    (navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(
      new Error('Copy failed')
    );

    render(<TestResultPanel result={mockResult} />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to copy response');
    });
  });

  it('should display variables section when variables provided', () => {
    const variables = {
      ticket_id: 'SAMPLE-123',
      tenant_name: 'Test Tenant',
    };

    render(<TestResultPanel result={mockResult} variables={variables} />);

    expect(screen.getByText('Variables Used:')).toBeInTheDocument();
    expect(screen.getByText('{{ticket_id}}:')).toBeInTheDocument();
    expect(screen.getByText('SAMPLE-123')).toBeInTheDocument();
    expect(screen.getByText('{{tenant_name}}:')).toBeInTheDocument();
    expect(screen.getByText('Test Tenant')).toBeInTheDocument();
  });

  it('should not display variables section when no variables', () => {
    render(<TestResultPanel result={mockResult} />);

    expect(screen.queryByText('Variables Used:')).not.toBeInTheDocument();
  });

  it('should not display variables section when empty variables object', () => {
    render(<TestResultPanel result={mockResult} variables={{}} />);

    expect(screen.queryByText('Variables Used:')).not.toBeInTheDocument();
  });

  it('should handle Ctrl+K keyboard shortcut for copy', async () => {
    render(<TestResultPanel result={mockResult} />);

    const panel = screen.getByRole('button', { name: /copy/i }).closest('div');

    fireEvent.keyDown(panel!, {
      key: 'k',
      ctrlKey: true,
    });

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'This is a test response'
      );
    });
  });

  it('should handle Cmd+K keyboard shortcut for copy on Mac', async () => {
    render(<TestResultPanel result={mockResult} />);

    const panel = screen.getByRole('button', { name: /copy/i }).closest('div');

    fireEvent.keyDown(panel!, {
      key: 'k',
      metaKey: true,
    });

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'This is a test response'
      );
    });
  });

  it('should have proper ARIA label for copy button', () => {
    render(<TestResultPanel result={mockResult} />);

    const copyButton = screen.getByLabelText(
      /Copy response to clipboard \(Ctrl\+K\)/i
    );
    expect(copyButton).toBeInTheDocument();
  });

  it('should format cost to 4 decimal places', () => {
    const resultWithHighCost: LLMTestResponse = {
      ...mockResult,
      cost: 1.23456789,
    };

    render(<TestResultPanel result={resultWithHighCost} />);

    expect(screen.getByText('$1.2346 USD cost')).toBeInTheDocument();
  });

  it('should format execution time to 1 decimal place', () => {
    const resultWithLongTime: LLMTestResponse = {
      ...mockResult,
      execution_time: 12.3456,
    };

    render(<TestResultPanel result={resultWithLongTime} />);

    expect(screen.getByText('12.3s execution time')).toBeInTheDocument();
  });
});
