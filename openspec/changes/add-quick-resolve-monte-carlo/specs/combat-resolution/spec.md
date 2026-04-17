# combat-resolution Specification Delta

## ADDED Requirements

### Requirement: Batch Outcome Aggregation

The combat-resolution system SHALL expose
`aggregateBatchOutcomes(outcomes: IBatchOutcome[]): IBatchResult` that
reduces raw per-run outcomes into a single statistical summary used by
the Quick Resolve UI.

#### Scenario: Win probability computed from winner counts

- **GIVEN** 100 outcomes with winner distribution
  `{player: 62, opponent: 30, draw: 8}`
- **WHEN** `aggregateBatchOutcomes(outcomes)` is called
- **THEN** the returned `winProbability` SHALL be
  `{player: 0.62, opponent: 0.30, draw: 0.08}`
- **AND** the three probabilities SHALL sum to 1.0 (within floating
  point tolerance)

#### Scenario: Error outcomes excluded from probability denominator

- **GIVEN** 100 outcomes where 10 errored and the remaining 90 resolved
  to `{player: 45, opponent: 36, draw: 9}`
- **WHEN** `aggregateBatchOutcomes(outcomes)` is called
- **THEN** `winProbability` SHALL be computed over the 90 successful
  runs (`player: 0.5, opponent: 0.4, draw: 0.1`)
- **AND** `IBatchResult.erroredRuns` SHALL equal 10

#### Scenario: Turn-count percentiles

- **GIVEN** 100 outcomes with the turn counts distributed across
  `[6..24]`
- **WHEN** aggregation runs
- **THEN** `turnCount.median` SHALL equal the 50th-percentile value
- **AND** `turnCount.p25`, `turnCount.p75`, `turnCount.p90` SHALL equal
  the respective percentile values
- **AND** `turnCount.min` and `turnCount.max` SHALL bracket the range

#### Scenario: Heat shutdown frequency

- **GIVEN** 100 outcomes where Player units shut down in 18 matches and
  Opponent units shut down in 9 matches
- **WHEN** aggregation runs
- **THEN** `heatShutdownFrequency` SHALL equal
  `{player: 0.18, opponent: 0.09}`

#### Scenario: Per-unit survival rate

- **GIVEN** 100 outcomes where unit id `"p1-locust"` survived 81 matches
- **WHEN** aggregation runs
- **THEN** `perUnitSurvival["p1-locust"]` SHALL equal 0.81

#### Scenario: Most likely outcome

- **GIVEN** win probabilities `{player: 0.62, opponent: 0.30, draw:
0.08}`
- **WHEN** aggregation runs
- **THEN** `mostLikelyOutcome` SHALL equal `"player"`

#### Scenario: Draw when no clear winner

- **GIVEN** win probabilities `{player: 0.49, opponent: 0.49, draw:
0.02}`
- **WHEN** aggregation runs
- **THEN** `mostLikelyOutcome` SHALL equal `"draw"`
- **AND** ties between player and opponent SHALL resolve to `"draw"`
  regardless of the actual draw probability

### Requirement: Empty Batch Handling

`aggregateBatchOutcomes` SHALL return a well-formed empty `IBatchResult`
when called with zero outcomes so the UI can render a "no data" state
without a runtime error.

#### Scenario: Empty input returns zeros

- **GIVEN** an empty `outcomes` array
- **WHEN** `aggregateBatchOutcomes([])` is called
- **THEN** the result SHALL equal `{totalRuns: 0, winProbability:
{player: 0, opponent: 0, draw: 0}, turnCount: {mean: 0, median: 0,
...}, mostLikelyOutcome: "draw", perUnitSurvival: {}}`
- **AND** no division-by-zero exception SHALL be thrown
