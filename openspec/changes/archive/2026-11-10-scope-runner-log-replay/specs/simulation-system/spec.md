## ADDED Requirements

### Requirement: Standalone Runner Log Playback Scope

Standalone runner-log replay SHALL provide ordered deterministic playback of the
supplied event history. This guarantee SHALL NOT be interpreted as equality with
runner-private unit state or as a guarantee of authoritative resume. This scope
statement does not add a runtime admission fence.

#### Scenario: Repeated playback of a real-bot runner log

- **GIVEN** a completed standalone runner log starting with `GameCreated`
- **WHEN** the same game identifier and unchanged ordered events are replayed twice
- **THEN** both derived states SHALL be strictly equal
- **AND** replay SHALL preserve the supplied events without mutation
- **AND** roster identity, emitted turn boundaries and terminal interpretation SHALL follow that history

#### Scenario: Characterize the current private-state gap

- **GIVEN** seeds 1 through 8, four hydrated Atlas AS7-D units, ten turns and map radius 4
- **WHEN** each real runner's last invariant-checked units (the final End phase, or for seed 4, which ends during turn 6, the state after its last weapon attack) are compared with replayed units
- **THEN** the current characterization SHALL record fired-weapon differences for 17 of 32 units and phase-damage differences for 7 of 32
- **AND** all 32 runner units SHALL lack `activeMASC`, `empInterferenceTurns` and `empShutdownTurns` own keys while replayed units SHALL carry explicit false/zero defaults
- **AND** a future fix SHALL deliberately update the affected characterization rather than treating these differences as permanent game rules

#### Scenario: Stand-still playback is insufficient fidelity evidence

- **GIVEN** a stand-still log whose transient fields remain cleared
- **WHEN** its cleared field values agree with runner values
- **THEN** that observation SHALL NOT establish runner-private unit-state equality, matching key presence or authoritative resume
