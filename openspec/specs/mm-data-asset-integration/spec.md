# mm-data-asset-integration Specification

## Purpose

Defines MegaMek Data Asset Integration requirements for MmData Asset Service, Asset Sync Script, Location Bounds Configuration, and Non-Mech Wave-1 Template Registration, preserving the source-of-truth scope introduced by archived change integrate-mm-data-assets.

## Requirements

### Requirement: MmData Asset Service

The system SHALL provide a service for loading and caching assets from
the mm-data distribution, covering mech templates, the Wave-1 non-mech
templates (vehicle / VTOL / aerospace / conventional-fighter /
ProtoMech), the Wave-2 small-unit templates (infantry / battle armor),
the biped armor and structure pips, and any pip directories required
by the registered templates.

**Rationale**: Centralized asset loading enables consistent access to
MegaMek visual assets across components, and the same three-source
fallback chain that serves mech and Wave-1 templates serves the
infantry and battle-armor families.

**Priority**: Critical

#### Scenario: Armor pip loading

- **GIVEN** a MechLocation and armor count
- **WHEN** `MmDataAssetService.getArmorPipSvg(location, count)` is called
- **THEN** return the SVG content for that armor pip configuration
- **AND** file is loaded from `/record-sheets/biped_pips/Armor_{Location}_{Count}_Humanoid.svg`
- **AND** result is cached for subsequent calls

#### Scenario: Rear armor pip loading

- **GIVEN** a torso location (CT, LT, RT) with rear armor
- **WHEN** `MmDataAssetService.getArmorPipSvg(location, count, true)` is called
- **THEN** return the SVG content for rear armor pips
- **AND** file is loaded from `/record-sheets/biped_pips/Armor_{Location}_R_{Count}_Humanoid.svg`

#### Scenario: Internal structure pip loading

- **GIVEN** a tonnage and MechLocation
- **WHEN** `MmDataAssetService.getStructurePipSvg(tonnage, location)` is called
- **THEN** return the SVG content for that structure pip configuration
- **AND** file is loaded from `/record-sheets/biped_pips/BipedIS{Tonnage}_{Location}.svg`
- **AND** tonnage is rounded to nearest standard (20, 25, 30, ..., 100)

#### Scenario: Record sheet template loading

- **GIVEN** a unit configuration and paper size
- **WHEN** the record-sheet template for that unit is requested
- **THEN** return the SVG template document
- **AND** the file is loaded from the appropriate `templates_us` or
  `templates_iso` directory, covering mech, Wave-1 non-mech, and
  Wave-2 infantry / battle-armor template keys

#### Scenario: Non-mech template loading via shared renderer

- **GIVEN** a Wave-1 or Wave-2 non-mech template key resolved by a
  per-family `selectTemplate` adapter
- **WHEN** `TemplateRecordSheetRenderer.loadTemplate(path)` requests
  that template
- **THEN** `MmDataAssetService.loadSVG` SHALL resolve it through the
  three-source fallback chain and the result SHALL be cached

#### Scenario: Location code mapping

- **WHEN** loading mm-data assets
- **THEN** MechLocation enum values SHALL be mapped to mm-data codes:
  - HEAD → "HD"
  - CENTER_TORSO → "CT"
  - LEFT_TORSO → "LT"
  - RIGHT_TORSO → "RT"
  - LEFT_ARM → "LArm"
  - RIGHT_ARM → "RArm"
  - LEFT_LEG → "LLeg"
  - RIGHT_LEG → "RLeg"

### Requirement: Asset Sync Script

The system SHALL provide a script to synchronize assets from mm-data repository.

**Rationale**: Developers need a simple way to update assets without manual file copying.

**Priority**: High

#### Scenario: Development sync

- **GIVEN** mm-data repository exists at `../mm-data` relative to project root
- **WHEN** `npm run sync:mm-data` is executed
- **THEN** copy all record sheet templates to `public/record-sheets/templates_us/`
- **AND** copy all record sheet templates to `public/record-sheets/templates_iso/`
- **AND** copy all biped pips to `public/record-sheets/biped_pips/`
- **AND** report number of files synced

#### Scenario: Missing repository handling

- **GIVEN** mm-data repository does not exist at expected path
- **WHEN** `npm run sync:mm-data` is executed
- **THEN** display error message with instructions
- **AND** exit with non-zero status

#### Scenario: Version tracking

- **WHEN** sync completes successfully
- **THEN** write `mm-data-version.json` to `public/record-sheets/`
- **AND** include git commit hash of mm-data repo
- **AND** include sync timestamp

