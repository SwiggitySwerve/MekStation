## ADDED Requirements

### Requirement: Turn Start Zeroes Phase Damage

The reducer SHALL zero each unit's `damageThisPhase` when it applies a `TurnStarted` event that begins a new turn, even when no `PhaseChanged` event accompanies it, matching MegaMek 48fcb2f64 `TWGameManager.resetEntityPhase` (TWGameManager.java:1572-1573), which runs at the start of every phase including the first of a round.

#### Scenario: Bare TurnStarted

- **GIVEN** a unit with 15 `damageThisPhase` and no `PhaseChanged` event for the new turn
- **WHEN** a `TurnStarted` event for the next turn is applied
- **THEN** its `damageThisPhase` SHALL be 0
