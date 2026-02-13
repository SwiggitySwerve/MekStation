# personnel-management Specification

## Purpose

TBD - created by archiving change implement-comprehensive-campaign-system. Update Purpose after archive.

## Requirements

### Requirement: Person Entity

The system SHALL track personnel with comprehensive attributes including rank index and time-in-rank.

#### Scenario: Person has numeric rank index

- **GIVEN** a person in the campaign
- **WHEN** viewing their rank
- **THEN** the person has a rankIndex field (numeric 0-50)
- **AND** rankIndex maps to a rank in the faction's rank system

#### Scenario: Person tracks time-in-rank

- **GIVEN** a person promoted on 3025-06-01
- **WHEN** checking time-in-rank on 3025-12-01
- **THEN** time-in-rank is 6 months

### Requirement: Personnel Status Management

The system SHALL track personnel status with 37 status values grouped into Active/Employed (6), Absent (3), Departed (9), Dead (14 causes), and Other (1), with behavioral rules for salary eligibility, absence tracking, and death handling.

#### Scenario: Active personnel are available for duty

- **GIVEN** a person with status ACTIVE
- **WHEN** isActive helper is called
- **THEN** true is returned

#### Scenario: Absent statuses are tracked

- **GIVEN** a person with status ON_LEAVE
- **WHEN** isAbsent helper is called
- **THEN** true is returned

#### Scenario: Salary eligibility is determined by status

- **GIVEN** a person with status ACTIVE
- **WHEN** isSalaryEligible helper is called
- **THEN** true is returned

#### Scenario: Death statuses are identified

- **GIVEN** a person with status KIA
- **WHEN** isDead helper is called
- **THEN** true is returned

### Requirement: Personnel Roles

The system SHALL support 45 campaign personnel roles across 3 categories: Combat (14), Support (11), and Civilian (~20), with role category helpers and base salary mapping.

#### Scenario: Person has primary role

- **GIVEN** a person is created with primaryRole PILOT
- **WHEN** the person is inspected
- **THEN** primaryRole is PILOT

#### Scenario: Combat roles are identified

- **GIVEN** a person with primaryRole PILOT
- **WHEN** isCombatRole helper is called
- **THEN** true is returned

#### Scenario: Role has base salary

- **GIVEN** a person with primaryRole PILOT
- **WHEN** getBaseSalary helper is called
- **THEN** the base salary for PILOT role is returned

### Requirement: Injury Tracking

The system SHALL track personnel injuries with type, location, severity, healing time, permanent flag, modifiers, and prosthetic status.

#### Scenario: Injury has all required fields

- **GIVEN** a person with an injury
- **WHEN** the injury is inspected
- **THEN** injury has type, location, severity (1-5), daysToHeal, permanent flag, skillModifier, and attributeModifier

#### Scenario: Permanent injury has flag set

- **GIVEN** a person with a permanent injury
- **WHEN** the injury is inspected
- **THEN** permanent flag is true and injury does not heal naturally

#### Scenario: Prosthetic injury has flag set

- **GIVEN** a person with a prosthetic installed
- **WHEN** the injury is inspected
- **THEN** hasProsthetic flag is true, skillModifier is 0, and attributeModifier is -1

#### Scenario: Multiple injuries compound difficulty

- **GIVEN** a person with 4 injuries
- **WHEN** medical check is performed with tougherHealing enabled
- **THEN** target number penalty is max(0, 4-2) = +2

### Requirement: Skills and Attributes

The system SHALL track personnel skills and attributes with 7 core attributes (STR, BOD, REF, DEX, INT, WIL, CHA) plus Edge. The system SHALL support a comprehensive skill catalog of 40+ skill types organized into six categories: combat, technical, medical, administrative, physical, and knowledge. Each skill has a base target number, XP cost progression (10 levels), and a linked attribute that modifies skill checks and improvement costs. The technical category includes a Tech skill used for equipment maintenance checks.

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
- **THEN** the system uses a penalty target number (typically 12+)
- **AND** the check is more difficult than for skilled personnel

#### Scenario: Tech skill for maintenance

- **GIVEN** a personnel member with Tech skill
- **WHEN** performing maintenance checks
- **THEN** Tech skill value is used in target number calculation
- **AND** higher Tech skill makes maintenance easier

#### Scenario: Assign Tech skill to technician

- **GIVEN** a personnel member with role TECH
- **WHEN** creating default skills for the role
- **THEN** Tech skill is included in default skill set
- **AND** Tech skill has appropriate starting value