### Requirement: Location Bounds Configuration

The system SHALL define click target bounds for each armor location.

**Rationale**: mm-data pip SVGs are static, requiring overlay click targets for interactivity.

**Priority**: High

#### Scenario: Biped location bounds

- **WHEN** MegaMek Classic diagram renders for BIPED configuration
- **THEN** click targets SHALL be positioned using BipedLocationBounds
- **AND** each location has x, y, width, height coordinates
- **AND** coordinates match mm-data template layout

#### Scenario: Quad location bounds

- **WHEN** MegaMek Classic diagram renders for QUAD configuration
- **THEN** click targets SHALL use QuadLocationBounds
- **AND** includes FLL, FRL, RLL, RRL instead of LA, RA, LL, RL

#### Scenario: Tripod location bounds

- **WHEN** MegaMek Classic diagram renders for TRIPOD configuration
- **THEN** click targets SHALL use TripodLocationBounds
- **AND** includes CENTER_LEG with appropriate bounds

### Requirement: Non-Mech Wave-1 Template Registration

The system SHALL register the Wave-1 non-mech canonical record-sheet
templates in `config/mm-data-assets.json` so that `MmDataAssetService`
can resolve them through its existing three-source fallback chain
(local `/record-sheets/<path>` → jsDelivr CDN → GitHub raw).

The registered Wave-1 templates SHALL be:
`vehicle_noturret_standard.svg`, `vehicle_turret_standard.svg`,
`vehicle_dualturret_standard.svg`, `vtol_noturret_standard.svg`,
`vtol_turret_standard.svg`, `fighter_aerospace_default.svg`,
`fighter_conventional_default.svg`, `protomek_biped.svg`,
`protomek_quad.svg`, and `protomek_glider.svg`.

Each template SHALL be registered under **both** the `templates_us`
(US Letter) and `templates_iso` (A4) directories, matching the existing
`mek_*` registration pattern.

The asset-sync script SHALL copy the registered Wave-1 non-mech
templates into `public/record-sheets/templates_us` and
`public/record-sheets/templates_iso` alongside the existing mech
templates.

**Priority**: Critical

#### Scenario: Wave-1 vehicle template resolves locally

- **GIVEN** the Wave-1 templates registered in `config/mm-data-assets.json`
  and synced to `public/record-sheets/templates_us`
- **WHEN** `MmDataAssetService.loadSVG('templates_us/vehicle_turret_standard.svg')`
  is called
- **THEN** it SHALL return the canonical template SVG content from the
  local path

#### Scenario: Wave-1 template falls back to CDN

- **GIVEN** a registered Wave-1 template absent from the local
  `public/record-sheets` directory
- **WHEN** `MmDataAssetService.loadSVG` resolves that template
- **THEN** it SHALL fall back to the jsDelivr CDN source, then the
  GitHub raw source, before failing

#### Scenario: Both paper sizes are registered

- **GIVEN** the Wave-1 template registration
- **WHEN** `config/mm-data-assets.json` is read
- **THEN** every Wave-1 non-mech template SHALL appear in both the
  `templates_us` and `templates_iso` pattern lists

#### Scenario: Asset sync copies non-mech templates

- **GIVEN** the mm-data repository present at the expected relative path
- **WHEN** the asset-sync script runs
- **THEN** it SHALL copy each registered Wave-1 non-mech template into
  both `public/record-sheets/templates_us` and
  `public/record-sheets/templates_iso`, and report them in the synced
  file count

### Requirement: Canonical Template Element ID Catalog

The system SHALL maintain a frozen typed constant capturing the
injectable `id=` element set of each Wave-1 canonical template.

The catalog SHALL be derived by extracting `id=` attributes from each
registered canonical template SVG, and SHALL be reviewed against the
corresponding MegaMekLab `Print*` Java class field names
(`PrintTank`, `PrintAero`, `PrintProtoMek`) to confirm the binding
targets are correct.

The per-family `bindings.ts` adapters SHALL bind only against element
IDs present in this catalog.

**Priority**: High

#### Scenario: Element ID catalog is frozen and typed

- **GIVEN** the extracted element-ID catalog
- **WHEN** it is consumed by a `bindings.ts` adapter
- **THEN** the catalog SHALL be a frozen typed constant whose keys are
  the canonical template element IDs

#### Scenario: Catalog reviewed against MegaMekLab field names

