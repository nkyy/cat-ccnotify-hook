#!/usr/bin/env node

/**
 * Claude Code Stop Hook
 * Handles session stop events with different sound and styling
 */

const { appendFileSync, readFileSync, mkdirSync, existsSync } = require('fs');
const { execSync } = require('child_process');
const { join } = require('path');
const { homedir } = require('os');
const { executeOsascript, executeAfplay, escapeAppleScript, sanitizeNotificationContent } = require('../lib/shell-executor.cjs');
const { NotificationError, ErrorCodes, handleError, createErrorReport } = require('../lib/error-handler.cjs');

// adaptive-notifierのCommonJS版import
let adaptiveNotifier;
let adaptiveNotifierReady = false;

async function initializeAdaptiveNotifier() {
  if (adaptiveNotifierReady) return;
  
  try {
    const { adaptiveNotifier: notifier } = await import('../lib/adaptive-notifier.js');
    adaptiveNotifier = notifier;
    adaptiveNotifierReady = true;
    debugLog('adaptive-notifier successfully imported');
  } catch (error) {
    debugLog(`Failed to import adaptive-notifier: ${error.message}`);
  }
}

// 簡単な親アプリ検出機能
function detectParentApp() {
  try {
    let currentPid = process.ppid;
    let level = 0;
    const maxLevels = 15;

    while (currentPid && currentPid > 1 && level < maxLevels) {
      const result = execSync(`ps -p ${currentPid} -o pid,ppid,comm,args`, { encoding: 'utf-8' });
      const lines = result.trim().split('\n');
      
      if (lines.length < 2) break;
      
      const parts = lines[1].trim().split(/\s+/);
      const info = {
        pid: parseInt(parts[0]),
        ppid: parseInt(parts[1]),
        command: parts[2],
        args: parts.slice(3).join(' ')
      };

      // .appバンドルを探す
      if (info.args.includes('.app')) {
        const appMatch = info.args.match(/(\/[^\s]*\.app)/);
        if (appMatch) {
          const appPath = appMatch[1];
          const appName = appPath.split('/').pop().replace('.app', '');
          
          // Bundle IDを取得
          try {
            const bundleResult = execSync(`mdls -name kMDItemCFBundleIdentifier -raw "${appPath}"`, { encoding: 'utf-8' });
            const bundleId = bundleResult.trim() === '(null)' ? null : bundleResult.trim();
            
            if (bundleId) {
              return {
                name: appName,
                bundleId: bundleId,
                path: appPath
              };
            }
          } catch (e) {
            // Bundle ID取得失敗は無視
          }
        }
      }

      currentPid = info.ppid;
      level++;
    }
  } catch (error) {
    // 検出失敗
  }
  
  return null;
}

// Create cat-ccnotify directory and log file path
const catNotifyDir = join(homedir(), '.claude', 'cat-ccnotify');
const logFile = join(catNotifyDir, 'stop-hook.log');

// Check if debug mode is enabled
const isDebugMode = process.env.CAT_CCNOTIFY_DEBUG === 'true' || process.argv.includes('--debug');

