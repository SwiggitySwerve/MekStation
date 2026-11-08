## MODIFIED Requirements

### Requirement: Match Terminal State Closed Enum (Engine Layer)

The simulation engine SHALL emit a `MatchTerminalState` field on every equivalent runner output. It SHALL retain exactly seven values: `player_victory`, `opfor_victory`, `draw`, `mutual_destruction`, `timeout`, `forfeit`, and `withdrawal`.

The classifier SHALL retain explicit forfeit and withdrawal precedence. A critical-anomaly halt SHALL classify as `draw`. Otherwise it SHALL honor the existing resolved winner, including objective victories with operational units on both sides, before testing the turn limit. Without a decisive winner it SHALL preserve mutual-destruction and one-sided-elimination classification.

`timeout` SHALL mean an unresolved match with operational units on both sides that reaches the **effective configured turn limit, bounded by the engine ceiling**. The effective limit SHALL be `min(config.turnLimit, MAX_TURNS)` for a positive configured limit and `MAX_TURNS` otherwise. `MAX_TURNS` remains 100; timeout is no longer restricted to reaching 100 turns. An unresolved stop before that limit SHALL classify as `draw`.

#### Scenario: Short configured limit

- **GIVEN** a configured turn limit of 3 and operational units on both sides
- **WHEN** the unresolved runner stops at turn 3
- **THEN** its terminal state SHALL be `timeout`

#### Scenario: Ceiling bounds unlimited and excessive configurations

- **GIVEN** a nonpositive configured limit or a configured limit above 100
- **WHEN** an unresolved match reaches turn 100 with operational units on both sides
- **THEN** its terminal state SHALL be `timeout`

#### Scenario: Objective victory beats timeout

- **GIVEN** either side wins an objective while both sides retain operational units
- **WHEN** the winner is resolved before or at the effective limit
- **THEN** the terminal state SHALL be `player_victory` or `opfor_victory` matching that winner
- **AND** it SHALL NOT be `timeout` or `draw`

#### Scenario: Critical halt is distinct from timeout

- **GIVEN** a run halted by a critical anomaly without a resolved victory
- **WHEN** its terminal state is determined
- **THEN** it SHALL be `draw`, including when the halt coincides with the effective limit
- **AND** its existing halt flag and aborted terminal event SHALL remain unchanged

#### Scenario: Destruction and explicit exits retain their meanings

- **GIVEN** an elimination, mutual destruction, explicit forfeit, or explicit withdrawal
- **WHEN** its terminal state is determined
- **THEN** the existing terminal value and explicit-exit precedence SHALL be retained
- **AND** exactly one terminal value SHALL be assigned

### Requirement: Match Outcome Conservation Invariants

The engine SHALL preserve conservation of unit and pilot fates. Each side's destroyed, survived, and withdrawn unit counts SHALL sum to its starting roster, with each unit counted once. Pilot terminal counts SHALL sum to the pilot roster, and KIA counts SHALL equal unit-destruction events attributed to pilot death or head destruction, globally and per side.

#### Scenario: Elimination victory conserves unit fates

- **GIVEN** a destruction-based player victory
- **WHEN** unit fates are counted
- **THEN** at least one player unit SHALL remain operational and the opfor roster SHALL be destroyed or withdrawn

#### Scenario: Objective victory preserves both surviving rosters

- **GIVEN** an objective victory with operational units on both sides
- **WHEN** unit fates are counted
- **THEN** those survivors SHALL remain survived and SHALL NOT be counted as destroyed or withdrawn to fit the victory classification

#### Scenario: Mutual destruction has no survivors

- **GIVEN** a nonempty starting roster on each side and mutual destruction
- **WHEN** unit fates are counted
- **THEN** both sides SHALL have zero survivors

### Requirement: Match Duration Bounded by Engine Ceiling

The runner's turn count SHALL remain at or below `MAX_TURNS = 100`, and SHALL NOT exceed the effective configured turn limit. Aggregated turn counts SHALL reconcile with this bound. Reaching the ceiling SHALL NOT override an objective victory, elimination, mutual destruction, or critical halt.

#### Scenario: Unresolved match reaches the ceiling

- **GIVEN** an unresolved match with operational units on both sides and an effective limit of 100
- **WHEN** the runner reaches turn 100 without a critical halt
- **THEN** its terminal state SHALL be `timeout`

#### Scenario: Resolved match on the last permitted turn

- **GIVEN** a victory or mutual destruction on the effective limit
- **WHEN** the runner records its result
- **THEN** it SHALL preserve that resolved terminal classification within the duration bound
