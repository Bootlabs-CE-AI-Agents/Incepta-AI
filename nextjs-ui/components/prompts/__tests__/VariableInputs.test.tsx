/**
 * Unit Tests for VariableInputs Component
 * Story: nextjs-story-29-prompts-llm-test
 * Task 10: Unit tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { VariableInputs } from '../VariableInputs';

describe('VariableInputs', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('should render input fields for all variables', () => {
    const variables = ['name', 'email', 'phone'];
    const values = { name: 'John', email: '', phone: '' };

    render(
      <VariableInputs
        variables={variables}
        values={values}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
  });

  it('should display current values in inputs', () => {
    const variables = ['name', 'email'];
    const values = { name: 'John Doe', email: 'john@example.com' };

    render(
      <VariableInputs
        variables={variables}
        values={values}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
  });

  it('should call onChange when input value changes', () => {
    const variables = ['name'];
    const values = { name: '' };

    render(
      <VariableInputs
        variables={variables}
        values={values}
        onChange={mockOnChange}
      />
    );

    const input = screen.getByLabelText(/name/i);
    fireEvent.change(input, { target: { value: 'Jane' } });

    expect(mockOnChange).toHaveBeenCalledWith('name', 'Jane');
  });

  it('should render empty state when no variables', () => {
    const variables: string[] = [];
    const values = {};

    const { container } = render(
      <VariableInputs
        variables={variables}
        values={values}
        onChange={mockOnChange}
      />
    );

    expect(container.querySelector('input')).not.toBeInTheDocument();
  });

  it('should handle multiple onChange calls', () => {
    const variables = ['var1', 'var2'];
    const values = { var1: '', var2: '' };

    render(
      <VariableInputs
        variables={variables}
        values={values}
        onChange={mockOnChange}
      />
    );

    const input1 = screen.getByLabelText(/var1/i);
    const input2 = screen.getByLabelText(/var2/i);

    fireEvent.change(input1, { target: { value: 'value1' } });
    fireEvent.change(input2, { target: { value: 'value2' } });

    expect(mockOnChange).toHaveBeenCalledTimes(2);
    expect(mockOnChange).toHaveBeenNthCalledWith(1, 'var1', 'value1');
    expect(mockOnChange).toHaveBeenNthCalledWith(2, 'var2', 'value2');
  });

  it('should display variable names as labels', () => {
    const variables = ['ticket_id', 'tenant_name'];
    const values = { ticket_id: '', tenant_name: '' };

    render(
      <VariableInputs
        variables={variables}
        values={values}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('{{ticket_id}}:')).toBeInTheDocument();
    expect(screen.getByText('{{tenant_name}}:')).toBeInTheDocument();
  });

  it('should handle empty string values', () => {
    const variables = ['name'];
    const values = { name: '' };

    render(
      <VariableInputs
        variables={variables}
        values={values}
        onChange={mockOnChange}
      />
    );

    const input = screen.getByLabelText(/name/i) as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('should handle undefined values for variables', () => {
    const variables = ['name', 'email'];
    const values = { name: 'John' }; // email is undefined

    render(
      <VariableInputs
        variables={variables}
        values={values}
        onChange={mockOnChange}
      />
    );

    const nameInput = screen.getByDisplayValue('John') as HTMLInputElement;
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;

    expect(nameInput.value).toBe('John');
    expect(emailInput.value).toBe('');
  });

  it('should be accessible with proper ARIA labels', () => {
    const variables = ['name'];
    const values = { name: '' };

    render(
      <VariableInputs
        variables={variables}
        values={values}
        onChange={mockOnChange}
      />
    );

    const input = screen.getByLabelText(/Value for variable name/i);
    expect(input).toHaveAttribute('aria-label');
  });
});
