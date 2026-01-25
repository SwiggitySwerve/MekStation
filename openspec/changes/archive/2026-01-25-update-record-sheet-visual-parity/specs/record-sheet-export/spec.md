## MODIFIED Requirements

### Requirement: SVG Template Rendering

The system SHALL use configuration-specific SVG templates from mm-data CDN for all mech types.

Templates are fetched from externalized mm-data assets at runtime, with proper error handling for network failures.

#### Scenario: Template loading from CDN
- **WHEN** record sheet renders for a unit
- **THEN** fetch template from `/record-sheets/templates_us/` (or `templates_iso/` for A4)
- **AND** template URL is constructed based on MechConfiguration
- **AND** network errors are caught and displayed to user

#### Scenario: Configuration-specific template loading
- **WHEN** record sheet renders for a unit
- **THEN** load template based on unit's MechConfiguration:
  - BIPED → `mek_biped_default.svg`
  - QUAD → `mek_quad_default.svg`
  - TRIPOD → `mek_tripod_default.svg`
  - LAM → `mek_lam_default.svg`
  - QUADVEE → `mek_quadvee_default.svg`

### Requirement: Armor Pip Visualization

The system SHALL render armor pips using mm-data SVG assets fetched from CDN for biped mechs, and ArmorPipLayout algorithm for other configurations.

#### Scenario: Biped armor pip loading from CDN
- **WHEN** armor diagram renders for BIPED configuration
- **THEN** fetch pip SVGs from `/record-sheets/biped_pips/Armor_<Location>_<Count>_Humanoid.svg`
- **AND** extract path elements from `<switch><g>` structure in pip SVG
- **AND** insert paths into template's `canonArmorPips` group
- **AND** parent group transform handles correct positioning (no double-transform)

#### Scenario: Non-biped armor pip generation
- **WHEN** armor diagram renders for QUAD, TRIPOD, LAM, or QUADVEE configuration
- **THEN** use ArmorPipLayout algorithm to generate pips dynamically
- **AND** pips are positioned within template's pip area rect elements

### Requirement: Structure Pip Visualization

The system SHALL render internal structure pips using mm-data SVG assets fetched from CDN for biped mechs.

#### Scenario: Biped structure pip loading from CDN
- **GIVEN** a BIPED mech with specific tonnage
- **WHEN** structure section renders
- **THEN** fetch pip SVGs from `/record-sheets/biped_pips/BipedIS<Tonnage>_<Location>.svg`
- **AND** insert paths into template's structure pip group

## ADDED Requirements

### Requirement: Asset Loading Error Handling

The system SHALL handle missing or failed asset loads gracefully with user feedback.

#### Scenario: Template fetch failure
- **WHEN** template SVG fails to load from CDN
- **THEN** display error message on preview canvas
- **AND** log error to console with path and status code
- **AND** do not crash the application

#### Scenario: Pip SVG fetch failure
- **WHEN** a pip SVG fails to load
- **THEN** log warning to console
- **AND** continue rendering without that location's pips
- **AND** do not block other pip loading
