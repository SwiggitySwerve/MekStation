# repair-maintenance Specification

## Purpose

Defines Repair Maintenance requirements for Part Quality Grades, Maintenance Check System, Quality Degradation, and Quality Improvement, preserving the source-of-truth scope introduced by archived change add-repair-quality-cascade.
## Requirements
### Requirement: Part Quality Grades

The system SHALL support equipment quality grades from A (worst) to F (best), with each grade affecting maintenance target numbers to create a feedback loop where poor quality makes maintenance harder.

#### Scenario: Quality affects maintenance difficulty

- **GIVEN** a unit with quality grade A (worst)
- **WHEN** calculating maintenance target number
- **THEN** quality modifier is +3 (hardest to maintain)
- **AND** failed maintenance checks are more likely

#### Scenario: Quality affects maintenance difficulty for best quality

- **GIVEN** a unit with quality grade F (best)
- **WHEN** calculating maintenance target number
- **THEN** quality modifier is -2 (easiest to maintain)
- **AND** successful maintenance checks are more likely

#### Scenario: New units start at standard quality

- **GIVEN** a newly purchased or manufactured unit
- **WHEN** unit is added to campaign
- **THEN** quality grade is D (standard)
- **AND** quality modifier is 0 (neutral)

#### Scenario: Salvaged units have below-average quality

- **GIVEN** a unit acquired through salvage
- **WHEN** unit is added to campaign
- **THEN** quality grade is C (below average)
- **AND** quality modifier is +1

### Requirement: Maintenance Check System

The system SHALL perform maintenance checks using 2d6 rolls against a target number composed of tech skill value, quality modifier, and situational modifiers.

#### Scenario: Successful maintenance check

- **GIVEN** a unit requiring maintenance with TN 8
- **WHEN** maintenance check is performed and rolls 9
- **THEN** check succeeds
- **AND** unit quality may improve if margin is high enough
- **AND** maintenance record is created

#### Scenario: Failed maintenance check

- **GIVEN** a unit requiring maintenance with TN 8
- **WHEN** maintenance check is performed and rolls 6
- **THEN** check fails
- **AND** unit quality degrades by one grade (toward A)
- **AND** maintenance record is created with failure outcome

#### Scenario: Deterministic testing with injectable random

- **GIVEN** a maintenance check with seeded RandomFn
- **WHEN** check is executed multiple times with same seed
- **THEN** results are deterministic and reproducible
- **AND** tests can verify exact outcomes

### Requirement: Quality Degradation

The system SHALL degrade equipment quality by one grade (toward A/worst) when maintenance checks fail, with quality A as the floor (cannot degrade further).

#### Scenario: Quality degrades on failure

- **GIVEN** a unit with quality D that fails maintenance check
- **WHEN** maintenance result is applied
- **THEN** quality degrades to C
- **AND** next maintenance check will be harder (TN +1 instead of 0)

#### Scenario: Quality cannot degrade below A

- **GIVEN** a unit with quality A (worst) that fails maintenance check
- **WHEN** maintenance result is applied
- **THEN** quality remains at A
- **AND** critical failure may cause additional damage

#### Scenario: Multiple failures cascade quality

- **GIVEN** a unit with quality E
- **WHEN** maintenance fails three times consecutively
- **THEN** quality degrades to D, then C, then B
- **AND** each failure makes next check progressively harder

### Requirement: Quality Improvement

The system SHALL improve equipment quality by one grade (toward F/best) when maintenance checks succeed with a margin of 4 or more, with quality F as the ceiling (cannot improve further).

#### Scenario: Quality improves on high success

- **GIVEN** a unit with quality D and maintenance TN 8
- **WHEN** maintenance check rolls 12 (margin of 4)
- **THEN** quality improves to E
- **AND** next maintenance check will be easier (TN -1 instead of 0)

#### Scenario: Quality cannot improve above F

- **GIVEN** a unit with quality F (best) that succeeds maintenance with high margin
- **WHEN** maintenance result is applied
- **THEN** quality remains at F
- **AND** maintenance record shows success

#### Scenario: Marginal success does not improve quality

- **GIVEN** a unit with quality D and maintenance TN 8
- **WHEN** maintenance check rolls 9 (margin of 1)
- **THEN** check succeeds but quality remains at D
- **AND** no quality change occurs

### Requirement: Tech Skill Integration

The system SHALL use personnel Tech skill values in maintenance target number calculations, with higher skill values making maintenance checks easier.

#### Scenario: Skilled tech improves maintenance success

- **GIVEN** a tech with Tech skill value 5
- **WHEN** performing maintenance on quality D unit
- **THEN** target number includes tech skill value
- **AND** maintenance is easier than with unskilled tech

#### Scenario: Unskilled tech struggles with maintenance

