# Tactical Map Interface Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-01-31
**Dependencies**: [terrain-system, hex-grid-interfaces]
**Affects**: [combat-resolution, movement-validation, campaign-hud]

---

## Overview

### Purpose

Defines the interactive hex map rendering and interaction system for BattleTech tactical combat, including SVG-based hex grid display, pan/zoom controls, terrain visualization, effect overlays, and unit token rendering. This specification encodes the visual and interactive requirements for tactical map display.

### Scope

**In Scope:**

- Hex grid rendering using SVG for tactical maps (15x17 to 30x34 hexes)
- Pan and zoom controls (mouse wheel, drag, keyboard)
- Terrain visualization (colors, patterns by terrain type)
- Effect overlays (movement cost, cover level, LOS, heat)
- Unit token rendering (facing, selection, status)
- Hex selection and hover states
- Interactive feedback patterns (highlights, ranges, paths)

**Out of Scope:**

- Canvas/WebGL rendering (reserved for starmap with 500+ nodes)
- Campaign-level UI (see campaign-hud spec)
- Combat resolution logic (see combat-resolution spec)
- Multiplayer synchronization (handled by game state layer)
- Terrain data model (see terrain-system spec)

### Key Concepts

- **Hex Coordinate**: Axial coordinate system `{q, r}` for hex positioning
- **Flat-Top Orientation**: Standard hex orientation for tactical maps (vertices at top/bottom)
- **Viewport**: The visible portion of the map with pan/zoom transformations
- **Overlay**: Toggleable visual layer showing calculated effects (movement, cover, LOS)
- **Token**: Visual representation of a unit on the map with facing indicator
- **Level of Detail (LOD)**: Rendering optimization based on zoom level

---
## Requirements
### Requirement: Hex Grid Rendering

The system SHALL render a hex grid using SVG with flat-top orientation and axial coordinates.

**Rationale**: SVG provides crisp rendering, easy interaction, and good performance for tactical map sizes (<3000 hexes).

**Priority**: Critical

#### Scenario: Render hex grid from radius

**GIVEN** a map radius of 8 hexes
**WHEN** rendering the hex grid
**THEN** 217 hexes SHALL be rendered (formula: 3r² + 3r + 1)
**AND** each hex SHALL use axial coordinates {q, r}
**AND** hexes SHALL be positioned using flat-top orientation

#### Scenario: Hex-to-pixel conversion

**GIVEN** a hex at axial coordinate {q: 2, r: -1}
**WHEN** converting to pixel position
**THEN** x SHALL equal `HEX_SIZE * (3/2) * q`
**AND** y SHALL equal `HEX_SIZE * (√3/2 * q + √3 * r)`
**AND** the position SHALL be relative to the grid center

#### Scenario: Pixel-to-hex conversion

**GIVEN** a mouse click at pixel position (150, 200)
**WHEN** converting to hex coordinate
**THEN** the nearest hex coordinate SHALL be calculated using inverse transform
**AND** fractional coordinates SHALL be rounded to nearest hex
**AND** the result SHALL satisfy q + r + s = 0 (cube coordinate constraint)

---

### Requirement: Pan and Zoom Controls

The system SHALL provide pan and zoom controls for map navigation.

**Priority**: Critical

#### Scenario: Mouse wheel zoom

**GIVEN** the map is displayed at 1.0x zoom
**WHEN** the user scrolls the mouse wheel up
**THEN** zoom SHALL increase by 10% (multiply by 1.1)
**AND** zoom SHALL be clamped to range [0.5x, 3.0x]
**AND** zoom SHALL center on the current viewport center

#### Scenario: Middle-click drag pan

**GIVEN** the user middle-clicks on the map
**WHEN** the user drags the mouse
**THEN** the viewport SHALL pan following the mouse movement
**AND** pan SHALL continue until mouse button is released

#### Scenario: Alt+click drag pan

**GIVEN** the user holds Alt and left-clicks on the map
**WHEN** the user drags the mouse
**THEN** the viewport SHALL pan following the mouse movement
**AND** pan SHALL continue until mouse button is released

#### Scenario: Keyboard zoom

**GIVEN** the map is displayed
**WHEN** the user presses the "+" key
**THEN** zoom SHALL increase by 20% (multiply by 1.2)
**WHEN** the user presses the "-" key
**THEN** zoom SHALL decrease by 20% (divide by 1.2)

#### Scenario: Reset view

**GIVEN** the map has been panned and zoomed
**WHEN** the user clicks the reset button
**THEN** zoom SHALL be set to 1.0x
**AND** pan SHALL be set to (0, 0)
**AND** the map SHALL center on the origin

---

### Requirement: Terrain Visualization

The system SHALL render terrain types with distinct visual treatments based on terrain data.

#### Scenario: Building rendering exposes structure metadata

- **GIVEN** a hex has building terrain with represented level or construction factor metadata
- **WHEN** the hex renders and the player inspects terrain context
- **THEN** the hex SHALL expose building level metadata
- **AND** the hex SHALL expose construction factor metadata when available
- **AND** hover terrain context SHALL show the building level and construction factor when available
- **AND** exposing structure metadata SHALL NOT change movement, combat, LOS, cover, or physical attack legality

### Requirement: Effect Overlays

The system SHALL provide toggleable overlays showing calculated terrain effects.

#### Scenario: Movement cost overlay color-codes terrain cost bands

- **GIVEN** a unit is selected with movement type Walk
- **WHEN** the movement cost overlay is enabled
- **THEN** each hex SHALL display its movement cost in MP
- **AND** 1 MP terrain costs SHALL render with the low-cost green marker fill
- **AND** 2-3 MP terrain costs SHALL render with the medium-cost yellow marker fill
- **AND** 4+ MP terrain costs SHALL render with the high-cost red marker fill
- **AND** movement-cost markers SHALL expose their cost band and fill color from the same terrain movement-cost value used by the visible label

### Requirement: Unit Token Rendering

The system SHALL render unit tokens with facing indicators, selection rings,
target rings, status markers, type-specific visuals, and event-driven damage
feedback overlays through the production per-type token dispatcher. When
weapon-backed combat projection is active for the selected unit, the rendered
valid-target ring SHALL be driven by shared combat projection data instead of
by legacy token flags.

#### Scenario: Production dispatcher owns token feedback overlays

**GIVEN** the tactical map has unit tokens and a relevant game-event log
**WHEN** damage, critical-hit, pilot-hit, or unit-destroyed events target a unit
**THEN** the token SHALL render the corresponding damage-feedback overlay
through `UnitTokenForType`
**AND** no HexMapDisplay-local legacy token renderer SHALL be required to show
those overlays

### Requirement: Hex Selection and Hover States

The system SHALL provide visual feedback for hex selection and hover interactions.

**Priority**: High

#### Scenario: Hex hover state

