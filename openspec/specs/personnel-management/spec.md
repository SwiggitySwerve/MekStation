# personnel-management Specification

## Purpose
TBD - created by archiving change implement-comprehensive-campaign-system. Update Purpose after archive.
## Requirements
### Requirement: Person Entity
The system SHALL represent campaign personnel with 45 MVP fields including identity, status, roles, skills, attributes, injuries, and career tracking.

#### Scenario: Create person with required fields
- **GIVEN** a user provides id, name, status, primaryRole, and rank
- **WHEN** a person object is created
- **THEN** the person has all required fields populated with id, name, status ACTIVE, primaryRole PILOT, rank "MechWarrior", empty injuries array, zero hits, and default attributes

#### Scenario: Person has identity fields
- **GIVEN** a person is created with name "John Smith" and callsign "Hammer"
- **WHEN** the person is inspected
- **THEN** name is "John Smith", callsign is "Hammer", and optional fields (givenName, surname, gender) are available

#### Scenario: Person has career tracking
- **GIVEN** a person with missionsCompleted 12 and totalKills 8
- **WHEN** the person completes a mission with 2 kills
- **THEN** missionsCompleted increments to 13 and totalKills increments to 10

### Requirement: Personnel Status Management
The system SHALL track personnel status with 10 status values (ACTIVE, WOUNDED, KIA, MIA, RETIRED, ON_LEAVE, POW, AWOL, DESERTED, STUDENT).

#### Scenario: Active personnel are available for duty
- **GIVEN** a person with status ACTIVE
- **WHEN** isActive helper is called
- **THEN** true is returned

#### Scenario: Wounded personnel are unavailable
- **GIVEN** a person with status WOUNDED
- **WHEN** isActive helper is called
- **THEN** false is returned

#### Scenario: Status transitions are tracked
- **GIVEN** a person with status ACTIVE
- **WHEN** the person is wounded in combat
- **THEN** status changes to WOUNDED and daysToWaitForHealing is set based on injury severity

### Requirement: Personnel Roles
The system SHALL support 10 campaign personnel roles (PILOT, AEROSPACE_PILOT, VEHICLE_DRIVER, TECH, DOCTOR, MEDIC, ADMIN, SUPPORT, SOLDIER, UNASSIGNED).

#### Scenario: Person has primary role
- **GIVEN** a person is created with primaryRole PILOT
- **WHEN** the person is inspected
- **THEN** primaryRole is PILOT

#### Scenario: Person can have secondary role
- **GIVEN** a person with primaryRole PILOT and secondaryRole TECH
- **WHEN** the person is inspected
- **THEN** both roles are available for assignment and skill tracking

#### Scenario: Role determines available skills
- **GIVEN** a person with primaryRole TECH
- **WHEN** skills are assigned
- **THEN** tech-related skills (repair, maintenance) are available

### Requirement: Injury Tracking
The system SHALL track personnel injuries with type, location, severity, healing duration, and permanence.

#### Scenario: Person sustains injury
- **GIVEN** a person with zero injuries
- **WHEN** an injury is added with type "Broken Arm", severity 2, daysToHeal 14
- **THEN** the injury appears in injuries array with all fields populated

#### Scenario: Injuries heal over time
- **GIVEN** a person with injury having daysToHeal 14
- **WHEN** day advancement processes healing
- **THEN** daysToHeal decrements by 1 each day until reaching 0

#### Scenario: Permanent injuries do not heal
- **GIVEN** a person with permanent injury (permanent: true)
- **WHEN** day advancement processes healing
- **THEN** the injury remains with daysToHeal unchanged

#### Scenario: Multiple injuries are tracked
- **GIVEN** a person with 3 injuries of varying severity
- **WHEN** the person is inspected
- **THEN** all 3 injuries are present in injuries array with unique IDs

### Requirement: Skills and Attributes

The system SHALL track personnel skills and attributes with 7 core attributes (STR, BOD, REF, DEX, INT, WIL, CHA) plus Edge. The system SHALL support a comprehensive skill catalog of 40+ skill types organized into six categories: combat, technical, medical, administrative, physical, and knowledge. Each skill has a base target number, XP cost progression (10 levels), and a linked attribute that modifies skill checks and improvement costs.

