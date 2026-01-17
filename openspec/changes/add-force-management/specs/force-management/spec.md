# Force Management Specification

## ADDED Requirements

### Requirement: Force Entity Model

The system SHALL define force entities with hierarchical organization.

#### Scenario: Force properties
- **GIVEN** a force entity
- **WHEN** accessing properties
- **THEN** force MUST have: id, name
- **AND** force MAY have: affiliation, parent force, icon

#### Scenario: Force hierarchy
- **GIVEN** a force with sub-forces
- **WHEN** traversing hierarchy
- **THEN** parent-child relationships SHALL be maintained
- **AND** typical hierarchy: Battalion → Company → Lance

#### Scenario: Calculated properties
- **GIVEN** a force with assignments
- **WHEN** calculating totals
- **THEN** totalBV SHALL sum all assigned unit BVs
- **AND** totalTonnage SHALL sum all assigned unit tonnages
- **AND** unitCount SHALL count all assignments

### Requirement: Pilot-Mech Assignment

The system SHALL manage pilot-to-mech assignments within forces.

#### Scenario: Create assignment
- **GIVEN** a force, a pilot, and a mech
- **WHEN** creating assignment
- **THEN** pilot SHALL be linked to mech within force
- **AND** pilot cannot be assigned to multiple mechs in same force
- **AND** mech cannot have multiple pilots in same force

#### Scenario: Assignment with statblock pilot
- **GIVEN** a force needing quick NPC
- **WHEN** creating assignment with statblock pilot
- **THEN** statblock pilot definition stored inline
- **AND** no database reference created for pilot

#### Scenario: Remove assignment
- **GIVEN** an existing assignment
- **WHEN** removing assignment
- **THEN** pilot and mech are unlinked
- **AND** both remain available for other assignments

### Requirement: Force CRUD Operations

The system SHALL provide complete force management operations.

#### Scenario: Create force
- **GIVEN** force configuration (name, optional parent)
- **WHEN** creating force
- **THEN** unique ID SHALL be assigned
- **AND** force SHALL be persisted to database

#### Scenario: Update force
- **GIVEN** an existing force
- **WHEN** modifying properties or assignments
- **THEN** changes SHALL be persisted
- **AND** calculated properties SHALL update

#### Scenario: Delete force
- **GIVEN** an existing force
- **WHEN** deleting force
- **THEN** force SHALL be removed from database
- **AND** child forces SHALL be orphaned or deleted (configurable)
- **AND** assignments SHALL be removed

#### Scenario: Clone force
- **GIVEN** an existing force
- **WHEN** cloning force
- **THEN** new force created with same structure
- **AND** assignments reference same pilots/mechs
- **AND** new force has unique ID and modified name

### Requirement: Force Validation

The system SHALL validate force composition.

#### Scenario: Lance composition warning
- **GIVEN** a force designated as lance
- **WHEN** validating composition
- **THEN** warn if unit count != 4 (standard lance)
- **AND** allow override (non-standard lances exist)

#### Scenario: Mixed tech base warning
- **GIVEN** a force with mixed Inner Sphere and Clan units
- **WHEN** validating composition
- **THEN** warn about mixed tech base
- **AND** allow (Mixed Tech is valid configuration)

#### Scenario: BV imbalance warning
- **GIVEN** two opposing forces for encounter
- **WHEN** comparing BV totals
- **THEN** warn if imbalance exceeds threshold (e.g., 20%)
- **AND** show imbalance percentage

### Requirement: Force Persistence

Forces SHALL be stored and retrieved from database.

#### Scenario: Save force
- **GIVEN** a configured force
- **WHEN** saving to database
- **THEN** force properties SHALL be stored
- **AND** assignments SHALL be stored
- **AND** hierarchy relationships SHALL be stored

#### Scenario: Load force
- **GIVEN** a force ID
- **WHEN** loading from database
- **THEN** all force properties SHALL be restored
- **AND** assignments SHALL include resolved pilot/mech data
- **AND** child forces SHALL be loadable

#### Scenario: Force list query
- **GIVEN** user viewing force roster
- **WHEN** querying forces
- **THEN** all user's forces SHALL be returned
- **AND** summary info (name, unit count, BV) included
- **AND** pagination supported for large rosters
