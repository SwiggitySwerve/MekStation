# heat-management-system Specification

## Purpose

Defines terrain-based heat effects for BattleMech combat, specifically water cooling bonuses and terrain heat modifiers.

**Scope**: This spec covers only the terrain-based heat utilities in `src/utils/gameplay/heat.ts`. For complete heat system behavior including generation, dissipation, shutdown checks, and engine critical hits, see related specs and implementation in `gameSession.ts`, `movement.ts`, and `constants/heat.ts`.

## Requirements

### Requirement: Water Cooling Bonus

Heat dissipation SHALL include water cooling bonuses when a unit is standing in water.

#### Scenario: Standing in water depth 1

- **WHEN** a unit is standing in water at depth 1
- **THEN** heat dissipation SHALL be increased by 2 points

#### Scenario: Standing in water depth 2+

- **WHEN** a unit is standing in water at depth 2 or greater
- **THEN** heat dissipation SHALL be increased by 4 points

#### Scenario: No water

- **WHEN** water depth is 0 or negative
- **THEN** water cooling bonus SHALL be 0

### Requirement: Terrain Heat Effects

The system SHALL calculate net heat effects from terrain features.

#### Scenario: Water terrain cooling

- **WHEN** terrain includes water feature
- **THEN** heat effect SHALL be negative (cooling)
- **AND** cooling amount SHALL equal water cooling bonus × -1

#### Scenario: Multiple terrain features

- **WHEN** hex contains multiple terrain features
- **THEN** heat effects SHALL be summed
- **AND** each feature's heat effect SHALL be looked up from `TERRAIN_PROPERTIES`

#### Scenario: No terrain features

- **WHEN** terrain features array is empty
- **THEN** net heat effect SHALL be 0

### Requirement: Total Heat Dissipation Calculation

The system SHALL calculate total heat dissipation including terrain bonuses.

#### Scenario: Heat dissipation with water

- **WHEN** calculating total dissipation
- **THEN** total SHALL equal base heat sinks plus water cooling bonus
- **AND** water bonus SHALL be extracted from water terrain feature level

#### Scenario: Heat dissipation without water

- **WHEN** no water terrain feature is present
- **THEN** total dissipation SHALL equal base heat sinks only

### Requirement: Per-Turn Heat Generation

The heat management system SHALL accumulate unit heat from all canonical sources each turn: movement, firing, engine damage, and environmental heat (e.g., fire/lava hexes).

#### Scenario: Movement heat applied

- **GIVEN** a unit that walked this turn
- **WHEN** the heat phase runs
- **THEN** the unit SHALL accumulate +1 heat from movement
- **AND** a `HeatGenerated` event SHALL include source = `Movement`, amount = 1

#### Scenario: Running heat

- **GIVEN** a unit that ran this turn
- **WHEN** the heat phase runs
- **THEN** the unit SHALL accumulate +2 heat

#### Scenario: Jump heat uses max(3, jumpMP)

- **GIVEN** a unit with 5 jump MP that jumped 5 hexes
- **WHEN** the heat phase runs
- **THEN** the unit SHALL accumulate +5 heat from jump

#### Scenario: Short jump still costs 3

- **GIVEN** a unit with 2 jump MP that jumped 2 hexes
- **WHEN** the heat phase runs
- **THEN** the unit SHALL accumulate +3 heat (floor at 3)

#### Scenario: Engine-hit contribution

- **GIVEN** a unit with 2 engine hits
- **WHEN** the heat phase runs
- **THEN** the unit SHALL accumulate +10 heat from engine damage (5 × 2)

### Requirement: Dissipation From Real Heat Sinks

Dissipation SHALL be computed from the unit's actual heat-sink count (engine-integrated + external, minus destroyed sinks), not a fixed constant.

#### Scenario: Standard mech with 10 single sinks

- **GIVEN** a mech with 10 single heat sinks, none destroyed
- **WHEN** dissipation is computed
- **THEN** dissipation SHALL be 10

#### Scenario: Double heat sinks

- **GIVEN** a mech with 10 double heat sinks (IS), none destroyed
- **WHEN** dissipation is computed
- **THEN** dissipation SHALL be 20

#### Scenario: Destroyed sinks excluded

- **GIVEN** a mech with 10 single sinks, 3 destroyed by crits
- **WHEN** dissipation is computed
- **THEN** dissipation SHALL be 7

### Requirement: Water Cooling Bonus Applied

When a unit stands in water terrain, the water-cooling bonus SHALL be added to dissipation.

#### Scenario: Water depth 1

- **GIVEN** a mech standing in water depth 1
- **WHEN** dissipation is computed
- **THEN** +2 SHALL be added to dissipation

#### Scenario: Water depth 2+

- **GIVEN** a mech standing in water depth 2 or greater
- **WHEN** dissipation is computed
- **THEN** +4 SHALL be added to dissipation

### Requirement: Heat Level Non-Negative

The unit's heat level SHALL never be negative; dissipation that would reduce heat below 0 SHALL clamp to 0.

#### Scenario: Overdissipation clamps

- **GIVEN** a unit at heat 3 with dissipation 10
- **WHEN** the heat phase ends
- **THEN** the unit's heat SHALL be 0 (not -7)
