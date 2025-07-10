/**
 * Error handling utilities for cat-ccnotify-hook
 * Provides comprehensive error handling and recovery strategies
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const errorLogDir = join(homedir(), '.claude', 'cat-ccnotify', 'errors');
const errorLogFile = join(errorLogDir, 'error.log');

/**
 * Custom error class for notification-specific errors
 */
export class NotificationError extends Error {
  constructor(message, code, originalError = null) {
    super(message);
    this.name = 'NotificationError';
    this.code = code;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Error codes for different failure scenarios
 */
export const ErrorCodes = {
  INVALID_INPUT: 'INVALID_INPUT',
  NOTIFICATION_FAILED: 'NOTIFICATION_FAILED',
  AUDIO_PLAYBACK_FAILED: 'AUDIO_PLAYBACK_FAILED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  TIMEOUT: 'TIMEOUT',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  JSON_PARSE_ERROR: 'JSON_PARSE_ERROR'
};

/**
 * Log error to file with detailed information
 * @param {Error} error - The error to log
 * @param {Object} context - Additional context information
 */
export function logError(error, context = {}) {
  try {
    // Ensure error log directory exists
    if (!existsSync(errorLogDir)) {
      mkdirSync(errorLogDir, { recursive: true });
    }

    const errorEntry = {
      timestamp: new Date().toISOString(),
      name: error.name || 'UnknownError',
      message: error.message,
      code: error.code || 'UNKNOWN',
      stack: error.stack,
      context,
      originalError: error.originalError ? {
        name: error.originalError.name,
        message: error.originalError.message,
        stack: error.originalError.stack
      } : null
    };

    const logLine = JSON.stringify(errorEntry) + '\n';
    appendFileSync(errorLogFile, logLine);
  } catch (logError) {
    // If we can't log to file, at least log to console
    console.error('Failed to write to error log:', logError.message);
  }
}

/**
 * Handle errors with appropriate fallback strategies
 * @param {Error} error - The error to handle
 * @param {Object} options - Options for error handling
 * @returns {Object} - Result of error handling
 */
export function handleError(error, options = {}) {
  const {
    operation = 'unknown',
    fallbackAction = null,
    shouldLog = true,
    shouldNotifyUser = true
  } = options;

  // Log error if requested
  if (shouldLog) {
    logError(error, { operation });
  }

  // Determine error type and appropriate response
  let userMessage = 'An unexpected error occurred';
  let recovery = null;

  if (error.code === ErrorCodes.FILE_NOT_FOUND) {
    userMessage = 'Required file not found. Please reinstall cat-ccnotify-hook.';
    recovery = 'reinstall';
  } else if (error.code === ErrorCodes.PERMISSION_DENIED) {
    userMessage = 'Permission denied. Please check your system permissions.';
    recovery = 'check-permissions';
  } else if (error.code === ErrorCodes.AUDIO_PLAYBACK_FAILED) {
    userMessage = 'Audio playback failed. Notification displayed without sound.';
    recovery = 'continue-silent';
  } else if (error.code === ErrorCodes.NOTIFICATION_FAILED) {
    userMessage = 'Failed to display notification. Check console for details.';
    recovery = 'console-fallback';
  } else if (error.code === ErrorCodes.TIMEOUT) {
    userMessage = 'Operation timed out. Please try again.';
    recovery = 'retry';
  }

  // Execute fallback action if provided
  if (fallbackAction && typeof fallbackAction === 'function') {
    try {
      fallbackAction(error);
    } catch (fallbackError) {
      console.error('Fallback action failed:', fallbackError.message);
    }
  }

  // Notify user if requested
  if (shouldNotifyUser) {
    console.error(`[cat-ccnotify] ${userMessage}`);
  }

  return {
    handled: true,
    userMessage,
    recovery,
    originalError: error
  };
}

/**
 * Wrap async functions with error handling
 * @param {Function} fn - The async function to wrap
 * @param {Object} options - Error handling options
 * @returns {Function} - Wrapped function
 */
export function withErrorHandling(fn, options = {}) {
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      return handleError(error, options);
    }
  };
}

/**
 * Create a detailed error report for debugging
 * @param {Error} error - The error to report
 * @returns {string} - Formatted error report
 */
export function createErrorReport(error) {
  const report = [
    '=== Cat-CCNotify Error Report ===',
    `Time: ${new Date().toISOString()}`,
    `Error Type: ${error.name || 'Unknown'}`,
    `Error Code: ${error.code || 'N/A'}`,
    `Message: ${error.message}`,
    '',
    'Stack Trace:',
    error.stack || 'No stack trace available',
    '',
    'System Information:',
    `Platform: ${process.platform}`,
    `Node Version: ${process.version}`,
    `Working Directory: ${process.cwd()}`,
    ''
  ];

  if (error.originalError) {
    report.push(
      'Original Error:',
      `Type: ${error.originalError.name}`,
      `Message: ${error.originalError.message}`,
      ''
    );
  }

  return report.join('\n');
}