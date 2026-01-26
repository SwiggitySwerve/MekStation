# day-progression Specification

## Purpose
TBD - created by archiving change implement-comprehensive-campaign-system. Update Purpose after archive.
## Requirements
### Requirement: Day Advancement
The system SHALL advance the campaign date by one day and process all daily events including healing, costs, and contract payments.

#### Scenario: Advance date by one day
- **GIVEN** a campaign with currentDate 2025-01-15
- **WHEN** advanceDay is called
- **THEN** currentDate is updated to 2025-01-16

#### Scenario: Process multiple daily events
- **GIVEN** a campaign with wounded personnel, active contracts, and daily costs
- **WHEN** advanceDay is called
- **THEN** healing is processed, contract payments are credited, daily costs are deducted, and a DayReport is returned

#### Scenario: Day report contains all events
- **GIVEN** a day with healing, payments, and costs
- **WHEN** advanceDay is called
- **THEN** DayReport contains personnelHealed count, contractPayments array, dailyCosts total, and date

### Requirement: Personnel Healing
The system SHALL process personnel healing by reducing injury durations and updating status.

#### Scenario: Reduce injury duration
- **GIVEN** a wounded person with injury daysToHeal 14
- **WHEN** advanceDay is called
- **THEN** injury daysToHeal is reduced to 13

#### Scenario: Heal completed injuries
- **GIVEN** a wounded person with injury daysToHeal 1
- **WHEN** advanceDay is called
- **THEN** injury daysToHeal becomes 0 and injury is removed from injuries array

#### Scenario: Return to active status
- **GIVEN** a wounded person with last injury healing (daysToHeal 1) and no other injuries
- **WHEN** advanceDay is called
- **THEN** person status changes to ACTIVE and daysToWaitForHealing is set to 0

#### Scenario: Multiple injuries heal independently
- **GIVEN** a person with 3 injuries having daysToHeal [5, 10, 15]
- **WHEN** advanceDay is called
- **THEN** all injuries have daysToHeal reduced by 1 to [4, 9, 14]

### Requirement: Contract Processing
The system SHALL process active contracts checking for expiration and scheduled payments.

#### Scenario: Credit monthly payment
- **GIVEN** an active contract with monthly payment due today
- **WHEN** advanceDay is called
- **THEN** payment amount is credited to campaign finances and transaction is recorded

#### Scenario: Expire completed contract
- **GIVEN** an active contract with endDate yesterday
- **WHEN** advanceDay is called
- **THEN** contract status changes to SUCCESS or FAILED based on completion

#### Scenario: No payment on non-payment days
- **GIVEN** an active contract with next payment in 15 days
- **WHEN** advanceDay is called
- **THEN** no payment is credited

### Requirement: Daily Costs
The system SHALL calculate and deduct daily costs for salaries and maintenance.

#### Scenario: Calculate salary costs
- **GIVEN** a campaign with 10 active personnel and salaryMultiplier 1.0
- **WHEN** daily costs are calculated
- **THEN** salary cost is 5000 C-bills (10 × 500)

#### Scenario: Calculate maintenance costs
- **GIVEN** a campaign with 8 units and maintenanceCostMultiplier 1.0
- **WHEN** daily costs are calculated
- **THEN** maintenance cost is 800 C-bills (8 × 100)

#### Scenario: Deduct total daily costs
- **GIVEN** a campaign with salary costs 5000 and maintenance costs 800
- **WHEN** advanceDay is called
- **THEN** 5800 C-bills are deducted from campaign balance and transaction is recorded

#### Scenario: Respect campaign options
- **GIVEN** a campaign with payForSalaries false
- **WHEN** daily costs are calculated
- **THEN** salary costs are 0 C-bills

### Requirement: Healing Rate Modifiers
The system SHALL apply healing rate multipliers from campaign options.

#### Scenario: Normal healing rate
- **GIVEN** a campaign with healingRateMultiplier 1.0 and injury daysToHeal 10
- **WHEN** advanceDay is called
- **THEN** injury daysToHeal is reduced by 1 to 9

#### Scenario: Faster healing rate
- **GIVEN** a campaign with healingRateMultiplier 2.0 and injury daysToHeal 10
- **WHEN** advanceDay is called
- **THEN** injury daysToHeal is reduced by 2 to 8

