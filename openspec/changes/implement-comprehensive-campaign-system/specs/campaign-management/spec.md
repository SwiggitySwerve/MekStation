# Campaign Management Specification

## ADDED Requirements

### Requirement: Campaign Creation
The system SHALL create a new campaign with default values for all required fields including personnel, forces, missions, and finances.

#### Scenario: Create campaign with minimal parameters
- **GIVEN** a user provides campaign name "First Company" and faction ID "davion"
- **WHEN** createCampaign is called
- **THEN** a campaign is created with unique ID, name, faction, current date set to now, empty personnel Map, empty forces Map, empty missions Map, zero balance, and default options

#### Scenario: Create campaign with custom options
- **GIVEN** a user provides name, faction, and custom options (startingFunds: 10000000, salaryMultiplier: 1.5)
- **WHEN** createCampaign is called
- **THEN** a campaign is created with custom options merged with defaults, and starting balance set to 10000000 C-bills

#### Scenario: Campaign has unique root force
- **GIVEN** a campaign is created
- **WHEN** the campaign is inspected
- **THEN** the campaign has a rootForceId field with a unique force ID

### Requirement: Campaign Persistence
The system SHALL persist campaign state to IndexedDB and restore it on reload.

#### Scenario: Campaign persists to IndexedDB
- **GIVEN** a campaign has been created with personnel, forces, and missions
- **WHEN** the campaign store is saved
- **THEN** the campaign data is written to IndexedDB with key "mekstation:campaign:{id}"

#### Scenario: Campaign restores from IndexedDB
- **GIVEN** a campaign exists in IndexedDB
- **WHEN** the campaign store is loaded
- **THEN** the campaign data is restored with all fields intact including Maps converted from arrays

#### Scenario: Sub-stores persist independently
- **GIVEN** a campaign with personnel, forces, and missions
- **WHEN** the campaign is saved
- **THEN** personnel persists to "mekstation:campaign:{id}:personnel", forces to "mekstation:campaign:{id}:forces", and missions to "mekstation:campaign:{id}:missions"

### Requirement: Campaign Options
The system SHALL support 40 configurable campaign options organized by category (personnel, financial, combat, force, general).

#### Scenario: Default options are sensible
- **GIVEN** createDefaultCampaignOptions is called
- **WHEN** the options are inspected
- **THEN** healingRateMultiplier is 1.0, salaryMultiplier is 1.0, startingFunds is 0, useAutoResolve is false, maxUnitsPerLance is 4, and all 40 options have valid default values

#### Scenario: Options can be partially overridden
- **GIVEN** a user provides partial options {startingFunds: 5000000, salaryMultiplier: 2.0}
- **WHEN** createCampaign is called with these options
- **THEN** the campaign has startingFunds 5000000 and salaryMultiplier 2.0, with all other options set to defaults

#### Scenario: Options affect campaign behavior
- **GIVEN** a campaign with payForSalaries set to false
- **WHEN** day advancement processes daily costs
- **THEN** no salary transactions are recorded

### Requirement: Personnel Management
The system SHALL manage campaign personnel with CRUD operations and queries by status, role, and unit assignment.

#### Scenario: Add personnel to campaign
- **GIVEN** a campaign exists
- **WHEN** a person is added to campaign.personnel Map
- **THEN** the person is retrievable by ID and appears in getTotalPersonnel count

#### Scenario: Query active personnel
- **GIVEN** a campaign with 5 ACTIVE personnel and 2 WOUNDED personnel
- **WHEN** getActivePersonnel is called
- **THEN** 5 personnel are returned with status ACTIVE

#### Scenario: Query personnel by status
- **GIVEN** a campaign with personnel in various statuses
- **WHEN** getPersonnelByStatus(campaign, PersonnelStatus.WOUNDED) is called
- **THEN** only personnel with WOUNDED status are returned

### Requirement: Force Hierarchy Management
The system SHALL manage hierarchical force organization with tree traversal and unit assignment.

#### Scenario: Add force to campaign
- **GIVEN** a campaign exists
- **WHEN** a force is added to campaign.forces Map
- **THEN** the force is retrievable by ID and appears in getTotalForces count

#### Scenario: Get root force
- **GIVEN** a campaign with rootForceId set to "force-root"
- **WHEN** getRootForce is called
- **THEN** the force with ID "force-root" is returned

#### Scenario: Get all units from campaign
- **GIVEN** a campaign with force tree containing units ["unit-1", "unit-2", "unit-3"]
- **WHEN** getAllUnits is called
- **THEN** all 3 unit IDs are returned without duplicates

### Requirement: Mission Management
The system SHALL manage campaign missions with CRUD operations and queries by status.

#### Scenario: Add mission to campaign
- **GIVEN** a campaign exists
- **WHEN** a mission is added to campaign.missions Map
- **THEN** the mission is retrievable by ID and appears in getTotalMissions count

#### Scenario: Query active missions
- **GIVEN** a campaign with 3 ACTIVE missions and 2 SUCCESS missions
- **WHEN** getActiveMissions is called
- **THEN** 3 missions are returned with status ACTIVE

#### Scenario: Query missions by status
- **GIVEN** a campaign with missions in various statuses
- **WHEN** getMissionsByStatus(campaign, MissionStatus.SUCCESS) is called
- **THEN** only missions with SUCCESS status are returned

