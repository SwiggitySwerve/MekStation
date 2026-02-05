# Force Hierarchy Specification

## ADDED Requirements

### Requirement: Force Entity

The system SHALL represent military forces with hierarchical tree structure including parent/child relationships and unit assignments.

#### Scenario: Create force with required fields

- **GIVEN** a user provides id, name, forceType, and formationLevel
- **WHEN** a force object is created
- **THEN** the force has id, name, empty subForceIds array, empty unitIds array, forceType STANDARD, formationLevel LANCE, and no parentForceId

#### Scenario: Force has parent-child relationships

- **GIVEN** a force with parentForceId "force-parent"
- **WHEN** the force is inspected
- **THEN** parentForceId is "force-parent" indicating this force is a child

#### Scenario: Force contains sub-forces

- **GIVEN** a force with subForceIds ["force-1", "force-2", "force-3"]
- **WHEN** the force is inspected
- **THEN** the force has 3 child forces

### Requirement: Force Tree Traversal

The system SHALL provide tree traversal functions with circular reference protection.

#### Scenario: Get all parent forces

- **GIVEN** a lance with parent company and grandparent battalion
- **WHEN** getAllParents is called
- **THEN** an array containing [company, battalion] is returned in order

#### Scenario: Get all sub-forces recursively

- **GIVEN** a battalion with 3 companies each containing 3 lances
- **WHEN** getAllSubForces is called
- **THEN** all 12 forces (3 companies + 9 lances) are returned

#### Scenario: Circular reference protection

- **GIVEN** a malformed force tree with force-A → force-B → force-A
- **WHEN** getAllSubForces is called
- **THEN** traversal stops at the circular reference and returns visited forces without infinite loop

### Requirement: Unit Assignment

The system SHALL track unit assignments to forces with unit ID references.

#### Scenario: Assign units to force

- **GIVEN** a force with empty unitIds
- **WHEN** unitIds is set to ["unit-1", "unit-2", "unit-3", "unit-4"]
- **THEN** the force contains 4 unit references

#### Scenario: Get all units from force tree

- **GIVEN** a battalion with units distributed across sub-forces
- **WHEN** getAllUnits is called
- **THEN** all unit IDs from the entire tree are returned without duplicates

#### Scenario: Units reference existing unit store

- **GIVEN** a force with unitIds ["unit-001"]
- **WHEN** the unit is retrieved
- **THEN** the unit data comes from MekStation's unit store (no duplication)

### Requirement: Force Types and Formation Levels

The system SHALL support 8 force types and 8 formation levels per BattleTech canon.

#### Scenario: Force has type

- **GIVEN** a force with forceType RECON
- **WHEN** the force is inspected
- **THEN** forceType is RECON indicating reconnaissance role

#### Scenario: Force has formation level

- **GIVEN** a force with formationLevel COMPANY
- **WHEN** the force is inspected
- **THEN** formationLevel is COMPANY indicating 12-unit formation

#### Scenario: Formation levels follow BattleTech canon

- **GIVEN** formation levels are defined
- **WHEN** the levels are inspected
- **THEN** LANCE (4 units), COMPANY (12 units), BATTALION (36 units), REGIMENT (108 units) are available

### Requirement: Commander Assignment

The system SHALL track force commanders by person ID.

#### Scenario: Assign commander to force

- **GIVEN** a force with no commander
- **WHEN** commanderId is set to "person-commander-001"
- **THEN** the force has commander "person-commander-001"

#### Scenario: Commander is optional

- **GIVEN** a force is created without commander
- **WHEN** the force is inspected
- **THEN** commanderId is undefined

#### Scenario: Commander references personnel

- **GIVEN** a force with commanderId "person-001"
- **WHEN** the commander is retrieved
- **THEN** the person data comes from campaign personnel Map

### Requirement: Force Store CRUD Operations

The system SHALL provide CRUD operations for force management.

#### Scenario: Add force to store

- **GIVEN** a forces store exists
- **WHEN** addForce is called with a force object
- **THEN** the force is added and retrievable by ID

#### Scenario: Remove force from store

- **GIVEN** a forces store with force ID "force-001"
- **WHEN** removeForce is called with "force-001"
- **THEN** the force is removed and no longer retrievable

#### Scenario: Update force in store

- **GIVEN** a forces store with force ID "force-001"
- **WHEN** updateForce is called with updated fields
- **THEN** the force is updated and changes are persisted

