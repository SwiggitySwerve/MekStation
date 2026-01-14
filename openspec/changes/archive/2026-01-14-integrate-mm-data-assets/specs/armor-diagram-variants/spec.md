# armor-diagram-variants Specification Delta

## ADDED Requirements

### Requirement: MegaMek Classic Variant

The system SHALL provide a "MegaMek Classic" armor diagram variant that matches MegaMekLab's visual style.

**Rationale**: Users familiar with MegaMekLab expect visual parity; using official assets ensures authenticity.

**Priority**: High

#### Scenario: MegaMek Classic rendering
- **WHEN** user selects "MegaMek Classic" variant in Settings
- **THEN** armor diagram SHALL render using mm-data pip SVG assets
- **AND** visual appearance SHALL match MegaMekLab's armor diagram
- **AND** pips are displayed as circles arranged per location

#### Scenario: MegaMek Classic pip loading
- **WHEN** armor diagram renders for a location
- **THEN** load pip SVG matching current armor value
- **AND** display correct number of filled circles
- **AND** rear armor uses separate rear pip SVGs for torso locations

#### Scenario: MegaMek Classic click interaction
- **WHEN** user clicks on a location in MegaMek Classic variant
- **THEN** invisible click target overlay registers the click
- **AND** location is selected for editing
- **AND** hover state displays on mouse enter

#### Scenario: MegaMek Classic default
- **GIVEN** user has not explicitly chosen a variant
- **WHEN** armor diagram renders
- **THEN** MegaMek Classic SHALL be the default variant

## MODIFIED Requirements

### Requirement: Multiple Design Variants

The system SHALL provide 6 distinct armor diagram designs for user selection.

#### Scenario: Available variants
- **WHEN** the armor diagram is rendered
- **THEN** the system supports these variants:
  - Clean Tech (default)
  - Neon Operator
  - Tactical HUD
  - Premium Material
  - MegaMek
  - MegaMek Classic (NEW - uses mm-data assets)
- **AND** each variant maintains identical functionality
- **AND** each variant displays all locations for the current configuration
- **AND** each variant applies consistently to all mech configurations (Biped, Quad, Tripod, LAM, QuadVee)