### Requirement: Financial Tracking
The system SHALL track campaign finances with transaction history and current balance.

#### Scenario: Get campaign balance
- **GIVEN** a campaign with finances.balance set to 1000000 C-bills
- **WHEN** getBalance is called
- **THEN** a Money object with 1000000 C-bills is returned

#### Scenario: Starting funds from options
- **GIVEN** a campaign is created with startingFunds option set to 5000000
- **WHEN** the campaign is inspected
- **THEN** finances.balance equals 5000000 C-bills

#### Scenario: Transactions are recorded
- **GIVEN** a campaign with finances.transactions array
- **WHEN** transactions are added
- **THEN** the transactions array contains all transaction records with type, amount, date, and description

### Requirement: Campaign Store Composition
The system SHALL compose independent sub-stores for personnel, forces, and missions within the campaign store.

#### Scenario: Sub-stores are accessible
- **GIVEN** a campaign store is created
- **WHEN** the store is accessed
- **THEN** personnel, forces, and missions sub-stores are available with their own CRUD methods

#### Scenario: Sub-stores operate independently
- **GIVEN** a campaign store with sub-stores
- **WHEN** personnel.addPerson is called
- **THEN** the person is added to personnel sub-store without affecting forces or missions sub-stores

#### Scenario: Sub-stores share campaign ID
- **GIVEN** a campaign store is created with campaignId "campaign-001"
- **WHEN** sub-stores are inspected
- **THEN** all sub-stores use "campaign-001" as their persistence key prefix

### Requirement: Type Guards and Validation
The system SHALL provide type guards for runtime type checking of campaign entities.

#### Scenario: Validate campaign object
- **GIVEN** an object with all required campaign fields
- **WHEN** isCampaign is called
- **THEN** true is returned

#### Scenario: Reject invalid campaign object
- **GIVEN** an object missing required fields (e.g., no personnel Map)
- **WHEN** isCampaign is called
- **THEN** false is returned

#### Scenario: Validate campaign options
- **GIVEN** an object with all required option fields
- **WHEN** isCampaignOptions is called
- **THEN** true is returned

### Requirement: Helper Functions
The system SHALL provide helper functions for common campaign queries and operations.

#### Scenario: Get person by ID
- **GIVEN** a campaign with person ID "person-001" in personnel Map
- **WHEN** getPersonById(campaign, "person-001") is called
- **THEN** the person object is returned

#### Scenario: Get force by ID
- **GIVEN** a campaign with force ID "force-001" in forces Map
- **WHEN** getForceById(campaign, "force-001") is called
- **THEN** the force object is returned

#### Scenario: Get mission by ID
- **GIVEN** a campaign with mission ID "mission-001" in missions Map
- **WHEN** getMissionById(campaign, "mission-001") is called
- **THEN** the mission object is returned

#### Scenario: Return undefined for missing entity
- **GIVEN** a campaign without person ID "person-999"
- **WHEN** getPersonById(campaign, "person-999") is called
- **THEN** undefined is returned

### Requirement: Immutable Entity Pattern
The system SHALL use readonly fields on all campaign entity interfaces to prevent accidental mutations.

#### Scenario: Campaign fields are readonly
- **GIVEN** an ICampaign interface
- **WHEN** the interface is inspected
- **THEN** all fields (id, name, currentDate, personnel, forces, missions, finances, options) are marked readonly

#### Scenario: Nested objects are readonly
- **GIVEN** an ICampaignOptions interface
- **WHEN** the interface is inspected
- **THEN** all option fields are marked readonly

#### Scenario: Updates require new objects
- **GIVEN** a campaign object
- **WHEN** a field needs to be updated
- **THEN** a new campaign object must be created with the updated field (TypeScript prevents direct mutation)

### Requirement: Map-Based Storage
The system SHALL use Map<string, T> for all entity collections to enable O(1) lookups.

#### Scenario: Personnel stored in Map
- **GIVEN** a campaign is created
- **WHEN** the campaign.personnel field is inspected
- **THEN** it is a Map<string, IPerson> instance

#### Scenario: Forces stored in Map
- **GIVEN** a campaign is created
- **WHEN** the campaign.forces field is inspected
- **THEN** it is a Map<string, IForce> instance

#### Scenario: Missions stored in Map
- **GIVEN** a campaign is created
- **WHEN** the campaign.missions field is inspected
- **THEN** it is a Map<string, IMission> instance

#### Scenario: O(1) lookup performance
- **GIVEN** a campaign with 100 personnel
- **WHEN** getPersonById is called
- **THEN** the person is retrieved in constant time O(1) regardless of Map size

### Requirement: Timestamp Tracking
The system SHALL track creation and update timestamps for campaigns in ISO 8601 format.

#### Scenario: Campaign has creation timestamp
- **GIVEN** a campaign is created
- **WHEN** the campaign is inspected
- **THEN** createdAt field contains an ISO 8601 timestamp string

#### Scenario: Campaign has update timestamp
- **GIVEN** a campaign is created
- **WHEN** the campaign is inspected
- **THEN** updatedAt field contains an ISO 8601 timestamp string

#### Scenario: Timestamps are ISO 8601 format
- **GIVEN** a campaign with timestamps
- **WHEN** the timestamps are parsed
- **THEN** they are valid ISO 8601 strings (e.g., "2026-01-26T10:00:00.000Z")
