# game-session-management Specification Delta

## ADDED Requirements

### Requirement: Rolls Embedded on Randomness-Consuming Events

For networked matches, every event whose resolution consumed dice SHALL
carry the rolled values on its payload so mirror clients and post-match
replays can display the identical outcome without re-rolling.

#### Scenario: InitiativeRolled carries rolls

- **GIVEN** the server resolves initiative with dice `(3,5)` for Player
  and `(2,4)` for Opponent
- **WHEN** the `InitiativeRolled` event is emitted
- **THEN** `payload.rolls` SHALL contain both sides' dice values keyed
  by side
- **AND** the payload SHALL be sufficient to reproduce the initiative
  winner without additional randomness

#### Scenario: AttackResolved carries all attack rolls

- **GIVEN** a weapon attack resolving in the Attack phase
- **WHEN** the `AttackResolved` event is emitted
- **THEN** `payload.rolls` SHALL include, in order, the attack roll,
  hit-location roll, cluster-hit roll (if applicable), and crit roll
  (if applicable)
- **AND** the order SHALL match the rule-book resolution sequence

#### Scenario: Deterministic events omit rolls

- **GIVEN** an event whose resolution is deterministic (e.g.,
  `MovementLocked`, `PhaseChanged`, `GameEnded`)
- **WHEN** the event is emitted in a networked match
- **THEN** the event MAY omit `payload.rolls`
- **AND** the absence SHALL NOT be treated as an error

### Requirement: Hot-Seat Backward Compatibility

For non-networked local matches, the system SHALL NOT require events to
carry `payload.rolls`, preserving existing event shapes from Phase 1.

#### Scenario: Local match event without rolls

- **GIVEN** a hot-seat session with no `hostPlayerId`
- **WHEN** an attack resolves
- **THEN** the emitted event MAY include or omit `payload.rolls`
- **AND** validation SHALL pass either way
