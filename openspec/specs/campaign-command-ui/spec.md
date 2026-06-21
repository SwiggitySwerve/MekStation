# campaign-command-ui Specification

## Purpose

Defines Campaign Command UI requirements for Command Navigation Group, Personnel and Hiring Page, Finances and Loans Page, and Contract Market Page, preserving the source-of-truth scope introduced by archived change add-campaign-command-ui.

## Requirements
### Requirement: Command Navigation Group

The system SHALL provide a "Command" campaign-navigation group giving access to
the Personnel & Hiring, Finances & Loans, and Contract Market surfaces from the
campaign dashboard.

#### Scenario: Command surfaces are reachable

- **GIVEN** an open campaign
- **WHEN** the campaign navigation renders
- **THEN** a "Command" group SHALL be present
- **AND** it SHALL link to the Personnel & Hiring, Finances & Loans, and Contract Market pages

### Requirement: Personnel and Hiring Page

The system SHALL provide a Personnel & Hiring page rendering the current
personnel-market candidate pool with per-candidate detail and a hire action that
routes through the existing personnel-management hiring logic.

#### Scenario: Hiring page lists market candidates

- **GIVEN** a campaign whose personnel market has candidates
- **WHEN** the Personnel & Hiring page renders
- **THEN** each candidate SHALL appear with skills, salary, and traits

#### Scenario: Hiring a candidate routes through existing logic

- **GIVEN** a candidate on the Personnel & Hiring page
- **WHEN** the player hires the candidate
- **THEN** the existing personnel-management hiring logic SHALL be invoked
- **AND** the campaign SHALL be marked dirty so the persistence store auto-saves

#### Scenario: Hiring page empty state

- **GIVEN** a campaign whose personnel market is empty this cycle
- **WHEN** the Personnel & Hiring page renders
- **THEN** an empty state SHALL be shown rather than an error

### Requirement: Finances and Loans Page

The system SHALL provide a Finances & Loans page rendering the campaign balance,
the transaction ledger, a daily-cost projection, and a loan surface.

#### Scenario: Finances page shows balance and ledger

- **GIVEN** a campaign with recorded transactions
- **WHEN** the Finances & Loans page renders
- **THEN** the current balance SHALL be shown
- **AND** the transaction ledger from `campaign-finances` SHALL be listed
- **AND** a daily-cost projection SHALL be shown

#### Scenario: Taking a loan credits the balance and records the loan

- **GIVEN** the loan surface with a principal, interest rate, and term entered
- **WHEN** the player takes the loan
- **THEN** the principal SHALL be credited to the balance via a `campaign-finances` transaction
- **AND** an `ICampaignLoan` SHALL be appended with `dailyRepayment` fixed at creation time
- **AND** the campaign SHALL be marked dirty so the persistence store auto-saves

#### Scenario: Loan repayment flows through the daily-cost pipeline

- **GIVEN** an active loan with a non-zero `dailyRepayment`
- **WHEN** the player advances the day
- **THEN** the loan's `dailyRepayment` SHALL be included in the daily cost debited by the existing daily-cost processor
- **AND** the loan's `remainingBalance` SHALL decrease accordingly

#### Scenario: Outstanding loans are listed with their schedule

- **GIVEN** a campaign with one or more active loans
- **WHEN** the Finances & Loans page renders
- **THEN** each active loan SHALL appear with its remaining balance and repayment schedule

### Requirement: Contract Market Page

The system SHALL provide a Contract Market page rendering current contract-market
offers with per-offer detail and accept / decline actions.

#### Scenario: Contract Market lists offers

- **GIVEN** a campaign whose contract market has offers
- **WHEN** the Contract Market page renders
- **THEN** each offer SHALL appear with employer, pay, salvage rights, and duration

#### Scenario: Accepting a contract routes through existing logic

- **GIVEN** an offer on the Contract Market page
- **WHEN** the player accepts it
- **THEN** the existing `mission-contracts` acceptance logic SHALL be invoked
- **AND** the campaign SHALL be marked dirty so the persistence store auto-saves

#### Scenario: Declining a contract hides the offer

- **GIVEN** an offer on the Contract Market page
- **WHEN** the player declines it
- **THEN** the offer SHALL be hidden until the next contract-market refresh

#### Scenario: Contract Market empty state

- **GIVEN** a campaign whose contract market has no offers this cycle
- **WHEN** the Contract Market page renders
- **THEN** an empty state SHALL be shown rather than an error

### Requirement: Command Surface Loading and Error States

The system SHALL implement loading and error states on every command surface
consistent with the existing `campaign-ui` conventions.

#### Scenario: Loading state while command data resolves

- **GIVEN** a campaign whose command data has not yet loaded
- **WHEN** any command surface renders
- **THEN** a loading state SHALL be shown

#### Scenario: Error state on a stale action

- **GIVEN** a hire or accept action on a market entry no longer present
- **WHEN** the action is invoked
- **THEN** the action SHALL fail gracefully with an error state rather than corrupting campaign state

