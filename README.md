# 🐱 cat-ccnotify-hook

Enhanced Claude Code notification hooks with adorable cat sounds and better styling for macOS.

## ✨ Features

- 🐱 **Adorable cat meow** for all notifications
- 🎨 **Enhanced styling** with emojis and better formatting
- 🧠 **Intelligent categorization** of notifications (success, error, warning, etc.)
- 🛑 **Special stop notifications** with the same adorable cat meow
- 🍎 **macOS optimized** using native notification system

## 📦 Installation

### Via npm (recommended)

```bash
npm install -g cat-ccnotify-hook
cat-ccnotify-install
```

### Manual installation

1. Clone or download this package
2. Run the installer:
   ```bash
   node scripts/install-hooks.js
   ```

## 🧪 Testing

Test your installation to make sure everything works:

```bash
# Via npm command
cat-ccnotify-test

# Or manually
node scripts/test-hooks.js
```

You should see notifications with cat sounds! 🎵

## 🎵 Sound System

All notifications play the same adorable cat meow sound! 🐱

The hook still intelligently categorizes notifications for styling:

- ✅ **Success**: Completions, passed tests, successful builds  
- ❌ **Error**: Failed operations, crashes, exceptions
- ⚠️ **Warning**: Attention needed, cautions
- 💡 **Info**: General information, status updates
- ⏳ **Progress**: Ongoing operations, processing
- 🐱 **Stop**: Special session ending notifications

**Note**: Currently all categories use the same cat sound. Future versions may include category-specific sounds!

## 🔧 Configuration

The hooks are automatically configured in `~/.claude/hooks.json`. You can view the current configuration:

```bash
cat ~/.claude/hooks.json
```

## 📁 Project Structure

```
cat-ccnotify-hook/
├── package.json          # Package configuration
├── README.md            # This file
├── hooks/               # Hook implementations
│   ├── notification-hook.js   # Enhanced notification hook
│   └── stop-hook.cjs         # Stop session hook
├── sounds/              # Audio files
│   └── cat-meow-1-fx-323465.mp3
└── scripts/             # Installation scripts
    ├── install-hooks.js      # Installer
    ├── uninstall-hooks.js    # Uninstaller
    └── test-hooks.js         # Tester
```

## 🛠️ Development

### Running locally

```bash
# Test hooks directly
node hooks/notification-hook.js
echo '{"title":"Test","message":"Hello"}' | node hooks/stop-hook.cjs

# Test installation
node scripts/install-hooks.js
node scripts/test-hooks.js
```

### Adding new sounds

1. Add audio files to the `sounds/` directory
2. Update hook files to reference new sounds
3. Test with `node scripts/test-hooks.js`

## 🗑️ Uninstallation

```bash
# Via npm command
cat-ccnotify-uninstall

# Or manually
node scripts/uninstall-hooks.js
```

This will restore Claude Code to use default notifications.

## 🐾 How it works

### Notification Flow

1. Claude Code triggers a notification
2. The hook intercepts the notification data
3. Enhanced styling is applied (emojis, formatting)
4. Native macOS notification is displayed
5. Cat sound plays after the notification

### Stop Hook

1. Claude Code session ends
2. Stop hook receives the session data
3. Special "session ended" notification is shown
4. Cute cat meow plays

## 🐛 Debug Mode

For troubleshooting, you can enable debug mode to see detailed logs:

```bash
# Enable debug mode
export CAT_CCNOTIFY_DEBUG=true

# Test with debug mode
cat-ccnotify-test

# View debug logs
ls ~/.claude/cat-ccnotify/
tail -f ~/.claude/cat-ccnotify/*.log
```

Debug logs include:
- Notification data received
- Sound playback status
- Error messages
- Hook execution flow

## 🔍 Troubleshooting

### No sound playing

1. Check audio file exists: `ls cat-ccnotify-hook/sounds/`
2. Test audio manually: `afplay cat-ccnotify-hook/sounds/cat-meow-1-fx-323465.mp3`
3. Check macOS sound settings

### No notifications appearing

1. Check macOS notification permissions for Terminal/iTerm
2. Test notifications manually: `osascript -e 'display notification "Test" with title "Test"'`
3. Check hooks configuration: `cat ~/.claude/hooks.json`

### Hook not triggering

1. Verify Claude Code installation: `which claude`
2. Check hook file permissions: `ls -la ~/.claude/hooks.json`
3. Enable debug mode and check logs:
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