## ADDED Requirements

### Requirement: Combat Rewind Builds a Replacement Branch
Only authorized GM correction/rewind finalization SHALL create a combat replacement branch. Preview SHALL remain non-mutating, and activation SHALL occur only after deterministic combat, RNG, fog, sealed-choice, and viewer-projection validation.

#### Scenario: GM confirms valid rewind
- **WHEN** the GM confirms a preview against the current combat branch and revision
- **THEN** the authority SHALL create and verify a building replacement branch
- **AND** one activation transaction SHALL supersede the prior branch only after all checks pass

#### Scenario: Player command targets stale branch
- **WHEN** a command names a superseded combat branch
- **THEN** the server SHALL return `STALE_BRANCH` with the active head and resync action
- **AND** it SHALL append nothing

### Requirement: Commands Are Gated During Combat Rebuild
While a candidate combat branch is rebuilding, commands SHALL reject with `PROJECTION_REBUILDING` and SHALL NOT queue invisibly.

#### Scenario: Command arrives during rebuild
- **WHEN** any participant submits a combat command while branch verification is incomplete
- **THEN** the server SHALL return a retryable rebuilding response
- **AND** the effective branch SHALL remain unchanged
