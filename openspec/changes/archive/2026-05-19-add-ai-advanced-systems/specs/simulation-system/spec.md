## ADDED Requirements

### Requirement: Advanced-Systems Tier Parameters

The AI Difficulty Tier Registry SHALL carry an advanced parameter block on each tier, exposing `advancedSystems`, `jumpTacticsWeight`, `ecmAvoidanceWeight`, `ecmCoverageWeight`, and `visionWeight`. The `Green`, `Regular`, and `Veteran` tiers SHALL set `advancedSystems` to `false` with zeroed weights, leaving jump tactics, ECM awareness, and vision awareness inert and keeping the flat-probability jump-movement roll. The `Elite` tier SHALL populate the block with active values. This block SHALL be registered additively and SHALL NOT modify the movement, resource, coordination, or objective parameter blocks.

#### Scenario: Every tier resolves an advanced block

- **GIVEN** the tier names `Green`, `Regular`, `Veteran`, and `Elite`
- **WHEN** the advanced parameter block is read for each
- **THEN** each SHALL return a populated `IAITierAdvancedParameters` record

#### Scenario: Lower tiers ignore advanced systems

- **GIVEN** a bot configured with the `Green`, `Regular`, or `Veteran` tier
- **WHEN** it selects movement and scores moves
- **THEN** jump-movement selection SHALL use the flat-probability roll
- **AND** the ECM and vision terms SHALL contribute zero

### Requirement: AI Jump-Jet Tactics

When `advancedSystems` is enabled, the system SHALL provide `AIJumpTactics.evaluateJump` that scores a unit's best jump destination for terrain-clearing, elevation gain, and charge or melee escape, and reports whether jumping risks a shutdown inside the heat lookahead window. Jump heat SHALL be weighed through the multi-turn heat projection from the resource-planning change. `BotPlayer.selectMovementType` SHALL choose the Jump movement type only when the best jump destination's tactical score clears a threshold; otherwise it SHALL NOT jump. When `advancedSystems` is disabled, jump selection SHALL keep the flat-probability roll.

#### Scenario: Bot jumps to clear costly terrain

- **GIVEN** an `Elite` unit whose jump destination is reachable only by walking through heavy terrain at high movement-point cost
- **WHEN** `evaluateJump` runs
- **THEN** the jump SHALL receive a high terrain-clearing score
- **AND** `selectMovementType` SHALL choose Jump

#### Scenario: Heat-unsafe jump is rejected

- **GIVEN** an `Elite` unit whose jump heat would push a shutdown inside the heat lookahead window
- **WHEN** `evaluateJump` runs
- **THEN** `heatUnsafe` SHALL be `true`
- **AND** the jump SHALL NOT be chosen on heat grounds alone

#### Scenario: Bot jumps to escape a charge

- **GIVEN** an `Elite` unit with an enemy adjacent and threatening a physical attack, and a heat-safe jump that breaks adjacency
- **WHEN** `evaluateJump` runs
- **THEN** the escape jump SHALL receive a charge-escape bonus
- **AND** `selectMovementType` SHALL choose Jump

#### Scenario: Lower tier keeps the flat jump roll

- **GIVEN** a `Veteran` unit selecting movement
- **WHEN** `selectMovementType` runs
- **THEN** jump selection SHALL use the flat-probability roll unchanged from the pre-change behavior

### Requirement: AI Electronic-Warfare Awareness

When `advancedSystems` is enabled, the system SHALL provide `AIElectronicWarfareAdvisor` that consumes the existing electronic-warfare module to advise move scoring. A destination inside a hostile ECM bubble SHALL incur a penalty scaled by `ecmAvoidanceWeight`. A destination that lets an ECM-suite or BAP-probe carrier cover more lancemates, or counter an enemy ECM source, SHALL earn a bonus scaled by `ecmCoverageWeight`. The advisor SHALL only read electronic-warfare state; it SHALL NOT modify the electronic-warfare module and SHALL NOT alter combat to-hit resolution.

#### Scenario: Bot avoids a hostile ECM bubble

- **GIVEN** an `Elite` unit choosing between a destination inside a hostile ECM bubble and one outside it, with otherwise equal scoring
- **WHEN** move scoring runs
- **THEN** the destination outside the bubble SHALL score higher

#### Scenario: ECM carrier is rewarded for covering the lance

- **GIVEN** an `Elite` unit carrying an ECM suite, choosing a destination whose bubble covers two lancemates
- **WHEN** move scoring runs
- **THEN** that destination SHALL receive an ECM coverage bonus

#### Scenario: Awareness does not touch combat resolution

- **GIVEN** the electronic-warfare advisor in use
- **WHEN** the bot scores moves
- **THEN** no to-hit number, weapon eligibility, or combat-resolution path SHALL be modified by the advisor
- **AND** the electronic-warfare module SHALL be unchanged

### Requirement: AI Spotting and Vision Awareness

When `advancedSystems` is enabled, the system SHALL provide `AIVisionAdvisor` that consumes the existing fog-of-war module to advise move scoring. A destination that newly spots a previously-unspotted enemy SHALL earn a scouting bonus scaled by `visionWeight`. A destination that breaks an enemy's spotting line to the moving unit SHALL earn a line-of-sight-break bonus scaled by `visionWeight`. The advisor SHALL only read fog-of-war visibility; it SHALL NOT modify the fog-of-war module and SHALL NOT hide enemy positions from the bot's planner.

#### Scenario: Bot repositions to scout an unspotted enemy

- **GIVEN** an `Elite` unit with a destination that newly spots an enemy not previously visible to the bot's side
- **WHEN** move scoring runs
- **THEN** that destination SHALL receive a scouting bonus

#### Scenario: Bot values breaking an enemy's spotting line

- **GIVEN** an `Elite` unit choosing between a destination spotted by an enemy and one that breaks that enemy's spotting line, with otherwise equal scoring
- **WHEN** move scoring runs
- **THEN** the line-of-sight-breaking destination SHALL score higher

#### Scenario: Vision awareness does not modify fog-of-war

- **GIVEN** the vision advisor in use
- **WHEN** the bot scores moves
- **THEN** the fog-of-war module SHALL be unchanged
- **AND** enemy positions SHALL remain fully available to the bot's planner
