# tactical-map-interface Specification Delta

## ADDED Requirements

### Requirement: Token Selection Binding

The tactical map interface SHALL bind unit token selection to the gameplay
store so that a single selected unit id drives all dependent UI surfaces
(action panel, phase tracker, overlays).

**Priority**: Critical

#### Scenario: Click token selects unit

- **GIVEN** a unit token on the map and no currently selected unit
- **WHEN** the user clicks the token
- **THEN** `useGameplayStore.selectedUnitId` SHALL equal that unit's id
- **AND** the token SHALL render the selection ring
- **AND** the action panel SHALL update to that unit

#### Scenario: Click empty hex clears selection

- **GIVEN** a currently selected unit
- **WHEN** the user clicks an empty (non-token) hex
- **THEN** `selectedUnitId` SHALL become `null`
- **AND** the action panel SHALL show the empty placeholder

#### Scenario: Click new token swaps selection

- **GIVEN** unit A is selected
- **WHEN** the user clicks unit B's token
- **THEN** `selectedUnitId` SHALL equal B's id
- **AND** exactly one token SHALL render a selection ring

### Requirement: Action Panel Contract

The tactical map interface SHALL expose an action panel region that, when a
unit is selected, renders the unit's armor diagram, heat bar, weapons list,
SPA list, and pilot wound track.

**Priority**: Critical

#### Scenario: Panel renders armor diagram

- **GIVEN** a selected unit
- **WHEN** the action panel renders
- **THEN** the panel SHALL include armor pips for all eight locations
- **AND** torso locations SHALL show both front and rear armor

#### Scenario: Panel renders heat bar with thresholds

- **GIVEN** a selected unit
- **WHEN** the action panel renders
- **THEN** the heat bar SHALL show current heat and dissipation capacity
- **AND** tick marks SHALL label canonical thresholds 8, 13, 17, 24

#### Scenario: Panel renders weapons, SPAs, pilot wounds

- **GIVEN** a selected unit
- **WHEN** the action panel renders
- **THEN** the weapons list SHALL include every mounted weapon
- **AND** the SPA list SHALL include every special pilot ability on the
  assigned pilot
- **AND** the pilot wound track SHALL show 6 pips and mark current wounds

#### Scenario: Empty selection shows placeholder

- **GIVEN** no unit is selected
- **WHEN** the action panel renders
- **THEN** the panel SHALL show the text `"Select a unit to view its status"`
- **AND** SHALL NOT render armor, heat, weapons, SPAs, or wounds

### Requirement: Phase and Turn HUD

The tactical map interface SHALL render a phase-and-turn heads-up display at
the top of the combat screen that updates reactively to session events.

**Priority**: Critical

#### Scenario: HUD shows current phase and turn

- **GIVEN** a session in Turn 3, Weapon Attack phase, Player side active
- **WHEN** the HUD renders
- **THEN** it SHALL display `"Turn 3"` and `"Weapon Attack"` and
  `"Player"`
- **AND** the side label SHALL use the blue side color

#### Scenario: HUD updates on phase_changed event

- **GIVEN** the session emits `phase_changed` from Movement to Weapon Attack
- **WHEN** the HUD re-renders
- **THEN** the phase label SHALL change to `"Weapon Attack"`
- **AND** the change SHALL take effect without a full page reload

#### Scenario: HUD updates on turn_started event

- **GIVEN** the session emits `turn_started` transitioning Turn 3 to Turn 4
- **WHEN** the HUD re-renders
- **THEN** the turn label SHALL change to `"Turn 4"`

### Requirement: Event Log Panel

The tactical map interface SHALL render an event log panel that streams
`GameEvent` entries from the active session in reverse-chronological order.

**Priority**: High

#### Scenario: New event prepends to log

- **GIVEN** the session appends an event of type `damage_applied`
- **WHEN** the event log panel re-renders
- **THEN** a new entry SHALL appear at the top of the list
- **AND** the entry SHALL display the phase, the actor's designation, and a
  one-line human summary

#### Scenario: Log scroll anchors to newest

- **GIVEN** the event log already has 50 entries and the user has not
  scrolled
- **WHEN** a new event is appended
- **THEN** the scroll position SHALL snap to the top (newest)
- **AND** the previous entry SHALL remain visible below

#### Scenario: Log filters by phase (scaffolded)

- **GIVEN** filter state `{phase: GamePhase.Movement}`
- **WHEN** the event log panel renders
- **THEN** entries from other phases SHALL be hidden
- **AND** with filter state `null`, all entries SHALL be visible

### Requirement: Unit Token Facing Indicator Binding

Every unit token on the tactical map SHALL render a facing arrow that
matches the unit's current `Facing` value and SHALL update whenever the
session emits a `facing_changed` event.

**Priority**: High

#### Scenario: Facing arrow matches unit state

- **GIVEN** a unit with `facing = Facing.NorthEast`
- **WHEN** the token renders
- **THEN** the arrow SHALL point Northeast (60°)

#### Scenario: Facing arrow reacts to facing_changed

- **GIVEN** the session emits `facing_changed` setting a unit's facing to
  `Facing.South`
- **WHEN** the token re-renders
- **THEN** the arrow SHALL point downward (180°)

#### Scenario: Destroyed units retain last facing

- **GIVEN** a unit transitions to destroyed
- **WHEN** the token re-renders
- **THEN** the facing arrow SHALL continue to point to the last recorded
  facing
- **AND** the token SHALL display its destroyed visual treatment (gray +
  red X)
