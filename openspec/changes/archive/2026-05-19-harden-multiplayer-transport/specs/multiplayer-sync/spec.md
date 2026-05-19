## ADDED Requirements

### Requirement: Authoritative Server Is the Supported Transport

The system SHALL treat the authoritative server WebSocket as the supported transport for networked matches. The y-webrtc / peer-to-peer path SHALL be a non-authoritative fallback that receives no further hardening. The `mirrorSession` / `gameSessionChannel` event-application pattern SHALL be retained only as the client-side event-application layer, pointed at the server WebSocket rather than at y-webrtc.

#### Scenario: Networked match runs over the server transport

- **GIVEN** two players in a networked match
- **WHEN** the match is played
- **THEN** intents and events SHALL flow over the authoritative server WebSocket
- **AND** the match SHALL NOT depend on a y-webrtc peer connection for correctness

#### Scenario: Mirror pattern points at the server

- **GIVEN** a client participating in a networked match
- **WHEN** the client builds its mirror session
- **THEN** the mirror SHALL be fed by the server `Event` stream
- **AND** the `mirrorSession` / `gameSessionChannel` reducer SHALL be the client-side event-application layer for that stream

#### Scenario: P2P is a non-authoritative fallback

- **GIVEN** the y-webrtc peer-to-peer path
- **WHEN** the transport contract is inspected
- **THEN** the y-webrtc path SHALL be documented as a non-authoritative fallback
- **AND** authoritative roll capture, fog redaction, and intent integrity SHALL be provided only by the server path
