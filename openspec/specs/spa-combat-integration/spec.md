# spa-combat-integration Specification

## Purpose

TBD - created by archiving change full-combat-parity. Update Purpose after archive.

## Requirements

### Requirement: Gunnery SPA — Weapon Specialist

The Weapon Specialist SPA SHALL grant a -2 to-hit modifier when firing the designated weapon type.

#### Scenario: Weapon Specialist with designated weapon

- **WHEN** a pilot with Weapon Specialist (Medium Laser) fires a Medium Laser
- **THEN** the attack SHALL receive a -2 to-hit modifier

#### Scenario: Weapon Specialist with non-designated weapon

- **WHEN** a pilot with Weapon Specialist (Medium Laser) fires an AC/10
- **THEN** no Weapon Specialist modifier SHALL apply

### Requirement: Gunnery SPA — Gunnery Specialist

The Gunnery Specialist SPA SHALL grant -1 to-hit for attacks with the designated weapon category and +1 for all other categories.

#### Scenario: Gunnery Specialist with designated category

- **WHEN** a pilot with Gunnery Specialist (Energy) fires an energy weapon
- **THEN** the attack SHALL receive a -1 to-hit modifier

#### Scenario: Gunnery Specialist with other category

- **WHEN** a pilot with Gunnery Specialist (Energy) fires a ballistic weapon
- **THEN** the attack SHALL receive a +1 to-hit modifier

### Requirement: Gunnery SPA — Blood Stalker

The Blood Stalker SPA SHALL grant -1 to-hit against the designated target and +2 against all other targets.

#### Scenario: Blood Stalker attacks designated target

- **WHEN** a pilot with Blood Stalker attacks their designated target
- **THEN** the attack SHALL receive a -1 to-hit modifier

#### Scenario: Blood Stalker attacks non-designated target

- **WHEN** a pilot with Blood Stalker attacks a target other than their designated target
- **THEN** the attack SHALL receive a +2 to-hit modifier

### Requirement: Gunnery SPA — Range Master

The Range Master SPA SHALL zero the range modifier for one designated range bracket.

#### Scenario: Range Master zeroes medium range penalty

- **WHEN** a pilot with Range Master (Medium) fires at medium range
- **THEN** the range to-hit modifier SHALL be 0 (instead of +2)

#### Scenario: Range Master at non-designated bracket

- **WHEN** a pilot with Range Master (Medium) fires at long range
- **THEN** the normal long range modifier SHALL apply

### Requirement: Gunnery SPA — Sniper

The Sniper SPA SHALL halve all range modifiers (round down).

#### Scenario: Sniper halves range modifiers

- **WHEN** a pilot with Sniper fires at long range (normally +4)
- **THEN** the range modifier SHALL be halved to +2

#### Scenario: Sniper at medium range

- **WHEN** a pilot with Sniper fires at medium range (normally +2)
- **THEN** the range modifier SHALL be halved to +1

### Requirement: Gunnery SPA — Multi-Tasker

The Multi-Tasker SPA SHALL reduce secondary target penalties by 1.

#### Scenario: Multi-Tasker reduces secondary penalty

- **WHEN** a pilot with Multi-Tasker fires at a secondary target in the front arc
- **THEN** the secondary target penalty SHALL be 0 (instead of +1)

#### Scenario: Multi-Tasker with rear arc secondary

- **WHEN** a pilot with Multi-Tasker fires at a secondary target outside the front arc
- **THEN** the secondary target penalty SHALL be +1 (instead of +2)

### Requirement: Gunnery SPA — Cluster Hitter

The Cluster Hitter SPA SHALL add +1 to the cluster hit table column shift.

#### Scenario: Cluster Hitter bonus

- **WHEN** a pilot with Cluster Hitter fires a cluster weapon
- **THEN** the cluster hit roll SHALL receive a +1 column shift (more hits)

### Requirement: Piloting SPA — Jumping Jack

The Jumping Jack SPA SHALL reduce the jump attack to-hit modifier from +3 to +1.

#### Scenario: Jumping Jack reduces jump attack penalty

- **WHEN** a pilot with Jumping Jack fires after jumping
- **THEN** the jump movement to-hit modifier SHALL be +1 (instead of +3)

### Requirement: Piloting SPA — Dodge Maneuver

The Dodge Maneuver SPA SHALL grant +2 to-hit for enemies when the pilot declares a dodge action.

#### Scenario: Dodge action grants defensive bonus

- **WHEN** a pilot with Dodge Maneuver declares a dodge action
- **THEN** all attacks against the dodging unit SHALL receive a +2 to-hit modifier
- **AND** the pilot SHALL forfeit their attack for that turn

