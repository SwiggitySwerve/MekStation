## ADDED Requirements

### Requirement: Terminal Combat Outcome Reconciles Through a Versioned Receipt
A terminal combat transaction SHALL append the finalized outcome fact and outbox record together. Campaign ingestion SHALL append the consequence batch and a unique `(outcomeId, outcomeVersion)` receipt together before reconciliation is acknowledged.

#### Scenario: Duplicate outcome delivery
- **WHEN** the same outcome version is delivered more than once
- **THEN** campaign ingestion SHALL return the prior receipt
- **AND** salvage, damage, finances, pilot state, and other consequences SHALL not apply again

#### Scenario: Scenario progression checks receipt
- **WHEN** the next scenario is requested
- **THEN** launch SHALL remain blocked until the active outcome version has a campaign receipt and its projection is current

### Requirement: Cross-Stream Failure Is Recoverable Without False Success
Source and target authorities SHALL expose pending, retrying, blocked, and applied effect states truthfully.

#### Scenario: Campaign is unavailable after combat commit
- **WHEN** the match outcome commits but campaign ingestion is unavailable
- **THEN** combat history SHALL remain committed and the outbox SHALL remain pending
- **AND** the UI SHALL not claim campaign reconciliation completed
