## ADDED Requirements

### Requirement: Local Outcome Publication Sidecar

Local match storage SHALL persist publication receipts separately from gameplay event payloads. Each new engine completion's terminal event and explicit pending publication intent SHALL commit atomically, keyed by match and terminal-event identity. Ordinary mirrored or imported events SHALL NOT create publication intent.

#### Scenario: New terminal event

- **WHEN** the engine persists a new GameEnded with its publication intent
- **THEN** its pending publication record SHALL commit in the same transaction

#### Scenario: Replicated or imported completion

- **WHEN** an ordinary P2P or replay append persists a terminal event
- **THEN** storage SHALL NOT invent a pending publication receipt
- **AND** recovering that completed history without a receipt SHALL NOT publish an outcome

#### Scenario: Mismatched publication intent

- **WHEN** an append supplies publication intent for another match or terminal event
- **THEN** storage SHALL reject it before writing the event

#### Scenario: Terminal batch fails

- **WHEN** a terminal-event batch fails
- **THEN** neither its event suffix nor its pending receipts SHALL commit

#### Scenario: Acknowledgement survives restart and duplicate append

- **GIVEN** a consumed outcome with a persisted acknowledgement
- **WHEN** storage reopens or its terminal event is appended again
- **THEN** the acknowledgement SHALL remain acknowledged

#### Scenario: Historical log migration

- **GIVEN** a version-two completed log with no publication receipt
- **WHEN** storage migrates
- **THEN** its events SHALL remain unchanged
- **AND** migration SHALL NOT create a pending publication record
- **AND** replaying the same stored terminal event SHALL preserve that absence

#### Scenario: Match retention

- **WHEN** an old completed match is purged
- **THEN** its publication sidecar records SHALL be removed in the same retention transaction