#### Scenario: Tech skill progression

- **GIVEN** a personnel member with Tech skill
- **WHEN** earning XP and improving skills
- **THEN** Tech skill can be improved using XP
- **AND** Tech skill follows standard skill progression rules

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

### Requirement: Personnel Status Transitions

The system SHALL support voluntary departure status transitions for personnel who fail turnover checks, transitioning from ACTIVE to either RETIRED (voluntary departure) or DESERTED (negative departure).

#### Scenario: Personnel retires voluntarily

- **GIVEN** an ACTIVE personnel member who fails a turnover check
- **WHEN** the roll result indicates voluntary departure
- **THEN** personnel status transitions to RETIRED
- **AND** departure date is recorded
- **AND** departure reason is set to "Voluntary Retirement"

#### Scenario: Personnel deserts

- **GIVEN** an ACTIVE personnel member who fails a turnover check badly (roll < TN - 4)
- **WHEN** the roll result indicates negative departure
- **THEN** personnel status transitions to DESERTED
- **AND** departure date is recorded
- **AND** departure reason is set to "Desertion"

### Requirement: Departure Tracking

The system SHALL track departure details for personnel who leave the campaign, including departure date, reason, and final payout amount.

#### Scenario: Record departure details

- **GIVEN** a personnel member who has left the campaign
- **WHEN** departure is processed
- **THEN** departure date is set to current campaign date
- **AND** departure reason is recorded
- **AND** payout amount is calculated and recorded as financial transaction
- **AND** personnel record is marked as departed

#### Scenario: Query departed personnel

- **GIVEN** a campaign with historical personnel departures
- **WHEN** querying personnel by status RETIRED or DESERTED
- **THEN** all departed personnel are returned with departure details
- **AND** departure date, reason, and payout are accessible

### Requirement: XP Award Tracking

The system SHALL track XP awards from 8 distinct sources with configurable amounts.

#### Scenario: Scenario XP awarded

- **GIVEN** a person participates in a scenario
- **WHEN** the scenario completes
- **THEN** the person receives scenarioXP amount (default 1)

#### Scenario: Kill XP requires threshold

- **GIVEN** a person with 3 kills and killsForXP set to 2
- **WHEN** calculating kill XP
- **THEN** the person receives 1 × killXPAward (floor(3/2) = 1)

#### Scenario: Mission XP varies by outcome

- **GIVEN** a mission completes
- **WHEN** the outcome is "outstanding"
- **THEN** the person receives missionOutstandingXP (default 5)
- **AND** "success" awards missionSuccessXP (default 3)
- **AND** "fail" awards missionFailXP (default 1)

### Requirement: Trait-Modified Skill Costs

The system SHALL apply trait multipliers to skill improvement costs.

#### Scenario: Slow Learner increases cost

- **GIVEN** a person with Slow Learner trait
- **WHEN** calculating skill cost
- **THEN** the base cost is multiplied by 1.2 (+20%)

#### Scenario: Tech traits apply to tech skills only

- **GIVEN** a person with Gremlins trait
- **WHEN** improving a tech skill
- **THEN** the cost is multiplied by 1.1 (+10%)
- **AND** non-tech skills are unaffected

#### Scenario: Traits stack multiplicatively

- **GIVEN** a person with Slow Learner and Gremlins
- **WHEN** improving a tech skill
- **THEN** the cost is multiplied by 1.2 × 1.1 = 1.32 (+32%)

### Requirement: Aging Attribute Decay

The system SHALL apply cumulative attribute modifiers at 10 aging milestones.

#### Scenario: Age 65 applies milestone modifiers

- **GIVEN** a person turns 65 (milestone "61-70")
- **WHEN** processing aging
- **THEN** STR is reduced by 1.0, BOD by 1.0, DEX by 1.0
- **AND** Glass Jaw is applied (unless has Toughness)
- **AND** Slow Learner is applied (unless has Fast Learner)

#### Scenario: Modifiers only apply on milestone crossing

- **GIVEN** a person turns 66 (still in "61-70" milestone)
- **WHEN** processing aging
- **THEN** no new modifiers are applied

#### Scenario: Aging can be disabled

- **GIVEN** useAgingEffects is false
- **WHEN** processing aging
- **THEN** no modifiers are applied regardless of age

### Requirement: Faction Rank System

The system SHALL support faction-specific rank systems with 51 rank slots.

#### Scenario: Rank system structure

