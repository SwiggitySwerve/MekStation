# campaign-finances Specification

## Purpose

Defines Campaign Finances requirements for Money Value Object, Money Arithmetic Operations, Money Formatting, and Money Comparison, preserving the source-of-truth scope introduced by archived change implement-comprehensive-campaign-system.
## Requirements
### Requirement: Money Value Object

The system SHALL represent monetary amounts as an immutable Money class storing cents to prevent floating-point errors.

#### Scenario: Create money from C-bills

- **GIVEN** an amount of 1234.56 C-bills
- **WHEN** new Money(1234.56) is created
- **THEN** Money object stores 123456 cents internally

#### Scenario: Money arithmetic is immutable

- **GIVEN** Money objects m1 (1000 C-bills) and m2 (500 C-bills)
- **WHEN** m1.add(m2) is called
- **THEN** a new Money object with 1500 C-bills is returned and m1 remains 1000 C-bills

#### Scenario: No floating-point errors

- **GIVEN** Money objects for 0.1 and 0.2 C-bills
- **WHEN** they are added together
- **THEN** result is exactly 0.3 C-bills (not 0.30000000000000004)

### Requirement: Money Arithmetic Operations

The system SHALL provide arithmetic operations (add, subtract, multiply, divide) that return new Money instances.

#### Scenario: Add money amounts

- **GIVEN** Money(1000) and Money(500)
- **WHEN** add is called
- **THEN** Money(1500) is returned

#### Scenario: Subtract money amounts

- **GIVEN** Money(1000) and Money(300)
- **WHEN** subtract is called
- **THEN** Money(700) is returned

#### Scenario: Multiply by scalar

- **GIVEN** Money(100) and multiplier 1.5
- **WHEN** multiply is called
- **THEN** Money(150) is returned

#### Scenario: Divide by scalar

- **GIVEN** Money(1000) and divisor 4
- **WHEN** divide is called
- **THEN** Money(250) is returned

### Requirement: Money Formatting

The system SHALL format money amounts as human-readable strings with thousand separators.

#### Scenario: Format with thousand separators

- **GIVEN** Money(1234567.89)
- **WHEN** format is called
- **THEN** "1,234,567.89 C-bills" is returned

#### Scenario: Format with two decimal places

- **GIVEN** Money(100)
- **WHEN** format is called
- **THEN** "100.00 C-bills" is returned

#### Scenario: Format negative amounts

- **GIVEN** Money(-500.50)
- **WHEN** format is called
- **THEN** "-500.50 C-bills" is returned

### Requirement: Money Comparison

The system SHALL provide comparison methods for money amounts.

#### Scenario: Compare equal amounts

- **GIVEN** Money(1000) and Money(1000)
- **WHEN** equals is called
- **THEN** true is returned

#### Scenario: Compare greater than

- **GIVEN** Money(1500) and Money(1000)
- **WHEN** compareTo is called
- **THEN** 1 is returned (first is greater)

#### Scenario: Compare less than

- **GIVEN** Money(500) and Money(1000)
- **WHEN** compareTo is called
- **THEN** -1 is returned (first is less)

### Requirement: Money Predicates

The system SHALL provide predicate methods for common money checks.

#### Scenario: Check if zero

- **GIVEN** Money(0)
- **WHEN** isZero is called
- **THEN** true is returned

#### Scenario: Check if positive

- **GIVEN** Money(100)
- **WHEN** isPositive is called
- **THEN** true is returned

#### Scenario: Check if negative

- **GIVEN** Money(-50)
- **WHEN** isNegative is called
- **THEN** true is returned

### Requirement: Transaction Recording

The system SHALL record financial transactions with type, amount, date, and description.

#### Scenario: Record income transaction

- **GIVEN** a transaction with type CONTRACT_PAYMENT, amount 100000, and description "Monthly payment"
- **WHEN** recordTransaction is called
- **THEN** transaction is added to finances.transactions array

#### Scenario: Record expense transaction

