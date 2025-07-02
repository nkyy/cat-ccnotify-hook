#!/usr/bin/env node

/**
 * cat-ccnotify-hook installer
 * Installs enhanced Claude Code notification hooks with cat sounds
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '..');

// Claude Code hooks configuration path
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

function ensureClaudeConfigExists() {
  if (!existsSync(claudeConfigDir)) {
    mkdirSync(claudeConfigDir, { recursive: true });
    log(`Created Claude config directory: ${claudeConfigDir}`);
  }
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

function installHooks() {
  try {
    log('Installing cat-ccnotify-hook...');
    
    ensureClaudeConfigExists();
    
    // Get current hooks configuration
    const currentConfig = getCurrentHooksConfig();
    
    // Get absolute paths to hook files
    const notificationHookPath = join(packageRoot, 'hooks', 'notification-hook.js');
    const stopHookPath = join(packageRoot, 'hooks', 'stop-hook.cjs');
    
    // Update hooks configuration
    const newConfig = {
      ...currentConfig,
      notification: notificationHookPath,
      stop: stopHookPath
    };
    
    // Write updated configuration
    writeFileSync(hooksConfigPath, JSON.stringify(newConfig, null, 2));
    
    success('Cat notification hooks installed successfully!');
    log(`Configuration saved to: ${hooksConfigPath}`);
    log('');
    log('🎵 Features enabled:');
    log('  • Enhanced notifications with cat sounds');
    log('  • Better styling with emojis');
    log('  • Intelligent notification categorization');
    log('  • Special stop session notifications');
    log('');
    log('🧪 Test your installation with:');
    log('  cat-ccnotify-test');
    
  } catch (err) {
    error(`Installation failed: ${err.message}`);
    process.exit(1);
  }
}

function main() {
  console.log('🐱 cat-ccnotify-hook installer');
  console.log('================================');
  
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

export { installHooks };