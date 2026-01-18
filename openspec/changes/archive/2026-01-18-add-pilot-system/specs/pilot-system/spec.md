# Pilot System Specification

## ADDED Requirements

### Requirement: Pilot Entity Model

The system SHALL define a pilot entity with identity, skills, and career attributes.

#### Scenario: Pilot identity
- **GIVEN** a pilot entity
- **WHEN** accessing identity attributes
- **THEN** the pilot MUST have: id, name, callsign (optional), affiliation (optional)
- **AND** the pilot MAY have: portrait, background notes

#### Scenario: Pilot combat skills
- **GIVEN** a pilot entity
- **WHEN** accessing combat skills
- **THEN** gunnery skill MUST be a value from 1-8 (lower is better)
- **AND** piloting skill MUST be a value from 1-8 (lower is better)
- **AND** default values SHALL be gunnery 4, piloting 5

#### Scenario: Pilot wounds
- **GIVEN** a pilot entity
- **WHEN** tracking wounds
- **THEN** wounds MUST be a value from 0-6
- **AND** 6 wounds indicates pilot death
- **AND** wounds apply skill penalties (+1 per wound)

### Requirement: Pilot Career Tracking

The system SHALL track pilot career statistics across games.

#### Scenario: Mission tracking
- **GIVEN** a persistent pilot
- **WHEN** completing a game session
- **THEN** mission count SHALL increment
- **AND** mission outcome (victory/defeat/draw) SHALL be recorded

#### Scenario: Kill tracking
- **GIVEN** a pilot who destroys an enemy unit
- **WHEN** recording the kill
- **THEN** kill record SHALL include: target name, weapon used, date, game ID
- **AND** total kill count SHALL increment

#### Scenario: XP accumulation
- **GIVEN** a pilot completing game actions
- **WHEN** calculating XP earned
- **THEN** XP SHALL be awarded for: mission survival (10), kills (15 each), victory bonus (10)
- **AND** bonus XP MAY be awarded for: first blood (5), higher BV opponent (5)

### Requirement: Pilot Skill Progression

The system SHALL allow pilots to improve skills by spending XP.

#### Scenario: Gunnery improvement
- **GIVEN** a pilot with sufficient XP
- **WHEN** improving gunnery skill
- **THEN** gunnery 5→4 costs 100 XP
- **AND** gunnery 4→3 costs 200 XP
- **AND** gunnery 3→2 costs 400 XP
- **AND** gunnery 2→1 costs 800 XP

#### Scenario: Piloting improvement
- **GIVEN** a pilot with sufficient XP
- **WHEN** improving piloting skill
- **THEN** piloting 5→4 costs 75 XP
- **AND** piloting 4→3 costs 150 XP
- **AND** piloting 3→2 costs 300 XP
- **AND** piloting 2→1 costs 600 XP

### Requirement: Special Abilities

The system SHALL provide special abilities that modify pilot performance.

#### Scenario: Ability acquisition
- **GIVEN** a pilot with sufficient XP
- **WHEN** purchasing an ability
- **THEN** ability prerequisites MUST be met
- **AND** XP cost MUST be deducted
- **AND** ability SHALL be added to pilot record

#### Scenario: Weapon Specialist ability
- **GIVEN** a pilot with Weapon Specialist (Medium Laser)
- **WHEN** firing a medium laser
- **THEN** to-hit modifier SHALL be reduced by 1

#### Scenario: Iron Will ability
- **GIVEN** a pilot with Iron Will
- **WHEN** making a consciousness check
- **THEN** target number SHALL be reduced by 2

#### Scenario: Evasive ability
- **GIVEN** a pilot with Evasive
- **WHEN** calculating Target Movement Modifier
- **THEN** TMM SHALL be increased by 1 when running or jumping

### Requirement: Pilot Creation Modes

The system SHALL provide multiple methods for creating pilots.

#### Scenario: Template-based creation
- **GIVEN** pilot creation wizard
- **WHEN** selecting a template
- **THEN** Green template provides gunnery 5, piloting 6
- **AND** Regular template provides gunnery 4, piloting 5
- **AND** Veteran template provides gunnery 3, piloting 4
- **AND** Elite template provides gunnery 2, piloting 3

#### Scenario: Custom creation
- **GIVEN** pilot creation wizard in custom mode
- **WHEN** allocating skill points
- **THEN** user SHALL select gunnery and piloting values
- **AND** user MAY select starting abilities within XP budget
- **AND** total cost MUST not exceed starting XP allowance

#### Scenario: Random generation
- **GIVEN** pilot creation wizard in random mode
- **WHEN** generating a pilot
- **THEN** skills SHALL be randomly determined within bounds
- **AND** background details MAY be randomly generated
- **AND** one random ability MAY be granted

#### Scenario: Statblock creation
- **GIVEN** need for quick NPC pilot
- **WHEN** using statblock mode
- **THEN** user SHALL directly set gunnery and piloting values
- **AND** no career tracking is enabled
- **AND** pilot is not persisted to database

### Requirement: Pilot Persistence

Persistent pilots SHALL be stored in the database.

#### Scenario: Save pilot
- **GIVEN** a new persistent pilot
- **WHEN** saving to database
- **THEN** all pilot attributes SHALL be stored
- **AND** unique ID SHALL be assigned
- **AND** creation timestamp SHALL be recorded

#### Scenario: Load pilot
- **GIVEN** a pilot ID
- **WHEN** loading from database
- **THEN** all pilot attributes SHALL be restored
- **AND** career history SHALL be available
- **AND** abilities SHALL be loaded

#### Scenario: Update pilot after game
- **GIVEN** a pilot who participated in a game
- **WHEN** game concludes
- **THEN** mission count SHALL be updated
- **AND** kills SHALL be recorded
- **AND** XP SHALL be added
- **AND** wounds SHALL be reset to 0 (healed between games)
