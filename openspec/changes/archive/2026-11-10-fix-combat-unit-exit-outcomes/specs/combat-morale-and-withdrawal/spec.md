## ADDED Requirements

### Requirement: Unit Exit Latches Once

A unit SHALL leave a battle at most once: by `UnitDestroyed`, `UnitEjected` or `UnitRetreated`, whichever is folded first. The reducer SHALL ignore a later `UnitEjected` or `UnitRetreated` for a unit that is destroyed, ejected or retreated, and SHALL ignore `RetreatTriggered` and `WithdrawalDeclared` for such a unit. The reducer SHALL enforce this regardless of the emitter, because P2P translation and the non-interactive store eject do not guard.

#### Scenario: Eject after destruction is ignored

- **GIVEN** a unit that has been destroyed
- **WHEN** a `UnitEjected` event for it is folded (for example from a P2P eject intent)
- **THEN** the unit SHALL remain destroyed and SHALL NOT be marked ejected

#### Scenario: Retreat after ejection is ignored

- **GIVEN** a unit whose pilot has ejected
- **WHEN** a `UnitRetreated` event for it is folded
- **THEN** the unit SHALL remain ejected and SHALL NOT be marked retreated

### Requirement: First Retreat Latch Keeps Its Edge

The retreat latch (`RetreatTriggered`, `isRetreating`) and the withdrawal latch (`WithdrawalDeclared`, `isWithdrawing`) share `retreatTargetEdge`. The first latch to be folded SHALL set the edge, and a later latch SHALL set its own flag without changing the edge. A player SHALL NOT be able to declare withdrawal for a unit that is already retreating.

#### Scenario: Withdrawal after a bot retreat keeps the retreat edge

- **GIVEN** a unit with `RetreatTriggered` toward the north edge
- **WHEN** a `WithdrawalDeclared` toward the south edge is folded
- **THEN** the unit's `retreatTargetEdge` SHALL remain north

#### Scenario: Bot retreat after a forced withdrawal keeps the withdrawal edge

- **GIVEN** a unit with a forced `WithdrawalDeclared` toward the south edge
- **WHEN** a `RetreatTriggered` toward the north edge is folded
- **THEN** the unit's `retreatTargetEdge` SHALL remain south

#### Scenario: Player cannot withdraw a retreating unit

- **GIVEN** a unit that is already retreating
- **WHEN** the player declares withdrawal for it
- **THEN** no `WithdrawalDeclared` event SHALL be emitted
