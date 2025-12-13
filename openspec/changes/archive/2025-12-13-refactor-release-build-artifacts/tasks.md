## 1. Validate current behavior (baseline)
- [x] 1.1 Document the current build entrypoints:
  - Root: `npm run electron:build`, `npm run electron:pack`, `npm run electron:dist:*`
  - Desktop: `npm run build`, `npm run pack`, `npm run dist:*`, `npm run test:build`
- [x] 1.2 Confirm runtime expectations for bundled assets:
  - Equipment JSON loads from `/data/equipment/official/*`
  - Canonical units load from `/data/units/*`
  - Record sheet templates/pips load from `/record-sheets/*`
- [x] 1.3 Confirm persistence expectations:
  - Next API routes initialize SQLite via `getSQLiteService().initialize()`
  - Desktop packaged builds need a writable `DATABASE_PATH` (not under `process.resourcesPath`)

## 2. Refactor Electron packaging layout (implementation stage)
- [x] 2.1 Align packaged Next standalone layout with the Docker deployment pattern:
  - Package `.next/standalone` as `resources/next-standalone/`
  - Package `.next/static` as `resources/next-standalone/.next/static`
  - Package `public/` as `resources/next-standalone/public/` (includes `data/` and `record-sheets/`)
- [x] 2.2 Remove/avoid redundant packaged resources:
  - Ensure `desktop/assets/` is not duplicated between `files` and `extraResources` (choose one)
- [x] 2.3 Prevent shipping desktop devDependencies:
  - Replace broad `files: ["node_modules/**/*"]` style inclusion with production-only packaging
  - Explicitly exclude known dev-only paths (e.g., `electron-builder`, test files, caches)
- [x] 2.4 Reduce release artifact size (optional, gated):
  - Exclude `dist/**/*.map`, `dist/**/*.d.ts`, `dist/**/*.d.ts.map` from packaged artifacts by default
  - Optionally keep maps only for debug/nightly builds

## 3. Desktop runtime data path correctness (implementation stage)
- [x] 3.1 Set `DATABASE_PATH` for the bundled Next server process to a per-user writable location:
  - Example: `app.getPath('userData')/data/mekstation.db`
- [x] 3.2 Ensure the directory exists before starting the server
- [x] 3.3 Verify custom unit CRUD + versioning works in packaged mode

## 4. Verification and regression checks
- [x] 4.1 `desktop/scripts/test-build.js` succeeds on the current OS (pack mode)
- [x] 4.2 Smoke test in packaged mode:
  - Equipment loads successfully
  - Record sheet preview renders (templates + pips load)
  - Custom units API works (SQLite is writable and persists)
- [x] 4.3 Confirm update metadata can be generated and hosted separately (GitHub Pages) while GitHub Releases remain installer-only

## 5. Clean GitHub Releases + GitHub Pages update feed (implementation stage)
- [x] 5.1 Configure desktop auto-updater to use a generic update feed (`MEKSTATION_UPDATE_FEED_BASE_URL`) and disable NSIS differential downloads
- [x] 5.2 Add CLI scripts to generate update channel files for GitHub Pages from electron-builder output (rewrite URLs to GitHub Release downloads)
- [x] 5.3 Add CLI script to publish update metadata to the `gh-pages` branch without clobbering other platforms
- [x] 5.4 Add CLI script to upload GitHub Release assets excluding `latest*.yml` and `*.blockmap`


