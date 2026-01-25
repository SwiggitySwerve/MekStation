# Change: Externalize mm-data Assets from Repository

## Why

MekStation currently embeds ~530 SVG assets (19MB) from the MegaMek mm-data repository directly in `public/record-sheets/`. These assets are licensed under CC-BY-NC-SA-4.0, which requires proper attribution and share-alike terms. While we have correct licensing files, bundling these assets directly creates:

1. **Licensing ambiguity**: Assets mixed with Apache 2.0 code in the same distribution
2. **Repository bloat**: 19MB of binary SVGs in git history
3. **Update friction**: Manual sync script required to update assets
4. **Attribution complexity**: Harder to maintain clear provenance when assets are copied

## What Changes

- **BREAKING**: Remove embedded mm-data assets from `public/record-sheets/`
- Add runtime asset fetching from external mm-data distribution
- Support multiple distribution sources (CDN, npm package, local development)
- Update build/CI to fetch assets at build time for production builds
- Maintain development workflow with local mm-data sibling repo

## Distribution Strategy

**Approach**: Use jsDelivr CDN to serve assets directly from the upstream mm-data GitHub repository.

- jsDelivr automatically mirrors GitHub repos and provides CDN caching
- No changes required to mm-data repository
- URL pattern: `cdn.jsdelivr.net/gh/MegaMek/mm-data@{tag}/data/images/recordsheets/...`
- Pin to latest stable mm-data release tag
- Fallback to GitHub raw URLs if CDN unavailable

## Impact

- **Affected specs**: `mm-data-asset-integration`
- **Affected code**:
  - `src/services/assets/MmDataAssetService.ts` - Update asset loading paths
  - `scripts/sync-mm-data-assets.sh` - Replace with build-time fetch
  - `public/record-sheets/` - Remove embedded assets
  - Build configuration - Add asset fetch step
- **Desktop app**: Must bundle assets at build time (no runtime fetch)
- **Web app**: Can use runtime fetch with caching
