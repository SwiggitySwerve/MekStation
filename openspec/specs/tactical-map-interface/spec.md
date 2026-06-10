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

The system SHALL render unit tokens with facing indicators, selection rings, and status markers.

**Priority**: Critical

#### Scenario: Player unit token

**GIVEN** a player-controlled unit at hex {q: 2, r: 1} facing Northeast
**WHEN** rendering the token
**THEN** a circular token SHALL be drawn at the hex center
**AND** token color SHALL be blue (#3b82f6)
**AND** facing arrow SHALL point Northeast (60° rotation)
**AND** unit designation SHALL be displayed in the center

#### Scenario: Opponent unit token

**GIVEN** an opponent-controlled unit at hex {q: -2, r: 1}
**WHEN** rendering the token
**THEN** token color SHALL be red (#ef4444)
**AND** all other rendering rules SHALL match player tokens

#### Scenario: Selected unit token

**GIVEN** a unit is selected
**WHEN** rendering the token
**THEN** a yellow selection ring SHALL be drawn around the token
**AND** ring radius SHALL be 0.7 × HEX_SIZE
**AND** ring stroke width SHALL be 3px

#### Scenario: Valid target token

**GIVEN** a unit is a valid attack target
**WHEN** rendering the token
**THEN** a red target ring SHALL be drawn around the token
**AND** ring SHALL pulse with animation

#### Scenario: Destroyed unit token

**GIVEN** a unit is destroyed
**WHEN** rendering the token
**THEN** token color SHALL be gray (#6b7280)
**AND** a red X SHALL be drawn over the token
**AND** the token SHALL remain visible but non-interactive

#### Scenario: Facing indicator

**GIVEN** a unit facing South (180°)
**WHEN** rendering the facing arrow
**THEN** the arrow SHALL point downward
**AND** arrow SHALL be white with dark stroke
**AND** arrow SHALL be clearly visible against token background

---

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
`to-hit-resolution`.

**Priority**: Critical

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

The tactical map interface SHALL render a reachable-hex overlay during the Movement phase for the selected Player-side unit, coloring each tile by the movement type (Walk, Run, Jump) required to reach it using the MegaMek movement palette: Walk cyan, Run yellow, Jump red, and projected illegal/blocked movement dark gray.

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

The tactical map interface SHALL render movement, combat, terrain/elevation, fog, LOS, cover, and firing-arc highlights from shared rules projections rather than from view-local legality calculations.

Every projection that affects action legality SHALL identify the rule source it is pinned to, using this source order: official BattleTech rules where citable, MegaMek tactical behavior as practical oracle for tactical ambiguity, MekHQ only for campaign/scenario context, then local OpenSpec/Jest fixtures as the project acceptance contract.

#### Scenario: Terrain projection exposes represented building identity

- **GIVEN** a rendered hex has building terrain with a represented building id
- **WHEN** the hex renders and its terrain/elevation projection metadata is inspected
- **THEN** the hex SHALL expose the building id in machine-readable terrain metadata
- **AND** terrain/elevation source detail SHALL include the building id
- **AND** hover terrain context SHALL show the represented building id
- **AND** exposing that identity SHALL NOT change movement, combat, LOS, cover, or physical attack legality

### Requirement: Movement Projection Explanation

Movement highlights SHALL expose the BattleTech movement facts required to
understand walk, run, jump, and unit-type-specific movement legality.

For each projected movement hex, the map SHALL expose at least movement mode,
cumulative MP cost, terrain cost, elevation delta/cost, heat impact where
applicable, path/facing preview where applicable, and invalid reason when
blocked. When live movement overlays combine multiple projections for the same
destination, they SHALL preserve the per-mode option facts instead of
collapsing them into an unexplained single state.

#### Scenario: Live jump overlay preserves same-hex walk and run options

- **GIVEN** a selected unit can evaluate a jump destination by walking or
  running as well
- **WHEN** the jump movement overlay renders that destination
- **THEN** the highlighted hex SHALL expose the jump, walk, and run option
  metadata, including reachability, MP cost, terrain cost, elevation
  delta/cost, and heat impact
- **AND** the jump projection SHALL remain the primary projection for map-click
  movement planning

#### Scenario: Live jump overlay does not widen with ground-only options

- **GIVEN** a selected unit has walk or run projections for destinations that
  are not present in the jump projection
- **WHEN** the jump movement overlay renders
- **THEN** those ground-only destinations SHALL NOT be added to the jump overlay
  solely as alternatives

#### Scenario: Blocked jump remains primary with reachable ground option

- **GIVEN** a selected unit can walk to a destination but its jump projection
  for that destination is blocked
- **WHEN** the jump movement overlay renders that destination
- **THEN** the highlighted hex SHALL keep the blocked jump projection primary
- **AND** same-hex option metadata SHALL expose the reachable walk or run
  alternative and the blocked jump invalid reason

### Requirement: Combat Projection Explanation

Combat highlights SHALL expose weapon-backed attack legality, range, firing
arc, LOS, cover, visibility, heat, ammo, and disabled reasons.

When a selected unit has a configured weapon list, the map SHALL derive
attack-range highlighting from the weapon-backed combat projection. Legacy raw
`attackRange` props MAY be used only when no configured weapon list exists.
When the attack plan has one or more selected weapon IDs, combat projection
surfaces SHALL use only those selected weapons; an empty selected-weapon list
SHALL preserve the all-weapons preview behavior.

#### Scenario: Selected weapon extreme range shades firing arc envelope

- **GIVEN** a selected unit has an operational selected weapon with represented
  long range 6 and extreme range 8
- **AND** a visible enemy target is in the selected weapon's mounted arc at
  distance 7
- **WHEN** the combat map renders selected-weapon range, target, and firing-arc
  projection
- **THEN** the target hex SHALL report the `extreme` combat range bracket
- **AND** the firing-arc overlay SHALL shade that distance-7 hex as part of the
  selected weapon's compatible arc

#### Scenario: Weapons without extreme range keep long-range arc envelope

- **GIVEN** a selected unit has an operational selected weapon with no
  represented extreme range
- **WHEN** the firing-arc overlay renders for the selected weapon
- **THEN** the overlay SHALL use the weapon's represented long range as its
  maximum shaded envelope

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

Top-down tactical map mode SHALL present terrain and elevation from the same replay/recovery terrain seed used by the game session, so saved matches render the opening battlefield with the same readable terrain and elevation information as live play.

#### Scenario: Replay starts with seeded terrain and elevation

- **GIVEN** a replay event log whose `GameCreated` event carries `payload.hexTerrain`
- **WHEN** the replay map renders at sequence 0
- **THEN** top-down mode SHALL show the seeded terrain type and elevation number for those hexes
- **AND** the map SHALL retain the same terrain/elevation data when switching to isometric presentation mode

### Requirement: Isometric Projection Parity And Occlusion Tools

Isometric mode SHALL be presentation state only and SHALL consume the same terrain, elevation, movement, combat, LOS, fog, cover, and firing-arc projection data as top-down mode.

Isometric mode SHALL make stacked elevation layers readable, support battlefield rotation, and provide interaction aids for units obscured by high terrain or tall stacks.

#### Scenario: Isometric uses same rules projection as top-down

- **GIVEN** the same tactical state is rendered in top-down and isometric modes
- **WHEN** movement and combat projections are computed
- **THEN** both modes SHALL expose the same legal destinations, targets, costs, range bands, LOS results, cover states, and firing arcs
- **AND** no legality SHALL be derived from isometric screen coordinates

#### Scenario: Isometric rotation preserves selection

- **GIVEN** the map is in isometric mode
- **AND** a unit or hex is selected
- **WHEN** the player rotates the camera around the battlefield
- **THEN** the selected axial coordinate SHALL remain selected
- **AND** movement/combat highlights SHALL rotate visually without changing rules meaning

#### Scenario: Obscured units remain inspectable

- **GIVEN** a unit is behind or below a large elevation stack in isometric mode
- **WHEN** the player hovers, cycles, slices layers, rotates, or uses another occlusion aid
- **THEN** the hidden unit SHALL be highlightable and selectable if visibility rules allow it
- **AND** the map SHALL communicate when fog or visibility rules, rather than terrain occlusion, prevent inspection
- **AND** represented building levels SHALL contribute to isometric occluder height and scene depth ordering so tall buildings do not disappear as flat ground in 2.5D mode
- **AND** isometric occluder highlight labels SHALL report the effective occluder height, including represented building levels
- **AND** represented building levels SHALL render as visible isometric stack layers even when the base terrain elevation is flat

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat, path, selected, and hover state into a single per-hex projection before rendering hex cells or hover explanations.

**Priority**: Critical

#### Scenario: Projection composes existing rules outputs

**GIVEN** `HexMapDisplay` has terrain, movement range, combat range, selected hex, hovered hex, and highlighted path inputs
**WHEN** the map derives cell render state
**THEN** each rendered hex SHALL have one projection containing its terrain/elevation data
**AND** any matching `IMovementRangeHex` SHALL be attached without recalculating movement rules
**AND** any matching `ICombatRangeHex` SHALL be attached without recalculating combat, LOS, cover, range, or firing-arc rules
**AND** selected, hovered, path-index, and attack-range state SHALL be represented on the same projection

#### Scenario: Projection explains legal and blocked states

**GIVEN** a projected hex has reachable movement, blocked movement, attackable combat, blocked combat, or both movement and combat data
**WHEN** the projection is built
**THEN** it SHALL expose a stable `status` of `neutral`, `legal`, `blocked`, or `mixed`
**AND** it SHALL expose an `intent` describing whether the hex is currently terrain-only, selected, path, movement, combat, or movement+combat
**AND** it SHALL preserve player-facing movement and combat blocked reasons from the underlying rules projection

#### Scenario: Top-down and isometric consume the same projection

**GIVEN** a map can switch between `topDown` and an isometric projection mode
**WHEN** the projection mode changes
**THEN** the same per-hex projection facts SHALL remain attached to the rendered hex
**AND** projection mode SHALL NOT recalculate or mutate movement, combat, LOS, terrain, or path legality

#### Scenario: Isometric scene wrapper preserves projection summary

**GIVEN** a tactical map hex is rendered in isometric mode
**WHEN** the isometric scene depth-sorts that hex
**THEN** the scene hex wrapper SHALL expose the hex coordinate used for map lookup
**AND** it SHALL expose the terrain elevation and primary terrain type from the shared projection
**AND** it SHALL expose the projection intent, overall status, movement status, and combat status
**AND** it SHALL expose any blocked reasons, source references, and projection explanation from the same per-hex projection used by the nested rendered hex
**AND** its title and accessible label SHALL summarize the same projection status, channel state, blocked reasons, and explanation without recalculating rules

#### Scenario: Rendered hex labels carry projection context

**GIVEN** a rendered hex has a shared tactical projection
**WHEN** the hex cell renders in top-down or isometric mode
**THEN** the rendered hex title and accessible label SHALL include the projection status and intent
**AND** the label SHALL include movement-channel and combat-channel status from the shared projection
**AND** the label SHALL include shared projection blocked reasons when present
**AND** the label SHALL include the shared projection explanation when present
**AND** the label SHALL NOT recalculate movement, combat, LOS, terrain, elevation, or path legality

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

The tactical map interface SHALL include rules-backed combat details in the shared per-hex tactical projection explanation.

**Priority**: High

#### Scenario: Projection explanation summarizes attack constraints

**GIVEN** a hex projection contains combat data
**WHEN** the projection explanation is exposed through map metadata or projection badge text
**THEN** the explanation SHALL include range, distance, line of sight, and firing arc
**AND** it SHALL identify available weapons when any are available
**AND** it SHALL identify target visibility and target unit ids when targets are present

#### Scenario: Projection explanation summarizes attack modifiers

**GIVEN** a hex projection contains combat cover, minimum-range, to-hit, or indirect-fire details
**WHEN** the projection explanation is exposed
**THEN** the explanation SHALL include those modifier details without recalculating combat legality in the map renderer

#### Scenario: Movement and terrain explanation remains present

**GIVEN** a hex projection contains terrain and movement data
**WHEN** combat explanation details are added
**THEN** existing terrain, elevation, movement MP, and blocked-reason explanation content SHALL remain present

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

The tactical map interface SHALL expose the current isometric camera heading whenever isometric rotation controls are visible.

#### Scenario: Isometric controls show current heading

**GIVEN** the tactical map is in top-down mode
**WHEN** the player switches to isometric mode
**THEN** the rotation controls SHALL show the current camera heading
**AND** the heading SHALL expose the current rotation step
**AND** the heading SHALL expose the equivalent degree value.

#### Scenario: Heading updates when the camera rotates

**GIVEN** the tactical map is in isometric mode
**WHEN** the player rotates the camera left or right
**THEN** the current heading label SHALL update to the new rotation step and degree value
**AND** the map SHALL preserve render-only rotation without changing axial hex click coordinates.

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

The tactical command preview SHALL use shared combat projection weapon impact metadata for projected weapon attack heat and ammo usage.

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

### Requirement: Combat Projection Damage Envelope

The tactical map interface SHALL expose projected weapon damage envelope metadata from the shared combat projection for attackable weapon targets.

#### Scenario: Combat projection carries listed and expected damage

**GIVEN** a combat projection marks one or more weapons as available against an attackable target hex
**AND** the projection has a to-hit target number for that attack
**WHEN** the combat range hex is derived
**THEN** it SHALL include each available weapon's listed damage
**AND** it SHALL include aggregate listed damage for the available volley
**AND** it SHALL include per-weapon expected damage computed from that weapon's own target number and the 2d6 hit probability
**AND** it SHALL include aggregate expected damage as the sum of those per-weapon expected damage values.

#### Scenario: Mixed target-number volley expected damage

**GIVEN** a selected volley has one weapon at medium range and another weapon at extreme range against the same target hex
**AND** both weapons are available to fire
**WHEN** the combat range hex is derived
**THEN** each weapon option SHALL carry its own target number and expected damage
**AND** the target hex expected damage SHALL NOT multiply aggregate listed damage by the best aggregate target number.

#### Scenario: Combat hover shows projected damage

**GIVEN** a combat projection contains available weapon damage metadata for a target hex
**WHEN** the player hovers that target hex
**THEN** the combat tooltip SHALL show projected listed damage
**AND** it SHALL show expected damage when the projection has a to-hit target number
**AND** it SHALL continue to show heat, ammo, range, LOS, arc, cover, visibility, to-hit, indirect-fire, and blocked-reason rows when present.

#### Scenario: Weapon command preview uses projection expected damage

**GIVEN** a weapon attack command preview receives combat projection data for an attackable target
**AND** the projection contains expected damage
**WHEN** the command preview is built
**THEN** preview expected damage SHALL equal the combat projection expected damage
**AND** blocked attack previews SHALL show zero expected damage.

### Requirement: Isometric Occluder Hex Highlights

The tactical map interface SHALL identify tall isometric terrain that may obscure units behind it.

**Priority**: High

#### Scenario: Occluding terrain exposes hidden-unit metadata

**GIVEN** a unit may be hidden behind elevated terrain in isometric mode
**WHEN** the map derives terrain occlusion information
**THEN** the occluding terrain hex SHALL expose the unit ids it may hide
**AND** the occluding terrain hex SHALL expose the reason for the occlusion
**AND** represented building levels SHALL contribute to the occluder's vertical
height for this readability projection

#### Scenario: Occluding terrain is visually highlighted

**GIVEN** elevated terrain may hide one or more units from the current isometric camera angle
**WHEN** the map is rendered in isometric mode
**THEN** the occluding terrain hex SHALL render an isometric-only highlight
**AND** its elevation stack SHALL indicate that it is the source of occlusion
**AND** the highlight's accessible label SHALL report the effective occluder
height, including represented building levels
**AND** represented building levels SHALL contribute to visible isometric stack
layers even when the base terrain elevation is flat

#### Scenario: Multiple occluding layers remain visible

**GIVEN** more than one elevated terrain hex may hide the same unit from the
current isometric camera angle
**WHEN** the map derives and renders isometric terrain occlusion information
**THEN** every occluding terrain hex SHALL expose the hidden unit id
**AND** every occluding terrain hex SHALL render its isometric occluder
highlight and stack metadata
**AND** the unit token MAY keep one representative occluder reason for compact
foreground readability labeling

#### Scenario: Camera rotation clears stale occluder highlights

**GIVEN** a tall terrain hex only occludes a unit from some camera angles
**WHEN** the isometric camera rotates to an angle where the terrain is no longer in front of the unit
**THEN** the prior occluder hex highlight SHALL be removed

### Requirement: Movement Projection Detail Surface

For each projected movement hex, the map SHALL expose at least movement mode, cumulative MP cost, terrain cost, elevation delta/cost, heat impact where applicable, path/facing preview where applicable, and invalid reason when blocked.

#### Scenario: Hovered reachable path cost preserves movement type

- **GIVEN** a reachable movement destination is hovered during path preview
- **AND** the movement projection has a movement type, motive mode, cumulative MP cost, and heat impact
- **WHEN** the hovered destination cost badge renders
- **THEN** the badge SHALL visibly identify the movement type and motive mode with the cumulative MP cost
- **AND** the badge SHALL expose the movement type, motive mode, hover MP cost, and heat impact as metadata

#### Scenario: Hovered same-hex options preserve the primary projection

- **GIVEN** a movement overlay exposes multiple same-hex options such as walk
  and run
- **AND** the active primary projection is the run option
- **WHEN** the destination is hovered during path preview
- **THEN** the hover cost badge SHALL show the active primary movement type,
  motive mode, and hover MP cost
- **AND** the hover cost badge SHALL NOT replace the active preview label with
  the combined same-hex option summary

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

For each projected combat hex, the map SHALL expose weapon range band, firing
arc, line of sight, valid target state, blocked target state, cover/visibility
implications, available weapons, and invalid reasons from the shared combat
projection.

#### Scenario: Multi-weapon targets show visible weapon availability

- **GIVEN** a target hex has combat projection data for multiple weapons
- **AND** some weapons are available while other weapons are blocked by range,
  arc, environment, or another projected legality reason
- **WHEN** the target hex combat badge is rendered
- **THEN** the map SHALL show a compact visible available/total weapon count
- **AND** the badge metadata SHALL expose available count, total count, blocked
  count, available weapon ids, and blocked weapon reasons from the shared combat
  projection
- **AND** single-weapon target badges SHALL remain uncluttered by the count.

### Requirement: Physical Attack Projection Detail Surface

Physical attack previews SHALL expose whether the selected attack row is legal,
its to-hit value when legal, its damage and self-risk summary, and all
rules-backed restriction reasons when blocked.

#### Scenario: Physical commands consume the selected attack projection

- **GIVEN** the action dock has a physical attack option projection for the
  selected target and attack type
- **AND** that projection marks the selected punch, kick, charge, DFA, or
  melee-weapon attack row as blocked
- **WHEN** the matching physical command renders in the tactical action dock
- **THEN** the matching command SHALL be disabled with the same player-facing
  reason exposed by the physical attack projection
- **AND** other physical commands SHALL remain available when the blocked
  projection belongs to a different attack type.

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
rotation, and occlusion aids inspectable.

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
