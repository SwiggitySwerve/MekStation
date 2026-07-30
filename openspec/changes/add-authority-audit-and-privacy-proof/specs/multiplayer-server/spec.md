## ADDED Requirements

### Requirement: Active Membership Precedes Every Authority Surface
The server SHALL resolve verified identity to active durable campaign/session/match membership before socket attachment, replay, raw journal/history lookup, command handling, effect ingestion, branch operation, timeline access, export, or publication. Actor, authority, role, campaign, match, participant, and ownership scope SHALL be server-derived; client claims SHALL NOT grant authority.

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
- **THEN** subsequent reads, commands, effects, and publications SHALL fail closed
- **AND** cached viewer context SHALL not outlive the validated membership revision
