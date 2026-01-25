# Tasks: Externalize mm-data Assets

## 1. Configuration

- [x] 1.1 Determine latest stable mm-data release tag to pin (v0.3.1)
- [x] 1.2 Create `config/mm-data-assets.json` with version and asset list
  - List all required asset paths (templates, pips)
  - Include mm-data version/tag to fetch

## 2. Asset Fetching Infrastructure

- [x] 2.1 Create `scripts/mm-data/fetch-assets.ts` script
  - Download from jsDelivr CDN: `cdn.jsdelivr.net/gh/MegaMek/mm-data@{tag}/...`
  - Fallback to GitHub raw if CDN unavailable
  - Download to `public/record-sheets/` (git-ignored)
  - Support `--version` flag to override configured version
- [x] 2.2 Add npm scripts: `fetch:assets`, `fetch:assets:local`, `fetch:assets:force`
- [x] 2.3 Create `scripts/mm-data/test-cdn-access.ts` to verify CDN accessibility
- [x] 2.4 Document local development workflow (clone mm-data sibling OR fetch)

## 3. Update MmDataAssetService

- [x] 3.1 Add fallback chain for asset loading:
  1. Local bundled path (for desktop/bundled)
  2. jsDelivr CDN
  3. GitHub raw (fallback)
  - Implemented in `MmDataAssetService.loadSVG()` with `buildSourceUrls()` helper
  - Tries sources sequentially until one succeeds
- [x] 3.2 Add version configuration (env var or config file)
  - `MM_DATA_VERSION` env var takes precedence
  - Falls back to `config/mm-data-assets.json` version
  - Defaults to v0.3.1 if neither available
  - Added `getVersion()` and `loadConfig()` methods
- [x] 3.3 Add error handling with user-friendly messages for missing assets
  - Created `AssetLoadError` class extending `ServiceError`
  - Includes asset path, attempted sources, and per-source errors
  - Message includes recovery instruction: `npm run fetch:assets`
- [x] 3.4 Add integration tests for asset loading and record sheet generation
  - Created `src/__tests__/integration/mm-data-assets.integration.test.ts` (37 tests)
  - Tests cover: config validation, template validity, pip SVG existence, path generation, data extraction
  - Updated unit tests in `MmDataAssetService.test.ts` (67 tests) for fallback chain

## 4. Build Pipeline Updates

- [x] 4.1 Update `package.json` postinstall to optionally fetch assets
  - Added `postinstall` script that runs `scripts/mm-data/check-assets.js`
  - Script is non-blocking (uses `|| true`) - never fails npm install
  - Shows helpful message if assets are missing
- [x] 4.2 Update GitHub Actions CI to fetch assets before build
  - Updated `setup-node-and-install` action with `fetch-assets` input and mm-data cache
  - Updated `pr-checks.yml` to fetch and validate assets before build
  - Updated `release.yml` to fetch, validate, and include assets in artifacts
  - Assets are cached by config hash for fast subsequent runs
- [x] 4.3 Update Electron build scripts to bundle fetched assets
  - Assets are already bundled via existing `afterPack.js` hook (copies public/ to resources)
  - Updated artifact uploads to include `public/record-sheets/`
  - Added verification step to check assets exist in build artifacts
- [x] 4.4 Add build validation: fail if required assets missing
  - Created `scripts/mm-data/validate-assets.ts` with `--strict` flag
  - Added `npm run validate:assets` and `npm run validate:assets:strict` scripts
  - CI uses strict mode to fail builds when assets are missing

## 5. Remove Embedded Assets

- [x] 5.1 Add to `.gitignore`:
  ```
  # mm-data assets (fetched at build time from jsDelivr CDN)
  public/record-sheets/biped_pips/
  public/record-sheets/quad_pips/
  public/record-sheets/templates_us/
  public/record-sheets/templates_iso/
  public/record-sheets/templates/
  public/record-sheets/mm-data-version.json
  ```
- [x] 5.2 Remove `scripts/sync-mm-data-assets.sh` (replaced by fetch script)
- [x] 5.3 Remove embedded SVG files from git tracking (530+ files)
- [x] 5.4 Keep `mm-data-version.json` format for tracking fetched version

## 6. Documentation

- [x] 6.1 Update README with new asset workflow
- [x] 6.2 Update `docs/development/getting-started.md` with fetch instructions
- [x] 6.3 Add troubleshooting section for asset loading failures
- [x] 6.4 Document version pinning and update process

## 7. Validation

- [x] 7.1 Test web app: assets load correctly via local fetch (verified 200 OK responses)
- [ ] 7.2 Test desktop app: assets bundled correctly, work offline
- [ ] 7.3 Test development workflow: local mm-data still works
- [ ] 7.4 Test fresh clone: assets fetch automatically on install
- [x] 7.5 Verify record sheet export still works with all templates
  - Verified: Biped, Quad (Scorpion SCP-1N), Tripod record sheets render correctly
  - PDF export tested and working

---

## VALIDATION CHECKLIST (Manual Tests Required)

Before archiving this change, verify the following:

### 7.2 Desktop App (if applicable)
```bash
# Build electron app
npm run electron:build

# Verify assets are bundled
# Check: resources/public/record-sheets/ contains templates and pips

# Test offline: disconnect network, open app, load a unit, check Preview tab
```
- [ ] Assets exist in bundled app
- [ ] Record sheet preview works offline

### 7.3 Local mm-data Development
```bash
# Clone mm-data as sibling (for developers who modify assets)
cd ..
git clone https://github.com/MegaMek/mm-data.git

# Back to MekStation, start dev server
cd MekStation
npm run dev

# Verify: record sheet preview loads assets from local mm-data
```
- [ ] Local mm-data assets take precedence over fetched

### 7.4 Fresh Clone
```bash
# Simulate fresh clone
rm -rf node_modules public/record-sheets
npm install

# Check: postinstall shows asset status message
# Run: npm run fetch:assets
# Verify: assets downloaded to public/record-sheets/
```
- [ ] Postinstall shows helpful message about assets
- [ ] `npm run fetch:assets` downloads all required assets
- [ ] Record sheet preview works after fetch

---

## Dependencies

- Tasks 1-2 (config + fetch script) ✅ COMPLETE
- Task 3 depends on Task 2 (needs fetch mechanism) - ✅ COMPLETE
- Task 5 must be done AFTER Tasks 2-4 are validated - ✅ COMPLETE
- Task 7 validates the entire change before merge - PARTIAL

## Notes

- Assets verified accessible via jsDelivr CDN (524 files tested)
- Integration tests added for comprehensive asset validation
- Pre-existing bug: Record sheet canvas rendering not working (unrelated to asset externalization)


