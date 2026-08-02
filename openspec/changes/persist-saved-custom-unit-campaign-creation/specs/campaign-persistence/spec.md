## ADDED Requirements

### Requirement: Campaign Creation Server Commit

The production campaign-creation submit path SHALL report success only after the assembled campaign, roster projection, and root force receive an accepted `saved` result from the existing server-backed persistence path.

#### Scenario: Wizard submission awaits accepted server state

- **GIVEN** campaign creation contains a saved custom roster unit
- **WHEN** the player submits the wizard
- **THEN** the production path SHALL commit through the campaign persistence store and issue the existing server `PUT`
- **AND** success feedback and dashboard navigation SHALL wait for an accepted `saved` result
- **AND** browser-local state, a queued request, or a test-only helper SHALL NOT satisfy acceptance

#### Scenario: Accepted record preserves source and roster identity

- **WHEN** the production server accepts the campaign
- **THEN** the accepted record SHALL contain the same campaign id, roster-instance id, saved-design `unitRef`, and `custom` source kind
- **AND** the root force SHALL contain that roster-instance id
- **AND** no stock substitution or serialized construction payload SHALL replace the saved-design identity

#### Scenario: Failed server commit remains recoverable

- **GIVEN** the assembled campaign receives a transport, validation, or server error
- **WHEN** creation handles the result
- **THEN** it SHALL suppress success and navigation and show an actionable save failure
- **AND** it SHALL retain the pending campaign, roster, and root-force identities
- **AND** retry SHALL persist the same campaign id without duplicate campaign, roster, or root-force entries

#### Scenario: Concurrent submit cannot duplicate the commit

- **WHEN** the player activates submit again while the same campaign id is pending
- **THEN** the second activation SHALL be disabled or ignored
- **AND** an accepted result SHALL be applied exactly once

#### Scenario: Creation conflict never auto-overwrites server state

- **GIVEN** campaign creation receives `409 Conflict` for the pending campaign id
- **WHEN** the persistence path handles the conflict
- **THEN** it SHALL keep an explicit unresolved conflict and SHALL NOT adopt the server version and automatically re-submit the full local snapshot
- **AND** it SHALL NOT report success or navigate
- **AND** a player-initiated retry SHALL retain the same pending campaign id
- **AND** an intervening server record SHALL remain unchanged until an explicit resolution policy is invoked