**GIVEN** the mouse hovers over a hex
**WHEN** rendering the hex
**THEN** fill color SHALL change to hover color (#f1f5f9)
**AND** cursor SHALL change to pointer
**AND** onHexHover callback SHALL be invoked with hex coordinate

#### Scenario: Hex selection state

**GIVEN** a hex is selected
**WHEN** rendering the hex
**THEN** fill color SHALL change to selected color (#fef3c7)
**AND** stroke width SHALL increase to 2px
**AND** stroke color SHALL be yellow (#fbbf24)

#### Scenario: Movement range highlight

**GIVEN** a unit is selected with 6 MP remaining
**WHEN** rendering hexes within movement range
**THEN** reachable hexes SHALL be tinted green (#dcfce7)
**AND** unreachable hexes (blocked) SHALL be tinted red (#fee2e2)
**AND** MP cost SHALL be displayed on each hex

#### Scenario: Attack range highlight

**GIVEN** a unit is selected with weapon range 10 hexes
**WHEN** rendering hexes within attack range
**THEN** hexes SHALL be tinted red (#fecaca)
**AND** hexes with valid targets SHALL have brighter tint

#### Scenario: Path preview highlight

**GIVEN** the mouse hovers over a hex in movement range
**WHEN** rendering the movement path
**THEN** hexes along the path SHALL be highlighted with yellow tint (#fef9c3)
**AND** path SHALL be drawn as a dotted line
**AND** total MP cost SHALL be displayed

---

### Requirement: Interactive Feedback Patterns

The system SHALL provide consistent interaction patterns matching Civilization-style conventions.

**Priority**: Medium

#### Scenario: Hex click interaction

**GIVEN** the user clicks on a hex
**WHEN** the hex is empty
**THEN** onHexClick callback SHALL be invoked with hex coordinate
**WHEN** the hex contains a unit token
**THEN** onTokenClick callback SHALL be invoked with unit ID
**AND** hex click SHALL NOT fire (token click takes precedence)

#### Scenario: Double-click to center

**GIVEN** the user double-clicks on a hex
**WHEN** the interaction is processed
**THEN** the viewport SHALL pan to center on that hex
**AND** zoom level SHALL remain unchanged

#### Scenario: Coordinate display toggle

**GIVEN** the showCoordinates prop is true
**WHEN** rendering hexes
**THEN** each hex SHALL display its {q, r} coordinate as text
**AND** text SHALL be small (10px) and gray
**AND** text SHALL be centered in the hex

---

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

---

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

---

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

---

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

---

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

---

### Requirement: Pre-Battle Map Preview

The tactical map interface SHALL render a non-interactive preview of the
prospective skirmish map on the pre-battle setup screen, using the same hex
grid, terrain, and viewport framing that will be used once combat begins.

**Priority**: Critical

#### Scenario: Preview reflects selected radius

- **GIVEN** the user selects map radius 8 on the pre-battle screen
- **WHEN** the preview renders
- **THEN** the preview SHALL show `3 * 8^2 + 3 * 8 + 1 = 217` hexes
- **AND** the preview viewport SHALL frame the entire hex grid with padding

#### Scenario: Preview reflects selected terrain preset

- **GIVEN** the user selects terrain preset `"Woods"`
- **WHEN** the preview renders
- **THEN** each hex SHALL be filled with the terrain color for the preset's
  per-hex `TerrainType`
- **AND** preview SHALL NOT respond to click or hover (non-interactive)

#### Scenario: Preview updates live on config change

- **GIVEN** the user changes radius from 8 to 12
- **WHEN** the configuration value updates
- **THEN** the preview SHALL re-render within the same frame with the new
  radius
- **AND** no stale hexes from the previous radius SHALL remain visible

### Requirement: Deployment Zone Overlay

The tactical map interface SHALL render per-side deployment zone overlays on
the pre-battle preview, visually distinguishing Player and Opponent zones
while preserving underlying terrain colors.

**Priority**: High

#### Scenario: Zones rendered with side colors

- **GIVEN** deployment zones for Player (west) and Opponent (east)
- **WHEN** the preview renders with zone overlays enabled
- **THEN** Player zone hexes SHALL have a semi-transparent blue tint
  (rgba(59,130,246,0.35))
- **AND** Opponent zone hexes SHALL have a semi-transparent red tint
  (rgba(239,68,68,0.35))
- **AND** terrain color SHALL remain visible under the tint

#### Scenario: Zone tooltip on hover

- **GIVEN** zone overlays are visible
- **WHEN** the user hovers a hex in the Player zone
- **THEN** a tooltip SHALL display `"Player deployment"` and the zone's
  hex count
- **AND** moving to an Opponent hex SHALL switch the tooltip to
  `"Opponent deployment"`

#### Scenario: Empty zones handled

- **GIVEN** a terrain preset that produces no valid deployment hexes for a
  side
- **WHEN** the preview renders
- **THEN** a warning banner SHALL display
  `"No valid deployment hexes for <side>"`
- **AND** "Launch Skirmish" SHALL be disabled

### Requirement: Terrain Preset Legend

The tactical map interface SHALL render a legend adjacent to the pre-battle
preview showing the colors and labels of terrain types present in the
selected preset.

**Priority**: Medium

#### Scenario: Legend matches preview

- **GIVEN** a preset that contains Clear, LightWoods, and HeavyWoods hexes
- **WHEN** the legend renders
- **THEN** exactly three entries SHALL be listed (no duplicates, no extras)
- **AND** each entry's swatch color SHALL match the same terrain color used
  in the preview
- **AND** each entry's label SHALL use the canonical terrain name from
  `terrain-system`

### Requirement: Target Lock Visualization

The tactical map interface SHALL render a pulsing red target ring around a
locked-in enemy unit token during the Weapon Attack phase, binding the
ring's visibility to `useGameplayStore.attackPlan.targetId`.

**Priority**: Critical

#### Scenario: Target lock pulses red

- **GIVEN** `attackPlan.targetId = "unit-42"` during Weapon Attack phase
- **WHEN** the token for unit-42 renders
- **THEN** a red target ring SHALL pulse around the token
- **AND** the ring stroke width SHALL be 3px

#### Scenario: Clearing target removes ring

- **GIVEN** a target ring is visible
- **WHEN** `attackPlan.targetId` becomes `null`
- **THEN** the ring SHALL disappear within a single re-render

#### Scenario: Target ring only in Weapon Attack phase

- **GIVEN** `attackPlan.targetId` is set but phase is Heat
- **WHEN** the token renders
- **THEN** the red target ring SHALL NOT be visible

### Requirement: To-Hit Forecast Modal

The tactical map interface SHALL provide a modal surface that displays the
breakdown of to-hit modifiers for each selected weapon and the final TN
for each, based on the `forecastToHit` projection from
`to-hit-resolution`. The modal SHALL source the attacker and target to-hit
state from the SAME shared engine state builders the commit path uses
(`buildWeaponAttackAttackerToHitState` / `buildWeaponAttackTargetToHitState`)
rather than a hand-built state, so that pilot wounds, sensor hits, actuator
damage, SPAs, quirks, target-immobile, and target-partial-cover all reach the
forecast. The modal SHALL pass the same semi-guided TAG context the commit path
passes, so that each displayed final TN equals the number the attack would
resolve at.

#### Scenario: Modal opens from Preview Forecast

- **GIVEN** a valid attack plan with at least one selected weapon
- **WHEN** the player clicks "Preview Forecast"
- **THEN** the modal SHALL open centered over the combat surface
- **AND** each selected weapon SHALL render a row with the final TN and
  an expandable modifier breakdown

#### Scenario: Modifier breakdown expands

- **GIVEN** the modal is open and a weapon row is collapsed
- **WHEN** the player clicks the row
- **THEN** the row SHALL expand to show per-modifier labels and signed
  integer values
- **AND** zero-value modifiers SHALL be omitted from the breakdown

#### Scenario: Hit probability shown per weapon

- **GIVEN** a weapon with final TN 8
- **WHEN** the modal renders
- **THEN** the row SHALL display the probability from `hitProbability(8)`
  formatted as a percentage (e.g., `"41.7%"`)

#### Scenario: Modal footer shows expected hits

- **GIVEN** three selected weapons with probabilities 0.9, 0.5, 0.1
- **WHEN** the modal renders
- **THEN** the footer SHALL display `"Expected hits: 1.5"` (sum of
  probabilities rounded to 1 decimal)

#### Scenario: Modal honors full attacker state, not a lossy subset

- **GIVEN** a selected attacker whose pilot has 2 wounds, 1 sensor hit, a
  damaged actuator, and a relevant SPA, firing at a target in partial cover
- **WHEN** the forecast modal renders the weapon rows
- **THEN** the modal SHALL build the to-hit state via the shared engine state
  builders
- **AND** the displayed final TN SHALL include the wound, sensor, actuator,
  SPA, and partial-cover contributions
- **AND** the displayed final TN SHALL equal the number the engine would
  record on commit for the same attack

#### Scenario: Modal honors semi-guided TAG context for a moving target

- **GIVEN** a semi-guided LRM selected against a TAG-designated target that
  moved this turn, with no ECM protection
- **WHEN** the forecast modal renders that weapon's row
- **THEN** the displayed final TN SHALL reflect the cancelled target-movement
  modifier
- **AND** the displayed final TN SHALL equal the number the attack resolves at
  on commit

### Requirement: Waiting-for-Opponent Banner

The tactical map interface SHALL render a dismissible "Waiting for
Opponent..." banner after the Player side confirms fire during Weapon
Attack phase and before `attacks_revealed` fires.

**Priority**: High

#### Scenario: Banner appears on Player confirm fire

- **GIVEN** the Player side appends `AttackDeclared` events for all its
  active units
- **WHEN** the combat surface re-renders
- **THEN** a "Waiting for Opponent..." banner SHALL be visible
- **AND** the weapon selector checkboxes SHALL be disabled

#### Scenario: Banner dismisses on attacks revealed

- **GIVEN** the banner is visible
- **WHEN** the session emits `attacks_revealed`
- **THEN** the banner SHALL dismiss
- **AND** weapon selector checkboxes SHALL remain disabled (locked for
  phase)

### Requirement: Armor Pip Decay Animation

The tactical map interface SHALL animate the transition of armor pips on
the action panel from filled to empty when a `DamageApplied` event lands,
giving the player a visible pulse per hit.

**Priority**: High

#### Scenario: Pip flashes then clears on damage

- **GIVEN** the action panel is showing unit A with 5 armor pips at RA
- **WHEN** a `DamageApplied` event reports 3 armor damage to RA
- **THEN** three rightmost filled pips SHALL flash red at 60% opacity
  for 400ms
- **AND** after the flash the three pips SHALL render empty
- **AND** the 2 remaining pips SHALL stay filled

#### Scenario: Armor then structure animate sequentially

- **GIVEN** 8 damage applied to RA (5 armor, 3 structure)
- **WHEN** the animation runs
- **THEN** armor pips SHALL animate first
- **AND** structure pips SHALL begin animating when the armor animation
  completes
- **AND** total animation time SHALL not exceed 900ms

#### Scenario: Unselected unit's damage does not animate

- **GIVEN** unit B takes damage but the action panel shows unit A
- **WHEN** the `DamageApplied` event fires
- **THEN** the action panel SHALL NOT animate
- **AND** switching selection to unit B after the event SHALL show the
  post-damage state without replaying the animation

### Requirement: Critical Hit Burst Overlay

The tactical map interface SHALL render a short burst animation over a
unit's token when a `CriticalHit` event fires, and the overlay SHALL
auto-dismiss without blocking map interactions.

**Priority**: High

#### Scenario: Crit burst animates over token

- **GIVEN** a `CriticalHit` event for unit-42
- **WHEN** the overlay renders
- **THEN** a burst animation SHALL play centered on unit-42's token for
  ~600ms
- **AND** the overlay SHALL dismiss automatically

#### Scenario: Crit overlay does not intercept clicks

- **GIVEN** the crit burst is visible over a token
- **WHEN** the user clicks on that token
- **THEN** the token click SHALL still register (overlay is
  pointer-events: none)

#### Scenario: Simultaneous crits queue

- **GIVEN** two `CriticalHit` events fire in the same frame for the
  same unit
- **WHEN** the overlays render
- **THEN** the second burst SHALL start after the first completes
- **AND** no more than one burst SHALL be on-screen at a time per unit

### Requirement: Damage Number Floater

The tactical map interface SHALL render a floating red damage number
above each token that takes damage, visualizing the magnitude of hits.

**Priority**: Medium

#### Scenario: Floater appears on damage

- **GIVEN** unit-42 takes 10 damage from a weapon hit
- **WHEN** the floater renders
- **THEN** a red number `"10"` SHALL appear above the token
- **AND** the number SHALL rise upward ~40 pixels over 800ms while
  fading to transparent

#### Scenario: Multiple hits stack vertically

- **GIVEN** a cluster attack that lands 3 hits for 2 damage each
- **WHEN** the floaters render
- **THEN** three floaters SHALL render with 50ms stagger
- **AND** each floater SHALL rise independently

### Requirement: Pilot Wound Flash

The tactical map interface SHALL visually emphasize pilot consciousness
rolls on the action panel's pilot wound track, so the player sees when a
roll fires and how it resolved.

**Priority**: High

#### Scenario: Consciousness roll pulses yellow

- **GIVEN** a `ConsciousnessRoll` event fires for the selected unit's
  pilot
- **WHEN** the wound track renders
- **THEN** the track SHALL pulse yellow for 500ms

#### Scenario: Failed roll shows Unconscious badge

- **GIVEN** a `ConsciousnessRoll` event with `passed = false`
- **WHEN** the wound track renders post-pulse
- **THEN** a persistent red "Unconscious" badge SHALL appear across the
  track
- **AND** the badge SHALL stay until pilot state changes back to
  conscious

#### Scenario: Passed roll leaves no badge

- **GIVEN** a `ConsciousnessRoll` event with `passed = true`
- **WHEN** the wound track renders post-pulse
- **THEN** the yellow pulse SHALL fade
- **AND** no badge SHALL appear

### Requirement: Physical Attack Sub-Panel

During the Physical Attack phase, the action panel SHALL render a "Physical Attacks" sub-panel that lists every eligible physical attack type (punch, kick, charge, DFA, push, club) for the currently selected unit against the currently locked-in target, along with disabled rows for ineligible attacks showing the restriction reason.

**Priority**: Critical

#### Scenario: Eligible punch row renders

- **GIVEN** the Physical Attack phase is active
- **AND** the selected friendly unit has both arms intact and has not fired any arm-mounted weapon this turn
- **AND** an adjacent enemy is locked as the target
- **WHEN** the sub-panel renders
- **THEN** a "Punch (Right Arm)" row SHALL be visible
- **AND** a "Punch (Left Arm)" row SHALL be visible
- **AND** each row SHALL show the attack-type icon, the target designation, the to-hit TN, and the damage number

#### Scenario: Ineligible punch row renders disabled

- **GIVEN** the Physical Attack phase is active
- **AND** the selected unit's right arm fired an LRM-10 earlier this turn
- **WHEN** the sub-panel renders
- **THEN** the "Punch (Right Arm)" row SHALL render with a red strikethrough
- **AND** a tooltip SHALL read "Right arm fired LRM-10 — cannot punch this turn"
- **AND** the row's Declare button SHALL be disabled

#### Scenario: No eligible attacks renders empty state

- **GIVEN** the Physical Attack phase is active
- **AND** no enemy is adjacent to the selected unit
- **WHEN** the sub-panel renders
- **THEN** the sub-panel SHALL show "No eligible physical attacks this turn"
- **AND** a "Skip Physical Attack" button SHALL be visible

### Requirement: Physical Attack Forecast Modal Variant

The to-hit forecast modal SHALL accept a `PhysicalAttackForecast` variant that replaces weapon range/heat modifiers with physical-specific modifiers: attack-type base, actuator damage mods, piloting skill, TMM, prone-target adjustments, and for charge/DFA a "Self-risk" row showing damage-to-attacker + auto-fall conditions.

**Priority**: Critical

#### Scenario: Kick forecast shows −2 base modifier

- **GIVEN** a player declares a kick
- **WHEN** the forecast modal opens
- **THEN** the modifier breakdown SHALL include "Kick base −2"
- **AND** the breakdown SHALL include the piloting skill, TMM, and any leg actuator damage modifiers

#### Scenario: Charge forecast surfaces self-damage

- **GIVEN** a player declares a charge against a 50-ton target
- **WHEN** the forecast modal opens
- **THEN** a "Self-risk" row SHALL be visible
- **AND** the row SHALL show `damage to attacker = ceil(50 / 10) = 5`
- **AND** the row SHALL note "Attacker takes collision PSR"

#### Scenario: DFA forecast surfaces miss-fall

- **GIVEN** a player declares a DFA
- **WHEN** the forecast modal opens
- **THEN** the Self-risk row SHALL state "On miss: attacker falls"
- **AND** the expected leg damage to attacker SHALL be shown

### Requirement: Physical Attack Intent Arrows

When a physical-attack row is hovered OR an attack of that type is declared, the map SHALL render an intent arrow that visually communicates the action's motion — solid for charge, dashed arc for DFA, and a ghost-hex displacement marker for push.

**Priority**: High

#### Scenario: Charge intent arrow renders on hover

- **GIVEN** the sub-panel shows a "Charge" row
- **WHEN** the player hovers the row
- **THEN** a solid arrow SHALL render from attacker hex center to target hex center
- **AND** the arrow color SHALL match the attacker's side color

#### Scenario: DFA intent arrow is dashed arc

- **GIVEN** the sub-panel shows a "DFA" row
- **WHEN** the player hovers the row
- **THEN** a dashed arrow rendering an arc (lift + crash) SHALL appear between attacker and target
- **AND** the dash pattern SHALL make the DFA arrow distinguishable from the charge arrow under simulated deuteranopia

#### Scenario: Push ghost hex shows displacement

- **GIVEN** the sub-panel shows a "Push" row
- **WHEN** the player hovers the row
- **THEN** a ghost outline SHALL appear on the hex where the target would be pushed to
- **AND** if the destination hex is invalid (off-map, blocked), the ghost SHALL render in red with an "X" overlay

### Requirement: Physical Attack Declaration Commit

Clicking "Declare" on an eligible row SHALL append a `PhysicalAttackDeclared` event to the session with the attacker id, target id, attack type, and limb when applicable. After commit, the sub-panel SHALL collapse to a summary row and disable further declarations for that attacker this phase.

**Priority**: Critical

#### Scenario: Punch declaration appends event

- **GIVEN** a player clicks "Declare" on the "Punch (Right Arm)" row for attacker `unit-1` targeting `unit-42`
- **WHEN** the confirmation modal is accepted
- **THEN** a `PhysicalAttackDeclared` event SHALL be appended
- **AND** its payload SHALL be `{attackerId: "unit-1", targetId: "unit-42", attackType: "Punch", limb: "RightArm"}`

#### Scenario: Post-declaration collapse

- **GIVEN** a player just declared a punch
- **WHEN** the sub-panel re-renders
- **THEN** the sub-panel SHALL show only a summary row ("Punch declared vs. unit-42")
- **AND** all Declare buttons SHALL be disabled
- **AND** the "Skip" button SHALL be hidden (declaration already made)

### Requirement: Reachable Hex Overlay by MP Type

The tactical map interface SHALL render a reachable-hex overlay during the Movement phase for the selected Player-side unit, coloring each tile by the movement type (Walk, Run, Jump) required to reach it using the MegaMek movement palette: Walk cyan, Run yellow, Jump red, and projected illegal/blocked movement dark gray. Each overlay state SHALL also carry a non-color encoding so movement legality and movement type remain distinguishable without relying on hue alone.

**Priority**: Critical

#### Scenario: Walk-range tiles rendered cyan

- **GIVEN** a selected unit has 5 walk MP and the player selects MP type Walk
- **WHEN** the overlay renders
- **THEN** every hex with `mpCost <= 5` via walk SHALL be tinted cyan (`#67e8f9`)
- **AND** each tile SHALL display its MP cost in small text

#### Scenario: Run-range tiles rendered yellow

- **GIVEN** the player selects MP type Run
- **WHEN** the overlay renders
- **THEN** tiles reachable only with run MP SHALL be tinted yellow (`#fef08a`)
- **AND** walk-reachable fallback tiles SHALL retain Walk movement metadata when the Run projection is blocked

#### Scenario: Jump-range tiles rendered red with pattern

- **GIVEN** the player selects MP type Jump
- **WHEN** the overlay renders
- **THEN** landing hexes reachable with jump SHALL be tinted red (`#f87171`) with a distinct diagonal pattern

#### Scenario: Blocked movement projections rendered dark gray

- **GIVEN** a movement projection exists for an illegal or over-capacity destination
- **WHEN** the overlay renders that projected blocked tile
- **THEN** the blocked movement tile SHALL be tinted dark gray (`#64748b`)
- **AND** tiles with no movement projection SHALL have no movement overlay tint

#### Scenario: Blocked tiles carry a non-color encoding

- **GIVEN** a movement projection marks a destination blocked or illegal
- **WHEN** the overlay renders that tile
- **THEN** the tile SHALL render a distinct non-hue encoding (such as a cross-hatch pattern or blocked glyph) in addition to the dark gray tint
- **AND** the encoding SHALL be distinguishable from the jump diagonal pattern

#### Scenario: Walk and run reach distinguishable without hue

- **GIVEN** the overlay renders walk-reachable and run-only-reachable tiles
- **WHEN** the tiles render at a playable zoom level
- **THEN** run-only tiles SHALL carry a non-hue encoding (such as a dashed border) distinguishing them from walk tiles
- **AND** the overlay legend SHALL document the non-color encodings alongside the palette colors

### Requirement: Path Preview on Hover

The tactical map interface SHALL render a hover-driven path preview from the
selected unit to the hovered reachable hex, using the existing A\*
pathfinder.

**Priority**: Critical

#### Scenario: Hover reachable hex draws path

- **GIVEN** a selected unit at {0,0} with the Walk overlay active
- **WHEN** the user hovers a reachable hex at {3,0}
- **THEN** every hex along the pathfinder's cheapest path SHALL be
  highlighted yellow (`#fef9c3`)
- **AND** the hovered hex SHALL display cumulative MP cost

#### Scenario: Hover unreachable hex shows tooltip

- **GIVEN** a hex not in the reachable set
- **WHEN** the user hovers it
- **THEN** no path SHALL be drawn
- **AND** a tooltip SHALL display `"Unreachable"`

#### Scenario: Clicking reachable hex commits destination

- **GIVEN** a hover path is visible
- **WHEN** the user clicks the hovered hex
- **THEN** the path SHALL persist as the committed plan
- **AND** the hover path SHALL lock until the plan is cleared

### Requirement: Facing Picker Overlay

The tactical map interface SHALL render a facing picker overlay at the
committed destination hex, allowing the player to rotate the unit in 60°
increments before locking movement.

**Priority**: High

#### Scenario: Picker appears on destination commit

- **GIVEN** the player has committed a destination hex
- **WHEN** the picker renders
- **THEN** six arrow buttons SHALL be drawn radially around the
  destination hex, one per `Facing` value
- **AND** the default highlighted arrow SHALL match the travel direction
  of the final path segment

#### Scenario: Clicking arrow updates planned facing

- **GIVEN** the picker is visible with default facing Northeast
- **WHEN** the user clicks the South arrow
- **THEN** `plannedMovement.facing` SHALL equal `Facing.South`
- **AND** the ghost unit token on the destination hex SHALL rotate to
  face South

#### Scenario: Picker dismisses on commit or cancel

- **GIVEN** the picker is visible
- **WHEN** the user clicks "Commit Move" or clears the plan
- **THEN** the picker SHALL dismiss
- **AND** no residual arrow buttons SHALL remain on the map

### Requirement: MP Type Indicator in Overlay Legend

The tactical map interface SHALL include a visible legend adjacent to the
map showing which MP type is currently driving the reachable overlay, and
what the colors mean.

**Priority**: Medium

#### Scenario: Legend reflects current MP type

- **GIVEN** the player has switched to Run
- **WHEN** the legend renders
- **THEN** the Run row SHALL be visually emphasized (bold + outline)
- **AND** Walk and Jump rows SHALL be dimmed

#### Scenario: Jump unavailable dims Jump row

- **GIVEN** the selected unit has `jumpMP = 0`
- **WHEN** the legend renders
- **THEN** the Jump row SHALL be rendered at 40% opacity
- **AND** hovering Jump SHALL show a tooltip `"No jump capability"`

---

### Requirement: Unit Token Rendering Uses Sprite System

The tactical map interface SHALL render unit tokens via the sprite system, replacing the abstract marker used in the Phase 1 MVP.

#### Scenario: Token uses MechSprite component

- **GIVEN** a unit is placed on the hex map
- **WHEN** the token renders
- **THEN** a `MechSprite` component SHALL render the silhouette
- **AND** an `ArmorPipRing` SHALL render the damage overlay
- **AND** the outer `<g>` element SHALL remain the click target for selection hit-testing

#### Scenario: Selection binding preserved

- **GIVEN** a user clicks a token
- **WHEN** the click fires
- **THEN** `useGameplayStore.setSelectedUnitId` SHALL be called with the clicked unit's ID exactly as before the sprite swap

#### Scenario: Side color preserved

- **GIVEN** the Phase 1 MVP applied a side-color tint
- **WHEN** the sprite renders
- **THEN** the same side color SHALL drive the sprite's tint
- **AND** existing accessibility overlays SHALL continue to apply

### Requirement: Minimap Panel

The tactical map interface SHALL render a minimap panel in the top-right
corner showing the full map, unit positions, and the current camera
viewport.

#### Scenario: Minimap dimensions and placement

- **GIVEN** the combat surface is rendering
- **WHEN** the minimap renders
- **THEN** it SHALL be positioned in the top-right corner
- **AND** it SHALL be 200x200 pixels with 12px margin
- **AND** it SHALL include an opaque backdrop with a subtle drop shadow

#### Scenario: Unit dots by side

- **GIVEN** the minimap is visible
- **WHEN** unit dots render
- **THEN** each unit SHALL render as a dot colored by side (Player
  blue, Opponent red, Neutral gray)
- **AND** dot size SHALL scale with weight class

#### Scenario: Camera viewport rectangle

- **GIVEN** the main camera is zoomed in on part of the map
- **WHEN** the minimap renders
- **THEN** a bordered rectangle SHALL render on the minimap
  representing the current camera viewport
- **AND** the rectangle SHALL update live as the camera pans/zooms

### Requirement: Minimap Interactions

The tactical map interface SHALL accept click and drag interactions on
the minimap to pan the main camera.

#### Scenario: Click centers main camera

- **GIVEN** the minimap is visible
- **WHEN** the user clicks on a point within the minimap
- **THEN** the main camera SHALL center on the corresponding map
  location

#### Scenario: Drag on viewport rectangle pans

- **GIVEN** the user is dragging on the minimap's viewport rectangle
- **WHEN** the drag moves
- **THEN** the main camera SHALL pan continuously to match

#### Scenario: Unit dot tooltip on hover

- **GIVEN** the user hovers a unit dot on the minimap
- **WHEN** the hover settles
- **THEN** a tooltip SHALL render with the unit's name and side

### Requirement: Minimap Toggle

The tactical map interface SHALL allow the user to toggle minimap
visibility.

#### Scenario: M hotkey toggles minimap

- **GIVEN** no modal overlay is active
- **WHEN** the user presses M
- **THEN** the minimap visibility SHALL toggle
- **AND** the toggle state SHALL persist across the current session

#### Scenario: Minimap accessibility role

- **GIVEN** the minimap is visible
- **WHEN** a screen reader traverses the page
- **THEN** the minimap SHALL expose `role="region"` with an
  `aria-label` describing it

### Requirement: Double-Click Unit Focus

The tactical map interface SHALL center the camera on a unit when the
user double-clicks its token.

#### Scenario: Double-click focuses and selects

- **GIVEN** a unit token is on-screen
- **WHEN** the user double-clicks the token
- **THEN** the camera SHALL center on the unit
- **AND** the unit SHALL become the selected unit
- **AND** a single click SHALL still behave as selection-only (no
  focus)

### Requirement: Quick Sim Result Panel

The tactical map interface SHALL provide a `QuickSimResultPanel`
component that accepts an `IBatchResult` and renders four sections:
win probability, turn count distribution, casualty breakdown, and a
collapsible raw data block.

#### Scenario: Panel renders all sections on completed batch

- **GIVEN** a valid `IBatchResult` with `totalRuns = 100`
- **WHEN** `QuickSimResultPanel` receives the result as props
- **THEN** the rendered DOM SHALL contain sections labeled
  `"Win Probability"`, `"Turn Count"`, `"Casualties"`, and a
  collapsible `"Raw Data"` region
- **AND** the header SHALL read `"Quick Resolve: 100 runs"`

#### Scenario: Empty state rendered when totalRuns is zero

- **GIVEN** an `IBatchResult` with `totalRuns = 0`
- **WHEN** the panel renders
- **THEN** the panel SHALL show `"Run a batch to see outcome
distribution"` with a `"Run Batch"` CTA button
- **AND** no win-probability bar SHALL be rendered

### Requirement: Win Probability Bar

The result panel SHALL render a horizontal stacked bar representing
`winProbability.{player, opponent, draw}` with player-first ordering
and inline percentage labels on segments wider than 10% of the bar.

#### Scenario: Bar segments scale to probabilities

- **GIVEN** `winProbability = {player: 0.62, opponent: 0.30, draw:
0.08}`
- **WHEN** the bar renders
- **THEN** the player segment SHALL occupy 62% of the width
- **AND** the opponent segment SHALL occupy 30%
- **AND** the draw segment SHALL occupy 8%

#### Scenario: Inline labels hidden for narrow segments

- **GIVEN** `winProbability.draw = 0.08`
- **WHEN** the bar renders
- **THEN** the draw segment SHALL NOT render an inline percentage label
  (below the 10% visibility threshold)

#### Scenario: Bar uses accessible label

- **GIVEN** `winProbability = {player: 0.62, opponent: 0.30, draw:
0.08}`
- **WHEN** the bar renders
- **THEN** the bar SHALL have `role="img"`
- **AND** `aria-label` SHALL equal `"Win probabilities: Player 62%,
Opponent 30%, Draw 8%"`

### Requirement: Most Likely Outcome Headline

The result panel SHALL display a headline above the win-probability bar
summarizing `mostLikelyOutcome` and a derived confidence qualifier.

#### Scenario: High-confidence player victory

- **GIVEN** `mostLikelyOutcome = "player"` and `winProbability.player =
0.85`
- **WHEN** the headline renders
- **THEN** the headline text SHALL equal `"Most Likely Outcome: Player
Victory (High)"`

#### Scenario: Moderate-confidence opponent victory

- **GIVEN** `mostLikelyOutcome = "opponent"` and
  `winProbability.opponent = 0.67`
- **WHEN** the headline renders
- **THEN** the headline text SHALL equal `"Most Likely Outcome:
Opponent Victory (Moderate)"`

#### Scenario: Low-confidence outcome

- **GIVEN** `mostLikelyOutcome = "player"` and `winProbability.player =
0.52`
- **WHEN** the headline renders
- **THEN** the headline text SHALL equal `"Most Likely Outcome: Player
Victory (Low)"`

#### Scenario: Draw headline omits confidence

- **GIVEN** `mostLikelyOutcome = "draw"` and `winProbability.draw =
0.50`
- **WHEN** the headline renders
- **THEN** the headline text SHALL equal `"Most Likely Outcome: Draw"`
  with no confidence qualifier

### Requirement: Turn Count Histogram

The result panel SHALL render a `TurnCountHistogram` chart bucketing
turn counts into 2-turn bins across `[turnCount.min, turnCount.max]`,
with mean (solid line), median (dashed line), p25/p75 (shaded band),
and p90 (labeled marker) overlays.

#### Scenario: Histogram renders when at least 2 runs succeeded

- **GIVEN** a batch with `totalRuns = 100` successful runs
- **WHEN** the histogram renders
- **THEN** the chart SHALL display at least one 2-turn bucket per
  sample point in the range
- **AND** the mean indicator SHALL be drawn as a solid vertical line at
  `turnCount.mean`
- **AND** the median SHALL be drawn as a dashed vertical line at
  `turnCount.median`

#### Scenario: Insufficient data shows fallback text

- **GIVEN** a batch with fewer than 2 successful runs
- **WHEN** the histogram renders
- **THEN** the histogram SHALL render the text `"Not enough data"`
  instead of a chart

#### Scenario: Screen-reader table fallback

- **GIVEN** the histogram is rendered with 5 buckets
- **WHEN** a screen reader inspects the component
- **THEN** a visually hidden `<table>` SHALL list each bucket with its
  count

### Requirement: Casualty Breakdown

The result panel SHALL render a two-column casualty section (Player /
Opponent) showing mech-destroyed frequency, heat-shutdown frequency,
and per-unit survival bars sorted by survival rate descending.

#### Scenario: Per-side metrics visible

- **GIVEN** `mechDestroyedFrequency = {player: 0.70, opponent: 0.45}`
  and `heatShutdownFrequency = {player: 0.18, opponent: 0.09}`
- **WHEN** the casualty section renders
- **THEN** the Player column SHALL show `"Mech Destroyed: 70%"` and
  `"Heat Shutdown: 18%"`
- **AND** the Opponent column SHALL show `"Mech Destroyed: 45%"` and
  `"Heat Shutdown: 9%"`

#### Scenario: Per-unit survival sorted

- **GIVEN** `perUnitSurvival = {"p1-atlas": 0.72, "p1-locust": 0.91,
"p1-commando": 0.44}`
- **WHEN** the Player column renders the per-unit rows
- **THEN** rows SHALL be ordered: Locust (91%), Atlas (72%), Commando
  (44%)
- **AND** each row SHALL render a 0-100% bar labeled with the unit's
  designation

### Requirement: Compact Summary Variant

The tactical map interface SHALL provide a compact
`QuickSimResultSummary` component suitable for the encounter detail
page, rendering a single row with a small win-prob bar, the outcome
headline, and a "View Full Results" link.

#### Scenario: Summary navigates to full panel

- **GIVEN** `QuickSimResultSummary` rendered on
  `/gameplay/encounters/[id]/index`
- **WHEN** the user clicks "View Full Results"
- **THEN** the browser SHALL navigate to
  `/gameplay/encounters/[id]/sim`
- **AND** the full-panel page SHALL render the same `IBatchResult`

#### Scenario: Summary empty state

- **GIVEN** no batch has been run yet for the encounter
- **WHEN** the summary renders
- **THEN** it SHALL display `"No quick resolve data yet"` with a `"Run
Batch"` CTA button
- **AND** the CTA SHALL dispatch `useQuickResolve()` with default
  `runs: 100`

### Requirement: Progress and Cancel Surface

The result panel SHALL render a progress bar with `runsCompleted /
totalRuns` during a running batch and a Cancel button that triggers
the batch's `AbortSignal`.

#### Scenario: Progress bar updates during batch

- **GIVEN** a batch in progress with `runsCompleted = 37` of `totalRuns
= 100`
- **WHEN** the progress bar renders
- **THEN** the bar SHALL display at 37% fill
- **AND** the label SHALL read `"37 / 100"`
- **AND** the bar SHALL have `role="progressbar"` with `aria-valuenow =
37`, `aria-valuemin = 0`, `aria-valuemax = 100`

#### Scenario: Cancel triggers abort and shows partial banner

- **GIVEN** a batch in progress at 37 runs completed
- **WHEN** the user clicks Cancel
- **THEN** the batch's `AbortSignal` SHALL fire
- **AND** once the current run finishes, the panel SHALL render a
  banner `"Partial results (cancelled)"`
- **AND** the underlying `IBatchResult.totalRuns` SHALL equal 37

### Requirement: Heat Glow Around Unit Tokens

The tactical map interface SHALL render a heat glow around each unit
token that intensifies with the unit's heat level.

#### Scenario: Glow intensifies with heat

- **GIVEN** a unit's heat rises from 0 to 12 over the course of a turn
- **WHEN** heat events fire
- **THEN** the glow color SHALL transition neutral -> amber at heat 5
- **AND** the glow color SHALL transition amber -> orange at heat 10
- **AND** transitions SHALL ease over 300ms

#### Scenario: Critical heat adds pulse

- **GIVEN** a unit's heat exceeds 20
- **WHEN** the glow renders
- **THEN** the glow SHALL be red-white
- **AND** the glow SHALL pulse with a ~1.5s period

#### Scenario: Textual badge for high heat

- **GIVEN** a unit's heat is at or above 15
- **WHEN** the token renders
- **THEN** a textual badge ("HOT", "OVERHEAT", or "CRITICAL") SHALL
  render on the token
- **AND** the badge SHALL remain visible for colorblind users

### Requirement: Shutdown Overlay

The tactical map interface SHALL render a powered-down overlay on any
unit in shutdown state.

#### Scenario: Shutdown desaturates token

- **GIVEN** a unit enters shutdown state
- **WHEN** the overlay applies
- **THEN** the sprite SHALL render desaturated via color matrix filter
- **AND** a "POWERED DOWN" label SHALL render beneath the token
- **AND** a subtle ~3s flicker SHALL hint at failed restart attempts

#### Scenario: Shutdown overrides heat glow

- **GIVEN** a unit was glowing red from heat 22 and now shuts down
- **WHEN** the shutdown overlay activates
- **THEN** the heat glow SHALL be suppressed
- **AND** only the shutdown overlay SHALL render on the token

#### Scenario: Shutdown announces via aria-live

- **GIVEN** an assistive technology user
- **WHEN** a unit enters shutdown
- **THEN** an `aria-live` region SHALL announce the shutdown event

### Requirement: Startup Pulse

When a unit exits shutdown state, the tactical map interface SHALL
play a short startup pulse animation.

#### Scenario: Successful restart plays amber pulse

- **GIVEN** a unit passes its restart roll
- **WHEN** the pulse plays
- **THEN** a radial pulse SHALL expand from 0 to 1.2x sprite scale
- **AND** the pulse color SHALL fade from amber to neutral over 800ms
- **AND** the shutdown overlay SHALL clear when the pulse finishes

#### Scenario: Failed restart plays short gray pulse

- **GIVEN** a unit fails its restart roll
- **WHEN** the pulse plays
- **THEN** a shorter 400ms pulse SHALL fade to gray
- **AND** the shutdown overlay SHALL remain active

### Requirement: Ammo Explosion Warning Aura

The tactical map interface SHALL render a warning aura when a unit's
heat enters the ammo-explosion-risk range defined by
`heat-overflow-effects`.

#### Scenario: Aura activates in danger range

- **GIVEN** a unit's heat enters the ammo-explosion-risk range
- **WHEN** the aura renders
- **THEN** a red-purple halo SHALL pulse with a ~1s period around the
  token
- **AND** the aura SHALL render above the sprite and armor pips

#### Scenario: Aura auto-dismisses when risk clears

- **GIVEN** a unit's heat drops out of the ammo-explosion-risk range
- **WHEN** the heat event fires
- **THEN** the aura SHALL fade out over 300ms
- **AND** the heat glow SHALL resume its current threshold color

### Requirement: Reduced Motion Collapse

All heat and shutdown indicators SHALL collapse to static forms under
`prefers-reduced-motion: reduce`.

#### Scenario: Reduced motion eliminates pulses

- **GIVEN** `prefers-reduced-motion: reduce` is set
- **WHEN** heat indicators render
- **THEN** HeatGlow SHALL render as a static colored outline
- **AND** the ammo explosion aura SHALL render as a static ring
- **AND** startup pulses SHALL collapse to an instant color change
- **AND** shutdown flicker SHALL stop

### Requirement: Movement Path Interpolation

The tactical map interface SHALL animate unit tokens along their
committed movement path, interpolating position from the start hex
through each hex in sequence.

#### Scenario: Walk animation at 300ms per hex

- **GIVEN** a unit commits a 3-hex walking move
- **WHEN** the animation plays
- **THEN** the token SHALL traverse each hex segment in 300ms with
  linear easing
- **AND** total animation time SHALL be approximately 900ms
- **AND** the token SHALL end at the destination hex

#### Scenario: Run animation at 180ms per hex

- **GIVEN** a unit commits a 5-hex running move
- **WHEN** the animation plays
- **THEN** the token SHALL traverse each hex in 180ms
- **AND** total animation time SHALL be approximately 900ms

#### Scenario: Facing rotates during path

- **GIVEN** a walking move that ends facing 3 hexes away from start
  facing
- **WHEN** the animation plays
- **THEN** the facing SHALL ease from start facing to commit facing
- **AND** the final facing SHALL match the committed move

### Requirement: Jump Arc Animation

Jumps SHALL animate as a single parabolic arc from start to destination,
rather than interpolating hex-by-hex.

#### Scenario: Jump plays as a single arc

- **GIVEN** a unit commits a jump move of any distance
- **WHEN** the animation plays
- **THEN** the token SHALL follow a parabolic arc from start to
  destination over 600ms
- **AND** the arc peak SHALL rise above the token's baseline by at
  least 24px (scaled to zoom)

#### Scenario: Jump arc indicator

- **GIVEN** a jump animation is active
- **WHEN** the arc plays
- **THEN** a faint blue arc SHALL render from start to destination
- **AND** the arc SHALL fade out after the animation completes

### Requirement: Phase Advancement Gate On Active Animations

The tactical map interface SHALL prevent phase advancement while any
movement animation is active, and SHALL resume advancement once the
animation queue drains.

#### Scenario: Next unit waits for animation

- **GIVEN** unit A is mid-animation along its movement path
- **WHEN** the game engine tries to advance to unit B's lock
- **THEN** advancement SHALL wait until unit A's animation completes
- **AND** unit B's lock SHALL begin immediately after

#### Scenario: Heat and PSR events flush after animation

- **GIVEN** a committed move that generates heat and triggers a PSR
- **WHEN** the animation plays
- **THEN** heat and PSR events SHALL be buffered until the animation
  completes
- **AND** the event log SHALL render them after the token settles

### Requirement: Reduced Motion Accessibility

The tactical map interface SHALL respect the user's
`prefers-reduced-motion` setting and fall back to instant position
updates when enabled.

#### Scenario: Reduced motion snaps to destination

- **GIVEN** the user has `prefers-reduced-motion: reduce` set
- **WHEN** a movement animation would play
- **THEN** the token SHALL snap to its destination instantly
- **AND** the phase advancement gate SHALL release on the same tick
- **AND** no arc or path tween SHALL render

#### Scenario: Game logic unaffected by reduced motion

- **GIVEN** reduced motion is enabled
- **WHEN** a player commits a move
- **THEN** all game events, heat, PSR, and pilot rolls SHALL still
  fire identically
- **AND** only the visual interpolation SHALL be suppressed

### Requirement: Screen Shake On Heavy Hits

The tactical map interface SHALL shake the map root when a single hit
applies 10 or more damage, with intensity scaling with damage and
dampened for reduced-motion users.

#### Scenario: 10+ damage triggers shake

- **GIVEN** a unit takes 12 damage from a single weapon hit
- **WHEN** the shake fires
- **THEN** the map root SHALL offset by small pseudo-random x/y within
  the intensity radius
- **AND** intensity SHALL scale linearly with damage, clamped at 8px
- **AND** total duration SHALL be 300ms

#### Scenario: Under 10 damage does not shake

- **GIVEN** a unit takes 6 damage from a single hit
- **WHEN** the event fires
- **THEN** no shake SHALL occur

#### Scenario: Reduced motion dampens shake

- **GIVEN** `prefers-reduced-motion: reduce` is set
- **WHEN** a 20-damage hit would trigger a large shake
- **THEN** shake amplitude SHALL be halved
- **AND** shakes with effective intensity below 2px SHALL be skipped

### Requirement: Hit Location Flash

The tactical map interface SHALL flash the specific armor-pip group of
a hit location white for 250ms when damage applies there.

#### Scenario: Flash targets hit location

- **GIVEN** a unit's RA takes 5 damage
- **WHEN** the flash renders
- **THEN** the RA pip group SHALL flash white at 60% opacity for 250ms
- **AND** other pip groups SHALL NOT flash

#### Scenario: Transferred damage flashes destination

- **GIVEN** damage overflows from LA into LT
- **WHEN** the flashes render
- **THEN** the LA pip group SHALL flash first
- **AND** the LT pip group SHALL flash second (sequential)

### Requirement: Smoke From Destroyed Locations

The tactical map interface SHALL render a looping smoke animation near
each destroyed location of a living unit, persisting until the unit
becomes a wreck.

#### Scenario: Destroyed arm vents smoke

- **GIVEN** a unit's LA is destroyed
- **WHEN** the effect layer renders
- **THEN** a looping smoke sprite SHALL render near the LA pip group
- **AND** the smoke SHALL persist across frames while the unit is alive

#### Scenario: Multiple destroyed locations = multiple smoke streams

- **GIVEN** a unit has both LA and RL destroyed
- **WHEN** the effects render
- **THEN** two concurrent smoke streams SHALL render
- **AND** each SHALL anchor to its pip group

#### Scenario: Wreck replaces live smoke streams

- **GIVEN** a unit with two smoke streams is destroyed
- **WHEN** the unit becomes a wreck
- **THEN** both live smoke streams SHALL stop
- **AND** a single quieter wreck-smoke stream SHALL replace them

### Requirement: Engine Fire

The tactical map interface SHALL render a flame animation on any unit
with one or more engine critical hits, persisting until destruction.

#### Scenario: First engine crit ignites a small flame

- **GIVEN** a unit takes its first engine critical hit
- **WHEN** the effect renders
- **THEN** a small animated flame SHALL render at the unit's torso
  anchor
- **AND** the flame SHALL persist until the unit dies

#### Scenario: Second engine crit intensifies flame

- **GIVEN** a unit takes a second engine critical hit
- **WHEN** the effect renders
- **THEN** the flame SHALL scale larger and brighter
- **AND** the flame SHALL remain a single effect (not two flames)

### Requirement: Debris Cloud And Wreck Sprite

On unit destruction, the tactical map interface SHALL play a debris
cloud burst and transition the token to a wreck sprite variant.

#### Scenario: Wreck markers do not block LOS

- **GIVEN** a destroyed unit marker occupies an intervening hex between an attacker and target
- **WHEN** the tactical map derives combat projection and LOS highlights
- **THEN** the destroyed marker SHALL NOT create a LOS blocker reference, LOS blocker badge, or LOS hover context
- **AND** the target hex SHALL remain direct-fire attackable when terrain, elevation, range, and arc rules otherwise allow it
- **AND** committed attack validation SHALL use the same non-blocking LOS result as the preview

### Requirement: Optional Battlefield Wreckage Terrain

Battlefield wreckage terrain conversion SHALL be event-sourced. When a live conversion changes the grid, the session event log SHALL include `TerrainChanged` with the resolved hex, terrain, optional elevation, previous terrain/elevation when known, `reason: 'battlefield_wreckage'`, `sourceUnitId`, and `sourceEventId`.

#### Scenario: Battlefield wreck terrain survives recovery

- **GIVEN** `tacops_battle_wreck` is enabled
- **AND** a destroyed heavy ground unit changes its hex to rough terrain
- **WHEN** the session is recovered from its event-derived state
- **THEN** the recovered interactive grid SHALL contain the same rough terrain at the destroyed unit's hex
- **AND** the `TerrainChanged` event SHALL identify the `UnitDestroyed` event that caused the terrain mutation

### Requirement: Persistent Effects Survive Replay

Smoke and fire SHALL be derived from unit state (destroyed locations,
engine crits) so they render correctly after a page reload or replay
scrub.

#### Scenario: Reload preserves smoke

- **GIVEN** a unit has a destroyed LA emitting smoke
- **WHEN** the page reloads and state rehydrates
- **THEN** smoke SHALL render from LA without replaying the
  LocationDestroyed event

#### Scenario: Replay scrub derives effects from state

- **GIVEN** a replay scrubs from turn 1 to turn 5 where a unit has
  engine crits
- **WHEN** the scrub settles
- **THEN** engine fire SHALL render on that unit immediately
- **AND** the effect SHALL not require replaying every intermediate
  event

### Requirement: Persistent Effect Layer Ordering

The tactical map interface SHALL render persistent damage effects after
the token layer and before transient attack effects. Selection and target
rings remain token-local in the current per-type token renderers, so the
implementation exposes `data-layer-position="above-token-layer-below-attack-effects"`
on the persistent effects layer to document the actual paint order.

#### Scenario: Persistent effects render above tokens and below attack effects

- **GIVEN** a unit has persistent smoke or fire and an attack animation
  is playing
- **WHEN** the tactical map renders
- **THEN** token sprites, armor pips, selection rings, and target rings
  SHALL render in the token layer
- **AND** persistent smoke/fire/wreck effects SHALL render after that
  token layer
- **AND** attack effects SHALL render after persistent effects

### Requirement: Attack Effects Layer

The tactical map interface SHALL include an attack effects layer that
renders above the unit token layer and subscribes to
`AttackResolved` events.

#### Scenario: Effects layer renders above tokens

- **GIVEN** an attack animation plays
- **WHEN** the effect primitive renders
- **THEN** it SHALL render above unit tokens so beams are not
  occluded
- **AND** it SHALL render beneath modal overlays (HUD, minimap,
  action panel)

#### Scenario: Effects coordinate with damage feedback

- **GIVEN** an attack resolves as a hit causing 5 damage
- **WHEN** the primary effect plays
- **THEN** the impact flash SHALL fire at the tail of the effect
- **AND** damage-pip decay animations SHALL begin synchronized with
  the impact flash

### Requirement: Firing Arc Shading Overlay

The tactical map interface SHALL render firing-arc shading for the
selected unit's front, side, and rear arcs.

#### Scenario: Arc colors by classification

- **GIVEN** a friendly unit is selected
- **WHEN** the arc overlay renders
- **THEN** front-arc hexes SHALL shade green at ~25% alpha
- **AND** left/right side hexes SHALL shade yellow at ~20% alpha
- **AND** rear-arc hexes SHALL shade red-pink at ~25% alpha

#### Scenario: Arc shading limited to weapon range

- **GIVEN** a unit with maximum weapon range 12 hexes
- **WHEN** the arc overlay renders
- **THEN** only hexes within 12 range SHALL shade
- **AND** hexes beyond range SHALL remain unshaded

#### Scenario: Colorblind shape overlay

- **GIVEN** a colorblind simulation mode
- **WHEN** the arc overlay renders
- **THEN** each arc SHALL include a shape overlay (up-chevron for front,
  dot for side, minus for rear)
- **AND** arcs SHALL remain distinguishable without color

#### Scenario: Arcs hide during animation

- **GIVEN** a movement animation is active
- **WHEN** the overlay would render
- **THEN** arc shading SHALL be suppressed
- **AND** shading resumes after the animation completes

#### Scenario: User hotkey toggles arcs

- **GIVEN** the user presses the arc toggle hotkey (A)
- **WHEN** toggled off
- **THEN** arc shading SHALL hide regardless of selection
- **AND** toggling back on SHALL restore arc rendering

### Requirement: Line-Of-Sight Overlay Coexists With Arc Shading

The tactical map interface SHALL render the LOS line on top of firing
arc shading when both overlays are active.

#### Scenario: LOS line renders above arc shading

- **GIVEN** arc shading is visible and the user hovers a hex
- **WHEN** the LOS overlay renders
- **THEN** the LOS line SHALL render above the arc shading layer
- **AND** the line SHALL remain legible against the shading

### Requirement: Unified Combat-State Token Projection Adapter

The system SHALL provide a single shared `unitStateToToken` projection adapter that converts an `IUnitGameState` into an `IUnitToken` for tactical-map rendering. The adapter MUST narrow on `IUnitGameState.combatState.kind` and SHALL populate per-type token fields (`altitude`, `infantryCount`, `trooperCount`, `protoCount`, `isGlider`, `hasMainGun`) from the envelope.

The adapter SHALL be the only call-site in the codebase that reads `IUnitGameState.combatState` to populate `IUnitToken` per-type fields. Per-component or per-screen reimplementations of this projection are PROHIBITED.

#### Scenario: Aerospace projection

- **GIVEN** an `IUnitGameState` with `combatState.kind === 'aero'` and `state.altitude === 0`
- **WHEN** `unitStateToToken(...)` is called
- **THEN** the returned `IUnitToken.altitude` SHALL equal `0`
- **AND** `unitType` SHALL be `TokenUnitType.Aerospace`

#### Scenario: Infantry projection

- **GIVEN** an `IUnitGameState` with `combatState.kind === 'platoon'` and `state.survivingTroopers === 22`
- **WHEN** `unitStateToToken(...)` is called
- **THEN** the returned `IUnitToken.infantryCount` SHALL equal `22`
- **AND** `unitType` SHALL be `TokenUnitType.Infantry`

#### Scenario: Battle armor projection

- **GIVEN** an `IUnitGameState` with `combatState.kind === 'squad'` and 3 surviving troopers
- **WHEN** `unitStateToToken(...)` is called
- **THEN** the returned `IUnitToken.trooperCount` SHALL equal `3`
- **AND** `unitType` SHALL be `TokenUnitType.BattleArmor`

#### Scenario: Protomech projection

- **GIVEN** an `IUnitGameState` with `combatState.kind === 'proto'`, `state.chassisType === ProtoChassis.GLIDER`, and `state.hasMainGun === true`
- **WHEN** `unitStateToToken(...)` is called
- **THEN** the returned `IUnitToken.protoCount` SHALL reflect surviving proto count
- **AND** `IUnitToken.isGlider` SHALL be `true`
- **AND** `IUnitToken.hasMainGun` SHALL be `true`
- **AND** `unitType` SHALL be `TokenUnitType.ProtoMech`

#### Scenario: Mech projection (legacy path)

- **GIVEN** an `IUnitGameState` whose `combatState` is `undefined`
- **WHEN** `unitStateToToken(...)` is called
- **THEN** the returned `IUnitToken` SHALL omit per-type fields
- **AND** `unitType` SHALL default per current `TokenUnitType.Mech` rules

### Requirement: Per-Type Token Renders SHALL Read Envelope Values

The four per-type token components (`AerospaceToken`, `InfantryToken`, `BattleArmorToken`, `ProtoMechToken`) SHALL read per-type fields (`altitude`, `infantryCount`, `platoonCount`, `trooperCount`, `protoCount`, `isGlider`, `hasMainGun`) directly from the `IUnitToken` props with NO inline `?? <default>` fall-back expression.

Producers (the unified `unitStateToToken` projection adapter) are responsible for populating concrete values from `IUnitGameState.combatState`. When `combatState` is absent for a unit whose `unitType` is in the four supported per-type discriminants, that is a producer-side bug (caught by the init-time assertion in `game-state-management`), NOT a render-side concern.

(`velocity` is exempt from this rule until "movement slice 2" lands; an `?? 0` fallback MAY remain in `AerospaceToken` with a TODO comment.)

The previous behaviour — each token component carrying inline `?? <default>` fall-backs (`altitude ?? 1`, `infantryCount ?? 28`, `trooperCount ?? 4`, `protoCount ?? 5`) so they would render visibly even when no producer wired the field — is REMOVED.

#### Scenario: Aerospace token renders envelope altitude

- **GIVEN** an `IUnitToken` with `unitType === TokenUnitType.Aerospace` and `altitude === 0`
- **WHEN** `<AerospaceToken token={token} ... />` renders
- **THEN** the rendered output SHALL reflect the landed visual state
- **AND** the source code SHALL NOT contain any `altitude ?? <default>` expression

#### Scenario: Infantry token renders envelope troopers

- **GIVEN** an `IUnitToken` with `unitType === TokenUnitType.Infantry` and `infantryCount === 22`
- **WHEN** `<InfantryToken token={token} ... />` renders
- **THEN** the rendered output SHALL reflect 22 troopers
- **AND** the source code SHALL NOT contain any `infantryCount ?? <default>` expression

#### Scenario: Battle armor token renders envelope troopers

- **GIVEN** an `IUnitToken` with `unitType === TokenUnitType.BattleArmor` and `trooperCount === 3`
- **WHEN** `<BattleArmorToken token={token} ... />` renders
- **THEN** the rendered output SHALL reflect 3 trooper dots
- **AND** the source code SHALL NOT contain any `trooperCount ?? <default>` expression

#### Scenario: Protomech token renders envelope flags

- **GIVEN** an `IUnitToken` with `unitType === TokenUnitType.ProtoMech`, `protoCount === 4`, `isGlider === true`, `hasMainGun === false`
- **WHEN** `<ProtoMechToken token={token} ... />` renders
- **THEN** the rendered output SHALL reflect 4 protos, glider variant, no main gun
- **AND** the source code SHALL NOT contain `protoCount ?? <default>`, `isGlider ?? false`, or `hasMainGun ?? false` expressions

### Requirement: Replay Movement Step Animation Playback

The replay surfaces SHALL animate token movement during scrub by enqueueing one `TacticalAnimation` per `IMovementStep` from `IMovementDeclaredPayload.steps[]` into the existing `useAnimationQueue` Zustand store at `src/stores/useAnimationQueue.ts`. The two replay surfaces in scope are `QuickGameReplayPanel` (at `src/components/quickgame/QuickGameReplayPanel.tsx`) and the standalone replay route (at `src/pages/gameplay/games/[id]/replay.tsx`). The animation contract (per-hex tween duration, jump arc shape, reduced-motion fallback) SHALL match the live-play contract defined by `Movement Path Interpolation`, `Jump Arc Animation`, and `Reduced Motion Accessibility` so the watcher sees the same visual behavior the player saw at commit time.

The replay-side enqueue SHALL be performed by a side-effect
adapter (a React hook) that observes cursor advancement on
`useReplayPlayer.currentSequence` (or the equivalent shared replay
player state). The pure projection hook
`useHexMapStateFromEvents` SHALL remain side-effect-free — the
adapter SHALL be a separate hook that consumes the same `events`
array and the live cursor.

When the cursor advances forward across a `MovementDeclared`
event, the adapter SHALL enqueue exactly one `TacticalAnimation`
per entry in `payload.steps[]`, in `step.index` order. Steps with
`kind: 'forward'` / `'lateral'` / `'jump'` SHALL produce a
`TacticalAnimation` with `kind: 'movement'`, the step's `from` and
`to` packed as a 2-entry `path` array, and the step's `mpCost`
mapped to the appropriate `MovementAnimationMode` (walk/run/jump).
Steps with `kind: 'turn'` SHALL produce a movement animation
carrying only `initialFacing` and `finalFacing` (no path) so the
existing facing-tween logic in the queue consumer can render the
rotation. Steps with `kind: 'standUp'` / `'goProne'` /
`'chargeDeclared'` / `'dfaDeclared'` / `'shakeOffSwarm'` SHALL be
skipped at the adapter (these are state transitions handled by
existing token-renderer pose state, not interpolated paths) and
SHALL NOT throw.

When the cursor decreases (the watcher rewinds via the scrubber),
the adapter SHALL call
`useAnimationQueue.getState().reset()` before walking the events
forward to the new cursor position. This flushes any in-flight or
queued animations that the watcher has now scrubbed past so a
stale "still walking" animation cannot finish on top of the new
state.

When the user has `prefers-reduced-motion: reduce` set, the
adapter SHALL skip the per-step enqueue entirely. Token positions
SHALL update via the pure reducer's `acc.position = payload.to`
projection only, matching live-play `Reduced Motion Accessibility`.

When `payload.steps` is missing (legacy event streams written
before PR #533), the adapter SHALL fall back to a single instant-
snap animation derived from `payload.from` / `payload.to`,
mirroring the live-play `Movement Animation Replay Backfill`
contract in `movement-system`.

#### Scenario: Forward step chain enqueues one animation per step

- **GIVEN** a replay with a `MovementDeclared` event carrying
  `payload.steps` of 5 entries
  `[forward(0→1), forward(1→2), turn(left), forward(2→3), turn(right)]`
- **AND** the watcher's `prefers-reduced-motion` is `no-preference`
- **WHEN** the cursor advances from `currentSequence = 0` past the
  movement event
- **THEN** the adapter SHALL call `useAnimationQueue.getState().enqueue`
  exactly 5 times in `step.index` order
- **AND** the 3 `forward` enqueues SHALL each carry a 2-entry
  `path` of the step's `from` and `to` hex coordinates
- **AND** the 2 `turn` enqueues SHALL carry only `initialFacing`
  and `finalFacing` (no `path`)

#### Scenario: Jump step produces a single jump-mode animation

- **GIVEN** a `MovementDeclared` whose `payload.steps` is exactly
  one entry `[{ kind: 'jump', from: {q:0,r:0}, to: {q:4,r:0},
  mpCost: 4, terrainEntered: '...' }]`
- **WHEN** the adapter processes the event
- **THEN** exactly one animation SHALL be enqueued
- **AND** that animation's `mode` SHALL be the jump-arc mode
  (whatever value `MovementAnimationMode.Jump` resolves to in
  `@/types/gameplay`)
- **AND** the existing live-play jump-arc renderer SHALL drive
  the parabolic arc from `(q:0,r:0)` to `(q:4,r:0)` over 600 ms

#### Scenario: Cursor rewind flushes the animation queue

- **GIVEN** a replay where the watcher has scrubbed to
  `currentSequence = 50` and movement animations are mid-flight
  in `useAnimationQueue.active`
- **WHEN** the watcher drags the scrubber back to
  `currentSequence = 30`
- **THEN** the adapter SHALL call
  `useAnimationQueue.getState().reset()` before re-walking events
  to sequence 30
- **AND** the queue's `active` and `queue` arrays SHALL both be
  empty at the moment immediately after the rewind transition

#### Scenario: Reduced-motion skips per-step enqueue entirely

- **GIVEN** the watcher has `prefers-reduced-motion: reduce`
- **WHEN** the cursor advances across a 5-step `MovementDeclared`
- **THEN** `useAnimationQueue.getState().enqueue` SHALL NOT be
  called for any of the 5 steps
- **AND** the token's `position` SHALL still update to
  `payload.to` via the pure reducer (token jumps to destination
  without intermediate visual interpolation)

#### Scenario: Legacy event without steps falls back to instant snap

- **GIVEN** a replay with a `MovementDeclared` event whose
  `payload.steps` field is absent (legacy NDJSON written before
  step-chain emission shipped)
- **WHEN** the cursor advances across the event
- **AND** the watcher's `prefers-reduced-motion` is
  `no-preference`
- **THEN** the adapter SHALL enqueue exactly one animation
- **AND** that animation SHALL carry a 2-entry `path` of
  `payload.from` and `payload.to`
- **AND** the adapter SHALL NOT throw on the missing `steps`
  field

#### Scenario: Skipped step kinds do not throw

- **GIVEN** a `MovementDeclared` whose `payload.steps` includes a
  `{ kind: 'standUp', at, mpCost: 2, psrTriggered: true }` entry
- **WHEN** the adapter processes the event
- **THEN** the adapter SHALL NOT call `enqueue` for the
  `standUp` step
- **AND** the adapter SHALL NOT throw
- **AND** subsequent `forward` / `turn` / `jump` / `lateral`
  steps in the same payload SHALL still enqueue normally

### Requirement: Attack Effects Layer In Replay Surfaces

The replay surfaces SHALL mount `<AttackEffectsLayer>` as a sibling to `<HexMapDisplay>` so weapon impacts render their laser / missile / projectile / impact-flash primitives during replay scrub. The two replay surfaces in scope are `QuickGameReplayPanel` (at `src/components/quickgame/QuickGameReplayPanel.tsx`) and the standalone replay route (at `src/pages/gameplay/games/[id]/replay.tsx`). The layer SHALL receive the same `tokens` array that drives the hex-map render — derived from `useHexMapStateFromEvents(events, currentSequence).tokens` — and the same `events` array passed to the projection hook.

The layer SHALL NOT require enrichment of `IAttackResolvedPayload`
with `sourceHex` / `targetHex` fields. The layer's existing
attacker-and-target-hex derivation logic SHALL look up
`payload.attackerId` and `payload.targetId` in the `tokens` array
to find each unit's `position` at the event's sequence, matching
the cross-reference behavior already used in live play.

The layer SHALL render above the unit token layer and beneath
modal overlays, matching the existing `Attack Effects Layer`
requirement for live play. The `mapId` prop SHALL be a
deterministic identifier scoped to the replay surface (e.g.
`'replay'` or `'quickgame-replay'`) so animation queue overlap
detection isolates replay animations from any concurrently-
mounted live-play animation queue.

#### Scenario: QuickGameReplayPanel mounts the attack effects layer

- **GIVEN** the user activates the `Replay` tab in
  `QuickGameResults` for a completed quick game
- **WHEN** `QuickGameReplayPanel` mounts
- **THEN** the rendered DOM SHALL contain exactly one
  `<AttackEffectsLayer>` element
- **AND** the layer SHALL receive `events={game.events}`
- **AND** the layer SHALL receive `tokens` from
  `useHexMapStateFromEvents(events, currentSequence).tokens`
- **AND** the layer SHALL receive a `mapId` prop that does NOT
  collide with the live-play `mapId`

#### Scenario: Standalone replay route mounts the attack effects layer

- **GIVEN** a navigation to `/gameplay/games/<sessionId>/replay`
  with a populated event log
- **WHEN** the replay page mounts
- **THEN** the rendered DOM SHALL contain exactly one
  `<AttackEffectsLayer>` element
- **AND** the layer SHALL be a sibling to `<HexMapDisplay>` in
  the rendered tree (not a parent or child)

#### Scenario: Beam derives endpoints from token state at event sequence

- **GIVEN** a replay with two units `player-1` at hex
  `(q=0,r=0)` and `opponent-2` at hex `(q=3,r=0)` after both
  have moved during the encounter
- **AND** an `AttackResolved` event firing at sequence 75 with
  `payload.attackerId = 'player-1'` and `payload.targetId =
  'opponent-2'` and `payload.hit = true`
- **WHEN** the cursor reaches sequence 75
- **THEN** the attack effects layer SHALL render a beam between
  `player-1`'s position at sequence 75 and `opponent-2`'s
  position at sequence 75
- **AND** the layer SHALL NOT read any `sourceHex` /
  `targetHex` field from `payload` (these fields do not exist)

#### Scenario: Reduced motion respects existing layer fallback

- **GIVEN** the watcher has `prefers-reduced-motion: reduce`
- **AND** the replay surface mounts `<AttackEffectsLayer>`
- **WHEN** an `AttackResolved` event fires
- **THEN** the layer SHALL use its existing reduced-motion
  fallback (`REDUCED_MOTION_LINE_DURATION_MS = 300` and
  `REDUCED_MOTION_IMPACT_FLASH_MS = 80`)
- **AND** the layer SHALL NOT play full-duration beam / missile
  trail animations

### Requirement: Tactical Command Shell Slots

The tactical map interface SHALL provide a map-first command shell with named slots for combat information and controls.

#### Scenario: Desktop shell allocates persistent border regions
- **GIVEN** the tactical combat route renders at desktop width
- **WHEN** the command shell mounts
- **THEN** the center region SHALL be the interactive map
- **AND** the top band SHALL contain phase, round, initiative, and global match status
- **AND** the bottom dock SHALL contain active-unit actions and end/confirm controls
- **AND** the left tray SHALL contain map lenses, objectives, and navigation controls
- **AND** the right tray SHALL contain selected unit and target inspectors
- **AND** the minimap cluster SHALL be reachable without covering the active unit token

#### Scenario: Combat facts have one primary home
- **GIVEN** phase, active unit, target state, heat, weapons, event history, and map lenses are all available
- **WHEN** the shell renders
- **THEN** each fact SHALL have exactly one primary slot owner
- **AND** secondary surfaces MAY show a summary only if they deep-link or focus the primary owner

### Requirement: Map-Dominant Visual Priority

The command shell SHALL preserve the map as the dominant surface and avoid carding the map inside decorative containers.

#### Scenario: Border UI does not consume the battlefield
- **GIVEN** a player enters a playable combat phase
- **WHEN** all default shell slots are visible
- **THEN** no persistent border region SHALL overlap selectable hexes
- **AND** transient overlays SHALL dismiss or collapse before blocking movement or attack confirmation

#### Scenario: Pinned panels preserve map interaction
- **GIVEN** the player pins a right inspector or bottom drawer
- **WHEN** the player pans, zooms, selects a unit, or hovers a hex
- **THEN** map interaction SHALL remain available
- **AND** the pinned panel SHALL not steal scroll or drag gestures intended for the map outside its own bounds

### Requirement: Shell Mode Ownership

The command shell SHALL support combat, replay, spectator, and GM/referee modes through the same slot contract.

#### Scenario: Replay mode swaps action dock for playback controls
- **GIVEN** a replay is loaded into the tactical shell
- **WHEN** replay mode is active
- **THEN** the bottom dock SHALL show playback controls instead of combat commit buttons
- **AND** unit inspectors and event feed SHALL reflect the replay cursor state

#### Scenario: Spectator mode disables private commands
- **GIVEN** a user views a match as a spectator
- **WHEN** the shell renders
- **THEN** action commands SHALL be disabled or absent
- **AND** public map lenses, event feed, minimap, and visible unit inspectors SHALL remain available

### Requirement: Tactical Shell State Contract

The tactical map interface SHALL expose a typed shell state contract for selected slot, pinned panels, collapsed panels, shell mode, active context, viewer player identity, and per-opponent visibility scopes.

#### Scenario: Shell state round-trips through UI actions
- **GIVEN** `ITacticalShellState` has a collapsed left tray, pinned right inspector, and active bottom dock tab
- **WHEN** the shell re-renders after map selection changes
- **THEN** collapsed, pinned, and active tab state SHALL persist
- **AND** selection-derived content SHALL update without resetting manually chosen shell layout

#### Scenario: Shell distinguishes selected, active, and inspected unit references
- **GIVEN** the player is inspecting an ally token mid-turn while a different friendly unit holds activation
- **WHEN** the shell reads its unit-reference state
- **THEN** `selectedUnit` (the token the player clicked), `activeUnit` (the unit whose turn it currently is), and `inspectedUnit` (the unit whose record sheet is open in the right tray) SHALL be addressable as three independent fields
- **AND** the action dock SHALL bind to `activeUnit`, the right-tray inspector SHALL bind to `inspectedUnit`, and the map highlight SHALL bind to `selectedUnit` without cross-coupling

### Requirement: Per-Viewer Visibility Scope

The tactical shell state SHALL carry a viewer identity and per-opponent visibility scope so the same shell composition can render correctly for co-op (N≥2 guests) and PvP campaigns without leaking hidden opponent state.

#### Scenario: Shell state scopes per-viewer for co-op and PvP
- **GIVEN** a co-op or PvP match with two or more opposing players
- **WHEN** the shell renders for a specific viewer
- **THEN** `ITacticalShellState.viewerPlayerId` SHALL identify the local viewer
- **AND** `opponentVisibilityScopes` SHALL map each opposing player id to their visibility tier (`exact`, `rough`, `last-known`, `hidden`, `unknown`)
- **AND** the shell SHALL NOT leak hidden opponent state across viewer boundaries
- **AND** redaction SHALL occur in the data adapter that feeds the shell, not in CSS visibility

#### Scenario: PvP shell renders symmetric chrome for two player factions
- **GIVEN** a PvP match where player A and player B hold opposing forces
- **WHEN** player B opens the shell on their client
- **THEN** the same slot contract SHALL render with player B as `viewerPlayerId`
- **AND** action dock, inspectors, and intel projection SHALL bind to player B's force without requiring a separate component tree

### Requirement: Tactical Command Registry

The tactical map interface SHALL expose a command registry for active-unit and map-context actions.

#### Scenario: Active unit command set follows phase
- **GIVEN** a player unit is selected during the Movement phase
- **WHEN** the action dock renders
- **THEN** movement, facing, stand/stabilize, and cancel commands SHALL be available according to engine validation
- **AND** weapon and physical attack commands SHALL be absent or disabled with phase-specific reasons

#### Scenario: Disabled command explains invalidity
- **GIVEN** a unit cannot fire a selected weapon because of range, heat, ammo, or arc
- **WHEN** the weapon command is shown
- **THEN** the command SHALL expose a disabled reason derived from rule validation
- **AND** the UI SHALL show that reason in a tooltip or detail pane

### Requirement: Command Preview Lifecycle

The tactical action menu system SHALL preview irreversible command outcomes before commit.

#### Scenario: Movement preview shows path and facing
- **GIVEN** a player selects a movement destination
- **WHEN** the movement command preview is active
- **THEN** the map SHALL show the path, movement cost, destination, and proposed facing
- **AND** the confirm control SHALL commit only the currently previewed destination and facing

#### Scenario: Attack preview shows expected consequences
- **GIVEN** a player selects an enemy target during a weapon or physical attack phase
- **WHEN** an attack command preview is active
- **THEN** the UI SHALL show target, range band, to-hit number, selected weapons or physical attack type, heat cost, ammo impact, and likely damage envelope where available

### Requirement: Context Menus Mirror Command Registry

Hex and unit context menus SHALL be secondary views over the same command registry used by the action dock.

#### Scenario: Unit token context menu filters commands
- **GIVEN** the player right-clicks or long-presses a friendly unit token
- **WHEN** the context menu opens
- **THEN** it SHALL list commands valid for that unit and current phase
- **AND** selecting a command SHALL update the same selected command state used by the action dock

#### Scenario: Enemy token context menu targets enemy
- **GIVEN** the player opens a context menu on a visible enemy token
- **WHEN** attack commands are valid
- **THEN** target-aware commands SHALL preselect that enemy as the target
- **AND** command preview SHALL still require explicit confirmation before commit

### Requirement: Command Confirmation and Cancellation

The action menu system SHALL provide consistent commit, cancel, undo-where-supported, and end-phase behavior.

#### Scenario: Cancel returns to neutral selection state
- **GIVEN** a command preview is active
- **WHEN** the player cancels the preview
- **THEN** no engine action SHALL be committed
- **AND** selected unit and target state SHALL remain intact unless the player explicitly clears them

#### Scenario: End phase distinguishes no-op from unresolved actions
- **GIVEN** the player presses End Phase
- **WHEN** required actions remain for active units
- **THEN** the UI SHALL warn or cycle to the next required action according to match settings
- **AND** the engine SHALL not advance until required commits are resolved or explicitly skipped where legal

### Requirement: Tactical Turn Order Rail

The tactical map interface SHALL render a turn order rail that communicates phase, active side, active unit, upcoming units, and unresolved action counts.

#### Scenario: Rail shows current and upcoming activations
- **GIVEN** a tactical session has multiple units across both sides
- **WHEN** the rail renders during an interactive phase
- **THEN** the current active unit SHALL be visually distinct
- **AND** upcoming units SHALL be shown in initiative order where the session exposes one
- **AND** completed, skipped, destroyed, or withdrawn units SHALL use distinct compact states

#### Scenario: Rail selects and focuses units
- **GIVEN** the player selects a unit in the rail
- **WHEN** the unit is visible and selectable
- **THEN** the map SHALL select or focus that unit according to phase rules
- **AND** if the unit is hidden by fog or unavailable, the rail SHALL explain why it cannot be focused

### Requirement: Phase Progression Controls

The tactical map interface SHALL provide phase progression controls that distinguish legal advance, optional skip, and blocked advance.

#### Scenario: End phase button is blocked with reasons
- **GIVEN** required actions remain
- **WHEN** the player hovers or activates End Phase
- **THEN** the UI SHALL list unresolved blockers
- **AND** the player SHALL be able to focus the first blocker from that list

#### Scenario: Optional skip remains explicit
- **GIVEN** an attack is optional for the active unit
- **WHEN** the player chooses to skip
- **THEN** the UI SHALL confirm the skip state for that unit
- **AND** the phase rail SHALL mark the unit as skipped rather than silently removing it

### Requirement: Tactical Unit Inspector

The tactical map interface SHALL provide unit inspectors for selected friendly units, selected targets, and contextual comparisons.

#### Scenario: Friendly unit inspector shows exact combat state
- **GIVEN** the player selects a friendly unit
- **WHEN** the unit inspector renders
- **THEN** it SHALL show unit name, chassis/variant where available, pilot, movement state, facing, heat, armor/structure summary, weapon readiness, ammo warnings, critical effects, prone/shutdown state, and active phase obligations

#### Scenario: Target inspector respects intel projection
- **GIVEN** the player selects or previews an enemy target
- **WHEN** the target inspector renders
- **THEN** it SHALL show only fields available from the opponent intel projection
- **AND** exact hidden fields SHALL not be recoverable from labels, tooltips, DOM text, ARIA text, or test ids

### Requirement: Record Sheet Drawers

The tactical map interface SHALL provide drill-down drawers for detailed BattleTech unit state without navigating away from combat.

#### Scenario: Armor and structure drawer
- **GIVEN** a unit inspector is open
- **WHEN** the player opens Armor/Structure
- **THEN** the drawer SHALL show location armor points, internal structure points, destroyed locations, transferred damage indicators, and critical damage markers

#### Scenario: Weapons and heat drawer
- **GIVEN** a unit inspector is open
- **WHEN** the player opens Weapons/Heat
- **THEN** the drawer SHALL show weapon list, range bands, heat, ammo/bin availability where applicable, disabled reasons, current heat, heat sinks, shutdown risk, and ammo explosion risk where modeled

### Requirement: Contextual Target Comparison

The tactical map interface SHALL provide a contextual comparison between active unit and target during command preview.

#### Scenario: Weapon preview comparison
- **GIVEN** the player previews a weapon attack
- **WHEN** an enemy target is selected
- **THEN** the comparison panel SHALL show attacker movement modifier, target movement modifier, range band, arc, LOS/cover, weapon selection, total heat, and expected hit/damage summary where available

#### Scenario: Physical preview comparison
- **GIVEN** the player previews a physical attack
- **WHEN** an enemy target is selected
- **THEN** the comparison panel SHALL show valid physical attack types, relative position, required movement state, piloting constraints, expected damage, and fall risk where available

### Requirement: Inspector Pinning and Density

Inspectors SHALL support peek, pinned, expanded, and mobile bottom-sheet density modes.

#### Scenario: Hover peek does not replace pinned selection
- **GIVEN** the player has a pinned selected unit inspector
- **WHEN** the player hovers another unit
- **THEN** the hover peek SHALL appear as a secondary transient summary
- **AND** the pinned inspector SHALL remain the primary detail panel

#### Scenario: Mobile inspector uses tabs
- **GIVEN** the viewport is mobile width
- **WHEN** the unit inspector opens
- **THEN** it SHALL render as a bottom sheet with tabs for Summary, Armor, Weapons, Effects, and Pilot
- **AND** closing the sheet SHALL return focus to the map or triggering token

### Requirement: Tactical Map Lenses

The tactical map interface SHALL provide task-oriented map lenses that control underlying map layers without changing rules.

#### Scenario: Movement lens
- **GIVEN** a unit is selected during Movement phase
- **WHEN** the player enables the Movement lens
- **THEN** the map SHALL show reachable hexes, path preview, movement cost, blocked destinations, and terrain/elevation cues relevant to movement

#### Scenario: Attack lens
- **GIVEN** a unit is selected during Weapon Attack or Physical Attack phase
- **WHEN** the player enables the Attack lens
- **THEN** the map SHALL show firing arcs or physical attack vectors, LOS, range bands, cover, and valid/invalid targets

#### Scenario: Intel lens
- **GIVEN** opponent intel or fog-of-war is active
- **WHEN** the player enables the Intel lens
- **THEN** the map SHALL show visible, last-known, sensor contact, and hidden/unknown areas using distinct non-conflicting visual states

### Requirement: Tactical Pins and Markers

The tactical map interface SHALL support map pins and markers for objectives, player notes, GM notes, and detected contacts.

#### Scenario: Player adds a tactical pin
- **GIVEN** the player has permission to add local pins
- **WHEN** they create a pin on a hex
- **THEN** the pin SHALL store coordinate, label, optional category, visibility scope, and created turn/phase
- **AND** the pin SHALL be shown on the map and minimap while its layer is visible

#### Scenario: GM pin visibility scope
- **GIVEN** a GM creates a pin
- **WHEN** they choose private, side-only, or public scope
- **THEN** only authorized viewers SHALL receive the pin projection

### Requirement: Combat Feed Docking

The tactical map interface SHALL provide a combat feed that summarizes events and can drive map focus.

#### Scenario: Feed row focuses event participants
- **GIVEN** the combat feed contains a movement, attack, heat, objective, or destruction event
- **WHEN** the user selects the feed row
- **THEN** the map SHALL focus the relevant unit or hex
- **AND** the right inspector SHALL show the relevant unit, target, or event detail where available

#### Scenario: Feed prioritizes combat-critical events
- **GIVEN** many events occur in one phase
- **WHEN** the feed renders collapsed
- **THEN** destruction, shutdown, ammo explosion, objective, critical hit, and phase transition events SHALL be prioritized above low-impact movement chatter

### Requirement: Opponent Intel Display Language

The tactical map interface SHALL display opponent intel tier, confidence, and staleness consistently across tokens, inspectors, previews, and feed rows.

#### Scenario: Rough enemy state is visibly approximate
- **GIVEN** a visible enemy unit is projected with rough intel
- **WHEN** the player opens the target inspector
- **THEN** armor, heat, ammo, movement, and weapon readiness SHALL use approximate bands or labels
- **AND** the inspector SHALL include a confidence marker such as Exact, Estimated, Last Known, or Unknown

#### Scenario: Last-known enemy uses stale styling
- **GIVEN** an enemy unit has only last-known visibility
- **WHEN** its token or inspector summary renders
- **THEN** the UI SHALL show last-known coordinate and stale turn/phase
- **AND** exact current state SHALL not be shown

### Requirement: Intel Policy Setup Controls

The tactical interface SHALL expose GM/scenario controls for selecting opponent intel policy before or during authorized match setup.

#### Scenario: GM selects preset before launch
- **GIVEN** a GM or scenario author configures a tactical match
- **WHEN** they choose opponent intel preset Open, Rough, Sensor Limited, or Hidden
- **THEN** the match configuration SHALL persist that policy
- **AND** the pre-battle summary SHALL display the chosen policy before launch

#### Scenario: Player cannot weaken fog from combat UI
- **GIVEN** a player without GM/referee authority is in combat
- **WHEN** they open tactical settings
- **THEN** opponent intel policy controls SHALL be read-only or absent
- **AND** no client-side toggle SHALL reveal hidden exact state

### Requirement: Layered Tactical Map View Contract

The tactical map interface SHALL expose a typed view contract for projection and map layers.

**Priority**: Critical

#### Scenario: Map layer state is typed and stable

**GIVEN** the tactical map is mounted
**WHEN** map controls render
**THEN** the map SHALL expose `MapLayerId` values for `terrain`, `elevation`, `movement`, `path`, `cover`, `los`, `firingArcs`, `objectives`, `fog`, `effects`, and `sensors`
**AND** each layer SHALL be represented by `IMapLayerState` with `visible`, `locked`, and `intensity`
**AND** locked structural layers SHALL not be hidden by ordinary map controls

#### Scenario: Existing overlay controls use the layer contract

**GIVEN** the user toggles movement, cover, LOS, or firing-arc controls
**WHEN** the control updates the map
**THEN** the corresponding typed layer state SHALL update
**AND** existing boolean overlay behavior SHALL remain backward-compatible for current components and hotkeys

### Requirement: Render-Only Map Projection Mode

The tactical map interface SHALL support `MapProjectionMode = 'topDown' | 'isometricPreview'` as presentation state only.

**Priority**: High

#### Scenario: Top-down remains the primary playable surface

**GIVEN** a tactical combat session
**WHEN** the map renders with the default projection
**THEN** projection mode SHALL be `topDown`
**AND** unit selection, movement preview, path commit, target selection, LOS, and firing arcs SHALL use axial coordinates from engine state

#### Scenario: Isometric preview does not alter rules or interactions

**GIVEN** the map is in `isometricPreview`
**WHEN** the user clicks a visible hex
**THEN** the map SHALL report the same axial `{q, r}` coordinate it would report in `topDown`
**AND** movement, range, cover, heat, LOS, and facing SHALL NOT read screen coordinates
**AND** the session save/replay format SHALL remain unchanged

### Requirement: Rules-Backed Tactical Projection Contract

The tactical map interface SHALL render movement, combat, terrain/elevation,
fog, LOS, cover, and firing-arc highlights from shared rules projections rather
than from view-local legality calculations.

Every projection that affects action legality SHALL identify the rule source it
is pinned to, using this source order: official BattleTech rules where citable,
MegaMek tactical behavior as practical oracle for tactical ambiguity, MekHQ
only for campaign/scenario context, then local OpenSpec/Jest fixtures as the
project acceptance contract.

#### Scenario: Movement step-cost badge keeps projection provenance

- **GIVEN** a reachable movement destination has represented terrain or
  elevation step costs
- **WHEN** the tactical map renders the visible movement step-cost badge
- **THEN** the badge SHALL expose the shared movement-channel tactical
  projection source and MegaMek-backed rule references
- **AND** the badge SHALL expose the projection explanation that includes the
  represented terrain and elevation cost details
- **AND** the badge SHALL continue to expose terrain cost, elevation delta, and
  elevation cost metadata without relying only on color
- **AND** exposing those details SHALL NOT change terrain/elevation MP math,
  pathfinding, or commit legality

### Requirement: Movement Projection Explanation

Movement highlights SHALL expose the BattleTech movement facts required to
understand walk, run, jump, and unit-type-specific movement legality.

For each projected movement hex, the map SHALL expose at least movement mode,
cumulative MP cost, terrain cost, elevation delta/cost, heat impact where
applicable, path/facing preview where applicable, stand-up cost and stand-up PSR
state where applicable, and invalid reason when blocked. When live movement
overlays combine multiple projections for the same destination, they SHALL
preserve the per-mode option facts instead of collapsing them into an
unexplained single state.

#### Scenario: Intact Quad Mek stand-up exposes no-PSR reason

- **GIVEN** a prone unit has a represented quad stand-up leg profile
- **AND** no represented quad leg location is destroyed
- **WHEN** the tactical map renders a ground movement destination that requires standing
- **THEN** the hex metadata SHALL expose stand-up cost and `standUpPsrRequired=false`
- **AND** badges, tooltip rows, and projection explanation text SHALL expose the no-PSR automatic-success reason without relying only on color
- **AND** the map SHALL still reserve the stand-up MP before path MP

### Requirement: Combat Projection Explanation

Combat highlights SHALL expose the weapon-range, firing-arc, LOS, cover,
visibility, and target-number facts needed to understand attack legality before
the player commits.

#### Scenario: Combat hover explains represented hull-down target cover

- **GIVEN** a combat projection targets a represented hull-down unit
- **AND** LOS or terrain cover is present for that target
- **WHEN** the player inspects the target hex in the tactical map
- **THEN** the map SHALL expose the represented hull-down flag, hull-down
  modifier, and hull-down reason through stable metadata
- **AND** combat hover context SHALL include the hull-down cover explanation
- **AND** the to-hit modifier context SHALL include the same `Hull Down +2`
  modifier that committed attack declaration records.

### Requirement: Fog-Aware Target Projection

Fog targetability in the tactical map SHALL consume the same grid, LOS, and visibility inputs as combat validation.

Hidden or last-known enemy contacts MAY render as intelligence markers, but they SHALL NOT remain selected as active valid attack targets unless the combat projection says the current viewer can legally target them.

#### Scenario: Blocked LOS clears valid target state

- **GIVEN** fog-of-war is enabled
- **AND** a previously visible enemy becomes hidden or last-known because LOS is blocked on the current combat grid
- **WHEN** the map recomputes target projection
- **THEN** the enemy token SHALL NOT be marked as a valid active target
- **AND** any active target state for that unit SHALL clear or become invalid with an explanatory reason

#### Scenario: Clear LOS restores targetability

- **GIVEN** fog-of-war is enabled
- **AND** an enemy unit has clear LOS from the current viewer on the current combat grid
- **WHEN** the map recomputes target projection during a legal attack phase
- **THEN** the enemy token MAY be marked targetable according to combat projection
- **AND** the same grid SHALL be used by visibility, LOS display, and attack validation

### Requirement: Top-Down Terrain And Elevation Readability

Top-down tactical map mode SHALL present a clear board-game hex view where terrain type and elevation are easy to reference during movement and combat planning.

Each rendered hex SHALL expose terrain type and elevation. Elevation SHALL be visible as a readable number on or near the hex at playable zoom levels, while terrain visuals and overlays remain distinguishable. The on-hex elevation number SHALL be rendered as a persistent, toggleable badge layer in top-down mode, sourced from the same terrain data the tactical projection consumes.

Replay and recovery surfaces SHALL render terrain and elevation from the same event-log terrain seed used by the game session, so saved matches start with the same battlefield information as live play.

#### Scenario: Terrain and elevation hover context exposes projection provenance

- **GIVEN** a player inspects terrain/elevation context from a terrain-only, unreachable, movement-only, combat-only, or combined tactical hover
- **WHEN** the tooltip renders terrain and elevation rows
- **THEN** those rows SHALL expose stable machine-readable primary terrain, feature-level, and elevation attributes
- **AND** those rows SHALL expose the terrain/elevation projection source references and rule references from the shared tactical projection when available
- **AND** combined movement+combat hovers SHALL use the same terrain/elevation context representation as movement-only and combat-only hovers instead of a separate UI-only terrain calculation
- **AND** adding this metadata SHALL NOT change movement reachability, combat legality, LOS classification, terrain generation, terrain labels, elevation labels, or action resolution

#### Scenario: Persistent elevation badges render on non-zero hexes in top-down mode

- **GIVEN** the tactical map is in top-down mode at a playable zoom level
- **AND** the elevation badge toggle is enabled
- **WHEN** the board renders
- **THEN** every hex with non-zero elevation SHALL display its signed elevation number as an on-hex badge without requiring hover
- **AND** zero-elevation hexes SHALL display no badge
- **AND** the badge value SHALL come from the same hex terrain data the tactical projection consumes

#### Scenario: Elevation badges hide below the readability zoom threshold

- **GIVEN** elevation badges are enabled in top-down mode
- **WHEN** the player zooms out past the zoom level at which badge text would no longer be readable
- **THEN** the badge layer SHALL hide rather than render unreadable text
- **AND** zooming back in past the threshold SHALL restore the badges without re-toggling

#### Scenario: Elevation badge toggle behaves like other overlay toggles

- **GIVEN** the player disables the elevation badge toggle
- **WHEN** the board renders in top-down mode
- **THEN** no elevation badges SHALL render
- **AND** elevation SHALL remain available through hover context
- **AND** the toggle state SHALL persist with the same mechanism as the other overlay toggles
- **AND** isometric mode SHALL keep its own elevation presentation regardless of the toggle

#### Scenario: Badges do not obscure tokens or movement cost text

- **GIVEN** a hex renders an elevation badge together with a unit token and movement overlay MP cost text
- **WHEN** the hex renders at a playable zoom level
- **THEN** the unit token and MP cost text SHALL remain unobstructed
- **AND** the badge SHALL keep a fixed anchor position so the board reads consistently across hexes

### Requirement: Isometric Projection Parity And Occlusion Tools

Isometric mode SHALL be presentation state only and SHALL consume the same
terrain, elevation, movement, combat, LOS, fog, cover, and firing-arc projection
data as top-down mode.

Isometric mode SHALL make stacked elevation layers readable, support battlefield
rotation, and provide interaction aids for units obscured by high terrain or
tall stacks.

#### Scenario: Camera rotation retargets rendered terrain occlusion metadata

- **GIVEN** the tactical map is in isometric mode with a unit between tall
  terrain on opposite camera sides
- **WHEN** the player rotates the isometric camera until the opposite tall hex
  becomes the foreground occluder
- **THEN** the rendered scene token SHALL expose the occluding hex or hexes for
  the current camera step
- **AND** the rendered scene token SHALL expose the camera rotation step that
  produced the occlusion metadata
- **AND** the tall-hex occluder highlight and elevation stack SHALL expose the
  same camera rotation step
- **AND** the previous camera-side occluder highlight SHALL be removed once that
  hex is no longer in front of the unit
- **AND** the scene token accessibility label SHALL name the camera step for the
  current terrain-occlusion explanation.

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat, path, selected, and hover state into a single per-hex projection before rendering hex cells or hover explanations.

#### Scenario: Movement option rows expose rule-reference evidence

**GIVEN** a tactical movement projection renders multiple movement options for the same destination hex
**WHEN** the player hovers that destination and the Walk, Run, and Jump option rows are shown
**THEN** the option-row group SHALL expose the movement-channel source references and rule references from the shared per-hex tactical projection
**AND** each individual movement option row SHALL expose the same movement-channel rule references
**AND** movement cost, heat, terrain, elevation, blocked-reason, and command validation behavior SHALL remain unchanged

### Requirement: Projection Status Badges

The tactical map interface SHALL render compact non-color status badges for blocked or mixed per-hex tactical projections.

**Priority**: High

#### Scenario: Mixed movement and combat projection is visible

**GIVEN** a hex projection has reachable movement data and blocked combat data
**WHEN** the hex cell renders
**THEN** the cell SHALL expose projection intent `movement-combat`
**AND** the cell SHALL expose projection status `mixed`
**AND** the cell SHALL render a projection status badge for that hex
**AND** the badge SHALL expose the projection status, intent, blocked reasons, and explanation as stable metadata
**AND** existing movement, combat, terrain, elevation, and invalid badges SHALL remain available

#### Scenario: Blocked projection is visible

**GIVEN** a hex projection has blocked movement or blocked combat without a legal tactical surface
**WHEN** the hex cell renders
**THEN** the cell SHALL expose projection status `blocked`
**AND** the cell SHALL render a projection status badge for that blocked state
**AND** the badge SHALL use the projection blocked reasons instead of recalculating movement or combat legality

### Requirement: Combined Projection Hover Explanation

The tactical map interface SHALL show a combined hover explanation when the hovered hex projection contains both movement and combat data.

**Priority**: High

#### Scenario: Mixed movement and combat hover shows both rules surfaces

**GIVEN** a hovered hex projection has reachable movement data and blocked combat data
**WHEN** the hover explanation renders
**THEN** it SHALL expose the projection status and intent
**AND** it SHALL show the movement legality and MP cost
**AND** it SHALL show the combat legality, target, range, LOS, and blocked reason
**AND** it SHALL show terrain and elevation context for the same hex
**AND** it SHALL preserve projection blocked reasons without recalculating movement or combat legality
**AND** it SHALL expose the shared projection explanation as stable metadata and readable text

#### Scenario: Single-surface hovers keep existing tooltip behavior

**GIVEN** a hovered hex projection contains only movement data, only combat data, only terrain data, or an unreachable hover state
**WHEN** the hover explanation renders
**THEN** the existing single-surface tooltip behavior SHALL remain available
**AND** the combined tooltip SHALL NOT replace those narrower explanations

### Requirement: Isometric Fog Visibility Reasons

The tactical map interface SHALL distinguish isometric visibility-rule limits from terrain/elevation occlusion when rendering fogged contacts.

**Priority**: High

#### Scenario: Hidden contact shows fog-rule reason without elevation boost

**GIVEN** an enemy contact is hidden by fog or visibility rules
**WHEN** the map is rendered in isometric mode
**THEN** the contact SHALL expose a visibility-rule indicator identifying it as fog-limited
**AND** the contact SHALL NOT receive the terrain occlusion foreground boost solely because it is hidden
**AND** the existing hidden-contact fog marker SHALL remain visible

#### Scenario: Last-known contact shows stale-visibility reason

**GIVEN** an enemy contact is rendered at a last-known position
**WHEN** the map is rendered in isometric mode
**THEN** the contact SHALL expose a visibility-rule indicator identifying it as a last-known contact
**AND** the existing last-known fog marker SHALL remain visible
**AND** terrain/elevation occlusion indicators MAY still appear separately when elevated terrain also occludes the last-known marker

#### Scenario: Last-known contact is projected from stale display hex

**GIVEN** an enemy contact has a hidden current position and a last-known display position
**WHEN** the map is rendered in isometric mode
**THEN** scene depth, terrain occlusion, and hover metadata for that contact SHALL be derived from the last-known display position
**AND** the hidden current position SHALL NOT affect the isometric sort order or occluder chosen for the displayed marker

#### Scenario: Top-down fog rendering remains unchanged

**GIVEN** hidden or last-known contacts are rendered in top-down mode
**WHEN** the map displays fog markers
**THEN** the isometric visibility-rule indicator SHALL NOT replace the existing top-down fog marker behavior

### Requirement: Movement Legend State Metadata

The tactical map interface SHALL expose movement-mode legend state in accessible, inspectable metadata.

**Priority**: Medium

#### Scenario: Active movement mode is inspectable

**GIVEN** the movement MP legend is visible
**WHEN** one of Walk, Run, or Jump is the active movement mode
**THEN** that legend row SHALL expose active state without relying only on color or font weight
**AND** inactive rows SHALL remain distinguishable from the active row

#### Scenario: Disabled Jump exposes reason

**GIVEN** the selected unit has no jump capability
**WHEN** the movement MP legend renders
**THEN** the Jump row SHALL expose a disabled state
**AND** the Jump row SHALL expose the reason `No jump capability`
**AND** hovering the Jump row SHALL be possible even though the legend overlay does not broadly block map interaction

### Requirement: Combat Projection Explanation Details

The tactical map interface SHALL include rules-backed combat details in the
shared per-hex tactical projection explanation.

#### Scenario: Combat environment context rows expose rule-reference evidence

- **GIVEN** a combat projection includes weapon options blocked by represented
  environment rules
- **WHEN** the player hovers that combat hex and the environment context row is
  shown
- **THEN** the environment context row SHALL expose environment-specific source
  references and rule references from the shared per-hex tactical projection
- **AND** the row SHALL preserve blocked weapon ids and blocked environment
  reasons from `ICombatRangeHex.weaponRangeOptions`
- **AND** represented MekStation helper provenance SHALL be labeled as
  represented behavior and SHALL NOT imply a narrower MegaMek or official
  source pin before that source is explicitly linked
- **AND** underwater legality, torpedo path legality, target legality,
  attack-command behavior, and committed attack resolution SHALL remain
  unchanged

### Requirement: Movement Projection Explanation Details

The tactical map interface SHALL include rules-backed movement details in the
shared per-hex tactical projection explanation.

**Priority**: High

#### Scenario: Projection explanation summarizes movement costs

**GIVEN** a hex projection contains movement data
**WHEN** the projection explanation is exposed through map metadata or projection badge text
**THEN** the explanation SHALL include movement type, reachability, and total MP cost
**AND** it SHALL include movement mode, terrain cost, elevation delta/cost, heat generated, and path length when those values are present

#### Scenario: Projection explanation summarizes stand-up requirements

**GIVEN** a hex projection contains stand-up movement data
**WHEN** the projection explanation is exposed
**THEN** the explanation SHALL include stand-up cost, stand-up PSR target, impossible reason, and modifier details when those values are present

#### Scenario: Rendered impossible stand-up explains destination block

**GIVEN** a movement projection contains an impossible stand-up reason
**WHEN** the projected destination is rendered in the tactical map
**THEN** the destination hex SHALL expose non-reachable movement metadata with invalid reason and details
**AND** the hex SHALL expose stand-up required, stand-up cost, and impossible-reason metadata
**AND** visible stand-up and invalid badges SHALL identify the stand-up block without relying on color alone
**AND** the tactical hover explanation SHALL show the impossible stand-up reason

#### Scenario: Combat and terrain explanation remains present

**GIVEN** a hex projection contains terrain, movement, combat, or blocked-reason data
**WHEN** movement explanation details are added
**THEN** existing terrain, elevation, combat, and blocked-reason explanation content SHALL remain present

### Requirement: Movement Legend Capability Metadata

The tactical map interface SHALL expose the selected unit's movement capability
metadata in the on-map movement legend.

**Priority**: Medium

#### Scenario: Legend summarizes selected motive mode

**GIVEN** the movement phase map is showing a selected unit's movement range
**WHEN** the MP legend is rendered
**THEN** the legend SHALL identify the selected unit's motive mode when one is available
**AND** the motive mode SHALL be exposed through accessible text and machine-readable metadata

#### Scenario: Legend summarizes effective MP values

**GIVEN** the movement phase map is showing a selected unit's movement range
**WHEN** the MP legend is rendered
**THEN** the legend SHALL show the effective walk, run, and jump MP values used for the current overlay state
**AND** disabled jump state SHALL remain visible when jump MP is zero

#### Scenario: Existing legend state remains intact

**GIVEN** the MP legend has active, inactive, or disabled rows
**WHEN** capability metadata is added
**THEN** existing active/inactive/disabled labels and data attributes SHALL remain present

### Requirement: Combined Tooltip Stand-Up Movement Details

The tactical map interface SHALL preserve stand-up movement details when rendering the combined movement+combat hover tooltip.

#### Scenario: Combined hover shows stand-up cost and PSR

**GIVEN** a hex has both movement projection data and combat projection data
**AND** the movement projection requires standing before movement
**WHEN** the player hovers that hex
**THEN** the combined tactical tooltip SHALL show the stand-up MP cost
**AND** it SHALL show the stand-up PSR target number when present
**AND** it SHALL show stand-up PSR modifier details when present
**AND** it SHALL still show the combined movement, combat, terrain, and projection-reason rows.

#### Scenario: Combined hover shows impossible stand-up reason

**GIVEN** a hex has both movement projection data and combat projection data
**AND** the movement projection has an impossible stand-up PSR reason
**WHEN** the player hovers that hex
**THEN** the combined tactical tooltip SHALL show the impossible stand-up reason instead of hiding it behind the combined combat state.

### Requirement: Isometric Rotation Heading Metadata

The tactical map interface SHALL expose the current isometric camera heading
whenever isometric rotation controls are visible. The map SHALL provide a reset
control that restores pan, zoom, and the isometric camera heading to their
canonical defaults without changing axial hex click coordinates.

#### Scenario: Reset view restores canonical isometric heading

**GIVEN** the tactical map is in isometric mode
**AND** the player has rotated the isometric camera away from heading 0
**WHEN** the player activates reset view
**THEN** the projection layer SHALL expose rotation step 0
**AND** the heading metadata SHALL expose 0 degrees
**AND** the projection transform SHALL use the canonical heading
**AND** axial hex clicks SHALL still target the same battlefield coordinates

### Requirement: Movement Tooltip Path Summary

The tactical map interface SHALL summarize projected movement path length in hover explanations when movement projection includes a path.

#### Scenario: Movement-only hover shows path length

**GIVEN** a movement destination has movement projection data with a path containing multiple hexes
**WHEN** the player hovers the destination and no combat projection is active for that hex
**THEN** the movement tooltip SHALL show the number of path steps
**AND** it SHALL preserve MP, terrain, elevation, heat, stand-up, and blocked-reason rows when present.

#### Scenario: Combined movement and combat hover shows path length

**GIVEN** a destination has both movement projection data and combat projection data
**AND** the movement projection includes a path containing multiple hexes
**WHEN** the player hovers the destination
**THEN** the combined tactical tooltip SHALL show the number of path steps
**AND** it SHALL preserve the combined movement, combat, terrain, stand-up, and projection-reason rows.

#### Scenario: Rendered path badges expose projected sequence

**GIVEN** the tactical map receives a movement path from the shared movement projection
**WHEN** the path is rendered in top-down or isometric mode
**THEN** each path hex SHALL expose its path index and step metadata
**AND** the visible path badges SHALL label the start and each numbered step without relying on color alone

### Requirement: Combat Tooltip Weapon Impact

The tactical map interface SHALL expose projected weapon heat and ammo impact from the shared combat projection when combat hover explanations are shown.

#### Scenario: Combat-only hover shows weapon impact

**GIVEN** a combat projection marks one or more weapons as available against a target hex
**WHEN** the player hovers that target hex and no movement projection is active for that hex
**THEN** the combat tooltip SHALL show the projected heat generated by the available weapons
**AND** it SHALL show ammo-consuming weapons with projected ammo use and remaining ammo when known
**AND** it SHALL preserve target, range, LOS, arc, cover, visibility, to-hit, indirect-fire, and blocked-reason rows when present.

#### Scenario: Combined tactical hover shows weapon impact

**GIVEN** a hex has both movement projection data and combat projection data
**AND** the combat projection marks one or more weapons as available
**WHEN** the player hovers that hex
**THEN** the combined tactical tooltip SHALL show the projected weapon heat and ammo impact
**AND** it SHALL preserve the combined movement, combat, terrain, stand-up, and projection-reason rows.

#### Scenario: Projection explanation carries weapon impact

**GIVEN** a hex projection contains combat data with available weapon impact metadata
**WHEN** the projection explanation is exposed through map metadata or projection badge text
**THEN** the explanation SHALL include projected weapon heat
**AND** it SHALL include ammo impact for ammo-consuming available weapons without recalculating combat legality in the map renderer.

### Requirement: Weapon Command Preview Uses Combat Projection Impact

The tactical command preview SHALL use shared combat projection weapon impact metadata for projected weapon attack heat and ammo usage, and combat planning surfaces SHALL derive displayed range and range bracket values from the shared combat projection rather than independent distance computation.

#### Scenario: Attack preview heat and ammo come from combat projection

**GIVEN** a weapon attack command preview receives combat projection data for an attackable target
**AND** the projection contains available weapon impact metadata
**WHEN** the command preview is built
**THEN** preview heat SHALL equal the combat projection's available weapon heat
**AND** preview ammo usage SHALL be derived from the combat projection's available weapon impacts
**AND** preview weapon ids and names SHALL match the projected available weapon impacts.

#### Scenario: Blocked attack preview spends no heat or ammo

**GIVEN** a weapon attack command preview receives combat projection data for a blocked target
**WHEN** the command preview is built
**THEN** preview heat SHALL be zero
**AND** preview ammo usage SHALL be empty
**AND** the blocked reason SHALL remain the projection-derived attack invalid detail or blocked reason.

#### Scenario: Expected damage can still use weapon status data

**GIVEN** combat projection data provides weapon impact metadata
**AND** weapon status data is available for those projected weapons
**WHEN** the command preview is built
**THEN** expected damage MAY be computed from weapon status damage values until combat projection carries damage envelope metadata.

#### Scenario: Combat planning range display traces to the combat projection

**GIVEN** the combat planning surface displays a range or range bracket for a
selected target
**WHEN** the displayed value is computed
**THEN** it SHALL be read from the combat projection's distance and range
bracket for that target hex
**AND** when the target hex is absent from the current projection lookup the
value SHALL be computed by the same exported helper the projection uses
**AND** no combat planning surface SHALL compute range or bracket from
independent inline distance math.

### Requirement: Combat Projection Damage Envelope

The tactical map interface SHALL expose projected weapon damage envelope metadata from the shared combat projection for attackable weapon targets.

#### Scenario: Attackable target shows compact impact badge

- **GIVEN** a combat projection marks a target hex attackable
- **AND** available weapon impacts include projected heat, listed damage, expected damage, and ammo use
- **WHEN** the target hex renders on the tactical map
- **THEN** the map SHALL show a compact combat impact badge for that target
- **AND** the badge SHALL visibly summarize projected heat, listed damage, expected damage when known, and ammo spent when nonzero
- **AND** the badge SHALL expose those same values as metadata from the combat projection
- **AND** the renderer SHALL NOT recalculate attack legality, weapon damage, heat, ammo, or expected damage

### Requirement: Isometric Occluder Hex Highlights

The tactical map interface SHALL identify tall isometric terrain that may obscure units behind it.

#### Scenario: Scene token summarizes multiple active occluders

- **GIVEN** more than one elevated terrain hex may hide the same unit from the current isometric camera heading
- **WHEN** the unit token is rendered inside the depth-sorted isometric scene
- **THEN** the token wrapper SHALL preserve a representative first occluder hex and elevation for compact compatibility
- **AND** the token wrapper SHALL expose the complete active occluder hex list
- **AND** the token wrapper SHALL expose the complete active occluder effective-elevation list
- **AND** the token wrapper SHALL expose every active terrain-occlusion reason
- **AND** the nested token visibility context SHALL use those same existing terrain-occlusion reasons without recalculating movement, combat, LOS, fog, or visibility legality

### Requirement: Movement Projection Detail Surface

Required represented LAM AirMek landing-control checks SHALL resolve during the
runtime movement-state command that lands the unit. The event stream SHALL
explain the command in source order: landing state mutation, canonical
`PSRTriggered`, `PSRResolved`, and failed-landing fall consequences when the
roll fails.

#### Scenario: Passing AirMek landing-control descent resolves immediately

- **GIVEN** a selected movement-phase Land-Air 'Mech descends from represented
  AirMek WiGE altitude 1 to ground level
- **AND** the landing-control metadata marks the roll as required
- **WHEN** the landing-control roll passes
- **THEN** the event stream SHALL append `RuntimeMovementStateChanged`,
  `PSRTriggered`, and `PSRResolved` in that order
- **AND** the unit SHALL have no remaining pending AirMek landing PSR.

#### Scenario: Failed AirMek landing-control descent emits fall consequences

- **GIVEN** a selected movement-phase Land-Air 'Mech descends from represented
  AirMek WiGE altitude 1 to ground level
- **AND** the landing-control metadata marks the roll as required
- **WHEN** the landing-control roll fails
- **THEN** the event stream SHALL append `RuntimeMovementStateChanged`,
  `PSRTriggered`, `PSRResolved`, `UnitFell`, and `PilotHit` in that order
- **AND** `UnitFell` SHALL use `reasonCode: PSRTrigger.AirMekLanding`
- **AND** the unit SHALL be prone with the AirMek landing PSR cleared.

### Requirement: Isometric Occluder Hover Explanations

The tactical map interface SHALL explain isometric occluder hexes in hover tooltips using the existing projection-derived occluder metadata.

**Priority**: High

#### Scenario: Occluder hover identifies hidden units

**GIVEN** elevated terrain may hide one or more units from the current isometric camera angle
**WHEN** the player hovers the occluding terrain hex in isometric mode
**THEN** the hover tooltip SHALL identify the unit ids the terrain may hide
**AND** the tooltip SHALL expose the occluder elevation and camera rotation context
**AND** the tooltip SHALL show the projection-derived occlusion reason

#### Scenario: Occluder rows appear with tactical hover variants

**GIVEN** an isometric occluder hex also has movement, combat, unreachable, or combined tactical context
**WHEN** the map renders the corresponding hover tooltip
**THEN** the tooltip SHALL include the occluder explanation without replacing the movement, combat, or terrain details

#### Scenario: Camera rotation clears stale hover explanations

**GIVEN** a tall terrain hex only occludes a unit from some camera angles
**WHEN** the isometric camera rotates to an angle where the terrain is no longer an occluder
**THEN** the prior occluder hover explanation SHALL no longer render for that hex

### Requirement: Unit Token State Metadata

Rendered tactical map unit token wrappers SHALL expose inspectable state metadata for the unit represented by the token.

#### Scenario: Token wrapper exposes common map state

**GIVEN** a tactical map unit token is rendered
**WHEN** the token wrapper is inspected
**THEN** it SHALL expose the unit type
**AND** it SHALL expose the displayed map position
**AND** it SHALL expose the source game-state position
**AND** it SHALL expose the facing used by the rendered token
**AND** its accessible label SHALL include unit type, position, and facing context

#### Scenario: Type-specific token state remains inspectable

**GIVEN** a rendered unit token carries type-specific state
**WHEN** the token wrapper is inspected
**THEN** aerospace tokens SHALL expose altitude and velocity when present
**AND** mounted battle armor tokens SHALL expose the host unit id used for badge placement
**AND** this metadata SHALL NOT change token visuals, animation behavior, fog behavior, or click handling

#### Scenario: Isometric scene wrapper preserves airborne token state

**GIVEN** an aerospace token carries altitude and velocity state
**AND** the tactical map is rendered in isometric mode
**WHEN** the isometric scene depth-sorts that token
**THEN** the isometric scene token wrapper SHALL expose the unit type as aerospace
**AND** it SHALL expose the aerospace altitude
**AND** it SHALL expose the aerospace velocity
**AND** the nested token wrapper SHALL retain its own altitude and velocity metadata

#### Scenario: Isometric scene wrapper preserves common token state

**GIVEN** a tactical map unit token is rendered in isometric mode
**WHEN** the isometric scene depth-sorts that token
**THEN** the isometric scene token wrapper SHALL expose the unit type
**AND** it SHALL expose the displayed map position used for depth sorting
**AND** it SHALL expose the source game-state position
**AND** it SHALL expose the facing used by the rendered token

### Requirement: Combat Projection Detail Surface

The tactical map SHALL expose combat projection details from the same
rules-backed combat validation path used by the engine. Blocked combat
projections SHALL explain unavailable indirect-fire fallbacks when that fallback
is tactically relevant to why the attack cannot be committed.

#### Scenario: ECM-nullified TAG explains unavailable semi-guided indirect fire

- **GIVEN** a selected unit has semi-guided LRM fire selected
- **AND** the direct LOS to a TAG-designated target is blocked
- **AND** the target's TAG designation is nullified by ECM
- **WHEN** the map previews the target hex and the player attempts the attack
- **THEN** the combat projection SHALL preserve `NoLineOfSight` as the engine rejection reason
- **AND** the projection, browser metadata, invalid combat badge reason, accessible reason context, and committed `AttackInvalid` event SHALL include that TAG was nullified by ECM and semi-guided indirect fire is unavailable.

### Requirement: Physical Attack Projection Detail Surface

Physical attack previews and command surfaces SHALL consume the same
rules-backed target/attack option projections, including per-limb alternatives
and restriction reasons.

#### Scenario: Enemy token menus consume clicked target physical projections

- **GIVEN** an enemy token context menu is opened during Physical Attack phase
- **AND** the clicked enemy has physical attack option projections for the
  active unit
- **WHEN** a matching physical command renders in that enemy token menu
- **THEN** the command SHALL be disabled when every matching projected option is
  blocked
- **AND** the disabled reason SHALL match the first projected restriction reason
- **AND** multi-option physical commands such as punch SHALL remain available
  when at least one matching projected limb option is legal.

### Requirement: Physical Attack Map Projection Agreement

The tactical map interface SHALL keep physical-attack target highlights, command
preview rows, and committed physical declarations aligned with the represented
physical attack legality projection.

#### Scenario: Push respects represented building identity

**GIVEN** a push target occupies a represented building hex
**WHEN** the physical terrain context can identify the attacker's building and
target's building
**THEN** the push SHALL remain illegal when the attacker is outside the target
building
**AND** the push SHALL remain illegal when attacker and target occupy different
known buildings
**AND** legacy building terrain without known building ids SHALL preserve the
existing coarse occupancy gate without guessing identity

### Requirement: Isometric Presentation

The tactical map interface SHALL render isometric mode as a presentation layer
over the same axial battlefield state while keeping elevation stacks, camera
rotation, and occlusion aids inspectable. Hexes with positive elevation SHALL
render visible extrusion faces so stacked elevation reads as solid terrain
height, depth-ordered correctly at every discrete camera heading, without
changing occluder semantics, hover targets, or projection data.

#### Scenario: Rotation updates active terrain occluder

- **GIVEN** a unit may be hidden behind different elevated terrain from different isometric camera headings
- **WHEN** the player rotates the isometric camera until another elevated hex is in front of the unit
- **THEN** token foreground boost metadata SHALL identify the newly active occluder hex and elevation
- **AND** the previous occluder hex SHALL no longer expose active occluder highlight metadata
- **AND** hover context for the new occluder SHALL show its elevation, camera heading, affected unit ids, and source reason

#### Scenario: Full rotation cycle restores original occluder state

- **GIVEN** an isometric battlefield has a camera-dependent elevated-terrain occluder
- **WHEN** the player rotates through all six discrete camera headings and returns to the original heading
- **THEN** the projection layer SHALL expose the original rotation step
- **AND** scene depth metadata SHALL match the original heading
- **AND** active occluder metadata and highlights SHALL return to the original terrain hex

#### Scenario: Elevated hexes render camera-facing extrusion faces

- **GIVEN** the tactical map is in isometric mode
- **AND** a hex has positive elevation
- **WHEN** the isometric scene renders at any discrete camera heading
- **THEN** the hex SHALL render its camera-facing extrusion faces beneath its top face with height proportional to its elevation
- **AND** the visible face selection SHALL correspond to the current rotation step
- **AND** zero-elevation hexes SHALL render no extrusion faces

#### Scenario: Extrusion faces depth-sort with their owner hex

- **GIVEN** adjacent hexes of different elevations render in isometric mode
- **WHEN** the scene depth-orders its items
- **THEN** each hex's extrusion faces SHALL paint immediately beneath that hex's top face in the shared depth ordering
- **AND** unit tokens SHALL keep their existing depth ordering relative to hex top faces
- **AND** rotating through all six headings SHALL never produce a lower hex painting over a nearer higher hex's faces

#### Scenario: Extrusion is visual-only and preserves interaction semantics

- **GIVEN** isometric extrusion faces are rendered
- **WHEN** the player hovers, clicks, or inspects occluder highlights
- **THEN** extrusion faces SHALL NOT be hover or hit targets
- **AND** occluder metadata, occluder highlights, and hover explanations SHALL be unchanged from the pre-extrusion contract
- **AND** movement, combat, LOS, and fog projection data SHALL be byte-identical with extrusion enabled or absent

### Requirement: Top-Down and Isometric Tactical Map Rendering

Each rendered hex SHALL expose terrain type and elevation. Elevation SHALL be visible as a readable number on or near the hex at playable zoom levels, while terrain visuals and overlays remain distinguishable.

Isometric mode SHALL render terrain/elevation stacks, unit tokens, occluder
highlights, and camera rotation metadata from the same projection data used by
the top-down map.

#### Scenario: Browser smoke covers top-down and isometric tactical context

- **GIVEN** the development/test tactical map browser harness renders a map
  with terrain, elevation, movement, combat, and an isometric occluder case
- **WHEN** browser automation inspects the top-down map
- **THEN** terrain labels, elevation labels, movement badges, and combat badges
  SHALL expose the expected projection metadata
- **AND** a movement-highlighted hex with multiple legal movement modes SHALL
  expose the walk, run, and jump option costs, terrain costs, elevation costs,
  and heat metadata together
- **AND** a reachable movement-highlighted hex with a blocked movement mode
  SHALL expose legal option states, blocked option reason metadata, and a
  separate blocked-options badge that does not rely on color alone
- **AND** each rendered hex SHALL keep its base shape pointer-targetable even
  when the terrain fill is transparent, so hover/click tactical details remain
  reachable on clear terrain
- **AND** when the Run overlay contains a destination whose Run path is blocked
  but a Walk path is legal, the map SHALL render the reachable Walk projection
  as primary while retaining the blocked Run option metadata
- **AND** a tracked vehicle destination with an over-limit elevation change
  SHALL expose the terrain-blocked elevation reason, elevation delta/cost, and
  a non-color invalid badge
- **AND** a hover vehicle destination over represented deep water SHALL expose
  reachable movement, zero terrain/elevation surcharge, motive metadata, and
  the water/smoke terrain layers
- **AND** a naval vehicle destination on represented clear land SHALL expose
  the water-required terrain blocker, zero heat, motive metadata, and a
  non-color invalid badge
- **AND** a biped swim destination through represented deep water SHALL expose
  reachable movement, zero water/elevation surcharge, swim heat, elevation
  delta, and water terrain metadata
- **AND** a Frogman destination into represented deep water SHALL expose
  reachable movement, the reduced terrain surcharge, heat, and water terrain
  metadata
- **AND** a TacOps battlefield-wreck destination converted into represented
  rough terrain SHALL expose reachable movement, rough terrain metadata, the
  shared terrain surcharge, heat, and non-color cost badge metadata
- **AND** a prone unit's represented stand-up movement destination SHALL expose
  the stand-up MP cost, PSR target metadata, heat, and stand-up badge metadata
- **AND** a movement-blocked hex SHALL expose the engine-aligned rejection
  reason and render an invalid badge that does not rely on color alone
- **AND** a LOS-blocked combat target SHALL expose the blocked target id,
  NoLineOfSight rejection, blocker hex metadata, and an invalid combat badge
- **AND** an elevation-LOS-blocked combat target SHALL expose the elevation
  blocker reason, blocker hex metadata, elevation label, and non-color invalid
  and blocker badges
- **AND** a combat target blocked by cumulative intervening heavy woods SHALL
  expose the shared `NoLineOfSight` rejection, woods blocker reason, woods
  terrain metadata, and non-color invalid and blocker badges
- **AND** a combat target blocked by stacked intervening smoke and woods SHALL
  expose the shared combined `NoLineOfSight` blocker reason, terrain-layer
  metadata for both effects, and non-color invalid and blocker badges
- **AND** a combat target hidden by fog visibility recalculated through
  represented LOS terrain blockers SHALL render as a last-known contact,
  expose obscured target ids, `TargetNotVisible` metadata, terrain blocker
  context, and non-color visibility/invalid badges
- **AND** a medium-range combat target SHALL expose the target id, distance,
  range band, available weapon ids, and per-weapon range option metadata
- **AND** a combat target whose represented C3 spotter improves the effective
  range SHALL expose the improved range band, spotter id, spotter range,
  to-hit metadata, and C3 accessible context
- **AND** a LOS-blocked LRM target with a represented friendly spotter SHALL
  remain attackable and expose indirect-fire basis, spotter id, penalty,
  to-hit metadata, and non-color indirect-fire badge context
- **AND** a LOS-blocked LRM target whose elected spotter has a represented
  gunnery penalty SHALL expose the net indirect-fire penalty, spotter gunnery,
  skill modifier, to-hit metadata, and non-color indirect-fire badge context
- **AND** a LOS-blocked LRM target whose represented walked spotter has Forward
  Observer SHALL expose indirect-fire penalty, cancellation metadata, the
  Forward Observer flag, to-hit metadata, and non-color indirect-fire badge
  context
- **AND** a LOS-blocked NARC-marked LRM target with no represented spotter SHALL
  remain attackable and expose beacon basis, no-spotter metadata, penalty,
  to-hit metadata, and non-color indirect-fire badge context
- **AND** a LOS-blocked iNarc-marked LRM target with no represented spotter
  SHALL remain attackable and expose beacon basis, no-spotter metadata,
  penalty, to-hit metadata, and non-color indirect-fire badge context
- **AND** a LOS-blocked TAG-designated target attacked by semi-guided LRM fire
  SHALL remain attackable and expose no-spotter TAG basis, zero indirect
  penalty, to-hit metadata, and non-color indirect-fire badge context
- **AND** a LOS-blocked ECM-protected TAG-designated target attacked by
  semi-guided LRM fire SHALL remain blocked and expose the no-line-of-sight
  rejection without indirect-fire basis or badge metadata
- **AND** a combat target outside the selected weapon's firing arc SHALL expose
  `OutOfArc` rejection metadata, per-weapon arc blocker details, and a combat
  invalid badge that does not rely on color alone
- **AND** combat targets inside represented left- and right-sponson vehicle
  weapon front-plus-side coverage SHALL remain attackable and expose in-arc
  per-weapon availability metadata
- **AND** a combat target outside a represented locked vehicle turret's
  front-only coverage SHALL expose `OutOfArc` rejection metadata and per-weapon
  arc blocker details
- **AND** a same-hex combat target SHALL expose `SameHex` rejection metadata
  and a combat invalid badge that does not rely on color alone, even when the
  selected weapon is otherwise in range
- **AND** a combat target in represented partial cover SHALL expose the cover
  level, modifier, to-hit modifier, reason, and a cover badge that does not rely
  on color alone
- **AND** a combat target involving represented prone attacker and target state
  SHALL expose the attacker-prone and target-prone to-hit modifiers, final
  target number, badge, and tooltip rows
- **AND** a combat target with represented shutdown immobility SHALL expose the
  target-immobile to-hit modifier, final target number, badge, and tooltip rows
- **AND** a combat target fired by a represented hot attacker SHALL expose the
  heat to-hit modifier, final target number, badge, and tooltip rows
- **AND** a combat target involving represented attacker movement and target
  movement SHALL expose the attacker movement and target TMM to-hit modifiers,
  final target number, badge, and tooltip rows
- **AND** a combat target involving represented jump movement SHALL expose the
  attacker jump penalty, the jumped target TMM bonus, final target number,
  badge, and tooltip rows
- **AND** a combat target involving represented walk movement SHALL expose the
  attacker walk penalty, target walk TMM, final target number, badge, and
  tooltip rows
- **WHEN** browser automation switches to isometric mode and rotates the camera
- **THEN** isometric stack, occluder, visibility, rotation, and depth metadata
  SHALL update in the rendered DOM
- **AND** rotating the camera SHALL move the active occluder metadata and
  highlight to the tall elevation stack that is actually in front for that
  camera angle
- **AND** pointer and touch camera interactions SHALL pan, pinch-zoom, or
  rotate the isometric view while preserving the same shared projection-layer
  mode, occluder metadata, and presentation-only camera control provenance
- **AND** the rendered map output SHALL contain nonblank top-down and isometric
  pixels

### Requirement: LAM AirMek Runtime Conversion Movement Projection

The tactical map SHALL resolve represented LAM runtime AirMek conversion state before deriving movement overlays and committed movement validation. AirMek conversion SHALL use WiGE movement for terrain/elevation projection, SHALL derive walking/cruise MP from Jump MP times three, SHALL derive running/flank MP from the AirMek cruise MP times 1.5 rounded up, and SHALL use unit height 0.

#### Scenario: LAM AirMek conversion changes movement projection and commit legality

**GIVEN** a tactical-map browser harness renders a LAM with a runtime conversion profile and a destination elevation route
**WHEN** the LAM remains in Mek mode
**THEN** the map shows the destination as blocked for walking with the Mek-mode movement reason and committed movement validation rejects the same destination with matching reason, MP, and heat
**WHEN** the same represented LAM is in AirMek mode
**THEN** the map shows WiGE movement, AirMek cruise/flank MP, elevation cost 0, and a reachable destination
**AND** committed movement validation accepts the same destination with matching MP, heat, and path

### Requirement: Over-Budget Movement Path Cost Explanation

The tactical map SHALL distinguish terrain-blocked movement destinations from
terrain-legal destinations whose cheapest path exceeds the selected movement
mode's available MP. A terrain-legal over-budget ground destination SHALL be
reported as `InsufficientMP` with the diagnostic path's total MP cost and the
final step's terrain cost, elevation delta, and elevation cost. A direct terrain
blocker SHALL remain `TerrainBlocked`.

#### Scenario: Passable elevation route exceeds walk MP

**GIVEN** a ground unit previews a walking move to an in-bounds destination
**AND** a legal path exists to that destination when the MP cap is ignored
**WHEN** the legal path's movement cost exceeds the unit's selected walk MP
**THEN** the map SHALL render the destination as not reachable with
`InsufficientMP`
**AND** the destination SHALL expose total MP, terrain cost, elevation delta,
and elevation cost metadata from the diagnostic path
**AND** committed movement validation SHALL reject the same destination with the
same reason, details, MP cost, and heat

#### Scenario: Direct terrain block remains terrain blocked

**GIVEN** a tracked or wheeled unit previews direct entry into an adjacent
elevation change that exceeds its motive limit
**WHEN** the destination projection is derived
**THEN** the map SHALL preserve the terrain-blocked elevation reason
**AND** it SHALL NOT replace the blocker with an over-budget alternate-route
explanation

### Requirement: Grounded LAM Fighter Runtime Conversion Movement Projection

The tactical map SHALL resolve represented LAM runtime Fighter conversion state before deriving movement overlays and committed movement validation. A grounded Fighter conversion SHALL use grounded aerospace terrain restrictions represented as wheeled/taxing movement, SHALL derive walking/cruise MP from current thrust halved while grounded, SHALL derive running/flank MP as equal to grounded cruise MP, SHALL make jump movement unavailable, and SHALL use unit height 0.

#### Scenario: Grounded LAM Fighter conversion blocks abrupt elevation entry

**GIVEN** a tactical-map browser harness renders a LAM in represented grounded Fighter conversion state
**AND** the selected destination is adjacent with an elevation increase greater than grounded wheeled/taxing movement allows
**WHEN** the map derives walking movement projection for that destination
**THEN** the map SHALL render the destination as not reachable with `TerrainBlocked`
**AND** the destination SHALL expose wheeled movement mode, zero terrain cost, elevation delta, elevation cost, and the elevation blocked reason
**AND** the movement legend SHALL expose grounded Fighter cruise/flank MP with jump unavailable
**AND** committed movement validation SHALL reject the same destination with the same reason, details, MP cost, and heat

### Requirement: LAM AirMek Movement Heat Projection

The tactical map SHALL resolve represented LAM runtime AirMek conversion state to an AirMek-specific movement heat profile before deriving movement overlays and committed movement validation. AirMek walk and run heat SHALL be derived from used movement points divided by three, rounded to the nearest integer, with a minimum basis of three movement points for represented standard jump heat.

#### Scenario: Long AirMek cruise reports source-backed movement heat

**GIVEN** a tactical-map browser harness renders a LAM in represented AirMek conversion state
**AND** the selected destination is reachable at six AirMek movement points
**WHEN** the map derives walking movement projection for that destination
**THEN** the map SHALL render the destination as reachable with WiGE movement, 6 MP, and 2 generated heat
**AND** committed movement validation SHALL accept the same destination with the same path, MP cost, and generated heat

### Requirement: Isometric Terrain And Unit Visibility

The tactical map interface SHALL keep important units readable in isometric
mode through depth ordering, selected-unit foregrounding, terrain-occlusion
visibility halos, and target readability boosts. When weapon-backed combat
projection is active, valid-target foreground boosts SHALL be driven by shared
combat projection data instead of stale legacy token flags.

#### Scenario: Projection-active isometric target boost ignores stale token flag

**GIVEN** the map is in isometric mode
**AND** a selected friendly unit has configured weapon projection data
**AND** another token has a stale legacy `isValidTarget` flag
**WHEN** that token's unit id does not appear in the combat-projected valid
target ids
**THEN** the token SHALL NOT receive a valid-target foreground boost from the
legacy token flag
**AND** terrain-occlusion and selected-unit foreground boosts SHALL remain
unchanged

#### Scenario: Legacy target flag remains isometric fallback

**GIVEN** the map is in isometric mode
**AND** the selected unit does not have configured weapon projection data
**WHEN** a token has `IUnitToken.isValidTarget === true`
**THEN** the token SHALL continue to receive the legacy foreground readability
boost

### Requirement: Terrain and Elevation Labels

The system SHALL show readable terrain type and elevation reference labels on
hexes in both top-down and isometric projection modes. When a movement
projection applies to a hex, the hex explanation SHALL include the movement MP
cost, terrain MP cost when known, elevation delta when known, elevation MP cost
when known, and heat impact when known.

#### Scenario: Movement explanation includes elevation MP cost

**GIVEN** a destination hex has terrain and elevation data
**AND** movement projection supplies MP cost, terrain cost, elevation delta,
elevation cost, and heat
**WHEN** the tactical map renders that hex with tactical overlays
**THEN** the hex explanation SHALL include the movement MP cost
**AND** it SHALL include the terrain MP cost
**AND** it SHALL include the elevation delta
**AND** it SHALL include the elevation MP cost
**AND** it SHALL include the heat impact

### Requirement: Per-Type Token Rendering

Vehicle tokens representing altitude-tracked VTOL or WiGE combat state SHALL
expose the current altitude as visible token chrome, token wrapper metadata,
isometric scene metadata, and accessible token context. Ground-only vehicle
tokens SHALL NOT render altitude chrome even if a legacy caller provides
altitude-like data.

#### Scenario: WiGE token exposes altitude context

- **GIVEN** a vehicle unit has represented combat state with motion type `WiGE`
- **AND** the represented vehicle combat state has altitude 2
- **WHEN** the tactical map projects that unit into a vehicle token
- **THEN** the token SHALL expose altitude 2 in wrapper metadata
- **AND** the token accessible label SHALL include altitude 2
- **AND** the vehicle token SHALL render a visible non-color altitude badge

#### Scenario: Isometric scene preserves WiGE altitude context

- **GIVEN** a vehicle token uses WiGE motion
- **AND** the token has represented altitude 2
- **WHEN** the player switches the map to isometric mode
- **THEN** the isometric scene token wrapper SHALL expose the unit type as
  vehicle
- **AND** the isometric scene token wrapper SHALL expose the WiGE motion type
- **AND** the isometric scene token wrapper SHALL expose altitude 2
- **AND** the nested vehicle token SHALL keep the visible altitude badge

#### Scenario: Ground-only vehicle token does not expose altitude chrome

- **GIVEN** a vehicle unit does not use VTOL or WiGE motion
- **WHEN** the tactical map renders that unit as a vehicle token
- **THEN** the vehicle token SHALL NOT render the altitude badge

### Requirement: Isometric Scene Token Context

The tactical map interface SHALL expose inspectable context on depth-sorted
isometric scene token wrappers without recalculating movement, combat,
visibility, terrain, or unit-state rules.

**Priority**: High

#### Scenario: Scene token wrapper summarizes represented token state

**GIVEN** a unit token is rendered in isometric mode
**WHEN** the isometric scene depth-sorts that token
**THEN** the scene token wrapper SHALL expose a title and accessible label
**AND** the label SHALL include the displayed map position, source position,
unit type, and facing used by the nested token renderer
**AND** the label SHALL include represented per-type context such as aerospace
altitude/velocity or VTOL vehicle altitude when present

#### Scenario: Scene token wrapper preserves projection and visibility context

**GIVEN** a token is combat-projected, terrain-occluded, hidden by fog, or shown
from a last-known position
**WHEN** the token is rendered inside the isometric scene
**THEN** the scene token wrapper label SHALL include the existing
combat-projection target state when weapon-backed projection data exists
**AND** the label SHALL include terrain-occlusion foreground-boost context and
reason when the token is boosted for readability
**AND** the label SHALL include hidden or last-known visibility state when
present
**AND** the wrapper SHALL NOT recalculate or mutate combat target legality,
fog state, terrain occlusion, depth sorting, or unit state

### Requirement: Sensor Ring Visibility Source Context

The tactical map interface SHALL expose source-aware context for rendered sensor
rings so players and tests can distinguish live-position rings from last-known
fog-position rings.

**Priority**: High

#### Scenario: Visible unit sensor ring exposes current source context

**GIVEN** a visible unit has a positive sensor range
**WHEN** the tactical map renders that unit's sensor ring
**THEN** the ring SHALL expose the represented range in hexes
**AND** the ring SHALL expose the rendered pixel radius
**AND** the ring SHALL expose the displayed map position
**AND** the ring SHALL expose the source unit position
**AND** the ring SHALL identify the position source as current
**AND** the ring SHALL identify the fog status as visible

#### Scenario: Last-known contact sensor ring exposes stale display context

**GIVEN** an enemy contact has a positive sensor range, a hidden current
position, and a last-known display position
**WHEN** the tactical map renders that contact's sensor ring
**THEN** the ring SHALL be placed at the last-known display position
**AND** the ring SHALL expose the hidden source unit position separately
**AND** the ring SHALL identify the position source as last-known
**AND** the ring SHALL identify the fog status as last-known

#### Scenario: Hidden contact sensor ring remains suppressed

**GIVEN** an enemy contact is hidden by fog or visibility rules
**WHEN** the tactical map renders sensor rings
**THEN** the hidden contact SHALL NOT render a sensor ring

### Requirement: Tactical Projection Explainability

The tactical map SHALL expose shared projection metadata for rendered terrain,
movement, combat, LOS blocker, cover, firing arc, fog, and fallback range
surfaces so the same rules-backed projection can be inspected in top-down and
isometric views.

#### Scenario: Rendered projection surfaces expose rule references

- **GIVEN** a tactical map hex has terrain/elevation, movement, combat, LOS blocker, or legacy range projection sources
- **WHEN** a user, accessibility surface, or browser test inspects the rendered hex or overlay
- **THEN** the surface SHALL expose formatted rule-reference metadata for every source channel that has rule references
- **AND** movement and combat rule references SHALL identify MegaMek as the tactical rules oracle
- **AND** legacy attack-range fallback references SHALL identify that the fallback is MekStation compatibility metadata, not a rules-backed attack option

- **GIVEN** the same hex renders projection badges, terrain/elevation labels, tooltips, or isometric scene wrappers
- **WHEN** those surfaces expose projection source metadata
- **THEN** they SHALL also expose the corresponding rule-reference metadata without recalculating movement, combat, LOS, terrain, or isometric legality

### Requirement: Rule-Backed Movement Highlight Projection

Movement highlights SHALL be sourced from shared movement projection metadata
that agrees with committed movement validation and resolution.

#### Scenario: Destroyed gyro stand-up explanation appears before commit

- **GIVEN** a prone Mek with a represented standard destroyed gyro is selected
- **WHEN** the player previews ground movement
- **THEN** affected hexes SHALL be rendered as blocked/unreachable
- **AND** the hex metadata, badge, and hover explanation SHALL expose
  `Cannot stand with a destroyed gyro`
- **AND** the map SHALL NOT present the destination as a rollable legal move

### Requirement: Tactical Map Rule-Trust Follow-Up Boundaries

The tactical map interface SHALL keep unresolved rule-trust boundaries explicit
whenever a represented map behavior is useful to players but is not yet fully
source-pinned, oracle-differenced, or interaction-swept.

#### Scenario: Source-pinned helper follow-ups are retired

- **GIVEN** a tactical-map follow-up previously tracked represented helper
  provenance rather than a MegaMek or official rules source pin
- **WHEN** a later OpenSpec change links that behavior to concrete MegaMek or
  official source references and adds focused map coverage
- **THEN** the follow-up tracker SHALL stop listing that behavior as an open
  helper-provenance gap
- **AND** any remaining limitations SHALL be restated as narrower behavior gaps,
  such as missing range math, hit-table expansion, or broader oracle sweeps.

#### Scenario: Movement oracle gaps remain named follow-up work

- **GIVEN** movement highlights use represented runtime movement capability,
  terrain cost, elevation cost, and commit-validation paths
- **WHEN** unresolved runtime transitions such as conversion action timing,
  remaining airborne LAM Fighter or AirMek submodes, or broad external oracle
  sweeps are required
- **THEN** those cases SHALL remain tracked as follow-up outcomes before the
  map claims full movement-oracle coverage
- **AND** future coverage SHALL compare preview highlights, command gating, and
  committed movement results for each affected runtime state.
- **AND** movement gaps that already have source-pinned preview/commit coverage,
  such as frogman/swim movement, optional infantry pavement bonus, represented
  unit-height bridge clearance, runtime infantry mounted/dismounted height
  precedence, runtime LAM/QuadVee conversion projection, and replayable runtime
  movement-state gameplay events plus runtime movement-state command controls,
  SHALL NOT remain listed as open headline gaps.
- **AND** hull-down `GET_UP` movement exit projection and replay-state clearing
  SHALL NOT remain grouped under unresolved hull-down entry action
  gaps once source-pinned coverage exists.
- **AND** hull-down `GO_PRONE` movement action projection and replay-state
  clearing SHALL NOT remain grouped under unresolved hull-down entry action
  gaps once source-pinned coverage exists.

#### Scenario: Isometric browser coverage distinguishes smoke from full interaction sweep

- **GIVEN** isometric topography, occluder highlighting, and camera rotation
  have representative smoke coverage, including button/keyboard rotation,
  pointer pan, touch pan, pinch-zoom, direct touch rotation, and rendered
  occluder retargeting when camera rotation changes which tall hex is in front
  of a unit
- **WHEN** the map is evaluated for full battlefield interaction readiness
- **THEN** broader mobile gesture-matrix and occlusion interaction sweeps SHALL
  remain tracked as follow-up outcomes
- **AND** those sweeps SHALL verify that isometric presentation continues to
  consume the same shared projection data as top-down movement, combat,
  terrain, elevation, LOS, and visibility highlights.

#### Scenario: Vehicle critical table follow-ups are narrowed after source-pinned dispatch

- **GIVEN** represented vehicle critical dispatch is source-pinned to MegaMek
  Tank and VTOL struck-location critical tables
- **WHEN** focused coverage proves front, rear, side/body, turret, VTOL rotor,
  engine-type, fuel-tank, and replay-visible state outcomes
- **THEN** tactical-map rule-trust tracking SHALL NOT keep full
  location-sensitive vehicle critical-table dispatch listed as an open gap
- **AND** the remaining vehicle critical follow-ups SHALL be narrowed to cargo
  import parity, dual-turret split identity, and broader external oracle sweeps.

### Requirement: Combat Projection Explains Engine Rejections

The tactical map SHALL use shared engine-facing projection data to explain
vehicle attacker-side hull-down front-weapon restrictions before a player
commits a weapon attack.

#### Scenario: Hull-down vehicle front-weapon block appears on weapon option

- **GIVEN** the selected attacker is a represented hull-down vehicle
- **AND** the selected target is in range and arc
- **AND** one selected weapon is front-mounted and using direct fire
- **WHEN** the player inspects the target hex or weapon option list
- **THEN** the front-mounted weapon SHALL be shown as unavailable
- **AND** the blocked reason SHALL match the commit-path invalid reason.

### Requirement: Physical Attack Projection Explains Engine Rejections

The tactical map SHALL show hull-down kick restrictions in the physical attack
panel, command preview, and token action surfaces through the existing physical
attack option restriction data.

#### Scenario: Hull-down kick is disabled before command

- **GIVEN** the selected attacker is hull-down
- **AND** a valid adjacent target is selected
- **WHEN** physical attack actions are shown
- **THEN** kick commands SHALL be disabled
- **AND** the tooltip or preview reason SHALL identify hull-down as the block.

### Requirement: Hull-Down Exit Movement Projection

The tactical map interface SHALL project and commit Mek-style hull-down exit
movement as a rules-backed posture transition before ground movement, using
MegaMek `GET_UP` cost semantics and shared movement projection data.

#### Scenario: Hull-down ground highlights reserve exit MP

- **GIVEN** the active unit is hull-down, not prone, uses Mek-style movement,
  and is previewing walk or run movement
- **WHEN** the map derives movement range and hovered-destination metadata
- **THEN** each reachable ground option SHALL reserve the same `GET_UP` MP cost
  used by MegaMek before adding path movement cost
- **AND** movement labels, badges, and context rows SHALL expose the hull-down
  exit cost separately from terrain, elevation, heat, and stand-up PSR data.

#### Scenario: Direct hull-down jump is blocked until posture exit

- **GIVEN** the active unit is hull-down, uses Mek-style movement, and has jump
  MP
- **WHEN** the player previews or commands jump movement without first exiting
  hull-down
- **THEN** the jump option SHALL be blocked with a player-facing reason that the
  unit must stand before jumping
- **AND** the action dock SHALL present the same reason.

#### Scenario: Committed hull-down exit clears state through movement replay

- **GIVEN** a Mek-style hull-down unit commits a same-hex posture exit or
  ground movement
- **WHEN** the engine declares and locks the movement
- **THEN** the movement event SHALL record that hull-down exit was attempted
- **AND** replay SHALL clear `hullDown` without emitting a prone stand-up PSR or
  `UnitStood` event.

### Requirement: Hull-Down Go-Prone Movement Action

The tactical map interface SHALL expose MegaMek's hull-down `GO_PRONE`
posture transition as a rules-backed movement action for Mek-style units,
using the same movement declaration, replay, and lock path as other movement
phase actions.

#### Scenario: Hull-down Mek-style unit can go prone for zero MP

- **GIVEN** the active unit is hull-down, not prone, uses Mek-style movement,
  and is in the Movement phase
- **WHEN** the player chooses Go Prone
- **THEN** the engine SHALL declare same-hex stationary movement with 0 MP and
  0 heat
- **AND** the declaration SHALL record `goProneAttempt` and a `goProne` step
- **AND** replay SHALL set `prone` to true, clear `hullDown`, and lock the
  unit's movement without emitting a stand-up PSR or `UnitStood` event.

#### Scenario: Invalid go-prone attempts explain their blocker

- **GIVEN** the active unit is not hull-down, already prone, lacks movement
  capability, or uses a non-Mek-style represented movement profile
- **WHEN** the player inspects or attempts Go Prone
- **THEN** the command or commit path SHALL reject the action with a
  player-facing reason before any posture state is changed.

### Requirement: Standing Hull-Down Movement Action

The tactical map interface SHALL expose MegaMek's standing `HULL_DOWN` posture
transition as a rules-backed movement action for Mek-style units, using the
same movement declaration, replay, and lock path as other movement phase
actions.

#### Scenario: Standing Mek-style unit can enter hull-down for 2 MP

- **GIVEN** the active unit is standing, not hull-down, uses Mek-style
  movement, has enough walk MP, and is in the Movement phase
- **WHEN** the player chooses Hull Down
- **THEN** the engine SHALL declare same-hex walk movement with 2 MP and
  walking movement heat
- **AND** the declaration SHALL record `hullDownEntryAttempt` and a
  `hullDown` step
- **AND** replay SHALL set `hullDown` to true, clear `prone`, and lock the
  unit's movement without emitting a stand-up PSR or `UnitStood` event.

#### Scenario: Invalid hull-down entry attempts explain their blocker

- **GIVEN** the active unit is prone, already hull-down, lacks movement
  capability, uses a non-Mek-style represented movement profile, lacks enough
  walk MP, or has a destroyed gyro
- **WHEN** the player inspects or attempts Hull Down
- **THEN** the command or commit path SHALL reject the action with a
  player-facing reason before any posture state is changed.

### Requirement: Movement Preview And Commit Agreement

Blocked movement projections SHALL expose altitude-control context for
represented altitude-positive VTOL or WiGE vehicle combat state. That context
names the represented control mode and represented altitude responsible for the
block.
The altitude-control context SHALL be explanatory and SHALL NOT imply that full
airborne altitude pathing, hover, takeoff, landing, or altitude-change controls
are available from ordinary ground movement projection.

#### Scenario: Airborne WiGE blocked projection exposes altitude-control context

- **GIVEN** a vehicle unit has represented combat state with motion type `WiGE`
- **AND** the represented vehicle combat state has altitude 2
- **WHEN** the tactical map projects a blocked ordinary ground movement
  destination for that unit
- **THEN** the destination SHALL be unreachable
- **AND** the projection SHALL expose that altitude controls are required
- **AND** the projection SHALL expose altitude-control mode `wige`
- **AND** the projection SHALL expose represented altitude 2

#### Scenario: Airborne VTOL blocked projection exposes altitude-control context

- **GIVEN** a vehicle unit has represented combat state with motion type `VTOL`
- **AND** the represented vehicle combat state has altitude 2
- **WHEN** the tactical map projects a blocked ordinary ground movement
  destination for that unit
- **THEN** the destination SHALL be unreachable
- **AND** the projection SHALL expose that altitude controls are required
- **AND** the projection SHALL expose altitude-control mode `vtol`
- **AND** the projection SHALL expose represented altitude 2

### Requirement: Tactical map runtime movement controls are replayable and rules-backed

Movement projection state controls SHALL dispatch replayable runtime movement
state events that keep selected-unit command state, map projection, and
committed movement validation aligned with the represented tactical rules.

#### Scenario: AirMek-to-Mek conversion automatically grounds represented AirMek elevation

- **GIVEN** a represented LAM is selected in AirMek mode with positive
  `lamAirMekAltitude`
- **WHEN** the player chooses the Mek Mode conversion command
- **THEN** the conversion command SHALL dispatch `conversionMode: "mek"`,
  the source-backed AirMek-to-Mek conversion step metadata, and
  `lamAirMekAltitude: 0`
- **AND** replaying that conversion SHALL leave the unit in Mek mode with no
  stale AirMek altitude-control ground-projection blocker
- **AND** AirMek-to-Fighter conversion SHALL NOT implicitly clear represented
  AirMek elevation.

### Requirement: Rules-Backed Movement Projection

Movement overlays SHALL be derived from shared movement projection data and
SHALL explain legal, blocked, and consequential movement outcomes before the
player commits them.

#### Scenario: Encoded cliff movement appears in map projection

- **GIVEN** a selected represented unit previews movement across an encoded
  directional cliff edge
- **WHEN** the movement mode is WiGE, tracked, wheeled, or hover
- **THEN** the destination projection SHALL expose the same added cost or
  terrain-blocked reason that committed movement validation would apply
- **AND** ordinary elevation changes without cliff metadata SHALL continue to
  display as non-cliff movement.

#### Scenario: Turning charges appear in the movement overlay cost

- **GIVEN** a selected represented ground unit previews a destination whose
  derived path includes facing changes that committed movement validation
  charges as MP
- **WHEN** the movement overlay renders that destination's MP cost
- **THEN** the displayed MP cost SHALL include the turning charges
- **AND** the per-hex movement explanation SHALL list the turning contribution
  so the player can see why the destination costs more than its hex distance.

### Requirement: Integrated Rules-Backed Tactical Map Outcomes

The tactical map SHALL behave as the primary player-facing explanation layer
for represented battlefield rules. Movement, combat, terrain, elevation, line
of sight, visibility, top-down highlights, and isometric highlights SHALL be
derived from shared projection data that agrees with committed engine
validation and resolution.

#### Scenario: Selected unit exposes actionable movement and combat meaning

- **GIVEN** a player selects a represented unit during a legal tactical phase
- **WHEN** the map renders available movement and attack options
- **THEN** every highlighted hex SHALL identify whether the selected unit can
  legally move or attack there
- **AND** blocked or illegal options SHALL expose a non-color reason before the
  player commits the action
- **AND** costly but legal movement SHALL expose MP cost, terrain contribution,
  elevation contribution, heat impact when represented, and movement mode
- **AND** attack highlights SHALL expose range band, firing arc coverage,
  selected-weapon applicability, LOS/visibility state, terrain blockers, cover,
  and represented weapon/environment restrictions
- **AND** committing an unchanged highlighted action SHALL be accepted by the
  engine, while any engine rejection SHALL have been previewed with the same
  reason.

#### Scenario: Top-down and isometric modes preserve the same rules meaning

- **GIVEN** the same tactical state is viewed in top-down and isometric modes
- **WHEN** the player inspects terrain, elevation, movement, combat, LOS, and
  visibility highlights
- **THEN** both modes SHALL consume the same shared projection data
- **AND** top-down mode SHALL show readable hex terrain/elevation information,
  including an elevation number directly on the hex
- **AND** isometric mode SHALL render stacked/elevated hex layers from the same
  terrain/elevation facts
- **AND** isometric camera rotation SHALL change presentation only, not
  movement or combat legality
- **AND** units hidden behind tall elevations or terrain stacks SHALL retain
  discoverable visibility affordances such as occluder highlights, ghosting, or
  projection metadata.

#### Scenario: Representative tests prove player-visible agreement

- **GIVEN** the integration touches represented movement, combat, terrain,
  elevation, LOS, visibility, or isometric rendering
- **WHEN** the change is prepared for review
- **THEN** focused tests SHALL cover representative legal, illegal, costly, and
  blocked scenarios for the affected surface
- **AND** at least one preview-to-commit agreement test SHALL cover any changed
  action legality path
- **AND** rendering or browser tests SHALL cover player-visible map metadata
  when the outcome depends on top-down labels, badges, tooltips, or isometric
  layers/rotation.

### Requirement: Tactical Map Explanation Layer

Top-down movement hexes SHALL surface altitude-control context without relying
on color alone. Movement badges, invalid movement badges, accessible labels,
tooltip reason rows, and same-hex movement-option metadata SHALL expose the same
context when a blocked movement projection is owned by represented
altitude-positive VTOL/WiGE altitude controls.

#### Scenario: Blocked altitude-control hex is inspectable

- **GIVEN** a top-down tactical-map hex has a blocked movement projection with
  altitude-control mode `wige`
- **AND** the blocked movement projection has represented altitude 2
- **WHEN** the map renders the movement overlay
- **THEN** the hex metadata SHALL mark altitude-control required
- **AND** the hex metadata SHALL expose mode `wige` and altitude 2
- **AND** the accessible movement label SHALL include the altitude-control mode
  and altitude
- **AND** the invalid movement badge SHALL use a non-color altitude-control cue
- **AND** the tooltip reason row SHALL expose the same altitude-control context

### Requirement: Hover-Stable Per-Hex Projection Rendering

A pure hover or selection change on the tactical map SHALL NOT rebuild the
per-hex tactical projection objects and SHALL re-render only the hexes whose
hover or selection state actually changed. The per-hex projection lookup SHALL
be derived only from rules inputs (terrain, movement range, combat range, path,
attack range) and SHALL keep referential identity for any hex whose rules inputs
are unchanged, so that the hex cell `React.memo` is not defeated on mouse-move.
Hover and selection presentation SHALL be driven through per-cell scalar
hover/selection props rather than baked into the shared projection objects.

#### Scenario: Mouse-move re-renders only entered and exited hexes

- **GIVEN** a tactical map with roughly one thousand hexes rendered
- **WHEN** the player moves the cursor from one hex to an adjacent hex
- **THEN** only the previously hovered hex and the newly hovered hex SHALL
  re-render
- **AND** the remaining hexes SHALL NOT re-render
- **AND** the visible hover highlight SHALL still move to the newly hovered hex.

#### Scenario: Projection objects keep identity across a pure hover change

- **GIVEN** the per-hex tactical projection lookup is built for the current
  rules state
- **WHEN** the hovered hex changes but no rules input (terrain, movement range,
  combat range, path, attack range) changes
- **THEN** the projection lookup and each per-hex projection object for unchanged
  hexes SHALL remain referentially identical
- **AND** the projection objects SHALL NOT carry per-hex hover or selection flags
  that change identity on mouse-move.

#### Scenario: Selection highlight still renders after decoupling

- **GIVEN** a hex is selected
- **WHEN** the map renders after hover and selection were decoupled from the
  projection objects
- **THEN** the selected hex SHALL render its selection treatment driven by its
  per-cell selection prop
- **AND** every non-selected hex SHALL render the same projection intent, status,
  blocked reasons, and source references it rendered before the decoupling.

### Requirement: Shared Tactical Projection Frame Contract
The tactical map interface SHALL accept an explicit shared tactical projection frame that contains the per-hex projection lookup and source metadata for movement, combat, terrain, elevation, LOS, overlays, and invalid reasons. When a shared frame is supplied, rendered hex state SHALL be driven by that frame instead of re-derived from legacy movement or attack range props.

#### Scenario: Supplied shared frame drives rendered hex explanation
- **GIVEN** `HexMapDisplay` receives a shared tactical projection frame with terrain, movement, combat, blocked reason, source reference, and explanation data for a hex
- **WHEN** the hex renders
- **THEN** the hex SHALL expose projection status, movement status, combat status, blocked reasons, source references, and explanation from the supplied frame
- **AND** the map SHALL identify the projection source as shared projection data

#### Scenario: Local fallback is marked explicitly
- **GIVEN** `HexMapDisplay` receives legacy movement, terrain, or attack range props without a shared tactical projection frame
- **WHEN** the map derives its projection lookup internally
- **THEN** the map SHALL identify the projection source as a fallback-derived frame
- **AND** rendered hexes SHALL continue to expose projection explanation data for backward compatibility

#### Scenario: Missing shared projection coverage is diagnosable
- **GIVEN** `HexMapDisplay` receives a shared tactical projection frame that does not cover every rendered hex
- **WHEN** the map renders
- **THEN** the map SHALL expose the missing rendered hex keys as projection coverage diagnostics
- **AND** the missing coverage SHALL NOT be hidden by silently substituting legacy projection data for those hexes

#### Scenario: Shared frame takes precedence over legacy props
- **GIVEN** `HexMapDisplay` receives both a shared tactical projection frame and conflicting legacy movement or attack range props
- **WHEN** the same hex appears in both inputs
- **THEN** rendered projection status, invalid reasons, and explanations SHALL come from the shared frame
- **AND** automated tests SHALL fail if the legacy props override the supplied frame

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * Props for the HexMapDisplay component.
 */
interface IHexMapDisplayProps {
  /** Map radius in hexes from center (e.g., 8 for 15x17 map) */
  readonly radius: number;

  /** Unit tokens to display on the map */
  readonly tokens: readonly IUnitToken[];

  /** Currently selected hex coordinate */
  readonly selectedHex: IHexCoordinate | null;

  /** Hexes showing movement range with MP costs */
  readonly movementRange?: readonly IMovementRangeHex[];

  /** Hexes showing attack range */
  readonly attackRange?: readonly IHexCoordinate[];

  /** Path to highlight for movement preview */
  readonly highlightPath?: readonly IHexCoordinate[];

  /** Terrain data for each hex */
  readonly terrainMap?: ReadonlyMap<string, IHexTerrain>;

  /** Active overlays to display */
  readonly activeOverlays?: readonly OverlayType[];

  /** Callback when hex is clicked */
  readonly onHexClick?: (hex: IHexCoordinate) => void;

  /** Callback when hex is hovered */
  readonly onHexHover?: (hex: IHexCoordinate | null) => void;

  /** Callback when token is clicked */
  readonly onTokenClick?: (unitId: string) => void;

  /** Show coordinate labels on hexes */
  readonly showCoordinates?: boolean;

  /** Optional className for styling */
  readonly className?: string;
}

/**
 * Individual hex cell rendering props.
 */
interface IHexCellProps {
  /** Hex coordinate */
  readonly hex: IHexCoordinate;

  /** Terrain data for this hex */
  readonly terrain?: IHexTerrain;

  /** Whether this hex is selected */
  readonly isSelected: boolean;

  /** Whether this hex is hovered */
  readonly isHovered: boolean;

  /** Movement range info if in range */
  readonly movementInfo?: IMovementRangeHex;

  /** Whether this hex is in attack range */
  readonly isInAttackRange: boolean;

  /** Whether this hex is in the highlighted path */
  readonly isInPath: boolean;

  /** Active overlays for this hex */
  readonly activeOverlays: readonly OverlayType[];

  /** Show coordinate label */
  readonly showCoordinate: boolean;

  /** Click handler */
  readonly onClick: () => void;

  /** Mouse enter handler */
  readonly onMouseEnter: () => void;

  /** Mouse leave handler */
  readonly onMouseLeave: () => void;
}

/**
 * Overlay configuration.
 */
interface IOverlayConfig {
  /** Overlay type identifier */
  readonly type: OverlayType;

  /** Whether overlay is currently active */
  readonly enabled: boolean;

  /** Keyboard shortcut to toggle */
  readonly toggleKey: string;

  /** Display name for UI */
  readonly displayName: string;

  /** Render priority (higher = on top) */
  readonly priority: number;
}

/**
 * Overlay type enumeration.
 */
enum OverlayType {
  MovementCost = 'movement_cost',
  CoverLevel = 'cover_level',
  HeatEffect = 'heat_effect',
  LineOfSight = 'line_of_sight',
  Elevation = 'elevation',
  WaterDepth = 'water_depth',
  Impassable = 'impassable',
}

/**
 * Map viewport state.
 */
interface IMapViewport {
  /** Pan offset in pixels */
  readonly pan: { x: number; y: number };

  /** Zoom level (1.0 = 100%) */
  readonly zoom: number;

  /** ViewBox dimensions */
  readonly viewBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Movement range hex with cost.
 */
interface IMovementRangeHex {
  /** Hex coordinate */
  readonly hex: IHexCoordinate;

  /** Movement point cost to reach this hex */
  readonly mpCost: number;

  /** Whether this hex is reachable with remaining MP */
  readonly reachable: boolean;
}

/**
 * Unit token visual representation.
 */
interface IUnitToken {
  /** Unique unit identifier */
  readonly unitId: string;

  /** Current hex position */
  readonly position: IHexCoordinate;

  /** Current facing direction */
  readonly facing: Facing;

  /** Unit designation (e.g., "A1", "E2") */
  readonly designation: string;

  /** Which side controls this unit */
  readonly side: GameSide;

  /** Whether this unit is selected */
  readonly isSelected: boolean;

  /** Whether this unit is a valid attack target */
  readonly isValidTarget: boolean;

  /** Whether this unit is destroyed */
  readonly isDestroyed: boolean;
}
```

### Required Properties

| Property          | Type                     | Required | Description           | Valid Values             | Default |
| ----------------- | ------------------------ | -------- | --------------------- | ------------------------ | ------- |
| `radius`          | `number`                 | Yes      | Map radius in hexes   | 1-20 typical             | -       |
| `tokens`          | `IUnitToken[]`           | Yes      | Unit tokens to render | Any array                | `[]`    |
| `selectedHex`     | `IHexCoordinate \| null` | Yes      | Selected hex          | Valid coordinate or null | `null`  |
| `zoom`            | `number`                 | No       | Zoom level            | 0.5-3.0                  | 1.0     |
| `showCoordinates` | `boolean`                | No       | Show hex labels       | true/false               | false   |

---

## Calculation Formulas

### Hex-to-Pixel Conversion

**Formula**:

```
x = HEX_SIZE * (3/2) * q
y = HEX_SIZE * (√3/2 * q + √3 * r)
```

**Where**:

- `HEX_SIZE` = radius of the hexagon (e.g., 30 pixels)
- `q` = axial q coordinate
- `r` = axial r coordinate
- `√3` ≈ 1.732050808

**Example**:

```
Input: hex = {q: 2, r: -1}, HEX_SIZE = 30
Calculation:
  x = 30 * (3/2) * 2 = 90
  y = 30 * (1.732/2 * 2 + 1.732 * -1) = 30 * (1.732 - 1.732) = 0
Output: {x: 90, y: 0}
```

### Pixel-to-Hex Conversion

**Formula**:

```
q = (2/3 * x) / HEX_SIZE
r = (-1/3 * x + √3/3 * y) / HEX_SIZE
Then round to nearest hex using cube coordinate rounding
```

**Rounding Algorithm**:

```typescript
function roundHex(q: number, r: number): IHexCoordinate {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);

  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }

  return { q: rq, r: rr };
}
```

### Hex Count from Radius

**Formula**:

```
hexCount = 3 * radius² + 3 * radius + 1
```

**Example**:

```
Input: radius = 8
Calculation: 3 * 64 + 3 * 8 + 1 = 192 + 24 + 1 = 217
Output: 217 hexes
```

### ViewBox Calculation

**Formula**:

```
padding = HEX_SIZE * 2
minX = -radius * HEX_WIDTH * 0.75 - padding
maxX = radius * HEX_WIDTH * 0.75 + padding
minY = -radius * HEX_HEIGHT - padding
maxY = radius * HEX_HEIGHT + padding
viewBoxWidth = maxX - minX
viewBoxHeight = maxY - minY
```

**Where**:

- `HEX_WIDTH` = HEX_SIZE \* √3
- `HEX_HEIGHT` = HEX_SIZE \* 2

---

## Validation Rules

### Validation: Valid Hex Coordinate

**Rule**: Hex coordinates MUST satisfy the cube coordinate constraint.

**Severity**: Error

**Condition**:

```typescript
if (hex.q + hex.r + (-hex.q - hex.r) !== 0) {
  // invalid - violates cube coordinate constraint
}
```

**Error Message**: "Invalid hex coordinate {q: {q}, r: {r}} - violates cube constraint"

**User Action**: Recalculate hex coordinate using proper conversion

### Validation: Zoom Range

**Rule**: Zoom level MUST be within [0.5, 3.0] range.

**Severity**: Warning

**Condition**:

```typescript
if (zoom < 0.5 || zoom > 3.0) {
  // clamp to valid range
  zoom = Math.max(0.5, Math.min(3.0, zoom));
}
```

**Error Message**: "Zoom level {zoom} out of range, clamped to [{min}, {max}]"

### Validation: Overlay Compatibility

**Rule**: Certain overlays cannot be active simultaneously.

**Severity**: Warning

**Condition**:

```typescript
if (
  activeOverlays.includes(OverlayType.MovementCost) &&
  activeOverlays.includes(OverlayType.Impassable)
) {
  // redundant - impassable is shown in movement cost
}
```

**Error Message**: "Overlays {overlay1} and {overlay2} are redundant"

---

## Dependencies

### Depends On

- **terrain-system**: IHexTerrain, TerrainType, terrain properties for rendering
- **hex-grid-interfaces**: IHexCoordinate, Facing, hex math utilities

### Used By

- **combat-resolution**: Uses map display for combat visualization
- **movement-validation**: Uses movement range overlay for path planning
- **campaign-hud**: Embeds tactical map for mission encounters

---

## Implementation Notes

### Performance Considerations

- SVG rendering is suitable for <3000 hexes (typical tactical maps)
- For larger maps (starmap), consider Canvas or WebGL rendering
- Use React.memo for HexCell and UnitToken components to prevent unnecessary re-renders
- Pre-calculate hex positions and cache in useMemo
- Use Map for movement range lookup instead of array iteration

### Edge Cases

- **Overlapping overlays**: Use z-index layering (terrain < movement < cover < LOS)
- **Token click vs hex click**: Token click should stopPropagation to prevent hex click
- **Pan during zoom**: Maintain center point when zooming
- **Viewport bounds**: Allow panning beyond map edges for better UX

### Common Pitfalls

- **Pitfall**: Using offset coordinates instead of axial
  - **Solution**: Always use axial {q, r} for storage, convert to pixel only for rendering
- **Pitfall**: Forgetting to round fractional hex coordinates
  - **Solution**: Always use roundHex after pixel-to-hex conversion
- **Pitfall**: Overlays obscuring terrain
  - **Solution**: Use semi-transparent overlays and proper layering

---

## Examples

### Example 1: Basic Hex Map Display

**Input**:

```typescript
const props: IHexMapDisplayProps = {
  radius: 8,
  tokens: [
    {
      unitId: 'unit-1',
      position: { q: 0, r: 0 },
      facing: Facing.North,
      designation: 'A1',
      side: GameSide.Player,
      isSelected: true,
      isValidTarget: false,
      isDestroyed: false,
    },
  ],
  selectedHex: { q: 0, r: 0 },
  showCoordinates: false,
};
```

**Output**:

- 217 hexes rendered in flat-top orientation
- One blue player token at center facing north
- Yellow selection ring around token
- Selected hex highlighted in yellow

### Example 2: Movement Range Display

**Input**:

```typescript
const props: IHexMapDisplayProps = {
  radius: 8,
  tokens: [
    /* ... */
  ],
  selectedHex: { q: 0, r: 0 },
  movementRange: [
    { hex: { q: 1, r: 0 }, mpCost: 1, reachable: true },
    { hex: { q: 2, r: 0 }, mpCost: 2, reachable: true },
    { hex: { q: 3, r: 0 }, mpCost: 4, reachable: false },
  ],
};
```

**Output**:

- Hexes at {1,0} and {2,0} tinted green with "1MP" and "2MP" labels
- Hex at {3,0} tinted red with "4MP" label (unreachable)

### Example 3: Multiple Overlays

**Input**:

```typescript
const props: IHexMapDisplayProps = {
  radius: 8,
  tokens: [
    /* ... */
  ],
  activeOverlays: [OverlayType.MovementCost, OverlayType.CoverLevel],
  terrainMap: new Map([
    ['0,0', { type: TerrainType.LightWoods, level: 1 /* ... */ }],
  ]),
};
```

**Output**:

- Hex at {0,0} shows light green woods fill
- Movement cost "2MP" displayed
- Half-shield icon for partial cover displayed
- Both overlays visible without overlap

---

## References

### Design Resources

- **Red Blob Games - Hexagonal Grids**: https://www.redblobgames.com/grids/hexagons/
- **Civilization 5/6 UI Patterns**: Campaign map design research document Part 2

### Related Specifications

- **terrain-system**: Terrain data model and mechanical properties
- **combat-resolution**: Combat phase integration
- **movement-validation**: Movement path calculation

### Implementation Reference

- **Current Implementation**: `src/components/gameplay/HexMapDisplay.tsx`
- **Hex Constants**: `src/constants/hexMap.ts`
- **Gameplay Types**: `src/types/gameplay.ts`

---

### Requirement: Hex Cell Composition

Each hex cell SHALL compose a terrain art layer and an elevation
shading layer beneath the existing interaction polygon.

#### Scenario: Hex cell includes art layer

- **GIVEN** a hex cell renders
- **WHEN** its layers compose
- **THEN** a `TerrainArtLayer` SHALL render beneath the hex polygon
- **AND** the hex polygon SHALL remain the primary hit target
- **AND** elevation shading SHALL apply to the fill beneath all art

#### Scenario: Overlays still render above terrain

- **GIVEN** a selected hex with movement-cost overlay visible
- **WHEN** the hex renders
- **THEN** terrain art SHALL render beneath the overlay
- **AND** the overlay text SHALL remain legible
- **AND** the unit token layer SHALL still render above everything

---

## Changelog

### Version 1.0 (2026-01-31)

- Initial specification based on existing HexMapDisplay implementation
- Covers SVG rendering, pan/zoom, terrain visualization, overlays, unit tokens
- Defines interaction patterns and visual feedback requirements

### Version 1.1 (2026-04-23)

- Added `Requirement: Unit Token Rendering Uses Sprite System` via change `add-mech-silhouette-sprite-set`
- Unit tokens now render through `MechSprite` + `ArmorPipRing` instead of the flat disc marker
- Selection binding and side tint contracts preserved from Phase 1 MVP
