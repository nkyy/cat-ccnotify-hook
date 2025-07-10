/**
 * Parent Application Detector
 * Hook実行時の親アプリケーション（Terminal/Editor）を検出
 */

import { execSync } from 'child_process';

export class ParentAppDetector {
  constructor() {
    this.cache = null; // キャッシュで複数回の検出を避ける
  }

  getProcessInfo(pid) {
    try {
      const result = execSync(`ps -p ${pid} -o pid,ppid,comm,args`, { encoding: 'utf-8' });
      const lines = result.trim().split('\n');
      
      if (lines.length < 2) return null;
      
      const parts = lines[1].trim().split(/\s+/);
      return {
        pid: parseInt(parts[0]),
        ppid: parseInt(parts[1]),
        command: parts[2],
        args: parts.slice(3).join(' ')
      };
    } catch (error) {
      return null;
    }
  }

  detectParentApp() {
    // キャッシュがあれば返す
    if (this.cache) {
      return this.cache;
    }

    let currentPid = process.pid;
    let level = 0;
    const maxLevels = 15; // 十分な深度

    while (currentPid && currentPid > 1 && level < maxLevels) {
      const info = this.getProcessInfo(currentPid);
      if (!info) break;

      // アプリケーションを検出
      const appInfo = this.identifyApplication(info);
      if (appInfo) {
        this.cache = appInfo; // キャッシュに保存
        return appInfo;
      }

      currentPid = info.ppid;
      level++;
    }

    // 検出できなかった場合
    this.cache = { type: 'unknown', bundleId: null, name: 'Unknown' };
    return this.cache;
  }

  identifyApplication(processInfo) {
    const { command, args } = processInfo;

    // Visual Studio Code
    if (command.includes('Code') || args.includes('Visual Studio Code') || 
        args.includes('Visual Studio Code.app') || command === 'code') {
      return {
        type: 'vscode',
        bundleId: 'com.microsoft.VSCode',
        name: 'Visual Studio Code',
        pid: processInfo.pid
      };
    }

    // Terminal.app
    if (command === 'Terminal' || args.includes('Terminal.app')) {
      return {
        type: 'terminal',
        bundleId: 'com.apple.Terminal',
        name: 'Terminal',
        pid: processInfo.pid
      };
    }

    // iTerm2
    if (command.includes('iTerm') || args.includes('iTerm.app')) {
      return {
        type: 'iterm2',
        bundleId: 'com.googlecode.iterm2',
        name: 'iTerm2',
        pid: processInfo.pid
      };
    }

    // Other popular terminals
    if (command === 'kitty' || args.includes('kitty')) {
      return {
        type: 'kitty',
        bundleId: 'net.kovidgoyal.kitty',
        name: 'Kitty',
        pid: processInfo.pid
      };
    }

    if (command === 'alacritty' || args.includes('Alacritty.app')) {
      return {
        type: 'alacritty',
        bundleId: 'org.alacritty',
        name: 'Alacritty',
        pid: processInfo.pid
      };
    }

    if (command.includes('Warp') || args.includes('Warp.app')) {
      return {
        type: 'warp',
        bundleId: 'dev.warp.Warp-Stable',
        name: 'Warp',
        pid: processInfo.pid
      };
    }

    // 一般的な .app バンドル
    if (args.includes('.app/Contents/MacOS/')) {
      const appMatch = args.match(/\/([^\/]+\.app)\/Contents\/MacOS\//);
      if (appMatch) {
        const appName = appMatch[1];
        return {
          type: 'app',
          bundleId: this.getBundleIdFromAppPath(args),
          name: appName.replace('.app', ''),
          pid: processInfo.pid
        };
      }
    }

    return null;
  }

  getBundleIdFromAppPath(appPath) {
    try {
      // .app パスを抽出
      const appMatch = appPath.match(/([^\/]+\.app)/);
      if (!appMatch) return null;

      const appName = appMatch[1];
      const fullPath = appPath.substring(0, appPath.indexOf(appName) + appName.length);
      
      const result = execSync(`mdls -name kMDItemCFBundleIdentifier -raw "${fullPath}"`, { encoding: 'utf-8' });
      return result.trim() === '(null)' ? null : result.trim();
    } catch (error) {
      return null;
    }
  }

  async activateParentApp() {
    const appInfo = this.detectParentApp();
    
    if (!appInfo.bundleId) {
      return { success: false, reason: 'No bundle ID available' };
    }

    try {
      const script = `tell application id "${appInfo.bundleId}" to activate`;
      execSync(`osascript -e '${script}'`, { stdio: 'ignore' });
      
      return { 
        success: true, 
        appInfo 
      };
    } catch (error) {
      return { 
        success: false, 
        reason: error.message,
        appInfo 
      };
    }
  }
}

// デフォルトインスタンス
export const parentAppDetector = new ParentAppDetector();