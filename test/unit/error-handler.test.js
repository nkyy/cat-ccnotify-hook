import { jest } from '@jest/globals';
import { 
  NotificationError, 
  ErrorCodes, 
  handleError,
  createErrorReport 
} from '../../lib/error-handler.js';

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('error-handler', () => {
  beforeEach(() => {
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('NotificationError', () => {
    it('should create error with correct properties', () => {
      const originalError = new Error('Original error');
      const error = new NotificationError(
        'Test error',
        ErrorCodes.NOTIFICATION_FAILED,
        originalError
      );

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('NotificationError');
      expect(error.code).toBe(ErrorCodes.NOTIFICATION_FAILED);
      expect(error.originalError).toBe(originalError);
      expect(error.timestamp).toBeDefined();
    });
  });

  describe('handleError', () => {
    it('should handle file not found error', () => {
      const error = new NotificationError(
        'File missing',
        ErrorCodes.FILE_NOT_FOUND
      );

      const result = handleError(error, { shouldLog: false });

      expect(result.handled).toBe(true);
      expect(result.userMessage).toContain('Required file not found');
      expect(result.recovery).toBe('reinstall');
    });

    it('should handle permission denied error', () => {
      const error = new NotificationError(
        'Access denied',
        ErrorCodes.PERMISSION_DENIED
      );

      const result = handleError(error, { shouldLog: false });

      expect(result.handled).toBe(true);
      expect(result.userMessage).toContain('Permission denied');
      expect(result.recovery).toBe('check-permissions');
    });

    it('should handle audio playback error', () => {
      const error = new NotificationError(
        'Audio failed',
        ErrorCodes.AUDIO_PLAYBACK_FAILED
      );

      const result = handleError(error, { shouldLog: false });

      expect(result.handled).toBe(true);
      expect(result.userMessage).toContain('Audio playback failed');
      expect(result.recovery).toBe('continue-silent');
    });

    it('should execute fallback action', () => {
      const error = new Error('Test error');
      const fallbackAction = jest.fn();

      handleError(error, { 
        shouldLog: false,
        fallbackAction 
      });

      expect(fallbackAction).toHaveBeenCalledWith(error);
    });

    it('should notify user when requested', () => {
      const error = new Error('Test error');

      handleError(error, { 
        shouldLog: false,
        shouldNotifyUser: true 
      });

      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe('createErrorReport', () => {
    it('should create formatted error report', () => {
      const error = new NotificationError(
        'Test error',
        ErrorCodes.SYSTEM_ERROR
      );
      error.stack = 'Test stack trace';

      const report = createErrorReport(error);

      expect(report).toContain('Cat-CCNotify Error Report');
      expect(report).toContain('Test error');
      expect(report).toContain('SYSTEM_ERROR');
      expect(report).toContain('Test stack trace');
      expect(report).toContain('Platform:');
      expect(report).toContain('Node Version:');
    });

    it('should include original error info', () => {
      const originalError = new Error('Original error');
      const error = new NotificationError(
        'Wrapped error',
        ErrorCodes.SYSTEM_ERROR,
        originalError
      );

      const report = createErrorReport(error);

      expect(report).toContain('Original Error:');
      expect(report).toContain('Original error');
    });
  });
});