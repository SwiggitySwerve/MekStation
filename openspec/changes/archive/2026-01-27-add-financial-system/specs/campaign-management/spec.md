# campaign-management Specification Delta

## MODIFIED Requirements

### Requirement: Campaign Options
The system SHALL support 54 configurable campaign options organized by category (personnel, financial, combat, force, general), including 14 new financial expansion options.

#### Scenario: Default options are sensible
- **GIVEN** createDefaultCampaignOptions is called
- **WHEN** the options are inspected
- **THEN** healingRateMultiplier is 1.0, salaryMultiplier is 1.0, startingFunds is 0, useAutoResolve is false, maxUnitsPerLance is 4, useRoleBasedSalaries is true, useLoanSystem is true, useTaxes is false, and all 54 options have valid default values

#### Scenario: Options can be partially overridden
- **GIVEN** a user provides partial options {startingFunds: 5000000, salaryMultiplier: 2.0, useRoleBasedSalaries: false}
- **WHEN** createCampaign is called with these options
- **THEN** the campaign has startingFunds 5000000, salaryMultiplier 2.0, useRoleBasedSalaries false, with all other options set to defaults

#### Scenario: Options affect campaign behavior
- **GIVEN** a campaign with payForSalaries set to false
- **WHEN** day advancement processes daily costs
- **THEN** no salary transactions are recorded

#### Scenario: Financial options control cost processing
- **GIVEN** a campaign with useRoleBasedSalaries set to true
- **WHEN** day advancement processes monthly costs on 1st of month
- **THEN** role-based salaries are calculated and deducted, and daily cost processor is skipped for salaries

#### Scenario: Loan system options
- **GIVEN** a campaign with useLoanSystem set to true and maxLoanPercent 50
- **WHEN** maximum loan amount is calculated
- **THEN** max loan is 50% of total campaign asset value

#### Scenario: Tax options
- **GIVEN** a campaign with useTaxes set to true and taxRate 10
- **WHEN** taxes are calculated on positive profits
- **THEN** 10% of profits are deducted as taxes

#### Scenario: Price multiplier options
- **GIVEN** a campaign with clanPriceMultiplier 2.0 and usedEquipmentMultiplier 0.5
- **WHEN** equipment prices are calculated
- **THEN** Clan equipment costs 2.0× base price and used equipment costs 0.5× base price
