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
- **AND** the badge SHALL expose terrain feature level/depth/intensity metadata for each represented terrain feature
- **WHEN** a hex elevation badge renders
- **THEN** the badge SHALL expose the active projection mode
- **AND** the badge SHALL expose the raw elevation value and whether it is positive, negative, or zero

#### Scenario: Layered terrain labels expose feature levels

- **GIVEN** a top-down or isometric tactical map hex contains layered terrain such as depth-2 water, level-2 smoke, and a level-3 building
- **WHEN** the hex and terrain badge render
- **THEN** the hex reference label SHALL include each terrain feature's level/depth/intensity
- **AND** the terrain badge SHALL expose stable feature-level metadata for the same ordered terrain features
- **AND** the compact terrain badge SHALL preserve a visible level/depth/intensity suffix when a represented feature level is greater than 1
