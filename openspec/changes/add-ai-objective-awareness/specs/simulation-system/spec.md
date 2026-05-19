## ADDED Requirements

### Requirement: Objective-Awareness Tier Parameters

The AI Difficulty Tier Registry SHALL carry an objective parameter block on each tier, exposing `objectiveAwareness`, `objectiveSeekingWeight`, and `objectiveHoldWeight`. The `Green`, `Regular`, and `Veteran` tiers SHALL set `objectiveAwareness` to `false` with zeroed weights, leaving the bot blind to the objective map so it plays every scenario as `Destroy`. The `Elite` tier SHALL populate the block with active values. This block SHALL be registered additively and SHALL NOT modify the movement, resource, or coordination parameter blocks.

#### Scenario: Every tier resolves an objective block

- **GIVEN** the tier names `Green`, `Regular`, `Veteran`, and `Elite`
- **WHEN** the objective parameter block is read for each
- **THEN** each SHALL return a populated `IAITierObjectiveParameters` record

#### Scenario: Lower tiers ignore the objective map

- **GIVEN** a bot configured with the `Green`, `Regular`, or `Veteran` tier playing a `Capture` scenario
- **WHEN** it plans a turn
- **THEN** the objective planner SHALL NOT be consulted
- **AND** the bot SHALL play the scenario as pure attrition

### Requirement: Objective Ingestion and Classification

When `objectiveAwareness` is enabled, the system SHALL provide `AIObjectivePlanner.classifyObjectives` that reads the game session's `objectives` map and scenario objective type and classifies each marker for the bot's side as `take` (a marker the bot must control to win), `hold` (a marker the bot must keep controlling to win), or `deny` (a marker the bot must keep the enemy off). An empty objective map or a `Destroy` scenario type SHALL yield no classified objectives. Classification SHALL be a pure deterministic function and SHALL NOT modify any objective marker.

#### Scenario: Attacker capture marker classifies as take

- **GIVEN** a `Capture` scenario where the bot is the attacking side
- **WHEN** `classifyObjectives` runs
- **THEN** each objective marker SHALL be classified `take`

#### Scenario: Defender objective marker classifies as hold

- **GIVEN** a `Defend` scenario where the bot is the defending side
- **WHEN** `classifyObjectives` runs
- **THEN** each objective marker SHALL be classified `hold`

#### Scenario: Destroy scenario yields no objectives

- **GIVEN** a scenario whose objective type is `Destroy`, with or without stray markers
- **WHEN** `classifyObjectives` runs
- **THEN** it SHALL return an empty list
- **AND** the bot SHALL fall through to pure coordinated combat

### Requirement: Objective-Aware Lance Planning

When `objectiveAwareness` is enabled and the scenario objective type is not `Destroy`, the per-lance turn plan SHALL carry an objective plan assigning each unit an objective role — `capture`, `hold`, or `screen`. The capture role SHALL be assigned to the unit(s) closest by terrain-pathfinder cost to a `take` marker; the hold role to the unit(s) on or nearest a `hold` marker; the screen role to every other unit. Each role-bearing unit SHALL carry the hex it is working toward or holding. Role assignment SHALL be a pure deterministic function of the objective map and unit positions.

#### Scenario: Capture role goes to the nearest unit

- **GIVEN** a `take` marker and two friendly units at different pathfinder distances from it
- **WHEN** the objective plan is computed
- **THEN** the closer unit SHALL receive the `capture` role

#### Scenario: Hold role goes to the unit on the marker

- **GIVEN** a `hold` marker currently occupied by one friendly unit
- **WHEN** the objective plan is computed
- **THEN** that unit SHALL receive the `hold` role with the marker hex as its target hex

#### Scenario: Remaining units screen

- **GIVEN** a lance with one capture-role unit and one hold-role unit assigned
- **WHEN** the objective plan is computed
- **THEN** every other unit SHALL receive the `screen` role with no objective hex

### Requirement: Objective-Seeking Movement

When `objectiveAwareness` is enabled, `MoveAI` SHALL extend move scoring with an objective term. For a capture-role unit the term SHALL grant `objectiveSeekingWeight` scaled by the reduction in pathfinder distance to its `take` marker, with a large bonus for a destination on the marker hex. For a hold-role unit the term SHALL grant `objectiveHoldWeight` for a destination on its `hold` marker, a reduced value for adjacent hexes, and zero for destinations that abandon the marker. A screen-role unit SHALL receive a zero objective contribution. The objective term SHALL be additive over the terrain-aware and cohesion terms. When `objectiveAwareness` is disabled, the objective term SHALL contribute zero.

#### Scenario: Capture unit moves onto its objective

- **GIVEN** an `Elite` capture-role unit with a candidate destination on its `take` marker and another off it
- **WHEN** move scoring runs
- **THEN** the on-marker destination SHALL score higher
- **AND** the unit SHALL move toward the marker

#### Scenario: Hold unit stays on its objective

- **GIVEN** an `Elite` hold-role unit choosing between staying on its `hold` marker and moving off it to chase an enemy
- **WHEN** move scoring runs
- **THEN** the on-marker destination SHALL score higher

#### Scenario: Screen unit ignores the objective term

- **GIVEN** an `Elite` screen-role unit
- **WHEN** move scoring runs
- **THEN** the objective term SHALL contribute zero to its score

### Requirement: Objective-Aware Target Discipline

When `objectiveAwareness` is enabled, a unit holding a `capture` or `hold` role SHALL have its target selection biased toward targets engageable without leaving its objective hex or its path to it — the unit SHALL fire from the objective rather than pursue an enemy off it. A `screen`-role unit's target selection SHALL be unchanged from the coordinated combat behavior. This discipline SHALL be a bias over the lance fire assignment, not a replacement — an objective-role unit still concentrates fire with the lance on an in-discipline target.

#### Scenario: Hold unit engages from its objective

- **GIVEN** an `Elite` hold-role unit on its marker with an enemy it could only engage by leaving the marker
- **WHEN** target selection runs
- **THEN** the unit SHALL NOT abandon the marker to pursue
- **AND** it SHALL engage the best target reachable from the marker hex

#### Scenario: Screen unit selects targets normally

- **GIVEN** an `Elite` screen-role unit
- **WHEN** target selection runs
- **THEN** its target choice SHALL match the coordinated combat behavior with no objective bias
