## ADDED Requirements

### Requirement: GM Owned-State Authority

The system SHALL allow GM intervention actions only when the requesting actor has GM authority over the target game or campaign state. Presentation state such as tactical shell mode SHALL NOT be sufficient authority by itself.

#### Scenario: Owner GM can preview intervention
- **GIVEN** an actor with GM authority over game `G`
- **WHEN** the actor requests a GM intervention preview for game `G`
- **THEN** the system SHALL evaluate the intervention request
- **AND** the system SHALL return either a preview, conflict list, or blocked result

#### Scenario: Non-owner player is rejected
- **GIVEN** an actor without GM authority over game `G`
- **WHEN** the actor requests a GM intervention preview for game `G`
- **THEN** the system SHALL reject the request before preview generation
- **AND** no GM intervention event SHALL be appended
- **AND** no GM-private metadata SHALL be returned to the actor

### Requirement: GM Private Metadata Redaction

The system SHALL separate GM-private metadata from player-public net effects for every GM intervention. GM-private metadata SHALL NOT appear in player-facing action logs, player replay streams, player event projections, or non-GM UI state.

#### Scenario: Player log receives only public net effect
- **GIVEN** an approved GM intervention with a private reason and a public summary
- **WHEN** a non-GM player views the action log
- **THEN** the log SHALL show the public summary and resulting changed state
- **AND** the log SHALL NOT show the private reason, hidden notes, default outcome, or manual takeover notes

#### Scenario: GM ledger receives full intervention detail
- **GIVEN** an approved GM intervention with private metadata and a public summary
- **WHEN** the owning GM views the GM ledger
- **THEN** the ledger SHALL show the private metadata
- **AND** the ledger SHALL show the public net effect that players can see

### Requirement: Authorization Failure Logging

The system SHALL log rejected GM intervention attempts with actor, target, domain, and rejection reason, but SHALL NOT log GM-private metadata to player-visible logs.

#### Scenario: Unauthorized request produces safe log
- **GIVEN** a non-owner player attempts a GM intervention
- **WHEN** the authority guard rejects the request
- **THEN** the system SHALL produce an internal rejection log entry
- **AND** no player-visible log entry SHALL include private GM metadata
