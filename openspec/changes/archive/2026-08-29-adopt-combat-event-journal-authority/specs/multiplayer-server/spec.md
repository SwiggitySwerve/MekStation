## ADDED Requirements

### Requirement: Combat Commit Precedes Engine Apply and Publication
The authoritative combat server SHALL decide the complete event batch and expected post-state digest for an accepted command, atomically append them at the expected match revision, and only then apply the committed batch to the live engine. It SHALL publish recipient projections only after the applied state digest matches the committed expected digest. A persistence failure SHALL publish no success and SHALL not advance the authoritative live engine.

#### Scenario: Durable append succeeds
- **WHEN** an accepted command batch commits
- **THEN** the server SHALL apply exactly that committed batch to memory
- **AND** it SHALL publish only after the commit receipt exists

#### Scenario: Durable append fails
- **WHEN** the expected revision conflicts or the transaction fails
- **THEN** the server SHALL not advance the authoritative engine or publish a success frame
- **AND** it SHALL return a typed conflict or blocked recovery action

#### Scenario: Committed batch produces an unexpected live state
- **WHEN** the applied state digest differs from the expected digest retained by the commit receipt
- **THEN** the server SHALL publish no success frame and SHALL quarantine the process-local projection
- **AND** it SHALL rebuild from the durable journal without deleting or compensating the committed batch

### Requirement: Combat Command Retry Is Idempotent
The server SHALL bind actor, match, branch, command kind, and payload digest to a stable command identity for the match lifetime.

#### Scenario: Client retries after uncertain response
- **WHEN** the same command is retried after reconnect or restart
- **THEN** the server SHALL return the original receipt and committed event range
- **AND** it SHALL not apply or publish the command a second time
