## ADDED Requirements

### Requirement: Desktop release build entrypoints
The system SHALL provide canonical npm scripts to produce desktop release artifacts from the repository root.

#### Scenario: Build desktop installers from repo root
- **GIVEN** the repository dependencies are installed
- **WHEN** the user runs `npm run electron:dist:*` from the repo root
- **THEN** the build process SHALL run a production Next.js build
- **AND** build the Electron TypeScript output under `desktop/dist/`
- **AND** run `electron-builder` to emit platform artifacts into `desktop/release/`

#### Scenario: Pack-mode build for fast validation
- **GIVEN** the repository dependencies are installed
- **WHEN** the user runs `npm run electron:pack`
- **THEN** the build SHALL produce an unpacked application directory suitable for smoke testing
- **AND** SHALL NOT require signing credentials to complete

---

### Requirement: Packaged Next.js standalone server layout
Desktop release artifacts SHALL include a bundled Next.js standalone server with a resource layout compatible with runtime expectations.

#### Scenario: Next.js standalone server is packaged with public assets
- **GIVEN** the Next.js app is built with `output: "standalone"`
- **WHEN** the desktop application is packaged
- **THEN** the packaged resources SHALL include `next-standalone/server.js`
- **AND** SHALL include static assets at `next-standalone/.next/static`
- **AND** SHALL include Next public assets at `next-standalone/public/**`

#### Scenario: Equipment and unit data is accessible in packaged mode
- **GIVEN** the desktop application is running in packaged mode
- **WHEN** the UI requests `/data/equipment/official/weapons/energy.json`
- **THEN** the request SHALL succeed
- **AND** the server-side equipment loader MAY resolve the same data via `process.cwd()/public/data/...`

#### Scenario: Record sheet templates and pips are accessible in packaged mode
- **GIVEN** the desktop application is running in packaged mode
- **WHEN** the UI requests `/record-sheets/templates/mek_biped_default.svg`
- **THEN** the request SHALL succeed
- **AND** subsequent requests for `/record-sheets/biped_pips/*` SHALL succeed

---

### Requirement: Packaged desktop persistence paths
Packaged desktop builds SHALL store SQLite data in a per-user writable location and MUST NOT write application data under the packaged resources directory.

#### Scenario: Database path is configured for packaged desktop mode
- **GIVEN** the desktop application is running in packaged mode
- **WHEN** the Next.js server process is started by the Electron main process
- **THEN** the environment variable `DATABASE_PATH` SHALL be set to a per-user writable file path
- **AND** SQLite initialization SHALL succeed

#### Scenario: Packaged resources are not used as a writable data directory
- **GIVEN** the desktop application is installed to a read-only location (e.g., Program Files)
- **WHEN** a custom unit is created via `/api/units/custom`
- **THEN** the operation SHALL succeed
- **AND** the application SHALL NOT attempt to create or write `./data/*` under the packaged resources directory

---

### Requirement: Release artifact minimization
Desktop release artifacts SHALL minimize size by excluding development-only dependencies, caches, and non-runtime outputs while preserving runtime correctness.

#### Scenario: Dev-only dependencies are not shipped
- **GIVEN** the desktop application is packaged for release
- **WHEN** inspecting packaged application contents
- **THEN** dev-only build tooling (e.g., `electron-builder`) SHALL NOT be included in the shipped application payload

#### Scenario: Debug-only outputs are excluded by default
- **GIVEN** a standard release build
- **WHEN** inspecting packaged application contents
- **THEN** TypeScript declaration files and source maps SHOULD NOT be included by default
- **AND** the application SHALL still start and function without them

---

### Requirement: Clean GitHub Release assets (installer/package only)
The system SHALL keep GitHub Releases installer/package only by excluding auto-update metadata files from Release uploads.

#### Scenario: Release uploads exclude update metadata
- **GIVEN** a desktop release has been built locally
- **WHEN** publishing release assets to GitHub
- **THEN** the upload step SHALL exclude `latest*.yml` and `*.blockmap`
- **AND** the uploaded assets SHALL include only installers/packages intended for end users

---

### Requirement: Static auto-update metadata feed (GitHub Pages)
The system SHALL host electron-updater channel files on a static update feed (e.g., GitHub Pages) and the channel files SHALL reference absolute download URLs for the corresponding GitHub Release assets.

#### Scenario: Windows update channel file location
- **GIVEN** `MEKSTATION_UPDATE_FEED_BASE_URL` is configured
- **WHEN** the Windows desktop app checks for updates on the `latest` channel
- **THEN** it SHALL request `latest.yml` from `<baseUrl>/win/latest.yml`

#### Scenario: Linux update channel file location
- **GIVEN** `MEKSTATION_UPDATE_FEED_BASE_URL` is configured
- **WHEN** the Linux desktop app checks for updates on the `latest` channel
- **THEN** it SHALL request `latest-linux.yml` from `<baseUrl>/linux/latest-linux.yml`

#### Scenario: macOS update channel file location (arch-specific directories)
- **GIVEN** `MEKSTATION_UPDATE_FEED_BASE_URL` is configured
- **WHEN** the macOS desktop app checks for updates on the `latest` channel
- **THEN** it SHALL request `latest-mac.yml` from `<baseUrl>/mac/<arch>/latest-mac.yml`
- **AND** `<arch>` SHALL be `x64` or `arm64`

---

### Requirement: Differential updates are disabled for clean feeds
The system SHALL disable differential download behavior for NSIS-based Windows updates so that blockmap files are not required for auto-update.

#### Scenario: Updater does not fetch blockmaps
- **GIVEN** the desktop app is running on Windows with NSIS updates enabled
- **WHEN** an update is available
- **THEN** the updater SHALL download the full installer package
- **AND** SHALL NOT attempt to download `*.blockmap` files from the update feed


