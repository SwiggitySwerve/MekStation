## ADDED Requirements

### Requirement: Combat Rewind Builds a Replacement Branch
Only authorized GM correction/rewind finalization SHALL create a combat replacement branch. Preview SHALL remain non-mutating and bind finalization to the current branch, revision, digest, and generation. Activation SHALL occur only after deterministic combat, RNG, fog, sealed-choice, viewer-projection, and artifact validation.

#### Scenario: GM confirms valid rewind
- **WHEN** the GM confirms a preview against the unchanged expected combat head
- **THEN** the authority SHALL create and verify a building replacement branch
- **AND** one activation transaction SHALL supersede the prior branch only after every check and effect fence passes

#### Scenario: Player command targets stale branch
- **WHEN** a command names a superseded combat branch
- **THEN** the server SHALL return `STALE_BRANCH` with the active head and resync action
- **AND** it SHALL append nothing

### Requirement: Commands Are Explicitly Gated During Combat Rebuild
While a live correction lease rebuilds a combat branch, commands SHALL reject with `PROJECTION_REBUILDING` and SHALL NOT queue invisibly. Lease expiry or recovery SHALL be durable and explicit.

#### Scenario: Command arrives during rebuild
- **WHEN** any participant submits a combat command while branch verification is incomplete
- **THEN** the server SHALL return a retryable rebuilding response
- **AND** the effective branch SHALL remain unchanged

#### Scenario: Rebuild owner restarts
- **WHEN** the process owning a correction lease restarts
- **THEN** the authority SHALL resume or safely expire the durable lease
- **AND** it SHALL not leave the stream permanently gated or activate an unverified candidate
