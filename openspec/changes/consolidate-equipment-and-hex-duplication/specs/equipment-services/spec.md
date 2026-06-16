# equipment-services Delta — consolidate-equipment-and-hex-duplication

## ADDED Requirements

### Requirement: Canonical Equipment ID Normalization

The system SHALL expose exactly one canonical `normalizeEquipmentId` function —
the catalog-driven normalizer that resolves an arbitrary equipment ID or name
against the equipment catalog, name-mappings, alias maps, abbreviation maps, and
regex patterns — and every equipment-resolution pipeline (MTF import, unit-loader
resolution, simulation-runner hydration, and BV catalog lookup) SHALL route
equipment-ID normalization through it. No pipeline SHALL maintain a divergent
local normalization implementation; any same-named local export SHALL be a
re-export shim that delegates to the canonical function.

#### Scenario: Same input resolves identically across all pipelines

- **GIVEN** an ambiguous equipment input such as `'Ultra AC/5'` or `'Rotary AC/5'`
- **WHEN** the MTF importer, the unit-loader resolution path, the simulation
  hydration path, and the BV catalog lookup each normalize that input
- **THEN** all four SHALL produce the same canonical equipment key
- **AND** the key SHALL be the one the canonical catalog-driven normalizer
  returns.

#### Scenario: Divergent local normalizers are removed

- **GIVEN** a pipeline previously held its own `normalizeEquipmentId`
  implementation
- **WHEN** that pipeline normalizes an equipment ID after this change
- **THEN** it SHALL call the canonical normalizer (directly or through a thin
  site-specific adapter)
- **AND** no two pipelines SHALL return different canonical keys for the same
  input.

#### Scenario: Site-specific context is supplied at the adapter boundary

- **GIVEN** a pipeline that requires extra context to normalize (such as a unit
  tech base for Clan/IS disambiguation, or ammo-key shaping)
- **WHEN** that pipeline normalizes an equipment ID
- **THEN** the context SHALL be supplied to a thin adapter that delegates to the
  canonical normalizer
- **AND** the canonical normalizer SHALL NOT be forked into a context-specific
  copy.

#### Scenario: Catalog availability on the hydration path

- **GIVEN** the simulation-runner hydration path normalizes equipment before the
  equipment catalog is loaded
- **WHEN** the canonical normalizer is invoked on that path
- **THEN** the catalog SHALL be available (loaded or pre-warmed) so normalization
  resolves against the catalog rather than degrading to a lossy fallback.
