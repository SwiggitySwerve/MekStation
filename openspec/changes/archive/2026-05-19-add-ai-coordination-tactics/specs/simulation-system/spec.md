## ADDED Requirements

### Requirement: Coordination Tier Parameters

The AI Difficulty Tier Registry SHALL carry a coordination parameter block on each tier, exposing `lanceCoordination`, `cohesionRadius`, `cohesionWeight`, and `focusFireWeight`. The `Green`, `Regular`, and `Veteran` tiers SHALL set `lanceCoordination` to `false` with zeroed weights, leaving all coordination behavior inert so the `Veteran` tier remains exactly the depth of the movement and resource blocks. The `Elite` tier SHALL populate the block with active values. This block SHALL be registered additively and SHALL NOT modify the movement or resource parameter blocks.

#### Scenario: Every tier resolves a coordination block

- **GIVEN** the tier names `Green`, `Regular`, `Veteran`, and `Elite`
- **WHEN** the coordination parameter block is read for each
- **THEN** each SHALL return a populated `IAITierCoordinationParameters` record

#### Scenario: Veteran tier excludes coordination

- **GIVEN** a bot configured with the `Veteran` tier
- **WHEN** it plans a turn
- **THEN** the lance planner SHALL NOT be consulted
- **AND** target selection and movement SHALL match the per-unit behavior of the movement and resource tiers

### Requirement: Multi-Unit Threat Aggregation

When `lanceCoordination` is enabled, the system SHALL provide `AIThreatMap.buildThreatMap` that aggregates each enemy's threat across every friendly lance unit into a single ranked list of `IThreatEntry` records. Each entry SHALL carry the enemy identifier, the summed threat the enemy poses across the lance, and the friendly units that can engage that enemy this turn. The aggregation SHALL be a pure deterministic function, independent of the order of the input unit lists.

#### Scenario: Higher aggregate threat ranks first

- **GIVEN** two enemies, one posing a large summed threat across the lance and one posing a small threat
- **WHEN** `buildThreatMap` runs
- **THEN** the high-threat enemy SHALL rank above the low-threat enemy

#### Scenario: Aggregation is order-independent

- **GIVEN** the same friendly and enemy unit sets supplied in two different orders
- **WHEN** `buildThreatMap` runs for each
- **THEN** both threat maps SHALL be identical

#### Scenario: Engageable list excludes out-of-range units

- **GIVEN** an enemy that one friendly unit can reach this turn and another cannot
- **WHEN** `buildThreatMap` runs
- **THEN** the enemy's `engageableBy` list SHALL contain only the friendly unit that can reach it

### Requirement: Focus-Fire Coordination

When `lanceCoordination` is enabled, the system SHALL provide `AIFireCoordinator` that produces an `IFireAssignment` mapping friendly units to targets. The coordinator SHALL prefer assignments whose combined expected damage finishes a target this turn, concentrating fire rather than spreading it. When a target is finishable by fewer units than assigned, the surplus firepower SHALL be released to the next-ranked threat. When no target is finishable, the lance SHALL concentrate on the highest-aggregate-threat target the most units can engage. `playAttackPhase` SHALL bias each unit's target selection toward its assigned target, falling back to the unit's own threat-scored pick when the assigned target is out of arc or range.

#### Scenario: Lance concentrates fire to finish a target

- **GIVEN** a target that one friendly unit cannot destroy alone but two can together
- **WHEN** fire coordination runs on an `Elite` lance
- **THEN** both units SHALL be assigned to that target
- **AND** the target SHALL appear in `finishableTargets`

#### Scenario: Surplus firepower is released

- **GIVEN** a target already finishable by two units and a third unit that could also engage it
- **WHEN** fire coordination runs
- **THEN** the third unit SHALL be assigned to the next-ranked threat rather than the already-finishable target

#### Scenario: Unreachable assignment falls back to the unit's own pick

- **GIVEN** a unit assigned a target that is out of its weapons' arc and range
- **WHEN** `playAttackPhase` runs
- **THEN** the unit SHALL fall back to its own threat-scored target selection
- **AND** no error SHALL be raised

### Requirement: Formation Cohesion Movement

When `lanceCoordination` is enabled, `MoveAI` SHALL extend move scoring with a cohesion term, multiplied by `cohesionWeight`, that penalizes a destination lying beyond `cohesionRadius` from the lance centroid and applies an additional penalty when the destination enters enemy line of sight while no lancemate is within `cohesionRadius`. A unit whose destination is inside the cohesion radius SHALL pay no cohesion penalty. The cohesion term SHALL be additive over the terrain-aware scoring terms. When `lanceCoordination` is disabled, the cohesion term SHALL contribute zero.

#### Scenario: Drifting unit is pulled back toward the lance

- **GIVEN** an `Elite` bot choosing between a destination inside `cohesionRadius` of the lance centroid and one beyond it, with otherwise equal scoring
- **WHEN** move scoring runs
- **THEN** the in-radius destination SHALL score higher

#### Scenario: Advancing alone into enemy line of sight is penalized

- **GIVEN** a destination that enters enemy line of sight with no lancemate within `cohesionRadius`
- **WHEN** move scoring runs on an `Elite` bot
- **THEN** that destination SHALL receive the additional lone-advance penalty

#### Scenario: In-formation unit is unaffected

- **GIVEN** a unit whose destination is inside `cohesionRadius` of the lance centroid
- **WHEN** move scoring runs
- **THEN** the cohesion term SHALL contribute zero to its score

### Requirement: Per-Lance Turn Plan

When `lanceCoordination` is enabled, the system SHALL provide `AILancePlanner.planTurn` that runs once per side per turn and returns an immutable `ILanceTurnPlan` carrying the aggregated threat map, the fire assignment, and the lance centroid. Each unit's movement and attack decisions SHALL consume this plan. `BotPlayer` SHALL accept an optional lance-context parameter; when it is omitted, the bot SHALL fall back to per-unit decisions identical to the pre-change behavior. The lance plan SHALL be a pure deterministic function of the unit set and SHALL NOT consume `SeededRandom`.

#### Scenario: One plan drives every unit in the lance

- **GIVEN** an `Elite` lance of four units beginning a turn
- **WHEN** `planTurn` runs
- **THEN** a single `ILanceTurnPlan` SHALL be produced
- **AND** all four units' move and attack decisions SHALL read from that one plan

#### Scenario: Omitting the lance context preserves per-unit behavior

- **GIVEN** a `BotPlayer` call made without the lance-context parameter
- **WHEN** the movement and attack phases run
- **THEN** the decisions SHALL be identical to the pre-change per-unit behavior

#### Scenario: The plan is deterministic

- **GIVEN** the same friendly and enemy unit sets
- **WHEN** `planTurn` is called twice
- **THEN** both plans SHALL contain identical threat maps, fire assignments, and centroids
