/**
 * Secure shell command executor (CommonJS version)
 * Provides safe execution of shell commands with proper escaping and validation
 */

const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

/**
 * Execute osascript command safely
 * @param {string} script - AppleScript to execute
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
async function executeOsascript(script) {
  if (typeof script !== 'string' || !script.trim()) {
    throw new Error('Invalid script provided');
  }
  
  return execFileAsync('/usr/bin/osascript', ['-e', script], {
    timeout: 5000, // 5 second timeout
    maxBuffer: 1024 * 1024 // 1MB max output
  });
}

/**
 * Execute afplay command safely
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
async function executeAfplay(audioPath) {
  if (typeof audioPath !== 'string' || !audioPath.trim()) {
    throw new Error('Invalid audio path provided');
  }
  
  // Validate file extension
  const allowedExtensions = ['.mp3', '.wav', '.m4a', '.aiff', '.aac'];
  const hasValidExtension = allowedExtensions.some(ext => 
    audioPath.toLowerCase().endsWith(ext)
  );
  
  if (!hasValidExtension) {
    throw new Error('Invalid audio file type');
  }
  
  return execFileAsync('/usr/bin/afplay', [audioPath], {
    timeout: 30000, // 30 second timeout for audio playback
    stdio: 'ignore'
  });
}

/**
 * Safely escape string for AppleScript
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
function escapeAppleScript(str) {
  if (typeof str !== 'string') {
    return '';
  }
  
  // Escape backslashes first, then quotes
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Validate and sanitize notification content
 * @param {string} content - Content to validate
 * @returns {string} - Sanitized content
 */
function sanitizeNotificationContent(content) {
  if (typeof content !== 'string') {
    return '';
  }
  
  // Remove control characters except newlines and tabs
  const sanitized = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Limit length to prevent excessive content
  const maxLength = 1000;
  if (sanitized.length > maxLength) {
    return sanitized.substring(0, maxLength) + '...';
  }
  
  return sanitized;
}

module.exports = {
  executeOsascript,
  executeAfplay,
  escapeAppleScript,
  sanitizeNotificationContent
};