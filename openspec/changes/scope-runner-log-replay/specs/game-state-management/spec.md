## ADDED Requirements

### Requirement: Interpretation of Standalone Runner History

The existing event fold SHALL remain deterministic for standalone runner logs.
Replaying such a history SHALL interpret its stored events in their supplied
order; it SHALL NOT imply that omitted phase boundaries or runner-private
bookkeeping have been reconstructed. This clarification SHALL NOT weaken
existing interactive, auto-resolve, multiplayer journal or P2P replay contracts.

#### Scenario: Interpret emitted turn and terminal events

- **GIVEN** a runner log containing `TurnStarted` and a final `GameEnded`
- **WHEN** a prefix through a turn-start event or the complete log is replayed
- **THEN** the replayed turn SHALL reflect the emitted turn-start boundary
- **AND** the complete replay's completed status, winner and reason SHALL reflect `GameEnded`

#### Scenario: Missing phase boundaries do not establish private-state equality

- **GIVEN** a standalone runner log without `PhaseChanged` events
- **WHEN** `deriveState` replays that log
- **THEN** the replay guarantee SHALL remain ordered deterministic playback
- **AND** no guarantee of matching runner-private unit state, derived phase state or authoritative resume SHALL be inferred
- **AND** this scope change SHALL add no synthetic event, payload change, persisted-format change or runtime admission fence
