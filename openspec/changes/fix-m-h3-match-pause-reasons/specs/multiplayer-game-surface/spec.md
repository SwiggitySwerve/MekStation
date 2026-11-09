## ADDED Requirements

### Requirement: Pause Reason Presentation

The networked game surface SHALL name why a match is paused. The client SHALL keep the `MatchPaused` reason with its pause state and SHALL show one short sentence for a GM-absent or opponent-fault pause. It SHALL show the reconnect countdown and record a reconnect grace only while the snapshot names a pending seat. A later snapshot SHALL replace the earlier one, and a snapshot without pending seats SHALL drop the earlier peer grace. A timed-out match SHALL stay aborted whatever the reason.

#### Scenario: Non-peer pause shows no countdown

- **GIVEN** a player or spectator in an active networked match
- **WHEN** the server broadcasts `MatchPaused` with `reason: 'gm-absent'` or `'opponent-fault'` and no pending seats
- **THEN** the overlay SHALL show that cause's sentence and no countdown
- **AND** the client SHALL NOT record a reconnect grace

#### Scenario: GM wait with a pending seat shows both

- **GIVEN** a match paused with `reason: 'gm-absent'` and a pending seat
- **WHEN** the overlay renders
- **THEN** it SHALL show the GM sentence, the pending seat and the countdown