#### Scenario: Get force by ID

- **GIVEN** a forces store with force ID "force-001"
- **WHEN** getForce is called with "force-001"
- **THEN** the force object is returned

### Requirement: Force Tree Operations

The system SHALL provide tree-specific operations for force hierarchy management.

#### Scenario: Get sub-forces

- **GIVEN** a force with subForceIds ["force-1", "force-2"]
- **WHEN** getSubForces is called
- **THEN** an array of 2 force objects is returned

#### Scenario: Get force units

- **GIVEN** a force with unitIds ["unit-1", "unit-2", "unit-3"]
- **WHEN** getForceUnits is called
- **THEN** an array of 3 unit IDs is returned

#### Scenario: Get root force

- **GIVEN** a forces store with root force having no parentForceId
- **WHEN** getRootForce is called
- **THEN** the root force is returned

### Requirement: Force Hierarchy Validation

The system SHALL validate force tree structure to prevent invalid relationships.

#### Scenario: Prevent self-reference

- **GIVEN** a force with id "force-001"
- **WHEN** attempting to set parentForceId to "force-001"
- **THEN** the operation is rejected or validation fails

#### Scenario: Detect orphaned forces

- **GIVEN** a force with parentForceId "force-999" that doesn't exist
- **WHEN** getAllParents is called
- **THEN** traversal stops and returns empty array

#### Scenario: Handle missing sub-forces

- **GIVEN** a force with subForceIds ["force-1", "force-999"]
- **WHEN** getSubForces is called
- **THEN** only existing force "force-1" is returned

### Requirement: Force Store Persistence

The system SHALL persist force data to IndexedDB with key "mekstation:campaign:{id}:forces".

#### Scenario: Forces persist to IndexedDB

- **GIVEN** a forces store with 10 forces
- **WHEN** the store is saved
- **THEN** all forces are written to IndexedDB with the correct key

#### Scenario: Forces restore from IndexedDB

- **GIVEN** force data exists in IndexedDB
- **WHEN** the forces store is loaded
- **THEN** all forces are restored with complete tree structure

#### Scenario: Force updates are persisted

- **GIVEN** a forces store with force "force-001"
- **WHEN** the force is updated and store is saved
- **THEN** the updated data is persisted to IndexedDB

### Requirement: Immutable Force Fields

The system SHALL use readonly fields on IForce interface to prevent accidental mutations.

#### Scenario: Force fields are readonly

- **GIVEN** an IForce interface
- **WHEN** the interface is inspected
- **THEN** all fields (id, name, parentForceId, subForceIds, unitIds) are marked readonly

#### Scenario: Arrays are readonly

- **GIVEN** a force with subForceIds array
- **WHEN** the array is inspected
- **THEN** it is marked as readonly string[]

#### Scenario: Updates require new objects

- **GIVEN** a force object
- **WHEN** a field needs to be updated
- **THEN** a new force object must be created with the updated field

### Requirement: Full Name Generation

The system SHALL generate hierarchical full names for forces showing the complete path.

#### Scenario: Generate full name for nested force

- **GIVEN** a lance "Alpha Lance" in company "1st Company" in battalion "Wolf Battalion"
- **WHEN** getFullName is called
- **THEN** "Alpha Lance, 1st Company, Wolf Battalion" is returned

#### Scenario: Root force has simple name

- **GIVEN** a root force "Wolf's Dragoons"
- **WHEN** getFullName is called
- **THEN** "Wolf's Dragoons" is returned

#### Scenario: Handle missing parents in path

- **GIVEN** a force with parentForceId pointing to non-existent force
- **WHEN** getFullName is called
- **THEN** only the force's own name is returned

### Requirement: Timestamp Tracking

The system SHALL track creation and update timestamps for forces in ISO 8601 format.

#### Scenario: Force has creation timestamp

- **GIVEN** a force is created
- **WHEN** the force is inspected
- **THEN** createdAt field contains an ISO 8601 timestamp string

#### Scenario: Force has update timestamp

- **GIVEN** a force is updated
- **WHEN** the force is inspected
- **THEN** updatedAt field contains an ISO 8601 timestamp string

#### Scenario: Timestamps are ISO 8601 format

- **GIVEN** a force with timestamps
- **WHEN** the timestamps are parsed
- **THEN** they are valid ISO 8601 strings
