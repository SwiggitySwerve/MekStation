# heat-overflow-effects (delta)

## MODIFIED Requirements

### Requirement: Heat Scale Thresholds

The system SHALL define heat scale effects at MegaMek canonical thresholds, sourced from a single authoritative constants module (`src/constants/heat.ts`).

Duplicate or conflicting threshold tables in `src/utils/gameplay/toHit.ts` and `src/types/validation/HeatManagement.ts` SHALL be removed. The canonical to-hit thresholds are: heat ≥ 8 → +1, heat ≥ 13 → +2, heat ≥ 17 → +3, heat ≥ 24 → +4.

#### Scenario: Canonical heat scale table

- **GIVEN** a BattleMech with accumulated heat
- **WHEN** heat effects are calculated
- **THEN** the to-hit modifier SHALL be looked up from a single constants module
- **AND** the thresholds SHALL be +1 at 8, +2 at 13, +3 at 17, +4 at 24
- **AND** movement penalty SHALL be `floor(heat / 5)` MP reduction
- **AND** shutdown TN SHALL be `4 + floor((heat - 14) / 4) * 2` for heat ≥ 14
- **AND** ammo explosion TN SHALL be 4 at heat 19, 6 at heat 23, 8 at heat 28

#### Scenario: Single source of truth enforced

- **GIVEN** the heat thresholds are referenced from multiple call sites (toHit calculation, heat-phase shutdown check, movement penalty computation)
- **WHEN** any consumer looks up a threshold value
- **THEN** the value SHALL come from `src/constants/heat.ts`
- **AND** no other module SHALL define conflicting threshold constants

#### Scenario: Threshold boundary at heat 7 and 8

- **GIVEN** two mechs with heat 7 and heat 8 respectively
- **WHEN** the to-hit modifier is computed
- **THEN** the heat 7 mech SHALL receive +0
- **AND** the heat 8 mech SHALL receive +1
