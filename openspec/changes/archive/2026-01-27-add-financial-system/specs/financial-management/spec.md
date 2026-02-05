# financial-management Specification Delta

## ADDED Requirements

### Requirement: Role-Based Salary Calculation

The system SHALL calculate monthly salaries based on personnel role and experience level using base salary tables and XP multipliers.

#### Scenario: Calculate pilot salary at regular experience

- **GIVEN** a pilot with regular experience level
- **WHEN** monthly salary is calculated
- **THEN** salary equals base pilot salary (1500 C-bills) × 1.0 XP multiplier = 1500 C-bills

#### Scenario: Calculate pilot salary at elite experience

- **GIVEN** a pilot with elite experience level
- **WHEN** monthly salary is calculated
- **THEN** salary equals base pilot salary (1500 C-bills) × 1.5 XP multiplier = 2250 C-bills

#### Scenario: Apply salary multiplier option

- **GIVEN** a pilot with regular experience and campaign salaryMultiplier 2.0
- **WHEN** monthly salary is calculated
- **THEN** salary equals 1500 × 1.0 × 2.0 = 3000 C-bills

#### Scenario: Calculate secondary role salary

- **GIVEN** a pilot with secondary role tech and payForSecondaryRole enabled
- **WHEN** monthly salary is calculated
- **THEN** salary equals pilot base (1500) + tech base × 0.5 (1000 × 0.5 = 500) = 2000 C-bills

#### Scenario: Calculate total monthly salary for campaign

- **GIVEN** a campaign with 10 personnel of various roles and experience levels
- **WHEN** total monthly salary is calculated
- **THEN** sum of all individual salaries is returned with breakdown by role category

### Requirement: Loan Amortization

The system SHALL calculate monthly loan payments using standard fixed-rate amortization formula.

#### Scenario: Calculate monthly payment for 100,000 C-bill loan

- **GIVEN** a loan of 100,000 C-bills at 5% annual rate for 12 months
- **WHEN** monthly payment is calculated
- **THEN** payment equals approximately 8,560.75 C-bills per month

#### Scenario: Make loan payment

- **GIVEN** an active loan with remaining principal 100,000 C-bills
- **WHEN** a monthly payment is made
- **THEN** payment is split into interest portion and principal portion, remaining principal is reduced, and payments remaining is decremented

#### Scenario: Detect loan paid off

- **GIVEN** a loan with 1 payment remaining
- **WHEN** final payment is made
- **THEN** loan is marked as paid off with remaining principal 0

#### Scenario: Calculate loan default penalty

- **GIVEN** a loan with missed payment
- **WHEN** default penalty is calculated
- **THEN** penalty fee is assessed based on loan terms

### Requirement: Tax Calculation

The system SHALL calculate taxes on campaign profits using a flat tax rate.

#### Scenario: Calculate tax on positive profits

- **GIVEN** a campaign with 10,000 C-bills profit and 10% tax rate
- **WHEN** taxes are calculated
- **THEN** tax amount is 1,000 C-bills

#### Scenario: No tax on negative profits

- **GIVEN** a campaign with -5,000 C-bills profit (loss)
- **WHEN** taxes are calculated
- **THEN** tax amount is 0 C-bills

#### Scenario: No tax when disabled

- **GIVEN** a campaign with useTaxes set to false
- **WHEN** taxes are calculated
- **THEN** tax amount is 0 C-bills

### Requirement: Price Multipliers

The system SHALL apply price multipliers based on tech base and equipment condition.

#### Scenario: Clan equipment price multiplier

- **GIVEN** a Clan unit with base price 1,000,000 C-bills and Clan multiplier 2.0
- **WHEN** unit price is calculated
- **THEN** price is 2,000,000 C-bills

#### Scenario: Mixed tech price multiplier

- **GIVEN** a Mixed tech unit with base price 1,000,000 C-bills and Mixed multiplier 1.5
- **WHEN** unit price is calculated
- **THEN** price is 1,500,000 C-bills

#### Scenario: Used equipment condition multiplier

