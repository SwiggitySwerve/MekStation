## MODIFIED Requirements

### Requirement: Session Publishes Outcome Ready Event

Upon completion, InteractiveSession SHALL publish CombatOutcomeReady carrying the session id, match id and derived ICombatOutcome, unless publication is suppressed or acknowledged by its publication journal. Publication status SHALL derive from that journal rather than an independent boolean. At least one nonthrowing synchronous subscriber constitutes consumption; no subscribers or all subscribers throwing leaves the outcome pending. Every swallowed subscriber exception SHALL be logged and SHALL NOT propagate out of the engine.

#### Scenario: Event published on completion

- **GIVEN** an active session that transitions to Completed
- **WHEN** the completion handler runs
- **THEN** CombatOutcomeReady SHALL be published on the session bus
- **AND** its payload SHALL include the full ICombatOutcome
- **AND** the outcome SHALL also be POSTed to `/api/matches`

#### Scenario: Throwing subscriber remains retryable

- **GIVEN** the only subscribed listener throws
- **WHEN** the completion handler publishes CombatOutcomeReady
- **THEN** the exception SHALL be caught and logged without propagating out of the engine
- **AND** publication SHALL remain pending and permit a subsequent retry

#### Scenario: New completion is consumed

- **WHEN** at least one subscriber consumes a newly completed outcome
- **THEN** the session SHALL acknowledge its terminal-event journal entry and queue durable acknowledgement
- **AND** subsequent finalization attempts SHALL NOT publish it again

#### Scenario: No consumer or every consumer fails

- **WHEN** no subscriber consumes the outcome
- **THEN** its journal SHALL remain pending and allow a later retry

#### Scenario: Pending completion recovers

- **GIVEN** a completed log with a pending publication record
- **WHEN** production cold recovery runs with a consumer
- **THEN** the outcome SHALL be delivered and acknowledged

#### Scenario: Acknowledged completion recovers

- **GIVEN** a completed log with an acknowledged publication record
- **WHEN** the session recovers and its outcome is requested
- **THEN** it SHALL derive its outcome without publishing again

#### Scenario: Historical completed log has no receipt

- **GIVEN** a completed historical log with no publication receipt
- **WHEN** the session recovers
- **THEN** it SHALL be treated as already acknowledged and SHALL NOT republish

#### Scenario: Reentrant subscriber

- **WHEN** a subscriber requests the outcome during publication
- **THEN** the session SHALL derive the result without recursively publishing it

#### Scenario: Scratch decision session

- **WHEN** a suppressed scratch session completes
- **THEN** its state SHALL finalize without bus publication or durable acknowledgement of the live session

#### Scenario: Crash after delivery

- **WHEN** a crash occurs after consumption but before acknowledgement persistence
- **THEN** recovery MAY deliver again
- **AND** consumers requiring unique effects SHALL deduplicate by match identity or durable receipt
