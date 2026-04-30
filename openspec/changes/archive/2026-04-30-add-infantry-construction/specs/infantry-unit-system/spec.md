# infantry-unit-system (delta)

## ADDED Requirements

### Requirement: Field Gun Crew Integration

The system SHALL allow a platoon to crew one field gun from the approved list.

#### Scenario: Field gun crew

- **GIVEN** a 20-trooper platoon crewing an AC/5 field gun (crew 3)
- **WHEN** effective combat-ready trooper count is computed
- **THEN** 17 troopers SHALL contribute personal weapons
- **AND** 3 troopers SHALL operate the field gun

#### Scenario: Over-crew field gun

- **GIVEN** a 5-trooper platoon with an AC/20 field gun (crew 5)
- **WHEN** validation runs
- **THEN** `VAL-INF-FIELD-GUN` SHALL emit "field gun crew ≥ platoon size"

### Requirement: Anti-Mech Training Combat Activation

The system SHALL support an anti-mech training flag enabling leg / swarm attacks in combat.

#### Scenario: Anti-mech enabled

- **GIVEN** a Foot platoon with `antiMechTraining = true`
- **WHEN** combat options are enumerated
- **THEN** Leg Attack and Swarm Attack SHALL be available options
- **AND** the BV multiplier for anti-mech training SHALL be recorded for the BV calculator

#### Scenario: Motorized cannot train anti-mech

- **GIVEN** a Motorized platoon with `antiMechTraining = true`
- **WHEN** validation runs
- **THEN** `VAL-INF-ANTI-MECH` SHALL emit "anti-mech training requires Foot, Jump, or Mechanized motive"

### Requirement: Infantry Construction Validation Registry

The validation registry SHALL include the `VAL-INF-*` rule group.

#### Scenario: Rule ids registered

- **WHEN** the validation registry initializes
- **THEN** `VAL-INF-PLATOON`, `VAL-INF-MOTIVE`, `VAL-INF-ARMOR-KIT`, `VAL-INF-WEAPON`, `VAL-INF-FIELD-GUN`, and `VAL-INF-ANTI-MECH` SHALL be registered

## MODIFIED Requirements

### Requirement: Platoon Composition

Infantry units SHALL be organized as platoons composed of multiple squads. The system SHALL initialize a platoon composition based on motive type with defaults drawn from TechManual.

#### Scenario: Default platoon configuration

- **WHEN** creating a new Infantry platoon with no options
- **THEN** `squadSize` SHALL default to `7` soldiers per squad
- **AND** `numberOfSquads` SHALL default to `4`
- **AND** `platoonStrength` SHALL equal `squadSize * numberOfSquads` (28 soldiers)

#### Scenario: Squad size constraints

- **WHEN** setting squad size
- **THEN** `squadSize` MUST be clamped to the range `[1, 10]`
- **AND** the store SHALL enforce `Math.max(1, Math.min(10, squadSize))`

#### Scenario: Number of squads constraints

- **WHEN** setting number of squads
- **THEN** `numberOfSquads` MUST be clamped to the range `[1, 10]`
- **AND** the store SHALL enforce `Math.max(1, Math.min(10, numberOfSquads))`

#### Scenario: Standard platoon count warning

- **WHEN** validating an Infantry unit with more than 4 squads
- **THEN** a warning SHALL be generated: "Unusual number of squads (standard is 2-4)"

#### Scenario: Foot default

- **GIVEN** a new Foot-motive infantry platoon
- **WHEN** composition is initialized
- **THEN** `platoonComposition.squads` SHALL equal 7
- **AND** `platoonComposition.troopersPerSquad` SHALL equal 4
- **AND** total troopers SHALL equal 28

#### Scenario: Jump default

- **GIVEN** a new Jump-motive platoon
- **WHEN** composition is initialized
- **THEN** total troopers SHALL equal 25 (5 × 5)

