# scenario-objectives Specification

## Purpose

Defines Scenario Objectives requirements for Objective Marker Data Model, Objective Placement During Scenario Generation, Objective Control Detection, and Objective-Based Victory Evaluation, preserving the source-of-truth scope introduced by archived change add-scenario-objective-engine.

## Requirements
### Requirement: Objective Marker Data Model

The system SHALL represent scenario objectives as `IObjectiveMarker` records keyed by hex coordinate, carried on the game session in an `objectives: Record<HexKey, IObjectiveMarker>` map. `HexKey` SHALL be the canonical `"q,r"` string. The `IHex` interface SHALL NOT be modified. A session with an empty objective map SHALL behave identically to a destruction-only scenario.

Each marker SHALL carry: `id`, `hexKey`, `objectiveType` (`capture` | `defend` | `breakthrough`), `owningSide`, `controlSide`, `controlRule`, `holdTurnsRequired`, and `holdProgress`.

#### Scenario: Markerless session resolves as destruction

- **GIVEN** a game session whose `objectives` map is empty
- **WHEN** the objective outcome is evaluated
- **THEN** the evaluator SHALL treat the scenario as objective type `destroy`
- **AND** victory SHALL be decided by unit elimination as before

#### Scenario: Objective map survives serialization

- **GIVEN** a game session carrying three `IObjectiveMarker` records
- **WHEN** the session is serialized and deserialized
- **THEN** all three markers SHALL be present with identical `controlSide` and `holdProgress` values

### Requirement: Objective Placement During Scenario Generation

`ScenarioGenerator` SHALL place objective hexes appropriate to the scenario's objective type, deriving every placement from the scenario seed so generation stays deterministic.

- `capture` scenarios SHALL place 1–3 objective hexes within the map interior.
- `defend` scenarios SHALL place objective hexes inside the defender deployment zone.
- `breakthrough` scenarios SHALL place exit-hex markers along the map edge opposite the attacker deployment zone.

A generated `capture`, `defend`, or `breakthrough` scenario SHALL always produce a non-empty objective map.

#### Scenario: Capture scenario places interior objectives

- **GIVEN** a scenario generated with objective type `capture`
- **WHEN** generation completes
- **THEN** the objective map SHALL contain between 1 and 3 markers
- **AND** every marker hex SHALL lie within the map bounds and outside both deployment zones

#### Scenario: Placement is deterministic for a given seed

- **GIVEN** two scenarios generated with the same seed, objective type, and map dimensions
- **WHEN** both complete generation
- **THEN** their objective maps SHALL contain identical marker hex coordinates

#### Scenario: Breakthrough places exit hexes opposite the attacker

- **GIVEN** a `breakthrough` scenario with the attacker deployed on the south edge
- **WHEN** generation completes
- **THEN** all objective markers SHALL lie on the north map edge

### Requirement: Objective Control Detection

The system SHALL determine which side controls each objective hex using a sole-occupancy rule evaluated once per turn. A side controls a hex when it has at least one unit on that hex and the opposing side has none. When both sides occupy a hex it is contested and `controlSide` SHALL remain unchanged. When a controlled hex is vacated, `controlSide` SHALL remain the last controlling side.

`holdProgress` SHALL increment by 1 each turn the marker is controlled by the same side and SHALL reset to 0 whenever control is lost or contested.

#### Scenario: Sole occupancy takes control

- **GIVEN** a neutral objective hex with one attacker unit on it and no defender units
- **WHEN** control detection runs at end of turn
- **THEN** `controlSide` SHALL become the attacker side

#### Scenario: Contested hex keeps the last controller

- **GIVEN** an objective hex controlled by the attacker, now occupied by both an attacker unit and a defender unit
- **WHEN** control detection runs
- **THEN** `controlSide` SHALL remain the attacker side
- **AND** `holdProgress` SHALL reset to 0

#### Scenario: Vacated hex keeps the last controller

