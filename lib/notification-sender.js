/**
 * Advanced notification sender that prevents script association
 * Uses multiple strategies to avoid opening scripts when notifications are clicked
 */

import { executeOsascript } from './shell-executor.js';

/**
 * Send notification with multiple fallback methods to prevent script association
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} subtitle - Notification subtitle
 * @returns {Promise<boolean>} - True if notification was sent successfully
 */
export async function sendNotificationSafely(title, message, subtitle = '🐱 Cat Notify') {
  const methods = [
    // Method 1: Use Finder as the source (most common app, less likely to show script)
    {
      name: 'Finder',
      script: `
tell application "Finder"
  display notification "${message}" with title "${title}" subtitle "${subtitle}"
end tell`
    },
    
    // Method 2: Use Terminal but with a different approach
    {
      name: 'Terminal-Safe',
      script: `
tell application "Terminal"
  set currentTab to do script "echo 'Cat notification sent'"
  display notification "${message}" with title "${title}" subtitle "${subtitle}"
  close currentTab
end tell`
    },
    
    // Method 3: Use System Preferences (system app, unlikely to associate with script)
    {
      name: 'System-Preferences',
      script: `
tell application "System Preferences"
  display notification "${message}" with title "${title}" subtitle "${subtitle}"
end tell`
    },
    
    // Method 4: Use specific bundle ID approach
    {
      name: 'Bundle-ID',
      script: `
tell application "System Events"
  tell (first application process whose bundle identifier is "com.apple.finder")
    display notification "${message}" with title "${title}" subtitle "${subtitle}"
  end tell
end tell`
    },
    
    // Method 5: Direct notification center approach
    {
      name: 'Notification-Center',
      script: `
tell application "System Events"
  tell application process "NotificationCenter"
    display notification "${message}" with title "${title}" subtitle "${subtitle}"
  end tell
end tell`
    },
    
    // Method 6: Use a workaround with sound name to reduce script association
    {
      name: 'Sound-Workaround',
      script: `display notification "${message}" with title "${title}" sound name "Glass"`
    },
    
    // Method 7: Basic fallback (may show script on click)
    {
      name: 'Basic-Fallback',
      script: `display notification "${message}" with title "${title}"`
    }
  ];

  for (const method of methods) {
    try {
      await executeOsascript(method.script);
      console.log(`✅ Notification sent successfully using ${method.name} method`);
      return true;
    } catch (error) {
      console.log(`❌ ${method.name} method failed: ${error.message}`);
    }
  }
  
  console.log('❌ All notification methods failed');
  return false;
}

/**
 * Detect the current execution environment and choose appropriate notification method
 * @returns {string} - Environment type (iterm2, vscode, terminal, unknown)
 */
function detectExecutionEnvironment() {
  // Check environment variables first
  if (process.env.TERM_PROGRAM) {
    switch (process.env.TERM_PROGRAM) {
      case 'iTerm.app':
        return 'iterm2';
      case 'Apple_Terminal':
        return 'terminal';
      case 'vscode':
        return 'vscode';
      default:
        console.log(`Unknown TERM_PROGRAM: ${process.env.TERM_PROGRAM}`);
    }
  }
  
  // Check parent process for additional clues
  try {
    const { execSync } = require('child_process');
    const ppid = process.ppid;
    const parentInfo = execSync(`ps -p ${ppid} -o comm=`, { encoding: 'utf8' }).trim();
    
    if (parentInfo.includes('iTerm')) return 'iterm2';
    if (parentInfo.includes('Terminal')) return 'terminal';
    if (parentInfo.includes('code') || parentInfo.includes('Code')) return 'vscode';
  } catch (error) {
    console.log(`Could not detect parent process: ${error.message}`);
  }
  
  return 'unknown';
}

/**
 * Send notification using environment-aware method priority (osascript as last resort)
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} subtitle - Notification subtitle
 * @returns {Promise<boolean>} - True if notification was sent successfully
 */
export async function sendNotificationWithTerminalNotifier(title, message, subtitle = '🐱 Cat Notify') {
  const environment = detectExecutionEnvironment();
  console.log(`🖥️  Detected environment: ${environment}`);
  
  const methods = [
    // Method 1: iTerm2 native notification (highest priority for iTerm2)
    {
      name: 'iterm2-native',
      priority: 1,
      condition: () => environment === 'iterm2',
      async execute() {
        const notificationMessage = `${title}: ${message}`;
        // iTerm2 notification escape sequence: \033]9;message\007
        process.stdout.write('\x1b]9;' + notificationMessage + '\x07');
        console.log(`🐱 ${notificationMessage}`);
        return true;
      }
    },
    
    // Method 2: terminal-notifier (second priority - never shows scripts)
    {
      name: 'terminal-notifier',
      priority: 2,
      async execute() {
        const { execFile } = await import('child_process');
        const { promisify } = await import('util');
        const execFileAsync = promisify(execFile);
        
        await execFileAsync('terminal-notifier', [
          '-title', title,
          '-subtitle', subtitle,
          '-message', message,
          '-sound', 'default'
        ], { timeout: 5000 });
        
        return true;
      }
    },
    
    // Method 3: alerter (third priority - interactive notifications)
    {
      name: 'alerter',
      priority: 3,
      async execute() {
        const { execFile } = await import('child_process');
        const { promisify } = await import('util');
        const execFileAsync = promisify(execFile);
        
        await execFileAsync('alerter', [
          '-title', title,
          '-subtitle', subtitle,
          '-message', message,
          '-timeout', '5'
        ], { timeout: 6000 });
        
        return true;
      }
    },
    
    // Method 4: echo for other terminal environments (fourth priority)
    {
      name: 'echo',
      priority: 4,
      condition: () => ['terminal'].includes(environment),
      async execute() {
        const fullMessage = `🐱 ${title}: ${message}`;
        console.log(`\n${fullMessage}\n`);
        
        // Also try to ring the terminal bell
        process.stdout.write('\x07');
        return true;
      }
    },
    
    // Method 5: osascript (lowest priority - may show script editor)
    {
      name: 'osascript',
      priority: 5,
      async execute() {
        return await sendNotificationSafely(title, message, subtitle);
      }
    }
  ];
  
  // Filter methods based on conditions and sort by priority
  const availableMethods = methods
    .filter(method => !method.condition || method.condition())
    .sort((a, b) => a.priority - b.priority);
  
  for (const method of availableMethods) {
    try {
      await method.execute();
      console.log(`✅ Notification sent using ${method.name} (priority: ${method.priority})`);
      return true;
    } catch (error) {
      console.log(`❌ ${method.name} method failed: ${error.message}`);
    }
  }
  
  console.log('❌ All notification methods failed');
  return false;
}

/**
 * Simple notification with just the essential info
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @returns {Promise<boolean>} - True if notification was sent successfully
 */
export async function sendSimpleNotification(title, message) {
  try {
    // Use the simplest possible approach with Finder
    const script = `
tell application "Finder"
  display notification "${message}" with title "${title}"
end tell`;
    
    await executeOsascript(script);
    console.log('✅ Simple notification sent via Finder');
    return true;
  } catch (error) {
    console.log(`❌ Simple notification failed: ${error.message}`);
    return false;
  }
}