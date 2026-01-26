# skills-system Specification

## Purpose
TBD - created by archiving change add-skills-expansion. Update Purpose after archive.
## Requirements
### Requirement: Skill Catalog with 40+ Types

The system SHALL provide a comprehensive skill catalog defining 40+ skill types across six categories: combat, technical, medical, administrative, physical, and knowledge. Each skill type SHALL have a unique identifier, name, description, base target number, XP cost array (10 levels), and linked attribute for modifier calculations.

#### Scenario: Skill catalog contains all required skill types
- **GIVEN** the skill catalog is loaded
- **WHEN** querying for all skill types
- **THEN** the system returns 40 or more skill definitions
- **AND** each skill has valid costs array with 10 elements
- **AND** each skill has a valid linkedAttribute (REF, DEX, INT, STR, CHA, BOD)

#### Scenario: Retrieve specific skill by ID
- **GIVEN** a skill catalog with gunnery skill defined
- **WHEN** calling getSkillType('gunnery')
- **THEN** the system returns the gunnery skill definition
- **AND** the definition includes targetNumber: 7
- **AND** the definition includes linkedAttribute: 'REF'

#### Scenario: Query skills by category
- **GIVEN** the skill catalog is loaded
- **WHEN** calling getSkillsByCategory('combat')
- **THEN** the system returns all combat skills
- **AND** the count is 11 skills (gunnery, piloting, gunnery-aerospace, piloting-aerospace, gunnery-vehicle, driving, gunnery-ba, anti-mek, small-arms, artillery, tactics)

---

### Requirement: Skill Check Resolution

The system SHALL resolve skill checks using a 2d6 roll versus a target number (TN). The TN is calculated from the skill value (modified by linked attribute) plus any situational modifiers. Personnel without a skill use an unskilled penalty (base TN + 4). The system SHALL support injectable random functions for deterministic testing.

#### Scenario: Skilled person has lower TN than unskilled
- **GIVEN** a person with gunnery skill level 4 and a person with no gunnery skill
- **WHEN** calculating effective TN for both
- **THEN** the skilled person's TN is lower than the unskilled person's TN
- **AND** the unskilled person's TN is base TN + 4 (typically 11)

#### Scenario: Apply modifiers to skill check
- **GIVEN** a skill check with base TN 7
- **WHEN** applying modifiers: [{ name: 'Range', value: +2 }, { name: 'Darkness', value: -1 }]
- **THEN** the effective TN becomes 7 + 2 - 1 = 8

#### Scenario: Determine critical success and failure
- **GIVEN** a skill check with TN 7
- **WHEN** rolling 2d6 and getting 11 (margin +4)
- **THEN** the result is success: true
- **AND** criticalSuccess: true (margin >= 4)
- **WHEN** rolling 2d6 and getting 3 (margin -4)
- **THEN** the result is success: false
- **AND** criticalFailure: true (margin <= -4)

#### Scenario: Deterministic skill check with seeded random
- **GIVEN** a skill check with a seeded random function
- **WHEN** calling performSkillCheck twice with the same seed
- **THEN** both calls return identical roll values
- **AND** the result is reproducible for testing

---

### Requirement: Skill Progression with XP Costs

The system SHALL track skill progression through XP expenditure. Each skill level has a base XP cost defined in the skill catalog. The actual cost is adjusted by the campaign's XP multiplier and the person's linked attribute modifier (higher attributes reduce cost). Personnel can improve skills up to level 10 and cannot improve beyond that limit.

#### Scenario: Calculate XP cost for skill improvement
- **GIVEN** a person with gunnery skill at level 3
- **WHEN** calculating cost to improve to level 4
- **THEN** the base cost is 16 XP (from catalog)
- **AND** the final cost is adjusted by xpMultiplier and attribute modifier

#### Scenario: High attribute reduces skill cost
- **GIVEN** a person with DEX 8 (modifier +1) improving piloting
- **WHEN** calculating cost to improve piloting
- **THEN** the cost is reduced by the attribute modifier
- **AND** the formula is: baseCost * xpMultiplier * (1 - attrMod * 0.05)

#### Scenario: Cannot improve skill beyond level 10
- **GIVEN** a person with a skill at level 10
- **WHEN** attempting to improve the skill
- **THEN** canImproveSkill returns false
- **AND** improveSkill does not modify the person

