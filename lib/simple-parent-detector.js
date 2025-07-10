/**
 * Simple Parent Application Detector
 * プロセスの親を辿って最初の.appバンドルを検出
 */

import { execSync } from 'child_process';

export class SimpleParentDetector {
  constructor() {
    this.cache = null;
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

  extractAppFromPath(args) {
    // .app パターンからアプリ情報を抽出
    const appMatch = args.match(/(\/[^\s]*\.app)/);
    if (!appMatch) return null;

    const appPath = appMatch[1];
    const appName = appPath.split('/').pop().replace('.app', '');
    
    // Bundle IDを取得
    const bundleId = this.getBundleId(appPath);
    
    return {
      name: appName.replace('.app', ''),
      bundleId: bundleId,
      path: appPath,
      type: 'app'
    };
  }

  getBundleId(appPath) {
    try {
      const result = execSync(`mdls -name kMDItemCFBundleIdentifier -raw "${appPath}"`, { encoding: 'utf-8' });
      return result.trim() === '(null)' ? null : result.trim();
    } catch (error) {
      return null;
    }
  }

  detectParentApp() {
    // キャッシュがあれば返す
    if (this.cache) {
      return this.cache;
    }

    let currentPid = process.ppid; // 自分の親から開始
    let level = 0;
    const maxLevels = 15; // 安全な上限

    while (currentPid && currentPid > 1 && level < maxLevels) {
      const info = this.getProcessInfo(currentPid);
      if (!info) break;

      // .appバンドルを探す
      if (info.args.includes('.app')) {
        const appInfo = this.extractAppFromPath(info.args);
        if (appInfo) {
          this.cache = {
            ...appInfo,
            pid: info.pid
          };
          return this.cache;
        }
      }

      currentPid = info.ppid;
      level++;
    }

    // 見つからなかった場合
    this.cache = { 
      name: 'Unknown', 
      bundleId: null, 
      type: 'unknown' 
    };
    return this.cache;
  }

  async activateParentApp() {
    const appInfo = this.detectParentApp();
    
    if (!appInfo.bundleId) {
      return { 
        success: false, 
        reason: 'No bundle ID available',
        appInfo 
      };
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
export const simpleParentDetector = new SimpleParentDetector();