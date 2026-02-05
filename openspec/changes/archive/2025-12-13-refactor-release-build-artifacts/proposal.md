# Change: Refactor release build artifacts (Desktop/Electron) and specify requirements

## Why

- The desktop build is “Electron + bundled Next.js standalone server”. That makes **resource layout** critical: runtime code expects `public/data` and `public/record-sheets` to be reachable via the Next server as `/data/*` and `/record-sheets/*`.
- Current `electron-builder.yml` copies `public/data` and `public/record-sheets` to top-level `resources/` folders, but server-side loaders resolve paths using `process.cwd()/public/...` (see `src/services/equipment/EquipmentLoaderService.ts`). This mismatch risks broken equipment loading and record sheet rendering in packaged builds.
- Current `electron-builder.yml` `files:` includes `node_modules/**/*` from `desktop/`, which can unintentionally ship **devDependencies** (e.g., `electron`, `electron-builder`) and dramatically inflate installer size.
- Desktop `tsconfig.json` emits `sourceMap`, `declaration`, and `declarationMap`, which are useful for development but typically unnecessary in release artifacts.
- Packaged desktop builds likely need an explicit writable SQLite location. API routes initialize SQLite with default `./data/mekstation.db` (see `src/services/persistence/SQLiteService.ts`), which may be **unwritable** in installed locations (e.g., `Program Files`) unless `DATABASE_PATH` is set.
- GitHub Releases become hard to navigate when auto-update metadata (`latest*.yml`) and `*.blockmap` files are uploaded alongside installers. For a clean “installer-only” Release list, update metadata should be hosted separately (e.g., GitHub Pages) and referenced by the app via a generic update feed.

## What Changes

- Add a new capability spec delta: `release-build-system` describing:
  - How release builds are produced
  - Required artifact contents and layout (especially Next standalone + `public/`)
  - Required runtime configuration (e.g., `DATABASE_PATH` for desktop packaged mode)
  - Exclusions to keep artifacts lean (dev-only deps, maps, caches)
- Propose a refactor plan to:
  - Align Electron extra resources with the same Next standalone deployment pattern used in `Dockerfile`
  - Remove redundant/duplicate packaged resources
  - Prevent shipping devDependencies from `desktop/node_modules`
  - Optionally omit `.map` / `.d.ts` artifacts from packaged builds by default
  - Keep GitHub Releases installer/package only by:
    - Hosting update metadata on GitHub Pages (generic provider)
    - Disabling differential downloads to avoid requiring `*.blockmap` in the update feed
    - Publishing installers/packages to Releases via CLI without uploading `latest*.yml`

## Impact

- **Affected specs**:
  - New: `release-build-system` (added via this change)
  - References: `desktop-experience`, `persistence-services`, `data-loading-architecture`, `record-sheet-export`
- **Affected implementation (in apply stage)**:
  - `electron-builder.yml` (resource layout + inclusions/exclusions)
  - `desktop/electron/main.ts` (pass `DATABASE_PATH` to Next server, ensure per-user writable storage)
  - `desktop/scripts/release/*` (CLI scripts for GitHub Pages update metadata + installer-only Releases)
  - Potentially `desktop/tsconfig.json` or electron-builder exclusions for maps/declarations

## Out of Scope (for this change)

- Signing/notarization and CI/CD automation (can be layered later once requirements are settled).
- Changes to BattleTech construction rule implementations (no construction logic changes planned).
