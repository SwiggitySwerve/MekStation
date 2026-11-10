## ADDED Requirements

### Requirement: Applied Outcome Time Domain

The system SHALL treat `ICombatOutcome.capturedAt` as a wall-clock instant that records when the outcome was derived, and SHALL NOT compare it with a campaign date. When a combat outcome is applied to a campaign, the system SHALL record the in-game application day (`appliedOn`, the campaign date at application) on the entry it keeps in `recentlyAppliedOutcomes`, on every application path. Retention of applied outcomes SHALL be counted in calendar days from `appliedOn`. The field SHALL be additive: a save without it SHALL load, and a reader that does not know it SHALL ignore it.

#### Scenario: A battle counts on an era campaign

- **GIVEN** a campaign dated in an era far from the wall clock
- **WHEN** a won battle derived with the production wall-clock `capturedAt` is applied and the morale processor runs
- **THEN** company morale SHALL move up one step, and a lost battle SHALL move it down one step
- **AND** the outcome SHALL remain in `recentlyAppliedOutcomes`

#### Scenario: A battle counts on a new campaign's first day and on a lagging campaign

- **GIVEN** a campaign created at the wall clock, or one whose date lags the wall clock
- **WHEN** a battle fought after the campaign's current instant is applied
- **THEN** it SHALL be counted once, however the campaign date compares with the wall clock

#### Scenario: Applied outcomes are retained for 31 in-game days

- **GIVEN** an outcome applied on day 0
- **WHEN** the morale processor runs on day 31
- **THEN** the outcome SHALL still be in `recentlyAppliedOutcomes`
- **AND WHEN** it runs on day 32 the outcome SHALL be removed
- **AND** the outcome SHALL be counted for morale once

#### Scenario: An old save loads

- **GIVEN** a save whose applied outcomes have no `appliedOn`
- **WHEN** it is loaded
- **THEN** each such entry SHALL be stamped with the loaded campaign's date, none SHALL be dropped, and `capturedAt` SHALL NOT be read to date it