- **GIVEN** a faction rank system
- **WHEN** accessing its properties
- **THEN** the system has: code, name, ranks[51], officerCut, useROMDesignation
- **AND** ranks array has exactly 51 slots (indices 0-50)
- **AND** not all slots are populated (most systems use 15-20 actual ranks)

#### Scenario: Built-in rank systems

- **GIVEN** the rank system
- **WHEN** listing available systems
- **THEN** systems SHALL include: Mercenary, SLDF, Clan, ComStar, Generic House

#### Scenario: Rank properties

- **GIVEN** a rank in a rank system
- **WHEN** accessing its properties
- **THEN** the rank has: index, names (per profession), officer boolean, payMultiplier

### Requirement: Profession-Specific Rank Names

The system SHALL resolve rank names based on personnel profession.

#### Scenario: MekWarrior rank name

- **GIVEN** a person with profession MekWarrior and rank index 10
- **WHEN** resolving the rank name
- **THEN** the name is "Captain" (MekWarrior variant)

#### Scenario: Aerospace rank name

- **GIVEN** a person with profession Aerospace and rank index 10
- **WHEN** resolving the rank name
- **THEN** the name is "Flight Captain" (Aerospace variant)

#### Scenario: Profession mapping

- **GIVEN** the rank system
- **WHEN** listing professions
- **THEN** professions SHALL include: MekWarrior, Aerospace, Vehicle, Naval, Infantry, Tech, Medical, Administrator, Civilian

### Requirement: Officer Status Determination

The system SHALL determine officer status based on rank index vs officer cut.

#### Scenario: Officer rank

- **GIVEN** a rank system with officer cut at index 30
- **WHEN** a person has rank index 35
- **THEN** the person is an officer

#### Scenario: Enlisted rank

- **GIVEN** a rank system with officer cut at index 30
- **WHEN** a person has rank index 15
- **THEN** the person is not an officer

#### Scenario: Officer cut threshold

- **GIVEN** a faction rank system
- **WHEN** checking the officer cut
- **THEN** ranks with index >= officerCut are officers
- **AND** ranks with index < officerCut are enlisted or warrant officers

### Requirement: Promotion and Demotion

The system SHALL support promotion and demotion with validation and logging.

#### Scenario: Promote personnel

- **GIVEN** a person with rank index 10
- **WHEN** promoting the person
- **THEN** rank index increases to 11
- **AND** lastRankChangeDate is updated to current date
- **AND** promotion is logged to service history

#### Scenario: Demote personnel

- **GIVEN** a person with rank index 10
- **WHEN** demoting the person
- **THEN** rank index decreases to 9
- **AND** lastRankChangeDate is updated to current date
- **AND** demotion is logged to service history

#### Scenario: Promotion validation

- **GIVEN** a person with rank index 50 (maximum)
- **WHEN** attempting to promote
- **THEN** promotion is rejected (cannot exceed maximum rank)

#### Scenario: Demotion validation

- **GIVEN** a person with rank index 0 (minimum)
- **WHEN** attempting to demote
- **THEN** demotion is rejected (cannot go below minimum rank)

### Requirement: Rank Pay Multiplier

The system SHALL apply rank-specific pay multipliers to salary calculation.

#### Scenario: Pay multiplier application

- **GIVEN** a person with base salary 5000 and rank pay multiplier 1.5
- **WHEN** calculating total salary
- **THEN** salary = 5000 × 1.5 = 7500

#### Scenario: Officer pay premium

- **GIVEN** officer ranks typically have pay multipliers 1.5-3.0
- **WHEN** an enlisted person is promoted to officer
- **THEN** their salary increases due to higher pay multiplier

### Requirement: Officer Effects on Turnover

The system SHALL apply officer status effects to turnover calculations.

#### Scenario: Officer turnover modifier

- **GIVEN** a person with officer status
- **WHEN** calculating turnover modifiers
- **THEN** officer status provides -1 modifier (reduces turnover chance)

#### Scenario: Recent promotion modifier

- **GIVEN** a person promoted within the last 6 months
- **WHEN** calculating turnover modifiers
- **THEN** recent promotion provides -1 modifier (reduces turnover chance)

#### Scenario: Combined officer effects

- **GIVEN** a person who is an officer AND was recently promoted
- **WHEN** calculating turnover modifiers
- **THEN** both modifiers apply (-2 total)

### Requirement: Officer Shares Calculation

The system SHALL calculate additional shares for officers based on rank.

#### Scenario: Officer shares

- **GIVEN** a rank system with officer cut at index 30
- **WHEN** a person has rank index 35
- **THEN** officer shares = base shares + (35 - 30) = base + 5

