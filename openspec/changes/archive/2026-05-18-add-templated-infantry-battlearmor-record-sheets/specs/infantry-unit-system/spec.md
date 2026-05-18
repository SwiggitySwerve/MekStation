# infantry-unit-system Delta — add-templated-infantry-battlearmor-record-sheets

## MODIFIED Requirements

### Requirement: Primary Weapon Types

Every Infantry platoon SHALL have a primary weapon type. The platoon SHALL select one primary weapon carried by every trooper.

Every infantry weapon entry (`IInfantryWeaponEntry`) SHALL carry a
canonical `infantryDamage` value: the weapon's damage per trooper, as
used by MegaMek's `Infantry.getDamagePerTrooper()` formula. This value
SHALL be a non-negative number and SHALL be distinct from the existing
`damageDivisor` field, which governs incoming-damage division rather
than outgoing per-trooper damage.

The infantry-weapon catalog SHALL populate `infantryDamage` for every
weapon it lists. The record-sheet print type `IInfantryWeaponSheet`
SHALL surface this per-trooper damage value threaded from the
construction-domain weapon entry.

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

#### Scenario: Infantry weapon entry carries a per-trooper damage value

- **GIVEN** any infantry weapon listed in the infantry-weapon catalog
- **WHEN** that weapon's `IInfantryWeaponEntry` is read
- **THEN** it SHALL expose a non-negative `infantryDamage` value
  representing damage per trooper, distinct from `damageDivisor`

#### Scenario: Per-trooper damage threaded into the record-sheet type

- **GIVEN** an infantry platoon's primary or secondary weapon
- **WHEN** the infantry record-sheet data (`IInfantryWeaponSheet`) is
  extracted
- **THEN** the weapon's `infantryDamage` value SHALL be present on the
  record-sheet weapon entry, sourced from the construction-domain
  `IInfantryWeaponEntry`
