## MODIFIED Requirements

### Requirement: Company Morale State Machine

The system SHALL model company morale as an ordered state machine that applies
at most one step transition per day, driven by an enumerated set of
morale-affecting signals. Paying the company's daily costs SHALL be the
baseline and SHALL NOT by itself raise morale; a missed payment SHALL lower it.
Each applied battle outcome SHALL move morale once. The pay rule is an
application design rule (Root ruling for K-M4), not a port of MekHQ.

#### Scenario: Morale moves at most one step per day

- **GIVEN** a campaign at a given morale state
- **WHEN** the morale processor evaluates a day with multiple negative signals
- **THEN** the morale state SHALL move by at most one step

#### Scenario: Victories raise morale

- **GIVEN** a campaign at a non-maximum morale state
- **WHEN** the day's signals include a recent victory
- **THEN** the morale state SHALL move up by one step
- **AND** whether or not the day's costs were paid SHALL NOT change that result

#### Scenario: Defeats and missed pay lower morale

- **GIVEN** a campaign at a non-minimum morale state
- **WHEN** the day's signals include recent defeats, missed pay, or desertions
- **THEN** the morale state SHALL move down by one step
- **AND** paid costs SHALL NOT offset a defeat or a desertion

#### Scenario: Paid costs are the baseline

- **GIVEN** a solvent campaign that pays its daily costs each day and has no battle outcome or desertion
- **WHEN** the morale processor evaluates many consecutive days
- **THEN** the morale state SHALL remain unchanged on every day
- **AND** the company SHALL NOT drift toward the maximum state by paying its way

#### Scenario: A day with no costs event is neutral

- **GIVEN** a campaign whose day carries no daily-costs event
- **WHEN** the morale processor runs
- **THEN** that day SHALL contribute no pay signal in either direction

#### Scenario: No signal yields no transition

- **GIVEN** a campaign with no morale-affecting signals on a given day
- **WHEN** the morale processor runs
- **THEN** the morale state SHALL be unchanged

#### Scenario: Each applied outcome counts once

- **GIVEN** a battle outcome that remains in the recently-applied window for many days
- **WHEN** the morale processor evaluates each of those days, including after the campaign is saved and reloaded
- **THEN** the outcome SHALL move morale only on the first evaluation after it was applied

#### Scenario: A morale change emits a day event

- **GIVEN** a day on which the morale state transitions
- **WHEN** the morale processor completes
- **THEN** a day event describing the transition SHALL be emitted
- **AND** the stated reason SHALL name only signals that moved morale (victories, defeats, missed pay, desertions) and SHALL NOT cite paid costs
