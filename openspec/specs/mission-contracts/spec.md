# mission-contracts Specification

## Purpose

TBD - created by archiving change implement-comprehensive-campaign-system. Update Purpose after archive.

## Requirements

### Requirement: Mission Entity

The system SHALL represent missions with id, name, status, system location, and scenario references.

#### Scenario: Create mission with required fields

- **GIVEN** a user provides id, name, and systemId
- **WHEN** a mission is created
- **THEN** the mission has id, name, status PENDING, systemId, empty scenarioIds array, and type "mission"

#### Scenario: Mission has status transitions

- **GIVEN** a mission with status ACTIVE
- **WHEN** the mission is completed successfully
- **THEN** status changes to SUCCESS

#### Scenario: Mission contains scenarios

- **GIVEN** a mission with scenarioIds ["scenario-1", "scenario-2"]
- **WHEN** the mission is inspected
- **THEN** the mission references 2 scenarios

### Requirement: Contract Entity

The system SHALL extend IContract with AtB-specific fields including contract type, ops tempo, and parts availability modifier.

#### Scenario: Contract has AtB type

- **GIVEN** a new AtB contract
- **WHEN** the contract is created
- **THEN** atbContractType field contains one of 19 AtB types

#### Scenario: Legacy contracts remain compatible

- **GIVEN** an existing contract without atbContractType
- **WHEN** the contract is loaded
- **THEN** contract functions correctly with default values

### Requirement: Scenario Entity

The system SHALL represent individual battle scenarios with deployed forces and objectives.

#### Scenario: Create scenario with deployment

- **GIVEN** a user provides id, name, and missionId
- **WHEN** a scenario is created
- **THEN** the scenario has id, name, status PENDING, missionId, empty deployedForceIds array, and empty objectives array

#### Scenario: Deploy forces to scenario

- **GIVEN** a scenario with empty deployedForceIds
- **WHEN** forces ["force-1", "force-2"] are deployed
- **THEN** deployedForceIds contains ["force-1", "force-2"]

#### Scenario: Scenario has objectives

- **GIVEN** a scenario with objectives ["Destroy enemy lance", "Capture base"]
- **WHEN** the scenario is inspected
- **THEN** 2 objectives are present

### Requirement: Payment Terms

The system SHALL track contract payment terms including base payment, salvage rights, command rights, and transport compensation.

#### Scenario: Payment terms have base payment

- **GIVEN** payment terms with basePayment 5000000 C-bills
- **WHEN** the terms are inspected
- **THEN** basePayment is a Money object with 5000000 C-bills

#### Scenario: Payment terms have salvage percentage

- **GIVEN** payment terms with salvagePercent 50
- **WHEN** salvage is collected worth 100000 C-bills
- **THEN** player receives 50000 C-bills

#### Scenario: Payment terms have command rights

- **GIVEN** payment terms with commandRights "Independent"
- **WHEN** the terms are inspected
- **THEN** commandRights indicates player has tactical independence

### Requirement: Contract Market Generation

The system SHALL generate contracts using all 19 AtB types with type-specific properties.

#### Scenario: Market offers all 19 types

- **GIVEN** contract market generation
- **WHEN** contracts are generated
- **THEN** all 19 AtB types are available in the pool

#### Scenario: Contract has type-specific length

- **GIVEN** a PLANETARY_ASSAULT contract
- **WHEN** the contract is generated
- **THEN** length is calculated using variable length formula

### Requirement: Mission Store CRUD Operations

The system SHALL provide CRUD operations for mission and contract management.

#### Scenario: Add mission to store

- **GIVEN** a missions store exists
- **WHEN** addMission is called with a mission object
- **THEN** the mission is added and retrievable by ID

#### Scenario: Remove mission from store

- **GIVEN** a missions store with mission ID "mission-001"
- **WHEN** removeMission is called with "mission-001"
- **THEN** the mission is removed and no longer retrievable

#### Scenario: Update mission in store

- **GIVEN** a missions store with mission ID "mission-001"
- **WHEN** updateMission is called with updated status
- **THEN** the mission status is updated and persisted

### Requirement: Mission Query Operations

The system SHALL provide query operations to filter missions by status and type.

#### Scenario: Get active missions

- **GIVEN** a missions store with 3 ACTIVE and 2 SUCCESS missions
- **WHEN** getActiveMissions is called
- **THEN** 3 missions with ACTIVE status are returned

#### Scenario: Get active contracts

- **GIVEN** a missions store with 2 active contracts and 1 active mission
- **WHEN** getActiveContracts is called
- **THEN** 2 contracts are returned (missions with type "contract")

