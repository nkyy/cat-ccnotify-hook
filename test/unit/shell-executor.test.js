import { jest } from '@jest/globals';
import { 
  escapeAppleScript, 
  sanitizeNotificationContent 
} from '../../lib/shell-executor.js';

describe('shell-executor', () => {
  describe('escapeAppleScript', () => {
    it('should escape double quotes', () => {
      const input = 'Hello "World"';
      const expected = 'Hello \\"World\\"';
      expect(escapeAppleScript(input)).toBe(expected);
    });

    it('should escape backslashes', () => {
      const input = 'Path\\to\\file';
      const expected = 'Path\\\\to\\\\file';
      expect(escapeAppleScript(input)).toBe(expected);
    });

    it('should escape newlines', () => {
      const input = 'Line 1\nLine 2';
      const expected = 'Line 1\\nLine 2';
      expect(escapeAppleScript(input)).toBe(expected);
    });

    it('should handle empty strings', () => {
      expect(escapeAppleScript('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(escapeAppleScript(null)).toBe('');
      expect(escapeAppleScript(undefined)).toBe('');
      expect(escapeAppleScript(123)).toBe('');
    });

    it('should escape multiple special characters', () => {
      const input = 'Test "quote" and\\backslash\nand newline\tand tab';
      const expected = 'Test \\"quote\\" and\\\\backslash\\nand newline\\tand tab';
      expect(escapeAppleScript(input)).toBe(expected);
    });
  });

  describe('sanitizeNotificationContent', () => {
    it('should remove control characters', () => {
      const input = 'Hello\x00World\x01Test\x1F';
      const expected = 'HelloWorldTest';
      expect(sanitizeNotificationContent(input)).toBe(expected);
    });

    it('should preserve newlines and tabs', () => {
      const input = 'Line 1\nLine 2\tTabbed';
      expect(sanitizeNotificationContent(input)).toBe(input);
    });

    it('should truncate long content', () => {
      const longString = 'a'.repeat(1500);
      const result = sanitizeNotificationContent(longString);
      expect(result.length).toBe(1003); // 1000 + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('should handle empty strings', () => {
      expect(sanitizeNotificationContent('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitizeNotificationContent(null)).toBe('');
      expect(sanitizeNotificationContent(undefined)).toBe('');
      expect(sanitizeNotificationContent(123)).toBe('');
    });
  });
});