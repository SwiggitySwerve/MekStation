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
- **AND** the formula is: baseCost _ xpMultiplier _ (1 - attrMod \* 0.05)

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

### Requirement: Fix Weapon Specialist SPA Value

The Weapon Specialist SPA SHALL provide a -2 to-hit modifier (not -1).

#### Scenario: Weapon Specialist corrected value

- **WHEN** a pilot with Weapon Specialist fires their designated weapon type
- **THEN** the to-hit modifier SHALL be -2
- **AND** the previous -1 value SHALL be corrected

### Requirement: Fix Sniper SPA Mechanic

The Sniper SPA SHALL halve all range modifiers (round down), not merely provide -1 at medium range.

#### Scenario: Sniper halves medium range modifier

- **WHEN** a pilot with Sniper fires at medium range (normally +2)
- **THEN** the range modifier SHALL be +1 (halved from +2)

#### Scenario: Sniper halves long range modifier

- **WHEN** a pilot with Sniper fires at long range (normally +4)
- **THEN** the range modifier SHALL be +2 (halved from +4)

#### Scenario: Sniper halves minimum range modifier

- **WHEN** a pilot with Sniper fires at minimum range (normally +3 for 3 hexes inside minimum)
- **THEN** the range modifier SHALL be +1 (halved from +3, round down)

### Requirement: Fix Jumping Jack SPA

The Jumping Jack SPA SHALL reduce the jump movement to-hit modifier for attacks (from +3 to +1), not affect piloting rolls.

#### Scenario: Jumping Jack affects attack modifier

- **WHEN** a pilot with Jumping Jack fires after jumping
- **THEN** the jump movement to-hit modifier SHALL be +1 (instead of standard +3)

#### Scenario: Jumping Jack does not affect piloting

- **WHEN** a pilot with Jumping Jack makes a piloting skill roll
- **THEN** the Jumping Jack SPA SHALL NOT modify the piloting roll

### Requirement: Fix Evasive SPA

The Evasive SPA SHALL be a dodge action granting +2 to enemy attacks, not a passive +1 TMM bonus.

#### Scenario: Evasive as dodge action

- **WHEN** a pilot with Evasive declares a dodge action
- **THEN** all attacks against the dodging unit SHALL receive a +2 to-hit modifier
- **AND** the pilot SHALL forfeit their attack for that turn

#### Scenario: Evasive is not passive

- **WHEN** a pilot with Evasive does not declare a dodge action
- **THEN** no Evasive modifier SHALL apply

### Requirement: Add Official SPAs from MegaMek

The system SHALL include approximately 35 additional official SPAs from MegaMek that are not currently defined.

#### Scenario: Blood Stalker SPA added

- **WHEN** a pilot has the Blood Stalker SPA with a designated target
- **THEN** attacks against the designated target SHALL receive -1 to-hit
- **AND** attacks against all other targets SHALL receive +2 to-hit

#### Scenario: Gunnery Specialist SPA added

- **WHEN** a pilot has Gunnery Specialist for a weapon category
- **THEN** attacks with that category SHALL receive -1 to-hit
- **AND** attacks with other categories SHALL receive +1 to-hit

#### Scenario: Range Master SPA added

- **WHEN** a pilot has Range Master for a specific range bracket
- **THEN** the range modifier for that bracket SHALL be set to 0

#### Scenario: Dodge Maneuver SPA added

- **WHEN** a pilot with Dodge Maneuver declares a dodge
- **THEN** all attacks against the unit SHALL receive +2 to-hit

#### Scenario: Melee Specialist SPA added

- **WHEN** a pilot with Melee Specialist makes a physical attack
- **THEN** the physical attack SHALL receive -1 to-hit

#### Scenario: Melee Master SPA added

- **WHEN** a pilot with Melee Master lands a physical attack
- **THEN** physical attack damage SHALL be increased by 1

#### Scenario: Tactical Genius SPA added

- **WHEN** a force includes a pilot with Tactical Genius
- **THEN** the initiative roll SHALL receive +1

#### Scenario: Pain Resistance SPA added

- **WHEN** a pilot with Pain Resistance has wounds
- **THEN** the first wound's effect SHALL be ignored for modifier purposes

#### Scenario: Iron Man SPA added

- **WHEN** a pilot with Iron Man makes a consciousness check
- **THEN** the target number SHALL be reduced by 2

#### Scenario: Hot Dog SPA added

- **WHEN** a pilot with Hot Dog has elevated heat
- **THEN** the shutdown check threshold SHALL be increased by 3

#### Scenario: Edge SPA added

- **WHEN** a pilot with Edge uses an Edge point
- **THEN** the pilot MAY reroll one combat die or negate one critical hit
- **AND** Edge points SHALL be tracked and decremented per use

#### Scenario: Cluster Hitter SPA added

- **WHEN** a pilot with Cluster Hitter fires a cluster weapon
- **THEN** the cluster hit table roll SHALL receive +1

#### Scenario: Multi-Tasker SPA added

- **WHEN** a pilot with Multi-Tasker fires at a secondary target
- **THEN** the secondary target penalty SHALL be reduced by 1

#### Scenario: Forward Observer SPA added

- **WHEN** a pilot with Forward Observer acts as a spotter for indirect fire
- **THEN** the spotter movement penalty SHALL be reduced

#### Scenario: Environmental Specialist SPA added

- **WHEN** a pilot with Environmental Specialist operates in adverse conditions
- **THEN** environmental to-hit penalties SHALL be reduced

### Requirement: Wire All SPAs into Combat Pipeline

All defined SPAs SHALL be wired into the appropriate combat pipeline via the spa-combat-integration system.

#### Scenario: SPA modifiers included in to-hit calculation

- **WHEN** calculating to-hit for an attack
- **THEN** all applicable gunnery SPAs for the attacking pilot SHALL be checked
- **AND** their modifiers SHALL be included in the to-hit modifier list

#### Scenario: SPA modifiers included in PSR resolution

- **WHEN** resolving a piloting skill roll
- **THEN** all applicable piloting SPAs SHALL be checked and applied

#### Scenario: SPA modifiers included in damage calculation

- **WHEN** resolving physical attack damage
- **THEN** applicable SPAs (Melee Master) SHALL modify the damage

#### Scenario: SPA modifiers included in heat checks

- **WHEN** performing shutdown checks
- **THEN** applicable SPAs (Hot Dog) SHALL modify the shutdown threshold

#### Scenario: SPA modifiers included in initiative

- **WHEN** rolling initiative
- **THEN** applicable SPAs (Tactical Genius) SHALL modify the initiative roll
