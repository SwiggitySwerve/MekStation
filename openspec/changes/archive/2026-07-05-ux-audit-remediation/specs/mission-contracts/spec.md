# mission-contracts Delta Specification

## ADDED Requirements

### Requirement: Mission Launch Affordance

The campaign missions page SHALL expose a launch action on every mission card whose status permits launch (ACTIVE), navigating to that mission's launch page (`/gameplay/campaigns/<campaignId>/missions/<missionId>/launch`). The launch page MUST NOT be reachable only by direct URL entry.

#### Scenario: Active mission card offers launch

- **GIVEN** a campaign with an ACTIVE mission (an accepted contract offer)
- **WHEN** the user views the campaign Missions page
- **THEN** the mission card SHALL render a launch action (button or link) for that mission
- **AND** activating it SHALL navigate to the mission launch page for that mission

#### Scenario: Non-launchable mission hides launch action

- **GIVEN** a campaign with a COMPLETED mission
- **WHEN** the user views the campaign Missions page
- **THEN** the mission card SHALL NOT render a launch action

### Requirement: Contract Offer Economic Viability

Generated contract market offers SHALL carry a positive base payment derived from contract type and duration, and the displayed salvage rights SHALL be self-consistent with the offer's salvage percentage.

#### Scenario: Generated offers pay non-zero base pay

- **GIVEN** a campaign with contract market offers generated
- **WHEN** the offers are inspected
- **THEN** every offer's basePayment SHALL be greater than 0 C-bills

#### Scenario: Salvage display matches salvage percentage

- **GIVEN** a generated offer with salvagePercent 43
- **WHEN** the offer's salvage rights are displayed
- **THEN** the display SHALL reflect the 43 percent salvage share and SHALL NOT read "None"

#### Scenario: Salvage None means zero percent

- **GIVEN** a generated offer displayed with salvage rights "None"
- **WHEN** the offer's payment terms are inspected
- **THEN** salvagePercent SHALL be 0
