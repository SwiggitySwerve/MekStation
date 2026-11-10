## ADDED Requirements

### Requirement: Private intent refusals
The server SHALL send an intent refusal only to the connection that submitted that intent. It SHALL NOT publish a refusal frame, intent ID or refusal notification to any other player, spectator or second connection belonging to the sender. Successful event and lobby publication, existing fatal infrastructure shutdown, reconnect recovery and fog admission SHALL retain their existing behavior.

#### Scenario: Refused player command
- **GIVEN** two players and a spectator attached to a hosted match
- **WHEN** one player submits an intent refused by an integrity, authorization, lifecycle or engine gate
- **THEN** only the submitting connection SHALL receive the Error with its intent ID
- **AND** other connections SHALL receive no frame from that refusal
- **AND** the rejection audit SHALL be attempted before the reply where the existing audit applies

#### Scenario: Refused spectator or lobby command
- **GIVEN** attached players and a spectator
- **WHEN** a spectator intent, lobby mutation, branch admission or journal-authority command is refused
- **THEN** the refusal SHALL be addressed only to the submitting connection
- **AND** successful lobby transitions SHALL still publish LobbyUpdated

### Requirement: Fixed refusal diagnostics
Every hosted intent refusal SHALL use an existing protocol code and fixed wording owned by the server refusal module. Raw engine, authorization and persistence diagnostics SHALL be logged server-side with match ID and intent ID and SHALL NOT appear on any wire frame. Generic INVALID_INTENT and AUTH_REJECTED wording SHALL NOT distinguish hidden-state causes.

#### Scenario: Engine exception
- **GIVEN** an engine throws a diagnostic containing private state
- **WHEN** the host refuses the intent
- **THEN** the sender SHALL receive INVALID_INTENT with fixed wording
- **AND** the raw diagnostic SHALL appear only in the server logger

#### Scenario: Existing client receives no opponent refusal
- **GIVEN** an existing client with only its own pending intents
- **WHEN** another player's intent is refused without broadcasting
- **THEN** its readiness, pending intents and replay cursor SHALL remain unchanged
- **AND** the sender's refusal SHALL still settle that sender's pending intent

#### Scenario: Unit existence probes
- **GIVEN** a socket submits a unit-scoped command for an unknown or foreign unit
- **WHEN** the unit guard refuses that command
- **THEN** both cases SHALL receive the same INVALID_INTENT code and fixed wording
- **AND** the response SHALL NOT identify whether the unit exists
