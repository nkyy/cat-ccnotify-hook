#!/usr/bin/env node

/**
 * cat-ccnotify-hook uninstaller
 * Removes enhanced Claude Code notification hooks
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const claudeConfigDir = join(homedir(), '.claude');
const hooksConfigPath = join(claudeConfigDir, 'hooks.json');

function log(message) {
  console.log(`🐱 ${message}`);
}

function error(message) {
  console.error(`❌ ${message}`);
}

function success(message) {
  console.log(`✅ ${message}`);
}

function getCurrentHooksConfig() {
  if (!existsSync(hooksConfigPath)) {
    return {};
  }
  
  try {
    const configContent = readFileSync(hooksConfigPath, 'utf-8');
    return JSON.parse(configContent);
  } catch (err) {
    log(`Warning: Could not parse existing hooks config: ${err.message}`);
    return {};
  }
}

function uninstallHooks() {
  try {
    log('Uninstalling cat-ccnotify-hook...');
    
    if (!existsSync(hooksConfigPath)) {
      log('No hooks configuration found. Nothing to uninstall.');
      return;
    }
    
    // Get current hooks configuration
    const currentConfig = getCurrentHooksConfig();
    
    // Remove cat-ccnotify hooks
    const newConfig = { ...currentConfig };
    delete newConfig.notification;
    delete newConfig.stop;
    
    // Write updated configuration
    writeFileSync(hooksConfigPath, JSON.stringify(newConfig, null, 2));
    
    success('Cat notification hooks uninstalled successfully!');
    log(`Configuration updated: ${hooksConfigPath}`);
    log('Your Claude Code will now use default notifications.');
    
  } catch (err) {
    error(`Uninstallation failed: ${err.message}`);
    process.exit(1);
  }
}

function main() {
  console.log('🐱 cat-ccnotify-hook uninstaller');
  console.log('==================================');
  
  uninstallHooks();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { uninstallHooks };