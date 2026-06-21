# contract-types Specification

## Purpose

Defines Contract Types requirements for 19 AtB Contract Types, Variable Contract Length, Contract Negotiation, and Contract Events, preserving the source-of-truth scope introduced by archived change add-contract-types.

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

### Requirement: Contract Fulfillment Event

The `PostBattleProcessor` SHALL publish a `ContractFulfilled` event when
it processes the final outcome of a contract, allowing downstream
processors to close the contract on their next run.

#### Scenario: Final scenario triggers fulfillment event

- **GIVEN** a contract requiring 5 scenarios with `scenariosPlayed = 4`
- **WHEN** `postBattleProcessor` processes an outcome that increments
  `scenariosPlayed` to 5
- **THEN** a `ContractFulfilled` event SHALL be published with the
  contract id
- **AND** the contract's `fulfilled` flag SHALL be set to true

#### Scenario: Non-final scenario does not publish event

- **GIVEN** a contract requiring 5 scenarios with `scenariosPlayed = 2`
- **WHEN** `postBattleProcessor` processes an outcome that increments
  `scenariosPlayed` to 3
- **THEN** no `ContractFulfilled` event SHALL be published
- **AND** the contract's `fulfilled` flag SHALL remain false

### Requirement: Contract Processor Listens For Fulfillment

The existing `contractProcessor` SHALL listen for `ContractFulfilled`
events and close the contract on its next invocation by processing final
payment, faction standing, and removal from the active contract list.

#### Scenario: Contract closure on next processor run

- **GIVEN** a `ContractFulfilled` event was published today for contract C
- **WHEN** `contractProcessor` runs (either later today or on the next
  day advance)
- **THEN** contract C SHALL have its final payment applied to the
  campaign's finances
- **AND** faction standing SHALL be updated per the contract's success
  modifier
- **AND** contract C SHALL be removed from the active contract list and
  archived to completed contracts

