# 🐱 cat-ccnotify-hook

Enhanced Claude Code notification hooks with adorable cat sounds and better styling for macOS.

## ✨ Features

- 🐱 **Adorable cat meow** for all notifications
- 🎨 **Enhanced styling** with emojis and better formatting
- 🧠 **Intelligent categorization** of notifications (success, error, warning, etc.)
- 🛑 **Special stop notifications** with the same adorable cat meow
- 🍎 **macOS optimized** using native notification system
- 🤖 **Automatic environment detection** - works seamlessly in SSH, CI, and pipe environments

## 📦 Installation

### Via npm (Recommended)

```bash
# Install globally
npm install -g cat-ccnotify-hook

# Run the installer
cat-ccnotify-install
```

This will automatically:
- Install the package globally
- Create the `~/.claude` directory if needed
- Update `~/.claude/settings.json` with the correct hook configuration
- Configure Claude Code to use cat notifications

⚠️ **Important**: After installation, reload Claude Code hooks:
1. Type `/hooks` in Claude Code
2. Press `ESC` immediately

### Local Installation (Development)

1. Clone this repository:
   ```bash
   git clone https://github.com/cat-ccnotify/cat-ccnotify-hook.git
   cd cat-ccnotify-hook
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the installer:
   ```bash
   npm run install-hooks
   ```

## 🧪 Testing

Test your installation to make sure everything works:

```bash
# Simple notification test (recommended)
cat-notify

# Custom notification
cat-notify "My Title" "My custom message"

# Test actual hook functionality with Claude Code data format
cat-notify --notification-hook
cat-notify --stop-hook

# Test hooks via npm command
cat-ccnotify-test

# Or manually test hooks
node hooks/notification-hook.js
echo '{"title":"Test","message":"Session ended"}' | node hooks/stop-hook.cjs
```

You should see notifications with:
- 🐱 Cat meow sounds
- 📱 Native macOS notifications  
- 🎨 Appropriate emojis (✅ for success, ❌ for errors, etc.)
- 📝 Your actual message content

## 🎵 Enhanced Notification System

All notifications play the same adorable cat meow sound! 🐱

### 🧠 Smart Categorization

The system intelligently analyzes your notification content and automatically adds appropriate emojis:

- ✅ **Success**: `complete`, `success`, `passed`, `done`, `deployed`, `published`
- ❌ **Error**: `error`, `failed`, `crash`, `exception`, `cannot`, `invalid`
- ⚠️ **Warning**: `warning`, `deprecated`, `caution`, `should`, `might`
- 💡 **Info**: General information and status updates
- ⏳ **Progress**: `running`, `processing`, `installing`, `building`, `loading`
- 🔄 **Git**: `commit`, `push`, `pull`, `merge`, `branch`, `repository`
- 🏗️ **Build**: `build`, `compile`, `bundle`, `webpack`, `typescript`
- 🧪 **Test**: `test`, `spec`, `jest`, `coverage`, `assertion`
- 🚀 **Deploy**: `deploy`, `release`, `production`, `staging`, `live`
- 📦 **NPM**: `npm`, `yarn`, `package`, `dependency`, `install`
- 📄 **File**: `file`, `directory`, `write`, `read`, `created`, `modified`

### 📝 Dynamic Content

Instead of showing generic messages, you'll see your actual notification content:
- "✅ Tests Passed - All 25 tests completed successfully!"
- "❌ Git Push Failed - Permission denied to repository"
- "🏗️ Build Complete - TypeScript compilation finished"

**Note**: All categories use the same adorable cat meow sound. Future versions may include category-specific sounds!

## 🔧 Configuration

The hooks are automatically configured in `~/.claude/settings.json`. You can view the current configuration:

```bash
cat ~/.claude/settings.json | jq '.hooks'
```

### Hook Configuration Format

The hooks are configured in the new Claude Code format:

```json
{
  "hooks": {
    "Notification": [
      {
        "type": "command",
        "command": "node /path/to/notification-hook.js",
        "description": "Cat-themed notification with meow sound"
      }
    ],
    "Stop": [
      {
        "type": "command",
        "command": "node /path/to/stop-hook.cjs",
        "description": "Cat-themed session end notification"
      }
    ]
  }
}
```

### Reloading Configuration

After installation or making manual changes:
1. Type `/hooks` in Claude Code
2. Press `ESC` immediately to reload settings

### Environment Variables

You can customize the notification behavior with these environment variables:

```bash
# Force console output (echo) instead of system notifications
export CAT_CCNOTIFY_FORCE_CONSOLE=true

