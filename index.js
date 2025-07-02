#!/usr/bin/env node

/**
 * cat-ccnotify-hook main entry point
 */

import { installHooks } from './scripts/install-hooks.js';
import { uninstallHooks } from './scripts/uninstall-hooks.js';
import { testNotificationHook, testStopHook } from './scripts/test-hooks.js';

export {
  installHooks,
  uninstallHooks,
  testNotificationHook,
  testStopHook
};

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  switch (command) {
    case 'install':
      installHooks();
      break;
    case 'uninstall':
      uninstallHooks();
      break;
    case 'test':
      testNotificationHook().then(() => testStopHook()).catch(console.error);
      break;
    default:
      console.log('🐱 cat-ccnotify-hook');
      console.log('');
      console.log('Usage:');
      console.log('  cat-ccnotify-hook install    # Install hooks');
      console.log('  cat-ccnotify-hook uninstall  # Uninstall hooks');  
      console.log('  cat-ccnotify-hook test       # Test hooks');
      console.log('');
      console.log('Or use the dedicated commands:');
      console.log('  cat-ccnotify-install');
      console.log('  cat-ccnotify-uninstall');
      console.log('  cat-ccnotify-test');
  }
}