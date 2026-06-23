## ADDED Requirements

### Requirement: Campaign Correction Redaction

The system SHALL separate GM-private metadata from player-public net effects for post-combat, economy, repair, and salvage corrections. Player-facing campaign logs SHALL expose only the approved net effect and visible changed state references.

#### Scenario: Player sees only net campaign correction
- **GIVEN** an approved campaign correction with a GM-private reason, default outcome, hidden notes, and a public summary
- **WHEN** a player views the action log or intervention projection
- **THEN** the projection SHALL show the public summary and visible campaign state references
- **AND** it SHALL NOT show the GM-private reason, default outcome, hidden notes, or manual takeover notes

#### Scenario: GM sees full campaign correction context
- **GIVEN** an approved campaign correction with private metadata and public net effect
- **WHEN** the owning GM views the GM ledger projection
- **THEN** the projection SHALL include the GM-private metadata
- **AND** it SHALL include the same public net effect players can see
