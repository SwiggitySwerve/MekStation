# repair-maintenance Specification

## Purpose
TBD - created by archiving change add-repair-quality-cascade. Update Purpose after archive.
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

