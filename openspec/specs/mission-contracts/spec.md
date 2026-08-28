# mission-contracts Specification

## Purpose

Defines Mission Contracts requirements for Mission Entity, Contract Entity, Scenario Entity, and Payment Terms, preserving the source-of-truth scope introduced by archived change implement-comprehensive-campaign-system.
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

### Requirement: Mission readiness projection

Mission launch SHALL use an explicit readiness projection that includes mission constraints, eligible units, ineligible units, pilot readiness, selected roster, unresolved blockers, launch consequences, parsed unit source, and canonical catalog readiness. The shared source/reference guard SHALL run before encounter diagnostics, lookup, reuse, routing, or mutation.

#### Scenario: Launch gate blocks invalid roster

- **WHEN** the selected roster violates mission constraints, unit readiness, source identity, or exact-reference rules
- **THEN** mission launch SHALL be blocked and SHALL show each blocking reason before encounter materialization can run
- **AND** no encounter lookup, persisted `scenarioIds` reuse result, route call, or state mutation SHALL occur

#### Scenario: Encounter receives selected roster

- **WHEN** the player confirms a roster whose canonical sources resolve exactly in a ready catalog
- **THEN** encounter materialization SHALL receive the selected campaign roster units and SHALL NOT silently replace missing or invalid campaign units with stock fallback units

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

### Requirement: Roster unit source parsing is fail-closed

Persisted campaign roster units SHALL use the closed source values `canonical` or `custom`. Only an absent legacy source SHALL normalize to `canonical`; every present unknown value SHALL remain invalid, non-launchable, and unchanged in persistence.

#### Scenario: Absent legacy source resolves canonical

- **WHEN** a legacy roster unit has a valid canonical `unitRef` and no persisted source field
- **THEN** source parsing SHALL return the legacy canonical resolution
- **AND** readiness MAY resolve the exact canonical reference

#### Scenario: Explicit source remains authoritative

- **WHEN** a roster unit persists `canonical` or `custom`
- **THEN** parsing SHALL preserve that exact source
- **AND** the system MUST NOT infer a different source from its `unitRef`

#### Scenario: Unknown source cannot downgrade

- **WHEN** a roster unit has a present unknown, malformed, forged, or stale source value
- **THEN** it SHALL remain invalid and non-launchable
- **AND** validation MUST NOT rewrite, omit, or normalize it to `canonical`

### Requirement: Canonical combat catalog readiness is explicit

Campaign launch SHALL consume one runtime-only canonical catalog snapshot in state `loading`, `ready`, or `unavailable`. Browser loading SHALL validate `/api/units?includeBV=true`; Node fast-forward loading SHALL use `NodeCanonicalUnitService`; failure MUST NOT become an empty successful catalog.

#### Scenario: Ready catalog resolves an exact reference

- **WHEN** a canonical roster unit's exact `unitRef` exists in a ready catalog
- **THEN** readiness SHALL mark that source reference launch-eligible

#### Scenario: Loading or unavailable catalog blocks visibly

- **WHEN** the catalog is loading, malformed, failed, or unavailable
- **THEN** readiness SHALL preserve the roster unit with a stable retryable blocker
- **AND** encounter materialization SHALL NOT begin

### Requirement: Campaign launch requires an authoritative canonical source

Every launch boundary SHALL receive an explicit runtime catalog snapshot and SHALL admit only selected units whose source is `canonical` and whose exact `unitRef` is present in the ready snapshot.

Mission launch, Mech Bay readiness, fast-forward, campaign dashboard readiness, `launchCoopMission`, and every materializer caller SHALL use one shared admission guard before diagnostics, lookup, routing, or mutation.

#### Scenario: Canonical mixed-roster selection launches

- **WHEN** a mixed roster contains custom rows plus a selected canonical row with an exact ready-catalog match
- **THEN** the canonical selection SHALL launch once with the selected roster identity
- **AND** the custom row SHALL remain visible but unselected and non-launchable

#### Scenario: Custom selection is blocked without side effects

- **WHEN** a selected roster contains a custom source, invalid source, forged ref, stale ref, or missing catalog membership
- **THEN** readiness and launch SHALL return a stable blocker before encounter diagnostics or materialization
- **AND** encounter lookup, reuse, creation, route calls, session launch, and mutation counts SHALL remain zero

#### Scenario: Catalog state is explicit

- **WHEN** the catalog is loading, malformed, failed, empty, or unavailable
- **THEN** the launch surface SHALL show a retryable unavailable/loading state
- **AND** it MUST NOT treat failure as an empty successful catalog or launch a canonical unit

#### Scenario: Co-op launch revalidates authority

- **WHEN** a co-op launch receives a missing, foreign, stale, or revision-mismatched campaign snapshot
- **THEN** launch SHALL reject before composition or `launchCampaignEncounter`
- **AND** the client MUST NOT synthesize source identity, force membership, or a stock fallback

#### Scenario: Every caller fails closed consistently

- **WHEN** any named caller receives a custom, invalid, stale, missing, loading, unavailable, foreign, or revision-mismatched source/snapshot
- **THEN** the shared guard SHALL return the same condition-specific stable blocker across callers before caller-specific work
- **AND** custom or invalid selections SHALL retain per-unit canonical-combat-unavailable reasons, while loading or unavailable catalogs SHALL retain retryable surface status
- **AND** lookup, reuse, creation, route, session, launch, and mutation observations SHALL all remain zero

