# 🔧 環境変数システム - 基本構造ドキュメント

## 📋 概要

cat-ccnotify-hookプロジェクトにおける環境変数システムの基本構造と動作原理を解説します。このドキュメントは開発者がシステムの内部構造を理解するためのものです。

## 🏗️ システム構成

### 1. 環境変数の階層構造

```
環境変数システム
├── 制御用環境変数
│   ├── CAT_CCNOTIFY_FORCE_CONSOLE      # 通知方法の強制指定（手動上書き）
│   └── CAT_CCNOTIFY_DEBUG               # デバッグモード
├── 自動検出対象環境変数
│   ├── SSH_CONNECTION                  # SSH接続検出
│   ├── SSH_CLIENT                      # SSH接続検出（代替）
│   ├── SSH_TTY                         # SSH TTY検出
│   ├── DISPLAY                         # X11転送検出
│   ├── CI                              # CI環境検出
│   ├── GITHUB_ACTIONS                  # GitHub Actions検出
│   ├── GITLAB_CI                       # GitLab CI検出
│   ├── JENKINS_URL                     # Jenkins検出
│   ├── TRAVIS                          # Travis CI検出
│   ├── CIRCLECI                        # CircleCI検出
│   └── CONTINUOUS_INTEGRATION          # 汎用CI検出
├── 通知データ環境変数
│   ├── CLAUDE_NOTIFICATION             # Claude通知メッセージ
│   ├── NOTIFICATION_MESSAGE            # 一般通知メッセージ
│   ├── HOOK_MESSAGE                    # フックメッセージ
│   ├── CLAUDE_TITLE                    # Claude通知タイトル
│   ├── NOTIFICATION_TITLE              # 一般通知タイトル
│   └── HOOK_TITLE                      # フックタイトル
└── 端末環境検出用環境変数
    ├── TERM                            # 端末タイプ
    ├── COLORTERM                       # カラーサポート
    ├── TERM_PROGRAM                    # 端末プログラム名
    ├── NO_COLOR                        # カラー無効化フラグ
    └── SANDBOX                         # サンドボックス環境
```

### 2. 処理フロー（自動検出機能付き）

```
環境変数読み取り → 自動環境検出 → 通知方法決定 → 通知実行
     ↓               ↓                ↓           ↓
[notification-   [environment-      [adaptive-   [shell-
 hook.js]        detector.js]       notifier.js] executor.js]
                     ↓
                shouldForceConsole()
                 ├── SSH検出
                 ├── CI検出
                 └── 非TTY検出
```

## 🔍 各環境変数の詳細

### 制御用環境変数

#### `CAT_CCNOTIFY_FORCE_CONSOLE`
- **型**: `string`
- **有効値**: `'true'` | `undefined`
- **用途**: 通知方法をコンソール出力に強制（手動上書き）
- **処理場所**: `lib/environment-detector.js`
- **優先度**: 最高（すべての自動検出を上書き）

```javascript
// 実装例
getBestNotificationMethod(capabilities) {
  // 最優先チェック：手動上書き
  if (process.env.CAT_CCNOTIFY_FORCE_CONSOLE === 'true') {
    return 'console';
  }
  
  // 自動検出：明確にコンソール出力が適切な環境
  if (this.shouldForceConsole()) {
    return 'console';
  }
  
  // 他の検出ロジック...
}
```

#### `CAT_CCNOTIFY_DEBUG`
- **型**: `string`
- **有効値**: `'true'` | `undefined`
- **用途**: デバッグログの有効化
- **処理場所**: `hooks/notification-hook.js`
- **ログ出力先**: `~/.claude/cat-ccnotify/notification-hook.log`

```javascript
// 実装例
const isDebugMode = process.env.CAT_CCNOTIFY_DEBUG === 'true' || 
                   process.argv.includes('--debug');

function debugLog(message) {
  if (!isDebugMode) return;
  
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  appendFileSync(logFile, logEntry);
}
```

### 通知データ環境変数

#### メッセージ取得の優先順位
```javascript
// hooks/notification-hook.js での実装
const envNotification = process.env.CLAUDE_NOTIFICATION ||      // 1st
                       process.env.NOTIFICATION_MESSAGE ||     // 2nd
                       process.env.HOOK_MESSAGE;               // 3rd

const envTitle = process.env.CLAUDE_TITLE ||                   // 1st
                process.env.NOTIFICATION_TITLE ||              // 2nd
                process.env.HOOK_TITLE;                        // 3rd
```

#### フォールバック機能
```javascript
// メッセージ取得の多段階フォールバック
function getNotificationData() {
  // 1. 環境変数から取得
  if (envNotification || envTitle) {
    return { title: envTitle || 'Claude Code', message: envNotification };
  }
  
  // 2. 標準入力から取得
  const input = readFileSync(0, 'utf-8');
  if (input.trim()) {
    return parseInput(input);
  }
  
  // 3. コマンドライン引数から取得
  if (process.argv.length > 2) {
    return parseArguments(process.argv);
  }
  
  // 4. デフォルト値
  return { title: 'Claude Code', message: 'Empty notification' };
}
```

