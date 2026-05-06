# After Combat Report (delta)

## ADDED Requirements

### Requirement: Match Terminal State Closed Enum (Engine Layer)

The simulation engine SHALL emit a `MatchTerminalState` field on every `IMatchResult` (or equivalent runner output). The field SHALL be a closed snake_case enum with exactly seven values: `'player_victory' | 'opfor_victory' | 'draw' | 'mutual_destruction' | 'timeout' | 'forfeit' | 'withdrawal'`. This is the engine-layer match outcome, distinct from the ACAR statistical layer's `'victory' | 'defeat' | 'draw'` taxonomy in `Scenario Resolution`. Both taxonomies coexist; the ACAR layer aggregates from the engine layer for campaign-level summarization.

The match-terminal-state taxonomy:
- **`player_victory`** — all opfor units destroyed, withdrawn, or surrendered while at least one player unit remains operational
- **`opfor_victory`** — symmetric: all player units destroyed/withdrawn/surrendered while at least one opfor unit operational
- **`mutual_destruction`** — every unit on both sides destroyed in the same turn (typically alpha-strike-trade scenarios)
- **`draw`** — neither side meets victory conditions before timeout AND neither side voluntarily withdraws (used for objective-based scenarios)
- **`timeout`** — match reaches `MAX_TURNS = 100` ceiling without resolution; both sides have surviving units
- **`forfeit`** — a side voluntarily concedes (e.g., commander surrender, unrecoverable position)
- **`withdrawal`** — a side voluntarily retreats (units flee off-map but survive); opposing side credited with field control

#### Scenario: All opfor destroyed → player_victory

- **GIVEN** a 2v2 match where both opfor units are destroyed (UnitDestroyed events emitted)
- **AND** at least one player unit remains operational at the destruction
- **WHEN** the match-terminal state is determined
- **THEN** the result MUST be `'player_victory'`

#### Scenario: Both sides eliminated in same turn → mutual_destruction

- **GIVEN** a match where the final UnitDestroyed event of the player side AND the opfor side both fire in turn N
- **WHEN** the match-terminal state is determined
- **THEN** the result MUST be `'mutual_destruction'`
- **AND** NOT `'player_victory'` or `'opfor_victory'`

#### Scenario: Match reaches MAX_TURNS with units alive on both sides → timeout

- **GIVEN** a match running to turn 100 with at least one operational unit remaining on each side
- **WHEN** the engine ends the match at the turn ceiling
- **THEN** the match-terminal state MUST be `'timeout'`
- **AND** the existing `incompleteGameRate` metric MUST count this run

#### Scenario: Side voluntarily withdraws → withdrawal

- **GIVEN** a match where one side issues a withdrawal command before destruction
- **AND** the withdrawing units successfully flee off-map
- **WHEN** the match-terminal state is determined
- **THEN** the result MUST be `'withdrawal'`
- **AND** the opposing side is credited with field control but NOT with destruction kills

#### Scenario: matchTerminalState is mutually exclusive

- **GIVEN** a single match's result record
- **WHEN** the engine determines the match-terminal state
- **THEN** exactly ONE of the 7 enum values MUST be assigned
- **AND** the values MUST NOT be combined

### Requirement: Match Outcome Conservation Invariants

The engine SHALL enforce conservation rules that any auditor or consumer MAY rely on. The sum of per-unit fates MUST equal the starting roster size on each side. The match-terminal state MUST be consistent with the per-unit fates. Pilot-terminal-state counts MUST sum to roster size as well.

#### Scenario: Sum of unit fates equals roster size

- **GIVEN** a match starting with N player units and M opfor units
- **WHEN** the match concludes
- **THEN** for each side: `sum(unitsDestroyed) + sum(unitsSurvived) + sum(unitsWithdrawn)` MUST equal that side's starting roster size
- **AND** no unit MUST appear in more than one terminal-fate bucket

#### Scenario: player_victory requires at least one operational player unit

- **GIVEN** a match with terminal state `'player_victory'`
- **WHEN** the per-unit fates are summed
- **THEN** the count of player units with terminal fate `'survived'` (operational at match end) MUST be ≥ 1
- **AND** the count of opfor units with terminal fate `'destroyed'` OR `'withdrawn'` MUST equal opfor's full roster size

#### Scenario: mutual_destruction requires zero survivors on both sides

- **GIVEN** a match with terminal state `'mutual_destruction'`
- **WHEN** the per-unit fates are summed
- **THEN** `playerSurvivors === 0 && opforSurvivors === 0`
- **AND** every unit on both sides MUST have terminal fate `'destroyed'` (NOT `'withdrawn'`)

#### Scenario: Pilot terminal states sum to roster size

- **GIVEN** a match with N total pilots across both sides
- **WHEN** the per-pilot match-terminal states are aggregated
- **THEN** `count('unhurt') + count('wounded') + count('unconscious') + count('kia') + count('ejected')` MUST equal N
- **AND** no pilot MUST appear in more than one bucket

#### Scenario: KIA pilot count never exceeds unit destruction count via pilot causes

- **GIVEN** a match's per-pilot terminal states
- **WHEN** the count of pilots with `matchTerminalState: 'kia'` is computed
- **THEN** that count MUST equal the count of `UnitDestroyed` events with `cause: 'pilot_death'` OR `cause: 'head_destroyed'`
- **AND** the equality MUST hold per side (not just globally)

### Requirement: Match Duration Bounded by Engine Ceiling

`IMatchResult.duration` (turn count) MUST always be ≤ `MAX_TURNS = 100` per the engine ceiling at `src/simulation/runner/SimulationRunnerConstants.ts`. The aggregator's `averageTurns` field MUST reconcile against this ceiling, NOT a prior cached value.

#### Scenario: Match duration cannot exceed 100 turns

- **GIVEN** any seeded match run
- **WHEN** the result is recorded
- **THEN** `result.duration` MUST be ≤ 100
- **AND** if `result.duration === 100`, the `matchTerminalState` MUST be `'timeout'`