#### Scenario: Improve skill with sufficient XP
- **GIVEN** a person with gunnery level 3 and 20 XP
- **WHEN** calling improveSkill for gunnery
- **THEN** the person's gunnery level becomes 4
- **AND** the person's XP is reduced by the cost

---

### Requirement: Default Skills by Role and Experience Level

The system SHALL assign default skills to new personnel based on their role and experience level. Each role has a set of default skills with initial levels. Experience level modifies the initial skill levels: GREEN adds +1, REGULAR adds 0, VETERAN subtracts -1, ELITE subtracts -2.

#### Scenario: Pilot gets combat skills
- **GIVEN** creating a new PILOT with REGULAR experience
- **WHEN** calling createDefaultSkills(PILOT, REGULAR)
- **THEN** the person receives gunnery skill at level 4
- **AND** the person receives piloting skill at level 5

#### Scenario: Tech gets technical skills
- **GIVEN** creating a new TECH with REGULAR experience
- **WHEN** calling createDefaultSkills(TECH, REGULAR)
- **THEN** the person receives tech-mech skill at level 5

#### Scenario: Experience level modifies skill levels
- **GIVEN** creating a new PILOT with GREEN experience
- **WHEN** calling createDefaultSkills(PILOT, GREEN)
- **THEN** the person's gunnery is level 4 + 1 = 5
- **AND** the person's piloting is level 5 + 1 = 6
- **WHEN** creating a new PILOT with ELITE experience
- **THEN** the person's gunnery is level 4 - 2 = 2
- **AND** the person's piloting is level 5 - 2 = 3

#### Scenario: UNASSIGNED role has no default skills
- **GIVEN** creating a new UNASSIGNED person
- **WHEN** calling createDefaultSkills(UNASSIGNED, REGULAR)
- **THEN** the person receives no default skills

---

### Requirement: Skill Helper Functions for Cross-Plan Integration

The system SHALL provide helper functions that other campaign systems (turnover, repair, financial, medical, acquisition, ranks) can use to query skill values and modifiers. These helpers abstract skill lookup logic and provide consistent interfaces for dependent plans.

#### Scenario: Get tech skill value for repair calculations
- **GIVEN** a person with tech-mech skill at level 5
- **WHEN** calling getTechSkillValue(person)
- **THEN** the system returns the effective skill value
- **WHEN** the person has no tech skill
- **THEN** the system returns 10 (unskilled TN)

#### Scenario: Get admin skill value for financial calculations
- **GIVEN** a person with administration skill at level 4
- **WHEN** calling getAdminSkillValue(person)
- **THEN** the system returns the effective skill value
- **AND** this value is used by Plan 4 (Financial) for HR calculations

#### Scenario: Get medicine skill value for medical calculations
- **GIVEN** a person with medicine skill at level 5
- **WHEN** calling getMedicineSkillValue(person)
- **THEN** the system returns the effective skill value
- **AND** this value is used by Plan 8 (Medical) for treatment calculations

#### Scenario: Check if person has a skill
- **GIVEN** a person with gunnery skill
- **WHEN** calling hasSkill(person, 'gunnery')
- **THEN** the system returns true
- **WHEN** calling hasSkill(person, 'medicine')
- **THEN** the system returns false

#### Scenario: Find best combat skill for personnel evaluation
- **GIVEN** a person with gunnery 4, piloting 5, and small-arms 3
- **WHEN** calling getPersonBestCombatSkill(person)
- **THEN** the system returns { skillId: 'piloting', level: 5 }
- **AND** this is used by Plan 2 (Turnover) for skill desirability

#### Scenario: Get negotiation modifier for acquisition
- **GIVEN** a person with negotiation skill at level 3
- **WHEN** calling getNegotiationModifier(person)
- **THEN** the system returns a modifier value
- **AND** this is used by Plan 9 (Acquisition) for contract negotiations

#### Scenario: Get leadership skill for rank calculations
- **GIVEN** a person with leadership skill at level 4
- **WHEN** calling getLeadershipSkillValue(person)
- **THEN** the system returns the effective skill value
- **AND** this is used by Plan 15 (Ranks) for command authority

