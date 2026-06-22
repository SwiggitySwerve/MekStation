# intervention-ledger-abstraction Specification

## Purpose

Defines the reusable append-only intervention ledger contract shared by combat, campaign, economy, repair, salvage, and time-cascade GM intervention domains.
## Requirements
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

### Requirement: Shared Action Ledger Stream
The intervention ledger system SHALL provide a shared append-only action ledger stream that can record normal actions, approved GM intervention actions, and system actions in one ordered history without truncating canonical gameplay or campaign events.

#### Scenario: Normal action and GM intervention share ordered history
- **GIVEN** a normal player action has been committed to the action ledger
- **WHEN** an approved GM intervention supersedes or fixes that normal action
- **THEN** the action ledger SHALL append a new GM intervention action after the normal action
- **AND** the original normal action SHALL remain present
- **AND** the GM intervention action SHALL preserve causality references to the normal action

#### Scenario: Blocked GM preview does not append action
- **GIVEN** a GM cascade preview is blocked, rejected, deferred, unsupported, or requires manual takeover
- **WHEN** the preview is not approved
- **THEN** the action ledger SHALL append no GM intervention action

### Requirement: Action Ledger Public And GM Projections
The action ledger SHALL expose player-public and GM-private projections. Player-public projections SHALL include normal public summaries and approved GM public net effects only. GM-private projections MAY include GM rationale, default outcome, hidden notes, manual takeover notes, and domain payload references.

#### Scenario: Player projection redacts GM-private data
- **GIVEN** the action ledger contains an approved GM intervention action with private metadata and public net effect
- **WHEN** a player views the action ledger projection
- **THEN** the projection SHALL include the public net effect and visible changed state
- **AND** it SHALL omit GM rationale, hidden notes, default outcome, and manual takeover notes

#### Scenario: GM projection includes private action context
- **GIVEN** the action ledger contains a normal action and an approved GM intervention action
- **WHEN** the owning GM views the action ledger projection
- **THEN** the projection SHALL include normal action public context
- **AND** it SHALL include the GM intervention private metadata and public net effect
