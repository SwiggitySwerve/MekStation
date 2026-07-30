## ADDED Requirements

### Requirement: Campaign Correction Declares and Rebuilds Its Impact
A retroactive campaign correction SHALL declare every affected state and externalized artifact family before commit. The authority SHALL build a replacement branch from a trusted prior head, regenerate declared projections and artifacts, and activate only after deterministic validation. The immutable server-derived invalidation manifest SHALL identify each artifact and source revision it supersedes.

#### Scenario: GM moves campaign time backward
- **WHEN** the GM confirms a backward-time correction
- **THEN** the system SHALL rebuild chronology, missions, finances, roster/unit/pilot state, receipts, and declared derived artifacts on a candidate branch
- **AND** it SHALL not simulate rewind as negative forward-day mutation

#### Scenario: Externalized artifact becomes stale
- **WHEN** the candidate changes a mission, force selection, outcome, or readiness artifact already exposed to a client
- **THEN** activation SHALL atomically publish its invalidation or replacement identity
- **AND** later use of the stale artifact SHALL reject against its source branch/revision

### Requirement: Accepted Outcome Receipt Defines the Rewind Boundary
Combat-only rewind SHALL stop once the campaign has accepted the active outcome version. A post-receipt correction SHALL coordinate replacement combat and campaign facts through higher-version effect receipts.

#### Scenario: GM requests combat-only rewind after campaign receipt
- **WHEN** the active outcome version already has a campaign receipt
- **THEN** the server SHALL reject combat-only rewind with the coordinated-correction recovery action
- **AND** neither stream SHALL mutate
