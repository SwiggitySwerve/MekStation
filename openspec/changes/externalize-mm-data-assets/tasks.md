# Tasks: Externalize mm-data Assets

## 1. Configuration

- [ ] 1.1 Determine latest stable mm-data release tag to pin
- [ ] 1.2 Create `config/mm-data-assets.json` with version and asset list
  - List all required asset paths (templates, pips)
  - Include mm-data version/tag to fetch

## 2. Asset Fetching Infrastructure

- [ ] 2.1 Create `scripts/fetch-mm-assets.ts` script
  - Download from jsDelivr CDN: `cdn.jsdelivr.net/gh/MegaMek/mm-data@{tag}/...`
  - Fallback to GitHub raw if CDN unavailable
  - Download to `public/record-sheets/` (git-ignored)
  - Support `--version` flag to override configured version
- [ ] 2.2 Add npm script: `"fetch:assets": "tsx scripts/fetch-mm-assets.ts"`
- [ ] 2.3 Document local development workflow (clone mm-data sibling OR fetch)

## 3. Update MmDataAssetService

- [ ] 3.1 Add fallback chain for asset loading:
  1. Local bundled path (for desktop/bundled)
  2. jsDelivr CDN
  3. GitHub raw (fallback)
- [ ] 3.2 Add version configuration (env var or config file)
- [ ] 3.3 Add error handling with user-friendly messages for missing assets
- [ ] 3.4 Update tests to mock external fetches

## 4. Build Pipeline Updates

- [ ] 4.1 Update `package.json` postinstall to optionally fetch assets
- [ ] 4.2 Update GitHub Actions CI to fetch assets before build
- [ ] 4.3 Update Electron build scripts to bundle fetched assets
- [ ] 4.4 Add build validation: fail if required assets missing

## 5. Remove Embedded Assets

- [ ] 5.1 Add to `.gitignore`:
  ```
  # mm-data assets (fetched at build time)
  public/record-sheets/biped_pips/
  public/record-sheets/quad_pips/
  public/record-sheets/templates_us/
  public/record-sheets/templates_iso/
  public/record-sheets/templates/
  ```
- [ ] 5.2 Remove `scripts/sync-mm-data-assets.sh` (replaced by fetch script)
- [ ] 5.3 Remove embedded SVG files from git (careful: large commit)
- [ ] 5.4 Keep `mm-data-version.json` format for tracking fetched version

## 6. Documentation

- [ ] 6.1 Update README with new asset workflow
- [ ] 6.2 Update `docs/development/getting-started.md` with fetch instructions
- [ ] 6.3 Add troubleshooting section for asset loading failures
- [ ] 6.4 Document version pinning and update process

## 7. Validation

- [ ] 7.1 Test web app: assets load correctly via CDN
- [ ] 7.2 Test desktop app: assets bundled correctly, work offline
- [ ] 7.3 Test development workflow: local mm-data still works
- [ ] 7.4 Test fresh clone: assets fetch automatically on install
- [ ] 7.5 Verify record sheet export still works with all templates

## Dependencies

- Tasks 1-2 (config + fetch script) must complete first
- Task 3 depends on Task 2 (needs fetch mechanism)
- Task 5 must be done AFTER Tasks 2-4 are validated
- Task 7 validates the entire change before merge
