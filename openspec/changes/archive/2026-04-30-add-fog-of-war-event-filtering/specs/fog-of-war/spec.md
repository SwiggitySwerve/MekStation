# fog-of-war Specification Delta

## ADDED Requirements

### Requirement: Visibility Model

The system SHALL determine per-player visibility of units using line-of-
sight and sensor range computed over the current `IGameState`.

#### Scenario: Own unit always visible

- **GIVEN** a player owns unit `U`
- **WHEN** visibility is evaluated
- **THEN** `canPlayerSeeUnit(playerId, U, state)` SHALL return `true`
- **AND** this SHALL hold even if `U` is prone, shut down, or
  destroyed

#### Scenario: LOS from any owned unit grants visibility

- **GIVEN** a player owns units `U1` and `U2`, and an enemy unit `E`
- **AND** only `U2` has clear LOS to `E`
- **WHEN** visibility is evaluated
- **THEN** `canPlayerSeeUnit(playerId, E, state)` SHALL return `true`

#### Scenario: Blocked LOS hides enemy

- **GIVEN** a player's only unit `U1` has LOS to an enemy `E` blocked
  by heavy woods beyond elevation rules
- **WHEN** visibility is evaluated
- **THEN** `canPlayerSeeUnit(playerId, E, state)` SHALL return `false`

#### Scenario: Sensor range boundary

- **GIVEN** a player's unit `U1` with sensor range 10 hexes and an
  enemy `E` at range 11
- **WHEN** visibility is evaluated
- **THEN** `canPlayerSeeUnit(playerId, E, state)` SHALL return `false`

### Requirement: Event Visibility Classes

The system SHALL classify every event type into one of four visibility
classes: `public`, `actor-only`, `observer-visible`, `target-visible`.

#### Scenario: Public events reach everyone

- **GIVEN** a `PhaseChanged` event
- **WHEN** the filter is applied for any player
- **THEN** the event SHALL be delivered unchanged

#### Scenario: Actor-only events reach only the actor

- **GIVEN** a `MovementDeclared` event authored by a unit owned by
  `playerA`
- **WHEN** the filter is applied for `playerB`
- **THEN** the event SHALL NOT be delivered to `playerB`
- **AND** the event SHALL be delivered to `playerA`

#### Scenario: Observer-visible delivered when LOS exists

- **GIVEN** a `MovementLocked` event for a unit `U`
- **WHEN** the filter is applied for `playerB`
- **THEN** delivery SHALL be contingent on
  `canPlayerSeeUnit(playerB, U, state)`
- **AND** the owner of `U` SHALL always receive it

#### Scenario: Target-visible always reaches target

- **GIVEN** an `AttackResolved` event targeting unit `T` owned by
  `playerT`
- **WHEN** `playerT` cannot see the attacker
- **THEN** `playerT` SHALL still receive a filtered form of the event
  with `attackerId` redacted

### Requirement: Event Redaction Rules

The system SHALL apply specific redaction rules for partially visible
events, preserving the recipient's ability to render the parts they
legitimately know.

#### Scenario: Hidden attacker redacted from target

- **GIVEN** `AttackResolved` where the target cannot see the shooter
- **WHEN** the filter runs for the target's player
- **THEN** the delivered event SHALL contain `targetId`, `damage`,
  `hitLocation`, `rolls`
- **AND** the delivered event SHALL NOT contain `attackerId` or
  any attacker weapon/location identifiers

#### Scenario: Out-of-LOS destruction omits details

- **GIVEN** `UnitDestroyed` for an enemy unit the observer cannot see
- **WHEN** the filter runs for the observer
- **THEN** the event SHALL be delivered in a reduced form with
  `{type: 'unit_destroyed', payload: {unitId}}`
- **AND** no damage, crit, or pilot detail SHALL be included

#### Scenario: Out-of-LOS movement skipped

- **GIVEN** `MovementLocked` for a unit not in the observer's LOS
- **WHEN** the filter runs for the observer
- **THEN** the event SHALL NOT be delivered
- **AND** the observer SHALL NOT learn the unit's new coordinate

### Requirement: Fog Mode Opt-In Per Match

The system SHALL treat fog-of-war as an opt-in match configuration
that defaults to off, and SHALL forbid mid-match toggling.

#### Scenario: Default is open information

- **GIVEN** a match created without `config.fogOfWar`
- **WHEN** the default is evaluated
- **THEN** `config.fogOfWar` SHALL be `false`
- **AND** the filter SHALL behave as a no-op

#### Scenario: Fog-on honored throughout match

- **GIVEN** a match created with `config.fogOfWar: true`
- **WHEN** events are broadcast
- **THEN** the per-player filter SHALL be applied for every event
- **AND** the fog setting SHALL NOT be mutable after match launch

#### Scenario: Host cannot toggle fog mid-match

- **GIVEN** an active match
- **WHEN** the host sends `Intent {kind: 'SetFog', value: true}`
- **THEN** the server SHALL respond `Error {code: 'CANNOT_TOGGLE_
MID_MATCH'}`

### Requirement: Replay Reflects Fog History

The system SHALL apply fog filtering to replay streams so a
reconnecting client sees the same history they would have seen live,
never more.

#### Scenario: Reconnect replay is filtered

- **GIVEN** a reconnecting client in a fog-on match
- **WHEN** the server streams the replay
- **THEN** every event in the replay SHALL pass through
  `filterEventForPlayer` before being sent
- **AND** the client's visible history SHALL be consistent with what
  was visible at the time the event was originally broadcast

#### Scenario: Post-match unfiltered log privileged

- **GIVEN** a match has ended
- **WHEN** a non-privileged player requests the log
- **THEN** the server SHALL serve the filtered log for that player
- **AND** the unfiltered log SHALL require privileged access (not
  addressed by this change)
