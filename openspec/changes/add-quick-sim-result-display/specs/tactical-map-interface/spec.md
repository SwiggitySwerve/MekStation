# tactical-map-interface Specification Delta

## ADDED Requirements

### Requirement: Quick Sim Result Panel

The tactical map interface SHALL provide a `QuickSimResultPanel`
component that accepts an `IBatchResult` and renders four sections:
win probability, turn count distribution, casualty breakdown, and a
collapsible raw data block.

#### Scenario: Panel renders all sections on completed batch

- **GIVEN** a valid `IBatchResult` with `totalRuns = 100`
- **WHEN** `QuickSimResultPanel` receives the result as props
- **THEN** the rendered DOM SHALL contain sections labeled
  `"Win Probability"`, `"Turn Count"`, `"Casualties"`, and a
  collapsible `"Raw Data"` region
- **AND** the header SHALL read `"Quick Resolve: 100 runs"`

#### Scenario: Empty state rendered when totalRuns is zero

- **GIVEN** an `IBatchResult` with `totalRuns = 0`
- **WHEN** the panel renders
- **THEN** the panel SHALL show `"Run a batch to see outcome
distribution"` with a `"Run Batch"` CTA button
- **AND** no win-probability bar SHALL be rendered

### Requirement: Win Probability Bar

The result panel SHALL render a horizontal stacked bar representing
`winProbability.{player, opponent, draw}` with player-first ordering
and inline percentage labels on segments wider than 10% of the bar.

#### Scenario: Bar segments scale to probabilities

- **GIVEN** `winProbability = {player: 0.62, opponent: 0.30, draw:
0.08}`
- **WHEN** the bar renders
- **THEN** the player segment SHALL occupy 62% of the width
- **AND** the opponent segment SHALL occupy 30%
- **AND** the draw segment SHALL occupy 8%

#### Scenario: Inline labels hidden for narrow segments

- **GIVEN** `winProbability.draw = 0.08`
- **WHEN** the bar renders
- **THEN** the draw segment SHALL NOT render an inline percentage label
  (below the 10% visibility threshold)

#### Scenario: Bar uses accessible label

- **GIVEN** `winProbability = {player: 0.62, opponent: 0.30, draw:
0.08}`
- **WHEN** the bar renders
- **THEN** the bar SHALL have `role="img"`
- **AND** `aria-label` SHALL equal `"Win probabilities: Player 62%,
Opponent 30%, Draw 8%"`

### Requirement: Most Likely Outcome Headline

The result panel SHALL display a headline above the win-probability bar
summarizing `mostLikelyOutcome` and a derived confidence qualifier.

#### Scenario: High-confidence player victory

- **GIVEN** `mostLikelyOutcome = "player"` and `winProbability.player =
0.85`
- **WHEN** the headline renders
- **THEN** the headline text SHALL equal `"Most Likely Outcome: Player
Victory (High)"`

#### Scenario: Moderate-confidence opponent victory

- **GIVEN** `mostLikelyOutcome = "opponent"` and
  `winProbability.opponent = 0.67`
- **WHEN** the headline renders
- **THEN** the headline text SHALL equal `"Most Likely Outcome:
Opponent Victory (Moderate)"`

#### Scenario: Low-confidence outcome

- **GIVEN** `mostLikelyOutcome = "player"` and `winProbability.player =
0.52`
- **WHEN** the headline renders
- **THEN** the headline text SHALL equal `"Most Likely Outcome: Player
Victory (Low)"`

#### Scenario: Draw headline omits confidence

- **GIVEN** `mostLikelyOutcome = "draw"` and `winProbability.draw =
0.50`
- **WHEN** the headline renders
- **THEN** the headline text SHALL equal `"Most Likely Outcome: Draw"`
  with no confidence qualifier

### Requirement: Turn Count Histogram

The result panel SHALL render a `TurnCountHistogram` chart bucketing
turn counts into 2-turn bins across `[turnCount.min, turnCount.max]`,
with mean (solid line), median (dashed line), p25/p75 (shaded band),
and p90 (labeled marker) overlays.

