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

### Requirement: Campaign Domain Ledger Implementers

The intervention ledger SHALL allow campaign-domain implementers for `post-combat`, `economy`, `repair`, and `salvage` to share the same preview, apply, public projection, and private projection contract used by tactical combat interventions.

#### Scenario: Campaign implementer registers with ledger
- **GIVEN** a campaign intervention implementer for `economy`
- **WHEN** the implementer is registered with the intervention ledger
- **THEN** commands targeting the `economy` domain SHALL route through that implementer
- **AND** commands targeting unrelated domains SHALL NOT route through that implementer

#### Scenario: Campaign approval appends through shared action ledger
- **GIVEN** a ready campaign intervention preview and a shared action ledger
- **WHEN** the GM approves the preview
- **THEN** the intervention ledger SHALL append an approved campaign intervention record
- **AND** the action ledger SHALL append a GM intervention action after prior normal actions
- **AND** prior normal actions SHALL remain present

#### Scenario: Blocked campaign preview appends no action
- **GIVEN** a campaign preview is blocked, rejected, unsupported, deferred, or requires manual takeover
- **WHEN** the preview is not approved
- **THEN** the intervention ledger SHALL append no campaign intervention record
- **AND** the action ledger SHALL append no GM intervention action

### Requirement: Time Cascade Ledger Implementer

The intervention ledger SHALL allow a `time` campaign-domain implementer to share the same preview, apply, public projection, and private projection contract used by tactical combat and campaign correction interventions.

#### Scenario: Time implementer registers with ledger
- **GIVEN** a time-cascade intervention implementer
- **WHEN** the implementer is registered with the intervention ledger
- **THEN** commands targeting the `time` domain SHALL route through that implementer
- **AND** commands targeting unrelated domains SHALL NOT route through that implementer

#### Scenario: Time approval appends through shared action ledger
- **GIVEN** a ready time cascade preview and a shared action ledger
- **WHEN** the GM approves the preview
- **THEN** the intervention ledger SHALL append an approved time-cascade record
- **AND** the action ledger SHALL append a GM intervention action after prior normal actions
- **AND** prior normal actions SHALL remain present

#### Scenario: Blocked time preview appends no action
- **GIVEN** a time preview is blocked, rejected, unsupported, deferred, stale, or requires manual takeover
- **WHEN** the preview is not approved
- **THEN** the intervention ledger SHALL append no time-cascade record
- **AND** the action ledger SHALL append no GM intervention action

### Requirement: Immutable Ledger Read Snapshots

The intervention ledger system SHALL preserve append-only history by returning immutable top-level record snapshots from read and projection APIs. Callers SHALL NOT be able to mutate canonical ledger record fields through arrays or records returned by ledger reads.

#### Scenario: Intervention ledger records cannot be mutated through reads
- **GIVEN** an approved intervention record has been appended
- **WHEN** a caller reads intervention ledger records and attempts to mutate a returned record field
- **THEN** the canonical ledger record SHALL remain unchanged

#### Scenario: Action ledger projections cannot be mutated through reads
- **GIVEN** normal and GM intervention actions have been appended to the shared action ledger
- **WHEN** a caller reads player-public or GM-private projections and attempts to mutate a returned record field
- **THEN** the canonical action ledger record SHALL remain unchanged

### Requirement: Wave 8 Campaign Ledger QC Proof

The intervention ledger abstraction SHALL provide a focused QC validator for Wave 8 post-combat and base-economy GM ledger coverage. The validator MUST prove that supported campaign intervention domains preview, approve, replay, redact, and append through the shared intervention/action ledger contract without silently mutating campaign state before approval.

#### Scenario: Focused validator covers supported campaign domains

- **GIVEN** registered campaign intervention implementers for `post-combat`, `economy`, `repair`, and `salvage`
- **WHEN** the Wave 8 campaign ledger QC validator runs
- **THEN** it SHALL verify coverage anchors for every supported campaign domain
- **AND** it SHALL verify affected campaign roots for finances, repair tickets, salvage allocations, parts inventory, and base unit state or configuration

#### Scenario: Preview proof preserves no-mutation and redaction boundaries

- **GIVEN** a post-combat or base-economy correction with GM-private rationale and player-visible net effect
- **WHEN** the validator inspects the preview and focused tests before approval
- **THEN** campaign state SHALL remain unchanged before approval
- **AND** player-public projection SHALL expose only visible net effect and changed state references
- **AND** GM-private projection SHALL retain rationale, hidden notes, default outcome, and manual takeover notes

#### Scenario: Approval proof appends and replays deterministically

- **GIVEN** a ready campaign correction preview
- **WHEN** the GM approves it through the normal cascade pipeline
- **THEN** the intervention ledger SHALL append an approved campaign intervention record
- **AND** the shared action ledger SHALL append a GM intervention action after prior normal actions
- **AND** replaying the approved projected effects SHALL derive the same corrected campaign state

#### Scenario: Manual or blocked campaign preview appends nothing

- **GIVEN** a campaign correction preview that is blocked, unsupported, deferred, stale, or requires manual takeover
- **WHEN** normal approval is attempted
- **THEN** approval SHALL be blocked
- **AND** no intervention ledger record or action ledger record SHALL be appended
- **AND** campaign state SHALL remain unchanged
