# battle-value-system (delta)

## ADDED Requirements

### Requirement: BattleArmor BV Dispatch

The BV calculator SHALL route `IBattleArmorUnit` inputs to a BA-specific calculation path.

#### Scenario: BA dispatch

- **GIVEN** a BA squad
- **WHEN** `calculateBattleValue` is called
- **THEN** the BA calculator SHALL be invoked
- **AND** the return SHALL include an `IBABreakdown`

### Requirement: Per-Trooper Defensive BV

BA defensive BV SHALL combine armor points, movement, and anti-mech equipment per trooper.

#### Scenario: Armor BV with Standard armor

- **GIVEN** a trooper with 5 points Standard BA armor
- **WHEN** defensive BV is computed
- **THEN** armorBV SHALL equal `5 × 2.5 × 1.0 = 12.5`

#### Scenario: Stealth armor multiplier

- **GIVEN** a trooper with 5 points Basic Stealth BA armor
- **WHEN** defensive BV is computed
- **THEN** armorBV SHALL equal `5 × 2.5 × 1.5 = 18.75`

#### Scenario: Magnetic Clamp anti-mech bonus

- **GIVEN** a trooper equipped with Magnetic Clamps
- **WHEN** defensive BV is computed
- **THEN** an additional 5 BV SHALL be added per trooper

#### Scenario: Move BV by class

- **GIVEN** a Medium-class trooper with ground MP 2
- **WHEN** move BV is computed
- **THEN** moveBV SHALL equal `2 × 0.75 = 1.5`

### Requirement: Per-Trooper Offensive BV

BA offensive BV SHALL combine weapon, ammo, and manipulator BV per trooper.

#### Scenario: Manipulator melee BV

- **GIVEN** a trooper with Vibro-Claws on both arms
- **WHEN** offensive BV is computed
- **THEN** manipulator BV SHALL contribute `3 × 2 = 6` BV

#### Scenario: Weapon BV identical to catalog

- **GIVEN** a trooper with an SRM-2 (catalog BV 21)
- **WHEN** offensive BV is computed
- **THEN** weaponBV SHALL equal 21

### Requirement: Squad-Scale BV

BA BV SHALL scale linearly with squad size.

#### Scenario: Clan 5-trooper squad

- **GIVEN** a Clan squad with trooperBV = 100 and squadSize = 5
- **WHEN** squad BV is computed
- **THEN** squadBV SHALL equal 500 (before pilot skill)

#### Scenario: IS 4-trooper squad

- **GIVEN** an IS squad with trooperBV = 80 and squadSize = 4
- **WHEN** squad BV is computed
- **THEN** squadBV SHALL equal 320 (before pilot skill)

### Requirement: BA Pilot Skill Multiplier

The shared gunnery × piloting table SHALL apply to BA final BV.

#### Scenario: Elite BA crew

- **GIVEN** a BA squad with gunnery 3 piloting 4
- **WHEN** final BV is computed
- **THEN** the pilot multiplier SHALL be read from the table row g=3 p=4
