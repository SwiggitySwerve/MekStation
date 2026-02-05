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
