# after-combat-report Specification Delta

## ADDED Requirements

### Requirement: Batch Result Schema

The after-combat-report system SHALL define an `IBatchResult` schema
that aggregates N `IPostBattleReport` samples produced by the Quick
Resolve Monte Carlo runner, plus an `IBatchOutcome` per-run entry that
retains per-run metadata alongside its report.

#### Scenario: IBatchResult contains required top-level fields

- **GIVEN** a completed Quick Resolve batch with 100 runs
- **WHEN** `aggregateBatchOutcomes` derives the result
- **THEN** the `IBatchResult` SHALL contain `{totalRuns, erroredRuns,
baseSeed, winProbability, turnCount, heatShutdownFrequency,
mechDestroyedFrequency, perUnitSurvival, mostLikelyOutcome}`
- **AND** `winProbability` SHALL be shaped `{player: number, opponent:
number, draw: number}` with values in `[0, 1]`
- **AND** `turnCount` SHALL be shaped `{mean, median, p25, p75, p90,
min, max}` (all numbers)

#### Scenario: IBatchOutcome wraps one report

- **GIVEN** one run inside a batch
- **WHEN** the run completes
- **THEN** the corresponding `IBatchOutcome` SHALL contain `{runIndex,
seed, report: IPostBattleReport, durationMs}`
- **AND** `runIndex` SHALL be the 0-based ordinal
- **AND** `seed` SHALL equal `baseSeed + runIndex`

#### Scenario: IBatchOutcome marks errored runs

- **GIVEN** a run that throws during resolution
- **WHEN** the batch runner captures the error
- **THEN** the `IBatchOutcome` SHALL contain `{runIndex, seed, error:
string, durationMs}` and SHALL NOT contain a `report` field
- **AND** aggregation SHALL skip error entries when computing
  probabilities

### Requirement: Heat Shutdown Frequency

The batch result SHALL expose `heatShutdownFrequency: {player: number,
opponent: number}` expressing the fraction of successful runs in which
any unit on that side shut down due to heat at least once during the
match.

#### Scenario: Frequency derived from per-unit heat problems

- **GIVEN** a batch of 100 runs where 18 matches had at least one
  Player heat shutdown
- **WHEN** the batch aggregates
- **THEN** `heatShutdownFrequency.player` SHALL equal 0.18

#### Scenario: Multiple shutdowns in one match count once

- **GIVEN** a single match where three Player units each shut down once
- **WHEN** aggregation runs
- **THEN** that match SHALL increment the shutdown counter by 1 (not 3)

### Requirement: Mech Destroyed Frequency

The batch result SHALL expose `mechDestroyedFrequency: {player: number,
opponent: number}` expressing the fraction of successful runs in which
at least one unit on that side was destroyed.

#### Scenario: Any-unit-destroyed counts as 1

- **GIVEN** 50 runs where exactly one Player mech was destroyed and 20
  runs where two Player mechs were destroyed
- **WHEN** aggregation runs across a 100-run batch
- **THEN** `mechDestroyedFrequency.player` SHALL equal 0.70
- **AND** the counter SHALL NOT double-count matches with multiple
  destroyed units

### Requirement: Per-Unit Survival Rate

The batch result SHALL expose `perUnitSurvival: Record<string, number>`
mapping each unit id in the original encounter to the fraction of
successful runs in which that unit ended the match not destroyed.

#### Scenario: Survival rate by unit id

- **GIVEN** unit `"p1-atlas"` was not destroyed in 72 of 100 successful
  runs
- **WHEN** aggregation runs
- **THEN** `perUnitSurvival["p1-atlas"]` SHALL equal 0.72

#### Scenario: Destroyed unit always has zero survival

- **GIVEN** unit `"op1-locust"` was destroyed in all 100 runs
- **WHEN** aggregation runs
- **THEN** `perUnitSurvival["op1-locust"]` SHALL equal 0.0

### Requirement: Base Seed Reporting

The batch result SHALL include `baseSeed: number` so the caller can
reproduce the entire batch by re-invoking `runBatch` with the same seed
and run count.

#### Scenario: baseSeed round-trips

- **GIVEN** a batch completed with `baseSeed = 9183`
- **WHEN** `runBatch(config, { runs: 100, baseSeed: 9183 })` is invoked
  a second time
- **THEN** the second `IBatchResult` SHALL deep-equal the first
