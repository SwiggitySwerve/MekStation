## ADDED Requirements

### Requirement: Targeting Quirk — Improved Targeting

Improved Targeting quirks SHALL grant -1 to-hit at the specified range bracket.

#### Scenario: Improved Targeting Short

- **WHEN** a unit with Improved Targeting (Short) attacks at short range
- **THEN** the attack SHALL receive a -1 to-hit modifier

#### Scenario: Improved Targeting Medium

- **WHEN** a unit with Improved Targeting (Medium) attacks at medium range
- **THEN** the attack SHALL receive a -1 to-hit modifier

#### Scenario: Improved Targeting Long

- **WHEN** a unit with Improved Targeting (Long) attacks at long range
- **THEN** the attack SHALL receive a -1 to-hit modifier

### Requirement: Targeting Quirk — Poor Targeting

Poor Targeting quirks SHALL impose +1 to-hit at the specified range bracket.

#### Scenario: Poor Targeting Short

- **WHEN** a unit with Poor Targeting (Short) attacks at short range
- **THEN** the attack SHALL receive a +1 to-hit modifier

#### Scenario: Poor Targeting Medium

- **WHEN** a unit with Poor Targeting (Medium) attacks at medium range
- **THEN** the attack SHALL receive a +1 to-hit modifier

#### Scenario: Poor Targeting Long

- **WHEN** a unit with Poor Targeting (Long) attacks at long range
- **THEN** the attack SHALL receive a +1 to-hit modifier

### Requirement: Piloting Quirk — Easy to Pilot

The Easy to Pilot quirk SHALL grant -1 to PSRs triggered by terrain.

#### Scenario: Easy to Pilot terrain PSR

- **WHEN** a unit with Easy to Pilot makes a PSR triggered by terrain entry
- **THEN** the PSR target number SHALL be reduced by 1

### Requirement: Piloting Quirk — Stable

The Stable quirk SHALL grant -1 to all PSRs.

#### Scenario: Stable unit PSR bonus

- **WHEN** a unit with the Stable quirk makes any PSR
- **THEN** the PSR target number SHALL be reduced by 1

### Requirement: Piloting Quirk — Hard to Pilot

The Hard to Pilot quirk SHALL impose +1 to all PSRs.

#### Scenario: Hard to Pilot PSR penalty

- **WHEN** a unit with Hard to Pilot makes any PSR
- **THEN** the PSR target number SHALL be increased by 1

### Requirement: Piloting Quirk — Unbalanced

The Unbalanced quirk SHALL impose +1 to PSRs triggered by terrain.

#### Scenario: Unbalanced terrain PSR penalty

- **WHEN** a unit with Unbalanced makes a PSR triggered by terrain entry
- **THEN** the PSR target number SHALL be increased by 1

### Requirement: Piloting Quirk — Cramped Cockpit

The Cramped Cockpit quirk SHALL impose +1 to all piloting rolls.

#### Scenario: Cramped Cockpit piloting penalty

- **WHEN** a pilot in a unit with Cramped Cockpit makes any piloting roll
- **THEN** the piloting roll target number SHALL be increased by 1

### Requirement: Physical Quirk — Battle Fist

The Battle Fist quirk SHALL add +1 damage to punch attacks with the equipped arm.

#### Scenario: Battle Fist punch damage bonus

- **WHEN** a unit with Battle Fist punches with the equipped arm
- **THEN** punch damage SHALL be increased by 1

### Requirement: Physical Quirk — No Arms

The No Arms quirk SHALL prevent the unit from performing punch attacks.

#### Scenario: No Arms prevents punching

- **WHEN** a unit with the No Arms quirk attempts a physical attack
- **THEN** punch attacks SHALL NOT be permitted

### Requirement: Physical Quirk — Low Arms

The Low Arms quirk SHALL restrict physical attacks based on elevation difference.

#### Scenario: Low Arms elevation restriction

- **WHEN** a unit with Low Arms attempts to punch a target at a higher elevation
- **THEN** the punch SHALL NOT be permitted if the elevation difference exceeds the restriction

### Requirement: Initiative Quirk — Command Mech

The Command Mech quirk SHALL grant +1 to initiative rolls.

#### Scenario: Command Mech initiative bonus

- **WHEN** a force includes a unit with the Command Mech quirk
- **THEN** the initiative roll SHALL receive a +1 modifier

### Requirement: Initiative Quirk — Battle Computer

The Battle Computer quirk SHALL grant +2 to initiative rolls, not cumulative with Command Mech.

#### Scenario: Battle Computer initiative bonus

- **WHEN** a force includes a unit with the Battle Computer quirk
- **THEN** the initiative roll SHALL receive a +2 modifier

#### Scenario: Battle Computer does not stack with Command Mech

- **WHEN** a force includes a unit with Battle Computer and another with Command Mech
- **THEN** only the +2 from Battle Computer SHALL apply (not +3)

### Requirement: Defensive Quirk — Distracting

The Distracting quirk SHALL impose +1 to-hit for all enemy attacks against the unit.

#### Scenario: Distracting modifier

- **WHEN** an enemy attacks a unit with the Distracting quirk
- **THEN** the attack SHALL receive a +1 to-hit modifier

### Requirement: Defensive Quirk — Low Profile

The Low Profile quirk SHALL provide a partial cover effect for the unit.

#### Scenario: Low Profile partial cover

