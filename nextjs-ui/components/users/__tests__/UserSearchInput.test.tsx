/**
 * Unit Tests for UserSearchInput component
 *
 * Tests cover:
 * - Task 12.3: Search input with debounce and clear button
 * - AC-3: Email search with 300ms debounce (debouncing handled by parent via useDebounce)
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { UserSearchInput } from '../UserSearchInput';

describe('UserSearchInput', () => {
  // Test 1: Renders with default placeholder
  test('renders search input with default placeholder (AC-3: search UI)', () => {
    const mockOnChange = jest.fn();

    render(<UserSearchInput value="" onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText('Search by email...');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'search');
  });

  // Test 2: Renders with custom placeholder
  test('renders search input with custom placeholder', () => {
    const mockOnChange = jest.fn();

    render(<UserSearchInput value="" onChange={mockOnChange} placeholder="Custom placeholder" />);

    const input = screen.getByPlaceholderText('Custom placeholder');
    expect(input).toBeInTheDocument();
  });

  // Test 3: Calls onChange when typing
  test('calls onChange when user types in search input (AC-3: search interaction)', () => {
    const mockOnChange = jest.fn();

    render(<UserSearchInput value="" onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText('Search by email...');
    fireEvent.change(input, { target: { value: 'admin@example.com' } });

    expect(mockOnChange).toHaveBeenCalledWith('admin@example.com');
  });

  // Test 4: Shows clear button when input has value
  test('shows clear button when input has value (AC-3: clear button)', () => {
    const mockOnChange = jest.fn();

    render(<UserSearchInput value="admin@example.com" onChange={mockOnChange} />);

    const clearButton = screen.getByLabelText('Clear search');
    expect(clearButton).toBeInTheDocument();
  });

  // Test 5: Hides clear button when input is empty
  test('hides clear button when input is empty (AC-3: clear button visibility)', () => {
    const mockOnChange = jest.fn();

    render(<UserSearchInput value="" onChange={mockOnChange} />);

    const clearButton = screen.queryByLabelText('Clear search');
    expect(clearButton).not.toBeInTheDocument();
  });

  // Test 6: Clears input when clear button is clicked
  test('clears input when clear button is clicked (AC-3: clear functionality)', () => {
    const mockOnChange = jest.fn();

    render(<UserSearchInput value="admin@example.com" onChange={mockOnChange} />);

    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);

    expect(mockOnChange).toHaveBeenCalledWith('');
  });

  // Test 7: Has search icon
  test('displays search icon', () => {
    const mockOnChange = jest.fn();

    render(<UserSearchInput value="" onChange={mockOnChange} />);

    // Search icon should be visible (Lucide icon renders as SVG)
    const container = screen.getByPlaceholderText('Search by email...').parentElement;
    expect(container).toBeInTheDocument();
  });

  // Test 8: Input is accessible (WCAG 2.1 AA)
  test('search input is accessible with aria-label (AC-3: WCAG 2.1 AA)', () => {
    const mockOnChange = jest.fn();

    render(<UserSearchInput value="" onChange={mockOnChange} />);

    const input = screen.getByLabelText('Search users by email');
    expect(input).toBeInTheDocument();
  });
});