#### Scenario: Mechanized default

- **GIVEN** a new Mechanized-Tracked platoon
- **WHEN** composition is initialized
- **THEN** total troopers SHALL equal 20 (4 × 5)

#### Scenario: Out-of-range platoon size

- **GIVEN** a platoon with 35 troopers
- **WHEN** validation runs
- **THEN** `VAL-INF-PLATOON` SHALL emit "platoon size 35 exceeds maximum 30"

### Requirement: Motion Types

Infantry units SHALL support multiple motion types determining movement capability. The system SHALL assign movement points based on motive type.

#### Scenario: Supported motion types

- **WHEN** configuring Infantry motion type
- **THEN** the system SHALL support the following `SquadMotionType` values:
  - `FOOT` — standard foot infantry (default, ground MP 1)
  - `JUMP` — jump-capable infantry
  - `MOTORIZED` — motorized transport
  - `MECHANIZED` — mechanized (IFV-transported)
  - `WHEELED` — wheeled transport
  - `TRACKED` — tracked transport
  - `HOVER` — hover transport
  - `VTOL` — VTOL transport
  - `BEAST` — beast-mounted

#### Scenario: Default motion type

- **WHEN** creating a new Infantry platoon with no motion type specified
- **THEN** `motionType` SHALL default to `SquadMotionType.FOOT`
- **AND** `groundMP` SHALL default to `1`
- **AND** `jumpMP` SHALL default to `0`

#### Scenario: Movement point constraints

- **WHEN** setting movement points
- **THEN** `groundMP` MUST be `>= 0`
- **AND** `jumpMP` MUST be `>= 0`

#### Scenario: Foot MP

- **GIVEN** a Foot platoon
- **WHEN** MP is computed
- **THEN** ground MP SHALL equal 1 and jump MP SHALL equal 0

#### Scenario: Jump MP

- **GIVEN** a Jump platoon
- **WHEN** MP is computed
- **THEN** ground MP SHALL equal 3 and jump MP SHALL equal 3

#### Scenario: Mechanized Hover MP

- **GIVEN** a Mechanized-Hover platoon
- **WHEN** MP is computed
- **THEN** ground MP SHALL equal 5

#### Scenario: VTOL troop cap

- **GIVEN** a Mechanized-VTOL platoon
- **WHEN** troopers exceed 10
- **THEN** `VAL-INF-MOTIVE` SHALL emit "VTOL motive supports up to 10 troopers"

### Requirement: Armor Kits

Infantry units SHALL support armor kit selection affecting damage divisor. The system SHALL support armor kits that modify survival and combat without adding mech-scale armor points.

#### Scenario: Available armor kits

- **WHEN** selecting an armor kit
- **THEN** the system SHALL support the `InfantryArmorKit` enum values:
  - `NONE`, `STANDARD`, `FLAK`, `ABLATIVE`, `SNEAK_CAMO`, `SNEAK_IR`, `SNEAK_ECM`, `SNEAK_CAMO_IR`, `SNEAK_IR_ECM`, `SNEAK_COMPLETE`, `CLAN`, `ENVIRONMENTAL`

#### Scenario: Default armor kit

- **WHEN** creating a new Infantry platoon
- **THEN** `armorKit` SHALL default to `InfantryArmorKit.NONE`
- **AND** `damageDivisor` SHALL default to `1`

#### Scenario: Armor kit damage divisor mapping

- **WHEN** setting an armor kit
- **THEN** `damageDivisor` SHALL be automatically computed by `getArmorKitDivisor()`:
  - `NONE`, `STANDARD`, `FLAK` => `1`
  - `ABLATIVE` => `1.5`
  - `SNEAK_CAMO`, `SNEAK_IR`, `SNEAK_ECM`, `SNEAK_CAMO_IR`, `SNEAK_IR_ECM`, `SNEAK_COMPLETE` => `1`
  - `CLAN` => `2`
  - `ENVIRONMENTAL` => `1`