### Requirement: Piloting SPA — Melee Specialist

The Melee Specialist SPA SHALL grant -1 to-hit for physical attacks.

#### Scenario: Melee Specialist punch bonus

- **WHEN** a pilot with Melee Specialist makes a punch attack
- **THEN** the attack SHALL receive a -1 to-hit modifier

#### Scenario: Melee Specialist kick bonus

- **WHEN** a pilot with Melee Specialist makes a kick attack
- **THEN** the attack SHALL receive a -1 to-hit modifier

### Requirement: Piloting SPA — Melee Master

The Melee Master SPA SHALL improve physical attack damage.

#### Scenario: Melee Master damage bonus

- **WHEN** a pilot with Melee Master lands a physical attack
- **THEN** the physical attack damage SHALL be increased by 1 point

### Requirement: Misc SPA — Tactical Genius

The Tactical Genius SPA SHALL grant +1 to initiative rolls.

#### Scenario: Tactical Genius initiative bonus

- **WHEN** a force includes a pilot with Tactical Genius
- **THEN** the initiative roll SHALL receive a +1 modifier

### Requirement: Misc SPA — Pain Resistance

The Pain Resistance SPA SHALL allow the pilot to ignore the first wound's effects.

#### Scenario: Pain Resistance ignores first wound

- **WHEN** a pilot with Pain Resistance has 1 wound
- **THEN** the pilot wound to-hit modifier SHALL be 0 (first wound ignored)

#### Scenario: Pain Resistance with multiple wounds

- **WHEN** a pilot with Pain Resistance has 3 wounds
- **THEN** the pilot wound to-hit modifier SHALL be +2 (ignoring first wound: 3 - 1 = 2)

### Requirement: Misc SPA — Iron Man

The Iron Man SPA SHALL grant -2 to consciousness check target numbers.

#### Scenario: Iron Man consciousness check bonus

- **WHEN** a pilot with Iron Man makes a consciousness check
- **THEN** the consciousness check target number SHALL be reduced by 2

### Requirement: Misc SPA — Hot Dog

The Hot Dog SPA SHALL increase the heat threshold for shutdown checks by +3.

#### Scenario: Hot Dog delays shutdown

- **WHEN** a pilot with Hot Dog SPA has heat level 16
- **THEN** no shutdown check SHALL be required (effective threshold 17 instead of 14)

### Requirement: Misc SPA — Edge

The Edge SPA SHALL provide a trigger-based reroll system with 6 mek-specific triggers.

#### Scenario: Edge triggers for mek combat

- **WHEN** a pilot with Edge is in mek combat
- **THEN** Edge SHALL be usable for: (1) reroll to-hit, (2) reroll damage location, (3) reroll critical hit determination, (4) reroll PSR, (5) reroll consciousness check, (6) negate one critical hit
- **AND** each use of Edge SHALL consume one Edge point
- **AND** Edge points SHALL NOT regenerate during the game

#### Scenario: Edge point tracking

- **WHEN** a pilot uses Edge to reroll
- **THEN** their remaining Edge points SHALL decrease by 1
- **AND** when Edge points reach 0, no further Edge uses SHALL be permitted

### Requirement: Abilities Field in State Interfaces

The system SHALL add an `abilities` field to `IAttackerState` and `ITargetState` for SPA integration.

#### Scenario: Abilities field on IAttackerState

- **WHEN** constructing an attacker state for to-hit calculation
- **THEN** the `abilities` field SHALL contain a readonly array of SPA identifiers for the pilot
- **AND** the field SHALL be optional for backward compatibility

#### Scenario: Abilities field on ITargetState

- **WHEN** constructing a target state for to-hit calculation
- **THEN** the `abilities` field SHALL contain a readonly array of SPA identifiers for the target's pilot
- **AND** the field SHALL be optional for backward compatibility

### Requirement: SPA Pipeline Integration

All SPAs SHALL be wired into the appropriate combat pipelines (to-hit, damage, PSR, heat, initiative).

#### Scenario: SPAs checked during to-hit calculation

- **WHEN** calculating to-hit modifiers
- **THEN** the system SHALL check the attacker's abilities for gunnery SPAs
- **AND** applicable SPA modifiers SHALL be included in the modifier list

#### Scenario: SPAs checked during PSR resolution

- **WHEN** resolving a piloting skill roll
- **THEN** the system SHALL check the pilot's abilities for piloting SPAs
- **AND** applicable SPA modifiers SHALL be applied to the PSR
