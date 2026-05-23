# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Top-Down Terrain And Elevation Readability

Top-down tactical map mode SHALL present a clear board-game hex view where terrain type and elevation are easy to reference during movement and combat planning.

Each rendered hex SHALL expose terrain type and elevation. Elevation SHALL be visible as a readable number on or near the hex at playable zoom levels, while terrain visuals and overlays remain distinguishable.

#### Scenario: Terrain and elevation badges expose reference metadata

- **GIVEN** a top-down or isometric tactical map with terrain and elevation labels
- **WHEN** a hex terrain badge renders
- **THEN** the badge SHALL expose the active projection mode
- **AND** the badge SHALL expose the number of terrain features represented by the visible terrain abbreviation
- **WHEN** a hex elevation badge renders
- **THEN** the badge SHALL expose the active projection mode
- **AND** the badge SHALL expose the raw elevation value and whether it is positive, negative, or zero