#### Scenario: Enlisted shares

- **GIVEN** a person with rank index below officer cut
- **WHEN** calculating shares
- **THEN** shares = base shares only (no officer bonus)

### Requirement: Pilot Store CRUD Operations

The system SHALL provide a Zustand store for pilot management with CRUD operations via API routes.

**Source**: `src/stores/usePilotStore.ts:118-484`

#### Scenario: Load pilots from API

- **GIVEN** a pilot store exists
- **WHEN** loadPilots is called
- **THEN** pilots are fetched from /api/pilots
- **AND** pilots array is populated with IPilot objects
- **AND** isLoading is true during fetch, false after

#### Scenario: Create pilot via store

- **GIVEN** a pilot store exists
- **WHEN** createPilot is called with ICreatePilotOptions
- **THEN** POST request is sent to /api/pilots with mode='full'
- **AND** pilot is created in database
- **AND** pilots are reloaded
- **AND** selectedPilotId is set to new pilot ID

#### Scenario: Create pilot from template

- **GIVEN** a pilot store exists
- **WHEN** createFromTemplate is called with PilotExperienceLevel and IPilotIdentity
- **THEN** POST request is sent to /api/pilots with mode='template'
- **AND** pilot is created with template skills (Green: 5/6, Regular: 4/5, Veteran: 3/4, Elite: 2/3)
- **AND** pilot receives template starting XP

#### Scenario: Create random pilot

- **GIVEN** a pilot store exists
- **WHEN** createRandom is called with IPilotIdentity
- **THEN** POST request is sent to /api/pilots with mode='random'
- **AND** pilot is created with randomized skills and abilities

#### Scenario: Create statblock pilot (not persisted)

- **GIVEN** a pilot store exists
- **WHEN** createStatblock is called with IPilotStatblock
- **THEN** pilot is created in memory with type=PilotType.Statblock
- **AND** pilot is NOT persisted to database
- **AND** pilot has temporary ID (statblock-{timestamp}-{random})

#### Scenario: Update pilot via store

- **GIVEN** a pilot store with pilot ID "pilot-001"
- **WHEN** updatePilot is called with partial updates
- **THEN** PUT request is sent to /api/pilots/{id}
- **AND** pilot is updated in database
- **AND** pilots are reloaded

#### Scenario: Delete pilot via store

- **GIVEN** a pilot store with pilot ID "pilot-001"
- **WHEN** deletePilot is called with "pilot-001"
- **THEN** DELETE request is sent to /api/pilots/{id}
- **AND** pilot is removed from database
- **AND** selectedPilotId is cleared if it matches deleted pilot
- **AND** pilots are reloaded

#### Scenario: Improve gunnery skill

- **GIVEN** a pilot with gunnery 4 and sufficient XP
- **WHEN** improveGunnery is called
- **THEN** POST request is sent to /api/pilots/{id}/improve-gunnery
- **AND** gunnery is decreased by 1 (4 → 3)
- **AND** XP is deducted per GUNNERY_IMPROVEMENT_COSTS
- **AND** pilots are reloaded

#### Scenario: Improve piloting skill

- **GIVEN** a pilot with piloting 5 and sufficient XP
- **WHEN** improvePiloting is called
- **THEN** POST request is sent to /api/pilots/{id}/improve-piloting
- **AND** piloting is decreased by 1 (5 → 4)
- **AND** XP is deducted per PILOTING_IMPROVEMENT_COSTS
- **AND** pilots are reloaded

#### Scenario: Apply wound to pilot

- **GIVEN** a pilot with 2 wounds and status ACTIVE
- **WHEN** applyWound is called
- **THEN** wounds increase to 3
- **AND** status changes to INJURED (wounds >= 3)
- **AND** pilot is updated via updatePilot

#### Scenario: Pilot death from wounds

- **GIVEN** a pilot with 5 wounds
- **WHEN** applyWound is called
- **THEN** wounds increase to 6
- **AND** status changes to KIA (wounds >= 6)

#### Scenario: Heal pilot wounds

- **GIVEN** a pilot with status INJURED and 3 wounds
- **WHEN** healWounds is called
- **THEN** wounds are set to 0
- **AND** status changes to ACTIVE
- **AND** pilot is updated via updatePilot

#### Scenario: Cannot heal KIA pilot

- **GIVEN** a pilot with status KIA
- **WHEN** healWounds is called
- **THEN** error is set to "Cannot heal a KIA pilot"
- **AND** pilot is not updated

