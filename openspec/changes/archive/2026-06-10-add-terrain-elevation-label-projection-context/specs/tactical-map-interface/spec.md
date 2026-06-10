# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Top-Down Terrain And Elevation Readability

Top-down tactical map mode SHALL present a clear board-game hex view where
terrain type and elevation are easy to reference during movement and combat
planning.

Each rendered hex SHALL expose terrain type and elevation. Elevation SHALL be
visible as a readable number on or near the hex at playable zoom levels, while
terrain visuals and overlays remain distinguishable.

Replay and recovery surfaces SHALL render terrain and elevation from the same
event-log terrain seed used by the game session, so saved matches start with
the same battlefield information as live play.

#### Scenario: Terrain and elevation labels expose projection context

- **GIVEN** a top-down or isometric tactical map renders terrain and elevation labels
- **WHEN** a user, accessibility surface, or browser test inspects either label
- **THEN** the label SHALL expose the shared tactical projection source
- **AND** the label SHALL expose the `terrain-elevation` projection channel
- **AND** the label SHALL expose the `terrain-elevation` rules surface
- **AND** the label SHALL expose the current per-hex projection intent and status
- **AND** the terrain-elevation source reference SHALL preserve represented terrain feature levels, water depths, smoke/fire intensities, and elevation instead of collapsing them to type-only labels
