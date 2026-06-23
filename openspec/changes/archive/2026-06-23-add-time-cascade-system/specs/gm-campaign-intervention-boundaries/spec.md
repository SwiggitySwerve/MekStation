## MODIFIED Requirements

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

## ADDED Requirements

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
