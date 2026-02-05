# day-progression Specification Delta

## MODIFIED Requirements

### Requirement: Day Advancement

The system SHALL advance the campaign date by one day using a plugin/registry architecture where processors self-register and execute in deterministic phase order, including monthly financial processing on the 1st of each month.

#### Scenario: Advance date by one day

- **GIVEN** a campaign with currentDate 2025-01-15
- **WHEN** advanceDay is called
- **THEN** currentDate is updated to 2025-01-16

#### Scenario: Process multiple daily events via pipeline

- **GIVEN** a campaign with wounded personnel, active contracts, and daily costs
- **WHEN** advanceDay is called
- **THEN** the day pipeline processes all registered processors in phase order, healing is processed, contract payments are credited, daily costs are deducted, and a DayReport is returned

#### Scenario: Day report contains all events

- **GIVEN** a day with healing, payments, and costs
- **WHEN** advanceDay is called
- **THEN** DayReport contains personnelHealed count, contractPayments array, dailyCosts total, date, and allEvents array from all processors

#### Scenario: Process monthly financial events on 1st of month

- **GIVEN** a campaign with currentDate 2025-01-31 and useRoleBasedSalaries enabled
- **WHEN** advanceDay is called
- **THEN** currentDate is updated to 2025-02-01, monthly salaries are processed, overhead is calculated, food and housing costs are deducted, loan payments are made, and taxes are calculated

#### Scenario: Skip monthly financial processing on non-1st days

- **GIVEN** a campaign with currentDate 2025-01-15 and useRoleBasedSalaries enabled
- **WHEN** advanceDay is called
- **THEN** monthly financial processing is skipped and only daily maintenance costs are processed

## ADDED Requirements

### Requirement: Monthly Financial Processing

The system SHALL process monthly financial events on the 1st of each month when role-based salaries are enabled.

#### Scenario: Process monthly salaries

- **GIVEN** a campaign with 10 personnel and useRoleBasedSalaries enabled on 1st of month
- **WHEN** financial processor executes
- **THEN** role-based salaries are calculated for all active personnel and deducted from balance

#### Scenario: Process monthly overhead

- **GIVEN** a campaign with total monthly salary 50,000 C-bills and overhead percent 5 on 1st of month
- **WHEN** financial processor executes
- **THEN** overhead of 2,500 C-bills is deducted from balance

#### Scenario: Process food and housing costs

- **GIVEN** a campaign with 10 personnel on 1st of month
- **WHEN** financial processor executes
- **THEN** food and housing costs are calculated per person based on rank tier and deducted from balance

#### Scenario: Process loan payments

- **GIVEN** a campaign with 2 active loans on 1st of month
- **WHEN** financial processor executes
- **THEN** monthly payments for both loans are deducted from balance and loan balances are updated

#### Scenario: Process taxes

- **GIVEN** a campaign with positive profits and useTaxes enabled on 1st of month
- **WHEN** financial processor executes
- **THEN** taxes are calculated on profits and deducted from balance

#### Scenario: Financial events appear in day report

- **GIVEN** a campaign with monthly financial processing on 1st of month
- **WHEN** advanceDay is called
- **THEN** DayReport contains financial events for salaries, overhead, food/housing, loans, and taxes

### Requirement: Daily Cost Processor Gating

The system SHALL gate the existing daily cost processor to prevent double-deduction when role-based salaries are enabled.

#### Scenario: Daily cost processor skips salaries when role-based enabled

- **GIVEN** a campaign with useRoleBasedSalaries set to true
- **WHEN** daily cost processor executes
- **THEN** salary costs are NOT deducted (handled by monthly financial processor instead)

#### Scenario: Daily cost processor continues maintenance costs

- **GIVEN** a campaign with useRoleBasedSalaries set to true
- **WHEN** daily cost processor executes
- **THEN** daily maintenance costs are still calculated and deducted

#### Scenario: Daily cost processor works normally when role-based disabled

- **GIVEN** a campaign with useRoleBasedSalaries set to false
- **WHEN** daily cost processor executes
- **THEN** both salary and maintenance costs are calculated and deducted as before (fallback mode)