# Enable debug logging
export CAT_CCNOTIFY_DEBUG=true
```

**🤖 Automatic Environment Detection:**
The system **automatically detects** when to use console output in these scenarios:
- **SSH connections** without X11 forwarding (`SSH_CONNECTION` without `DISPLAY`)
- **CI environments** (GitHub Actions, GitLab CI, Jenkins, Travis, CircleCI, etc.)
- **Non-TTY environments** (pipes, redirects, background processes)

**Examples:**
```bash
# SSH connection - automatically uses console output
ssh user@server
claude-code  # → 🐱 Console notifications

# CI environment - automatically uses console output  
# GitHub Actions, GitLab CI, etc.
claude-code  # → 🐱 Console notifications

# Pipe usage - automatically uses console output
claude-code | tee output.log  # → 🐱 Console notifications

# Normal desktop usage - uses GUI notifications
claude-code  # → Native macOS notifications + sound
```

**Manual override (rarely needed):**
```bash
# Force console output even in GUI environments
export CAT_CCNOTIFY_FORCE_CONSOLE=true

# Or temporarily
CAT_CCNOTIFY_FORCE_CONSOLE=true claude-code
```

**Priority order:**
1. `CAT_CCNOTIFY_FORCE_CONSOLE=true` (manual override)
2. Automatic environment detection
3. Platform-specific GUI notifications
4. Console fallback

## 📁 Project Structure

```
cat-ccnotify-hook/
├── package.json              # Package configuration and npm scripts
├── README.md                # This documentation
├── INSTALL.md               # Detailed installation guide
├── PUBLISHING.md            # npm publishing instructions
├── jest.config.js           # Test configuration
├── .npmignore               # npm package exclusions
├── bin/
│   └── cat-notify              # Command line testing tool
├── hooks/                   # Core hook implementations
│   ├── notification-hook.js    # Smart notification processor
│   ├── stop-hook.cjs           # Session end handler
│   └── hooks.json              # Hook configuration template
├── lib/                     # Shared utilities
│   ├── shell-executor.js       # Secure command execution (ES)
│   ├── shell-executor.cjs      # Secure command execution (CJS)
│   ├── error-handler.js        # Comprehensive error handling (ES)
│   └── error-handler.cjs       # Comprehensive error handling (CJS)
├── sounds/                  # Audio assets
│   └── cat-meow-1-fx-323465.mp3 # Adorable cat meow sound
├── scripts/                 # Management tools
│   ├── install-hooks.js        # Intelligent installer
│   ├── uninstall-hooks.js      # Clean uninstaller
│   └── test-hooks.js           # Manual testing utility
└── test/                    # Test suite
    ├── unit/                   # Unit tests
    │   ├── shell-executor.test.js  # Shell execution tests
    │   └── error-handler.test.js   # Error handling tests
    └── e2e/                    # End-to-end tests
        └── notification-flow.test.js # Full workflow tests
```

### 📄 Key Files

- **`hooks/notification-hook.js`**: Main notification processor with smart categorization
- **`hooks/stop-hook.cjs`**: Handles Claude Code session termination
- **`lib/shell-executor.js`**: Secure execution of macOS commands
- **`lib/error-handler.js`**: Comprehensive error handling and logging
- **`scripts/install-hooks.js`**: Automatic hook configuration setup
- **`test/`**: Complete test suite with unit and E2E tests

## 🛠️ Development

### 🚀 Quick Start

```bash
# Test hooks with different notification types
node hooks/notification-hook.js "Tests Passed" "All 25 tests completed successfully!"
node hooks/notification-hook.js "Build Failed" "TypeScript compilation errors found"
node hooks/notification-hook.js "Git Push" "Successfully pushed to origin/main"

