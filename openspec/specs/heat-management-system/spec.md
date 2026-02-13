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
