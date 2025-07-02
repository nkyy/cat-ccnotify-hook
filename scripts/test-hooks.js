#!/usr/bin/env node

/**
 * cat-ccnotify-hook tester
 * Tests the installed hooks with sample notifications
 */

import { execSync, spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '..');

function log(message) {
  console.log(`🐱 ${message}`);
}

function success(message) {
  console.log(`✅ ${message}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testNotificationHook() {
  log('Testing notification hook...');
  
  const notificationHookPath = join(packageRoot, 'hooks', 'notification-hook.js');
  const testData = {
    title: 'Test Notification',
    message: 'This is a test notification with cat sound! 🐱'
  };
  
  try {
    const child = spawn('node', [notificationHookPath], {
      stdio: ['pipe', 'inherit', 'inherit']
    });
    
    child.stdin.write(JSON.stringify(testData));
    child.stdin.end();
    
    await new Promise((resolve, reject) => {
      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
    });
    
    success('Notification hook test completed!');
  } catch (err) {
    console.error(`❌ Notification hook test failed: ${err.message}`);
  }
}

async function testStopHook() {
  log('Testing stop hook...');
  
  const stopHookPath = join(packageRoot, 'hooks', 'stop-hook.cjs');
  const testData = {
    title: 'Test Session',
    message: 'Test stop notification'
  };
  
  try {
    const child = spawn('node', [stopHookPath], {
      stdio: ['pipe', 'inherit', 'inherit']
    });
    
    child.stdin.write(JSON.stringify(testData));
    child.stdin.end();
    
    await new Promise((resolve, reject) => {
      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
    });
    
    success('Stop hook test completed!');
  } catch (err) {
    console.error(`❌ Stop hook test failed: ${err.message}`);
  }
}

async function main() {
  console.log('🐱 cat-ccnotify-hook tester');
  console.log('============================');
  
  // Check if we're on macOS
  if (process.platform !== 'darwin') {
    console.error('❌ This package is designed for macOS only');
    process.exit(1);
  }
  
  log('Running hook tests...');
  log('You should see/hear notifications in a few seconds.');
  log('');
  
  await testNotificationHook();
  await sleep(2000); // Wait 2 seconds between tests
  await testStopHook();
  
  log('');
  success('All tests completed! If you saw notifications and heard cat sounds, everything is working! 🎉');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testNotificationHook, testStopHook };