# Test with JSON input
echo '{"title":"Deploy Complete","message":"Application deployed to production"}' | node hooks/notification-hook.js

# Test stop hook
echo '{"title":"Session Ended","message":"Claude Code session terminated"}' | node hooks/stop-hook.cjs

# Run test suite
npm test
npm run test:unit
npm run test:e2e

# Test with debug mode
CAT_CCNOTIFY_DEBUG=true node hooks/notification-hook.js "Debug Test" "Testing with detailed logging"
```

### 🔊 Adding new sounds

1. **Add audio files** to the `sounds/` directory (supported: .mp3, .wav, .m4a, .aiff, .aac)
2. **Update hook files** to reference new sounds in the `sendEnhancedNotification` function
3. **Test audio playback**: `afplay sounds/your-new-sound.mp3`
4. **Test integration**: `npm test`

### 🎨 Customizing notifications

1. **Modify emoji mappings** in `enhanceNotificationStyle()` function
2. **Add new categories** in `analyzeNotificationContent()` function
3. **Adjust content patterns** to match your workflow
4. **Test changes**: Run notification tests to verify new behavior

## 🗑️ Uninstallation

```bash
# If installed via npm:
cat-ccnotify-uninstall

# If installed locally:
cd /path/to/cat-ccnotify-hook
npm run uninstall-hooks

# Or manually edit ~/.claude/settings.json to remove the notification and stop hook entries
```

This will restore Claude Code to use default notifications.

## 🐾 How it works

### 🔔 Notification Flow

1. **Claude Code triggers a notification** (file saved, command completed, error occurred, etc.)
2. **Hook receives data** via multiple input methods:
   - Environment variables (`CLAUDE_NOTIFICATION`, `NOTIFICATION_TITLE`)
   - JSON data through stdin
   - Plain text through stdin
   - Command line arguments
3. **Content analysis** - AI categorizes the notification (success, error, warning, git, build, etc.)
4. **Enhancement applied**:
   - Appropriate emoji added (✅, ❌, ⚠️, 🏗️, etc.)
   - Content formatting and truncation
   - Context-aware styling
5. **Native macOS notification displayed** using `osascript`
6. **Cat sound plays** using `afplay`

### 🛑 Stop Hook

1. **Claude Code session ends**
2. **Stop hook triggered** with session metadata
3. **Special notification shown**: "🐱 Claude Code - セッション終了: [session info]"
4. **Cat meow plays** to signal session end

### 📊 Smart Input Processing

The hook intelligently handles various input formats:

```json
// JSON format
{"title":"Build Complete","message":"Compilation successful"}

// Plain text
"Tests passed - 25/25 successful"

// Multi-line
"Git Push Failed\nPermission denied to repository"

// Command args
node notification-hook.js "Title" "Message"
```

## 🐛 Debug Mode

For troubleshooting, enable debug mode to see comprehensive logging:

```bash
# Enable debug mode for a single test
CAT_CCNOTIFY_DEBUG=true node hooks/notification-hook.js "Debug Test" "Testing notification"

# Set globally for your session
export CAT_CCNOTIFY_DEBUG=true

# View debug logs
tail -f ~/.claude/cat-ccnotify/notification-hook.log
tail -f ~/.claude/cat-ccnotify/stop-hook.log