#### Scenario: Person has default attributes
- **GIVEN** a person is created with createDefaultAttributes
- **WHEN** the person is inspected
- **THEN** all 7 attributes are set to 5 and Edge is set to 0

#### Scenario: Attributes affect skill modifiers
- **GIVEN** a person with REF 7 (modifier +2)
- **WHEN** a piloting skill check is made
- **THEN** the attribute modifier of +2 is applied to the target number
- **AND** the linked attribute (DEX for piloting) also affects XP costs

#### Scenario: Skills track level and XP progress
- **GIVEN** a person with gunnery skill level 4
- **WHEN** XP is spent to improve the skill
- **THEN** xpProgress increments and level increases when threshold is reached
- **AND** the improvement cost is calculated from the skill catalog's cost array

#### Scenario: Skill catalog provides 40+ skill types
- **GIVEN** the skill system is initialized
- **WHEN** querying the skill catalog
- **THEN** the system provides 40+ skill type definitions
- **AND** each skill type includes: id, name, description, targetNumber, costs[10], linkedAttribute
- **AND** skills are organized into categories: combat (11), technical (6), medical (3), administrative (5), physical (6), knowledge (9)

#### Scenario: Unskilled personnel use penalty target number
- **GIVEN** a person without a specific skill
- **WHEN** attempting a skill check for that skill
- **THEN** the target number is base TN + 4 (typically 11)
- **AND** the person can still attempt the check without the skill

### Requirement: Experience and Progression
The system SHALL track XP with current pool, total earned, and spent amounts.

#### Scenario: Person earns XP from mission
- **GIVEN** a person with xp 100 and totalXpEarned 500
- **WHEN** the person completes a mission earning 50 XP
- **THEN** xp increases to 150 and totalXpEarned increases to 550

#### Scenario: Person spends XP on skills
- **GIVEN** a person with xp 100 and xpSpent 400
- **WHEN** the person spends 50 XP on a skill
- **THEN** xp decreases to 50 and xpSpent increases to 450

#### Scenario: XP pool cannot go negative
- **GIVEN** a person with xp 30
- **WHEN** attempting to spend 50 XP
- **THEN** the operation is rejected or xp remains at 30

### Requirement: Unit Assignment
The system SHALL track personnel assignment to units, forces, doctors, and tech responsibilities.

#### Scenario: Person assigned to unit
- **GIVEN** a person with no unit assignment
- **WHEN** unitId is set to "unit-001"
- **THEN** the person is assigned to unit "unit-001"

#### Scenario: Wounded person assigned to doctor
- **GIVEN** a person with status WOUNDED
- **WHEN** doctorId is set to "person-doctor-001"
- **THEN** the person is under care of doctor "person-doctor-001"

#### Scenario: Tech assigned to multiple units
- **GIVEN** a person with primaryRole TECH
- **WHEN** techUnitIds is set to ["unit-001", "unit-002", "unit-003"]
- **THEN** the tech is responsible for maintaining 3 units

### Requirement: Personnel Store CRUD Operations
The system SHALL provide CRUD operations for personnel management (add, remove, update, get).

#### Scenario: Add person to store
- **GIVEN** a personnel store exists
- **WHEN** addPerson is called with a person object
- **THEN** the person is added to the store and retrievable by ID

#### Scenario: Remove person from store
- **GIVEN** a personnel store with person ID "person-001"
- **WHEN** removePerson is called with "person-001"
- **THEN** the person is removed and no longer retrievable

#### Scenario: Update person in store
- **GIVEN** a personnel store with person ID "person-001"
- **WHEN** updatePerson is called with updated fields
- **THEN** the person is updated and changes are persisted

#### Scenario: Get person by ID
- **GIVEN** a personnel store with person ID "person-001"
- **WHEN** getPerson is called with "person-001"
- **THEN** the person object is returned

### Requirement: Personnel Query Operations
The system SHALL provide query operations to filter personnel by status, role, and unit assignment.

#### Scenario: Get personnel by status
- **GIVEN** a personnel store with 5 ACTIVE and 2 WOUNDED personnel
- **WHEN** getByStatus(PersonnelStatus.ACTIVE) is called
- **THEN** 5 personnel with ACTIVE status are returned

