# Spec Delta: Movement System

## MODIFIED Requirements

### Requirement: Movement Terrain And Elevation Costs

Movement cost calculation SHALL apply source-backed terrain and elevation MP
costs for represented unit movement modes while preserving preview and commit
validation agreement.

#### Scenario: Directional cliff metadata distinguishes sheer cliffs from hills

- **GIVEN** a represented map hex has terrain-feature metadata identifying
  cliff-top exits toward one or more adjacent hexes
- **WHEN** a unit moves across an edge not listed in that cliff-top metadata
- **THEN** movement cost and legality SHALL follow ordinary non-cliff elevation
  rules
- **AND** the system SHALL NOT infer sheer-cliff behavior from elevation delta
  alone.

#### Scenario: WiGE pays the sheer-cliff ascent surcharge

- **GIVEN** a represented WiGE mover crosses upward into a destination hex whose
  cliff-top metadata exits toward the source hex
- **WHEN** the player previews or commits that movement
- **THEN** movement cost SHALL include the source-backed +1 MP sheer-cliff
  ascent surcharge
- **AND** preview/pathfinding and committed movement validation SHALL use the
  same cost.

#### Scenario: Vehicles cannot ascend an encoded sheer cliff without road cover

- **GIVEN** a represented tracked, wheeled, or hover vehicle attempts to move
  upward into a destination hex whose cliff-top metadata exits toward the source
  hex
- **AND** the destination does not have a pavement, paved-road, or bridge
  surface that cancels cliff effects for road-capable movement
- **WHEN** the player previews or commits that movement
- **THEN** the movement SHALL be blocked with a terrain-blocked reason before
  commit.
