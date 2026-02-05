## Context

MekStation desktop releases bundle:

- **Electron main/preload** (`desktop/dist/**/*`)
- A **Next.js standalone server** built from the root Next app (`.next/standalone` + `.next/static`)
- Static runtime assets served by Next from `public/` (notably `public/data` and `public/record-sheets`)

This is a proven deployment model (also used by `Dockerfile`), but it is sensitive to **folder layout** and **writable runtime paths**.

## Goals

- Define an explicit, testable specification for how release builds are produced and what they contain.
- Align Electron packaging layout with Next standalone runtime expectations (same pattern as Docker).
- Reduce release artifact size by excluding dev-only dependencies and non-runtime build outputs.
- Ensure desktop packaged mode uses a per-user writable SQLite database path.
- Keep GitHub Releases **installer/package only** (clean asset list) while still supporting auto-updates.

## Non-Goals

- Adding CI/CD workflows (GitHub Actions, signing pipelines).
- Changing BattleTech construction rules or validation behavior.
- Re-architecting desktop to avoid a bundled Next server (keep the current model).

## Key Observations (current implementation)

- Next builds with `output: "standalone"` (`next.config.ts`).
- Electron production mode spawns `server.js` from `resources/next-standalone` (`desktop/electron/main.ts`).
- Server-side data loaders resolve paths from `process.cwd()/public/...` (e.g., `src/services/equipment/EquipmentLoaderService.ts`).
- Record sheet renderer fetches templates/pips via `/record-sheets/...` paths (e.g., `src/services/printing/*`).
- SQLite defaults to `./data/mekstation.db` unless `DATABASE_PATH` is set (`src/services/persistence/SQLiteService.ts`).
- Current electron-builder config:
  - Includes `desktop/node_modules/**/*` broadly (risk: devDependencies shipped)
  - Copies `public/data` and `public/record-sheets` into top-level resource folders rather than `next-standalone/public/...`
- electron-updater (GitHub provider) expects update metadata files (e.g., `latest*.yml`) to be present in GitHub Release assets, which can clutter releases.

## Decisions

- **D1: Canonical resource layout**
  - Adopt the same layout used in `Dockerfile`:
    - `next-standalone/server.js`
    - `next-standalone/.next/static`
    - `next-standalone/public/**` (including `data/` and `record-sheets/`)
  - This aligns with `process.cwd()/public/...` expectations in server-side loaders and with HTTP fetch paths in the renderer.

- **D2: Writable persistence paths in desktop packaged mode**
  - Desktop packaged mode MUST set `DATABASE_PATH` for the spawned Next server process to a per-user writable location (Electron `userData`).
  - Avoid writing under `process.resourcesPath` to prevent failures on installed builds (common on Windows/macOS).

- **D3: Keep artifacts lean**
  - Do not ship `desktop` devDependencies in release artifacts.
  - Prefer electron-builder’s production dependency packaging rather than explicit `node_modules/**/*` inclusion.
  - Exclude source maps and `.d.ts` outputs from packaged artifacts by default (optional: debug builds can include them).

- **D4: Installer-only GitHub Releases + GitHub Pages update feed**
  - Configure the desktop app to use a **generic** update provider pointed at a static feed hosted on GitHub Pages (`MEKSTATION_UPDATE_FEED_BASE_URL`).
  - Publish **channel metadata (`latest*.yml`)** to GitHub Pages, with URLs rewritten to point at GitHub Release download URLs for installers/packages.
  - Disable differential downloads for NSIS so `*.blockmap` files are not required in the update feed.

## Risks / Trade-offs

- Tightening `files` patterns can break runtime if a needed dependency is accidentally excluded.
  - Mitigation: smoke tests + `desktop/scripts/test-build.js` + explicit allowlist of required runtime deps.
- Moving `public/` under `next-standalone/public` changes packaged paths; any custom code reading `process.resourcesPath/data` would need updates.
  - Mitigation: search for `process.resourcesPath` usages and validate data loading paths.
- Disabling differential downloads increases update bandwidth (full installer download).
  - Mitigation: keep installer sizes reasonable; consider re-enabling differential downloads later if GitHub Releases clutter is acceptable or if an alternate update host is used.

## Migration Plan (implementation stage)

1. Update electron-builder `extraResources` to place `public/` under `next-standalone/public`.
2. Update `electron-builder.yml` `files` patterns to avoid shipping devDependencies and exclude debug artifacts.
3. Update Electron main process to pass `DATABASE_PATH` to the Next server spawn environment (and ensure directory exists).
4. Update desktop auto-updater to use GitHub Pages feed (generic provider) and disable differential downloads for NSIS.
5. Add CLI scripts to:
   - Upload **installers/packages only** to GitHub Releases (exclude `latest*.yml` / `*.blockmap`)
   - Publish update metadata to `gh-pages` under `updates/` without clobbering other platforms
6. Validate via pack-mode build and runtime smoke tests.

## Open Questions

- Should we support signed builds as an optional path (env-gated) or keep signing fully disabled until CI exists?
- Should the portable build use a “next to executable” data folder (portable UX) or still use per-user `userData`?
- Do we want to publish/unpublish unpacked directories (`*-unpacked`) in CI once workflows exist?
