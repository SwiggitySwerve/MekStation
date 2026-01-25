# Troubleshooting

Solutions for common issues when developing the MekStation.

## Build Issues

### Build Failing

```bash
# Check for TypeScript errors
npx tsc --noEmit

# Check for linting errors
npm run lint

# Clear cache and rebuild
rm -rf .next node_modules/.cache
npm run build
```

### Type Errors

**Problem**: Type mismatch errors

**Solution**: 
1. Check imports are from `@/types/core` or `@/types/enums`
2. Use type guards instead of `as any` casts
3. Verify interface definitions match usage

```typescript
// Instead of:
const value = (config as any).property; // ❌

// Use:
if ('property' in config) {
  const value = config.property; // ✅
}
```

## Development Server

### Port Already in Use

```bash
# Find and kill the process
npx kill-port 3000

# Or use a different port
npm run dev -- -p 3001
```

### Hot Reload Not Working

1. Check for syntax errors in console
2. Try hard refresh: `Ctrl+Shift+R`
3. Restart dev server: `npm run dev`

## Common Errors

### "Cannot find module"

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### "Maximum update depth exceeded"

**Problem**: Infinite re-render loop

**Solution**: Check `useEffect` dependencies and ensure state updates don't trigger the same effect.

```typescript
// ❌ Bad - missing dependency causes stale closure
useEffect(() => {
  fetchData(id);
}, []); 

// ✅ Good - all dependencies listed
useEffect(() => {
  fetchData(id);
}, [id]);
```

### Performance Issues

**Problem**: Slow rendering

**Solutions**:
1. Use `React.memo` for pure components
2. Use `useMemo` for expensive calculations
3. Check for unnecessary re-renders with React DevTools

## OpenSpec Issues

### Validation Failing

```bash
# Check for issues
npx openspec validate <change-id> --strict

# Debug delta parsing
npx openspec show <change-id> --json --deltas-only
```

### Scenario Format Errors

Ensure scenarios use `#### Scenario:` format (4 hashtags):

```markdown
#### Scenario: User login success
- **WHEN** valid credentials provided
- **THEN** return JWT token
```

## mm-data Asset Issues

### Assets Not Loading / Missing Record Sheet Templates

**Problem**: Record sheet export fails or armor pips don't render.

**Solution**: Fetch the assets from CDN:
```bash
npm run fetch:assets
```

If assets still missing, force re-download:
```bash
npm run fetch:assets:force
```

Verify assets exist:
```bash
ls public/record-sheets/templates_us/
ls public/record-sheets/biped_pips/
```

### CDN Unavailable / Network Errors

**Problem**: `fetch:assets` fails with network errors.

**Solutions**:

1. **Check CDN status**: Visit https://www.jsdelivr.com/status
2. **Use GitHub raw fallback**: The fetch script automatically falls back to GitHub raw URLs
3. **Use local repository**:
   ```bash
   # Clone mm-data as sibling
   git clone https://github.com/MegaMek/mm-data.git ../mm-data
   
   # Use local copy
   npm run fetch:assets:local
   ```

### Offline Development

**Problem**: Need to work without internet access.

**Solution**: Assets are cached locally after first fetch. For fully offline setup:

1. Run `npm run fetch:assets` while online
2. Assets are stored in `public/record-sheets/` (persists across npm installs)
3. For desktop app, assets are bundled in the build

**Tip**: Keep `public/record-sheets/mm-data-version.json` to track which version is cached.

### Version Mismatch / Stale Assets

**Problem**: Assets don't match expected version or seem outdated.

**Solution**:
```bash
# Check current version
cat public/record-sheets/mm-data-version.json

# Force re-download configured version
npm run fetch:assets:force

# Or update to a new version
# 1. Edit config/mm-data-assets.json
# 2. Run: npm run fetch:assets:force
```

### Asset Fetch Script Errors

**Problem**: `fetch:assets` script crashes or shows errors.

**Debugging**:
```bash
# Test CDN accessibility
npm run test:cdn-access

# Run with dry-run to see what would be downloaded
npx tsx scripts/mm-data/fetch-assets.ts --dry-run

# Check config file
cat config/mm-data-assets.json
```

## Getting Help

1. Check OpenSpec specs for domain rules: `npx openspec list --specs`
2. Review `.cursorrules` for project conventions
3. Search existing code for similar patterns
4. Open a GitHub issue with reproduction steps