#### Scenario: Get completed missions

- **GIVEN** a missions store with missions in various statuses
- **WHEN** getCompletedMissions is called
- **THEN** only missions with SUCCESS, FAILED, or BREACH status are returned

### Requirement: Scenario Management

The system SHALL manage scenarios within missions including deployment and status updates.

#### Scenario: Add scenario to mission

- **GIVEN** a mission with empty scenarioIds
- **WHEN** addScenario is called with a scenario
- **THEN** the scenario ID is added to mission's scenarioIds array

#### Scenario: Update scenario status

- **GIVEN** a scenario with status PENDING
- **WHEN** updateScenarioStatus is called with VICTORY
- **THEN** scenario status changes to VICTORY

#### Scenario: Deploy forces to scenario

- **GIVEN** a scenario with empty deployedForceIds
- **WHEN** deployForces is called with ["force-1", "force-2"]
- **THEN** deployedForceIds is updated to ["force-1", "force-2"]

### Requirement: Mission Store Persistence

The system SHALL persist mission data to IndexedDB with key "mekstation:campaign:{id}:missions".

#### Scenario: Missions persist to IndexedDB

- **GIVEN** a missions store with 5 missions
- **WHEN** the store is saved
- **THEN** all missions are written to IndexedDB with the correct key

#### Scenario: Missions restore from IndexedDB

- **GIVEN** mission data exists in IndexedDB
- **WHEN** the missions store is loaded
- **THEN** all missions are restored with complete data including scenarios

#### Scenario: Contract payment terms persist

- **GIVEN** a contract with payment terms
- **WHEN** the contract is saved and restored
- **THEN** payment terms including Money objects are correctly serialized and deserialized

### Requirement: Type Guards

The system SHALL provide type guards to distinguish between missions and contracts.

#### Scenario: Identify contract

- **GIVEN** a contract object
- **WHEN** isContract type guard is called
- **THEN** true is returned

#### Scenario: Identify mission

- **GIVEN** a mission object (not contract)
- **WHEN** isContract type guard is called
- **THEN** false is returned

#### Scenario: Type narrowing works

- **GIVEN** a mission or contract union type
- **WHEN** isContract is used in conditional
- **THEN** TypeScript narrows type to IContract in true branch

### Requirement: Immutable Mission Fields

The system SHALL use readonly fields on mission interfaces to prevent accidental mutations.

#### Scenario: Mission fields are readonly

- **GIVEN** an IMission interface
- **WHEN** the interface is inspected
- **THEN** all fields (id, name, status, scenarioIds) are marked readonly

#### Scenario: Contract fields are readonly

- **GIVEN** an IContract interface
- **WHEN** the interface is inspected
- **THEN** all fields including paymentTerms are marked readonly

#### Scenario: Updates require new objects

- **GIVEN** a mission object
- **WHEN** a field needs to be updated
- **THEN** a new mission object must be created with the updated field

### Requirement: Timestamp Tracking

The system SHALL track creation and update timestamps for missions in ISO 8601 format.

#### Scenario: Mission has creation timestamp

- **GIVEN** a mission is created
- **WHEN** the mission is inspected
- **THEN** createdAt field contains an ISO 8601 timestamp string

#### Scenario: Mission has update timestamp

- **GIVEN** a mission is updated
- **WHEN** the mission is inspected
- **THEN** updatedAt field contains an ISO 8601 timestamp string

#### Scenario: Timestamps are ISO 8601 format

- **GIVEN** a mission with timestamps
- **WHEN** the timestamps are parsed
- **THEN** they are valid ISO 8601 strings

### Requirement: Combat Team Assignment

The system SHALL support assigning forces to combat roles for scenario generation.

#### Scenario: Assign force to combat role

- **GIVEN** a force in an active campaign
- **WHEN** assigning the force to a combat team
- **THEN** the combat team has: forceId, role, battleChance
- **AND** role is one of the 7 CombatRole values
- **AND** battleChance is the base percentage for that role

#### Scenario: Multiple combat teams per contract

- **GIVEN** a contract with multiple assigned forces
- **WHEN** viewing combat teams
- **THEN** each force can have its own combat role
- **AND** each team independently checks for battles weekly

#### Scenario: Combat team battle chance

- **GIVEN** a combat team with role Patrol (60% base chance)
- **WHEN** checking for weekly battle
- **THEN** roll d100 and compare to 60
- **AND** roll ≤ 60 generates a scenario
- **AND** roll > 60 skips scenario generation
