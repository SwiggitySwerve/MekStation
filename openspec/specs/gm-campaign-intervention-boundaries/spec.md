# gm-campaign-intervention-boundaries Specification

## Purpose

Defines the campaign boundary for GM interventions, including ledger-backed post-combat, economy, repair, salvage, and accumulated time-cascade domains once each implementer declares safe mutable roots and public projections.
## Requirements
### Requirement: First Slice Defers Campaign Cascades

The campaign intervention boundary SHALL support ledger-backed post-combat amendments, base/economy corrections, repair corrections, salvage corrections, and accumulated time cascades through registered domain implementers. Registered time-cascade implementers SHALL declare safe mutable roots, public projections, and manual-takeover conflict handling before applying any campaign time mutation.

#### Scenario: Base economy intervention previews without silent mutation
- **GIVEN** a GM requests a merchant transaction reversal for an owned campaign
- **WHEN** the intervention pipeline evaluates the request with the economy implementer registered
- **THEN** the system SHALL return either a ready preview or a manual-takeover preview with changed finance and inventory state references
- **AND** the system SHALL NOT mutate campaign finances or inventory before approval

#### Scenario: Post-combat, repair, and salvage interventions are routed to campaign implementers
- **GIVEN** registered intervention implementers for `post-combat`, `repair`, and `salvage`
- **WHEN** a GM previews targeted corrections for unit state, repair tickets, or salvage allocations
- **THEN** the system SHALL route those commands through the registered campaign implementers
- **AND** the preview SHALL include public net effect and GM-private metadata

#### Scenario: Time cascade intervention is routed to campaign time implementer
- **GIVEN** a registered intervention implementer for `time`
- **WHEN** a GM previews an accumulated time correction
- **THEN** the system SHALL route the command through the registered time-cascade implementer
- **AND** the system SHALL NOT advance or rewind campaign time before approval

### Requirement: Future Campaign Implementer Seams

The system SHALL document and preserve extension seams for intervention ledger implementers that target post-combat, base/economy, repair, salvage, and accumulated time domains. Supported campaign-domain implementers SHALL identify the state roots they can mutate and the public projection fields that non-GM players may see. Deferred domains SHALL identify why they cannot mutate state in the current slice.

#### Scenario: Supported campaign domain declares required state roots
- **GIVEN** a campaign-domain implementer is registered
- **WHEN** it declares its intervention domain
- **THEN** it SHALL identify the state roots it can mutate
- **AND** it SHALL identify the public projection fields that non-GM players may see

#### Scenario: Supported time domain declares cascade roots
- **GIVEN** the accumulated time domain has a registered safe implementer
- **WHEN** a GM previews a time correction
- **THEN** the preview SHALL identify the affected travel, repair progress, contract window, market refresh, pilot recovery, upkeep, and campaign date roots
- **AND** the preview SHALL explicitly mark external-store effects as projected or manual-takeover conflicts

### Requirement: Deferred Domain Logging

The system SHALL log deferred domain intervention attempts so missing campaign support is visible during testing without applying unsupported state changes.

#### Scenario: Deferred request is logged safely
- **GIVEN** a GM requests a deferred time cascade intervention
- **WHEN** the intervention pipeline returns a deferred result
- **THEN** the system SHALL log the domain, actor, target refs, and deferred reason
- **AND** the log SHALL NOT include hidden scenario notes in any player-visible output

### Requirement: Ledger-Backed Campaign Correction Domains

The system SHALL provide campaign intervention implementers for `post-combat`, `economy`, `repair`, and `salvage`. These implementers SHALL support targeted corrections for salvage allocations, repair tickets, funds transactions, parts inventory lots, and base unit state or configuration roots.

#### Scenario: GM previews targeted campaign correction
- **GIVEN** the owning GM requests a targeted campaign correction
- **WHEN** the correction references an existing supported campaign root or provides a complete replacement for that root
- **THEN** the preview SHALL be ready
- **AND** the preview SHALL include changed state references for only the affected campaign roots
- **AND** no campaign state SHALL be mutated before approval

#### Scenario: Ambiguous campaign cascade requires manual takeover
- **GIVEN** a campaign correction declares unresolved cascading conflicts
- **WHEN** the GM requests a preview
- **THEN** the preview SHALL require manual takeover
- **AND** the approval pipeline SHALL NOT append the intervention automatically

