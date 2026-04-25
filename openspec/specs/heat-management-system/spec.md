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

### Requirement: Real Weapon Heat Accumulation

The heat-management system SHALL accumulate heat from fired weapons using each weapon's catalog `heat` value. The `weapons.length * 10` approximation SHALL be removed.

#### Scenario: Firing multiple weapons sums real heats

- **GIVEN** a unit that fires 1 PPC (heat 10) and 2 Medium Lasers (heat 3 each)
- **WHEN** the firing heat is computed
- **THEN** the firing heat SHALL be 10 + 3 + 3 = 16

#### Scenario: No firing produces no heat

- **GIVEN** a unit that fires no weapons this turn
- **WHEN** the firing heat is computed
- **THEN** the firing heat contribution SHALL be 0

#### Scenario: Legacy approximation removed

- **GIVEN** the heat generation code path
- **WHEN** the path is statically searched for `weapons.length * 10`
- **THEN** no occurrences SHALL remain in production code

### Requirement: TSM Walk-MP Combined With Heat Penalty

The system SHALL preserve canonical Total Warfare walk-MP arithmetic when Triple Strength Myomer (TSM) is active and the unit is at or above heat 9. The TSM bonus (+2 walk MP) and the heat-based movement penalty (`floor(heat / 5)` MP, applied at heat 5+) SHALL be combined additively against the unit's base walk MP, with the result floored at 0.

This requirement closes the verifier PARTIAL on archived `wire-heat-generation-and-effects` task 7.2.

The pure utility `getEffectiveWalkMP(baseWalkMP, currentHeat, hasTSM)` lives in `src/utils/gameplay/movement/calculations.ts` and is the single combined integration point for the TSM bonus (`isTSMActive`) and heat penalty (`getHeatMovementPenalty`) primitives.

#### Scenario: TSM-active mech at heat 9 walks base + 2 − heat penalty

- **WHEN** a BattleMech with TSM equipment installed has current heat = 9 (TSM activation threshold)
- **AND** the mech's base walk MP is 4
- **THEN** `getEffectiveWalkMP(4, 9, true)` returns `4 + 2 (TSM bonus) − 1 (floor(9/5) heat penalty) = 5`

#### Scenario: TSM-active mech at heat 0 receives only TSM bonus

- **WHEN** a BattleMech with TSM equipment installed has current heat = 0 (TSM dormant)
- **AND** base walk MP is 4
- **THEN** `getEffectiveWalkMP(4, 0, true)` returns base walk MP unchanged at `4` (TSM bonus does not apply below heat 9)

#### Scenario: Non-TSM mech at heat 9 receives only heat penalty

- **WHEN** a BattleMech without TSM has current heat = 9
- **AND** base walk MP is 4
- **THEN** `getEffectiveWalkMP(4, 9, false)` returns `4 − 1 (floor(9/5) heat penalty) = 3`

#### Scenario: Effective walk MP floors at 0 for severe overheat

- **WHEN** a BattleMech without TSM has current heat = 30 (auto-shutdown territory)
- **AND** base walk MP is 4
- **THEN** `getEffectiveWalkMP(4, 30, false)` returns `0` (heat penalty `floor(30/5) = 6` exceeds base MP, but result clamps to 0)