function debugLog(message) {
  // Only log if debug mode is enabled
  if (!isDebugMode) {
    return;
  }
  
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] STOP HOOK: ${message}\n`;
  
  try {
    // Ensure cat-ccnotify directory exists
    if (!existsSync(catNotifyDir)) {
      mkdirSync(catNotifyDir, { recursive: true });
    }
    appendFileSync(logFile, logEntry);
  } catch (error) {
    console.error('Stop hook logging failed:', error.message);
  }
}

function getStopData() {
  let stopData = {};
  let stopTitle = '';
  let stopMessage = '';

  try {
    const input = readFileSync(0, 'utf-8');
    debugLog(`Raw stdin input: "${input}"`);
    if (input.trim()) {
      try {
        stopData = JSON.parse(input);
      } catch (parseError) {
        throw new NotificationError(
          'Failed to parse stop hook JSON',
          ErrorCodes.JSON_PARSE_ERROR,
          parseError
        );
      }
      
      // Check if stop_hook_active is already true to prevent infinite loops
      if (stopData.stop_hook_active === true) {
        debugLog('stop_hook_active is true, skipping to prevent infinite loop');
        return { stopData, skipNotification: true };
      }
      
      stopTitle = stopData.title || 'Claude Code Session';
      stopMessage = stopData.message || 'Session Stopped';
      
      // Include session information if available
      if (stopData.session_id) {
        debugLog(`Session ID: ${stopData.session_id}`);
      }
      if (stopData.transcript_path) {
        debugLog(`Transcript path: ${stopData.transcript_path}`);
      }
    }
  } catch (error) {
    if (error.code === ErrorCodes.JSON_PARSE_ERROR) {
      debugLog(`JSON parse error: ${error.message}`);
    } else {
      debugLog(`Error reading stdin: ${error.message}`);
    }
    const args = process.argv.slice(2);
    stopTitle = args[0] || 'Claude Code';
    stopMessage = args[1] || 'Stop Event';
  }

  return { stopData, stopTitle, stopMessage, skipNotification: false };
}

async function sendStopNotification(title, message) {
  try {
    // Validate and sanitize input
    const safeTitle = sanitizeNotificationContent(title);
    const safeMessage = sanitizeNotificationContent(message);
    
    if (!safeTitle && !safeMessage) {
      debugLog('Empty notification content after sanitization');
      return;
    }
    
    // Stop用の特別な通知スタイル
    const finalTitle = `🐱 ${safeTitle}`;
    const finalMessage = `セッション終了: ${safeMessage}`;
    
    // adaptive-notifierを初期化して使用する
    await initializeAdaptiveNotifier();
    
    if (adaptiveNotifier) {
      try {
        debugLog('Using adaptive-notifier for stop notification');
        const result = await adaptiveNotifier.sendNotification(finalTitle, finalMessage, { sound: 'stop' });
        
        if (result.success) {
          debugLog(`Stop notification sent successfully using ${result.method}`);
          if (result.warning) {
            debugLog(`Warning: ${result.warning}`);
          }
        } else {
          debugLog('Adaptive notification failed, falling back to osascript');
          throw new Error('Adaptive notification failed');
        }
        
        return; // Skip legacy osascript method
        
      } catch (adaptiveError) {
        debugLog(`Adaptive notification failed: ${adaptiveError.message}`);
        // Fall through to legacy osascript method
      }
    }
    
    // フォールバック: 従来のosascript方式
    debugLog('Using legacy osascript method for stop notification');
    
    // Escape for AppleScript
    const escapedTitle = escapeAppleScript(finalTitle);
    const escapedMessage = escapeAppleScript(finalMessage);
    
    // 親アプリを検出
    const parentApp = detectParentApp();
    
    let script;
    if (parentApp && parentApp.bundleId) {
      // 親アプリ経由で通知送信
      script = `tell application id "${parentApp.bundleId}"
        display notification "${escapedMessage}" with title "${escapedTitle}"
      end tell`;
      debugLog(`Using parent app: ${parentApp.name} (${parentApp.bundleId})`);
    } else {
      // フォールバック: 通常のosascript通知
      script = `display notification "${escapedMessage}" with title "${escapedTitle}"`;
      debugLog('Using fallback notification (no parent app detected)');
    }
    
    try {
      await executeOsascript(script);
      debugLog(`Stop notification sent: ${finalTitle} - ${finalMessage}`);
    } catch (notifError) {
      const error = new NotificationError(
        'Failed to display stop notification',
        ErrorCodes.NOTIFICATION_FAILED,
        notifError
      );
      handleError(error, {
        operation: 'display-stop-notification',
        fallbackAction: () => {
          console.log(`[Stop Notification] ${safeTitle}: ${safeMessage}`);
        }
      });
      debugLog(`Failed to display notification: ${notifError.message}`);
      // Continue to try playing sound even if notification fails
    }
    
    // 音声再生（adaptive-notifierを使用していない場合のみ）
    if (!adaptiveNotifier) {
      const audioFile = join(__dirname, '..', 'sounds', 'cat-meow-1-fx-323465.mp3');
      try {
        // Check if file exists before trying to play
        if (existsSync(audioFile)) {
          await executeAfplay(audioFile);
          debugLog(`Cat sound played: ${audioFile}`);
        } else {
          const error = new NotificationError(
            `Sound file not found: ${audioFile}`,
            ErrorCodes.FILE_NOT_FOUND
          );
          handleError(error, {
            operation: 'play-stop-sound',
            shouldNotifyUser: false
          });
          debugLog(`Sound file not found: ${audioFile}`);
        }
      } catch (audioError) {
        const error = new NotificationError(
          'Failed to play stop notification sound',
          ErrorCodes.AUDIO_PLAYBACK_FAILED,
          audioError
        );
        handleError(error, {
          operation: 'play-stop-sound',
          shouldNotifyUser: false
        });
        debugLog(`Failed to play cat sound: ${audioError.message}`);
      }
    }
    
  } catch (error) {
    const notifError = error instanceof NotificationError ? error : new NotificationError(
      'Unexpected error in stop notification',
      ErrorCodes.SYSTEM_ERROR,
      error
    );
    
    handleError(notifError, {
      operation: 'send-stop-notification',
      fallbackAction: () => {
        console.log(`[Stop Fallback] ${title}: ${message}`);
      }
    });
    
    debugLog(`Stop notification error: ${error.message}`);
  }
}

async function main() {
  try {
    debugLog('=== STOP HOOK TRIGGERED ===');
    
    const { stopData, stopTitle, stopMessage, skipNotification } = getStopData();
    
    // Skip notification if stop_hook_active is true
    if (skipNotification) {
      debugLog('Skipping notification due to stop_hook_active=true');
      process.exit(0);
    }
    
    debugLog(`Stop Title: "${stopTitle}"`);
    debugLog(`Stop Message: "${stopMessage}"`);
    debugLog(`Stop Data: ${JSON.stringify(stopData)}`);
    debugLog(`stop_hook_active: ${stopData.stop_hook_active || false}`);
    
    if (!stopTitle && !stopMessage) {
      debugLog('No stop data, exiting');
      process.exit(0);
    }
    
    await sendStopNotification(stopTitle, stopMessage);
    
  } catch (error) {
    const mainError = error instanceof NotificationError ? error : new NotificationError(
      'Critical error in stop hook',
      ErrorCodes.SYSTEM_ERROR,
      error
    );
    
    handleError(mainError, {
      operation: 'stop-main',
      shouldNotifyUser: true
    });
    
    debugLog(`Stop hook error: ${error.stack}`);
    debugLog(`Error report:\n${createErrorReport(error)}`);
  }
}

main().catch(error => {
  const uncaughtError = new NotificationError(
    'Uncaught error in stop hook',
    ErrorCodes.SYSTEM_ERROR,
    error
  );
  
  handleError(uncaughtError, {
    operation: 'stop-uncaught',
    shouldNotifyUser: true
  });
  
  console.error('Uncaught error in stop hook:', error);
  process.exit(1);
});