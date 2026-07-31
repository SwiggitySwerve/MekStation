## ADDED Requirements

### Requirement: Terminal Combat Outcome Reconciles Through a Versioned Receipt
A terminal combat transaction SHALL append the finalized outcome fact and outbox record together. The outbox SHALL bind the authoritative source match, server-derived target campaign, binding revision, and canonical outcome-command digest. The cross-stream identity SHALL use `effectType = combat-outcome`, the authoritative `outcomeId` as `effectId`, and the authoritative `outcomeVersion` as `effectVersion`, so campaign ingestion SHALL re-resolve that binding and append the consequence batch plus a unique target-scoped `(targetCampaignId, effectType, effectId, effectVersion)` receipt carrying the same digest together before reconciliation is acknowledged.

#### Scenario: Duplicate outcome delivery
- **WHEN** the same outcome version is delivered more than once
- **THEN** campaign ingestion SHALL return the prior receipt
- **AND** salvage, damage, finances, pilot state, and other consequences SHALL not apply again

#### Scenario: Outcome identity is reused with changed consequences
- **WHEN** delivery reuses an outcome identity and version with a different canonical outcome-command digest
- **THEN** campaign ingestion SHALL return a typed integrity conflict rather than the prior receipt
- **AND** it SHALL append no receipt, consequence event, or projection mutation

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
