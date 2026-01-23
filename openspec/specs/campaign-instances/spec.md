# campaign-instances Specification

## Purpose
TBD - created by archiving change add-campaign-instances. Update Purpose after archive.
## Requirements
### Requirement: Campaign Unit Instance

The system SHALL create campaign unit instances when units are assigned to campaign forces.

#### Scenario: Create unit instance on force assignment

- **GIVEN** a vault unit design exists
- **AND** a campaign force exists
- **WHEN** the unit is assigned to the force
- **THEN** a `CampaignUnitInstance` is created
- **AND** the instance references the vault unit ID
- **AND** the instance snapshots the current vault unit version
- **AND** the instance initializes with "operational" status
- **AND** the instance initializes with no damage

#### Scenario: Unit instance properties

- **GIVEN** a campaign unit instance
- **WHEN** accessing its properties
- **THEN** instance MUST have: id, campaignId, vaultUnitId, vaultUnitVersion, status, createdAt
- **AND** instance MUST have: currentDamage (armor, structure, components)
- **AND** instance MAY have: assignedPilotInstanceId

#### Scenario: Instance status values

- **GIVEN** a campaign unit instance
- **WHEN** checking status
- **THEN** status SHALL be one of: 'operational', 'damaged', 'destroyed', 'repairing'

### Requirement: Campaign Pilot Instance

The system SHALL create campaign pilot instances when pilots are assigned to campaigns.

#### Scenario: Create pilot instance from vault pilot

- **GIVEN** a vault pilot template exists
- **WHEN** the pilot is assigned to a campaign
- **THEN** a `CampaignPilotInstance` is created
- **AND** the instance references the vault pilot ID
- **AND** the instance initializes with the pilot's base skills
- **AND** the instance initializes with 0 XP, 0 wounds, 0 kills

#### Scenario: Create statblock pilot instance

- **GIVEN** a campaign needs a quick NPC pilot
- **WHEN** creating a statblock pilot assignment
- **THEN** a `CampaignPilotInstance` is created with no vaultPilotId
- **AND** the pilot data is stored inline in statblockData
- **AND** the instance tracks XP/wounds like a full pilot

#### Scenario: Pilot instance properties

- **GIVEN** a campaign pilot instance
- **WHEN** accessing its properties
- **THEN** instance MUST have: id, campaignId, status, currentXP, wounds, killCount, missionsParticipated
- **AND** instance MUST have EITHER vaultPilotId OR statblockData (not both, not neither)

### Requirement: Instance Damage Tracking

The system SHALL track damage state on campaign unit instances.

#### Scenario: Record damage from battle

- **GIVEN** a unit instance participated in a game
- **AND** the unit took damage
- **WHEN** the game resolves
- **THEN** the instance's currentDamage is updated
- **AND** a `unit_damage_applied` event is emitted
- **AND** the event references the game and instance

#### Scenario: Damage persists between missions

- **GIVEN** a unit instance has damage
- **WHEN** starting a new mission
- **THEN** the unit begins with that damage (unless repaired)
- **AND** the damage is displayed in force selection UI

#### Scenario: Status updates based on damage

- **GIVEN** a unit instance takes damage
- **WHEN** armor is damaged but structure is intact
- **THEN** status changes to 'damaged'
- **WHEN** any location's structure reaches 0
- **THEN** status changes to 'destroyed'

### Requirement: Instance XP Tracking

The system SHALL track experience points on campaign pilot instances.

#### Scenario: Gain XP from mission

- **GIVEN** a pilot instance participated in a mission
- **WHEN** the mission completes successfully
- **THEN** XP is awarded based on participation and kills
- **AND** the instance's currentXP is updated
- **AND** a `pilot_xp_gained` event is emitted

#### Scenario: Track kills

- **GIVEN** a pilot instance destroys an enemy unit
- **WHEN** the destruction is confirmed
- **THEN** the instance's killCount is incremented
- **AND** a `pilot_kill_recorded` event is emitted

#### Scenario: Track mission participation

- **GIVEN** a pilot instance is deployed in a mission
- **WHEN** the mission completes
- **THEN** the instance's missionsParticipated is incremented

### Requirement: Instance Lifecycle Events

The system SHALL emit events for all instance state changes.

#### Scenario: Instance creation event

- **GIVEN** a new campaign instance is created
- **WHEN** the creation completes
- **THEN** a `unit_instance_created` or `pilot_instance_created` event is emitted
- **AND** the event includes the instance ID and initial state

#### Scenario: Instance state change events

- **GIVEN** an instance's state changes (damage, XP, status)
- **WHEN** the change is applied
- **THEN** an appropriate event is emitted
- **AND** the event includes before and after values
- **AND** the event references the causing event (if applicable)

#### Scenario: Instance destruction event

- **GIVEN** a unit or pilot instance is destroyed/deceased
- **WHEN** the destruction occurs
- **THEN** a `unit_destroyed` or `pilot_deceased` event is emitted
- **AND** the instance status is updated but the instance is NOT deleted