# View recent debug activity
tail -20 ~/.claude/cat-ccnotify/notification-hook.log
```

### 🔍 Debug Information Includes

- **Environment Analysis**: All Claude-related environment variables
- **Input Processing**: Raw stdin, JSON parsing, command line arguments  
- **Content Analysis**: How notifications are categorized
- **Enhancement Process**: Emoji addition and message formatting
- **Execution Flow**: Each step of the notification process
- **Error Details**: Comprehensive error reporting and stack traces
- **System Info**: Process arguments, working directory, file paths

### 📊 Example Debug Output

```
=== Debug Information ===
Process arguments: ["node", "/path/to/notification-hook.js", "Tests Passed", "All tests successful"]
Env CLAUDECODE: "1"
Using command line arguments: ["Tests Passed", "All tests successful"]
=== Final Result ===
Title: "Tests Passed"
Message: "All tests successful"
Level: "info"
Analyzed notification type: success
Enhanced notification - Title: "✅ Tests Passed", Message: "All tests successful"
```

## 🔍 Troubleshooting

### 🔇 No sound playing

1. **Check audio file**: `ls sounds/cat-meow-1-fx-323465.mp3`
2. **Test audio manually**: `afplay sounds/cat-meow-1-fx-323465.mp3`
3. **Check macOS sound settings** and volume levels
4. **Verify permissions**: macOS may block audio from scripts

### 📵 No notifications appearing

1. **Check notification permissions**: System Settings → Notifications → Terminal/iTerm
2. **Test manually**: `osascript -e 'display notification "Test" with title "Test"'`
3. **Verify hooks config**: `cat ~/.claude/settings.json | grep -A 20 hooks`
4. **Check Claude Code version**: Ensure you're using a compatible version

### 🚫 Hooks not triggering

1. **Verify installation**: 
   ```bash
   which claude
   cat ~/.claude/settings.json | grep hooks
   ```

2. **Reload hooks**: Type `/hooks` in Claude Code, then press ESC

3. **Enable debug mode**:
   ```bash
   export CAT_CCNOTIFY_DEBUG=true
   # Test a notification to generate logs
   echo '{"title":"Debug","message":"Test"}' | node hooks/notification-hook.js
   # Check logs
   tail -f ~/.claude/cat-ccnotify/notification-hook.log
   ```

4. **Check file permissions**: `ls -la ~/.claude/settings.json`

5. **Verify hook paths**: Ensure the paths in settings.json point to existing files

### 🔧 Common Issues

- **"Command not found"**: Use full paths in settings.json
- **"Permission denied"**: Check file permissions with `chmod +x hooks/*.js`
- **"Module not found"**: Ensure all dependencies are installed
- **Silent failures**: Enable debug mode to see detailed error messages
- **Script opens when clicking notification**: This is a macOS behavior when notifications are sent from scripts

### 📱 Notification Click Behavior

**Issue**: Clicking on notifications may open the script file in your default editor.

**Why this happens**: macOS associates notifications with their source. When sent from a script, clicking the notification opens that script.

**Solutions**:

1. **Ignore the behavior**: The notification functionality works perfectly; you can simply ignore clicking on them.

2. **Install terminal-notifier** (recommended):
   ```bash
   # Install via Homebrew
   brew install terminal-notifier
   
   # The hooks will automatically use it if available
   ```

3. **Change default app for .js files**:
   - Right-click any .js file → "Get Info"
   - Under "Open with", select a different app
   - Click "Change All..."

4. **Disable notification clicking**: 
   - System Settings → Notifications → Script Editor (or Terminal)
   - Turn off "Allow Notifications"
   - This prevents the script from opening but may disable other notifications

**Note**: This is a macOS system behavior, not a bug in cat-ccnotify-hook. The notifications work correctly; the click behavior is just a side effect of how macOS handles script-generated notifications.
   ```bash
   # Enable debug mode
   export CAT_CCNOTIFY_DEBUG=true
   
   # Or set it permanently in your shell profile
   echo 'export CAT_CCNOTIFY_DEBUG=true' >> ~/.zshrc
   
   # View logs (only created when debug mode is enabled)
   tail -f ~/.claude/cat-ccnotify/notification-hook.log
   tail -f ~/.claude/cat-ccnotify/stop-hook.log
   
   # View all cat-ccnotify logs
   tail -f ~/.claude/cat-ccnotify/*.log
   ```

## 📝 Requirements

- **macOS** (uses `afplay` and `osascript`)
- **Node.js** 16+
- **Claude Code CLI** installed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Credits

- Cat sound effects from freesound.org
- Built for the Claude Code CLI by Anthropic
- Inspired by the need for more delightful notifications

---

Made with 💝 and 🐱 for Claude Code users who love cats!