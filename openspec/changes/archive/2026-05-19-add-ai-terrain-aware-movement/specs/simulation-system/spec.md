## ADDED Requirements

### Requirement: Shared Terrain Movement-Cost Utility

The system SHALL expose `getTerrainMovementCost` and `getPrimaryTerrainFeature` from a shared simulation-accessible utility module (`src/utils/gameplay/terrainMovementCost.ts`). The simulation layer (`src/simulation/`) SHALL consult terrain movement cost only through this utility and SHALL NOT import from the rendering layer (`src/components/`). The rendering module SHALL re-export both functions so existing rendering call sites are unchanged.

#### Scenario: Open ground costs one movement point

- **GIVEN** a hex with no terrain features
- **WHEN** `getTerrainMovementCost` is evaluated for that hex
- **THEN** it SHALL return `1`

#### Scenario: Heavy terrain costs more than open ground

- **GIVEN** a hex containing a heavy-woods terrain feature
- **WHEN** `getTerrainMovementCost` is evaluated for that hex
- **THEN** it SHALL return a value greater than `1`

#### Scenario: Simulation layer does not import rendering code

- **GIVEN** the AI pathfinder and move scorer
- **WHEN** their module imports are resolved
- **THEN** no import SHALL resolve into `src/components/`
- **AND** terrain cost SHALL be sourced from `src/utils/gameplay/terrainMovementCost.ts`

### Requirement: AI Difficulty Tier Registry

The system SHALL provide an AI Difficulty Tier Registry mapping each tier name — `Green`, `Regular`, `Veteran`, `Elite` — to a frozen `IAITierParameters` record. The registry SHALL expose `getTierParameters(name)` which returns the parameter record for a known tier and throws an explicit error for an unknown name. `IBotBehavior` SHALL carry an optional `tier` field defaulting to `Regular`. The tier is player-selectable per scenario. `IAITierParameters` SHALL be additively extensible: later AI changes register their own parameter blocks without modifying the movement block defined here.

The movement parameter block SHALL carry `pathfinderEnabled`, `coverWeight`, `losDenialWeight`, and `terrainCostWeight`. The `Green` and `Regular` tiers SHALL set `pathfinderEnabled` to `false` with zeroed scoring weights so they reproduce the pre-change move scorer exactly. The `Veteran` and `Elite` tiers SHALL set `pathfinderEnabled` to `true`.

#### Scenario: Every tier resolves to a parameter record

- **GIVEN** the tier names `Green`, `Regular`, `Veteran`, and `Elite`
- **WHEN** `getTierParameters` is called for each
- **THEN** each call SHALL return an `IAITierParameters` record with a populated movement block

#### Scenario: Unknown tier name throws

- **GIVEN** a tier name that is not in the registry
- **WHEN** `getTierParameters` is called with that name
- **THEN** an error SHALL be thrown naming the invalid tier and listing the valid tiers

#### Scenario: Default tier is Regular

- **GIVEN** an `IBotBehavior` constructed without an explicit `tier`
- **WHEN** the bot resolves its tier parameters
- **THEN** the `Regular` tier SHALL be used

#### Scenario: Lower tiers reproduce the legacy scorer

- **GIVEN** a bot configured with the `Green` or `Regular` tier
- **WHEN** it scores a candidate move
- **THEN** the score SHALL be identical to the pre-change `scoreMove` output for the same inputs

### Requirement: AI Terrain-Cost Pathfinder

The system SHALL provide `AITerrainPathfinder` exposing `findPath(request)` and `findAllPaths(grid, origin, movementType, capability)` per the frozen API contract. `findPath` SHALL return an `IAIPath` carrying the destination, the ordered hex sequence from origin to destination, the total movement-point cost, and a `reachable` flag. Path cost SHALL be the sum of per-hex `getTerrainMovementCost`. The search SHALL be deterministic — an identical request SHALL always produce an identical `IAIPath` — using canonical hex-neighbor order to break ties between equal-cost paths, without consuming `SeededRandom`.

When a destination exceeds the movement-point budget, `findPath` SHALL return `reachable: false` with a best-effort partial path. `findAllPaths` SHALL return the cheapest path to every reachable destination keyed by the canonical `"q,r"` hex string.

#### Scenario: Pathfinder routes around costly terrain

- **GIVEN** an origin and a destination where the straight-line path crosses heavy woods and an alternate path of equal hex length crosses only open ground
- **WHEN** `findPath` runs
- **THEN** the returned path SHALL be the open-ground route
- **AND** its `totalMpCost` SHALL be lower than the straight-line route's cost

#### Scenario: Pathfinding is deterministic

- **GIVEN** two identical `IAIPathfindRequest` values
- **WHEN** `findPath` is called for each
- **THEN** both SHALL return identical hex sequences and identical `totalMpCost`

#### Scenario: Unreachable destination is flagged

- **GIVEN** a destination whose cheapest path cost exceeds the unit's movement-point budget
- **WHEN** `findPath` runs
- **THEN** the returned `IAIPath` SHALL have `reachable` set to `false`

#### Scenario: findAllPaths agrees with per-destination findPath

- **GIVEN** an origin, movement type, and capability
- **WHEN** `findAllPaths` returns its path map and `findPath` is called separately for one of those destinations
- **THEN** the path for that destination SHALL be identical in both results

### Requirement: Terrain-Aware Move Scoring

When the active tier sets `pathfinderEnabled` to `true`, `MoveAI` SHALL extend move scoring with three additive terms, each multiplied by its tier weight: a cover term granting `coverWeight` when the destination hex offers partial cover or better, a line-of-sight-denial term granting `losDenialWeight` when the destination breaks the highest-threat enemy's line of sight, and a terrain-cost term subtracting `terrainCostWeight` scaled by the difference between the path's movement-point cost and the straight-line hex distance. The existing line-of-sight, firing-arc, closing-distance, and heat terms SHALL be unchanged. When `pathfinderEnabled` is `false`, none of the three new terms SHALL apply.

#### Scenario: Veteran bot seeks cover

- **GIVEN** a `Veteran` bot choosing between a partial-cover hex and an open hex with otherwise equal scoring inputs
- **WHEN** move scoring runs
- **THEN** the partial-cover hex SHALL score higher
- **AND** the bot SHALL move to the partial-cover hex

#### Scenario: Veteran bot breaks enemy line of sight

- **GIVEN** a `Veteran` bot with two candidate destinations of equal path cost — one keeps it visible to the highest-threat enemy, one breaks that enemy's line of sight
- **WHEN** move scoring runs
- **THEN** the line-of-sight-breaking destination SHALL score higher

#### Scenario: Wasteful path scores below an efficient path

- **GIVEN** two destinations of equal tactical value, one reached by a path whose movement-point cost exceeds its hex distance and one reached by a path whose cost equals its hex distance
- **WHEN** move scoring runs on a `Veteran` bot
- **THEN** the efficiently-reached destination SHALL score higher

#### Scenario: Regular bot ignores the new terms

- **GIVEN** a `Regular` bot scoring the same candidate moves
- **WHEN** move scoring runs
- **THEN** the cover, line-of-sight-denial, and terrain-cost terms SHALL contribute zero
- **AND** the chosen move SHALL match the pre-change scorer's choice
