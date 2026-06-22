## ADDED Requirements

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