- **GIVEN** a transaction with type SALARY, amount -5000, and description "Daily salaries"
- **WHEN** recordTransaction is called
- **THEN** transaction is added with negative amount

#### Scenario: Transaction has timestamp

- **GIVEN** a transaction is recorded
- **WHEN** the transaction is inspected
- **THEN** it has a date field with ISO 8601 timestamp

### Requirement: Balance Calculation

The system SHALL calculate current balance from all transactions.

#### Scenario: Calculate balance from transactions

- **GIVEN** transactions [+100000, -5000, -800, +50000]
- **WHEN** getBalance is called
- **THEN** balance is 144200 C-bills

#### Scenario: Empty transactions have zero balance

- **GIVEN** no transactions
- **WHEN** getBalance is called
- **THEN** balance is 0 C-bills

#### Scenario: Balance reflects all transaction types

- **GIVEN** transactions of various types (income, expenses, salvage)
- **WHEN** getBalance is called
- **THEN** balance is sum of all transaction amounts

### Requirement: Daily Cost Calculation

The system SHALL calculate daily costs for salaries and maintenance based on
campaign state. Per-person salary SHALL include the personnel rank pay
multiplier (the dominant MekHQ salary driver) in addition to the experience-level
multiplier and any secondary-role base, so that two personnel of the same
experience level but different rank SHALL be billed different salaries.

#### Scenario: Calculate salary costs

- **GIVEN** 10 active personnel with base salary 500 C-bills/day
- **WHEN** calculateDailyCosts is called
- **THEN** salary cost is 5000 C-bills

#### Scenario: Calculate maintenance costs

- **GIVEN** 8 units with base maintenance 100 C-bills/day
- **WHEN** calculateDailyCosts is called
- **THEN** maintenance cost is 800 C-bills

#### Scenario: Apply cost multipliers

- **GIVEN** 10 personnel, salaryMultiplier 1.5, 8 units, maintenanceCostMultiplier 0.8
- **WHEN** calculateDailyCosts is called
- **THEN** total cost is (10 × 500 × 1.5) + (8 × 100 × 0.8) = 8140 C-bills

#### Scenario: Rank multiplier raises senior personnel salary

- **GIVEN** two personnel of the same experience level, one holding a senior rank with a
  rank pay multiplier above 1.0 and one at the base rank
- **WHEN** calculateDailyCosts is called
- **THEN** the senior-rank person's salary contribution SHALL be the base experience-level
  salary multiplied by the rank pay multiplier
- **AND** it SHALL exceed the base-rank person's salary contribution.

### Requirement: Contract Payment Processing

The system SHALL process contract payments crediting amounts to campaign finances.

#### Scenario: Credit contract payment

- **GIVEN** a contract with monthly payment 50000 C-bills
- **WHEN** processContractPayment is called
- **THEN** 50000 C-bills are added to balance and transaction is recorded

#### Scenario: Payment includes description

- **GIVEN** a contract payment
- **WHEN** processContractPayment is called
- **THEN** transaction description includes contract name and payment type

#### Scenario: Multiple payments are tracked

- **GIVEN** multiple contracts with payments
- **WHEN** processContractPayment is called for each
- **THEN** all payments are recorded as separate transactions

### Requirement: Transaction Types

The system SHALL support 10 transaction types for categorizing financial activity.

#### Scenario: Contract payment transaction

- **GIVEN** a contract payment
- **WHEN** transaction is recorded
- **THEN** type is CONTRACT_PAYMENT

#### Scenario: Salary transaction

- **GIVEN** daily salary costs
- **WHEN** transaction is recorded
- **THEN** type is SALARY

#### Scenario: Maintenance transaction

- **GIVEN** daily maintenance costs
- **WHEN** transaction is recorded
- **THEN** type is MAINTENANCE

#### Scenario: Salvage transaction

- **GIVEN** battle salvage
- **WHEN** transaction is recorded
- **THEN** type is SALVAGE

### Requirement: Financial Service

