## ADDED Requirements

### Requirement: Weapon Range from IWeaponData

Combat resolution SHALL use actual per-weapon range brackets from `IWeaponData` instead of hardcoded values.

#### Scenario: Weapon-specific range brackets

- **WHEN** determining range modifiers for a weapon attack
- **THEN** the weapon's `IWeaponData.shortRange`, `IWeaponData.mediumRange`, and `IWeaponData.longRange` SHALL be used
- **AND** the hardcoded range brackets `(3, 6, 9)` SHALL NOT be used

#### Scenario: Minimum range penalty

- **WHEN** a weapon has a minimum range defined in IWeaponData
- **THEN** attacks at or below minimum range SHALL receive the minimum range penalty (+1 per hex below minimum)

### Requirement: Cluster Table Corrections

The cluster hit table SHALL be corrected to match MegaMek canonical values and include all missing columns.

#### Scenario: Corrected cluster table values

- **WHEN** resolving cluster weapon hits
- **THEN** the cluster table SHALL have a single authoritative copy (no duplicates)
- **AND** values SHALL match MegaMek's `Compute.java` cluster table

#### Scenario: Missing cluster columns added

- **WHEN** resolving cluster weapons with sizes 3, 7, 8, 9, or 12
- **THEN** the cluster table SHALL include columns for these sizes
- **AND** the values SHALL match MegaMek canonical values

### Requirement: Ultra AC Independent Shots with Jam

Ultra Autocannons SHALL be modeled as 2 independent shots (not cluster), with a jam risk on a to-hit roll of 2.

#### Scenario: Ultra AC fires two independent shots

- **WHEN** an Ultra AC fires in ultra mode
- **THEN** two independent to-hit rolls SHALL be made
- **AND** each shot SHALL deal standard damage independently
- **AND** each hit SHALL be resolved separately for hit location

#### Scenario: Ultra AC jam on roll of 2

- **WHEN** either Ultra AC to-hit roll results in a natural 2
- **THEN** the weapon SHALL jam
- **AND** the jammed weapon SHALL NOT fire for the rest of the game (or until unjammed)

### Requirement: Rotary AC Independent Shots with Jam

Rotary Autocannons SHALL fire 1-6 independent shots per turn, with a jam risk.

#### Scenario: Rotary AC fires variable shots

- **WHEN** a Rotary AC fires, the pilot selects 1-6 shots
- **THEN** each shot SHALL be resolved as an independent to-hit roll
- **AND** each hit SHALL deal standard damage independently

#### Scenario: Rotary AC jam

- **WHEN** any Rotary AC to-hit roll results in a natural 2
- **THEN** the weapon SHALL jam
- **AND** the weapon SHALL NOT fire until unjammed

### Requirement: LB-X Slug/Cluster Mode Toggle

LB-X Autocannons SHALL support toggling between slug (standard) and cluster (shotgun) modes.

#### Scenario: LB-X in slug mode

- **WHEN** an LB-X fires in slug mode
- **THEN** it SHALL function as a standard autocannon (single hit, standard damage)

#### Scenario: LB-X in cluster mode

- **WHEN** an LB-X fires in cluster mode
- **THEN** it SHALL resolve as a cluster weapon using the cluster hit table
- **AND** each cluster hit SHALL deal 1 point of damage
- **AND** cluster mode SHALL receive a -1 to-hit modifier

### Requirement: AMS Missile Reduction

Anti-Missile System (AMS) SHALL reduce incoming missile hits.

#### Scenario: AMS reduces incoming LRM hits

- **WHEN** a unit with active AMS is targeted by a missile attack
- **THEN** AMS SHALL reduce the number of missile hits by a random amount (typically 1d6)
- **AND** the reduced hits SHALL be subtracted before applying damage

#### Scenario: AMS uses ammo

- **WHEN** AMS activates to defend against missiles
- **THEN** AMS ammo SHALL be consumed

### Requirement: Artemis IV/V Cluster Bonus

Artemis IV SHALL add +2 to the cluster hit table roll, and Artemis V SHALL add +2 to the cluster hit table roll.

#### Scenario: Artemis IV bonus

- **WHEN** a weapon equipped with Artemis IV fires cluster weapons
- **THEN** the cluster hit table roll SHALL receive a +2 bonus
- **AND** this bonus SHALL be nullified by enemy ECM

#### Scenario: Artemis V bonus

- **WHEN** a weapon equipped with Artemis V fires cluster weapons
- **THEN** the cluster hit table roll SHALL receive a +2 bonus
- **AND** Artemis V SHALL be slightly harder to jam via ECM than Artemis IV

### Requirement: Narc/iNarc Target Marking

A unit hit by a Narc or iNarc beacon SHALL receive a +2 bonus for all subsequent missile attacks against it.

#### Scenario: Narc beacon on target

- **WHEN** a target has been hit by a Narc beacon
- **THEN** all missile attacks against that target SHALL receive a +2 to the cluster hit table roll
- **AND** this bonus SHALL be nullified by enemy ECM

#### Scenario: iNarc beacon effects

- **WHEN** a target has been hit by an iNarc beacon
- **THEN** effects SHALL depend on the iNarc pod type (homing, ECM, haywire, etc.)
- **AND** homing pods SHALL provide the standard +2 missile bonus

### Requirement: TAG Designation

TAG SHALL designate targets for semi-guided LRM and artillery attacks.

#### Scenario: TAG designates target

- **WHEN** a unit with TAG successfully targets an enemy
- **THEN** the target SHALL be marked as TAG-designated for the turn
- **AND** semi-guided LRMs and Arrow IV SHALL receive targeting bonuses

### Requirement: MRM Cluster Column Modifier

MRM (Medium Range Missile) weapons SHALL use a -1 cluster column modifier.

#### Scenario: MRM cluster column shift

- **WHEN** resolving an MRM attack on the cluster hit table
- **THEN** the cluster roll SHALL receive a -1 column modifier (fewer hits than standard)

## MODIFIED Requirements

### Requirement: Weapon Stats

All weapons SHALL provide complete combat statistics.

#### Scenario: Weapon properties with full combat data

- **WHEN** creating weapon definition
- **THEN** damage MUST be specified from `IWeaponData`
- **AND** heat generation MUST be specified from `IWeaponData`
- **AND** weight and critical slots MUST be specified
- **AND** short, medium, and long range MUST be specified from `IWeaponData`
- **AND** minimum range MUST be specified (0 if none)
- **AND** weapon mode (standard, ultra, rotary, cluster, LB-X) MUST be specified
- **AND** ammo type and rounds per ton MUST be specified for ammo-using weapons

### Requirement: Range Brackets

Weapons SHALL define range brackets for to-hit modifiers.

#### Scenario: Per-weapon range definition

- **WHEN** weapon has ranged attack
- **THEN** weapon SHALL define minimum range from `IWeaponData` (optional, 0 if absent)
- **AND** weapon SHALL define short, medium, long ranges from `IWeaponData`
- **AND** range modifiers SHALL be: short +0, medium +2, long +4, minimum range +1 per hex inside minimum
