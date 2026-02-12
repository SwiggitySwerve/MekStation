## ADDED Requirements

### Requirement: Campaign Roster Assignment

The system SHALL allow assigning units and pilots to a campaign roster during campaign creation and from the campaign dashboard.

#### Scenario: Roster step in creation wizard is functional

- **WHEN** the user reaches the roster configuration step in the campaign creation wizard
- **THEN** a unit selection interface SHALL be displayed (not a "coming soon" placeholder)
- **AND** units SHALL be selectable from the compendium via UnitSearchService

#### Scenario: Add unit to campaign roster

- **WHEN** the user clicks "Add Unit" on the campaign roster
- **THEN** the compendium unit selector SHALL open
- **AND** selecting a unit SHALL add it to the campaign's roster
- **AND** the roster SHALL display the unit's name, weight, and BV

#### Scenario: Assign pilot to roster unit

- **WHEN** the user assigns a pilot to a rostered unit
- **THEN** the pilot SHALL be linked to the unit in the campaign forces store
- **AND** the roster SHALL display the pilot's name and skill levels (gunnery/piloting)

#### Scenario: Roster persists between sessions

- **WHEN** the user navigates away from the campaign and returns
- **THEN** the roster assignments SHALL be preserved
- **AND** all unit and pilot assignments SHALL be intact

#### Scenario: Campaign dashboard shows roster

- **WHEN** the user views the campaign dashboard
- **THEN** a roster section SHALL display all assigned units with their pilots and readiness status

### Requirement: Campaign Mission Generation

The system SHALL generate missions from the campaign context that create launchable encounters.

#### Scenario: Generate mission button

- **WHEN** the user clicks "Generate Mission" on the campaign dashboard
- **THEN** a mission setup interface SHALL appear
- **AND** the user SHALL select which roster units to deploy

#### Scenario: Opponent force auto-generated

- **WHEN** a mission is generated
- **THEN** an opponent force SHALL be created using the existing scenario generator
- **AND** the opponent BV SHALL be scaled to the selected roster units' total BV

#### Scenario: Mission creates linked encounter

- **WHEN** a mission is confirmed
- **THEN** an encounter SHALL be created in useEncounterStore linked to the campaign
- **AND** the encounter SHALL have both player and opponent forces assigned
- **AND** a random scenario template SHALL be selected from the 6 available templates

#### Scenario: Navigate to encounter for launch

- **WHEN** the mission encounter is created
- **THEN** navigation SHALL proceed to the encounter detail page
- **AND** the encounter SHALL be launchable via the standard encounter-to-game flow

#### Scenario: Mission counter tracks in campaign

- **WHEN** a mission is generated and launched
- **THEN** the campaign's mission count SHALL increment
- **AND** the mission SHALL appear in the campaign's mission history

### Requirement: Campaign Damage Carry-Forward

The system SHALL apply battle damage back to campaign roster units so damage persists between missions.

#### Scenario: Battle damage applied to roster

- **WHEN** a campaign mission battle completes
- **THEN** the damage state of each participating unit SHALL be read from the game result
- **AND** damage SHALL be written back to the campaign forces store

#### Scenario: Destroyed units marked as lost

- **WHEN** a unit is destroyed in a campaign mission
- **THEN** the unit SHALL be marked as destroyed in the campaign roster
- **AND** the unit SHALL NOT be available for future missions

#### Scenario: Damaged units start next mission with reduced armor

- **WHEN** a damaged (not destroyed) unit is deployed to the next mission
- **THEN** CompendiumAdapter SHALL receive the unit's current damage state as initialDamage
- **AND** the unit SHALL start the battle with reduced armor matching its damage from the previous mission

#### Scenario: Unit readiness displayed on dashboard

- **WHEN** viewing the campaign dashboard roster after a battle
- **THEN** each unit SHALL show readiness status: Ready (no damage), Damaged (has damage but operational), or Destroyed (removed from active roster)

### Requirement: Campaign Battle Loop

The system SHALL support a complete loop: campaign → mission → battle → results → campaign.

#### Scenario: Return to campaign from results

- **WHEN** a campaign mission battle completes and results are displayed
- **THEN** a "Return to Campaign" button SHALL be available
- **AND** clicking it SHALL navigate back to the campaign dashboard with damage applied

#### Scenario: Campaign dashboard updates after battle

- **WHEN** the user returns to the campaign after a battle
- **THEN** the mission count SHALL reflect the completed mission
- **AND** the unit roster SHALL show updated damage/readiness status
- **AND** the mission history section SHALL show the mission outcome

#### Scenario: Multiple consecutive missions

- **WHEN** the user runs 3 consecutive missions
- **THEN** all 3 missions SHALL complete without errors
- **AND** damage SHALL accumulate across missions (no armor reset between missions)
- **AND** the mission history SHALL show 3 entries
