# Installation Guide for cat-ccnotify-hook

## Current Installation Methods

### Method 1: Local Installation (Recommended)

This method clones the repository and runs the hooks from your local copy.

```bash
# 1. Clone the repository
git clone https://github.com/your-username/cat-ccnotify-hook.git
cd cat-ccnotify-hook

# 2. Install dependencies (for testing)
npm install

# 3. Run the installer
npm run install-hooks
```

The installer will:
- Check that you're on macOS
- Verify Claude Code CLI is installed
- Create `~/.claude` directory if needed
- Update `~/.claude/hooks.json` to point to the hook files in your cloned repository

### Method 2: Manual Installation

If you prefer to manually set up the hooks:

1. Clone or download this repository
2. Note the absolute path to the repository (e.g., `/Users/yourname/projects/cat-ccnotify-hook`)
3. Create or edit `~/.claude/hooks.json`:

```json
{
  "notification": "/Users/yourname/projects/cat-ccnotify-hook/hooks/notification-hook.js",
  "stop": "/Users/yourname/projects/cat-ccnotify-hook/hooks/stop-hook.cjs"
}
```

## Verifying Installation

After installation, test that everything works:

```bash
# Test the cat-notify command
./bin/cat-notify

# Test hooks via npm script
npm run test:hooks

# Or test manually
echo '{"title":"Test","message":"Hello Cat!"}' | node hooks/notification-hook.js
```

## Important Notes

1. **Absolute Paths Required**: The hooks.json file must contain absolute paths to the hook scripts, not relative paths.

2. **Repository Location**: Keep the cloned repository in a stable location. Moving or deleting it will break the hooks.

3. **npm Global Installation**: The `npm install -g` method mentioned in some places is not yet available as this package hasn't been published to npm.

## Troubleshooting

### "command not found: cat-notify"

The `cat-notify` command is only available when:
- You're in the repository directory and use `./bin/cat-notify`
- OR the package is installed globally via npm (not yet available)

### Hooks not triggering

1. Check `~/.claude/hooks.json` exists and has correct paths:
   ```bash
   cat ~/.claude/hooks.json
   ```

2. Verify the paths point to existing files:
   ```bash
   ls -la $(jq -r '.notification' ~/.claude/hooks.json)
   ls -la $(jq -r '.stop' ~/.claude/hooks.json)
   ```

3. Enable debug mode:
   ```bash
   export CAT_CCNOTIFY_DEBUG=true
   ```

## Future npm Installation

Once this package is published to npm, installation will be simpler:

```bash
# Future method (not yet available)
npm install -g cat-ccnotify-hook
cat-ccnotify-install
```

This will:
- Install the package globally
- Copy hook files to a stable location
- Automatically configure ~/.claude/hooks.json
- Make `cat-notify` available system-wide