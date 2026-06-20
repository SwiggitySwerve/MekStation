## ADDED Requirements

### Requirement: Reusable Intervention Ledger Interface

The system SHALL define a reusable append-only intervention ledger abstraction that can be implemented by combat, campaign, economy, repair, salvage, and time-cascade domains without changing the public GM intervention contract.

#### Scenario: Domain implements ledger interface
- **GIVEN** a domain-specific implementer for combat interventions
- **WHEN** the implementer is registered with the intervention ledger
- **THEN** the implementer SHALL expose append, preview projection, public projection, private projection, and replay application entry points
- **AND** the implementer SHALL identify its domain key

#### Scenario: Unsupported domain is explicit
- **GIVEN** no registered implementer exists for domain `economy`
- **WHEN** a GM intervention command targets domain `economy`
- **THEN** the ledger abstraction SHALL return an explicit unsupported result
- **AND** the ledger SHALL NOT silently mutate economy state

### Requirement: Append-Only Causality Contract

The intervention ledger SHALL append approved intervention records and SHALL preserve causality references to prior events, prior intervention records, or affected state references. It SHALL NOT truncate canonical gameplay or campaign history.

#### Scenario: Superseding correction preserves original event
- **GIVEN** a prior event `E` exists in canonical history
- **WHEN** an approved GM correction supersedes `E`
- **THEN** the ledger SHALL append a new intervention record linked to `E`
- **AND** event `E` SHALL remain present in history

### Requirement: Private and Public Ledger Projections

The intervention ledger SHALL expose separate projection functions for GM-private review and player-public output. Public projection SHALL include only net effect and visible changed state. Private projection MAY include GM reason, default outcome, hidden notes, and manual takeover notes.

#### Scenario: Same record projects differently by viewer authority
- **GIVEN** an intervention record with private metadata and public net effect
- **WHEN** the record is projected for a player
- **THEN** the projection SHALL omit private metadata
- **WHEN** the same record is projected for the owning GM
- **THEN** the projection MAY include private metadata
