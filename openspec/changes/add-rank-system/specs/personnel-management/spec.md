## MODIFIED Requirements

### Requirement: Person Entity
The system SHALL track personnel with comprehensive attributes including rank index and time-in-rank.

#### Scenario: Person has numeric rank index
- **GIVEN** a person in the campaign
- **WHEN** viewing their rank
- **THEN** the person has a rankIndex field (numeric 0-50)
- **AND** rankIndex maps to a rank in the faction's rank system

#### Scenario: Person tracks time-in-rank
- **GIVEN** a person promoted on 3025-06-01
- **WHEN** checking time-in-rank on 3025-12-01
- **THEN** time-in-rank is 6 months

## ADDED Requirements

### Requirement: Faction Rank System
The system SHALL support faction-specific rank systems with 51 rank slots.

#### Scenario: Rank system structure
- **GIVEN** a faction rank system
- **WHEN** accessing its properties
- **THEN** the system has: code, name, ranks[51], officerCut, useROMDesignation
- **AND** ranks array has exactly 51 slots (indices 0-50)
- **AND** not all slots are populated (most systems use 15-20 actual ranks)

#### Scenario: Built-in rank systems
- **GIVEN** the rank system
- **WHEN** listing available systems
- **THEN** systems SHALL include: Mercenary, SLDF, Clan, ComStar, Generic House

#### Scenario: Rank properties
- **GIVEN** a rank in a rank system
- **WHEN** accessing its properties
- **THEN** the rank has: index, names (per profession), officer boolean, payMultiplier

### Requirement: Profession-Specific Rank Names
The system SHALL resolve rank names based on personnel profession.

#### Scenario: MekWarrior rank name
- **GIVEN** a person with profession MekWarrior and rank index 10
- **WHEN** resolving the rank name
- **THEN** the name is "Captain" (MekWarrior variant)

#### Scenario: Aerospace rank name
- **GIVEN** a person with profession Aerospace and rank index 10
- **WHEN** resolving the rank name
- **THEN** the name is "Flight Captain" (Aerospace variant)

#### Scenario: Profession mapping
- **GIVEN** the rank system
- **WHEN** listing professions
- **THEN** professions SHALL include: MekWarrior, Aerospace, Vehicle, Naval, Infantry, Tech, Medical, Administrator, Civilian

### Requirement: Officer Status Determination
The system SHALL determine officer status based on rank index vs officer cut.

#### Scenario: Officer rank
- **GIVEN** a rank system with officer cut at index 30
- **WHEN** a person has rank index 35
- **THEN** the person is an officer

#### Scenario: Enlisted rank
- **GIVEN** a rank system with officer cut at index 30
- **WHEN** a person has rank index 15
- **THEN** the person is not an officer

#### Scenario: Officer cut threshold
- **GIVEN** a faction rank system
- **WHEN** checking the officer cut
- **THEN** ranks with index >= officerCut are officers
- **AND** ranks with index < officerCut are enlisted or warrant officers

### Requirement: Promotion and Demotion
The system SHALL support promotion and demotion with validation and logging.

#### Scenario: Promote personnel
- **GIVEN** a person with rank index 10
- **WHEN** promoting the person
- **THEN** rank index increases to 11
- **AND** lastRankChangeDate is updated to current date
- **AND** promotion is logged to service history

#### Scenario: Demote personnel
- **GIVEN** a person with rank index 10
- **WHEN** demoting the person
- **THEN** rank index decreases to 9
- **AND** lastRankChangeDate is updated to current date
- **AND** demotion is logged to service history

#### Scenario: Promotion validation
- **GIVEN** a person with rank index 50 (maximum)
- **WHEN** attempting to promote
- **THEN** promotion is rejected (cannot exceed maximum rank)

#### Scenario: Demotion validation
- **GIVEN** a person with rank index 0 (minimum)
- **WHEN** attempting to demote
- **THEN** demotion is rejected (cannot go below minimum rank)

### Requirement: Rank Pay Multiplier
The system SHALL apply rank-specific pay multipliers to salary calculation.

#### Scenario: Pay multiplier application
- **GIVEN** a person with base salary 5000 and rank pay multiplier 1.5
- **WHEN** calculating total salary
- **THEN** salary = 5000 × 1.5 = 7500

#### Scenario: Officer pay premium
- **GIVEN** officer ranks typically have pay multipliers 1.5-3.0
- **WHEN** an enlisted person is promoted to officer
- **THEN** their salary increases due to higher pay multiplier

### Requirement: Officer Effects on Turnover
The system SHALL apply officer status effects to turnover calculations.

#### Scenario: Officer turnover modifier
- **GIVEN** a person with officer status
- **WHEN** calculating turnover modifiers
- **THEN** officer status provides -1 modifier (reduces turnover chance)

#### Scenario: Recent promotion modifier
- **GIVEN** a person promoted within the last 6 months
- **WHEN** calculating turnover modifiers
- **THEN** recent promotion provides -1 modifier (reduces turnover chance)

#### Scenario: Combined officer effects
- **GIVEN** a person who is an officer AND was recently promoted
- **WHEN** calculating turnover modifiers
- **THEN** both modifiers apply (-2 total)

### Requirement: Officer Shares Calculation
The system SHALL calculate additional shares for officers based on rank.

#### Scenario: Officer shares
- **GIVEN** a rank system with officer cut at index 30
- **WHEN** a person has rank index 35
- **THEN** officer shares = base shares + (35 - 30) = base + 5

#### Scenario: Enlisted shares
- **GIVEN** a person with rank index below officer cut
- **WHEN** calculating shares
- **THEN** shares = base shares only (no officer bonus)
