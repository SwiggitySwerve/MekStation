# contract-types — Delta for reconcile-campaign-economy-surfaces

## MODIFIED Requirements

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
