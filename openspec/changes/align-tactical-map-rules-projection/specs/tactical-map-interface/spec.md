# Spec Delta: Tactical Map Interface - Rules Projection Alignment

## ADDED Requirements

### Requirement: Rules-Backed Tactical Projection Contract

The tactical map interface SHALL render movement, combat, terrain/elevation, fog, LOS, cover, and firing-arc highlights from shared rules projections rather than from view-local legality calculations.

Every projection that affects action legality SHALL identify the rule source it is pinned to, using this source order: official BattleTech rules where citable, MegaMek tactical behavior as practical oracle for tactical ambiguity, MekHQ only for campaign/scenario context, then local OpenSpec/Jest fixtures as the project acceptance contract.

#### Scenario: Highlight legality matches commit legality

- **GIVEN** a selected unit, current tactical grid, current phase, and a highlighted destination or target
- **WHEN** the player commits that highlighted action without changing state
- **THEN** engine validation SHALL accept the action
- **AND** if validation rejects the action, the preview SHALL have already exposed the same rejection reason before commit

#### Scenario: UI-local legality is prohibited

- **GIVEN** a map component renders a movement or combat highlight
- **WHEN** the highlight determines whether a hex is legal, costly, or blocked
- **THEN** that determination SHALL come from a shared rules/projection utility
- **AND** the component SHALL NOT duplicate movement cost, weapon range, firing arc, LOS, fog targetability, or elevation legality rules inline

### Requirement: Movement Projection Explanation

Movement highlights SHALL expose the BattleTech movement facts required to understand walk, run, jump, and unit-type-specific movement legality.

For each projected movement hex, the map SHALL expose at least movement mode, cumulative MP cost, terrain cost, elevation delta/cost, heat impact where applicable, path/facing preview where applicable, and invalid reason when blocked.

#### Scenario: Walk/run/jump ranges explain costs

- **GIVEN** a unit is selected during the Movement phase
- **WHEN** walk, run, or jump range highlights render
- **THEN** each reachable hex SHALL display or expose its cumulative MP cost
- **AND** each reachable hex SHALL expose the movement mode by which it is reachable
- **AND** each reachable hex SHALL expose terrain and elevation contributors to that cost

#### Scenario: Blocked movement explains reason

- **GIVEN** a destination is blocked by terrain, elevation, unit type, heat-reduced MP, prone state, or jump landing restrictions
- **WHEN** the player hovers or attempts to preview that hex
- **THEN** the map SHALL avoid presenting it as a legal destination
- **AND** the UI SHALL expose the specific invalid reason from movement validation

### Requirement: Combat Projection Explanation

Combat highlights SHALL expose weapon-backed attack legality, range, firing arc, LOS, cover, visibility, heat, ammo, and disabled reasons.

When a selected unit has a configured weapon list, the map SHALL derive attack-range highlighting from the weapon-backed combat projection. Legacy raw `attackRange` props MAY be used only when no configured weapon list exists.

#### Scenario: Weapon-backed range overrides legacy attackRange

- **GIVEN** a selected unit has configured weapons
- **AND** the view receives a stale raw `attackRange` prop
- **WHEN** attack range highlighting renders
- **THEN** highlighted attack hexes SHALL come from the weapon-backed combat projection
- **AND** stale raw `attackRange` data SHALL NOT mark additional targets as valid

#### Scenario: Selected weapon constrains visible firing arcs

- **GIVEN** the selected unit has operational weapons with known mounted arcs
- **WHEN** the player selects or previews a weapon attack
- **THEN** firing-arc shading SHALL render only arcs compatible with those operational mounted weapons
- **AND** rear-mounted weapons SHALL not shade front arcs as if they were front-mounted

#### Scenario: Unknown or all-arc weapons keep broad overlay

- **GIVEN** at least one operational selected weapon has all-arc, turret, or unknown mounting semantics
- **WHEN** firing-arc shading renders
- **THEN** the overlay SHALL avoid claiming a narrower arc than the rules projection can justify
- **AND** target validation SHALL remain the authority for final legality

### Requirement: Fog-Aware Target Projection

Fog targetability in the tactical map SHALL consume the same grid, LOS, and visibility inputs as combat validation.

Hidden or last-known enemy contacts MAY render as intelligence markers, but they SHALL NOT remain selected as active valid attack targets unless the combat projection says the current viewer can legally target them.

#### Scenario: Blocked LOS clears valid target state

- **GIVEN** fog-of-war is enabled
- **AND** a previously visible enemy becomes hidden or last-known because LOS is blocked on the current combat grid
- **WHEN** the map recomputes target projection
- **THEN** the enemy token SHALL NOT be marked as a valid active target
- **AND** any active target state for that unit SHALL clear or become invalid with an explanatory reason

#### Scenario: Clear LOS restores targetability

- **GIVEN** fog-of-war is enabled
- **AND** an enemy unit has clear LOS from the current viewer on the current combat grid
- **WHEN** the map recomputes target projection during a legal attack phase
- **THEN** the enemy token MAY be marked targetable according to combat projection
- **AND** the same grid SHALL be used by visibility, LOS display, and attack validation

### Requirement: Top-Down Terrain And Elevation Readability

Top-down tactical map mode SHALL present a clear board-game hex view where terrain type and elevation are easy to reference during movement and combat planning.

Each rendered hex SHALL expose terrain type and elevation. Elevation SHALL be visible as a readable number on or near the hex at playable zoom levels, while terrain visuals and overlays remain distinguishable.

#### Scenario: Terrain and elevation visible in top-down mode

- **GIVEN** a top-down tactical map with mixed terrain and elevations
- **WHEN** the map renders at normal playable zoom
- **THEN** each visible hex SHALL communicate its terrain type
- **AND** each visible hex SHALL show or expose its elevation number
- **AND** movement/combat overlays SHALL NOT obscure all elevation information needed for tactical decisions

### Requirement: Isometric Projection Parity And Occlusion Tools

Isometric mode SHALL be presentation state only and SHALL consume the same terrain, elevation, movement, combat, LOS, fog, cover, and firing-arc projection data as top-down mode.

Isometric mode SHALL make stacked elevation layers readable, support battlefield rotation, and provide interaction aids for units obscured by high terrain or tall stacks.

#### Scenario: Isometric uses same rules projection as top-down

- **GIVEN** the same tactical state is rendered in top-down and isometric modes
- **WHEN** movement and combat projections are computed
- **THEN** both modes SHALL expose the same legal destinations, targets, costs, range bands, LOS results, cover states, and firing arcs
- **AND** no legality SHALL be derived from isometric screen coordinates

#### Scenario: Isometric rotation preserves selection

- **GIVEN** the map is in isometric mode
- **AND** a unit or hex is selected
- **WHEN** the player rotates the camera around the battlefield
- **THEN** the selected axial coordinate SHALL remain selected
- **AND** movement/combat highlights SHALL rotate visually without changing rules meaning

#### Scenario: Obscured units remain inspectable

- **GIVEN** a unit is behind or below a large elevation stack in isometric mode
- **WHEN** the player hovers, cycles, slices layers, rotates, or uses another occlusion aid
- **THEN** the hidden unit SHALL be highlightable and selectable if visibility rules allow it
- **AND** the map SHALL communicate when fog or visibility rules, rather than terrain occlusion, prevent inspection
