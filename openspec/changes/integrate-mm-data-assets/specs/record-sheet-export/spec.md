# record-sheet-export Specification Delta

## MODIFIED Requirements

### Requirement: SVG Template Rendering (from record-sheet-export)

The system SHALL use configuration-specific SVG templates from mm-data for all mech types.

MODIFIED: Expand template support to all mech configurations.

#### Scenario: Configuration-specific template loading (MODIFIED)
- **WHEN** record sheet renders for a unit
- **THEN** load template based on unit's MechConfiguration:
  - BIPED → `mek_biped_default.svg`
  - QUAD → `mek_quad_default.svg`
  - TRIPOD → `mek_tripod_default.svg`
  - LAM → `mek_lam_default.svg`
  - QUADVEE → `mek_quadvee_default.svg`
- **AND** templates are loaded from `/record-sheets/templates_us/` (or `templates_iso/` for A4)

#### Scenario: Quad template rendering (NEW)
- **WHEN** record sheet renders for QUAD configuration
- **THEN** template SHALL display quad mech silhouette
- **AND** armor locations SHALL include FLL, FRL, RLL, RRL (not LA, RA, LL, RL)
- **AND** pip positioning SHALL match quad template layout

#### Scenario: Tripod template rendering (NEW)
- **WHEN** record sheet renders for TRIPOD configuration
- **THEN** template SHALL display tripod mech silhouette
- **AND** armor locations SHALL include all 9 locations (including CENTER_LEG)
- **AND** pip positioning SHALL match tripod template layout

#### Scenario: LAM template rendering (NEW)
- **WHEN** record sheet renders for LAM configuration
- **THEN** template SHALL display LAM-specific layout
- **AND** template SHALL include mode indicator area

#### Scenario: QuadVee template rendering (NEW)
- **WHEN** record sheet renders for QUADVEE configuration
- **THEN** template SHALL display QuadVee-specific layout
- **AND** template SHALL include mode indicator area

### Requirement: Armor Pip Visualization (from record-sheet-export)

The system SHALL render armor pips using mm-data SVG assets for all mech configurations.

MODIFIED: Support all configuration types.

#### Scenario: Quad armor pip loading (NEW)
- **WHEN** armor diagram renders for QUAD configuration
- **THEN** load pip SVGs for quad locations
- **AND** file naming follows: `Armor_{QuadLocation}_{Count}_Quad.svg` if available
- **OR** fallback to Humanoid pips with position mapping

#### Scenario: Tripod armor pip loading (NEW)
- **WHEN** armor diagram renders for TRIPOD configuration
- **THEN** load pip SVGs for all 9 tripod locations
- **AND** CENTER_LEG uses `Armor_CL_{Count}_Humanoid.svg` format

### Requirement: Structure Pip Visualization (from record-sheet-export)

The system SHALL render internal structure pips using mm-data SVG assets for all mech configurations.

MODIFIED: Support all configuration types.

#### Scenario: Quad structure pip loading (NEW)
- **GIVEN** a QUAD mech with specific tonnage
- **WHEN** structure section renders
- **THEN** load pip SVGs following: `QuadIS{Tonnage}_{Location}.svg` if available
- **OR** fallback to BipedIS with appropriate position mapping

#### Scenario: Tripod structure pip loading (NEW)
- **GIVEN** a TRIPOD mech with specific tonnage
- **WHEN** structure section renders
- **THEN** load pip SVGs for all 9 locations including CENTER_LEG

## ADDED Requirements

### Requirement: Paper Size Selection

The system SHALL support both US Letter and A4 paper sizes for record sheet export.

**Rationale**: International users require A4 format; mm-data provides both template sets.

**Priority**: Medium

#### Scenario: Paper size setting
- **WHEN** user opens Settings > Export > Record Sheet Paper Size
- **THEN** options SHALL include "US Letter (8.5×11)" and "A4 (210×297mm)"
- **AND** selection persists to local storage

#### Scenario: Template directory selection
- **GIVEN** user has selected paper size preference
- **WHEN** record sheet template loads
- **THEN** load from `templates_us/` for US Letter
- **OR** load from `templates_iso/` for A4
