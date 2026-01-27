# random-events Specification Delta

## ADDED Requirements

### Requirement: Random Event Framework
The system SHALL provide a typed random event framework with categories, severity levels, and effect types.

#### Scenario: Event has category and severity
- **GIVEN** a random event is generated
- **WHEN** the event is created
- **THEN** the event has a category (PRISONER, LIFE, CONTRACT, HISTORICAL) and severity (MINOR, MAJOR, CRITICAL)

#### Scenario: Event has effects
- **GIVEN** a random event with effects
- **WHEN** the event is processed
- **THEN** effects are applied to campaign state (morale, finances, personnel status, etc.)

### Requirement: Probability Engine
The system SHALL provide probability functions for event generation with injectable random function for testing.

#### Scenario: Roll for event with probability
- **GIVEN** a probability of 0.5 and a random function
- **WHEN** rollForEvent is called
- **THEN** the function returns true approximately 50% of the time

#### Scenario: Select random event from list
- **GIVEN** a list of 10 events and a seeded random function
- **WHEN** selectRandomEvent is called
- **THEN** the function returns a deterministic event based on the seed

### Requirement: Prisoner Events
The system SHALL generate ~30 prisoner events (minor and major) based on prisoner capacity and overflow.

#### Scenario: Calculate prisoner capacity
- **GIVEN** a campaign with 2 conventional infantry units and 1 battle armor unit
- **WHEN** calculatePrisonerCapacity is called
- **THEN** capacity is 30 (2×5 + 1×20)

#### Scenario: Prisoner overflow increases event probability
- **GIVEN** a campaign with 40 prisoners and capacity 30 (33% overflow)
- **WHEN** prisoner events are processed on Monday
- **THEN** event probability is increased by overflow percentage

#### Scenario: Major prisoner event has escape effect
- **GIVEN** a major prisoner event (breakout)
- **WHEN** the event is processed
- **THEN** 20% of prisoners escape

### Requirement: Life Events
The system SHALL generate life events including 4 calendar celebrations and coming-of-age at age 16.

#### Scenario: New Year's Day celebration
- **GIVEN** a campaign with currentDate 3025-01-01
- **WHEN** life events are processed
- **THEN** a New Year's Day celebration event is generated

#### Scenario: Coming-of-age at 16
- **GIVEN** a person with birthDate 3009-06-15 and currentDate 3025-06-15
- **WHEN** life events are processed
- **THEN** a coming-of-age event is generated with 5 XP award

### Requirement: Gray Monday Historical Event
The system SHALL optionally simulate the Gray Monday financial collapse (3132.08.03-12) with 99% balance loss.

#### Scenario: Bankruptcy on Gray Monday day 7
- **GIVEN** a campaign with currentDate 3132-08-09 and simulateGrayMonday enabled
- **WHEN** Gray Monday is processed
- **THEN** 99% of campaign balance is debited

#### Scenario: No Gray Monday when disabled
- **GIVEN** a campaign with currentDate 3132-08-09 and simulateGrayMonday disabled
- **WHEN** Gray Monday is processed
- **THEN** no event is generated

### Requirement: Random Events Day Processor
The system SHALL process random events daily with frequency-based routing (daily, weekly, monthly).

#### Scenario: Life events fire daily
- **GIVEN** a campaign with useLifeEvents enabled
- **WHEN** the random events processor runs
- **THEN** life events are checked every day

#### Scenario: Prisoner events fire on Mondays
- **GIVEN** a campaign with usePrisonerEvents enabled and currentDate is Monday
- **WHEN** the random events processor runs
- **THEN** prisoner events are processed

#### Scenario: Contract events fire on 1st of month
- **GIVEN** a campaign with useContractEvents enabled and currentDate is 1st of month
- **WHEN** the random events processor runs
- **THEN** contract events are processed for all active contracts

### Requirement: Event Effects Application
The system SHALL apply event effects to campaign state including morale, finances, personnel status, and XP awards.

#### Scenario: Financial effect updates balance
- **GIVEN** a campaign with balance 100,000 and a financial effect of -10,000
- **WHEN** the effect is applied
- **THEN** campaign balance is 90,000

#### Scenario: Prisoner escape effect reduces prisoner count
- **GIVEN** a campaign with 50 prisoners and an escape effect of 20%
- **WHEN** the effect is applied
- **THEN** prisoner count is reduced by 10

### Requirement: Campaign Options Integration
The system SHALL provide 5 campaign options for event category toggles and Gray Monday simulation.

#### Scenario: useRandomEvents master toggle
- **GIVEN** a campaign with useRandomEvents disabled
- **WHEN** the random events processor runs
- **THEN** no events are generated

#### Scenario: Category-specific toggles
- **GIVEN** a campaign with usePrisonerEvents disabled but useLifeEvents enabled
- **WHEN** the random events processor runs
- **THEN** only life events are generated