### 自動検出対象環境変数

#### SSH接続検出
```javascript
// lib/environment-detector.js での実装
isSSHConnection() {
  const env = process.env;
  
  // SSH_CONNECTION環境変数が設定されている
  if (env.SSH_CONNECTION) {
    // DISPLAYが設定されていない場合はヘッドレス
    if (!env.DISPLAY) {
      return true;
    }
    
    // SSH_TTYが設定されている場合
    if (env.SSH_TTY) {
      return true;
    }
  }
  
  // SSH_CLIENT環境変数が設定されている
  if (env.SSH_CLIENT) {
    return true;
  }
  
  return false;
}
```

#### CI環境検出
```javascript
// lib/environment-detector.js での実装
isCIEnvironment() {
  const env = process.env;
  
  // 一般的なCI環境変数
  const ciIndicators = [
    'CI',
    'CONTINUOUS_INTEGRATION',
    'BUILD_NUMBER',
    'JENKINS_URL',
    'GITHUB_ACTIONS',
    'GITLAB_CI',
    'CIRCLECI',
    'TRAVIS',
    'APPVEYOR',
    'AZURE_PIPELINES',
    'TEAMCITY_VERSION'
  ];
  
  return ciIndicators.some(indicator => env[indicator]);
}
```

#### 非TTY環境検出
```javascript
// lib/environment-detector.js での実装
isNonTTYEnvironment() {
  // 標準出力がTTYでない場合
  if (!process.stdout.isTTY) {
    return true;
  }
  
  // 標準入力がTTYでない場合
  if (!process.stdin.isTTY) {
    return true;
  }
  
  return false;
}
```

#### 自動判定統合ロジック
```javascript
// lib/environment-detector.js での実装
shouldForceConsole() {
  // SSH接続時（DISPLAYが設定されていない場合）
  if (this.isSSHConnection()) {
    return true;
  }
  
  // CI環境
  if (this.isCIEnvironment()) {
    return true;
  }
  
  // 非TTY環境（パイプやリダイレクト）
  if (this.isNonTTYEnvironment()) {
    return true;
  }
  
  return false;
}
```

### 端末環境検出用環境変数

#### 端末タイプ検出
```javascript
// lib/environment-detector.js での実装
detectTerminalEnvironment() {
  const env = process.env;
  
  return {
    term: env.TERM || 'unknown',
    colorTerm: env.COLORTERM || null,
    termProgram: env.TERM_PROGRAM || null,
    
    // カラーサポート判定
    supportsColor: !env.NO_COLOR && (env.COLORTERM || env.TERM?.includes('color')),
    
    // 特定端末の判定
    isITerm2: env.TERM_PROGRAM === 'iTerm.app',
    isVSCode: env.TERM_PROGRAM === 'vscode',
    
    // サンドボックス検出
    isSandbox: !!env.SANDBOX
  };
}
```

## 🔄 動作シーケンス

### 1. 初期化フェーズ
```
起動 → 環境変数読み取り → 端末環境検出 → 通知能力検出
```

### 2. 通知方法決定フェーズ（自動検出対応）
```
CAT_CCNOTIFY_FORCE_CONSOLE確認 → 自動環境検出 → プラットフォーム別最適化 → フォールバック
            ↓                        ↓
        手動上書き              shouldForceConsole()
                                    ├── SSH検出
                                    ├── CI検出
                                    └── 非TTY検出
```

### 3. 通知実行フェーズ
```
メッセージ取得 → 内容解析 → 通知送信 → 音声再生
```

### 4. 自動検出の判定順序
```
1. 手動上書き (CAT_CCNOTIFY_FORCE_CONSOLE=true)
2. 自動検出
   a. SSH接続検出
   b. CI環境検出
   c. 非TTY環境検出
3. 通常の通知方法選択
   a. プラットフォーム別最適化
   b. 利用可能なツール検出
4. フォールバック (console)
```

## 🧪 テスト環境での使用

### 単体テスト
```javascript
// test/unit/environment-detector.test.js
describe('Environment Variable Tests', () => {
  it('should force console when CAT_CCNOTIFY_FORCE_CONSOLE is true', () => {
    process.env.CAT_CCNOTIFY_FORCE_CONSOLE = 'true';
    const detector = new EnvironmentDetector();
    expect(detector.getBestNotificationMethod()).toBe('console');
  });
});

// test/unit/environment-auto-detection.test.js
describe('Auto Detection Tests', () => {
  it('should detect SSH connection without DISPLAY', () => {
    process.env.SSH_CONNECTION = '192.168.1.100 54321 192.168.1.1 22';
    // DISPLAYを設定しない
    
    const detector = new EnvironmentDetector();
    expect(detector.isSSHConnection()).toBe(true);
    expect(detector.shouldForceConsole()).toBe(true);
  });
  
  it('should detect CI environment', () => {
    process.env.CI = 'true';
    
    const detector = new EnvironmentDetector();
    expect(detector.isCIEnvironment()).toBe(true);
    expect(detector.shouldForceConsole()).toBe(true);
  });
  
  it('should detect non-TTY environment', () => {
    process.stdout.isTTY = false;
    
    const detector = new EnvironmentDetector();
    expect(detector.isNonTTYEnvironment()).toBe(true);
    expect(detector.shouldForceConsole()).toBe(true);
  });
});
```

