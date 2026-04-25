## ADDED Requirements

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
