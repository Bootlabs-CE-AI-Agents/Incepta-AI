/**
 * Worker utility functions tests
 *
 * Tests for formatUptime, getCPUMemoryColor, abbreviateNumber
 * Per AC-3 requirements
 */

import { formatUptime, getCPUMemoryColor, abbreviateNumber } from '@/lib/utils/workers';

describe('formatUptime', () => {
  it('formats uptime < 1 min', () => {
    expect(formatUptime(45)).toBe('< 1m');
    expect(formatUptime(30)).toBe('< 1m');
    expect(formatUptime(0)).toBe('< 1m');
  });

  it('formats uptime in minutes', () => {
    expect(formatUptime(120)).toBe('2m');
    expect(formatUptime(3540)).toBe('59m');
  });

  it('formats uptime in hours with minutes', () => {
    expect(formatUptime(3600)).toBe('1h');
    expect(formatUptime(3900)).toBe('1h 5m');
    expect(formatUptime(7200)).toBe('2h');
  });

  it('formats uptime in days with hours', () => {
    expect(formatUptime(86400)).toBe('1d');
    expect(formatUptime(90000)).toBe('1d 1h');
    expect(formatUptime(259200)).toBe('3d');
  });

  it('handles edge case: exactly 1 hour', () => {
    expect(formatUptime(3600)).toBe('1h');
  });

  it('handles edge case: exactly 1 day', () => {
    expect(formatUptime(86400)).toBe('1d');
  });
});

describe('getCPUMemoryColor', () => {
  it('returns green for values < 70%', () => {
    expect(getCPUMemoryColor(0)).toBe('text-green-600');
    expect(getCPUMemoryColor(50)).toBe('text-green-600');
    expect(getCPUMemoryColor(69.9)).toBe('text-green-600');
  });

  it('returns yellow for values 70-85%', () => {
    expect(getCPUMemoryColor(70)).toBe('text-yellow-600');
    expect(getCPUMemoryColor(75)).toBe('text-yellow-600');
    expect(getCPUMemoryColor(85)).toBe('text-yellow-600');
  });

  it('returns red + bold for values > 85%', () => {
    expect(getCPUMemoryColor(85.1)).toBe('text-red-600 font-bold');
    expect(getCPUMemoryColor(90)).toBe('text-red-600 font-bold');
    expect(getCPUMemoryColor(100)).toBe('text-red-600 font-bold');
  });

  it('handles exact threshold boundaries', () => {
    expect(getCPUMemoryColor(70)).toBe('text-yellow-600');
    expect(getCPUMemoryColor(85)).toBe('text-yellow-600');
    expect(getCPUMemoryColor(85.01)).toBe('text-red-600 font-bold');
  });
});

describe('abbreviateNumber', () => {
  it('returns number as-is for values < 1000', () => {
    expect(abbreviateNumber(0)).toBe('0');
    expect(abbreviateNumber(123)).toBe('123');
    expect(abbreviateNumber(999)).toBe('999');
  });

  it('abbreviates thousands with K suffix', () => {
    expect(abbreviateNumber(1000)).toBe('1.0K');
    expect(abbreviateNumber(1234)).toBe('1.2K');
    expect(abbreviateNumber(45300)).toBe('45.3K');
    expect(abbreviateNumber(999999)).toBe('1000.0K');
  });

  it('abbreviates millions with M suffix', () => {
    expect(abbreviateNumber(1_000_000)).toBe('1.0M');
    expect(abbreviateNumber(1_500_000)).toBe('1.5M');
    expect(abbreviateNumber(45_300_000)).toBe('45.3M');
  });

  it('abbreviates billions with B suffix', () => {
    expect(abbreviateNumber(1_000_000_000)).toBe('1.0B');
    expect(abbreviateNumber(5_500_000_000)).toBe('5.5B');
  });

  it('handles edge cases', () => {
    expect(abbreviateNumber(1001)).toBe('1.0K');
    expect(abbreviateNumber(1_000_001)).toBe('1.0M');
  });
});
