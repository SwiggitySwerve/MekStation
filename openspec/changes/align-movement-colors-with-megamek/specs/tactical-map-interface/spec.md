# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

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
