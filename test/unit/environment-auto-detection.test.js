import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EnvironmentDetector } from '../../lib/environment-detector.js';

describe('EnvironmentDetector - Auto Detection', () => {
  let detector;
  let originalEnv;

  beforeEach(() => {
    // 元の環境変数を保存
    originalEnv = { ...process.env };
    
    // 環境変数をクリア
    delete process.env.CAT_CCNOTIFY_FORCE_CONSOLE;
    delete process.env.SSH_CONNECTION;
    delete process.env.SSH_CLIENT;
    delete process.env.SSH_TTY;
    delete process.env.DISPLAY;
    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITLAB_CI;
    delete process.env.JENKINS_URL;
    delete process.env.TRAVIS;
    delete process.env.CIRCLECI;
    
    detector = new EnvironmentDetector();
  });

  afterEach(() => {
    // 環境変数を復元
    process.env = originalEnv;
  });

  describe('SSH Connection Detection', () => {
    it('should detect SSH connection without DISPLAY', () => {
      process.env.SSH_CONNECTION = '192.168.1.100 54321 192.168.1.1 22';
      // DISPLAYを設定しない
      
      const result = detector.isSSHConnection();
      expect(result).toBe(true);
    });

    it('should detect SSH connection with SSH_TTY', () => {
      process.env.SSH_CONNECTION = '192.168.1.100 54321 192.168.1.1 22';
      process.env.SSH_TTY = '/dev/pts/0';
      
      const result = detector.isSSHConnection();
      expect(result).toBe(true);
    });

    it('should not detect SSH connection with DISPLAY (X11 forwarding)', () => {
      process.env.SSH_CONNECTION = '192.168.1.100 54321 192.168.1.1 22';
      process.env.DISPLAY = ':10.0';
      
      const result = detector.isSSHConnection();
      expect(result).toBe(false);
    });

    it('should detect SSH connection via SSH_CLIENT', () => {
      process.env.SSH_CLIENT = '192.168.1.100 54321 22';
      
      const result = detector.isSSHConnection();
      expect(result).toBe(true);
    });

    it('should not detect SSH connection in normal environment', () => {
      // SSH関連の環境変数なし
      
      const result = detector.isSSHConnection();
      expect(result).toBe(false);
    });
  });

  describe('CI Environment Detection', () => {
    it('should detect GitHub Actions', () => {
      process.env.GITHUB_ACTIONS = 'true';
      
      const result = detector.isCIEnvironment();
      expect(result).toBe(true);
    });

    it('should detect GitLab CI', () => {
      process.env.GITLAB_CI = 'true';
      
      const result = detector.isCIEnvironment();
      expect(result).toBe(true);
    });

    it('should detect Jenkins', () => {
      process.env.JENKINS_URL = 'http://jenkins.example.com';
      
      const result = detector.isCIEnvironment();
      expect(result).toBe(true);
    });

    it('should detect Travis CI', () => {
      process.env.TRAVIS = 'true';
      
      const result = detector.isCIEnvironment();
      expect(result).toBe(true);
    });

    it('should detect CircleCI', () => {
      process.env.CIRCLECI = 'true';
      
      const result = detector.isCIEnvironment();
      expect(result).toBe(true);
    });

    it('should detect generic CI environment', () => {
      process.env.CI = 'true';
      
      const result = detector.isCIEnvironment();
      expect(result).toBe(true);
    });

    it('should detect continuous integration flag', () => {
      process.env.CONTINUOUS_INTEGRATION = 'true';
      
      const result = detector.isCIEnvironment();
      expect(result).toBe(true);
    });

    it('should not detect CI in normal environment', () => {
      // CI関連の環境変数なし
      
      const result = detector.isCIEnvironment();
      expect(result).toBe(false);
    });
  });

  describe('Non-TTY Environment Detection', () => {
    let originalStdout;
    let originalStdin;

    beforeEach(() => {
      originalStdout = process.stdout.isTTY;
      originalStdin = process.stdin.isTTY;
    });

    afterEach(() => {
      process.stdout.isTTY = originalStdout;
      process.stdin.isTTY = originalStdin;
    });

    it('should detect non-TTY stdout', () => {
      process.stdout.isTTY = false;
      process.stdin.isTTY = true;
      
      const result = detector.isNonTTYEnvironment();
      expect(result).toBe(true);
    });

    it('should detect non-TTY stdin', () => {
      process.stdout.isTTY = true;
      process.stdin.isTTY = false;
      
      const result = detector.isNonTTYEnvironment();
      expect(result).toBe(true);
    });

    it('should detect both non-TTY', () => {
      process.stdout.isTTY = false;
      process.stdin.isTTY = false;
      
      const result = detector.isNonTTYEnvironment();
      expect(result).toBe(true);
    });

    it('should not detect non-TTY in normal terminal', () => {
      process.stdout.isTTY = true;
      process.stdin.isTTY = true;
      
      const result = detector.isNonTTYEnvironment();
      expect(result).toBe(false);
    });
  });

  describe('shouldForceConsole Integration', () => {
    it('should force console for SSH connection', () => {
      process.env.SSH_CONNECTION = '192.168.1.100 54321 192.168.1.1 22';
      
      const result = detector.shouldForceConsole();
      expect(result).toBe(true);
    });

    it('should force console for CI environment', () => {
      process.env.CI = 'true';
      
      const result = detector.shouldForceConsole();
      expect(result).toBe(true);
    });

    it('should force console for non-TTY environment', () => {
      process.stdout.isTTY = false;
      
      const result = detector.shouldForceConsole();
      expect(result).toBe(true);
    });

    it('should not force console in normal environment', () => {
      // 通常の環境（TTY、SSH/CIなし）
      process.stdout.isTTY = true;
      process.stdin.isTTY = true;
      
      const result = detector.shouldForceConsole();
      expect(result).toBe(false);
    });
  });

  describe('getBestNotificationMethod with Auto Detection', () => {
    let capabilities;

    beforeEach(() => {
      capabilities = {
        hasAlerter: true,
        hasTerminalNotifier: true,
        hasOsascript: true,
        hasNotifySend: false,
        hasAfplay: true
      };
    });

    it('should return console for SSH connection', () => {
      process.env.SSH_CONNECTION = '192.168.1.100 54321 192.168.1.1 22';
      
      const result = detector.getBestNotificationMethod(capabilities);
      expect(result).toBe('console');
    });

    it('should return console for CI environment', () => {
      process.env.GITHUB_ACTIONS = 'true';
      
      const result = detector.getBestNotificationMethod(capabilities);
      expect(result).toBe('console');
    });

    it('should return console for non-TTY environment', () => {
      process.stdout.isTTY = false;
      
      const result = detector.getBestNotificationMethod(capabilities);
      expect(result).toBe('console');
    });

    it('should return alerter for normal macOS environment', () => {
      // 通常のmacOS環境
      process.stdout.isTTY = true;
      process.stdin.isTTY = true;
      
      const result = detector.getBestNotificationMethod(capabilities);
      expect(result).toBe('alerter');
    });

    it('should still respect CAT_CCNOTIFY_FORCE_CONSOLE override', () => {
      process.env.CAT_CCNOTIFY_FORCE_CONSOLE = 'true';
      
      const result = detector.getBestNotificationMethod(capabilities);
      expect(result).toBe('console');
    });
  });

  describe('Complex Environment Scenarios', () => {
    it('should handle SSH with X11 forwarding correctly', () => {
      process.env.SSH_CONNECTION = '192.168.1.100 54321 192.168.1.1 22';
      process.env.DISPLAY = ':10.0';
      
      // X11転送があるのでGUI通知が可能
      const sshResult = detector.isSSHConnection();
      expect(sshResult).toBe(false);
      
      const forceResult = detector.shouldForceConsole();
      expect(forceResult).toBe(false);
    });

    it('should handle CI environment with TTY', () => {
      process.env.CI = 'true';
      process.stdout.isTTY = true;
      process.stdin.isTTY = true;
      
      // CIではTTYがあってもコンソール出力
      const ciResult = detector.isCIEnvironment();
      expect(ciResult).toBe(true);
      
      const forceResult = detector.shouldForceConsole();
      expect(forceResult).toBe(true);
    });

    it('should handle multiple indicators', () => {
      process.env.SSH_CONNECTION = '192.168.1.100 54321 192.168.1.1 22';
      process.env.CI = 'true';
      process.stdout.isTTY = false;
      
      // 複数の条件が満たされてもコンソール出力
      const result = detector.shouldForceConsole();
      expect(result).toBe(true);
    });
  });
});