- **GIVEN** the `vehicle` family element-ID catalog
- **WHEN** it is reviewed against `PrintTank.java`
- **THEN** every binding target used by the vehicle `bindings.ts`
  adapter SHALL correspond to a documented `PrintTank` element ID

#### Scenario: Bindings reject unknown element IDs

- **GIVEN** a `bindings.ts` adapter and the element-ID catalog
- **WHEN** the adapter is authored or modified
- **THEN** it SHALL only reference IDs present in the catalog, so a
  typo against a non-existent template ID is caught at type-check time

### Requirement: Infantry and Battle Armor Template Registration

The system SHALL register the Wave-2 Infantry and Battle Armor
canonical record-sheet templates in `config/mm-data-assets.json` so
that `MmDataAssetService` can resolve them through its existing
three-source fallback chain (local `/record-sheets/<path>` → jsDelivr
CDN → GitHub raw).

The registered Wave-2 templates SHALL be:
`conventional_infantry_default.svg`,
`conventional_infantry_platoon.svg`,
`conventional_infantry_tables.svg`, `battle_armor_default.svg`, and
`battle_armor_squad.svg`.

Each template SHALL be registered under **both** the `templates_us`
(US Letter) and `templates_iso` (A4) directories, matching the
existing mech and Wave-1 registration pattern.

The asset-sync script SHALL copy the registered Wave-2 templates into
`public/record-sheets/templates_us` and
`public/record-sheets/templates_iso` alongside the existing templates.

**Priority**: Critical

#### Scenario: Wave-2 infantry template resolves locally

- **GIVEN** the Wave-2 templates registered in `config/mm-data-assets.json`
  and synced to `public/record-sheets/templates_us`
- **WHEN** `MmDataAssetService.loadSVG('templates_us/conventional_infantry_platoon.svg')`
  is called
- **THEN** it SHALL return the canonical template SVG content from the
  local path

#### Scenario: Wave-2 template falls back to CDN

- **GIVEN** a registered Wave-2 template absent from the local
  `public/record-sheets` directory
- **WHEN** `MmDataAssetService.loadSVG` resolves that template
- **THEN** it SHALL fall back to the jsDelivr CDN source, then the
  GitHub raw source, before failing

#### Scenario: Both paper sizes are registered

- **GIVEN** the Wave-2 template registration
- **WHEN** `config/mm-data-assets.json` is read
- **THEN** every Wave-2 Infantry / Battle Armor template SHALL appear
  in both the `templates_us` and `templates_iso` pattern lists

#### Scenario: Asset sync copies the Wave-2 templates

- **GIVEN** the mm-data repository present at the expected relative path
- **WHEN** the asset-sync script runs
- **THEN** it SHALL copy each registered Wave-2 template into both
  `public/record-sheets/templates_us` and
  `public/record-sheets/templates_iso`, and report them in the synced
  file count

---

### Requirement: Wave-2 Element ID Catalog Section

The frozen typed element-ID catalog SHALL gain an Infantry / Battle
Armor section capturing the injectable `id=` element set of each
Wave-2 canonical template.

The Wave-2 catalog section SHALL be derived by extracting `id=`
attributes from each registered Wave-2 template SVG, and SHALL be
reviewed against the corresponding MegaMekLab `PrintSmallUnitSheet`
field names to confirm the binding targets are correct.

The `infantry/bindings.ts` and `battlearmor/bindings.ts` adapters
SHALL bind only against element IDs present in this catalog section.

**Priority**: High

#### Scenario: Wave-2 catalog section is frozen and typed

- **GIVEN** the extracted Wave-2 element-ID catalog section
- **WHEN** it is consumed by the `infantry` or `battlearmor`
  `bindings.ts` adapter
- **THEN** the catalog section SHALL be a frozen typed constant whose
  keys are the canonical Wave-2 template element IDs

#### Scenario: Wave-2 catalog reviewed against MegaMekLab field names

- **GIVEN** the Wave-2 element-ID catalog section
- **WHEN** it is reviewed against `PrintSmallUnitSheet`
- **THEN** every binding target used by the infantry / battle-armor
  adapters SHALL correspond to a documented `PrintSmallUnitSheet`
  element ID, and any divergence SHALL be noted as a catalog comment

#### Scenario: Wave-2 bindings reject unknown element IDs

- **GIVEN** the `infantry` / `battlearmor` `bindings.ts` adapters and
  the element-ID catalog
- **WHEN** an adapter is authored or modified
- **THEN** it SHALL only reference IDs present in the catalog, so a
  typo against a non-existent template ID is caught at type-check time