#### Scenario: Damage divisor floor

- **WHEN** setting `damageDivisor` directly
- **THEN** the value MUST be `>= 1`

#### Scenario: Flak kit modifier

- **GIVEN** an infantry platoon wearing Flak armor
- **WHEN** incoming damage is computed
- **THEN** damage divisor SHALL be applied per TW flak rules (ballistic resistance)

#### Scenario: Sneak suit motive restriction

- **GIVEN** a Motorized platoon
- **WHEN** armor kit is set to Sneak Camo
- **THEN** `VAL-INF-ARMOR-KIT` SHALL emit "Sneak suits require Foot motive"

#### Scenario: Environmental Sealing enables vacuum

- **GIVEN** a platoon with Environmental Sealing kit
- **WHEN** a vacuum / underwater scenario is started
- **THEN** the platoon SHALL be allowed to deploy

### Requirement: Primary Weapon Types

Every Infantry platoon SHALL have a primary weapon type. The platoon SHALL select one primary weapon carried by every trooper.

#### Scenario: Available primary weapon types

- **WHEN** configuring Infantry primary weapon
- **THEN** the system SHALL support the `InfantryPrimaryWeaponType` enum values:
  - `RIFLE`, `LASER`, `SRM`, `FLAMER`, `MACHINE_GUN`, `AUTO_RIFLE`, `NEEDLER`, `GYROJET`, `SUPPORT`, `ARCHAIC`

#### Scenario: Default primary weapon

- **WHEN** creating a new Infantry platoon with no primary weapon specified
- **THEN** `primaryWeapon` SHALL default to `'Rifle'`

#### Scenario: Primary weapon validation

- **WHEN** validating an Infantry unit with no primary weapon defined
- **THEN** a WARNING (not error) SHALL be generated: "Infantry unit has no primary weapon defined"
- **AND** rule `VAL-PERS-003` SHALL produce this warning

#### Scenario: Primary weapon with equipment ID

- **WHEN** setting a primary weapon
- **THEN** `primaryWeapon` SHALL store the weapon display name (string)
- **AND** `primaryWeaponId` MAY store the equipment database ID (optional string)

#### Scenario: Primary weapon applied uniformly

- **GIVEN** a 28-trooper Foot platoon with primary weapon Laser Rifle
- **WHEN** squad fire is computed
- **THEN** all 28 troopers SHALL contribute Laser Rifle damage

#### Scenario: Heavy primary weapon on Foot

- **GIVEN** a Foot platoon
- **WHEN** primary weapon is set to Support Heavy MG (heavy weapon)
- **THEN** `VAL-INF-WEAPON` SHALL emit an error — heavy primary requires Mechanized / Motorized motive

### Requirement: Secondary Weapons

Infantry platoons SHALL support optional secondary weapons in addition to the primary. A secondary weapon SHALL be carried by 1 per N troopers.

#### Scenario: Secondary weapon configuration

- **WHEN** configuring a secondary weapon
- **THEN** `secondaryWeapon` SHALL store the weapon name (string or undefined)
- **AND** `secondaryWeaponId` MAY store the equipment database ID
- **AND** `secondaryWeaponCount` SHALL specify the number of secondary weapons per squad

#### Scenario: Default secondary weapon state

- **WHEN** creating a new Infantry platoon
- **THEN** `secondaryWeapon` SHALL be `undefined`
- **AND** `secondaryWeaponCount` SHALL default to `0`

#### Scenario: Secondary weapon count constraint

- **WHEN** setting secondary weapon count
- **THEN** the value MUST be `>= 0`

#### Scenario: Secondary weapon ratio

- **GIVEN** a 28-trooper platoon with secondary SRM Launcher at ratio 1-per-4
- **WHEN** secondary count is computed
- **THEN** 7 troopers SHALL carry the secondary (28 / 4)
