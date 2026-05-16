# mm-data-asset-integration Delta — add-templated-infantry-battlearmor-record-sheets

## ADDED Requirements

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

## MODIFIED Requirements

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
