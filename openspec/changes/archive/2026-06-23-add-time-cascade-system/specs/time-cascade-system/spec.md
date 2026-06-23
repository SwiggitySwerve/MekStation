## ADDED Requirements

### Requirement: Time Cascade Preview

The system SHALL provide a GM-only time cascade preview for campaign time advancement. The preview SHALL include the requested day count, optional travel destination, before and after campaign dates, affected campaign state references, generated day summaries, projected event effects, public net effect, GM-private context, and conflicts. The preview SHALL NOT mutate campaign state before approval.

#### Scenario: Preview multi-day campaign advancement
- **GIVEN** an owning GM requests a three-day time cascade for a campaign
- **WHEN** the preview is produced
- **THEN** the preview SHALL include the before campaign date
- **AND** the preview SHALL include the projected after campaign date
- **AND** the preview SHALL include one ordered summary per projected day
- **AND** campaign state SHALL remain unchanged until approval

#### Scenario: Preview travel with time advancement
- **GIVEN** an owning GM requests travel to a destination system with a two-day travel window
- **WHEN** the preview is produced
- **THEN** the preview SHALL include the before and after system identifiers
- **AND** the preview SHALL include the two projected day summaries
- **AND** the player-public projection SHALL describe only the approved net travel and time effect

### Requirement: Time Cascade Effect Coverage

The time cascade preview SHALL project campaign-owned effects for date advancement, travel location, repair progress, contract expiration or closure, market refreshes, finances and upkeep, and campaign-owned unit state changes. Pilot recovery, roster progression, or vault-owned effects SHALL either be represented by explicit projected external patches or SHALL require manual takeover.

#### Scenario: Campaign-owned effects are represented
- **GIVEN** a time cascade changes campaign date, repair queue, finances, and command-extension markets
- **WHEN** the preview is produced
- **THEN** the preview SHALL include changed state references for each changed campaign root
- **AND** the approved record SHALL contain enough projected effect data to replay those changes without re-running random generation

#### Scenario: External roster effect requires manual takeover without projection
- **GIVEN** a projected day would heal or alter a roster-owned pilot
- **AND** the command does not include explicit projected roster patches
- **WHEN** the preview is produced
- **THEN** the preview SHALL require manual takeover
- **AND** no intervention ledger record SHALL be appended by normal approval

### Requirement: Time Cascade Approval Replay

The system SHALL append a time-cascade intervention record only after GM approval. Applying an approved time-cascade record SHALL derive campaign state from the record's stored projected effects rather than re-running day processors.

#### Scenario: Approved time cascade replays deterministically
- **GIVEN** a ready time cascade preview
- **WHEN** the GM approves it
- **THEN** the intervention ledger SHALL append an approved `time` record
- **AND** replaying the stored projected effects SHALL derive the same campaign date, location, repair, finance, mission, and market state shown in the preview

#### Scenario: Stale approval is blocked
- **GIVEN** a time cascade preview was produced from campaign state version `V1`
- **AND** the campaign changed to version `V2` before approval
- **WHEN** normal approval is attempted
- **THEN** the system SHALL block approval or require manual takeover
- **AND** no stale time-cascade record SHALL be appended automatically

### Requirement: Time Cascade Redaction

The system SHALL separate player-public net time effects from GM-private reason, hidden notes, default outcome, conflict analysis, and manual takeover notes.

#### Scenario: Player sees public time summary only
- **GIVEN** an approved time cascade contains GM-private rationale and hidden notes
- **WHEN** a player views the action ledger or public projection
- **THEN** the projection SHALL show the public net effect and visible changed state references
- **AND** it SHALL omit GM-private rationale, hidden notes, default outcome, conflict analysis, and manual takeover notes

#### Scenario: GM sees private time context
- **GIVEN** an approved time cascade contains public and private metadata
- **WHEN** the owning GM views the GM ledger projection
- **THEN** the projection SHALL include the GM-private metadata
- **AND** it SHALL include the same public net effect players can see