#### Scenario: Purchase ability

- **GIVEN** a pilot with sufficient XP
- **WHEN** purchaseAbility is called with abilityId and xpCost
- **THEN** POST request is sent to /api/pilots/{id}/purchase-ability
- **AND** ability is added to pilot.abilities array
- **AND** XP is deducted
- **AND** pilots are reloaded

### Requirement: Pilot Store Filtering and Selection

The system SHALL provide filtering and selection capabilities in the pilot store.

**Source**: `src/stores/usePilotStore.ts:493-524`

#### Scenario: Filter by active status

- **GIVEN** a pilot store with 5 ACTIVE and 2 INJURED pilots
- **WHEN** showActiveOnly is set to true
- **THEN** useFilteredPilots returns only 5 ACTIVE pilots

#### Scenario: Filter by search query

- **GIVEN** a pilot store with pilots named "Alice", "Bob", "Charlie"
- **WHEN** searchQuery is set to "ali"
- **THEN** useFilteredPilots returns only "Alice" (case-insensitive match)

#### Scenario: Search by callsign

- **GIVEN** a pilot with name "Alice" and callsign "Ace"
- **WHEN** searchQuery is set to "ace"
- **THEN** useFilteredPilots returns the pilot (callsign match)

#### Scenario: Search by affiliation

- **GIVEN** a pilot with affiliation "Lyran Commonwealth"
- **WHEN** searchQuery is set to "lyran"
- **THEN** useFilteredPilots returns the pilot (affiliation match)

#### Scenario: Select pilot

- **GIVEN** a pilot store with pilot ID "pilot-001"
- **WHEN** selectPilot is called with "pilot-001"
- **THEN** selectedPilotId is set to "pilot-001"
- **AND** getSelectedPilot returns the pilot object

#### Scenario: Get pilot by ID

- **GIVEN** a pilot store with pilot ID "pilot-001"
- **WHEN** usePilotById("pilot-001") is called
- **THEN** the pilot object is returned

### Requirement: Pilot Skill Constants

The system SHALL define skill value bounds and defaults for pilot skills.

**Source**: `src/constants/PilotConstants.ts:18-34`

#### Scenario: Skill value bounds

- **GIVEN** the pilot system
- **WHEN** checking skill value constraints
- **THEN** MIN_SKILL_VALUE is 1 (best possible)
- **AND** MAX_SKILL_VALUE is 8 (worst possible)

#### Scenario: Default pilot skills

- **GIVEN** a new pilot is created without specified skills
- **WHEN** using DEFAULT_PILOT_SKILLS
- **THEN** gunnery is 4
- **AND** piloting is 5

#### Scenario: Skill value validation

- **GIVEN** a skill value of 5
- **WHEN** isValidSkillValue is called
- **THEN** true is returned (5 is within 1-8 range)

#### Scenario: Invalid skill value (too low)

- **GIVEN** a skill value of 0
- **WHEN** isValidSkillValue is called
- **THEN** false is returned (0 < MIN_SKILL_VALUE)

#### Scenario: Invalid skill value (too high)

- **GIVEN** a skill value of 9
- **WHEN** isValidSkillValue is called
- **THEN** false is returned (9 > MAX_SKILL_VALUE)

#### Scenario: Skill value clamped to range

- **GIVEN** a pilot with gunnery 3 and 2 wounds
- **WHEN** getEffectiveSkill is called
- **THEN** effective gunnery is 5 (3 + 2×1 penalty)
- **AND** effective gunnery is clamped to MAX_SKILL_VALUE (8) if exceeded

### Requirement: Pilot XP Costs

The system SHALL define XP costs for skill improvement with progressive scaling.

**Source**: `src/constants/PilotConstants.ts:70-114`

#### Scenario: Gunnery improvement costs

- **GIVEN** a pilot with gunnery 4
- **WHEN** getGunneryImprovementCost(4) is called
- **THEN** cost is 200 XP (to improve from 4 to 3)

#### Scenario: Piloting improvement costs

- **GIVEN** a pilot with piloting 5
- **WHEN** getPilotingImprovementCost(5) is called
- **THEN** cost is 75 XP (to improve from 5 to 4)

#### Scenario: Cannot improve skill at minimum

- **GIVEN** a pilot with gunnery 1 (best possible)
- **WHEN** getGunneryImprovementCost(1) is called
- **THEN** null is returned (cannot improve further)

#### Scenario: XP cost progression (gunnery)

