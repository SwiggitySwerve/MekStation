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
