#!/usr/bin/env node

/**
 * Claude Code Notification Hook
 * Intercepts Claude Code notifications and enhances them with sounds and better styling
 */

import { execSync } from 'child_process';
import { appendFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

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
    // Read JSON from stdin
    const input = readFileSync(0, 'utf-8');
    debugLog(`Raw stdin input: "${input}"`);
    if (input.trim()) {
      notificationData = JSON.parse(input);
      // Map Claude Code notification format
      notificationTitle = notificationData.title || 'Claude Code';
      notificationMessage = notificationData.message || '';
      notificationLevel = 'info'; // Claude Code doesn't send level
    }
  } catch (error) {
    debugLog(`Error reading stdin: ${error.message}`);
    // Fallback to command line arguments if JSON parsing fails
    const args = process.argv.slice(2);
    notificationTitle = args[0] || '';
    notificationMessage = args[1] || '';
    notificationLevel = args[2] || 'info';
  }

  return { notificationData, notificationTitle, notificationMessage, notificationLevel };
}

function sendEnhancedNotification(title, message, sound = 'default') {
  try {
    // Custom sound path
    const customSoundPath = join(__dirname, '..', 'sounds', 'cat-meow-1-fx-323465.mp3');
    
    // Escape quotes for shell safety
    const safeTitle = title.replace(/"/g, '\\"');
    const safeMessage = message.replace(/"/g, '\\"');
    
    // Display notification first using osascript
    const script = `display notification "${safeMessage}" with title "${safeTitle}"`;
    execSync(`osascript -e '${script}'`, { stdio: 'ignore' });
    debugLog('osascript notification displayed');
    
    // Play custom sound after notification is displayed
    try {
      execSync(`afplay "${customSoundPath}"`, { stdio: 'ignore' });
      debugLog('Custom sound played');
    } catch (soundError) {
      debugLog(`Failed to play custom sound: ${soundError.message}`);
    }
    
    // Log success
    debugLog(`Notification sent: ${safeTitle} - ${safeMessage}`);
    
  } catch (error) {
    console.error('Failed to send enhanced notification:', error.message);
    debugLog(`Notification error: ${error.message}`);
    // Fallback to console log
    console.log(`${title}: ${message}`);
  }
}

function analyzeNotificationContent(title, message) {
  const content = `${title} ${message}`.toLowerCase();
  
  // Success patterns
  const successPatterns = [
    /complete/i, /success/i, /passed/i, /done/i, /finished/i,
    /✅/i, /🎉/i, /✨/i, /🏗️/i, /📦/i, /🚀/i
  ];
  
  // Error patterns  
  const errorPatterns = [
    /error/i, /failed/i, /failure/i, /crash/i, /exception/i,
    /❌/i, /🚨/i, /💥/i, /⚠️/i
  ];
  
  // Warning patterns
  const warningPatterns = [
    /warning/i, /caution/i, /attention/i, /notice/i,
    /⚠️/i, /🔔/i, /📢/i
  ];
  
  // Progress patterns
  const progressPatterns = [
    /progress/i, /running/i, /processing/i, /installing/i, /building/i,
    /📊/i, /⏳/i, /🔄/i
  ];
  
  // Build/Deploy patterns
  const buildPatterns = [
    /build/i, /compile/i, /deploy/i, /publish/i,
    /🏗️/i, /📦/i, /🚀/i
  ];
  
  // Test patterns
  const testPatterns = [
    /test/i, /spec/i, /jest/i, /vitest/i, /cypress/i,
    /🧪/i, /✅/i, /❌/i
  ];
  
  // Git patterns
  const gitPatterns = [
    /git/i, /commit/i, /push/i, /pull/i, /merge/i,
    /📝/i, /🔀/i, /📋/i
  ];

  if (errorPatterns.some(pattern => pattern.test(content))) {
    return 'error';
  } else if (warningPatterns.some(pattern => pattern.test(content))) {
    return 'warning';
  } else if (successPatterns.some(pattern => pattern.test(content))) {
    return 'success';
  } else if (progressPatterns.some(pattern => pattern.test(content))) {
    return 'progress';
  } else if (testPatterns.some(pattern => pattern.test(content))) {
    return testPatterns.some(p => /❌|fail/i.test(content)) ? 'error' : 'success';
  } else if (buildPatterns.some(pattern => pattern.test(content))) {
    return buildPatterns.some(p => /fail|error/i.test(content)) ? 'error' : 'success';
  } else if (gitPatterns.some(pattern => pattern.test(content))) {
    return gitPatterns.some(p => /fail|error/i.test(content)) ? 'error' : 'success';
  } else {
    return 'info';
  }
}

function enhanceNotificationStyle(title, message, soundType) {
  // Add appropriate emoji if not already present
  const emojiMap = {
    'success': '✅',
    'error': '🚨', 
    'warning': '⚠️',
    'info': '💡',
    'progress': '⏳'
  };
  
  let enhancedTitle = title;
  const emoji = emojiMap[soundType];
  
  // Add emoji if title doesn't already have one
  if (emoji && !title.match(/[\u{1F300}-\u{1F9FF}]/u)) {
    enhancedTitle = `${emoji} ${title}`;
  }
  
  return {
    title: enhancedTitle,
    message: message,
    sound: soundType
  };
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

function main() {
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
    
    // Analyze notification content to determine appropriate sound
    const soundType = analyzeNotificationContent(notificationTitle, notificationMessage);
    
    // Enhance notification with better styling
    const enhanced = enhanceNotificationStyle(notificationTitle, notificationMessage, soundType);
    
    // Send enhanced notification
    sendEnhancedNotification(enhanced.title, enhanced.message, enhanced.sound);
    
  } catch (error) {
    console.error('Notification hook error:', error.message);
  }
}

main();