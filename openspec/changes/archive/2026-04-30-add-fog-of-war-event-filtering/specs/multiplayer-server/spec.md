# multiplayer-server Specification Delta

## ADDED Requirements

### Requirement: Per-Client Broadcast With Visibility Filter

The server SHALL broadcast events to connected clients on a per-client
basis when a match has fog-of-war enabled, applying the visibility
filter to each event for each destination player.

#### Scenario: Filter runs per connected client

- **GIVEN** a fog-on match with 4 connected clients belonging to
  different sides
- **WHEN** the server broadcasts an event
- **THEN** the server SHALL run `filterEventForPlayer` once per
  connected client
- **AND** SHALL send the (possibly redacted) result only if the
  filter returned a non-null value

#### Scenario: Filter is bypassed when fog disabled

- **GIVEN** a match with `config.fogOfWar: false`
- **WHEN** the server broadcasts an event
- **THEN** the server SHALL send the identical event to every
  connected client
- **AND** SHALL NOT invoke the visibility filter

#### Scenario: Spec visibility of deterministic events

- **GIVEN** a `PhaseChanged` event in a fog-on match
- **WHEN** the server broadcasts it
- **THEN** every connected client SHALL receive the event in full
- **AND** the filter SHALL not redact any fields

### Requirement: Visibility Tied to Authoritative State

The server SHALL evaluate visibility using its authoritative
`IGameState`, NOT any client-provided state, so fog decisions cannot
be gamed by a malicious client reporting false LOS.

#### Scenario: Authoritative state consulted

- **GIVEN** a fog-on match
- **WHEN** the visibility filter runs
- **THEN** the `state` argument passed to `canPlayerSeeUnit` SHALL be
  the server's `currentState`
- **AND** no client-reported value SHALL factor into visibility

### Requirement: Broadcast Performance Under Fog

The server SHALL meet a broadcast budget of at most 5ms per event on
an 8-player match when fog is enabled, achieved through per-turn LOS
caching and invalidation on movement.

#### Scenario: LOS cache invalidation on movement

- **GIVEN** a unit's position changes via `MovementLocked`
- **WHEN** the visibility filter runs for the next event
- **THEN** any cached LOS result involving the moved unit SHALL be
  invalidated and re-computed

#### Scenario: Repeated LOS queries hit cache

- **GIVEN** two events in the same phase and no unit has moved
- **WHEN** the filter evaluates visibility for the same
  `(playerId, unitId)` pair on both events
- **THEN** the second evaluation SHALL reuse the cached result