#### Scenario: Histogram renders when at least 2 runs succeeded

- **GIVEN** a batch with `totalRuns = 100` successful runs
- **WHEN** the histogram renders
- **THEN** the chart SHALL display at least one 2-turn bucket per
  sample point in the range
- **AND** the mean indicator SHALL be drawn as a solid vertical line at
  `turnCount.mean`
- **AND** the median SHALL be drawn as a dashed vertical line at
  `turnCount.median`

#### Scenario: Insufficient data shows fallback text

- **GIVEN** a batch with fewer than 2 successful runs
- **WHEN** the histogram renders
- **THEN** the histogram SHALL render the text `"Not enough data"`
  instead of a chart

#### Scenario: Screen-reader table fallback

- **GIVEN** the histogram is rendered with 5 buckets
- **WHEN** a screen reader inspects the component
- **THEN** a visually hidden `<table>` SHALL list each bucket with its
  count

### Requirement: Casualty Breakdown

The result panel SHALL render a two-column casualty section (Player /
Opponent) showing mech-destroyed frequency, heat-shutdown frequency,
and per-unit survival bars sorted by survival rate descending.

#### Scenario: Per-side metrics visible

- **GIVEN** `mechDestroyedFrequency = {player: 0.70, opponent: 0.45}`
  and `heatShutdownFrequency = {player: 0.18, opponent: 0.09}`
- **WHEN** the casualty section renders
- **THEN** the Player column SHALL show `"Mech Destroyed: 70%"` and
  `"Heat Shutdown: 18%"`
- **AND** the Opponent column SHALL show `"Mech Destroyed: 45%"` and
  `"Heat Shutdown: 9%"`

#### Scenario: Per-unit survival sorted

- **GIVEN** `perUnitSurvival = {"p1-atlas": 0.72, "p1-locust": 0.91,
"p1-commando": 0.44}`
- **WHEN** the Player column renders the per-unit rows
- **THEN** rows SHALL be ordered: Locust (91%), Atlas (72%), Commando
  (44%)
- **AND** each row SHALL render a 0-100% bar labeled with the unit's
  designation

### Requirement: Compact Summary Variant

The tactical map interface SHALL provide a compact
`QuickSimResultSummary` component suitable for the encounter detail
page, rendering a single row with a small win-prob bar, the outcome
headline, and a "View Full Results" link.

#### Scenario: Summary navigates to full panel

- **GIVEN** `QuickSimResultSummary` rendered on
  `/gameplay/encounters/[id]/index`
- **WHEN** the user clicks "View Full Results"
- **THEN** the browser SHALL navigate to
  `/gameplay/encounters/[id]/sim`
- **AND** the full-panel page SHALL render the same `IBatchResult`

#### Scenario: Summary empty state

- **GIVEN** no batch has been run yet for the encounter
- **WHEN** the summary renders
- **THEN** it SHALL display `"No quick resolve data yet"` with a `"Run
Batch"` CTA button
- **AND** the CTA SHALL dispatch `useQuickResolve()` with default
  `runs: 100`

### Requirement: Progress and Cancel Surface

The result panel SHALL render a progress bar with `runsCompleted /
totalRuns` during a running batch and a Cancel button that triggers
the batch's `AbortSignal`.

#### Scenario: Progress bar updates during batch

- **GIVEN** a batch in progress with `runsCompleted = 37` of `totalRuns
= 100`
- **WHEN** the progress bar renders
- **THEN** the bar SHALL display at 37% fill
- **AND** the label SHALL read `"37 / 100"`
- **AND** the bar SHALL have `role="progressbar"` with `aria-valuenow =
37`, `aria-valuemin = 0`, `aria-valuemax = 100`

#### Scenario: Cancel triggers abort and shows partial banner

- **GIVEN** a batch in progress at 37 runs completed
- **WHEN** the user clicks Cancel
- **THEN** the batch's `AbortSignal` SHALL fire
- **AND** once the current run finishes, the panel SHALL render a
  banner `"Partial results (cancelled)"`
- **AND** the underlying `IBatchResult.totalRuns` SHALL equal 37
