# game-engine-orchestration Delta Specification

## ADDED Requirements

### Requirement: Auto-Resolve Outcome Integrity

The game outcome returned by auto-resolve SHALL be consistent with the completed session's record: the reported turns-played count SHALL equal the number of turns actually executed, and the end reason 'turn_limit' SHALL only be reported when the executed turn count reached the configured turn limit.

#### Scenario: Turn-limit reason requires the limit to be reached

- **GIVEN** an auto-resolved battle with a configured turn limit of 9
- **WHEN** the outcome reports reason 'turn_limit'
- **THEN** the outcome's turns-played count SHALL be greater than or equal to 9

#### Scenario: Outcome statistics match the session record

- **GIVEN** a completed auto-resolved session
- **WHEN** the IGameOutcome is inspected
- **THEN** its turns-played, per-side losses, and damage totals SHALL match the session's event record

#### Scenario: Early termination reports its true reason

- **GIVEN** an auto-resolved battle that ends before the turn limit without eliminating either side
- **WHEN** the outcome is returned
- **THEN** the end reason SHALL identify the actual terminating condition (e.g., objective completion, stalemate detection) and SHALL NOT be reported as 'turn_limit'
