# personnel-progression Specification

## Purpose
TBD - created by archiving change add-personnel-progression. Update Purpose after archive.
## Requirements
### Requirement: XP Source Configuration
The system SHALL support 8 configurable XP sources with distinct award conditions.

#### Scenario: All XP sources are configurable
- **GIVEN** campaign options
- **WHEN** configuring XP awards
- **THEN** scenarioXP, killXPAward, taskXP, vocationalXP, adminXP, missionFailXP, missionSuccessXP, missionOutstandingXP are all configurable
- **AND** killsForXP and nTasksXP define thresholds

#### Scenario: Education XP is stubbed
- **GIVEN** no academy system exists
- **WHEN** attempting to award education XP
- **THEN** the function exists but returns null

### Requirement: Trait Multiplier System
The system SHALL apply 4 trait multipliers to skill improvement costs.

#### Scenario: Fast Learner reduces all skill costs
- **GIVEN** a person with fastLearner trait
- **WHEN** calculating any skill cost
- **THEN** the cost is multiplied by 0.8 (-20%)

#### Scenario: Gremlins only affects tech skills
- **GIVEN** a person with gremlins trait
- **WHEN** calculating cost for tech-mech skill
- **THEN** the cost is multiplied by 1.1 (+10%)
- **AND** calculating cost for gunnery skill is unaffected

#### Scenario: Minimum cost is 1 XP
- **GIVEN** a person with Fast Learner and Tech Empathy
- **WHEN** calculating cost for a tech skill with base cost 1
- **THEN** the final cost is max(1, round(1 × 0.8 × 0.9)) = 1

### Requirement: Aging Milestone System
The system SHALL define 10 aging milestones with cumulative attribute modifiers.

#### Scenario: Milestones cover full age range
- **GIVEN** the aging milestone table
- **WHEN** checking coverage
- **THEN** milestones exist for <25, 25-30, 31-40, 41-50, 51-60, 61-70, 71-80, 81-90, 91-100, 101+

#### Scenario: Attribute modifiers are cumulative
- **GIVEN** a person ages from 60 to 65
- **WHEN** crossing from "51-60" to "61-70" milestone
- **THEN** the new milestone's modifiers are applied
- **AND** previous milestone modifiers remain in effect

#### Scenario: Glass Jaw applied at 61 unless Toughness
- **GIVEN** a person turns 61 without Toughness trait
- **WHEN** processing aging
- **THEN** glassJaw trait is set to true

#### Scenario: Slow Learner applied at 61 unless Fast Learner
- **GIVEN** a person turns 61 without Fast Learner trait
- **WHEN** processing aging
- **THEN** slowLearner trait is set to true

### Requirement: Special Ability Acquisition
The system SHALL support SPA acquisition via veterancy, coming-of-age, and purchase.

#### Scenario: Veterancy SPA on reaching Veteran level
- **GIVEN** a person reaches Veteran experience level for the first time
- **WHEN** checking for SPA acquisition
- **THEN** a veterancy SPA roll is triggered
- **AND** hasGainedVeterancySPA is set to true

#### Scenario: Coming-of-age SPA at age 16
- **GIVEN** a person turns 16
- **WHEN** processing aging
- **THEN** a coming-of-age SPA roll is triggered

#### Scenario: Purchase SPA with XP
- **GIVEN** a person has sufficient XP
- **WHEN** purchasing an eligible SPA
- **THEN** the SPA xpCost is deducted from person.xp
- **AND** the SPA is added to the person's abilities

### Requirement: Vocational Training Timer
The system SHALL track vocational training eligibility via a daily-incrementing timer.

#### Scenario: Timer increments daily
- **GIVEN** a person with vocationalXPTimer at 10
- **WHEN** a day advances
- **THEN** the timer increments to 11

#### Scenario: Timer resets after check
- **GIVEN** a person's timer reaches vocationalXPCheckFrequency (default 30)
- **WHEN** the vocational check is performed
- **THEN** the timer resets to 0 regardless of roll outcome

#### Scenario: Ineligible personnel skip timer
- **GIVEN** a person with status POW or KIA
- **WHEN** processing vocational training
- **THEN** the timer does not increment
- **AND** no check is performed

### Requirement: XP Application
The system SHALL update both current and lifetime XP totals when awarding XP.

#### Scenario: XP award updates both totals
- **GIVEN** a person with xp=10 and totalXpEarned=50
- **WHEN** awarding 5 XP
- **THEN** xp becomes 15
- **AND** totalXpEarned becomes 55

#### Scenario: Spending XP only affects current total
- **GIVEN** a person with xp=15 and totalXpEarned=55
- **WHEN** spending 10 XP on a skill
- **THEN** xp becomes 5
- **AND** totalXpEarned remains 55