- **GIVEN** a tech with Tech skill value 2
- **WHEN** performing maintenance on quality D unit
- **THEN** target number includes lower tech skill value
- **AND** maintenance is harder than with skilled tech

### Requirement: Maintenance History Tracking

The system SHALL track maintenance history per unit, recording date, tech, roll, target number, margin, outcome, and quality changes.

#### Scenario: Record maintenance check details

- **GIVEN** a completed maintenance check
- **WHEN** maintenance result is applied
- **THEN** maintenance record is created with all details
- **AND** record includes roll, TN, margin, outcome
- **AND** record includes quality before and after
- **AND** record is added to unit's maintenance history

#### Scenario: Query maintenance history

- **GIVEN** a unit with multiple maintenance checks
- **WHEN** viewing unit maintenance history
- **THEN** all maintenance records are accessible
- **AND** records are ordered by date
- **AND** quality progression is visible

### Requirement: Maintenance Target Number Calculation

The system SHALL calculate maintenance target numbers using the formula: tech skill value + quality modifier + mode penalty + quirks modifier + overtime modifier + shorthanded modifier.

#### Scenario: Calculate TN with all modifiers

- **GIVEN** a maintenance check with tech skill 5, quality D, normal mode, no quirks, no overtime, no shorthanded
- **WHEN** calculating target number
- **THEN** TN is 5 (tech) + 0 (quality) + 0 (mode) + 0 (quirks) + 0 (overtime) + 0 (shorthanded) = 5

#### Scenario: Rush mode increases difficulty

- **GIVEN** a maintenance check in rush mode
- **WHEN** calculating target number
- **THEN** mode penalty is +1
- **AND** maintenance is harder than normal mode

#### Scenario: Extra time decreases difficulty

- **GIVEN** a maintenance check with extra time
- **WHEN** calculating target number
- **THEN** mode penalty is -1
- **AND** maintenance is easier than normal mode

### Requirement: Modifier Breakdown Visibility

The system SHALL provide detailed visibility into all modifier values for each maintenance check, supporting transparency and debugging.

#### Scenario: View modifier breakdown

- **GIVEN** a completed maintenance check
- **WHEN** viewing maintenance result
- **THEN** all modifiers are listed with their values
- **AND** each modifier shows its name and numeric value
- **AND** total target number is shown as sum of all modifiers

### Requirement: Repair Ticket Completion

The system SHALL advance repair tickets to completion through a registered daily
day-processor that consumes available tech-hours, and on a ticket reaching zero
remaining hours SHALL transition the ticket `completed`, restore the
armor/structure points the ticket was created to repair, and recompute the
unit's `combatReady` state. Ticket advancement SHALL be deterministic and
idempotent: a completed ticket SHALL NOT re-apply its restoration when the day
pipeline is re-run. There SHALL be exactly one completion authority — the
`useRepairStore.advanceRepairs` path SHALL NOT be a second, parallel authority.

#### Scenario: Tech-hours advance a queued ticket to completion

- **GIVEN** a campaign with a `queued` repair ticket recording armor/structure to restore
- **WHEN** the daily repair-progress processor runs on enough successive days to
  consume the ticket's required tech-hours
- **THEN** the ticket SHALL transition `queued → in-progress → completed`
- **AND** on completion the unit's repaired armor/structure SHALL be restored to the
  recorded points clamped to each location's maximum
- **AND** the unit's `combatReady` state SHALL be recomputed.

#### Scenario: Completion is idempotent across pipeline re-runs

- **GIVEN** a repair ticket already marked `completed` with its restoration applied
- **WHEN** the day pipeline is re-run over the same day
- **THEN** the ticket SHALL remain `completed`
- **AND** the unit's armor/structure SHALL NOT be restored a second time.

#### Scenario: A ticket whose required part is unavailable waits

- **GIVEN** a repair ticket requiring a part not present in the campaign parts inventory
- **WHEN** the repair-progress processor runs
- **THEN** the ticket SHALL NOT transition to `completed`
- **AND** it SHALL wait until the required part becomes available in the inventory.

#### Scenario: Tech-hour budget is exhausted across competing tickets

- **GIVEN** two in-progress tickets whose combined required hours exceed the day's
  available tech-hours
- **WHEN** the repair-progress processor runs for one day
- **THEN** the processor SHALL consume the available tech-hours and advance tickets up
  to that budget
- **AND** the remaining unfunded ticket SHALL stay short of completion until a later day.

### Requirement: GM Repair Ticket Correction Proof

Repair maintenance SHALL remain covered by the Wave 8 campaign ledger QC proof for GM repair ticket corrections.

#### Scenario: Repair ticket correction proof covers restoration and removal

- **GIVEN** a GM corrects a repair ticket after post-combat damage or repair state was recorded incorrectly
- **WHEN** the campaign ledger QC validator runs
- **THEN** it SHALL validate source and test anchors proving repair tickets can be restored, patched, or removed through approved projected effects
