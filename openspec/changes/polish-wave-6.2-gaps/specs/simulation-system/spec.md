# Spec Delta: Simulation System

## ADDED Requirements

### Requirement: StateCycleDetector Includes Unit Positions

The StateCycleDetector SHALL include each unit's `position` field in its snapshot key so positional movement between turns does not register as a false-positive state cycle. The previous snapshot scope (armor / structure / heat only) reported a state cycle on 96% of runs even when units had moved between turns (PT-001).

**Priority**: High

#### Scenario: Same heat at different position is not a cycle

**GIVEN** a unit with `heat = 10`, `armor = 30`, `structure = 50` at position `(3, 4)` on turn N
**AND** the same unit with `heat = 10`, `armor = 30`, `structure = 50` at position `(4, 5)` on turn N+1
**WHEN** the StateCycleDetector snapshots both turns
**THEN** the two snapshot keys SHALL differ (because position differs)
**AND** the detector SHALL NOT flag a state cycle

#### Scenario: Same state at same position is still a cycle

**GIVEN** a unit with `heat = 10`, `position = (3, 4)` on turn N
**AND** the same unit with `heat = 10`, `position = (3, 4)` on turn N+1 (no movement, no damage)
**WHEN** the StateCycleDetector snapshots both turns
**THEN** the two snapshot keys SHALL match
**AND** the detector MAY flag a candidate state cycle (existing behavior preserved)

#### Scenario: PT-001 hit-rate drops below 5% after the fix

**GIVEN** the Phase-1 smoke matrix that previously produced StateCycleDetector hits on 96% of runs
**WHEN** the matrix re-runs with the position-aware snapshot
**THEN** the StateCycleDetector hit rate SHALL drop below 5% (the threshold below which the detector is no longer the dominant signal)

### Requirement: TurnLimit Scales With Map Radius

`ScenarioGenerator` SHALL default `turnLimit` to `max(50, mapRadius * 4)` so larger maps don't draw out at the 50-turn cap. Previously the static `turnLimit = 50` caused r20 maps to draw at 100% (PT-003).

**Priority**: Medium

#### Scenario: r12 default is unchanged

**GIVEN** `ScenarioGenerator.generate({ mapRadius: 12, ... })` with no explicit `turnLimit`
**WHEN** the scenario is generated
**THEN** `scenario.turnLimit` SHALL be 50 (`max(50, 12 * 4) = max(50, 48) = 50`)

#### Scenario: r20 default rises to 80

**GIVEN** `ScenarioGenerator.generate({ mapRadius: 20, ... })` with no explicit `turnLimit`
**WHEN** the scenario is generated
**THEN** `scenario.turnLimit` SHALL be 80 (`max(50, 20 * 4) = 80`)
**AND** the Phase-1 r20 draw rate SHALL drop below 50% (PT-003)

#### Scenario: Explicit caller value still wins

**GIVEN** `ScenarioGenerator.generate({ mapRadius: 20, turnLimit: 50, ... })`
**WHEN** the scenario is generated
**THEN** `scenario.turnLimit` SHALL be 50 (the caller's explicit value)
**AND** the auto-scaling SHALL only apply when the caller leaves `turnLimit` undefined