- **GIVEN** the gunnery improvement cost table
- **WHEN** checking costs for each level
- **THEN** costs are: 8→7: 50, 7→6: 75, 6→5: 100, 5→4: 100, 4→3: 200, 3→2: 400, 2→1: 800

#### Scenario: XP cost progression (piloting)

- **GIVEN** the piloting improvement cost table
- **WHEN** checking costs for each level
- **THEN** costs are: 8→7: 40, 7→6: 60, 6→5: 75, 5→4: 75, 4→3: 150, 3→2: 300, 2→1: 600

### Requirement: Pilot Templates

The system SHALL provide predefined pilot templates for quick generation.

**Source**: `src/constants/PilotConstants.ts:123-159`

#### Scenario: Green pilot template

- **GIVEN** PilotExperienceLevel.Green
- **WHEN** getPilotTemplate is called
- **THEN** template has skills { gunnery: 5, piloting: 6 }
- **AND** startingXp is 0

#### Scenario: Regular pilot template

- **GIVEN** PilotExperienceLevel.Regular
- **WHEN** getPilotTemplate is called
- **THEN** template has skills { gunnery: 4, piloting: 5 }
- **AND** startingXp is 0

#### Scenario: Veteran pilot template

- **GIVEN** PilotExperienceLevel.Veteran
- **WHEN** getPilotTemplate is called
- **THEN** template has skills { gunnery: 3, piloting: 4 }
- **AND** startingXp is 50

#### Scenario: Elite pilot template

- **GIVEN** PilotExperienceLevel.Elite
- **WHEN** getPilotTemplate is called
- **THEN** template has skills { gunnery: 2, piloting: 3 }
- **AND** startingXp is 100

#### Scenario: Template description

- **GIVEN** any pilot template
- **WHEN** accessing template properties
- **THEN** template has level, name, skills, startingXp, and description fields

### Requirement: Pilot Skill Rating Helpers

The system SHALL provide helper functions for skill rating labels and calculations.

**Source**: `src/constants/PilotConstants.ts:168-191`

#### Scenario: Skill label for elite pilot

- **GIVEN** a skill value of 2
- **WHEN** getSkillLabel is called
- **THEN** label is "Elite"

#### Scenario: Skill label for regular pilot

- **GIVEN** a skill value of 4
- **WHEN** getSkillLabel is called
- **THEN** label is "Regular"

#### Scenario: Pilot rating display

- **GIVEN** a pilot with gunnery 3 and piloting 4
- **WHEN** getPilotRating is called
- **THEN** rating is "3/4"

#### Scenario: Effective skill with wounds

- **GIVEN** a pilot with gunnery 3 and 2 wounds
- **WHEN** getEffectiveSkill is called
- **THEN** effective gunnery is 5 (3 + 2×1 penalty)

#### Scenario: Effective skill clamped at maximum

- **GIVEN** a pilot with gunnery 7 and 3 wounds
- **WHEN** getEffectiveSkill is called
- **THEN** effective gunnery is 8 (clamped to MAX_SKILL_VALUE)

### Requirement: Pilot Wounds Constants

The system SHALL define wound limits and skill penalties.

**Source**: `src/constants/PilotConstants.ts:40-44`

#### Scenario: Maximum wounds before death

- **GIVEN** the pilot system
- **WHEN** checking wound limits
- **THEN** MAX_WOUNDS is 6

#### Scenario: Wound skill penalty

- **GIVEN** the pilot system
- **WHEN** checking wound effects
- **THEN** WOUND_SKILL_PENALTY is 1 per wound

#### Scenario: Wounds validation

- **GIVEN** a wounds value of 3
- **WHEN** isValidWoundsValue is called
- **THEN** true is returned (3 is within 0-6 range)

#### Scenario: Invalid wounds value

- **GIVEN** a wounds value of 7
- **WHEN** isValidWoundsValue is called
- **THEN** false is returned (7 > MAX_WOUNDS)

---

## Data Model Requirements

### PilotStoreState

**Source**: `src/stores/usePilotStore.ts:53-66`

```typescript
interface PilotStoreState {
  /** All loaded pilots */
  readonly pilots: IPilot[];
  /** Currently selected pilot ID */
  readonly selectedPilotId: string | null;
  /** Loading state */
  readonly isLoading: boolean;
  /** Error message */
  readonly error: string | null;
  /** Filter: show only active pilots */
  readonly showActiveOnly: boolean;
  /** Search query */
  readonly searchQuery: string;
}
```

### PilotStoreActions

**Source**: `src/stores/usePilotStore.ts:68-110`

