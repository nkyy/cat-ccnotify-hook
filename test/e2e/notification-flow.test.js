import { jest } from '@jest/globals';
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const notificationHookPath = join(__dirname, '../../hooks/notification-hook.js');
const stopHookPath = join(__dirname, '../../hooks/stop-hook.cjs');

describe('E2E: Notification Flow', () => {
  const testTimeout = 15000; // 15 seconds for each test

  describe('notification-hook', () => {
    it('should handle valid JSON notification', async () => {
      const testData = {
        title: 'Test Notification',
        message: 'This is a test message'
      };

      const result = await runHookWithInput(
        notificationHookPath,
        JSON.stringify(testData)
      );

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
    }, testTimeout);

    it('should handle command line arguments fallback', async () => {
      const result = await runHookWithArgs(
        notificationHookPath,
        ['CLI Title', 'CLI Message']
      );

      expect(result.exitCode).toBe(0);
      // Don't check stderr as it might have warnings
    }, testTimeout);

    it('should handle empty input gracefully', async () => {
      const result = await runHookWithInput(notificationHookPath, '');

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
    }, testTimeout);

    it('should handle malformed JSON', async () => {
      const result = await runHookWithInput(
        notificationHookPath,
        '{"invalid": json}'
      );

      // Should fall back to args mode
      expect(result.exitCode).toBe(0);
    }, testTimeout);
  });

  describe('stop-hook', () => {
    it('should handle stop notification', async () => {
      const testData = {
        title: 'Session Ended',
        message: 'Claude Code session has ended',
        session_id: 'test-123'
      };

      const result = await runHookWithInput(
        stopHookPath,
        JSON.stringify(testData)
      );

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
    }, testTimeout);

    it('should skip notification when stop_hook_active is true', async () => {
      const testData = {
        title: 'Session Ended',
        message: 'Claude Code session has ended',
        stop_hook_active: true
      };

      const result = await runHookWithInput(
        stopHookPath,
        JSON.stringify(testData)
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).not.toContain('Stop Notification');
    }, testTimeout);
  });

  describe('debug mode', () => {
    it('should create debug logs when CAT_CCNOTIFY_DEBUG is set', async () => {
      const logDir = join(homedir(), '.claude', 'cat-ccnotify');
      const notificationLogFile = join(logDir, 'notification-hook.log');

      // Clean up any existing log
      try {
        await fs.unlink(notificationLogFile);
      } catch (e) {
        // Ignore if file doesn't exist
      }

      const testData = {
        title: 'Debug Test',
        message: 'Testing debug mode'
      };

      const result = await runHookWithInput(
        notificationHookPath,
        JSON.stringify(testData),
        { CAT_CCNOTIFY_DEBUG: 'true' }
      );

      expect(result.exitCode).toBe(0);

      // Check if debug log was created
      const logExists = await fs.access(notificationLogFile)
        .then(() => true)
        .catch(() => false);

      expect(logExists).toBe(true);

      if (logExists) {
        const logContent = await fs.readFile(notificationLogFile, 'utf-8');
        expect(logContent).toContain('Debug Test');
      }
    }, testTimeout);
  });
});

// Helper functions
function runHookWithInput(hookPath, input, env = {}) {
  return new Promise((resolve) => {
    const child = spawn('node', [hookPath], {
      env: { ...process.env, ...env }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code,
        stdout,
        stderr
      });
    });

    // Send input to stdin
    child.stdin.write(input);
    child.stdin.end();
  });
}

function runHookWithArgs(hookPath, args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn('node', [hookPath, ...args], {
      env: { ...process.env, ...env }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code,
        stdout,
        stderr
      });
    });
  });
}