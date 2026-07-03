# tactical-movement-intent Specification

## Purpose
Specify the intent-first Movement phase flow on the tactical HUD: the player composes the turn as intent items (posture actions plus at most one waypointed locomotion path) on a single authoritative surface, sees rules-derived MP/heat costs and budget affordability live, and commits the whole sequence atomically with an explicit Lock-In. Movement rules (`movement-system`) are consumed verbatim - this capability owns the composition UX, not the math.
## Requirements
### Requirement: Movement Intent Composition

During the Movement phase, the tactical HUD SHALL provide a Movement Intent Composer for the active player-side unit in which the player composes the turn as Intent Items — zero or more Posture Actions plus at most one Locomotion Path — before any movement mode is selected. Every Intent Item SHALL carry an MP cost derived from `movement-system` requirements (no UI-local cost formulas).

#### Scenario: Composing posture and locomotion before any mode choice

- **GIVEN** a prone unit with Walk 4 / Run 6 budgets is active in the Movement phase
- **WHEN** the player adds a Stand Up posture action and then places a waypoint 3 hexes away
- **THEN** both Intent Items SHALL appear in the composition with their MP costs
- **AND** no movement mode SHALL be selected or required at this point

#### Scenario: Costs come from movement-system rules

- **WHEN** any Intent Item is added to the composition
- **THEN** its MP cost SHALL equal the cost defined by `movement-system` (posture costs, terrain-adjusted hex entry costs, facing-change costs)

### Requirement: Posture Action Palette

The composer SHALL present a palette of the Posture Actions legal for the unit's current state (Stand Up, Careful Stand, Go Prone, Hull Down, Evade where legal), each labeled with its MP cost. Palette items that Live Intersection marks unaffordable SHALL be disabled with a non-color-only disabled encoding.

#### Scenario: Illegal and unaffordable posture actions are gated

- **GIVEN** a standing unit whose composed intent already consumes all but 1 MP of its best budget
- **WHEN** the palette renders
- **THEN** posture actions illegal for a standing unit (Stand Up, Careful Stand) SHALL NOT be offered
- **AND** legal actions costing more than 1 MP SHALL render disabled with both a dimmed style and a disabled glyph or text

### Requirement: Waypointed Locomotion Path

The Locomotion Path SHALL be an ordered sequence of player-placed Waypoints. The system SHALL auto-route the cheapest legal path between consecutive anchors (unit position → waypoint 1 → … → final waypoint) using the existing pathfinder, accruing terrain-adjusted MP per hex entered and facing-change MP at each Pivot Point where travel direction changes. Removing the most recent waypoint SHALL restore the prior composition state exactly.

#### Scenario: Single click is the fast default

- **WHEN** the player clicks a reachable destination hex with no prior waypoints
- **THEN** the system SHALL route the cheapest path from the unit to that hex as one leg

#### Scenario: Intermediate waypoint forces a strategic route

- **GIVEN** a destination reachable via a cheap open-ground route and a costlier wooded route
- **WHEN** the player clicks a wooded hex first and then the destination
- **THEN** the path SHALL route unit → wooded waypoint → destination
- **AND** the Cost Ledger SHALL reflect the costlier wooded legs, not the cheapest direct route

#### Scenario: Popping the last waypoint

- **GIVEN** a composed path with two waypoints
- **WHEN** the player clicks the last waypoint (or presses Backspace)
- **THEN** the final leg SHALL be removed
- **AND** the ledger total, envelopes, and palette gating SHALL recompute to the one-waypoint state

### Requirement: Cost Ledger

The composer SHALL display a Cost Ledger listing every composed Intent Item with its MP cost and a running total, evaluated against each candidate Movement Budget (Walk/Run/Jump MP as modified by damage and heat). The ledger SHALL update on every composition edit.

#### Scenario: Ledger totals against damaged budgets

- **GIVEN** a unit with 2 engine criticals reducing budgets to Walk 2 / Run 3
- **WHEN** the player composes Careful Stand (2 MP)
- **THEN** the ledger SHALL show total 2 MP with Walk marked affordable-exhausted (0 MP remaining) and Run marked affordable (1 MP remaining)

### Requirement: Live Intersection

On every composition edit, the system SHALL recompute the set of Movement Budgets that afford the composed total and SHALL block unaffordable additions at the source: map hexes no remaining budget can reach SHALL NOT be placeable as waypoints, and palette items whose cost exceeds every remaining budget SHALL be disabled. It SHALL NOT be possible to compose an intent that no budget affords through composer interactions.

#### Scenario: Reach shrinks as posture consumes budget

- **GIVEN** a unit with Walk 4 / Run 6 and an empty composition
- **WHEN** the player adds a 2 MP posture action
- **THEN** the placeable-hex set SHALL recompute to at most 2 MP of walk reach and 4 MP of run reach

#### Scenario: World change mid-composition is the only recompose path

- **GIVEN** a composed intent affordable under Run
- **WHEN** an external state change (e.g. heat gain) reduces the Run budget below the composed total
- **THEN** the newly unaffordable ledger rows SHALL be flagged
- **AND** Lock-In SHALL be blocked until the player removes items to fit an affordable budget

### Requirement: Budget Resolver and Explicit Lock-In

After composition, the resolver SHALL present every Movement Budget that affords the composed intent, each with its consequences (heat generated per `movement-system`, attacker to-hit modifier). The resolver SHALL NOT auto-select any mode, including the cheapest, and SHALL NOT commit without an explicit player Lock-In. When exactly one budget affords the intent, the resolver SHALL present it as Forced Mode — a single option that still requires the explicit Lock-In. Lock-In SHALL commit the entire composed sequence atomically into the existing movement declaration path.

#### Scenario: Multiple affordable modes require an explicit choice

- **GIVEN** a composed intent of 3 MP for a unit with Walk 4 / Run 6
- **WHEN** the resolver renders
- **THEN** Walk and Run SHALL both be offered with their heat and attacker to-hit consequences
- **AND** no mode SHALL be pre-committed (a TSM-equipped unit MAY deliberately choose Run for the heat)

#### Scenario: Forced Mode is still explicit

- **GIVEN** a composed intent only Run can afford
- **WHEN** the resolver renders
- **THEN** Run SHALL be presented as the single Forced Mode option
- **AND** the sequence SHALL NOT commit until the player activates Lock-In

#### Scenario: Lock-In commits the whole sequence

- **WHEN** the player activates Lock-In
- **THEN** the posture actions, path legs, pivot facing changes, and final facing SHALL enter the movement declaration path as one atomic declaration
- **AND** the composition SHALL reset for the next activation

### Requirement: Single Movement Authority

The Movement Intent Composer SHALL be the sole surface for movement composition and mode selection on the tactical HUD. The action dock SHALL NOT render movement-mode selector buttons, and the map SHALL NOT render a second interactive mode selector; the dock retains facing, phase, and utility commands and hosts the composer's posture palette.

#### Scenario: No competing movement selector exists

- **WHEN** the Movement phase HUD renders for the active unit
- **THEN** exactly one movement composition surface (the composer) SHALL be interactive
- **AND** any map-rendered mode/cost readout SHALL be non-interactive

