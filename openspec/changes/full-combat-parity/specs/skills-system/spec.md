## ADDED Requirements

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