- **WHEN** an enemy attacks a unit with the Low Profile quirk
- **THEN** the unit SHALL be treated as if it has partial cover for hit location purposes

### Requirement: Combat Quirk — Sensor Ghosts

The Sensor Ghosts quirk SHALL impose +1 to the unit's own attacks.

#### Scenario: Sensor Ghosts attack penalty

- **WHEN** a unit with Sensor Ghosts makes an attack
- **THEN** the attack SHALL receive a +1 to-hit modifier (penalty to own accuracy)

### Requirement: Combat Quirk — Multi-Trac

The Multi-Trac quirk SHALL eliminate the secondary target penalty for front-arc targets.

#### Scenario: Multi-Trac eliminates front-arc secondary penalty

- **WHEN** a unit with Multi-Trac fires at a secondary target in the front arc
- **THEN** no secondary target penalty SHALL apply

#### Scenario: Multi-Trac does not affect non-front-arc secondary targets

- **WHEN** a unit with Multi-Trac fires at a secondary target outside the front arc
- **THEN** the normal +2 secondary target penalty SHALL apply

### Requirement: Crit Quirk — Rugged

The Rugged quirk SHALL provide critical hit resistance.

#### Scenario: Rugged 1 crit resistance

- **WHEN** a critical hit is rolled on a unit with Rugged 1
- **THEN** the first critical hit each game SHALL be negated

#### Scenario: Rugged 2 crit resistance

- **WHEN** critical hits are rolled on a unit with Rugged 2
- **THEN** the first two critical hits each game SHALL be negated

### Requirement: Crit Quirk — Protected Actuators

The Protected Actuators quirk SHALL impose +1 on enemy critical hit rolls targeting actuators.

#### Scenario: Protected Actuators crit defense

- **WHEN** an enemy scores a critical hit on a location with actuators on a unit with Protected Actuators
- **THEN** the critical hit determination roll SHALL receive a +1 modifier (harder to crit)

### Requirement: Crit Quirk — Exposed Actuators

The Exposed Actuators quirk SHALL impose -1 on enemy critical hit rolls targeting actuators.

#### Scenario: Exposed Actuators crit vulnerability

- **WHEN** an enemy scores a critical hit on a location with actuators on a unit with Exposed Actuators
- **THEN** the critical hit determination roll SHALL receive a -1 modifier (easier to crit)

### Requirement: Weapon Quirk — Accurate

The Accurate weapon quirk SHALL grant -1 to-hit for the specific weapon.

#### Scenario: Accurate weapon bonus

- **WHEN** a weapon with the Accurate quirk is fired
- **THEN** the attack SHALL receive a -1 to-hit modifier for that weapon

### Requirement: Weapon Quirk — Inaccurate

The Inaccurate weapon quirk SHALL impose +1 to-hit for the specific weapon.

#### Scenario: Inaccurate weapon penalty

- **WHEN** a weapon with the Inaccurate quirk is fired
- **THEN** the attack SHALL receive a +1 to-hit modifier for that weapon

### Requirement: Weapon Quirk — Stable Weapon

The Stable Weapon quirk SHALL grant -1 to the running movement to-hit penalty for the specific weapon.

#### Scenario: Stable Weapon reduces running penalty

- **WHEN** a weapon with the Stable Weapon quirk is fired after running
- **THEN** the running movement to-hit modifier SHALL be reduced by 1 for that weapon

### Requirement: Weapon Quirk — Improved/Poor/No Cooling

Weapon cooling quirks SHALL modify the heat generated by the specific weapon.

#### Scenario: Improved Cooling weapon

- **WHEN** a weapon with the Improved Cooling quirk is fired
- **THEN** the weapon SHALL generate 1 less heat than normal

#### Scenario: Poor Cooling weapon

- **WHEN** a weapon with the Poor Cooling quirk is fired
- **THEN** the weapon SHALL generate 1 more heat than normal

#### Scenario: No Cooling weapon

- **WHEN** a weapon with the No Cooling quirk is fired
- **THEN** the weapon SHALL generate double its normal heat

### Requirement: Weapon Quirk Parsing from MTF/BLK

The system SHALL parse weapon quirks from MTF and BLK unit files during unit loading.

#### Scenario: Weapon quirks parsed from unit data

- **WHEN** a unit is loaded from MTF or BLK format
- **THEN** weapon-specific quirks SHALL be parsed and stored per weapon
- **AND** the weapon quirks SHALL be accessible via the unit's data model

### Requirement: Quirk Fields in State Interfaces

The system SHALL add `unitQuirks` and `weaponQuirks` fields to state interfaces.

#### Scenario: unitQuirks field on IAttackerState

- **WHEN** constructing an attacker state for to-hit calculation
- **THEN** the `unitQuirks` field SHALL contain a readonly array of quirk identifiers
- **AND** the field SHALL be optional for backward compatibility

#### Scenario: weaponQuirks field on IAttackerState

- **WHEN** constructing an attacker state for to-hit calculation
- **THEN** the `weaponQuirks` field SHALL contain a record mapping weapon IDs to their quirk arrays
- **AND** the field SHALL be optional for backward compatibility

#### Scenario: unitQuirks field on ITargetState

- **WHEN** constructing a target state for to-hit calculation
- **THEN** the `unitQuirks` field SHALL contain a readonly array of quirk identifiers for the target unit
- **AND** the field SHALL be optional for backward compatibility
