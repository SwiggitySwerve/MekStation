# contract-types Specification Delta

## ADDED Requirements

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
