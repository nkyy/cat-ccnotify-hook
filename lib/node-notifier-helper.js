/**
 * Node Notifier Helper
 * node-notifierを使用した通知システム
 */

import notifier from 'node-notifier';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 親アプリ検出機能
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

// 猫音声再生
async function playCatSound() {
  try {
    const soundPath = join(__dirname, '..', 'sounds', 'cat-meow-1-fx-323465.mp3');
    execSync(`afplay "${soundPath}"`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.error('Failed to play cat sound:', error.message);
    return false;
  }
}

// 拡張通知送信
export async function sendCatNotification(title, message, options = {}) {
  try {
    // 親アプリを検出
    const parentApp = detectParentApp();
    
    // 通知設定
    const notificationOptions = {
      title: title,
      message: message,
      sound: false, // カスタム音を使用するため無効
      wait: false,  // クリック待機しない
      timeout: 10,  // 10秒で自動消去
      ...options
    };
    
    // 送信者を指定（親アプリがあれば）
    if (parentApp && parentApp.bundleId) {
      notificationOptions.sender = parentApp.bundleId;
      console.log(`[node-notifier] Using sender: ${parentApp.name} (${parentApp.bundleId})`);
    } else {
      console.log('[node-notifier] No parent app detected, using default sender');
    }
    
    // 通知送信
    notifier.notify(notificationOptions, (err, response) => {
      if (err) {
        console.error('[node-notifier] Notification error:', err);
      } else {
        console.log('[node-notifier] Notification sent:', response);
      }
    });
    
    // 猫音声再生
    setTimeout(() => {
      playCatSound();
    }, 100); // 少し遅延させて通知と同期
    
    return {
      success: true,
      parentApp: parentApp
    };
    
  } catch (error) {
    console.error('[node-notifier] Failed to send notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
}