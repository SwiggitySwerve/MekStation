# tactical-map-interface Specification Delta

## ADDED Requirements

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
