/**
 * Environment Detection Module
 * Inspired by Gemini CLI's comprehensive environment detection
 */

import { execSync } from 'child_process';
import { platform } from 'os';

export class EnvironmentDetector {
  constructor() {
    this.platform = platform();
    this.terminalInfo = this.detectTerminalEnvironment();
    this.notificationCapabilities = this.detectNotificationCapabilities();
  }

  /**
   * 端末環境の検出 (Gemini CLI パターンを応用)
   */
  detectTerminalEnvironment() {
    const env = process.env;
    
    return {
      // 基本的な端末情報
      term: env.TERM || 'unknown',
      colorTerm: env.COLORTERM || null,
      termProgram: env.TERM_PROGRAM || null,
      
      // 色サポート
      supportsColor: !env.NO_COLOR && (env.COLORTERM || env.TERM?.includes('color')),
      
      // 特定の端末検出
      isITerm2: env.TERM_PROGRAM === 'iTerm.app',
      isVSCode: env.TERM_PROGRAM === 'vscode',
      isWindows: this.platform === 'win32',
      
      // サンドボックス環境
      isSandbox: !!env.SANDBOX,
      
      // 端末サイズ
      columns: process.stdout.columns || 80,
      rows: process.stdout.rows || 24
    };
  }

  /**
   * 通知機能の可用性検出
   */
  detectNotificationCapabilities() {
    const capabilities = {
      hasOsascript: this.commandExists('osascript'),
      hasTerminalNotifier: this.commandExists('terminal-notifier'),
      hasAlerter: this.commandExists('alerter'),
      hasNotifySend: this.commandExists('notify-send'), // Linux
      hasAfplay: this.commandExists('afplay'), // macOS音声
      hasSay: this.commandExists('say'), // macOS音声
      hasEspeak: this.commandExists('espeak'), // Linux音声
    };

    return {
      ...capabilities,
      bestNotificationMethod: this.getBestNotificationMethod(capabilities),
      bestSoundMethod: this.getBestSoundMethod(capabilities)
    };
  }

