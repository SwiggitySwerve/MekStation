# Personnel Management Specification Delta

## ADDED Requirements

### Requirement: Personnel Status Transitions

The system SHALL support voluntary departure status transitions for personnel who fail turnover checks, transitioning from ACTIVE to either RETIRED (voluntary departure) or DESERTED (negative departure).

#### Scenario: Personnel retires voluntarily

- **GIVEN** an ACTIVE personnel member who fails a turnover check
- **WHEN** the roll result indicates voluntary departure
- **THEN** personnel status transitions to RETIRED
- **AND** departure date is recorded
- **AND** departure reason is set to "Voluntary Retirement"

#### Scenario: Personnel deserts

- **GIVEN** an ACTIVE personnel member who fails a turnover check badly (roll < TN - 4)
- **WHEN** the roll result indicates negative departure
- **THEN** personnel status transitions to DESERTED
- **AND** departure date is recorded
- **AND** departure reason is set to "Desertion"

### Requirement: Departure Tracking

The system SHALL track departure details for personnel who leave the campaign, including departure date, reason, and final payout amount.

#### Scenario: Record departure details

- **GIVEN** a personnel member who has left the campaign
- **WHEN** departure is processed
- **THEN** departure date is set to current campaign date
- **AND** departure reason is recorded
- **AND** payout amount is calculated and recorded as financial transaction
- **AND** personnel record is marked as departed

#### Scenario: Query departed personnel

- **GIVEN** a campaign with historical personnel departures
- **WHEN** querying personnel by status RETIRED or DESERTED
- **THEN** all departed personnel are returned with departure details
- **AND** departure date, reason, and payout are accessible
