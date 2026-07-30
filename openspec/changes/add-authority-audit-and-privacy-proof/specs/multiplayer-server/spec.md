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

### Requirement: System Effect Principal Is Narrow and Non-Human
Internal effect ingestion SHALL require a non-serializable server-minted principal bound to one committed outbox effect, source stream/branch/event, source effective generation, durable delivery-admission token, target campaign, and binding revision. A lease alone SHALL NOT mint this principal. It SHALL authorize only that target semantic effect ingestion and SHALL NOT attach, view/render history, access private audit, submit other commands, or impersonate a GM/player.

#### Scenario: Worker retries after all human memberships are revoked
- **WHEN** a committed outcome effect retries after its human participants are inactive
- **THEN** the system principal MAY deliver only the still-valid bound effect
- **AND** it SHALL gain no human viewer or command authority

#### Scenario: Worker reuses principal for another target
- **WHEN** a worker presents the principal for a different effect, campaign, source branch generation, delivery-admission token, or binding revision
- **THEN** ingestion SHALL reject without target mutation
- **AND** no history or private record SHALL be disclosed
