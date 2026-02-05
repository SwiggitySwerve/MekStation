## MODIFIED Requirements

### Requirement: Person Entity

The system SHALL track personnel with comprehensive attributes including traits, XP totals, and progression state.

#### Scenario: Person has trait flags

- **GIVEN** a person in the campaign
- **WHEN** viewing their traits
- **THEN** the system tracks fastLearner, slowLearner, gremlins, techEmpathy, toughness, glassJaw flags
- **AND** tracks hasGainedVeterancySPA and vocationalXPTimer

#### Scenario: Person tracks XP totals

- **GIVEN** a person earns XP
- **WHEN** XP is awarded
- **THEN** both xp (current) and totalXpEarned (lifetime) are incremented

#### Scenario: Traits affect skill costs

- **GIVEN** a person with Fast Learner trait
- **WHEN** calculating skill improvement cost
- **THEN** the cost is reduced by 20%

## ADDED Requirements

### Requirement: XP Award Tracking

The system SHALL track XP awards from 8 distinct sources with configurable amounts.

#### Scenario: Scenario XP awarded

- **GIVEN** a person participates in a scenario
- **WHEN** the scenario completes
- **THEN** the person receives scenarioXP amount (default 1)

#### Scenario: Kill XP requires threshold

- **GIVEN** a person with 3 kills and killsForXP set to 2
- **WHEN** calculating kill XP
- **THEN** the person receives 1 × killXPAward (floor(3/2) = 1)

#### Scenario: Mission XP varies by outcome

- **GIVEN** a mission completes
- **WHEN** the outcome is "outstanding"
- **THEN** the person receives missionOutstandingXP (default 5)
- **AND** "success" awards missionSuccessXP (default 3)
- **AND** "fail" awards missionFailXP (default 1)

### Requirement: Trait-Modified Skill Costs

The system SHALL apply trait multipliers to skill improvement costs.

#### Scenario: Slow Learner increases cost

- **GIVEN** a person with Slow Learner trait
- **WHEN** calculating skill cost
- **THEN** the base cost is multiplied by 1.2 (+20%)

#### Scenario: Tech traits apply to tech skills only

- **GIVEN** a person with Gremlins trait
- **WHEN** improving a tech skill
- **THEN** the cost is multiplied by 1.1 (+10%)
- **AND** non-tech skills are unaffected

#### Scenario: Traits stack multiplicatively

- **GIVEN** a person with Slow Learner and Gremlins
- **WHEN** improving a tech skill
- **THEN** the cost is multiplied by 1.2 × 1.1 = 1.32 (+32%)

### Requirement: Aging Attribute Decay

The system SHALL apply cumulative attribute modifiers at 10 aging milestones.

#### Scenario: Age 65 applies milestone modifiers

- **GIVEN** a person turns 65 (milestone "61-70")
- **WHEN** processing aging
- **THEN** STR is reduced by 1.0, BOD by 1.0, DEX by 1.0
- **AND** Glass Jaw is applied (unless has Toughness)
- **AND** Slow Learner is applied (unless has Fast Learner)

#### Scenario: Modifiers only apply on milestone crossing

- **GIVEN** a person turns 66 (still in "61-70" milestone)
- **WHEN** processing aging
- **THEN** no new modifiers are applied

#### Scenario: Aging can be disabled

- **GIVEN** useAgingEffects is false
- **WHEN** processing aging
- **THEN** no modifiers are applied regardless of age
