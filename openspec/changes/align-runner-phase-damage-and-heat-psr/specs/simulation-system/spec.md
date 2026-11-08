## ADDED Requirements

### Requirement: Runner Damage Is Counted Per Phase

The simulation runner SHALL zero each unit's `damageThisPhase` as the Weapon Attack, Physical Attack and Heat phases begin, matching MegaMek 48fcb2f64 `TWGameManager.resetEntityPhase` (TWGameManager.java:1572-1573). Damage from physical attacks SHALL increment the target's `damageThisPhase`. The 20+ damage PSR SHALL count only damage taken in the current phase.

#### Scenario: Movement damage does not pool with weapon damage

- **GIVEN** a unit took 12 damage from a minefield in the Movement phase
- **WHEN** the Weapon Attack phase begins and the unit then takes a 10-point weapon hit
- **THEN** its `damageThisPhase` SHALL be 10
- **AND** no 20+ damage PSR SHALL be queued

#### Scenario: Damage in one phase still triggers the PSR

- **WHEN** a unit takes 22 damage within a single phase
- **THEN** a 20+ damage PSR SHALL be queued

#### Scenario: Physical damage counts

- **WHEN** a unit takes 8 and then 5 physical-attack damage in the Physical Attack phase
- **THEN** its `damageThisPhase` SHALL be 13

### Requirement: Runner Decrements EMP Interference

The simulation runner SHALL decrement a carried `empInterferenceTurns` by one, floored at zero, at each turn reset, matching MegaMek 48fcb2f64 `Entity.newRound` (`empInterferenceRounds--`). A unit that does not carry the field SHALL NOT gain it.

#### Scenario: Countdown

- **GIVEN** a unit with `empInterferenceTurns` of 3
- **WHEN** successive turns begin
- **THEN** the value SHALL become 2, 1, 0 and remain 0

### Requirement: Runner Resolves Heat-Shutdown PSR In Phase

The simulation runner SHALL resolve pending PSRs after the Heat phase, so a heat-shutdown PSR queued in that phase is rolled and emits `PSRResolved` before the next turn begins, matching MegaMek 48fcb2f64, which resolves it in the phase it is queued.

#### Scenario: Shutdown PSR is rolled

- **GIVEN** a unit reaches shutdown-level heat in the Heat phase
- **WHEN** the turn ends
- **THEN** a `PSRResolved` event SHALL exist for that unit before the next `TurnStarted`
- **AND** its pending PSR queue SHALL NOT be cleared unrolled by the next turn reset
