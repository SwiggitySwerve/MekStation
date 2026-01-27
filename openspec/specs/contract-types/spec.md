# contract-types Specification

## Purpose
TBD - created by archiving change add-contract-types. Update Purpose after archive.
## Requirements
### Requirement: 19 AtB Contract Types
The system SHALL provide 19 AtB contract types with type-specific definitions.

#### Scenario: Contract type has all required properties
- **GIVEN** a contract type definition
- **WHEN** the definition is accessed
- **THEN** it includes constantLengthMonths, opsTempo, defaultCombatRole, and partsAvailabilityMod

#### Scenario: Garrison contracts have lower ops tempo
- **GIVEN** a CADRE_DUTY contract
- **WHEN** opsTempo is checked
- **THEN** opsTempo is 0.8 (lower than standard 1.0)

### Requirement: Variable Contract Length
The system SHALL calculate variable contract lengths using the formula: round(constantLength × 0.75) + random(round(constantLength × 0.5)).

#### Scenario: Variable length for 18-month contract
- **GIVEN** a GARRISON_DUTY contract with constantLength 18 months
- **WHEN** calculateVariableLength is called
- **THEN** length ranges from 14 to 23 months (13.5 + 0-9)

### Requirement: Contract Negotiation
The system SHALL provide 4-clause negotiation with skill and faction standing modifiers.

#### Scenario: Negotiation with skill modifier
- **GIVEN** a negotiator with Negotiation skill 7
- **WHEN** negotiation roll is made
- **THEN** target number is modified by skill level

#### Scenario: Faction standing affects negotiation
- **GIVEN** a campaign with positive faction standing
- **WHEN** negotiation roll is made
- **THEN** negotiation modifier from faction standing is applied

### Requirement: Contract Events
The system SHALL check for 10 monthly contract event types.

#### Scenario: Monthly event check
- **GIVEN** an active contract on the 1st of the month
- **WHEN** contract events are processed
- **THEN** event roll is made for the contract

#### Scenario: Event affects contract
- **GIVEN** a LOGISTICS_FAILURE event
- **WHEN** the event is processed
- **THEN** parts availability is reduced

