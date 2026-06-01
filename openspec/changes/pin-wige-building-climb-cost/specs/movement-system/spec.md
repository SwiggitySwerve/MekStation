# Spec Delta: Movement System

## MODIFIED Requirements

### Requirement: Movement Terrain And Elevation Costs

Movement cost calculation SHALL apply source-backed terrain and elevation MP
costs for represented unit movement modes while preserving preview and commit
validation agreement.

#### Scenario: WiGE pays climb-mode cost over a higher represented building top

- **GIVEN** a represented landed WiGE mover is adjacent to a destination hex
  that contains represented building elevation
- **WHEN** the destination's represented ceiling is higher than the source hex's
  represented ceiling
- **THEN** movement cost projection SHALL add the source-backed +2 MP WiGE
  climb-mode surcharge
- **AND** the same cost SHALL be used by pathfinding, movement preview, and
  committed movement validation.

#### Scenario: Ordinary represented terrain and elevation remain bypassed by WiGE

- **GIVEN** a represented landed WiGE mover is adjacent to woods, clear terrain,
  water, or ordinary elevation changes without a higher represented building top
- **WHEN** the player previews or commits movement into that destination
- **THEN** the movement cost SHALL preserve the represented WiGE terrain and
  elevation bypass
- **AND** the destination SHALL NOT receive the building climb-mode surcharge.

#### Scenario: Directional cliff surcharge is not implied without cliff metadata

- **GIVEN** a represented WiGE mover crosses an ordinary elevation change
- **WHEN** the map does not encode directional cliff-top terrain metadata for the
  crossed edge
- **THEN** the movement cost SHALL NOT infer the separate source-backed +1 MP
  sheer-cliff surcharge from elevation delta alone
- **AND** full cliff parity SHALL remain a separate movement-system follow-up.
