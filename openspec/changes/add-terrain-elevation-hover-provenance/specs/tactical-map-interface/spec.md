# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Top-Down Terrain And Elevation Readability

Top-down tactical map mode SHALL present a clear board-game hex view where terrain type and elevation are easy to reference during movement and combat planning.

Each rendered hex SHALL expose terrain type and elevation. Elevation SHALL be visible as a readable number on or near the hex at playable zoom levels, while terrain visuals and overlays remain distinguishable.

Replay and recovery surfaces SHALL render terrain and elevation from the same event-log terrain seed used by the game session, so saved matches start with the same battlefield information as live play.

#### Scenario: Terrain and elevation hover context exposes projection provenance

- **GIVEN** a player inspects terrain/elevation context from a terrain-only, unreachable, movement-only, combat-only, or combined tactical hover
- **WHEN** the tooltip renders terrain and elevation rows
- **THEN** those rows SHALL expose stable machine-readable primary terrain, feature-level, and elevation attributes
- **AND** those rows SHALL expose the terrain/elevation projection source references and rule references from the shared tactical projection when available
- **AND** combined movement+combat hovers SHALL use the same terrain/elevation context representation as movement-only and combat-only hovers instead of a separate UI-only terrain calculation
- **AND** adding this metadata SHALL NOT change movement reachability, combat legality, LOS classification, terrain generation, terrain labels, elevation labels, or action resolution
