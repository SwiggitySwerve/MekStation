## MODIFIED Requirements

### Requirement: MmData Asset Service

The system SHALL provide a service for loading and caching assets from mm-data, supporting both local and remote sources with fallback chain.

**Rationale**: Externalized assets require flexible loading from multiple sources with graceful degradation.

**Priority**: Critical

#### Scenario: Asset loading fallback chain
- **GIVEN** the application needs to load an mm-data asset
- **WHEN** `MmDataAssetService.loadSVG(path)` is called
- **THEN** attempt to load from sources in order:
  1. Local bundled path (`/record-sheets/...`)
  2. jsDelivr CDN (`cdn.jsdelivr.net/gh/MegaMek/mm-data@{version}/...`)
  3. GitHub raw (`raw.githubusercontent.com/MegaMek/mm-data/{version}/...`)
- **AND** return content from first successful source
- **AND** cache result for subsequent calls

#### Scenario: Armor pip loading (unchanged API)
- **GIVEN** a MechLocation and armor count
- **WHEN** `MmDataAssetService.getArmorPipSvg(location, count)` is called
- **THEN** return the SVG content for that armor pip configuration
- **AND** file is loaded via fallback chain
- **AND** result is cached for subsequent calls

#### Scenario: Version configuration
- **GIVEN** asset version is configured via `MM_DATA_VERSION` environment variable
- **WHEN** loading assets from remote sources
- **THEN** use configured version in CDN/GitHub URLs
- **AND** default to "main" if not configured

#### Scenario: Offline mode (desktop)
- **GIVEN** the application is running in Electron desktop mode
- **WHEN** loading assets
- **THEN** prefer local bundled assets
- **AND** skip remote fallbacks if running offline

#### Scenario: Loading failure handling
- **GIVEN** all sources fail to load an asset
- **WHEN** `loadSVG()` returns an error
- **THEN** throw descriptive error with asset path and attempted sources
- **AND** log error for debugging

### Requirement: Asset Sync Script

The system SHALL provide a script to fetch assets from mm-data releases at build time.

**Rationale**: Build-time fetching replaces manual sync, ensuring reproducible builds.

**Priority**: High

#### Scenario: Fetch from jsDelivr CDN
- **GIVEN** `MM_DATA_VERSION` is set to a release tag (e.g., "v0.50.07")
- **WHEN** `npm run fetch:assets` is executed
- **THEN** download assets from jsDelivr CDN: `cdn.jsdelivr.net/gh/MegaMek/mm-data@{tag}/...`
- **AND** download all required assets per configuration
- **AND** extract to `public/record-sheets/`
- **AND** write `mm-data-version.json` with fetched version info

#### Scenario: Fallback to GitHub raw
- **GIVEN** jsDelivr CDN is unavailable
- **WHEN** `npm run fetch:assets` is executed
- **THEN** fall back to GitHub raw URLs: `raw.githubusercontent.com/MegaMek/mm-data/{tag}/...`
- **AND** download all required assets

#### Scenario: Development with local mm-data
- **GIVEN** `../mm-data` directory exists (sibling repo)
- **AND** `--prefer-local` flag is passed
- **WHEN** `npm run fetch:assets --prefer-local` is executed
- **THEN** copy assets from local mm-data repo
- **AND** skip remote fetching

#### Scenario: Missing assets error
- **GIVEN** required assets are not present
- **WHEN** `npm run build` is executed
- **THEN** fail build with clear error message
- **AND** provide instructions to run `npm run fetch:assets`

## ADDED Requirements

### Requirement: Asset Configuration

The system SHALL maintain a configuration of required mm-data assets and version.

**Rationale**: Defines which assets to fetch and enables version pinning for reproducible builds.

**Priority**: High

#### Scenario: Configuration structure
- **GIVEN** the asset config file `config/mm-data-assets.json`
- **THEN** it SHALL contain:
  ```json
  {
    "version": "v0.50.07",
    "basePath": "data/images/recordsheets",
    "assets": [
      "templates_us/mek_biped_default.svg",
      "templates_us/mek_quad_default.svg",
      "biped_pips/Armor_CT_1_Humanoid.svg"
    ]
  }
  ```

#### Scenario: Asset validation
- **GIVEN** fetched assets in `public/record-sheets/`
- **WHEN** `npm run validate:assets` is executed
- **THEN** verify each configured file exists
- **AND** report any missing files

### Requirement: Build-Time Asset Bundling

The system SHALL bundle mm-data assets into desktop builds.

**Rationale**: Desktop app must work offline without runtime asset fetching.

**Priority**: Critical

#### Scenario: Electron build includes assets
- **GIVEN** assets have been fetched to `public/record-sheets/`
- **WHEN** `npm run electron:dist:win` is executed
- **THEN** include all record-sheets assets in the app bundle
- **AND** assets are accessible at runtime without network

#### Scenario: Web build asset handling
- **GIVEN** building for web deployment
- **WHEN** `npm run build` is executed
- **THEN** assets are included in the static output
- **OR** configured to load from CDN at runtime (configurable)