```typescript
interface PilotStoreActions {
  /** Load all pilots from API */
  loadPilots: () => Promise<void>;
  /** Create a new pilot */
  createPilot: (options: ICreatePilotOptions) => Promise<string | null>;
  /** Create pilot from template */
  createFromTemplate: (
    level: PilotExperienceLevel,
    identity: IPilotIdentity,
  ) => Promise<string | null>;
  /** Create random pilot */
  createRandom: (identity: IPilotIdentity) => Promise<string | null>;
  /** Create statblock pilot (not persisted) */
  createStatblock: (statblock: IPilotStatblock) => IPilot;
  /** Update a pilot */
  updatePilot: (id: string, updates: Partial<IPilot>) => Promise<boolean>;
  /** Delete a pilot */
  deletePilot: (id: string) => Promise<boolean>;
  /** Select a pilot */
  selectPilot: (id: string | null) => void;
  /** Get selected pilot */
  getSelectedPilot: () => IPilot | null;
  /** Improve gunnery skill */
  improveGunnery: (pilotId: string) => Promise<boolean>;
  /** Improve piloting skill */
  improvePiloting: (pilotId: string) => Promise<boolean>;
  /** Apply wound to pilot */
  applyWound: (pilotId: string) => Promise<boolean>;
  /** Heal pilot wounds */
  healWounds: (pilotId: string) => Promise<boolean>;
  /** Purchase an ability for a pilot */
  purchaseAbility: (
    pilotId: string,
    abilityId: string,
    xpCost: number,
  ) => Promise<boolean>;
  /** Set filter */
  setShowActiveOnly: (value: boolean) => void;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Clear error */
  clearError: () => void;
}
```

### ListPilotsResponse

**Source**: `src/stores/usePilotStore.ts:26-29`

```typescript
interface ListPilotsResponse {
  readonly pilots: IPilot[];
  readonly count: number;
}
```

### IPilot

**Source**: `src/types/pilot/PilotInterfaces.ts:337-358`

```typescript
interface IPilot extends IEntity, IPilotIdentity {
  /** Pilot type (persistent or statblock) */
  readonly type: PilotType;
  /** Current status */
  readonly status: PilotStatus;
  /** Combat skills */
  readonly skills: IPilotSkills;
  /** Current wounds (0-6, 6 = death) */
  readonly wounds: number;
  /** Career statistics (only for persistent pilots) */
  readonly career?: IPilotCareer;
  /** Special abilities owned */
  readonly abilities: readonly IPilotAbilityRef[];
  /** Awards earned by this pilot */
  readonly awards?: readonly IPilotAward[];
  /** Detailed combat and career statistics for award tracking */
  readonly stats?: IPilotStats;
  /** Creation timestamp */
  readonly createdAt: string;
  /** Last update timestamp */
  readonly updatedAt: string;
}
```

### IPilotStatblock

**Source**: `src/types/pilot/PilotInterfaces.ts:406-416`

```typescript
interface IPilotStatblock {
  /** Display name */
  readonly name: string;
  /** Gunnery skill */
  readonly gunnery: number;
  /** Piloting skill */
  readonly piloting: number;
  /** Optional abilities (by ID) */
  readonly abilityIds?: readonly string[];
}
```

### PilotStatus

**Source**: `src/types/pilot/PilotInterfaces.ts:28-36`

```typescript
enum PilotStatus {
  Active = 'active',
  Injured = 'injured',
  MIA = 'mia',
  KIA = 'kia',
  Retired = 'retired',
}
```

### PilotExperienceLevel

**Source**: `src/types/pilot/PilotInterfaces.ts:44-49`

```typescript
enum PilotExperienceLevel {
  Green = 'green',
  Regular = 'regular',
  Veteran = 'veteran',
  Elite = 'elite',
}
```

### IPilotIdentity

**Source**: `src/types/pilot/PilotInterfaces.ts:321-332`

```typescript
interface IPilotIdentity {
  /** Display name */
  readonly name: string;
  /** Callsign/nickname (optional) */
  readonly callsign?: string;
  /** Faction/house affiliation (optional) */
  readonly affiliation?: string;
  /** Portrait image URL or identifier (optional) */
  readonly portrait?: string;
  /** Background notes/biography (optional) */
  readonly background?: string;
}
```

### ICreatePilotOptions

**Source**: `src/types/pilot/PilotInterfaces.ts:367-381`

