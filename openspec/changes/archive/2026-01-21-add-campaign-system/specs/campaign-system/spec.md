# Specification: Campaign System

## ADDED Requirements

### Requirement: Campaign Management

The system SHALL provide campaign creation and management for multi-mission gameplay.

#### Scenario: Create campaign

- **GIVEN** a user wants to start a campaign
- **WHEN** they complete the campaign wizard
- **THEN** a new campaign is created with initial roster
- **AND** the first mission is available

#### Scenario: View campaign progress

- **GIVEN** an active campaign
- **WHEN** viewing the campaign detail page
- **THEN** the mission tree shows completed and available missions
- **AND** the current roster status is displayed
- **AND** campaign resources are shown

#### Scenario: Delete campaign

- **GIVEN** a campaign exists
- **WHEN** the user deletes it
- **THEN** the campaign and all mission data are removed
- **AND** original units/pilots remain in the vault (unaffected)

### Requirement: Mission Progression

The system SHALL track mission outcomes and advance campaign state.

#### Scenario: Complete mission successfully

- **GIVEN** a campaign mission in progress
- **WHEN** the player achieves victory conditions
- **THEN** the mission is marked complete
- **AND** XP is awarded to participating pilots
- **AND** salvage/rewards are added to campaign resources
- **AND** the next mission(s) become available

#### Scenario: Mission failure

- **GIVEN** a campaign mission in progress
- **WHEN** the player fails (retreat, destruction)
- **THEN** the mission is marked failed
- **AND** consequences are applied (unit losses, morale)
- **AND** retry or alternate path may be available

#### Scenario: Branching outcomes

- **GIVEN** a mission with multiple outcome branches
- **WHEN** a specific outcome occurs (e.g., save the convoy)
- **THEN** the campaign branches to the corresponding path
- **AND** unavailable branches are marked locked

### Requirement: Roster State Persistence

The system SHALL maintain unit and pilot state across missions.

#### Scenario: Damage carries forward

- **GIVEN** a unit took damage in the previous mission
- **WHEN** starting the next mission
- **THEN** the unit begins with that damage (unless repaired)
- **AND** the damage is shown in force selection

#### Scenario: Pilot wounds persist

- **GIVEN** a pilot was wounded
- **WHEN** starting the next mission
- **THEN** the pilot has reduced effectiveness
- **OR** is unavailable if critically wounded

#### Scenario: Unit destroyed

- **GIVEN** a unit was destroyed in a mission
- **WHEN** viewing the roster
- **THEN** the unit is marked destroyed
- **AND** may be replaced via salvage or purchase

### Requirement: Pilot Experience

The system SHALL track and apply pilot experience progression.

#### Scenario: Gain XP

- **GIVEN** a pilot participates in a mission
- **WHEN** the mission completes
- **THEN** the pilot gains XP based on participation and kills
- **AND** the XP total is updated

#### Scenario: Skill improvement

- **GIVEN** a pilot reaches an XP threshold
- **WHEN** viewing pilot details
- **THEN** a skill improvement is available
- **AND** the player can choose the upgrade
- **AND** the pilot's stats improve

#### Scenario: Pilot death

- **GIVEN** a pilot dies in a mission
- **WHEN** the campaign continues
- **THEN** the pilot is marked deceased
- **AND** their XP and progress are lost
- **AND** a replacement pilot may be recruited
