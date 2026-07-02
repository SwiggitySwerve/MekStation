# tactical-map-interface (delta)

Delta for `tactical-movement-intent-composer`: the reachable-hex overlay becomes simultaneous affordable-mode envelopes driven by Live Intersection; the hover path preview re-anchors to the last placed waypoint and its click becomes waypoint-add; a new Waypoint Composition Interaction requirement covers waypoint mechanics and per-leg cost chips. The Facing Picker Overlay requirement is intentionally unchanged (final facing picks at the last waypoint).

## MODIFIED Requirements

### Requirement: Reachable Hex Overlay by MP Type

The tactical map interface SHALL render a reachable-hex overlay during the Movement phase for the selected Player-side unit, coloring each tile by the movement type (Walk, Run, Jump) required to reach it using the MegaMek movement palette: Walk cyan, Run yellow, Jump red, and projected illegal/blocked movement dark gray. The overlay SHALL render the envelopes of **all still-affordable Movement Budgets simultaneously** (no player-selected MP type is required) and SHALL recompute against the **remaining** MP of each budget as the composed movement intent consumes it (Live Intersection, per `tactical-movement-intent`). Each overlay state SHALL also carry a non-color encoding so movement legality and movement type remain distinguishable without relying on hue alone.

**Priority**: Critical

#### Scenario: Walk-range tiles rendered cyan

- **GIVEN** a selected unit has 5 walk MP remaining under the composed intent
- **WHEN** the overlay renders
- **THEN** every hex with `mpCost <= 5` via walk SHALL be tinted cyan (`#67e8f9`)
- **AND** each tile SHALL display its MP cost in small text

#### Scenario: Run-range tiles rendered yellow

- **GIVEN** the unit's run budget affords more reach than its walk budget
- **WHEN** the overlay renders
- **THEN** tiles reachable only with run MP SHALL be tinted yellow (`#fef08a`)
- **AND** walk-reachable fallback tiles SHALL retain Walk movement metadata when the Run projection is blocked

#### Scenario: Jump-range tiles rendered red with pattern

- **GIVEN** the unit has an affordable Jump budget
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

#### Scenario: Envelopes shrink as composed intent consumes budget

- **GIVEN** a unit with Walk 4 / Run 6 and an empty composition renders 4-MP walk and 6-MP run envelopes
- **WHEN** the player composes a 2 MP posture action
- **THEN** the overlay SHALL re-render with at most 2-MP walk and 4-MP run envelopes
- **AND** a budget made entirely unaffordable SHALL have no envelope rendered

### Requirement: Path Preview on Hover

The tactical map interface SHALL render a hover-driven path preview using the existing A\* pathfinder, anchored at the **last placed waypoint** of the composed Locomotion Path (or at the selected unit when no waypoint is placed) and ending at the hovered reachable hex.

**Priority**: Critical

#### Scenario: Hover reachable hex draws path

- **GIVEN** a selected unit at {0,0} with no waypoints placed
- **WHEN** the user hovers a reachable hex at {3,0}
- **THEN** every hex along the pathfinder's cheapest path SHALL be highlighted yellow (`#fef9c3`)
- **AND** the hovered hex SHALL display cumulative MP cost including all composed intent

#### Scenario: Hover preview anchors at the last waypoint

- **GIVEN** a composed path with a waypoint at {2,1}
- **WHEN** the user hovers a hex reachable from {2,1}
- **THEN** the preview path SHALL start at {2,1}, not at the unit's position
- **AND** the displayed cumulative MP SHALL include the already-composed legs and posture actions

#### Scenario: Hover unreachable hex shows tooltip

- **GIVEN** a hex not reachable under any remaining affordable budget
- **WHEN** the user hovers it
- **THEN** no path SHALL be drawn
- **AND** a tooltip SHALL display `"Unreachable"`

#### Scenario: Clicking a reachable hex adds a waypoint

- **GIVEN** a hover path is visible
- **WHEN** the user clicks the hovered hex
- **THEN** the hex SHALL be appended to the Locomotion Path as a Waypoint
- **AND** the previewed leg SHALL persist as a composed leg (further hovers anchor at this new waypoint)

## ADDED Requirements

### Requirement: Waypoint Composition Interaction

During movement composition, the map SHALL render the composed Locomotion Path as anchored legs with a distinct marker at every Waypoint, a Pivot Point indicator (with its facing-change MP) wherever travel direction changes at a waypoint, and a per-leg cost chip showing each leg's MP along the path. Clicking the last waypoint marker (or pressing Backspace) SHALL remove the final leg. Waypoint markers, pivot indicators, and cost chips SHALL be non-interactive except for the pop affordance on the last waypoint.

**Priority**: Critical

#### Scenario: Per-leg cost chips render along the path

- **GIVEN** a composed path unit → forest waypoint (4 MP) → destination (2 MP)
- **WHEN** the path renders
- **THEN** a chip reading `4 MP` SHALL render on the first leg and `2 MP` on the second
- **AND** a pivot indicator with its facing-change MP SHALL render at the forest waypoint if travel direction changes there

#### Scenario: Pop affordance is limited to the last waypoint

- **GIVEN** a composed path with waypoints A then B
- **WHEN** the player clicks waypoint A
- **THEN** the composition SHALL NOT change
- **AND** clicking waypoint B SHALL remove the leg A→B