#### Scenario: Approved campaign correction replays from ledger record
- **GIVEN** a ready campaign correction preview
- **WHEN** the GM approves it
- **THEN** the intervention ledger SHALL append an approved campaign intervention record
- **AND** replaying the record's projected effects SHALL derive the same corrected campaign state

### Requirement: Ledger-Backed Time Cascade Domain

The system SHALL provide a campaign intervention implementer for `time`. The implementer SHALL support targeted time advancement, optional travel destination changes, repair progression, contract window updates, market refreshes, pilot recovery projections, upkeep, and accumulated campaign effects.

#### Scenario: GM previews targeted time cascade
- **GIVEN** the owning GM requests a targeted time cascade
- **WHEN** the correction references an owned campaign and a positive day count
- **THEN** the preview SHALL be ready unless conflicts require manual takeover
- **AND** the preview SHALL include changed state references for only the affected campaign roots
- **AND** no campaign state SHALL be mutated before approval

#### Scenario: Ambiguous time cascade requires manual takeover
- **GIVEN** a time cascade declares unresolved external-store or stale-state conflicts
- **WHEN** the GM requests a preview
- **THEN** the preview SHALL require manual takeover
- **AND** the approval pipeline SHALL NOT append the intervention automatically

#### Scenario: Approved time cascade replays from ledger record
- **GIVEN** a ready time cascade preview
- **WHEN** the GM approves it
- **THEN** the intervention ledger SHALL append an approved time intervention record
- **AND** replaying the record's projected effects SHALL derive the same corrected campaign state

### Requirement: Campaign Correction QC Coverage Matrix

The campaign intervention boundary SHALL expose a QC coverage matrix for supported post-combat/base-economy GM correction domains and families.

#### Scenario: Supported domains remain represented

- **WHEN** the campaign ledger QC validator runs
- **THEN** it SHALL verify registered support for `post-combat`, `economy`, `repair`, and `salvage`
- **AND** missing support for any represented domain SHALL fail validation with a targeted reason

#### Scenario: Supported correction families remain represented

- **WHEN** the campaign ledger QC validator runs
- **THEN** it SHALL verify salvage allocation, repair ticket, funds transaction, inventory lot, and base unit state correction families
- **AND** missing support for any represented family SHALL fail validation with a targeted reason

### Requirement: Time Cascade QC Coverage Matrix

The campaign intervention boundary SHALL expose a QC coverage matrix for the supported time-cascade GM correction domain and family.

#### Scenario: Supported time domain remains represented

- **WHEN** the time-cascade QC validator runs
- **THEN** it SHALL verify registered support for `time`
- **AND** missing support for the represented domain SHALL fail validation with a targeted reason

#### Scenario: Supported time correction family remains represented

- **WHEN** the time-cascade QC validator runs
- **THEN** it SHALL verify `time-advance` correction-family coverage
- **AND** missing support for the represented family SHALL fail validation with a targeted reason

#### Scenario: Safe mutable roots remain represented

- **WHEN** the time-cascade QC validator runs
- **THEN** it SHALL verify anchors for date, travel, repair, contract, market, finance, and campaign-owned unit-state roots
- **AND** it SHALL verify external-store effects remain explicit projected effects or manual-takeover conflicts

### Requirement: Player-Safe Campaign Ledger Route

The campaign GM intervention route SHALL separate mutable GM controls from player-public ledger review. A viewer without campaign GM authority SHALL be allowed to inspect public campaign correction effects when they are part of that campaign mirror, but SHALL NOT access GM-private metadata or mutation controls.

#### Scenario: Player mirror direct route is read-only

- **GIVEN** a campaign mirror containing approved GM campaign or time-cascade projected effects
- **AND** the local viewer has no campaign GM authority
- **WHEN** the viewer opens the GM ledger route directly
- **THEN** the route SHALL render public summaries for the projected effects
- **AND** it SHALL not render preview, approve, or manual-takeover buttons
- **AND** it SHALL not render GM rationale, hidden notes, default outcome, or manual takeover notes

#### Scenario: Owning GM route remains mutable

- **GIVEN** a single-player campaign owner or co-op host opens the GM ledger route
- **WHEN** the route renders
- **THEN** the GM preview, approval, and manual-takeover controls SHALL remain available
- **AND** the GM-private projection MAY include private metadata for that owner/host viewer
