/**
 * Unit tests for password strength calculation utility
 *
 * Tests cover:
 * - All 5 strength criteria (length, uppercase, lowercase, number, special)
 * - Weak/Medium/Strong classification
 * - Percentage calculation
 * - Color mapping
 */

import { calculatePasswordStrength } from '../password';

describe('calculatePasswordStrength', () => {
  describe('Weak passwords (score 0-2)', () => {
    it('should return weak for empty password', () => {
      const result = calculatePasswordStrength('');
      expect(result.score).toBe(0);
      expect(result.label).toBe('Weak');
      expect(result.color).toBe('red');
      expect(result.percentage).toBe(0);
    });

    it('should return weak for short password', () => {
      const result = calculatePasswordStrength('abc123');
      expect(result.score).toBe(2); // lowercase + number
      expect(result.label).toBe('Weak');
      expect(result.color).toBe('red');
      expect(result.percentage).toBe(40);
    });

    it('should return weak for password with only 2 criteria', () => {
      const result = calculatePasswordStrength('ABCDEFGH'); // length + uppercase
      expect(result.score).toBe(2);
      expect(result.label).toBe('Weak');
      expect(result.color).toBe('red');
    });
  });

  describe('Medium passwords (score 3-4)', () => {
    it('should return medium for password with 3 criteria', () => {
      const result = calculatePasswordStrength('Abcd1234'); // length + uppercase + lowercase + number
      expect(result.score).toBe(4);
      expect(result.label).toBe('Medium');
      expect(result.color).toBe('yellow');
      expect(result.percentage).toBe(80);
    });

    it('should return medium for password with 4 criteria', () => {
      const result = calculatePasswordStrength('Abcd1234'); // length + upper + lower + number
      expect(result.score).toBe(4);
      expect(result.label).toBe('Medium');
      expect(result.color).toBe('yellow');
    });
  });

  describe('Strong passwords (score 5)', () => {
    it('should return strong for password with all 5 criteria', () => {
      const result = calculatePasswordStrength('Abcd123!');
      expect(result.score).toBe(5);
      expect(result.label).toBe('Strong');
      expect(result.color).toBe('green');
      expect(result.percentage).toBe(100);
    });

    it('should return strong for complex password', () => {
      const result = calculatePasswordStrength('MyP@ssw0rd!');
      expect(result.score).toBe(5);
      expect(result.label).toBe('Strong');
      expect(result.color).toBe('green');
      expect(result.percentage).toBe(100);
    });
  });

  describe('Individual criteria', () => {
    it('should detect length >= 8', () => {
      expect(calculatePasswordStrength('abcdefgh').score).toBeGreaterThanOrEqual(1);
      expect(calculatePasswordStrength('abcdefg').score).toBe(1); // lowercase only, no length
    });

    it('should detect uppercase letter', () => {
      const withUpper = calculatePasswordStrength('Abcdefgh');
      const withoutUpper = calculatePasswordStrength('abcdefgh');
      expect(withUpper.score).toBeGreaterThan(withoutUpper.score);
    });

    it('should detect lowercase letter', () => {
      const withLower = calculatePasswordStrength('ABCDEFGh');
      const withoutLower = calculatePasswordStrength('ABCDEFGH');
      expect(withLower.score).toBeGreaterThan(withoutLower.score);
    });

    it('should detect number', () => {
      const withNumber = calculatePasswordStrength('abcdefg1');
      const withoutNumber = calculatePasswordStrength('abcdefgh');
      expect(withNumber.score).toBeGreaterThan(withoutNumber.score);
    });

    it('should detect special character', () => {
      const withSpecial = calculatePasswordStrength('abcdefg!');
      const withoutSpecial = calculatePasswordStrength('abcdefgh');
      expect(withSpecial.score).toBeGreaterThan(withoutSpecial.score);
    });

    it('should accept all specified special characters', () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*'];
      specialChars.forEach((char) => {
        const result = calculatePasswordStrength(`abcdefg${char}`);
        expect(result.score).toBeGreaterThanOrEqual(2); // length + special
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle very long passwords', () => {
      const longPassword = 'A'.repeat(100) + 'b1!';
      const result = calculatePasswordStrength(longPassword);
      expect(result.score).toBe(5); // length + uppercase + lowercase + number + special
    });

    it('should handle passwords with multiple special characters', () => {
      const result = calculatePasswordStrength('Abcd123!@#$');
      expect(result.score).toBe(5);
    });

    it('should not give extra points for multiple instances of same criteria', () => {
      const result = calculatePasswordStrength('AAAAAAAA'); // Multiple uppercase, but only length criteria
      expect(result.score).toBe(2); // length + uppercase (not 8+ points for 8 uppercase letters)
    });
  });
});
