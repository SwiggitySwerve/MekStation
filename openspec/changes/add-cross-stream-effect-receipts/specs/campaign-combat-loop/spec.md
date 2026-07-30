## ADDED Requirements

### Requirement: Terminal Combat Outcome Reconciles Through a Versioned Receipt
A terminal combat transaction SHALL append the finalized outcome fact and outbox record together. The outbox SHALL bind the authoritative source match and server-derived target campaign. Campaign ingestion SHALL re-resolve that binding and append the consequence batch plus a unique `(targetCampaignId, outcomeId, outcomeVersion)` receipt together before reconciliation is acknowledged.

#### Scenario: Duplicate outcome delivery
- **WHEN** the same outcome version is delivered more than once
- **THEN** campaign ingestion SHALL return the prior receipt
- **AND** salvage, damage, finances, pilot state, and other consequences SHALL not apply again

#### Scenario: Scenario progression checks receipt
- **WHEN** the next scenario is requested
- **THEN** launch SHALL remain blocked until the active outcome version has a campaign receipt and its projection is current

#### Scenario: Outcome is routed to a different campaign
- **WHEN** the delivered target campaign does not match the source match's durable campaign binding
- **THEN** campaign ingestion SHALL reject the effect without mutation
- **AND** the source outbox SHALL remain visibly blocked for operator recovery

### Requirement: Cross-Stream Failure Is Recoverable Without False Success
Source and target authorities SHALL expose pending, retrying, blocked, and applied effect states truthfully.

#### Scenario: Campaign is unavailable after combat commit
- **WHEN** the match outcome commits but campaign ingestion is unavailable
- **THEN** combat history SHALL remain committed and the outbox SHALL remain pending
- **AND** the UI SHALL not claim campaign reconciliation completed
