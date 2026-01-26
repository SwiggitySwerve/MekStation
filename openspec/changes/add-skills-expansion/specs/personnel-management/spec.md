## MODIFIED Requirements

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
