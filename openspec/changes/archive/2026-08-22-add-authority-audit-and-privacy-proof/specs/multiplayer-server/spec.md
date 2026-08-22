## ADDED Requirements

### Requirement: Active Membership Precedes Every Human Authority Surface
The server SHALL resolve verified identity to active durable campaign/session/match membership before socket attachment, replay, user-initiated raw journal/history lookup, human command handling, branch operation, timeline access, export, or publication. Actor, authority, role, campaign, match, participant, and ownership scope SHALL be server-derived; client claims SHALL NOT grant authority.

#### Scenario: Known match ID without membership
- **WHEN** an authenticated principal presents a valid match ID but has no active membership
- **THEN** the server SHALL attach no authority recipient and disclose no baseline, replay, live, timeline, or export payload
- **AND** it SHALL return or close with a typed authorization rejection

#### Scenario: Client claims GM role
- **WHEN** a player command claims a GM role, authority ID, campaign ID, or owned force not present in durable membership
- **THEN** the server SHALL ignore the claim for authorization
- **AND** it SHALL append no gameplay event, effect, or unauthorized audit detail

#### Scenario: Membership is revoked during a session
- **WHEN** a participant's durable membership revision becomes inactive
- **THEN** subsequent human reads, commands, and publications SHALL fail closed
- **AND** cached viewer context SHALL not outlive the validated membership revision

### Requirement: Non-Human Work Cannot Borrow Human Viewer Authority
`IAuthorizedViewer` construction SHALL remain server-internal and SHALL require verified identity plus active durable membership. Client input and internal non-human work SHALL NOT construct, serialize, borrow, or convert into a human viewer context. A subsystem-specific non-human capability MAY authorize only its explicitly admitted operation and SHALL grant no socket, replay, history, timeline, export, private-audit, branch, or human-command authority.

#### Scenario: Client claims an internal principal kind
- **WHEN** a client submits `viewer`, `system`, or other internal-principal fields without a server-derived active membership context
- **THEN** the server SHALL ignore those claims for authorization
- **AND** it SHALL attach no authority recipient and disclose no protected payload

#### Scenario: Non-human capability reaches a human surface
- **WHEN** an internal job presents a subsystem-specific non-human capability to a socket, replay, history, timeline, export, private-audit, branch, or human-command entrypoint
- **THEN** that surface SHALL reject it with no authority mutation
- **AND** it SHALL disclose no viewer or private record
