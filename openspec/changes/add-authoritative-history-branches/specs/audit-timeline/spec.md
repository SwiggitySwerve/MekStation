## ADDED Requirements

### Requirement: Timeline Preserves Branch and Supersession History
An authorized timeline SHALL show accessible effective, building, blocked, and superseded branches with parent/base, actor, reason, impact, activation, and supersession provenance. It SHALL preserve prior facts and apply viewer projection before serialization. Prior-head inspection SHALL be read-only and SHALL NOT acquire effect leases, dispatch effects, or move authoritative reconnect/live cursors.

#### Scenario: GM inspects prior campaign session
- **WHEN** the GM selects a prior branch head from an earlier session
- **THEN** the resolver SHALL reconstruct state at that explicit head
- **AND** the timeline SHALL identify the applied event range, checkpoint if any, projector version, and integrity digest

#### Scenario: Player inspects rewound history
- **WHEN** a player opens the branch timeline
- **THEN** the response SHALL contain only player-authorized facts and gapless viewer-local delivery identities
- **AND** GM-private reasons, hidden facts, inaccessible branch identifiers, and inferable private gaps SHALL remain absent

### Requirement: Branch Activation UX Is Accessible and Recoverable
Branch status, impact, confirmation, rebuild progress, correction-saga state, failure, and recovery actions SHALL remain visible at desktop and narrow viewports and SHALL be keyboard operable.

#### Scenario: Activation fails validation
- **WHEN** a branch activation attempt fails
- **THEN** focus SHALL move to a persistent error summary with a typed recovery action
- **AND** an assistive-technology announcement SHALL identify that the prior branch remains authoritative