#### Scenario: Slower healing rate
- **GIVEN** a campaign with healingRateMultiplier 0.5 and injury daysToHeal 10
- **WHEN** advanceDay is called
- **THEN** injury daysToHeal is reduced by 0.5 (rounds to 0 or 1 based on implementation)

### Requirement: Cost Multipliers
The system SHALL apply cost multipliers from campaign options to daily expenses.

#### Scenario: Increased salary multiplier
- **GIVEN** a campaign with 10 personnel and salaryMultiplier 1.5
- **WHEN** daily costs are calculated
- **THEN** salary cost is 7500 C-bills (10 × 500 × 1.5)

#### Scenario: Reduced maintenance multiplier
- **GIVEN** a campaign with 8 units and maintenanceCostMultiplier 0.5
- **WHEN** daily costs are calculated
- **THEN** maintenance cost is 400 C-bills (8 × 100 × 0.5)

#### Scenario: Combined multipliers
- **GIVEN** a campaign with salaryMultiplier 1.2 and maintenanceCostMultiplier 0.8
- **WHEN** daily costs are calculated
- **THEN** costs reflect both multipliers applied to base rates

### Requirement: Day Report Generation
The system SHALL generate a comprehensive report of all events that occurred during day advancement.

#### Scenario: Report includes personnel healed
- **GIVEN** a day where 3 personnel complete healing
- **WHEN** advanceDay is called
- **THEN** DayReport.personnelHealed is 3

#### Scenario: Report includes contract payments
- **GIVEN** a day with 2 contract payments totaling 150000 C-bills
- **WHEN** advanceDay is called
- **THEN** DayReport.contractPayments contains 2 payment records

#### Scenario: Report includes daily costs
- **GIVEN** a day with 5800 C-bills in costs
- **WHEN** advanceDay is called
- **THEN** DayReport.dailyCosts is 5800

#### Scenario: Report includes date
- **GIVEN** a day advancement to 2025-01-16
- **WHEN** advanceDay is called
- **THEN** DayReport.date is 2025-01-16

### Requirement: Pure Function Design
The system SHALL implement day advancement as a pure function returning a new campaign state.

#### Scenario: Original campaign unchanged
- **GIVEN** a campaign object
- **WHEN** advanceDay is called
- **THEN** the original campaign object is not mutated

#### Scenario: New campaign returned
- **GIVEN** a campaign object
- **WHEN** advanceDay is called
- **THEN** a new campaign object is returned with updated state

#### Scenario: Deterministic with same inputs
- **GIVEN** identical campaign states
- **WHEN** advanceDay is called on both
- **THEN** identical results are produced

### Requirement: Edge Case Handling
The system SHALL handle edge cases in day advancement gracefully.

#### Scenario: No personnel to heal
- **GIVEN** a campaign with no wounded personnel
- **WHEN** advanceDay is called
- **THEN** healing processing completes without errors and DayReport.personnelHealed is 0

#### Scenario: No active contracts
- **GIVEN** a campaign with no active contracts
- **WHEN** advanceDay is called
- **THEN** contract processing completes without errors and DayReport.contractPayments is empty

#### Scenario: Insufficient funds for costs
- **GIVEN** a campaign with balance 1000 and daily costs 5000
- **WHEN** advanceDay is called
- **THEN** costs are still deducted (balance goes negative) or error is raised based on campaign options

#### Scenario: Permanent injuries do not heal
- **GIVEN** a person with permanent injury (permanent: true)
- **WHEN** advanceDay is called
- **THEN** injury daysToHeal remains unchanged

### Requirement: Test Coverage
The system SHALL have comprehensive test coverage for day advancement logic.

#### Scenario: All event types tested
- **GIVEN** day advancement tests
- **WHEN** tests are run
- **THEN** healing, contract payments, daily costs, and date advancement are all covered

#### Scenario: Edge cases tested
- **GIVEN** day advancement tests
- **WHEN** tests are run
- **THEN** edge cases (no personnel, no contracts, negative balance) are covered

#### Scenario: Integration tests verify end-to-end
- **GIVEN** day advancement integration tests
- **WHEN** tests are run
- **THEN** complete day advancement flow is verified with all systems working together

