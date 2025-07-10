#!/usr/bin/env node

/**
 * cat-ccnotify-hook installer v2
 * Installs enhanced Claude Code notification hooks with cat sounds
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '..');

// Check if we're running from global npm install
const isGlobalInstall = process.argv.includes('--global') || 
  packageRoot.includes('node_modules/.bin') ||
  packageRoot.includes('node_modules/cat-ccnotify-hook');

// Claude Code settings configuration path
const claudeConfigDir = join(homedir(), '.claude');
const settingsPath = join(claudeConfigDir, 'settings.json');

function log(message) {
  console.log(`🐱 ${message}`);
}

function error(message) {
  console.error(`❌ ${message}`);
}

function success(message) {
  console.log(`✅ ${message}`);
}

function ensureClaudeConfigExists() {
  if (!existsSync(claudeConfigDir)) {
    mkdirSync(claudeConfigDir, { recursive: true });
    log(`Created Claude config directory: ${claudeConfigDir}`);
  }
}

function getCurrentSettings() {
  if (!existsSync(settingsPath)) {
    return {};
  }
  
  try {
    const settingsContent = readFileSync(settingsPath, 'utf-8');
    return JSON.parse(settingsContent);
  } catch (err) {
    log(`Warning: Could not parse existing settings: ${err.message}`);
    return {};
  }
}

function getHookPaths() {
  let notificationHookPath, stopHookPath;
  
  if (isGlobalInstall) {
    // For global installs, find the actual package location
    try {
      const npmRoot = execSync('npm root -g', { encoding: 'utf-8' }).trim();
      notificationHookPath = join(npmRoot, 'cat-ccnotify-hook', 'hooks', 'notification-hook.js');
      stopHookPath = join(npmRoot, 'cat-ccnotify-hook', 'hooks', 'stop-hook.cjs');
      
      // Verify paths exist
      if (!existsSync(notificationHookPath)) {
        throw new Error('Hook files not found in global npm location');
      }
    } catch (e) {
      // Fallback to local paths
      notificationHookPath = join(packageRoot, 'hooks', 'notification-hook.js');
      stopHookPath = join(packageRoot, 'hooks', 'stop-hook.cjs');
    }
  } else {
    // Local installation
    notificationHookPath = join(packageRoot, 'hooks', 'notification-hook.js');
    stopHookPath = join(packageRoot, 'hooks', 'stop-hook.cjs');
  }
  
  // Verify hook files exist
  if (!existsSync(notificationHookPath) || !existsSync(stopHookPath)) {
    throw new Error(`Hook files not found at:\n  ${notificationHookPath}\n  ${stopHookPath}`);
  }
  
  return { notificationHookPath, stopHookPath };
}

function installHooks() {
  try {
    log('Installing cat-ccnotify-hook v2...');
    
    ensureClaudeConfigExists();
    
    // Get current settings
    const currentSettings = getCurrentSettings();
    
    // Get hook file paths
    const { notificationHookPath, stopHookPath } = getHookPaths();
    
    // Get existing hooks to preserve them
    const existingHooks = currentSettings.hooks || {};
    
    // Create new hook entries for cat-ccnotify
    const newNotificationHook = {
      matcher: "",
      hooks: [
        {
          type: "command",
          command: `node "${notificationHookPath}"`
        }
      ]
    };
    
    const newStopHook = {
      matcher: "",
      hooks: [
        {
          type: "command",
          command: `node "${stopHookPath}"`
        }
      ]
    };
    
    // Check if hooks are already installed
    const isNotificationHookInstalled = (existingHooks.Notification || []).some(hook => 
      hook.hooks && hook.hooks.some(h => 
        h.command && h.command.includes(notificationHookPath)
      )
    );
    
    const isStopHookInstalled = (existingHooks.Stop || []).some(hook => 
      hook.hooks && hook.hooks.some(h => 
        h.command && h.command.includes(stopHookPath)
      )
    );
    
    // Merge hooks intelligently - preserve existing hooks and add new ones only if not already present
    const mergedHooks = {
      ...existingHooks,
      Notification: [
        ...(existingHooks.Notification || []),
        ...(isNotificationHookInstalled ? [] : [newNotificationHook])
      ],
      Stop: [
        ...(existingHooks.Stop || []),
        ...(isStopHookInstalled ? [] : [newStopHook])
      ]
    };
    
    // Create final settings object
    const newSettings = {
      ...currentSettings,
      hooks: mergedHooks
    };
    
    // Write updated settings
    writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2));
    
    success('Cat notification hooks installed successfully!');
    log(`Configuration saved to: ${settingsPath}`);
    log('');
    
    // Report installation status
    log('📦 Installation status:');
    if (isNotificationHookInstalled) {
      log('  • Notification hook: Already installed (skipped)');
    } else {
      log('  • Notification hook: Newly installed ✓');
    }
    if (isStopHookInstalled) {
      log('  • Stop hook: Already installed (skipped)');
    } else {
      log('  • Stop hook: Newly installed ✓');
    }
    
    // Report preserved hooks
    if (existingHooks.Notification && existingHooks.Notification.length > 0) {
      const otherNotificationHooks = existingHooks.Notification.filter(hook => 
        !hook.hooks || !hook.hooks.some(h => h.command && h.command.includes(notificationHookPath))
      ).length;
      if (otherNotificationHooks > 0) {
        log(`  • ${otherNotificationHooks} other Notification hook(s) preserved`);
      }
    }
    if (existingHooks.Stop && existingHooks.Stop.length > 0) {
      const otherStopHooks = existingHooks.Stop.filter(hook => 
        !hook.hooks || !hook.hooks.some(h => h.command && h.command.includes(stopHookPath))
      ).length;
      if (otherStopHooks > 0) {
        log(`  • ${otherStopHooks} other Stop hook(s) preserved`);
      }
    }
    log('');
    log('🎵 Features enabled:');
    log('  • Enhanced notifications with cat sounds');
    log('  • Better styling with emojis');
    log('  • Intelligent notification categorization');
    log('  • Special stop session notifications');
    log('');
    log('🧪 Test your installation:');
    log('  1. Run: claude "test notification"');
    log('  2. Wait for Claude to send a notification');
    log('  3. You should hear a cat meow!');
    log('');
    log('📝 To reload settings:');
    log('  1. Type /hooks in Claude Code');
    log('  2. Press ESC immediately');
    log('');
    log('📍 Hook files installed at:');
    log(`  Notification: ${notificationHookPath}`);
    log(`  Stop: ${stopHookPath}`);
    
  } catch (err) {
    error(`Installation failed: ${err.message}`);
    process.exit(1);
  }
}

function main() {
  console.log('🐱 cat-ccnotify-hook installer v2');
  console.log('==================================');
  
  // Check if we're on macOS
  if (process.platform !== 'darwin') {
    error('This package is designed for macOS only');
    process.exit(1);
  }
  
  // Check if Claude Code is installed
  try {
    execSync('which claude', { stdio: 'ignore' });
  } catch (err) {
    error('Claude Code CLI not found. Please install Claude Code first.');
    error('Visit: https://docs.anthropic.com/claude/claude-code');
    process.exit(1);
  }
  
  installHooks();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Also run if invoked as global binary
if (process.argv[1].endsWith('cat-ccnotify-install')) {
  main();
}

export { installHooks };