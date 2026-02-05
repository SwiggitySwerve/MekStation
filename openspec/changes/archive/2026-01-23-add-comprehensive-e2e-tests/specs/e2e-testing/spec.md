# E2E Testing Specification

## ADDED Requirements

### Requirement: Test Infrastructure

The system SHALL provide test infrastructure for E2E testing including fixtures, helpers, and page objects.

#### Scenario: Test data factory creates valid campaign

- **GIVEN** the test infrastructure is set up
- **WHEN** `createTestCampaign()` is called
- **THEN** a valid campaign with required fields is created in the store

#### Scenario: Page object provides navigation helpers

- **GIVEN** a campaign page object
- **WHEN** `campaignPage.navigateToList()` is called
- **THEN** the browser navigates to `/gameplay/campaigns`

### Requirement: Campaign E2E Tests

The system SHALL have E2E tests covering campaign management flows.

#### Scenario: Create campaign flow

- **GIVEN** the user is on the campaigns page
- **WHEN** the user clicks "Create Campaign" and fills required fields
- **THEN** a new campaign is created and displayed in the list

#### Scenario: Campaign audit timeline

- **GIVEN** a campaign with recorded events exists
- **WHEN** the user views the campaign and clicks "Audit Timeline" tab
- **THEN** the event timeline displays chronologically

### Requirement: Encounter E2E Tests

The system SHALL have E2E tests covering encounter configuration flows.

#### Scenario: Create and configure encounter

- **GIVEN** forces exist in the system
- **WHEN** the user creates an encounter and assigns player/opponent forces
- **THEN** the encounter is ready to launch

#### Scenario: Launch encounter to game

- **GIVEN** a valid encounter with both forces assigned
- **WHEN** the user clicks "Launch"
- **THEN** a game session is created and the user is navigated to the game page

### Requirement: Force Management E2E Tests

The system SHALL have E2E tests covering force creation and management.

#### Scenario: Create force with units

- **GIVEN** units exist in the catalog
- **WHEN** the user creates a force and adds units
- **THEN** the force displays with correct BV calculation

#### Scenario: Assign pilot to unit

- **GIVEN** a force with units and available pilots
- **WHEN** the user assigns a pilot to a unit
- **THEN** the assignment is saved and displayed

### Requirement: Game Session E2E Tests

The system SHALL have E2E tests covering gameplay phases.

#### Scenario: Movement phase

- **GIVEN** a game in the movement phase
- **WHEN** the user selects a unit and clicks a valid hex
- **THEN** the unit moves to the destination

#### Scenario: Combat phase

- **GIVEN** a game in the combat phase with units in range
- **WHEN** the user selects attacker, target, and weapon
- **THEN** the attack is resolved and damage applied

### Requirement: Combat Resolution E2E Tests

The system SHALL have E2E tests verifying combat mechanics.

#### Scenario: Damage application

- **GIVEN** an attack hits a target
- **WHEN** damage is calculated
- **THEN** armor is reduced and critical hits processed if armor breached

#### Scenario: Heat management

- **GIVEN** a unit fires weapons generating heat
- **WHEN** the turn ends
- **THEN** heat dissipation is applied correctly

### Requirement: Repair System E2E Tests

The system SHALL have E2E tests for the repair system.

#### Scenario: View repair options

- **GIVEN** a damaged unit exists
- **WHEN** the user navigates to repair bay
- **THEN** repair options and costs are displayed

### Requirement: Customizer E2E Tests

The system SHALL have E2E tests for unit customization.

#### Scenario: Aerospace customizer

- **GIVEN** the user navigates to aerospace customizer
- **WHEN** the user configures armor and weapons
- **THEN** validation rules are enforced and unit can be saved

#### Scenario: Vehicle customizer

- **GIVEN** the user navigates to vehicle customizer
- **WHEN** the user configures a vehicle
- **THEN** vehicle-specific rules are enforced

#### Scenario: OmniMech configuration

- **GIVEN** an OmniMech is loaded in customizer
- **WHEN** the user switches configurations
- **THEN** pod equipment changes while fixed equipment remains

### Requirement: Awards System E2E Tests

The system SHALL have E2E tests for the awards system.

#### Scenario: View pilot awards

- **GIVEN** a pilot with earned awards
- **WHEN** the user views the pilot detail page
- **THEN** earned awards are displayed with unlock dates

### Requirement: Compendium E2E Tests

The system SHALL have E2E tests for the compendium reference.

#### Scenario: Search units

- **GIVEN** the user is on compendium units page
- **WHEN** the user enters a search term
- **THEN** matching units are displayed

#### Scenario: Filter by weight class

- **GIVEN** the user is on compendium units page
- **WHEN** the user selects "Assault" weight class filter
- **THEN** only assault-class units are shown

### Requirement: Integration Flow Tests

The system SHALL have E2E tests covering cross-feature workflows.

#### Scenario: Full campaign flow

- **GIVEN** a new user session
- **WHEN** the user creates a campaign, starts a mission, completes combat, and repairs units
- **THEN** all systems integrate correctly and state persists

#### Scenario: Unit to force to battle flow

- **GIVEN** a custom unit created in customizer
- **WHEN** the unit is added to a force and used in an encounter
- **THEN** the unit functions correctly in gameplay

### Requirement: Test Stability

All E2E tests SHALL be stable with less than 1% flaky failure rate.

#### Scenario: No flaky tests on clean code

- **GIVEN** all code passes unit tests
- **WHEN** E2E suite is run 10 times consecutively
- **THEN** failure rate is less than 1%

### Requirement: Test Execution Time

The full E2E test suite SHALL complete in under 5 minutes on CI.

#### Scenario: CI execution time

- **GIVEN** CI environment with standard resources
- **WHEN** full E2E suite is executed
- **THEN** total execution time is less than 5 minutes
