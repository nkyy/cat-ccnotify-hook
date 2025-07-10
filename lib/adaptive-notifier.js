/**
 * Adaptive Notification System
 * Adapts notification behavior based on detected environment
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { environmentDetector } from './environment-detector.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class AdaptiveNotifier {
  constructor() {
    this.env = environmentDetector;
    this.soundPath = join(__dirname, '..', 'sounds', 'cat-meow-1-fx-323465.mp3');
  }

  /**
   * 環境に適応した通知送信
   */
  async sendNotification(title, message, options = {}) {
    const parentApp = this.env.detectParentApp();
    
    const method = this.env.notificationCapabilities.bestNotificationMethod;
    
    // iTerm2の場合でも、osascriptを使用して確実に通知センターに表示
    if (this.env.terminalInfo.isITerm2 && method === 'osascript') {
      console.log(`[AdaptiveNotifier] Using osascript for iTerm2 (better compatibility)`);
      return await this.sendWithOsascript(title, message, options);
    }
    console.log(`[AdaptiveNotifier] Using method: ${method}`);
    console.log(`[AdaptiveNotifier] Parent app: ${parentApp.name}`);

    try {
      switch (method) {
        case 'alerter':
          return await this.sendWithAlerter(title, message, parentApp, options);
        
        case 'terminal-notifier':
          return await this.sendWithTerminalNotifier(title, message, parentApp, options);
        
        case 'osascript':
          return await this.sendWithOsascript(title, message, options);
        
        case 'notify-send':
          return await this.sendWithNotifySend(title, message, options);
        
        case 'powershell':
          return await this.sendWithPowerShell(title, message, options);
        
        default:
          return await this.sendWithConsole(title, message, options);
      }
    } catch (error) {
      console.error(`[AdaptiveNotifier] Failed with ${method}:`, error.message);
      return await this.sendWithConsole(title, message, options);
    }
  }

  /**
   * Alerter を使用した通知 (最優先)
   */
  async sendWithAlerter(title, message, parentApp, options) {
    const args = [
      '-title', title,
      '-message', message,
      '-timeout', '10'
    ];

    // クリック時の動作を設定
    if (parentApp.bundleId) {
      // Bundle IDを使ってアプリを指定
      args.push('-actions', 'Focus Terminal');
    }

    const command = `alerter ${args.map(arg => `"${arg}"`).join(' ')}`;
    console.log(`[AdaptiveNotifier] Executing: ${command}`);

    return new Promise((resolve) => {
      const { spawn } = require('child_process');
      const alerter = spawn('alerter', args);

      let output = '';
      alerter.stdout.on('data', (data) => {
        output += data.toString();
      });

      alerter.on('close', (code) => {
        console.log(`[AdaptiveNotifier] Alerter output: ${output.trim()}`);
        
        // クリックされた場合の処理
        if (output.trim() === '@CONTENTCLICKED' || output.trim() === 'Focus Terminal') {
          this.focusParentApp(parentApp);
        }

        resolve({
          success: code === 0,
          method: 'alerter',
          clicked: output.trim() === '@CONTENTCLICKED'
        });
      });

      // 音声を再生
      this.playSound();
    });
  }

  /**
   * Terminal Notifier を使用した通知
   */
  async sendWithTerminalNotifier(title, message, parentApp, options) {
    const args = [
      '-title', title,
      '-message', message,
      '-timeout', '10'
    ];

    if (parentApp.bundleId) {
      args.push('-activate', parentApp.bundleId);
    }

    const command = `terminal-notifier ${args.map(arg => `"${arg}"`).join(' ')}`;
    console.log(`[AdaptiveNotifier] Executing: ${command}`);

    try {
      execSync(command, { stdio: 'ignore' });
      this.playSound();
      
      return {
        success: true,
        method: 'terminal-notifier'
      };
    } catch (error) {
      throw new Error(`terminal-notifier failed: ${error.message}`);
    }
  }

  /**
   * AppleScript を使用した通知 (フォールバック)
   */
  async sendWithOsascript(title, message, options) {
    const script = `display notification "${message}" with title "${title}"`;
    
    try {
      execSync(`osascript -e '${script}'`, { stdio: 'ignore' });
      this.playSound();
      
      return {
        success: true,
        method: 'osascript',
        warning: 'Clicking notification will open Script Editor'
      };
    } catch (error) {
      throw new Error(`osascript failed: ${error.message}`);
    }
  }

  /**
   * Linux notify-send を使用した通知
   */
  async sendWithNotifySend(title, message, options) {
    const args = [
      '-t', '10000', // 10秒
      title,
      message
    ];

    try {
      execSync(`notify-send ${args.map(arg => `"${arg}"`).join(' ')}`, { stdio: 'ignore' });
      this.playSound();
      
      return {
        success: true,
        method: 'notify-send'
      };
    } catch (error) {
      throw new Error(`notify-send failed: ${error.message}`);
    }
  }

  /**
   * Windows PowerShell を使用した通知
   */
  async sendWithPowerShell(title, message, options) {
    const script = `
      [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
      $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
      $xml = New-Object System.Xml.XmlDocument
      $xml.LoadXml($template.GetXml())
      $xml.GetElementsByTagName("text")[0].AppendChild($xml.CreateTextNode("${title}")) | Out-Null
      $xml.GetElementsByTagName("text")[1].AppendChild($xml.CreateTextNode("${message}")) | Out-Null
      $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
      [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("PowerShell").Show($toast)
    `;

    try {
      execSync(`powershell -Command "${script}"`, { stdio: 'ignore' });
      
      return {
        success: true,
        method: 'powershell'
      };
    } catch (error) {
      throw new Error(`PowerShell notification failed: ${error.message}`);
    }
  }

  /**
   * iTerm2 ESCシーケンス通知 (iTerm2専用)
   */
  async sendWithITerm2EscSequence(title, message, options) {
    // iTerm2の通知ESCシーケンス: \x1b]9;message\x07
    const notificationText = `${title}: ${message}`;
    const escSequence = '\x1b]9;' + notificationText + '\x07';
    
    try {
      // デバッグログ
      console.log(`[AdaptiveNotifier] iTerm2 ESC sequence - Title: "${title}"`);
      console.log(`[AdaptiveNotifier] iTerm2 ESC sequence - Message: "${message}"`);
      console.log(`[AdaptiveNotifier] iTerm2 ESC sequence - Full text: "${notificationText}"`);
      console.log(`[AdaptiveNotifier] iTerm2 ESC sequence - Escape sequence length: ${escSequence.length} bytes`);
      console.log(`[AdaptiveNotifier] iTerm2 ESC sequence - TTY info: stdout.isTTY=${process.stdout.isTTY}, stderr.isTTY=${process.stderr.isTTY}`);
      
      // ESCシーケンスを出力（UTF-8エンコーディングを明示）
      process.stdout.write(escSequence, 'utf8');
      
      // 音声再生
      this.playSound();
      
      return {
        success: true,
        method: 'iterm2-esc',
        note: 'iTerm2 ESC sequence notification - click behavior handled natively'
      };
    } catch (error) {
      throw new Error(`iTerm2 ESC sequence failed: ${error.message}`);
    }
  }

  /**
   * コンソール出力 (最終フォールバック)
   */
  async sendWithConsole(title, message, options) {
    const colorTitle = this.env.terminalInfo.supportsColor ? `\x1b[1;36m${title}\x1b[0m` : title;
    const colorMessage = this.env.terminalInfo.supportsColor ? `\x1b[33m${message}\x1b[0m` : message;
    
    console.log(`\n🐱 ${colorTitle}`);
    console.log(`   ${colorMessage}\n`);
    
    // ターミナルベルを鳴らす
    process.stdout.write('\x07');
    
    this.playSound();
    
    return {
      success: true,
      method: 'console'
    };
  }

  /**
   * 親アプリにフォーカスを戻す
   */
  focusParentApp(parentApp) {
    if (!parentApp.bundleId) {
      console.log('[AdaptiveNotifier] No bundle ID available for focus');
      return;
    }

    try {
      if (this.env.platform === 'darwin') {
        // macOS: AppleScript でアプリをアクティブにする
        const script = `tell application id "${parentApp.bundleId}" to activate`;
        execSync(`osascript -e '${script}'`, { stdio: 'ignore' });
        console.log(`[AdaptiveNotifier] Focused ${parentApp.name}`);
      }
    } catch (error) {
      console.error(`[AdaptiveNotifier] Failed to focus ${parentApp.name}:`, error.message);
    }
  }

  /**
   * 音声再生
   */
  playSound() {
    if (!existsSync(this.soundPath)) {
      console.warn('[AdaptiveNotifier] Sound file not found');
      return;
    }

    try {
      const soundMethod = this.env.notificationCapabilities.bestSoundMethod;
      
      switch (soundMethod) {
        case 'afplay':
          execSync(`afplay "${this.soundPath}"`, { stdio: 'ignore' });
          break;
        
        case 'say':
          execSync('say "meow"', { stdio: 'ignore' });
          break;
        
        case 'espeak':
          execSync('espeak "meow"', { stdio: 'ignore' });
          break;
        
        default:
          console.log('[AdaptiveNotifier] 🐱 *meow*');
      }
    } catch (error) {
      console.debug('[AdaptiveNotifier] Sound playback failed:', error.message);
    }
  }

  /**
   * 環境情報の表示
   */
  showEnvironmentInfo() {
    const info = this.env.debugInfo();
    console.log('\n🔍 Environment Detection Results:');
    console.log('================================');
    console.log(`Platform: ${info.platform}`);
    console.log(`Terminal: ${info.terminal.termProgram || info.terminal.term}`);
    console.log(`Best Notification Method: ${info.notifications.bestNotificationMethod}`);
    console.log(`Best Sound Method: ${info.notifications.bestSoundMethod}`);
    console.log(`Parent App: ${info.parentApp.name} (${info.parentApp.bundleId || 'no bundle ID'})`);
    console.log(`Supports Tab Focus: ${info.parentApp.supportsTabFocus}`);
    console.log('================================\n');
  }
}

// エクスポート
export const adaptiveNotifier = new AdaptiveNotifier();