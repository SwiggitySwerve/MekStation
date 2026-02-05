# mm-data-asset-integration Specification

## Purpose

TBD - created by archiving change integrate-mm-data-assets. Update Purpose after archive.

## Requirements

### Requirement: MmData Asset Service

The system SHALL provide a service for loading and caching assets from the mm-data distribution.

**Rationale**: Centralized asset loading enables consistent access to MegaMek visual assets across components.

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

- **GIVEN** a MechConfiguration and paper size
- **WHEN** `MmDataAssetService.getRecordSheetTemplate(config, paperSize)` is called
- **THEN** return the SVG template document
- **AND** file is loaded from appropriate templates directory

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