```typescript
interface ICreatePilotOptions {
  /** Pilot identity */
  readonly identity: IPilotIdentity;
  /** Pilot type */
  readonly type: PilotType;
  /** Initial skills */
  readonly skills: IPilotSkills;
  /** Initial abilities (by ID) */
  readonly abilityIds?: readonly string[];
  /** Starting XP (for persistent pilots) */
  readonly startingXp?: number;
  /** Initial rank */
  readonly rank?: string;
}
```

### PilotType

**Source**: `src/types/pilot/PilotInterfaces.ts:19-24`

```typescript
enum PilotType {
  /** Full database storage with career tracking */
  Persistent = 'persistent',
  /** Inline definition, no storage - for quick NPCs */
  Statblock = 'statblock',
}
```

### IPilotSkills

**Source**: `src/types/pilot/PilotInterfaces.ts:59-64`

```typescript
interface IPilotSkills {
  /** Gunnery skill (1-8, lower is better). Default: 4 */
  readonly gunnery: number;
  /** Piloting skill (1-8, lower is better). Default: 5 */
  readonly piloting: number;
}
```

### IPilotTemplate

**Source**: `src/types/pilot/PilotInterfaces.ts:385-396`

```typescript
interface IPilotTemplate {
  /** Template level */
  readonly level: PilotExperienceLevel;
  /** Display name */
  readonly name: string;
  /** Default skills for this level */
  readonly skills: IPilotSkills;
  /** Starting XP budget */
  readonly startingXp: number;
  /** Description */
  readonly description: string;
}
```

### Pilot Constants

**Source**: `src/constants/PilotConstants.ts:18-34, 40-44, 70-94`

```typescript
// Skill bounds
const MIN_SKILL_VALUE = 1;
const MAX_SKILL_VALUE = 8;
const DEFAULT_GUNNERY = 4;
const DEFAULT_PILOTING = 5;

// Wound limits
const MAX_WOUNDS = 6;
const WOUND_SKILL_PENALTY = 1;

// XP costs (Record<currentLevel, costToImprove>)
const GUNNERY_IMPROVEMENT_COSTS: Record<number, number> = {
  8: 50,
  7: 75,
  6: 100,
  5: 100,
  4: 200,
  3: 400,
  2: 800,
};

const PILOTING_IMPROVEMENT_COSTS: Record<number, number> = {
  8: 40,
  7: 60,
  6: 75,
  5: 75,
  4: 150,
  3: 300,
  2: 600,
};

// Templates
const PILOT_TEMPLATES: Record<PilotExperienceLevel, IPilotTemplate> = {
  [PilotExperienceLevel.Green]: {
    level: PilotExperienceLevel.Green,
    name: 'Green',
    skills: { gunnery: 5, piloting: 6 },
    startingXp: 0,
    description: 'Inexperienced pilot fresh from training.',
  },
  [PilotExperienceLevel.Regular]: {
    level: PilotExperienceLevel.Regular,
    name: 'Regular',
    skills: { gunnery: 4, piloting: 5 },
    startingXp: 0,
    description: 'Standard combat-ready pilot.',
  },
  [PilotExperienceLevel.Veteran]: {
    level: PilotExperienceLevel.Veteran,
    name: 'Veteran',
    skills: { gunnery: 3, piloting: 4 },
    startingXp: 50,
    description: 'Experienced pilot with multiple campaigns.',
  },
  [PilotExperienceLevel.Elite]: {
    level: PilotExperienceLevel.Elite,
    name: 'Elite',
    skills: { gunnery: 2, piloting: 3 },
    startingXp: 100,
    description: 'Highly skilled ace pilot.',
  },
};
```

---

## Non-Goals

This specification does NOT cover:

1. **Pilot Abilities Database** - Special abilities (Marksman, Dodge, etc.) are defined in a separate abilities system
2. **Pilot Awards System** - Award definitions and tracking are covered in the awards specification
3. **Pilot AI Behavior** - AI decision-making for NPC pilots is covered in the AI system specification
4. **Pilot Portrait Management** - Portrait upload, storage, and rendering are UI concerns
5. **Pilot Biography Editor** - Rich text editing for pilot backgrounds is a UI feature
6. **Pilot Salary Calculation** - Salary formulas are covered in the campaign financial system
7. **Pilot Hiring Market** - Personnel market and hiring mechanics are covered in the campaign system
8. **Pilot Training System** - Training time and skill improvement over campaign time are campaign mechanics
9. **Pilot Morale System** - Morale tracking and effects are covered in the campaign system
10. **Pilot Relationships** - Inter-pilot relationships and rivalries are campaign features
