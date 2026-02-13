# quirk-combat-integration Specification

## Purpose

TBD - created by archiving change full-combat-parity. Update Purpose after archive.

## Requirements

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

#### Scenario: Weapon quirks parsed from MTF format

- **WHEN** a unit is loaded from MTF format
- **THEN** weapon quirk lines with format `weapon_quirk:quirk_name:weapon_name:location` SHALL be parsed
- **AND** the quirks SHALL be stored in a record mapping weapon name to quirk array

#### Scenario: Weapon quirks parsed from BLK format

- **WHEN** a unit is loaded from BLK format
- **THEN** weapon quirk entries with format `quirk_name:weapon_name` SHALL be parsed
- **AND** the quirks SHALL be stored in a record mapping weapon name to quirk array

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

### Requirement: Quirk ID Constants

The system SHALL define constants for all quirk identifiers matching MTF/BLK format.

#### Scenario: Unit quirk ID constants

- **WHEN** accessing `UNIT_QUIRK_IDS`
- **THEN** it SHALL contain constants for all 20 unit quirks with string values matching MTF/BLK format:
  - `improved_targeting_short`, `improved_targeting_medium`, `improved_targeting_long`
  - `poor_targeting_short`, `poor_targeting_medium`, `poor_targeting_long`
  - `distracting`, `low_profile`
  - `easy_to_pilot`, `stable`, `hard_to_pilot`, `unbalanced`, `cramped_cockpit`
  - `battle_fists_la`, `battle_fists_ra`, `no_arms`, `low_arms`
  - `command_mech`, `battle_computer`
  - `sensor_ghosts`, `multi_trac`
  - `rugged_1`, `rugged_2`, `protected_actuators`, `exposed_actuators`

#### Scenario: Weapon quirk ID constants

- **WHEN** accessing `WEAPON_QUIRK_IDS`
- **THEN** it SHALL contain constants for all 6 weapon quirks with string values matching MTF/BLK format:
  - `accurate`, `inaccurate`, `stable_weapon`
  - `improved_cooling`, `poor_cooling`, `no_cooling`

### Requirement: Quirk Catalog

The system SHALL maintain a complete catalog of all unit and weapon quirks with metadata.

#### Scenario: Quirk catalog structure

- **WHEN** accessing the quirk catalog
- **THEN** each quirk entry SHALL contain:
  - `id`: unique quirk identifier matching MTF/BLK format
  - `name`: human-readable display name
  - `category`: quirk category (targeting, defensive, piloting, physical, initiative, combat, crit, weapon)
  - `pipelines`: array of combat pipelines affected (to-hit, psr, initiative, physical, damage, heat, crit)
  - `combatEffect`: description of the combat effect
  - `isPositive`: whether the quirk is beneficial (true) or detrimental (false)

#### Scenario: Quirk catalog completeness

- **WHEN** the quirk catalog is initialized
- **THEN** it SHALL contain all 26 quirks:
  - 6 targeting quirks (Improved/Poor Targeting × 3 ranges)
  - 2 defensive quirks (Distracting, Low Profile)
  - 5 piloting quirks (Easy to Pilot, Stable, Hard to Pilot, Unbalanced, Cramped Cockpit)
  - 4 physical quirks (Battle Fists LA/RA, No Arms, Low Arms)
  - 2 initiative quirks (Command Mech, Battle Computer)
  - 2 combat quirks (Sensor Ghosts, Multi-Trac)
  - 4 crit quirks (Rugged 1/2, Protected/Exposed Actuators)
  - 6 weapon quirks (Accurate, Inaccurate, Stable Weapon, Improved/Poor/No Cooling)

### Requirement: Quirk Aggregation Function

The system SHALL provide an aggregation function to calculate all quirk-based to-hit modifiers.

#### Scenario: calculateAttackerQuirkModifiers aggregates all quirk modifiers

- **WHEN** `calculateAttackerQuirkModifiers` is called with attacker state, target state, range bracket, and optional weapon ID
- **THEN** the function SHALL:
  - Calculate targeting quirk modifiers from attacker quirks
  - Calculate Sensor Ghosts modifier from attacker quirks
  - Calculate Multi-Trac modifier from attacker quirks and secondary target state
  - Calculate Distracting modifier from target quirks
  - Calculate Low Profile modifier from target quirks (only if no partial cover)
  - Calculate weapon quirk modifiers (Accurate, Inaccurate, Stable Weapon) if weapon ID provided
- **AND** return an array of all applicable modifier details

#### Scenario: Empty quirk arrays return no modifiers

- **WHEN** `calculateAttackerQuirkModifiers` is called with empty attacker and target quirk arrays
- **THEN** the function SHALL return an empty array

#### Scenario: Weapon quirks only applied when weapon ID provided

- **WHEN** `calculateAttackerQuirkModifiers` is called without a weapon ID
- **THEN** weapon-specific quirk modifiers SHALL NOT be included in the result

### Requirement: Quirk Utility Functions

The system SHALL provide utility functions for quirk lookup and filtering.

#### Scenario: Get quirk catalog size

- **WHEN** `getQuirkCatalogSize()` is called
- **THEN** it SHALL return 26 (total number of quirks in catalog)

#### Scenario: Get quirks by pipeline

- **WHEN** `getQuirksForPipeline('to-hit')` is called
- **THEN** it SHALL return all quirks affecting the to-hit pipeline:
  - 6 targeting quirks
  - 2 defensive quirks (Distracting, Low Profile)
  - 2 combat quirks (Sensor Ghosts, Multi-Trac)
  - 3 weapon quirks (Accurate, Inaccurate, Stable Weapon)

#### Scenario: Get quirks by category

- **WHEN** `getQuirksByCategory('piloting')` is called
- **THEN** it SHALL return all 5 piloting quirks

#### Scenario: Check if unit has quirk

- **WHEN** `hasQuirk(unitQuirks, 'stable')` is called
- **THEN** it SHALL return true if 'stable' is in the unitQuirks array, false otherwise

### Requirement: Weapon Quirk Lookup

The system SHALL provide a function to retrieve weapon quirks by weapon ID.

#### Scenario: Get weapon quirks by ID

- **WHEN** `getWeaponQuirks(weaponQuirks, weaponId)` is called
- **THEN** it SHALL return the quirk array for the specified weapon ID
- **AND** return an empty array if the weapon ID is not found or weaponQuirks is undefined

### Requirement: Quirk Helper Functions

The system SHALL provide helper functions for quirk-based combat logic.

#### Scenario: hasLowProfile helper

- **WHEN** `hasLowProfile(unitQuirks)` is called
- **THEN** it SHALL return true if the unit has the Low Profile quirk, false otherwise

#### Scenario: hasNoArms helper

- **WHEN** `hasNoArms(unitQuirks)` is called
- **THEN** it SHALL return true if the unit has the No Arms quirk, false otherwise

#### Scenario: isLowArmsRestricted helper

- **WHEN** `isLowArmsRestricted(unitQuirks, elevationDifference)` is called
- **THEN** it SHALL return true if the unit has Low Arms quirk AND elevation difference is positive (target higher)
- **AND** return false otherwise