- **GIVEN** an objective hex controlled by the defender, now occupied by no units
- **WHEN** control detection runs
- **THEN** `controlSide` SHALL remain the defender side

### Requirement: Objective-Based Victory Evaluation

The system SHALL provide `evaluateObjectiveOutcome(session)` that returns an `IObjectiveOutcome` when a scenario is decided and `null` while it is undecided. The game-over check SHALL consult this function before the destruction / turn-limit fallback, and an objective outcome SHALL take precedence over a turn-limit draw.

- **Destroy**: a side wins when every enemy unit is destroyed or withdrawn.
- **Capture**: the attacking side wins when it holds every objective hex for `holdTurnsRequired` consecutive turns.
- **Defend**: the defending side wins if it still controls the objective hex(es) at `turnLimit`; the attacking side wins immediately upon controlling all objective hexes.
- **Breakthrough**: the attacking side wins when `requiredUnits` of its units have reached an exit hex.

#### Scenario: Capture decided by sustained hold

- **GIVEN** a Capture scenario with one objective hex and `holdTurnsRequired = 2`
- **WHEN** the attacker controls that hex at the end of two consecutive turns
- **THEN** `evaluateObjectiveOutcome` SHALL return an outcome with `winningSide` = attacker and `reason` = `objective`

#### Scenario: Capture progress resets on lost control

- **GIVEN** a Capture scenario where the attacker held the objective for one turn, then lost control
- **WHEN** control detection runs
- **THEN** `holdProgress` SHALL reset to 0
- **AND** `evaluateObjectiveOutcome` SHALL return `null`

#### Scenario: Defend decided at the turn limit

- **GIVEN** a Defend scenario reaching `turnLimit` with the defender still controlling the objective hex
- **WHEN** the game-over check runs
- **THEN** `evaluateObjectiveOutcome` SHALL return an outcome with `winningSide` = defender

#### Scenario: Objective win overrides surviving units

- **GIVEN** a Breakthrough scenario where the required number of attacker units have reached exit hexes while units of both sides remain alive
- **WHEN** the game-over check runs
- **THEN** the game SHALL end with the attacker as the winner
- **AND** the destruction fallback SHALL NOT be consulted

### Requirement: Objective Marker Rendering

`HexMapDisplay` SHALL render an `ObjectiveMarkersLayer` showing every objective marker, positioned above the terrain overlay and below unit tokens. Each marker SHALL be styled according to its `controlSide` — neutral, friendly, enemy, or contested — and Capture markers SHALL display `holdProgress` toward `holdTurnsRequired`. The layer SHALL be read-only and SHALL NOT mutate game state.

#### Scenario: Marker reflects control state

- **GIVEN** a tactical map with one objective marker controlled by the player's side
- **WHEN** the map renders
- **THEN** the marker SHALL be drawn with the friendly control style

#### Scenario: Contested marker is visually distinct

- **GIVEN** an objective marker on a hex occupied by units of both sides
- **WHEN** the map renders
- **THEN** the marker SHALL be drawn with the contested style, distinct from neutral, friendly, and enemy

### Requirement: Objective Lifecycle Events

The control-detection pass SHALL append typed events to the game event log: `ObjectiveCaptured` when `controlSide` changes to a side, `ObjectiveLost` when a controlled marker becomes contested or neutral, and `ObjectiveProgress` when `holdProgress` changes. The events SHALL be deterministic functions of unit positions so that replaying the event log reconstructs objective state exactly.

#### Scenario: Capture emits an ObjectiveCaptured event

- **GIVEN** a neutral objective hex that an attacker unit moves onto alone
- **WHEN** control detection runs at end of turn
- **THEN** an `ObjectiveCaptured` event SHALL be appended recording the marker `id`, the capturing side, and the turn number

#### Scenario: Event log replays objective state

- **GIVEN** a completed match whose event log contains objective lifecycle events
- **WHEN** the session is rebuilt by replaying the event log from the start
- **THEN** every marker's `controlSide` and `holdProgress` SHALL match the values from the original match

