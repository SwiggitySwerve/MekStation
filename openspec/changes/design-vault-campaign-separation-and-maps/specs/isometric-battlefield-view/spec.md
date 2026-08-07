# isometric-battlefield-view Delta

## ADDED Requirements

### Requirement: Isometric projection of the hex battlefield
The system SHALL provide an isometric presentation of ground combat that renders the existing hex tactical model — the same hexes, terrain, elevation, units, and facings — in a fixed-angle isometric projection. The isometric view SHALL be a pure presentation layer: it SHALL consume the same game state as the 2D tactical map and SHALL NOT introduce any view-specific game state, rules, or coordinate system of record (hex coordinates remain authoritative).

#### Scenario: Same state, two views
- **WHEN** a game renders in the isometric view and the 2D tactical map for the same game state
- **THEN** both SHALL display identical unit positions, facings, terrain, and elevations by hex
- **AND** toggling views SHALL cause no game-state change

#### Scenario: Elevation reads visually
- **WHEN** the battlefield contains hexes at different elevation levels
- **THEN** the isometric view SHALL render elevation as stacked tile height
- **AND** a unit's token SHALL sit on its hex's top surface

### Requirement: Interaction parity with the 2D map
Selection, hover, movement-intent, and attack-intent interactions available on the 2D tactical map SHALL be available in the isometric view with equivalent semantics: picking a hex or unit in the isometric view SHALL resolve to the same hex/unit identity the 2D map would produce, and intent overlays (movement range, firing arcs, targeting) SHALL render with the same underlying data.

#### Scenario: Picking resolves to the same hex
- **WHEN** a player clicks the isometric tile for hex H
- **THEN** the selection state SHALL equal the state produced by clicking H on the 2D map

#### Scenario: Overlays carry over
- **WHEN** a unit is selected and its movement range is displayed on the 2D map
- **THEN** switching to the isometric view SHALL display the same reachable hex set as an isometric overlay

### Requirement: View toggle and preference
Players SHALL be able to switch between the 2D tactical map and the isometric view during a game without interrupting play, and the chosen view SHALL persist as a player preference. The 2D map remains available and authoritative for accessibility and fallback; no gameplay flow SHALL require the isometric view.

#### Scenario: Mid-turn toggle
- **WHEN** a player toggles the view during their turn
- **THEN** the current selection and pending intents SHALL be preserved
- **AND** play SHALL continue without reload

### Requirement: Performance floor
The isometric view SHALL sustain interactive frame rates on the reference boards: rendering a 4v4 engagement on standard boards SHALL maintain at least 30 FPS on baseline hardware, and degraded rendering (reduced decoration) SHALL be preferred over dropping below the floor.

#### Scenario: 4v4 stays interactive
- **WHEN** a 4v4 game renders in the isometric view on a standard board
- **THEN** interaction latency and frame rate SHALL remain within the performance floor
