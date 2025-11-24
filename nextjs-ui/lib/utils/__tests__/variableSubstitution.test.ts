/**
 * Unit Tests for Variable Substitution Utilities
 * Story: nextjs-story-29-prompts-llm-test
 * Task 10: Unit tests
 */

import {
  extractVariables,
  substituteVariables,
  getDefaultVariableValues,
  getMissingVariables,
} from '../variableSubstitution';

describe('extractVariables', () => {
  it('should extract single variable from text', () => {
    const text = 'Hello {{name}}!';
    expect(extractVariables(text)).toEqual(['name']);
  });

  it('should extract multiple variables from text', () => {
    const text = 'Ticket {{ticket_id}} for {{tenant_name}}';
    expect(extractVariables(text)).toEqual(['ticket_id', 'tenant_name']);
  });

  it('should extract unique variables only', () => {
    const text = 'Hello {{name}}, welcome {{name}}!';
    expect(extractVariables(text)).toEqual(['name']);
  });

  it('should trim whitespace from variable names', () => {
    const text = 'Hello {{ name }}!';
    expect(extractVariables(text)).toEqual(['name']);
  });

  it('should return empty array for text with no variables', () => {
    const text = 'Hello world!';
    expect(extractVariables(text)).toEqual([]);
  });

  it('should handle multiline text with variables', () => {
    const text = `Line 1: {{var1}}
Line 2: {{var2}}
Line 3: {{var3}}`;
    expect(extractVariables(text)).toEqual(['var1', 'var2', 'var3']);
  });

  it('should handle empty string', () => {
    expect(extractVariables('')).toEqual([]);
  });
});

describe('substituteVariables', () => {
  it('should substitute single variable', () => {
    const text = 'Hello {{name}}!';
    const values = { name: 'John' };
    expect(substituteVariables(text, values)).toBe('Hello John!');
  });

  it('should substitute multiple variables', () => {
    const text = 'Ticket {{ticket_id}} for {{tenant_name}}';
    const values = { ticket_id: 'SAMPLE-123', tenant_name: 'Acme Corp' };
    expect(substituteVariables(text, values)).toBe(
      'Ticket SAMPLE-123 for Acme Corp'
    );
  });

  it('should leave unmatched variables unchanged', () => {
    const text = 'Hello {{name}} and {{other}}!';
    const values = { name: 'John' };
    expect(substituteVariables(text, values)).toBe('Hello John and {{other}}!');
  });

  it('should handle empty values object', () => {
    const text = 'Hello {{name}}!';
    expect(substituteVariables(text, {})).toBe('Hello {{name}}!');
  });

  it('should handle text with no variables', () => {
    const text = 'Hello world!';
    const values = { name: 'John' };
    expect(substituteVariables(text, values)).toBe('Hello world!');
  });

  it('should substitute with whitespace trimming', () => {
    const text = 'Hello {{ name }}!';
    const values = { name: 'John' };
    expect(substituteVariables(text, values)).toBe('Hello John!');
  });

  it('should handle empty string substitution', () => {
    const text = 'Hello {{name}}!';
    const values = { name: '' };
    expect(substituteVariables(text, values)).toBe('Hello !');
  });
});

describe('getDefaultVariableValues', () => {
  it('should provide default for ticket_id variable', () => {
    const defaults = getDefaultVariableValues(['ticket_id']);
    expect(defaults.ticket_id).toBe('SAMPLE-123');
  });

  it('should provide default for tenant variable', () => {
    const defaults = getDefaultVariableValues(['tenant_name']);
    expect(defaults.tenant_name).toBe('Test Tenant');
  });

  it('should provide default for user_name variable', () => {
    const defaults = getDefaultVariableValues(['user_name']);
    expect(defaults.user_name).toBe('John Doe');
  });

  it('should provide default for email variable', () => {
    const defaults = getDefaultVariableValues(['email']);
    expect(defaults.email).toBe('user@example.com');
  });

  it('should provide default for date variable', () => {
    const defaults = getDefaultVariableValues(['date']);
    expect(defaults.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should provide default for time variable', () => {
    const defaults = getDefaultVariableValues(['time']);
    expect(typeof defaults.time).toBe('string');
  });

  it('should provide fallback default for unknown variable', () => {
    const defaults = getDefaultVariableValues(['unknown_var']);
    expect(defaults.unknown_var).toBe('[unknown_var]');
  });

  it('should handle multiple variables', () => {
    const defaults = getDefaultVariableValues([
      'ticket_id',
      'tenant',
      'unknown',
    ]);
    expect(defaults).toEqual({
      ticket_id: 'SAMPLE-123',
      tenant: 'Test Tenant',
      unknown: '[unknown]',
    });
  });

  it('should handle empty array', () => {
    expect(getDefaultVariableValues([])).toEqual({});
  });
});

describe('getMissingVariables', () => {
  it('should return missing variables', () => {
    const variableNames = ['name', 'email', 'phone'];
    const values = { name: 'John' };
    expect(getMissingVariables(variableNames, values)).toEqual([
      'email',
      'phone',
    ]);
  });

  it('should return empty array when all variables have values', () => {
    const variableNames = ['name', 'email'];
    const values = { name: 'John', email: 'john@example.com' };
    expect(getMissingVariables(variableNames, values)).toEqual([]);
  });

  it('should treat empty string as missing', () => {
    const variableNames = ['name', 'email'];
    const values = { name: 'John', email: '' };
    expect(getMissingVariables(variableNames, values)).toEqual(['email']);
  });

  it('should treat whitespace-only string as missing', () => {
    const variableNames = ['name', 'email'];
    const values = { name: 'John', email: '   ' };
    expect(getMissingVariables(variableNames, values)).toEqual(['email']);
  });

  it('should handle empty variable names array', () => {
    const values = { name: 'John' };
    expect(getMissingVariables([], values)).toEqual([]);
  });

  it('should handle empty values object', () => {
    const variableNames = ['name', 'email'];
    expect(getMissingVariables(variableNames, {})).toEqual(['name', 'email']);
  });
});
