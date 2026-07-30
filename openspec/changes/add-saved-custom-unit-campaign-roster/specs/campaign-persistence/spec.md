## ADDED Requirements

### Requirement: Campaign Creation Server Commit

The production campaign-creation submit path SHALL report success only after the assembled campaign, roster projection, and root force have been accepted by the existing server-persistence path. The accepted record SHALL preserve the campaign id, roster-instance id, custom source `unitRef`, and `unitSource`. A test-only save helper or browser-local snapshot SHALL NOT satisfy this commit.

#### Scenario: Wizard submission awaits accepted server state

- **GIVEN** campaign creation contains a saved custom roster unit
- **WHEN** the player submits the wizard
- **THEN** the production submit path SHALL commit the local campaign and call the campaign persistence store
- **AND** success feedback and dashboard navigation SHALL wait for a `saved` server result
- **AND** the accepted server record SHALL contain the same campaign id, roster-instance id, custom `unitRef`, and `custom` source kind

#### Scenario: Failed server commit remains recoverable

- **GIVEN** the local campaign has been assembled but its server commit returns an error or unresolved conflict
- **WHEN** creation handles that result
- **THEN** it SHALL suppress success feedback and dashboard navigation
- **AND** it SHALL show an actionable save failure without discarding the pending campaign
- **AND** retry SHALL persist the same campaign id rather than creating a duplicate campaign

#### Scenario: Creation conflict never auto-overwrites server state

- **GIVEN** campaign creation receives `409 Conflict` for the pending campaign id
- **WHEN** the creation persistence path handles the conflict
- **THEN** it SHALL keep explicit conflict state and SHALL NOT automatically re-submit the full local snapshot using the server's current version
- **AND** it SHALL NOT report success or navigate
- **AND** an intervening server record SHALL remain unchanged until the player explicitly resolves the conflict
