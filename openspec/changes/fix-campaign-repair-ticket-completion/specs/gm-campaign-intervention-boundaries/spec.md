## ADDED Requirements

### Requirement: GM Repair Completion Replay
GM repair completion SHALL record the concrete repaired unit, consumed inventory and completed ticket using existing projected effect families. Preview SHALL NOT mutate state. Replaying the approved effects SHALL yield the same campaign state across save and reload.

#### Scenario: Repair approval survives save and replay
- **GIVEN** an approved GM repair completion and its starting campaign
- **WHEN** the campaign and ledger record are saved, reloaded and replayed
- **THEN** replay SHALL reproduce the approved unit, inventory, ticket and intervention state exactly

#### Scenario: Canned action skips terminal work
- **GIVEN** terminal tickets ahead of active tickets in a queue
- **WHEN** the canned GM completion command is built
- **THEN** it SHALL target the first active ticket
