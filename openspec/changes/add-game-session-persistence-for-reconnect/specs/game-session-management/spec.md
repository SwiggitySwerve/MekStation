# game-session-management Specification Delta

## ADDED Requirements

### Requirement: Session Rehydration Factory

The system SHALL provide a factory that rehydrates an `IGameSession`
from a persisted event log identified by match id.

#### Scenario: Factory rebuilds session from log

- **GIVEN** a persisted log of 40 events for `matchId='sess_abc'`
- **WHEN** `InteractiveSession.fromMatchLog('sess_abc')` is called
- **THEN** the returned session SHALL have 40 events in its `events`
  array
- **AND** the returned session's `currentState` SHALL equal the state
  derived by folding all 40 events through `deriveState`
- **AND** the session's `id` SHALL equal the log's `matchId`

#### Scenario: Factory throws on unknown match id

- **GIVEN** no persisted log for `matchId='sess_unknown'`
- **WHEN** `InteractiveSession.fromMatchLog('sess_unknown')` is called
- **THEN** the factory SHALL throw `"Match log not found"`

### Requirement: Non-Authoritative Local Match Status

The system SHALL recognize a local-only match status separate from the
session's authoritative `status`, used purely for UI feedback during
peer-pending windows in networked matches.

#### Scenario: Local status distinct from session status

- **GIVEN** a live networked match with `currentState.status =
GameStatus.Active`
- **WHEN** the guest disconnects
- **THEN** the host's `localMatchStatus` SHALL become `'guestPending'`
- **AND** the session's authoritative `currentState.status` SHALL
  remain `GameStatus.Active`

#### Scenario: Local status not persisted to event log

- **GIVEN** the host enters `localMatchStatus: 'guestPending'`
- **WHEN** the event log is inspected
- **THEN** no event SHALL record the pending state
- **AND** replaying the log on a fresh client SHALL NOT reproduce the
  local status
