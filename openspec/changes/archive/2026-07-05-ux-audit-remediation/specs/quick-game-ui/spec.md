# quick-game-ui Delta Specification

## ADDED Requirements

### Requirement: Results Verdict Explanation

The quick game results screen SHALL present a verdict whose stated reason is consistent with the displayed battle statistics, including enough context for the player to understand why they won or lost.

#### Scenario: Turn-limit verdict shows turn context

- **GIVEN** a battle that ended with reason 'turn_limit'
- **WHEN** the results banner renders
- **THEN** it SHALL display the turns played relative to the turn limit (e.g., "Turn limit reached (9/9)")
- **AND** the displayed turns played SHALL match the Battle Statistics panel

#### Scenario: Verdict never contradicts statistics

- **GIVEN** a results screen showing 0 friendly losses and 0 enemy losses
- **WHEN** the verdict banner shows Defeat
- **THEN** the banner SHALL state the non-destruction reason for the defeat (objective or turn-limit adjudication), not an unexplained loss

### Requirement: Key Moments Initial Visibility

When the battle produced key moments, the results Key Moments panel SHALL render an initial visible subset of moments before offering any "show more" affordance. An empty visible list combined with a "show more" link SHALL NOT occur.

#### Scenario: Moments render before show-more

- **GIVEN** a completed battle with 4 key moments
- **WHEN** the Key Moments panel renders
- **THEN** at least the first moment SHALL be visible
- **AND** any "show more" affordance SHALL describe only the remaining hidden moments

#### Scenario: No moments means an honest empty state

- **GIVEN** a completed battle with 0 key moments
- **WHEN** the Key Moments panel renders
- **THEN** it SHALL show an explicit empty message and no "show more" affordance