### E2Eテスト
```javascript
// test/e2e/notification-flow.test.js
it('should create debug log when CAT_CCNOTIFY_DEBUG is set', (done) => {
  exec(
    'node hooks/notification-hook.js "Test" "Debug message"',
    { 
      env: { ...process.env, CAT_CCNOTIFY_DEBUG: 'true' }
    },
    (error, stdout, stderr) => {
      // ログファイルの存在確認
      expect(fs.existsSync(debugLogPath)).toBe(true);
      done();
    }
  );
});

// 自動検出のE2Eテスト
it('should use console output in SSH environment', (done) => {
  exec(
    'node hooks/notification-hook.js "SSH Test" "Should use console"',
    { 
      env: { 
        ...process.env, 
        SSH_CONNECTION: '192.168.1.100 54321 192.168.1.1 22'
      }
    },
    (error, stdout, stderr) => {
      expect(stdout).toContain('🐱');
      expect(stdout).toContain('SSH Test');
      done();
    }
  );
});

it('should use console output in CI environment', (done) => {
  exec(
    'node hooks/notification-hook.js "CI Test" "Should use console"',
    { 
      env: { 
        ...process.env, 
        CI: 'true'
      }
    },
    (error, stdout, stderr) => {
      expect(stdout).toContain('🐱');
      expect(stdout).toContain('CI Test');
      done();
    }
  );
});
```

## 🛠️ 拡張ポイント

### 新しい環境変数の追加
```javascript
// lib/environment-detector.js
class EnvironmentDetector {
  constructor() {
    this.customSettings = this.loadCustomSettings();
  }
  
  loadCustomSettings() {
    return {
      soundEnabled: process.env.CAT_CCNOTIFY_SOUND !== 'false',
      customSoundPath: process.env.CAT_CCNOTIFY_SOUND_PATH,
      notificationTimeout: parseInt(process.env.CAT_CCNOTIFY_TIMEOUT) || 5000
    };
  }
}
```

### 設定の永続化
```javascript
// scripts/config-manager.js
class ConfigManager {
  static saveToProfile(envVar, value) {
    const profilePath = path.join(os.homedir(), '.zshrc');
    const exportLine = `export ${envVar}=${value}`;
    
    if (!fs.readFileSync(profilePath, 'utf-8').includes(exportLine)) {
      fs.appendFileSync(profilePath, `\n${exportLine}\n`);
    }
  }
}
```

## 🔒 セキュリティ考慮事項

### 環境変数の検証
```javascript
// lib/environment-validator.js
class EnvironmentValidator {
  static validateDebugMode(value) {
    return value === 'true' || value === 'false' || value === undefined;
  }
  
  static sanitizeNotificationContent(content) {
    // XSS防止、コマンドインジェクション防止
    return content
      .replace(/[<>&"']/g, '')
      .substring(0, 1000); // 長さ制限
  }
}
```

### 権限チェック
```javascript
// lib/permission-checker.js
class PermissionChecker {
  static canWriteDebugLog() {
    const logDir = path.join(os.homedir(), '.claude', 'cat-ccnotify');
    try {
      fs.accessSync(logDir, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }
}
```

## 📊 パフォーマンス最適化

### 環境変数キャッシュ
```javascript
// lib/environment-cache.js
class EnvironmentCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000; // 5分
  }
  
  get(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.value;
    }
    
    const value = process.env[key];
    this.cache.set(key, { value, timestamp: Date.now() });
    return value;
  }
}
```

## 🐛 トラブルシューティング

### 一般的な問題と解決策

#### 1. 環境変数が反映されない
```bash
# 現在の設定確認
echo $CAT_CCNOTIFY_FORCE_CONSOLE

# シェルプロファイルの確認
grep CAT_CCNOTIFY ~/.zshrc ~/.bashrc

# 設定の再読み込み
source ~/.zshrc
```

#### 2. デバッグログが生成されない
```bash
# ログディレクトリの権限確認
ls -la ~/.claude/cat-ccnotify/

# 手動でディレクトリ作成
mkdir -p ~/.claude/cat-ccnotify

# テスト実行
CAT_CCNOTIFY_DEBUG=true node hooks/notification-hook.js "Test" "Debug test"
```

#### 3. 通知方法が期待通りでない
```bash
# 環境検出結果の確認
node -e "
const { environmentDetector } = require('./lib/environment-detector.js');
console.log(JSON.stringify(environmentDetector.debugInfo(), null, 2));
"
```

---

このドキュメントは、cat-ccnotify-hookプロジェクトの環境変数システムの基本構造を理解するための技術資料です。開発者はこの資料を参考にして、システムの拡張や保守を行うことができます。