# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-01-07

### Changed
- **BREAKING**: Migrated from `hooks.json` to `settings.json` format for Claude Code hooks
- Updated notification hook to receive data via `$CLAUDE_NOTIFICATION` environment variable
- Improved error handling with custom error classes and detailed logging
- Enhanced security by replacing `exec` with `execFile` for shell commands

### Added
- Comprehensive test suite with Jest (unit and E2E tests)
- Detailed error reporting and recovery strategies
- Input sanitization for notification content
- Support for global npm installation
- Publishing documentation (PUBLISHING.md)
- Installation guide (INSTALL.md)

### Fixed
- Shell command injection vulnerabilities
- Proper handling of missing sound files
- Better fallback when notifications fail

### Security
- Implemented proper shell escaping for AppleScript
- Added file extension validation for audio files
- Sanitized user input to prevent control character injection

## [0.1.0] - 2025-01-06

### Added
- Initial release
- Cat meow sound for all notifications
- Enhanced notification styling with emojis
- Intelligent notification categorization
- Special stop session notifications
- macOS native notification support
- Debug mode for troubleshooting