The system SHALL provide a FinanceService with methods for all financial operations.

#### Scenario: Service records transactions

- **GIVEN** FinanceService instance
- **WHEN** recordTransaction is called
- **THEN** transaction is added to finances

#### Scenario: Service calculates balance

- **GIVEN** FinanceService instance with transactions
- **WHEN** getBalance is called
- **THEN** correct balance is returned

#### Scenario: Service calculates daily costs

- **GIVEN** FinanceService instance and campaign state
- **WHEN** calculateDailyCosts is called
- **THEN** total daily costs are returned

### Requirement: Immutable Finances

The system SHALL use readonly fields on IFinances interface to prevent accidental mutations.

#### Scenario: Finances fields are readonly

- **GIVEN** an IFinances interface
- **WHEN** the interface is inspected
- **THEN** transactions array and balance are marked readonly

#### Scenario: Updates require new objects

- **GIVEN** a finances object
- **WHEN** a transaction needs to be added
- **THEN** a new finances object must be created with the updated transactions array

#### Scenario: Money objects are immutable

- **GIVEN** a Money object in finances
- **WHEN** operations are performed
- **THEN** new Money objects are returned and original is unchanged

### Requirement: Test Coverage

The system SHALL have comprehensive test coverage for financial operations.

#### Scenario: Money class fully tested

- **GIVEN** Money class tests
- **WHEN** tests are run
- **THEN** all arithmetic, comparison, and formatting operations are covered

#### Scenario: Transaction recording tested

- **GIVEN** FinanceService tests
- **WHEN** tests are run
- **THEN** all transaction types and recording scenarios are covered

#### Scenario: Balance calculation tested

- **GIVEN** balance calculation tests
- **WHEN** tests are run
- **THEN** various transaction combinations and edge cases are covered

#### Scenario: Edge cases tested

- **GIVEN** financial tests
- **WHEN** tests are run
- **THEN** edge cases (zero balance, negative balance, large amounts, rounding) are covered

### Requirement: Parts Acquisition Delivery Destination

When an acquisition request reaches its delivery date, the system SHALL increment
the campaign parts inventory by the delivered part(s), not merely flip the
request's status to `delivered`. A part purchased with C-bills SHALL become a
usable asset that the repair-ticket completion processor can consume.

#### Scenario: A delivered part enters the inventory

- **GIVEN** an in-transit acquisition request whose delivery date has arrived
- **WHEN** the acquisition processor processes deliveries
- **THEN** the request status SHALL become `delivered`
- **AND** the campaign parts inventory SHALL be incremented by the delivered part(s).

#### Scenario: A delivered part is consumable by repair

- **GIVEN** a delivered acquisition part now in the parts inventory and a repair ticket
  requiring that part
- **WHEN** the repair-progress processor advances the ticket
- **THEN** the ticket SHALL be able to consume the delivered part from the inventory to
  reach completion.

### Requirement: GM Funds Transaction Correction Proof

Campaign finances SHALL remain covered by the Wave 8 campaign ledger QC proof for GM funds transaction corrections, including merchant reversal scenarios.

#### Scenario: Funds correction proof covers net balance and transaction history

- **GIVEN** a GM reverses or corrects a campaign funds transaction
- **WHEN** the campaign ledger QC validator runs
- **THEN** it SHALL validate focused test anchors proving the resulting balance and transaction history are projected before approval and applied only after approval

### Requirement: Travel and time cost projection
Campaign finances SHALL project travel fees, daily upkeep, payroll, loan, maintenance, repair, and other configured time-passage costs before travel or time cascade commands are committed.

#### Scenario: Travel preview shows funds delta
- **WHEN** a travel preview spans one or more days
- **THEN** the preview SHALL show itemized expected costs and the projected funds balance after arrival

#### Scenario: Committed ledger matches preview
- **WHEN** travel or time passage is committed
- **THEN** the finance ledger and activity entries SHALL match the previewed cost categories or record an explicit drift/reconciliation warning