  /**
   * コマンドの存在確認 (Gemini CLI パターン)
   */
  commandExists(cmd) {
    try {
      execSync(
        this.platform === 'win32' ? `where.exe ${cmd}` : `command -v ${cmd}`,
        { stdio: 'ignore' }
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 最適な通知方法を決定
   */
  getBestNotificationMethod(capabilities) {
    // 環境変数で強制的にコンソール出力を指定
    if (process.env.CAT_CCNOTIFY_FORCE_CONSOLE === 'true') {
      return 'console';
    }
    
    // 自動判定：明確にコンソール出力が適切な環境
    if (this.shouldForceConsole()) {
      return 'console';
    }
    
    // macOS
    if (this.platform === 'darwin') {
      if (capabilities.hasAlerter) return 'alerter';
      if (capabilities.hasTerminalNotifier) return 'terminal-notifier';
      if (capabilities.hasOsascript) return 'osascript';
    }
    
    // Linux
    if (this.platform === 'linux') {
      if (capabilities.hasNotifySend) return 'notify-send';
    }
    
    // Windows
    if (this.platform === 'win32') {
      return 'powershell'; // PowerShellの通知機能
    }
    
    // フォールバック
    return 'console';
  }

  /**
   * 自動的にコンソール出力を使用すべき環境かを判定
   */
  shouldForceConsole() {
    // SSH接続時（DISPLAYが設定されていない場合）
    if (this.isSSHConnection()) {
      return true;
    }
    
    // CI環境
    if (this.isCIEnvironment()) {
      return true;
    }
    
    // 非TTY環境（パイプやリダイレクト）
    if (this.isNonTTYEnvironment()) {
      return true;
    }
    
    return false;
  }

  /**
   * SSH接続を検出
   */
  isSSHConnection() {
    const env = process.env;
    
    // SSH_CONNECTION環境変数が設定されている
    if (env.SSH_CONNECTION) {
      // DISPLAYが設定されていない場合はヘッドレス
      if (!env.DISPLAY) {
        return true;
      }
      
      // SSH_TTYが設定されている場合
      if (env.SSH_TTY) {
        return true;
      }
    }
    
    // SSH_CLIENT環境変数が設定されている
    if (env.SSH_CLIENT) {
      return true;
    }
    
    return false;
  }

  /**
   * CI環境を検出
   */
  isCIEnvironment() {
    const env = process.env;
    
    // 一般的なCI環境変数
    const ciIndicators = [
      'CI',
      'CONTINUOUS_INTEGRATION',
      'BUILD_NUMBER',
      'JENKINS_URL',
      'GITHUB_ACTIONS',
      'GITLAB_CI',
      'CIRCLECI',
      'TRAVIS',
      'APPVEYOR',
      'AZURE_PIPELINES',
      'TEAMCITY_VERSION'
    ];
    
    return ciIndicators.some(indicator => env[indicator]);
  }

  /**
   * 非TTY環境を検出
   */
  isNonTTYEnvironment() {
    // 標準出力がTTYでない場合（undefinedは除外）
    if (process.stdout.isTTY === false) {
      return true;
    }
    
    // 標準入力がTTYでない場合は通知フックでは正常（パイプ経由で呼び出されるため）
    // undefinedの場合は除外して、明示的にfalseの場合のみ非TTY判定
    if (process.stdin.isTTY === false) {
      return true;
    }
    
    return false;
  }

  /**
   * 最適な音声再生方法を決定
   */
  getBestSoundMethod(capabilities) {
    if (this.platform === 'darwin') {
      if (capabilities.hasAfplay) return 'afplay';
      if (capabilities.hasSay) return 'say';
    }
    
    if (this.platform === 'linux') {
      if (capabilities.hasEspeak) return 'espeak';
    }
    
    if (this.platform === 'win32') {
      return 'powershell'; // PowerShellのサウンド機能
    }
    
    return 'none';
  }

  /**
   * 親プロセス検出の改善
   */
  detectParentApp() {
    try {
      // 既存のロジックを改善
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

        // 特定の端末を優先的に検出
        const terminalMatches = this.identifyTerminalApp(info);
        if (terminalMatches) {
          return terminalMatches;
        }

        currentPid = info.ppid;
        level++;
      }
    } catch (error) {
      console.debug('Parent app detection failed:', error.message);
    }
    
    return this.getFallbackApp();
  }

  /**
   * 端末アプリケーションの識別
   */
  identifyTerminalApp(info) {
    // iTerm2
    if (info.args.includes('iTerm.app')) {
      return {
        name: 'iTerm2',
        bundleId: 'com.googlecode.iterm2',
        type: 'terminal',
        supportsTabFocus: false // 制限事項
      };
    }

    // VS Code Terminal
    if (info.args.includes('Code.app') || info.command.includes('code')) {
      return {
        name: 'Visual Studio Code',
        bundleId: 'com.microsoft.VSCode',
        type: 'editor',
        supportsTabFocus: true
      };
    }

    // Terminal.app
    if (info.args.includes('Terminal.app')) {
      return {
        name: 'Terminal',
        bundleId: 'com.apple.Terminal',
        type: 'terminal',
        supportsTabFocus: false
      };
    }

    return null;
  }

  /**
   * フォールバック用のアプリ情報
   */
  getFallbackApp() {
    // 環境変数から推測
    if (this.terminalInfo.isITerm2) {
      return {
        name: 'iTerm2',
        bundleId: 'com.googlecode.iterm2',
        type: 'terminal',
        supportsTabFocus: false
      };
    }

    if (this.terminalInfo.isVSCode) {
      return {
        name: 'Visual Studio Code',
        bundleId: 'com.microsoft.VSCode',
        type: 'editor',
        supportsTabFocus: true
      };
    }

    return {
      name: 'Unknown Terminal',
      bundleId: null,
      type: 'unknown',
      supportsTabFocus: false
    };
  }

  /**
   * 環境情報のデバッグ出力
   */
  debugInfo() {
    return {
      platform: this.platform,
      terminal: this.terminalInfo,
      notifications: this.notificationCapabilities,
      parentApp: this.detectParentApp()
    };
  }
}

// シングルトンインスタンス
export const environmentDetector = new EnvironmentDetector();