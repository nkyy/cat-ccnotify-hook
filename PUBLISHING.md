# Publishing to npm

This document outlines the steps to publish cat-ccnotify-hook to npm.

## Prerequisites

1. **npm account**: Create an account at https://www.npmjs.com/
2. **Login to npm**: Run `npm login` and enter your credentials
3. **Verify login**: Run `npm whoami` to confirm you're logged in

## Pre-publish Checklist

- [ ] Update version in `package.json` (follow semver)
- [ ] Update CHANGELOG.md with release notes
- [ ] Run tests: `npm test`
- [ ] Build/compile if necessary
- [ ] Review package contents: `npm pack --dry-run`
- [ ] Ensure all necessary files are included
- [ ] Check that sensitive files are excluded (.npmignore)

## Publishing Steps

1. **Bump version** (choose one):
   ```bash
   npm version patch  # 0.1.0 -> 0.1.1
   npm version minor  # 0.1.0 -> 0.2.0
   npm version major  # 0.1.0 -> 1.0.0
   ```

2. **Test the package locally**:
   ```bash
   # Create a tarball
   npm pack
   
   # Test global installation
   npm install -g ./cat-ccnotify-hook-0.1.0.tgz
   cat-ccnotify-install
   cat-ccnotify-test
   cat-ccnotify-uninstall
   ```

3. **Publish to npm**:
   ```bash
   # Dry run first
   npm publish --dry-run
   
   # Actual publish
   npm publish
   ```

4. **Verify publication**:
   - Check https://www.npmjs.com/package/cat-ccnotify-hook
   - Test installation: `npm install -g cat-ccnotify-hook`

## Post-publish

1. **Create git tag**:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

2. **Create GitHub release**:
   - Go to GitHub releases page
   - Create new release from tag
   - Add release notes from CHANGELOG.md

3. **Update documentation**:
   - Ensure README reflects npm installation
   - Update any installation guides

## Troubleshooting

### "npm ERR! 403 Forbidden"
- Ensure you're logged in: `npm login`
- Package name might be taken
- You might not have publish permissions

### "npm ERR! 404 Not Found"
- Check package name in package.json
- Ensure you're publishing to the correct registry

### Files missing from published package
- Check .npmignore file
- Use `files` field in package.json
- Run `npm pack --dry-run` to verify

## Version Management

- **Patch** (0.0.X): Bug fixes, minor updates
- **Minor** (0.X.0): New features, backwards compatible
- **Major** (X.0.0): Breaking changes

## Security Notes

- Never publish with sensitive data
- Review all files before publishing
- Use 2FA on npm account
- Regularly update dependencies