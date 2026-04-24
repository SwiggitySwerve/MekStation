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

**Priority**: High

#### Scenario: Clear terrain rendering

**GIVEN** a hex with terrain type Clear
**WHEN** rendering the hex
**THEN** fill color SHALL be light gray (#e2e8f0)
**AND** stroke SHALL be grid line color (#cbd5e1)

#### Scenario: Light woods rendering

**GIVEN** a hex with terrain type LightWoods
**WHEN** rendering the hex
**THEN** fill color SHALL be light green (#bbf7d0)
**AND** a woods pattern indicator SHALL be displayed

#### Scenario: Heavy woods rendering

**GIVEN** a hex with terrain type HeavyWoods
**WHEN** rendering the hex
**THEN** fill color SHALL be dark green (#86efac)
**AND** a dense woods pattern indicator SHALL be displayed

#### Scenario: Water depth rendering

**GIVEN** a hex with terrain type Water at depth 1
**WHEN** rendering the hex
**THEN** fill color SHALL be light blue (#bfdbfe)
**WHEN** depth is 2
**THEN** fill color SHALL be medium blue (#93c5fd)
**WHEN** depth is 3+
**THEN** fill color SHALL be dark blue (#60a5fa)

#### Scenario: Building rendering

**GIVEN** a hex with terrain type Building at level 2
**WHEN** rendering the hex
**THEN** fill color SHALL be gray (#94a3b8)
**AND** building height indicator SHALL be displayed
**AND** construction factor (CF) SHALL be shown if available

---

### Requirement: Effect Overlays

The system SHALL provide toggleable overlays showing calculated terrain effects.

**Priority**: High

#### Scenario: Movement cost overlay

**GIVEN** a unit is selected with movement type Walk
**WHEN** the movement cost overlay is enabled
**THEN** each hex SHALL display its movement cost in MP
**AND** hexes SHALL be color-coded (green=1MP, yellow=2-3MP, red=4+MP)
**AND** impassable hexes SHALL be marked with an X

#### Scenario: Cover level overlay

**GIVEN** the cover overlay is enabled
**WHEN** rendering the map
**THEN** hexes with no cover SHALL show no indicator
**AND** hexes with partial cover SHALL show a half-shield icon
**AND** hexes with full cover SHALL show a full-shield icon

#### Scenario: Heat effect overlay

**GIVEN** the heat overlay is enabled
**WHEN** rendering the map
**THEN** hexes with cooling effects SHALL have blue tint
**AND** hexes with heating effects SHALL have red tint
**AND** heat modifier value SHALL be displayed (+5, -2, etc.)

#### Scenario: Line of sight overlay

**GIVEN** a unit is selected at hex {q: 0, r: 0}
**WHEN** the LOS overlay is enabled
**THEN** raycasts SHALL be drawn from the selected hex to all visible hexes
**AND** blocked LOS SHALL be shown in red
**AND** clear LOS SHALL be shown in green

#### Scenario: Elevation overlay

**GIVEN** the elevation overlay is enabled
**WHEN** rendering the map
**THEN** hexes SHALL be shaded by elevation level
**AND** contour lines SHALL be drawn between elevation changes
**AND** elevation value SHALL be displayed on each hex

#### Scenario: Multiple overlays stacking

**GIVEN** movement cost and cover overlays are both enabled
**WHEN** rendering a hex
**THEN** both movement cost numbers AND cover icons SHALL be visible
**AND** visual elements SHALL NOT overlap
**AND** overlay priority SHALL be: terrain < movement < cover < LOS

---

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

The tactical map interface SHALL render a reachable-hex overlay during the
Movement phase for the selected Player-side unit, coloring each tile by the
movement type (Walk, Run, Jump) required to reach it.

**Priority**: Critical

#### Scenario: Walk-range tiles rendered green

- **GIVEN** a selected unit has 5 walk MP and the player selects MP type
  Walk
- **WHEN** the overlay renders
- **THEN** every hex with `mpCost <= 5` via walk SHALL be tinted green
  (`#bbf7d0`)
- **AND** each tile SHALL display its MP cost in small text

#### Scenario: Run-range tiles rendered yellow

- **GIVEN** the player selects MP type Run
- **WHEN** the overlay renders
- **THEN** tiles reachable only with run MP SHALL be tinted yellow
  (`#fef08a`)
- **AND** walk-reachable tiles SHALL retain their green tint under the
  run set

#### Scenario: Jump-range tiles rendered blue with pattern

- **GIVEN** the player selects MP type Jump
- **WHEN** the overlay renders
- **THEN** landing hexes reachable with jump SHALL be tinted blue
  (`#bfdbfe`) with a distinct diagonal pattern
- **AND** tiles unreachable by any MP type SHALL have no overlay tint

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