- **GIVEN** a used unit with base price 1,000,000 C-bills and used multiplier 0.5
- **WHEN** unit price is calculated
- **THEN** price is 500,000 C-bills

#### Scenario: Damaged equipment condition multiplier

- **GIVEN** a damaged unit with base price 1,000,000 C-bills and damaged multiplier 0.33
- **WHEN** unit price is calculated
- **THEN** price is 330,000 C-bills

#### Scenario: Combined tech and condition multipliers

- **GIVEN** a used Clan unit with base price 1,000,000 C-bills
- **WHEN** unit price is calculated
- **THEN** price is 1,000,000 × 2.0 (Clan) × 0.5 (used) = 1,000,000 C-bills

### Requirement: Monthly Overhead Costs

The system SHALL calculate monthly overhead as a percentage of total salary costs.

#### Scenario: Calculate 5% overhead

- **GIVEN** a campaign with total monthly salary 50,000 C-bills and overhead percent 5
- **WHEN** monthly overhead is calculated
- **THEN** overhead is 2,500 C-bills

#### Scenario: Overhead scales with salary

- **GIVEN** a campaign with total monthly salary 100,000 C-bills and overhead percent 5
- **WHEN** monthly overhead is calculated
- **THEN** overhead is 5,000 C-bills

### Requirement: Food and Housing Costs

The system SHALL calculate monthly food and housing costs per person based on rank tier.

#### Scenario: Officer food and housing

- **GIVEN** a commander (officer tier)
- **WHEN** monthly food and housing is calculated
- **THEN** cost is 1,260 C-bills (780 housing + 480 food)

#### Scenario: Enlisted food and housing

- **GIVEN** an enlisted pilot
- **WHEN** monthly food and housing is calculated
- **THEN** cost is 552 C-bills (312 housing + 240 food)

#### Scenario: Prisoner food and housing

- **GIVEN** a prisoner of war
- **WHEN** monthly food and housing is calculated
- **THEN** cost is 348 C-bills (228 housing + 120 food)

#### Scenario: Total food and housing for campaign

- **GIVEN** a campaign with 5 officers, 20 enlisted, and 2 prisoners
- **WHEN** total monthly food and housing is calculated
- **THEN** cost is (5 × 1260) + (20 × 552) + (2 × 348) = 17,736 C-bills

### Requirement: Extended Transaction Types

The system SHALL support 10 additional transaction types for financial operations.

#### Scenario: Record salary transaction

- **GIVEN** monthly salaries are processed
- **WHEN** transaction is recorded
- **THEN** transaction type is Salary with total amount and date

#### Scenario: Record loan payment transaction

- **GIVEN** a loan payment is made
- **WHEN** transaction is recorded
- **THEN** transaction type is LoanPayment with payment amount split into interest and principal

#### Scenario: Record loan disbursement transaction

- **GIVEN** a new loan is created
- **WHEN** transaction is recorded
- **THEN** transaction type is LoanDisbursement with principal amount credited

#### Scenario: Record tax transaction

- **GIVEN** taxes are calculated and paid
- **WHEN** transaction is recorded
- **THEN** transaction type is Tax with tax amount deducted

#### Scenario: Record overhead transaction

- **GIVEN** monthly overhead is processed
- **WHEN** transaction is recorded
- **THEN** transaction type is Overhead with overhead amount deducted

### Requirement: Financial Summary

The system SHALL generate comprehensive financial summaries with income, expenses, and net profit.

#### Scenario: Calculate net profit

- **GIVEN** a campaign with 100,000 C-bills income and 60,000 C-bills expenses
- **WHEN** financial summary is generated
- **THEN** net profit is 40,000 C-bills

#### Scenario: Summary includes all expense categories

- **GIVEN** a campaign with salary, maintenance, loan, and tax expenses
- **WHEN** financial summary is generated
- **THEN** summary includes totals for each expense category and overall total

#### Scenario: Summary includes current balance

- **GIVEN** a campaign with current balance 500,000 C-bills
- **WHEN** financial summary is generated
- **THEN** summary includes balance field with 500,000 C-bills
