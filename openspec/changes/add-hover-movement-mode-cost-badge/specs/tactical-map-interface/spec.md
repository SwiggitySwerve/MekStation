# Spec Delta: Tactical Map Interface

## ADDED Requirements

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
