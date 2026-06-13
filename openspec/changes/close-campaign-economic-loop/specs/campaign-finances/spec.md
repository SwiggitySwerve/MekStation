# campaign-finances Delta — close-campaign-economic-loop

## MODIFIED Requirements

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

## ADDED Requirements

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
