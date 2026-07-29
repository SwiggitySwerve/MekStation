## ADDED Requirements

### Requirement: Terminal Combat Outcome Uses Durable Outbox and Inbox
A terminal combat outcome SHALL append an outcome outbox record in the authoritative combat transaction. Campaign ingestion SHALL commit the resulting campaign event batch and a unique inbox receipt atomically before reconciliation is acknowledged.

#### Scenario: Outcome applies exactly once
- **WHEN** a finalized combat outcome reaches the campaign inbox
- **THEN** the campaign SHALL append one deterministic consequence batch and one unique receipt

#### Scenario: Duplicate outcome delivery is idempotent
- **WHEN** the same outcome identity and version is delivered more than once
- **THEN** the campaign SHALL return the existing receipt without repeating consequences

#### Scenario: Crash before campaign receipt retries safely
- **WHEN** the process fails after combat outcome commit but before campaign receipt commit
- **THEN** recovery SHALL redeliver from the combat outbox and SHALL apply the outcome once

### Requirement: Combat-Only Rewind Stops at Campaign Receipt
Combat rewind SHALL be permitted only while no accepted campaign receipt exists for the affected outcome version.

#### Scenario: Pre-receipt combat rewind proceeds
- **WHEN** the GM rewinds combat before the campaign accepts its outcome
- **THEN** the prior pending outcome SHALL be invalidated and no campaign consequence SHALL exist

#### Scenario: Post-receipt combat rewind rejects
- **WHEN** the GM attempts combat-only rewind after the campaign receipt committed
- **THEN** the command SHALL fail with a typed closed-boundary response directing the GM to coordinated retroactive outcome correction

### Requirement: Coordinated Outcome Correction Supersedes Across Journals
After campaign receipt, a GM-finalized outcome correction SHALL create a higher outcome version, explicit combat and campaign supersession records, and one replacement campaign consequence batch.

#### Scenario: Applied outcome is corrected
- **WHEN** the GM finalizes a corrected terminal result after campaign consequences exist
- **THEN** the new outcome version SHALL supersede the prior version and the campaign SHALL deterministically rebuild affected consequences

#### Scenario: Corrected outcome retry is idempotent
- **WHEN** the replacement outcome version is redelivered
- **THEN** the campaign SHALL return its existing replacement receipt without applying another correction batch

### Requirement: Next Scenario Requires Reconciled Active Outcome
Scenario N+1 SHALL not launch until the active outcome version for scenario N has a campaign receipt, all retained participants have converged on the active campaign branch, and invalidated artifacts have been replaced.

#### Scenario: Pending outcome blocks progression
- **WHEN** combat is terminal but its active outcome lacks a campaign receipt
- **THEN** the campaign SHALL show reconciliation pending and SHALL block next-scenario launch

#### Scenario: Superseded artifact blocks progression
- **WHEN** outcome correction invalidates a later scenario draft or force snapshot
- **THEN** the stale artifact SHALL be unusable until a replacement is committed and acknowledged

#### Scenario: Reconciled campaign continues
- **WHEN** the active outcome receipt exists and all retained participants acknowledge the active branch and scenario revision
- **THEN** scenario N+1 MAY materialize from that authoritative state

### Requirement: Outcome Provenance Is End-to-End
The combat and campaign journals SHALL preserve causal linkage from terminal combat facts through outbox, inbox receipt, campaign consequences, later corrections, and supersession.

#### Scenario: Audit traces outcome consequence
- **WHEN** an authorized viewer inspects a reconciled outcome
- **THEN** the audit system SHALL trace the outcome identity and version to the campaign receipt and consequence event range
