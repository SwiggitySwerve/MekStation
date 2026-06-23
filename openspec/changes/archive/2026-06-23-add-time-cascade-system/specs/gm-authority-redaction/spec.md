## ADDED Requirements

### Requirement: Time Cascade Redaction

The system SHALL separate GM-private metadata from player-public net effects for accumulated time cascades. Player-facing campaign logs SHALL expose only approved net time, travel, repair, market, contract, recovery, upkeep, and visible changed state references.

#### Scenario: Player sees only net time cascade
- **GIVEN** an approved time cascade with a GM-private reason, default outcome, hidden notes, conflict analysis, and public summary
- **WHEN** a player views the action log or intervention projection
- **THEN** the projection SHALL show the public summary and visible campaign state references
- **AND** it SHALL NOT show the GM-private reason, default outcome, hidden notes, conflict analysis, or manual takeover notes

#### Scenario: GM sees full time cascade context
- **GIVEN** an approved time cascade with private metadata and public net effect
- **WHEN** the owning GM views the GM ledger projection
- **THEN** the projection SHALL include the GM-private metadata
- **AND** it SHALL include the same public net effect players can see
