# fog-of-war Specification

## Purpose

Defines Fog Of War requirements for Visibility Model, Event Visibility Classes, Event Redaction Rules, and Fog Mode Opt-In Per Match, preserving the source-of-truth scope introduced by archived change add-fog-of-war-event-filtering.

## Requirements
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

### Requirement: Combat-State Redaction for Hidden Units

When fog-of-war is enabled and a unit is NOT visible to the local player (no LOS, no `lastKnown` exposure granting full state), the projected `IUnitToken` for that unit SHALL NOT include `combatState`-derived per-type fields. Specifically the projection adapter SHALL strip `altitude`, `velocity`, `infantryCount`, `platoonCount`, `trooperCount`, `protoCount`, `isGlider`, and `hasMainGun` from the redacted token.

This prevents the new `IUnitGameState.combatState` envelope (introduced in `game-state-management`) from leaking trooper counts, structural integrity, altitude, or chassis flags through the rendering pipeline to a player who has no sensor-grade reason to see them. `lastKnownPosition` and `fogStatus = 'lastKnown'` MAY still be set per the existing fog model.

#### Scenario: Hidden enemy infantry leaks no troopers

- **GIVEN** fog-of-war is enabled
- **AND** an enemy infantry platoon is NOT visible to the local player
- **WHEN** `unitStateToToken(...)` projects the platoon's `IUnitGameState` for rendering
- **THEN** the returned `IUnitToken.infantryCount` SHALL be `undefined`
- **AND** `IUnitToken.platoonCount` SHALL be `undefined`

#### Scenario: Hidden enemy aerospace leaks no altitude

- **GIVEN** fog-of-war is enabled
- **AND** an enemy aerospace fighter is NOT visible to the local player
- **WHEN** `unitStateToToken(...)` projects the fighter's `IUnitGameState`
- **THEN** the returned `IUnitToken.altitude` SHALL be `undefined`
- **AND** `IUnitToken.velocity` SHALL be `undefined`

#### Scenario: Hidden enemy battle armor leaks no troopers

- **GIVEN** fog-of-war is enabled
- **AND** an enemy battle armor squad is NOT visible to the local player
- **WHEN** `unitStateToToken(...)` projects the squad's `IUnitGameState`
- **THEN** the returned `IUnitToken.trooperCount` SHALL be `undefined`

#### Scenario: Hidden enemy protomech leaks no chassis flags

- **GIVEN** fog-of-war is enabled
- **AND** an enemy proto point is NOT visible to the local player
- **WHEN** `unitStateToToken(...)` projects the proto's `IUnitGameState`
- **THEN** the returned `IUnitToken.protoCount` SHALL be `undefined`
- **AND** `IUnitToken.isGlider` SHALL be `undefined`
- **AND** `IUnitToken.hasMainGun` SHALL be `undefined`

#### Scenario: Owned units are not redacted

- **GIVEN** fog-of-war is enabled
- **AND** the local player owns an infantry platoon with `combatState.kind === 'platoon'` and `survivingTroopers === 22`
- **WHEN** `unitStateToToken(...)` projects the platoon's `IUnitGameState`
- **THEN** the returned `IUnitToken.infantryCount` SHALL equal `22`

#### Scenario: Visible enemies (in-LOS) are not redacted

- **GIVEN** fog-of-war is enabled
- **AND** an enemy infantry platoon IS visible to the local player via owned-unit LOS
- **WHEN** `unitStateToToken(...)` projects the platoon's `IUnitGameState`
- **THEN** `IUnitToken.infantryCount` SHALL reflect the live `survivingTroopers` value

### Requirement: Opponent Intel Policy

The fog-of-war system SHALL support a match-level opponent intel policy that controls how enemy state is projected to each viewer.

#### Scenario: Open information shows exact visible enemy state
- **GIVEN** a match uses opponent intel policy `open`
- **WHEN** an enemy unit is visible to the player
- **THEN** the projected enemy state SHALL include exact armor, structure, heat, movement state, shutdown/prone status, and weapon availability permitted by the base game state

#### Scenario: Rough information uses bands
- **GIVEN** a match uses opponent intel policy `rough`
- **WHEN** an enemy unit is visible to the player
- **THEN** exact armor, structure, heat, and ammo counts SHALL be replaced by configured bands
- **AND** the projection SHALL include a confidence label indicating that values are approximate

#### Scenario: Hidden information strips combat state
- **GIVEN** a match uses opponent intel policy `hidden`
- **WHEN** an enemy unit is not visible
- **THEN** the projected token SHALL exclude exact combat state
- **AND** only allowed last-known position, silhouette, side, and stale timestamp fields MAY remain

### Requirement: GM Intel Override

The fog-of-war system SHALL support a privileged GM/referee projection that can view exact state without changing player projections.

#### Scenario: GM exact view does not affect player view
- **GIVEN** a match has one GM viewer and one player viewer
- **WHEN** the GM enables exact opponent intel in the GM shell
- **THEN** the GM projection SHALL show exact enemy state
- **AND** the player projection SHALL continue to follow the match opponent intel policy

#### Scenario: Mid-match reveal emits audit event
- **GIVEN** the GM reveals a hidden enemy unit to a player mid-match
- **WHEN** the reveal is committed
- **THEN** the system SHALL emit an intel visibility event naming the unit, viewer side, reveal tier, and source
- **AND** replay filtering SHALL apply that event when reconstructing player-visible history

### Requirement: Perspective-Aware Replay Redaction

Replay event streams SHALL apply the same opponent intel policy and visibility history as live play.

#### Scenario: Player replay preserves rough intel
- **GIVEN** a match was played with rough opponent intel
- **WHEN** the player opens the replay from their perspective
- **THEN** event log, unit inspectors, and map tokens SHALL show rough or stale opponent state matching the original visibility timeline

#### Scenario: GM replay can show exact state
- **GIVEN** the replay viewer is opened with GM/referee authority
- **WHEN** the same replay is loaded
- **THEN** the viewer MAY show exact state and hidden events
- **AND** the UI SHALL label the replay as GM perspective

