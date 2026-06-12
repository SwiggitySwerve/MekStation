# tactical-map-interface Delta — add-topdown-tactical-legibility

## MODIFIED Requirements

### Requirement: Top-Down Terrain And Elevation Readability

Top-down tactical map mode SHALL present a clear board-game hex view where terrain type and elevation are easy to reference during movement and combat planning.

Each rendered hex SHALL expose terrain type and elevation. Elevation SHALL be visible as a readable number on or near the hex at playable zoom levels, while terrain visuals and overlays remain distinguishable. The on-hex elevation number SHALL be rendered as a persistent, toggleable badge layer in top-down mode, sourced from the same terrain data the tactical projection consumes.

Replay and recovery surfaces SHALL render terrain and elevation from the same event-log terrain seed used by the game session, so saved matches start with the same battlefield information as live play.

#### Scenario: Terrain and elevation hover context exposes projection provenance

- **GIVEN** a player inspects terrain/elevation context from a terrain-only, unreachable, movement-only, combat-only, or combined tactical hover
- **WHEN** the tooltip renders terrain and elevation rows
- **THEN** those rows SHALL expose stable machine-readable primary terrain, feature-level, and elevation attributes
- **AND** those rows SHALL expose the terrain/elevation projection source references and rule references from the shared tactical projection when available
- **AND** combined movement+combat hovers SHALL use the same terrain/elevation context representation as movement-only and combat-only hovers instead of a separate UI-only terrain calculation
- **AND** adding this metadata SHALL NOT change movement reachability, combat legality, LOS classification, terrain generation, terrain labels, elevation labels, or action resolution

#### Scenario: Persistent elevation badges render on non-zero hexes in top-down mode

- **GIVEN** the tactical map is in top-down mode at a playable zoom level
- **AND** the elevation badge toggle is enabled
- **WHEN** the board renders
- **THEN** every hex with non-zero elevation SHALL display its signed elevation number as an on-hex badge without requiring hover
- **AND** zero-elevation hexes SHALL display no badge
- **AND** the badge value SHALL come from the same hex terrain data the tactical projection consumes

#### Scenario: Elevation badges hide below the readability zoom threshold

- **GIVEN** elevation badges are enabled in top-down mode
- **WHEN** the player zooms out past the zoom level at which badge text would no longer be readable
- **THEN** the badge layer SHALL hide rather than render unreadable text
- **AND** zooming back in past the threshold SHALL restore the badges without re-toggling

#### Scenario: Elevation badge toggle behaves like other overlay toggles

- **GIVEN** the player disables the elevation badge toggle
- **WHEN** the board renders in top-down mode
- **THEN** no elevation badges SHALL render
- **AND** elevation SHALL remain available through hover context
- **AND** the toggle state SHALL persist with the same mechanism as the other overlay toggles
- **AND** isometric mode SHALL keep its own elevation presentation regardless of the toggle

#### Scenario: Badges do not obscure tokens or movement cost text

- **GIVEN** a hex renders an elevation badge together with a unit token and movement overlay MP cost text
- **WHEN** the hex renders at a playable zoom level
- **THEN** the unit token and MP cost text SHALL remain unobstructed
- **AND** the badge SHALL keep a fixed anchor position so the board reads consistently across hexes

### Requirement: Reachable Hex Overlay by MP Type

The tactical map interface SHALL render a reachable-hex overlay during the Movement phase for the selected Player-side unit, coloring each tile by the movement type (Walk, Run, Jump) required to reach it using the MegaMek movement palette: Walk cyan, Run yellow, Jump red, and projected illegal/blocked movement dark gray. Each overlay state SHALL also carry a non-color encoding so movement legality and movement type remain distinguishable without relying on hue alone.

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
