#!/usr/bin/env node

/**
 * Claude Code Notification Hook
 * Intercepts Claude Code notifications and enhances them with sounds and better styling
 */

import { appendFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { executeOsascript, executeAfplay, escapeAppleScript, sanitizeNotificationContent } from '../lib/shell-executor.js';
import { NotificationError, ErrorCodes, handleError, createErrorReport } from '../lib/error-handler.js';
import { sendNotificationSafely, sendNotificationWithTerminalNotifier } from '../lib/notification-sender.js';
import { adaptiveNotifier } from '../lib/adaptive-notifier.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Create cat-ccnotify directory and log file path
const catNotifyDir = join(homedir(), '.claude', 'cat-ccnotify');
const logFile = join(catNotifyDir, 'notification-hook.log');

// Check if debug mode is enabled
const isDebugMode = process.env.CAT_CCNOTIFY_DEBUG === 'true' || process.argv.includes('--debug');

function getNotificationData() {
  let notificationData = {};
  let notificationTitle = '';
  let notificationMessage = '';
  let notificationLevel = 'info';

  try {
    // Debug: Log all environment variables and arguments
    debugLog('=== Debug Information ===');
    debugLog(`Process arguments: ${JSON.stringify(process.argv)}`);
    debugLog(`Working directory: ${process.cwd()}`);
    
    // Log Claude-related environment variables
    Object.keys(process.env)
      .filter(key => key.toLowerCase().includes('claude') || key.toLowerCase().includes('notification'))
      .forEach(key => {
        debugLog(`Env ${key}: "${process.env[key]}"`);
      });
    
    // Method 1: Check for various environment variables
    const envNotification = process.env.CLAUDE_NOTIFICATION || 
                           process.env.NOTIFICATION_MESSAGE ||
                           process.env.HOOK_MESSAGE;
    const envTitle = process.env.CLAUDE_TITLE || 
                    process.env.NOTIFICATION_TITLE ||
                    process.env.HOOK_TITLE;
    
    if (envNotification || envTitle) {
      debugLog(`Found env notification - Title: "${envTitle}", Message: "${envNotification}"`);
      notificationTitle = envTitle || 'Claude Code';
      notificationMessage = envNotification || 'Notification';
    } else {
      // Method 2: Try reading from stdin
      try {
        const input = readFileSync(0, 'utf-8');
        debugLog(`Raw stdin input (${input.length} chars): "${input}"`);
        
        if (input.trim()) {
          try {
            // Try parsing as JSON
            notificationData = JSON.parse(input);
            debugLog(`Parsed as JSON: ${JSON.stringify(notificationData, null, 2)}`);
            
            // Extract title and message from JSON with multiple fallbacks
            notificationTitle = notificationData.title || 
                              notificationData.summary || 
                              notificationData.name || 
                              notificationData.header || 
                              'Claude Code';
            
            notificationMessage = notificationData.message || 
                                notificationData.body || 
                                notificationData.content || 
                                notificationData.text || 
                                notificationData.description || 
                                JSON.stringify(notificationData);
            
            notificationLevel = notificationData.level || 
                              notificationData.type || 
                              notificationData.severity || 
                              'info';
                              
          } catch (parseError) {
            debugLog(`Not valid JSON (${parseError.message}), treating as plain text`);
            
            // Handle plain text - try to extract title and message
            const trimmedInput = input.trim();
            const lines = trimmedInput.split('\n').filter(line => line.trim());
            
            if (lines.length > 1) {
              // Multi-line: first line as title, rest as message
              notificationTitle = lines[0].trim();
              notificationMessage = lines.slice(1).join(' ').trim();
            } else if (trimmedInput.length > 0) {
              // Single line: use as message with default title
              notificationTitle = 'Claude Code';
              notificationMessage = trimmedInput;
            }
          }
        } else {
          debugLog('Empty stdin input');
        }
      } catch (stdinError) {
        debugLog(`Error reading stdin: ${stdinError.message}`);
      }
    }
    
    // Method 3: Fallback to command line arguments
    if (!notificationMessage && process.argv.length > 2) {
      const args = process.argv.slice(2);
      debugLog(`Using command line arguments: ${JSON.stringify(args)}`);
      
      if (args.length === 1) {
        // Single argument: use as message
        notificationTitle = 'Claude Code';
        notificationMessage = args[0];
      } else if (args.length >= 2) {
        // Multiple arguments: first as title, second as message
        notificationTitle = args[0];
        notificationMessage = args[1];
        notificationLevel = args[2] || 'info';
      }
    }
    
    // Ensure we have meaningful content
    if (!notificationTitle) notificationTitle = 'Claude Code';
    if (!notificationMessage) notificationMessage = 'Empty notification';
  } catch (error) {
    debugLog(`Error getting notification data: ${error.message}`);
    debugLog(`Error stack: ${error.stack}`);
    // Use defaults
    notificationTitle = 'Claude Code';
    notificationMessage = 'Notification Error';
  }

  debugLog(`=== Final Result ===`);
  debugLog(`Title: "${notificationTitle}"`);
  debugLog(`Message: "${notificationMessage}"`);
  debugLog(`Level: "${notificationLevel}"`);
  debugLog(`Data keys: ${Object.keys(notificationData).join(', ')}`);
  debugLog('========================');

  return { notificationData, notificationTitle, notificationMessage, notificationLevel };
}

async function sendEnhancedNotification(title, message, sound = 'default') {
  try {
    // Validate and sanitize input
    const safeTitle = sanitizeNotificationContent(title);
    const safeMessage = sanitizeNotificationContent(message);
    
    if (!safeTitle && !safeMessage) {
      debugLog('Empty notification content after sanitization');
      return;
    }
    
    // Custom sound path
    const customSoundPath = join(__dirname, '..', 'sounds', 'cat-meow-1-fx-323465.mp3');
    
    // Escape for AppleScript
    const escapedTitle = escapeAppleScript(safeTitle);
    const escapedMessage = escapeAppleScript(safeMessage);
    
    // Use adaptive notification system
    try {
      debugLog('Using adaptive notification system');
      const result = await adaptiveNotifier.sendNotification(safeTitle, safeMessage, { sound });
      
      if (result.success) {
        debugLog(`Notification sent successfully using ${result.method}`);
        if (result.warning) {
          debugLog(`Warning: ${result.warning}`);
        }
      } else {
        debugLog('Adaptive notification failed, using console fallback');
        console.log(`[Notification] ${safeTitle}: ${safeMessage}`);
      }
      
      return; // Skip legacy sound playback since adaptiveNotifier handles it
      
    } catch (notificationError) {
      const error = new NotificationError(
        'Failed to display notification',
        ErrorCodes.NOTIFICATION_FAILED,
        notificationError
      );
      handleError(error, {
        operation: 'display-notification',
        fallbackAction: () => {
          console.log(`[Notification] ${safeTitle}: ${safeMessage}`);
        }
      });
      debugLog(`Notification display error: ${notificationError.message}`);
    }
    
    // Play custom sound after notification is displayed
    try {
      // Check if file exists before trying to play
      if (existsSync(customSoundPath)) {
        await executeAfplay(customSoundPath);
        debugLog('Custom sound played');
      } else {
        const error = new NotificationError(
          `Sound file not found: ${customSoundPath}`,
          ErrorCodes.FILE_NOT_FOUND
        );
        handleError(error, {
          operation: 'play-sound',
          shouldNotifyUser: false // Don't spam the user about missing sound
        });
        debugLog(`Sound file not found: ${customSoundPath}`);
      }
    } catch (soundError) {
      const error = new NotificationError(
        'Failed to play notification sound',
        ErrorCodes.AUDIO_PLAYBACK_FAILED,
        soundError
      );
      handleError(error, {
        operation: 'play-sound',
        shouldNotifyUser: false
      });
      debugLog(`Failed to play custom sound: ${soundError.message}`);
    }
    
    // Log success
    debugLog(`Notification sent: ${safeTitle} - ${safeMessage}`);
    
  } catch (error) {
    const notifError = error instanceof NotificationError ? error : new NotificationError(
      'Unexpected error in notification',
      ErrorCodes.SYSTEM_ERROR,
      error
    );
    
    handleError(notifError, {
      operation: 'send-notification',
      fallbackAction: () => {
        console.log(`[Fallback] ${title}: ${message}`);
      }
    });
    
    debugLog(`Notification error: ${error.message}`);
  }
}

function analyzeNotificationContent(title, message) {
  const content = `${title} ${message}`.toLowerCase();
  
  // More comprehensive pattern matching
  const patterns = {
    error: [
      /error/i, /failed/i, /failure/i, /crash/i, /exception/i, /fatal/i,
      /❌/i, /🚨/i, /💥/i, /broken/i, /cannot/i, /unable/i, /invalid/i
    ],
    warning: [
      /warning/i, /caution/i, /attention/i, /notice/i, /deprecated/i,
      /⚠️/i, /🔔/i, /📢/i, /might/i, /should/i, /consider/i
    ],
    success: [
      /complete/i, /success/i, /passed/i, /done/i, /finished/i, /created/i,
      /✅/i, /🎉/i, /✨/i, /deployed/i, /published/i, /installed/i, /ready/i
    ],
    progress: [
      /progress/i, /running/i, /processing/i, /installing/i, /building/i,
      /loading/i, /starting/i, /initializing/i, /📊/i, /⏳/i, /🔄/i
    ],
    git: [
      /git/i, /commit/i, /push/i, /pull/i, /merge/i, /branch/i, /checkout/i,
      /📝/i, /🔀/i, /📋/i, /repository/i, /repo/i
    ],
    build: [
      /build/i, /compile/i, /bundle/i, /webpack/i, /rollup/i, /vite/i,
      /🏗️/i, /📦/i, /typescript/i, /babel/i
    ],
    test: [
      /test/i, /spec/i, /jest/i, /vitest/i, /cypress/i, /mocha/i, /jasmine/i,
      /🧪/i, /coverage/i, /assertion/i
    ],
    deploy: [
      /deploy/i, /publish/i, /release/i, /production/i, /staging/i,
      /🚀/i, /live/i, /server/i
    ],
    npm: [
      /npm/i, /yarn/i, /pnpm/i, /package/i, /dependency/i, /node_modules/i,
      /📦/i, /install/i, /update/i
    ],
    file: [
      /file/i, /directory/i, /folder/i, /path/i, /write/i, /read/i, /save/i,
      /📄/i, /📁/i, /created/i, /modified/i, /deleted/i
    ]
  };

  // Check for specific patterns in order of importance
  for (const [category, categoryPatterns] of Object.entries(patterns)) {
    if (categoryPatterns.some(pattern => pattern.test(content))) {
      // For certain categories, check for error indicators
      if (['test', 'build', 'git', 'deploy', 'npm'].includes(category)) {
        if (patterns.error.some(pattern => pattern.test(content))) {
          return 'error';
        } else if (patterns.success.some(pattern => pattern.test(content))) {
          return 'success';
        }
        // If no clear success/error, use the category as type
        return category;
      }
      return category;
    }
  }
  
  // Default fallback
  return 'info';
}

function enhanceNotificationStyle(title, message, soundType) {
  // Enhanced emoji mapping with more categories
  const emojiMap = {
    'success': '✅',
    'error': '❌', 
    'warning': '⚠️',
    'info': '💡',
    'progress': '⏳',
    'file': '📄',
    'git': '🔀',
    'build': '🏗️',
    'test': '🧪',
    'npm': '📦',
    'deploy': '🚀'
  };
  
  let enhancedTitle = title;
  let enhancedMessage = message;
  const emoji = emojiMap[soundType];
  
  // Add emoji if title doesn't already have one
  if (emoji && !title.match(/[\u{1F300}-\u{1F9FF}]/u)) {
    enhancedTitle = `${emoji} ${title}`;
  }
  
  // Add context clues to the message based on content
  const context = getNotificationContext(title, message);
  if (context) {
    enhancedMessage = `${context} ${message}`;
  }
  
  // Truncate very long messages for better display
  if (enhancedMessage.length > 200) {
    enhancedMessage = enhancedMessage.substring(0, 197) + '...';
  }
  
  return {
    title: enhancedTitle,
    message: enhancedMessage,
    sound: soundType
  };
}

function getNotificationContext(title, message) {
  const content = `${title} ${message}`.toLowerCase();
  
  // File operations
  if (content.includes('file') || content.includes('write') || content.includes('read')) {
    if (content.includes('created') || content.includes('added')) return '';
    if (content.includes('modified') || content.includes('updated')) return '';
    if (content.includes('deleted') || content.includes('removed')) return '';
  }
  
  // Git operations  
  if (content.includes('git') || content.includes('commit') || content.includes('push')) {
    return '';
  }
  
  // Build/compilation
  if (content.includes('build') || content.includes('compile') || content.includes('bundle')) {
    return '';
  }
  
  // Testing
  if (content.includes('test') || content.includes('spec')) {
    return '';
  }
  
  return null;
}

function shouldSkipNotification(title, message) {
  // Skip very generic or empty notifications
  if (!title.trim() || !message.trim()) {
    return true;
  }
  
  // Skip development/debug notifications
  const skipPatterns = [
    /debug/i, /verbose/i, /trace/i,
    /internal/i, /system/i
  ];
  
  const content = `${title} ${message}`.toLowerCase();
  return skipPatterns.some(pattern => pattern.test(content));
}

function debugLog(message) {
  // Only log if debug mode is enabled
  if (!isDebugMode) {
    return;
  }
  
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  try {
    // Ensure cat-ccnotify directory exists
    if (!existsSync(catNotifyDir)) {
      mkdirSync(catNotifyDir, { recursive: true });
    }
    appendFileSync(logFile, logEntry);
  } catch (error) {
    console.error('Notification hook logging failed:', error.message);
  }
}

async function main() {
  try {
    // Get notification data
    const { notificationData, notificationTitle, notificationMessage, notificationLevel } = getNotificationData();
    
    // Debug log for troubleshooting
    debugLog(`Hook triggered - Title: "${notificationTitle}"`);
    debugLog(`Hook triggered - Message: "${notificationMessage}"`);
    debugLog(`Hook triggered - Level: "${notificationLevel}"`);
    debugLog(`Hook triggered - Data: ${JSON.stringify(notificationData)}`);
    debugLog(`Hook triggered - Input method: ${Object.keys(notificationData).length > 0 ? 'JSON' : 'Args'}`);
    
    // Skip if no notification data
    if (!notificationTitle && !notificationMessage) {
      debugLog('No notification data, exiting');
      process.exit(0);
    }
    
    // Skip unwanted notifications
    if (shouldSkipNotification(notificationTitle, notificationMessage)) {
      process.exit(0);
    }
    
    // Analyze notification content to determine appropriate sound and style
    const soundType = analyzeNotificationContent(notificationTitle, notificationMessage);
    
    debugLog(`Analyzed notification type: ${soundType}`);
    
    // Enhance notification with better styling
    const enhanced = enhanceNotificationStyle(notificationTitle, notificationMessage, soundType);
    
    debugLog(`Enhanced notification - Title: "${enhanced.title}", Message: "${enhanced.message}"`);
    
    // Send enhanced notification
    await sendEnhancedNotification(enhanced.title, enhanced.message, enhanced.sound);
    
  } catch (error) {
    const mainError = error instanceof NotificationError ? error : new NotificationError(
      'Critical error in notification hook',
      ErrorCodes.SYSTEM_ERROR,
      error
    );
    
    handleError(mainError, {
      operation: 'main',
      shouldNotifyUser: true
    });
    
    debugLog(`Main error: ${error.stack}`);
    debugLog(`Error report:\n${createErrorReport(error)}`);
    
    // Try to show a fallback notification
    try {
      await sendEnhancedNotification('🐱 Cat Notify Error', `Notification hook failed: ${error.message}`, 'error');
    } catch (fallbackError) {
      debugLog(`Fallback notification also failed: ${fallbackError.message}`);
    }
  }
}

main().catch(error => {
  const uncaughtError = new NotificationError(
    'Uncaught error in notification hook',
    ErrorCodes.SYSTEM_ERROR,
    error
  );
  
  handleError(uncaughtError, {
    operation: 'uncaught',
    shouldNotifyUser: true
  });
  
  console.error('Uncaught error in notification hook:', error);
  process.exit(1);
});