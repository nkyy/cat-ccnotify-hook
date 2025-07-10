#!/usr/bin/env node

/**
 * cat-ccnotify-hook uninstaller
 * Removes cat notification hooks from Claude Code settings
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

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

function getCurrentSettings() {
  if (!existsSync(settingsPath)) {
    return null;
  }
  
  try {
    const settingsContent = readFileSync(settingsPath, 'utf-8');
    return JSON.parse(settingsContent);
  } catch (err) {
    error(`Could not parse settings file: ${err.message}`);
    return null;
  }
}

function uninstallHooks() {
  try {
    log('Uninstalling cat-ccnotify-hook...');
    
    // Get current settings
    const currentSettings = getCurrentSettings();
    
    if (!currentSettings) {
      log('No settings.json found. Nothing to uninstall.');
      return;
    }
    
    if (!currentSettings.hooks) {
      log('No hooks configured. Nothing to uninstall.');
      return;
    }
    
    // Check if our hooks were installed
    const { Notification, Stop } = currentSettings.hooks;
    
    const hadNotificationHook = Notification && Notification.some(hookGroup => 
      hookGroup.hooks && hookGroup.hooks.some(hook => 
        hook.command && hook.command.includes('notification-hook.js')
      )
    );
    const hadStopHook = Stop && Stop.some(hookGroup => 
      hookGroup.hooks && hookGroup.hooks.some(hook => 
        hook.command && hook.command.includes('stop-hook.cjs')
      )
    );
    
    if (!hadNotificationHook && !hadStopHook) {
      log('Cat notification hooks not found. Nothing to uninstall.');
      return;
    }
    
    // Create new settings without cat hooks
    const newSettings = { ...currentSettings };
    
    if (newSettings.hooks) {
      // Remove cat notification hooks
      if (newSettings.hooks.Notification) {
        newSettings.hooks.Notification = newSettings.hooks.Notification.filter(hookGroup => 
          !hookGroup.hooks.some(hook => 
            hook.command && hook.command.includes('notification-hook.js')
          )
        );
        
        if (newSettings.hooks.Notification.length === 0) {
          delete newSettings.hooks.Notification;
        }
      }
      
      // Remove cat stop hooks
      if (newSettings.hooks.Stop) {
        newSettings.hooks.Stop = newSettings.hooks.Stop.filter(hookGroup => 
          !hookGroup.hooks.some(hook => 
            hook.command && hook.command.includes('stop-hook.cjs')
          )
        );
        
        if (newSettings.hooks.Stop.length === 0) {
          delete newSettings.hooks.Stop;
        }
      }
      
      // Remove empty hooks object
      if (Object.keys(newSettings.hooks).length === 0) {
        delete newSettings.hooks;
      }
    }
    
    // Write updated settings
    writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2));
    
    success('Cat notification hooks uninstalled successfully!');
    log('Claude Code will now use default notifications.');
    log('');
    log('😿 We\'ll miss the meows!');
    log('');
    log('To reinstall later, run:');
    log('  cat-ccnotify-install');
    
  } catch (err) {
    error(`Uninstallation failed: ${err.message}`);
    process.exit(1);
  }
}

function main() {
  console.log('🐱 cat-ccnotify-hook uninstaller');
  console.log('=================================');
  
  uninstallHooks();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Also run if invoked as global binary
if (process.argv[1].endsWith('cat-ccnotify-uninstall')) {
  main();
}

export { uninstallHooks };