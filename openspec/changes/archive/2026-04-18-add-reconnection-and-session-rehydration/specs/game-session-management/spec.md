# game-session-management Specification Delta

## ADDED Requirements

### Requirement: Match Pause Events

The system SHALL emit `match_paused` and `match_resumed` events as
part of the session event stream, authored by the server, to record
pause intervals in networked matches.

#### Scenario: Match paused event shape

- **GIVEN** a networked match pausing due to a pending seat
- **WHEN** the server emits the event
- **THEN** the event type SHALL be `match_paused`
- **AND** the payload SHALL contain `pendingSeats: string[]` (slot
  ids) and `graceRemaining: number` (seconds)
- **AND** the event SHALL be persisted to the match store and
  broadcast to all connected clients

#### Scenario: Match resumed event shape

- **GIVEN** a paused match whose pending seats have all reconnected
- **WHEN** the server emits the resume event
- **THEN** the event type SHALL be `match_resumed`
- **AND** the payload SHALL contain `pausedDurationMs: number`

### Requirement: Seat Fallback Events

The system SHALL record seat fallback decisions as session events so
post-match reports and spectators can reconstruct the sequence of
events that led to an AI replacement or forfeit.

#### Scenario: Seat replaced-by-AI event

- **GIVEN** the host chooses `'replace-with-ai'` for a timed-out seat
- **WHEN** the server acts
- **THEN** an `Event {type: 'seat_replaced_by_ai', payload: {slotId,
originalPlayerId, aiProfile}}` SHALL be appended
- **AND** the event SHALL be persisted before the bot starts producing
  intents

#### Scenario: Forfeit event

- **GIVEN** the host chooses `'forfeit-side'`
- **WHEN** the server acts
- **THEN** a `Event {type: 'side_forfeited', payload: {slotId,
originalPlayerId, forfeitedSide}}` SHALL be appended
- **AND** it SHALL be immediately followed by `GameEnded {reason:
'forfeit'}` in the same tick
