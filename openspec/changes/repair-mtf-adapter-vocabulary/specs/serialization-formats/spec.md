## ADDED Requirements

### Requirement: MTF adapter construction identity

The MTF adapter SHALL translate known source construction names to the existing
unit contract vocabulary and preserve original MTF text and source header facts.
Unsupported configuration, engine and armor facts SHALL remain identifiable and
SHALL NOT silently become standard construction.

#### Scenario: Omni source spellings

- **GIVEN** a pinned Biped, Quad, Tripod or QuadVee OmniMek source, or the legacy OmniMech spelling
- **WHEN** MTFParserService parses it
- **THEN** configuration SHALL retain the base chassis form and isOmni SHALL be true
- **AND** original source configuration and source text SHALL remain available

#### Scenario: Supported engine and armor wire names

- **GIVEN** pinned sources with Clan XL, light/heavy ferro, or other supported armor identities
- **WHEN** the actual parser output is passed to UnitContract and loadUnitDefinition
- **THEN** both boundaries SHALL accept supported construction vocabulary
- **AND** armor variants and component Clan identities SHALL remain distinct where the contract represents them

#### Scenario: Unsupported construction remains rejected

- **GIVEN** a FrankenMek configuration, patchwork armor, armor without a contract representation, or an unknown construction suffix
- **WHEN** parsed and checked at the definition boundary
- **THEN** the source facts SHALL remain recoverable and the definition SHALL remain rejected
- **AND** diagnostic parsing SHALL NOT imply editor import or numerical parity readiness

### Requirement: MTF adapter export vocabulary compatibility

The MTF adapter SHALL share engine and armor vocabulary between parsing and
exporting. Export SHALL preserve the Clan XL, light/heavy ferro-fibrous and Clan
reactive/reflective identities introduced by the construction identity adapter.

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`MtfFile.java:387-466,867-905`. This requirement covers the five changed wire
identities, not full unit, mixed-chassis, editor or numerical parity. The bounded
component-export continuation below preserves this compatibility requirement.

#### Scenario: Existing vocabulary extraction preserves behavior

- **GIVEN** the existing parser and exporter mappings
- **WHEN** their shared vocabulary is extracted before the compatibility repair
- **THEN** existing parser and export outputs SHALL remain unchanged

#### Scenario: Changed wire identities survive source export

- **GIVEN** pinned Champion C, Annihilator ANH-3A, Clint CLNT-6S, Gyrfalcon and Warwolf sources
- **WHEN** parsed units are exported and parsed again
- **THEN** the engine identity and rating and armor identity SHALL be preserved
- **AND** those identities SHALL NOT fall back to standard construction

### Requirement: Faithful MTF component export

The MTF adapter SHALL use its existing shared vocabulary owner for engine and
armor names. It SHALL preserve supported component identities, engine rating and
armor allocation through local parse/export/reparse. It SHALL reject unsupported
component identities and unresolved current MIXED chassis context with diagnostics
and no content, rather than emit a standard construction fallback.

#### Scenario: Supported component output and legacy aliases

- **GIVEN** supported engine/armor wire identities or deliberate legacy aliases
- **WHEN** MTFExportService exports a unit
- **THEN** exact supported names SHALL be emitted and local reparse SHALL preserve the canonical component identities, rating and armor allocation
- **AND** battery, industrial/commercial, primitive, impact-resistant and ferro-lamellor identities SHALL NOT become standard construction

#### Scenario: Unsupported component output

- **GIVEN** unknown, prototype, patchwork or other-family engine/armor identities
- **WHEN** MTFExportService exports a unit
- **THEN** export SHALL fail with diagnostics identifying each unsupported component and no content
- **AND** an independent missing chassis-context error SHALL also remain visible

#### Scenario: Missing current mixed chassis context

- **GIVEN** MIXED tech base without typed current IS or Clan chassis context
- **WHEN** MTFExportService exports a unit, even with retained original MTF text
- **THEN** export SHALL fail with a missing chassis-tech-context diagnostic and no content
- **AND** the chassis base SHALL NOT be inferred from components or source text

#### Scenario: Limits of component preservation

- **GIVEN** a successful local component roundtrip
- **WHEN** its guarantee is reported
- **THEN** contextual parser/editor identity and upstream semantic and numerical readiness SHALL remain separate follow-ups
- **AND** pure Clan unmarked XL parsing and pure IS chassis Clan suffix behavior SHALL remain named limitations
