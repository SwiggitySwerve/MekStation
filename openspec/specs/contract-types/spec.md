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

The `PostBattleProcessor` SHALL publish a `ContractFulfilled` event when it processes the final outcome of a contract, allowing downstream processors to close the contract on their next run. In the same outcome-application step that flips the contract to a terminal status, the `PostBattleProcessor` SHALL post the contract's final payment — crediting the campaign balance and appending a final-payment income transaction (transaction type `TransactionType.Income`, id `tx-contract-close-<contractId>-<iso>`, matching the existing `applyContractClosure` output; "contract payment" names the payout concept here, NOT the distinct `TransactionType.ContractPayment` enum member) — and SHALL stamp the contract id into `processedFulfilledContractIds` (NOT `pendingFulfilledContractIds`). The balance credit, the appended transaction, and the `processedFulfilledContractIds` stamp SHALL land in the same immutable campaign object the apply step returns, so the payout is all-or-nothing and never posts twice for one contract. Because both the day pipeline and the interactive review / GM apply path route through the same outcome-application step, the payout SHALL post at mission completion regardless of which path applied the outcome. The step SHALL also emit a `contract_payment` day event and append a `finances` activity-log entry so the DayReport and Recent Activity surface the income.

#### Scenario: Final scenario triggers fulfillment event

- **GIVEN** a contract requiring 5 scenarios with `scenariosPlayed = 4`
- **WHEN** `postBattleProcessor` processes an outcome that increments `scenariosPlayed` to 5
- **THEN** a `ContractFulfilled` event SHALL be published with the contract id
- **AND** the contract's `fulfilled` flag SHALL be set to true

#### Scenario: Non-final scenario does not publish event

- **GIVEN** a contract requiring 5 scenarios with `scenariosPlayed = 2`
- **WHEN** `postBattleProcessor` processes an outcome that increments `scenariosPlayed` to 3
- **THEN** no `ContractFulfilled` event SHALL be published
- **AND** the contract's `fulfilled` flag SHALL remain false

#### Scenario: Fulfillment posts the final payment at the apply commit point

- **GIVEN** a contract that the applied outcome flips to a terminal status
- **WHEN** `postBattleProcessor` applies that outcome (via either the day pipeline or the interactive review / GM apply path)
- **THEN** the contract's final payment SHALL be credited to the campaign balance in the returned campaign object
- **AND** a `TransactionType.Income` transaction for that payout SHALL be appended to `finances.transactions`
- **AND** the contract id SHALL be recorded in `processedFulfilledContractIds`
- **AND** a `contract_payment` day event and a `finances` activity-log entry SHALL be produced

#### Scenario: Payout posts exactly once across apply and day advance

- **GIVEN** an outcome whose apply already posted a contract's final payment and stamped its id into `processedFulfilledContractIds`
- **WHEN** the campaign subsequently advances a day and the day pipeline runs
- **THEN** no second final-payment income transaction SHALL be appended for that contract
- **AND** the campaign balance SHALL be unchanged by contract closure on that advance

### Requirement: Contract Processor Listens For Fulfillment

The existing `contractProcessor` SHALL remain an idempotent legacy-save fallback for contract closure. It SHALL close only contracts flagged fulfilled that have NOT already been posted at outcome application — that is, contracts whose id is present in `pendingFulfilledContractIds` but absent from `processedFulfilledContractIds`. For any such contract it SHALL apply the final payment, faction standing, and removal from the active contract list, then move the id into `processedFulfilledContractIds`. A contract already closed and posted at the apply commit point SHALL be skipped and SHALL NOT be re-paid.

#### Scenario: Legacy fulfilled contract is closed once on the next processor run

- **GIVEN** a save whose `pendingFulfilledContractIds` contains contract C, with C absent from `processedFulfilledContractIds` and no payment yet posted
- **WHEN** `contractProcessor` runs (either later today or on the next day advance)
- **THEN** contract C SHALL have its final payment applied to the campaign's finances exactly once
- **AND** faction standing SHALL be updated per the contract's success modifier
- **AND** contract C SHALL be removed from the active contract list and its id moved into `processedFulfilledContractIds`

#### Scenario: Already-posted contract is not re-paid on drain

- **GIVEN** a contract whose id is present in `processedFulfilledContractIds` because its payout already posted at outcome application
- **WHEN** `contractProcessor` runs
- **THEN** the contract SHALL be skipped
- **AND** no additional payment SHALL be credited for that contract