#### Scenario: Get personnel by role
- **GIVEN** a personnel store with 8 PILOT and 3 TECH personnel
- **WHEN** getByRole(CampaignPersonnelRole.PILOT) is called
- **THEN** 8 personnel with PILOT role are returned

#### Scenario: Get personnel by unit
- **GIVEN** a personnel store with 4 personnel assigned to "unit-001"
- **WHEN** getByUnit("unit-001") is called
- **THEN** 4 personnel assigned to that unit are returned

#### Scenario: Get active personnel
- **GIVEN** a personnel store with mixed statuses
- **WHEN** getActivePersonnel is called
- **THEN** only personnel with ACTIVE status are returned

### Requirement: Personnel Store Persistence
The system SHALL persist personnel data to IndexedDB with key "mekstation:campaign:{id}:personnel".

#### Scenario: Personnel persists to IndexedDB
- **GIVEN** a personnel store with 10 personnel
- **WHEN** the store is saved
- **THEN** all personnel are written to IndexedDB with the correct key

#### Scenario: Personnel restores from IndexedDB
- **GIVEN** personnel data exists in IndexedDB
- **WHEN** the personnel store is loaded
- **THEN** all personnel are restored with complete data including injuries array and attributes

#### Scenario: Personnel updates are persisted
- **GIVEN** a personnel store with person "person-001"
- **WHEN** the person is updated and store is saved
- **THEN** the updated data is persisted to IndexedDB

### Requirement: Backwards Compatibility with Pilot
The system SHALL maintain backwards compatibility with existing IPilot interface.

#### Scenario: Person includes pilot skills
- **GIVEN** a person is created
- **WHEN** the person is inspected
- **THEN** pilotSkills field contains gunnery and piloting values

#### Scenario: Pilot can be upgraded to Person
- **GIVEN** an existing pilot object
- **WHEN** the pilot is converted to person
- **THEN** all pilot fields are preserved and campaign fields are added with defaults

#### Scenario: Person works with existing pilot systems
- **GIVEN** a person object
- **WHEN** used in existing pilot-related code
- **THEN** the person functions as a pilot with gunnery and piloting skills accessible

### Requirement: Immutable Person Fields
The system SHALL use readonly fields on IPerson interface to prevent accidental mutations.

#### Scenario: Person fields are readonly
- **GIVEN** an IPerson interface
- **WHEN** the interface is inspected
- **THEN** all fields (id, name, status, skills, attributes, injuries) are marked readonly

#### Scenario: Nested objects are readonly
- **GIVEN** a person with injuries array
- **WHEN** the injuries field is inspected
- **THEN** it is marked as readonly IInjury[]

#### Scenario: Updates require new objects
- **GIVEN** a person object
- **WHEN** a field needs to be updated
- **THEN** a new person object must be created with the updated field (TypeScript prevents direct mutation)

### Requirement: Person Helper Functions
The system SHALL provide helper functions for common person operations and queries.

#### Scenario: Check if person is active
- **GIVEN** a person with status ACTIVE
- **WHEN** isActive(person) is called
- **THEN** true is returned

#### Scenario: Check if person is wounded
- **GIVEN** a person with status WOUNDED
- **WHEN** isActive(person) is called
- **THEN** false is returned

#### Scenario: Create default attributes
- **GIVEN** createDefaultAttributes is called
- **WHEN** the result is inspected
- **THEN** all 7 attributes are 5 and Edge is 0

### Requirement: Timestamp Tracking
The system SHALL track creation and update timestamps for personnel in ISO 8601 format.

#### Scenario: Person has creation timestamp
- **GIVEN** a person is created
- **WHEN** the person is inspected
- **THEN** createdAt field contains an ISO 8601 timestamp string

#### Scenario: Person has update timestamp
- **GIVEN** a person is updated
- **WHEN** the person is inspected
- **THEN** updatedAt field contains an ISO 8601 timestamp string reflecting the update time

#### Scenario: Timestamps are ISO 8601 format
- **GIVEN** a person with timestamps
- **WHEN** the timestamps are parsed
- **THEN** they are valid ISO 8601 strings (e.g., "2026-01-26T10:00:00.000Z")

