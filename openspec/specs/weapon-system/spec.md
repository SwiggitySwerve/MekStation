# weapon-system Specification

## Purpose

TBD - created by archiving change implement-phase3-equipment. Update Purpose after archive.
## Requirements
### Requirement: Weapon Classification

The system SHALL classify weapons by type and category.

#### Scenario: Weapon types

- **WHEN** defining a weapon
- **THEN** weapon MUST be classified as ENERGY, BALLISTIC, MISSILE, or PHYSICAL
- **AND** weapon SHALL have damage, heat, and range properties

### Requirement: Range Brackets

Weapons SHALL define range brackets for to-hit modifiers.

#### Scenario: Per-weapon range definition

- **WHEN** weapon has ranged attack
- **THEN** weapon SHALL define minimum range from `IWeaponData` (optional, 0 if absent)
- **AND** weapon SHALL define short, medium, long ranges from `IWeaponData`
- **AND** range modifiers SHALL be: short +0, medium +2, long +4, minimum range +1 per hex inside minimum

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
NARC pods and Thunderbolt-style single missiles SHALL use the single-missile AMS check instead of the cluster table.

#### Scenario: AMS reduces incoming LRM hits

- **WHEN** a unit with active AMS is targeted by a missile attack
- **THEN** AMS SHALL apply a -4 modifier to the missile cluster table roll
- **AND** the modified cluster result SHALL determine remaining missile hits before applying damage

#### Scenario: AMS uses ammo

- **WHEN** AMS activates to defend against missiles
- **THEN** ammo-fed AMS SHALL consume 1 AMS ammo round
- **AND** ammo-fed AMS SHALL NOT activate without an available ammo bin

#### Scenario: AMS single-missile interception

- **WHEN** active AMS engages a NARC pod or Thunderbolt-style single missile
- **THEN** AMS SHALL roll 1d6
- **AND** the pod or missile SHALL be destroyed on a result of 1-3
- **AND** the pod or missile SHALL continue on a result of 4-6

### Requirement: Artemis IV/V Cluster Bonus

Artemis IV SHALL add +2 to the cluster hit table roll, and Artemis V SHALL add +3 to the cluster hit table roll.

#### Scenario: Artemis IV bonus

- **WHEN** a weapon equipped with Artemis IV fires cluster weapons
- **THEN** the cluster hit table roll SHALL receive a +2 bonus
- **AND** this bonus SHALL be nullified by enemy ECM

#### Scenario: Artemis V bonus

- **WHEN** a weapon equipped with Artemis V fires cluster weapons
- **THEN** the cluster hit table roll SHALL receive a +3 bonus
- **AND** Artemis V SHALL NOT stack with Artemis IV on the same attack

### Requirement: Narc/iNarc Target Marking

A unit hit by a Narc or iNarc beacon SHALL receive a +2 bonus for all subsequent missile attacks against it.

#### Scenario: Narc beacon on target

- **WHEN** a target has been hit by a Narc beacon
- **THEN** all missile attacks against that target SHALL receive a +2 to the cluster hit table roll
- **AND** this bonus SHALL be nullified by enemy ECM
- **AND** a newly attached standard Narc marker SHALL emit `DesignatorMarkerApplied` with persistent `true`

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
- **AND** a newly set TAG designation SHALL emit `DesignatorMarkerApplied` with persistent `false`

### Requirement: MRM Cluster Column Modifier

MRM (Medium Range Missile) weapons SHALL use a -1 cluster column modifier.

#### Scenario: MRM cluster column shift

- **WHEN** resolving an MRM attack on the cluster hit table
- **THEN** the cluster roll SHALL receive a -1 column modifier (fewer hits than standard)

### Requirement: Weapon Indirect Mode Toggle

Indirect-eligible weapons SHALL expose a runtime combat-state field `mode: 'Direct' | 'Indirect'` that defaults to `'Direct'`. The toggle SHALL be per-weapon-mount and SHALL be reversible turn-to-turn. Toggling to `'Indirect'` on a non-eligible weapon SHALL be rejected at the UI layer with a validation error and SHALL be treated as `'Direct'` if the toggle bypasses the UI and reaches the resolver.

#### Scenario: Default mode on weapon construction

- **GIVEN** an LRM-15 weapon mount on a freshly constructed mech
- **WHEN** the unit enters combat
- **THEN** `weapon.mode` SHALL equal `'Direct'`

#### Scenario: Toggle to indirect on eligible weapon

- **GIVEN** an LRM-15 weapon in `'Direct'` mode
- **WHEN** the player toggles the weapon mode via the UI
- **THEN** `weapon.mode` SHALL become `'Indirect'`
- **AND** subsequent attacks with this weapon SHALL pass through the indirect-fire dispatch

#### Scenario: Toggle reversibility

- **GIVEN** an LRM-15 in `'Indirect'` mode on turn 3
- **WHEN** the player toggles back to `'Direct'` on turn 4
- **THEN** `weapon.mode` SHALL become `'Direct'`
- **AND** subsequent attacks SHALL use the direct-fire pipeline

#### Scenario: Toggle on non-eligible weapon rejected

- **GIVEN** an AC/20 weapon mount
- **WHEN** the player attempts to toggle `mode: 'Indirect'`
- **THEN** the UI SHALL render a validation error `'AC/20 cannot fire indirectly'`
- **AND** `weapon.mode` SHALL remain `'Direct'`

#### Scenario: Resolver ignores bad mode value

- **GIVEN** a manually-constructed combat state where an AC/20's `weapon.mode` has been set to `'Indirect'` (e.g., via a corrupt save)
- **WHEN** the resolver processes the attack
- **THEN** the resolver SHALL treat `weapon.mode` as `'Direct'` (silent fallback)
- **AND** SHALL emit a warning event `'IndirectModeIgnored'` with the weapon family and resolved fallback

### Requirement: Weapon Mode Persistence

The `weapon.mode` field SHALL be part of the per-weapon combat state slice and SHALL round-trip through the JSONL event-log replay path (per the `replay-library` capability). The per-attack event payload SHALL carry the resolved `mode` so replays render the attack's indirect/direct flag without re-deriving it.

#### Scenario: Mode persists across the same turn

- **GIVEN** the player toggles LRM-15 to `'Indirect'` mid-turn
- **WHEN** the player declares two LRM-15 attacks in the same turn
- **THEN** both attack records SHALL carry `weapon.mode === 'Indirect'`

#### Scenario: Mode persists across turn boundaries within a session

- **GIVEN** weapon mode toggled to `'Indirect'` on turn 3
- **WHEN** turn 4 begins
- **THEN** `weapon.mode` SHALL still equal `'Indirect'` (no auto-reset)
- **AND** the player must explicitly toggle back to `'Direct'` to revert

#### Scenario: Event-log replay restores mode

- **GIVEN** a JSONL event log containing attacks with `weapon.mode: 'Indirect'`
- **WHEN** the replay loader replays the log
- **THEN** the reconstructed attack records SHALL carry `weapon.mode === 'Indirect'`
- **AND** the per-attack indirect-fire events SHALL be re-emitted in their original sequence

### Requirement: MML Mode Eligibility by Loaded Ammo

For Multi-Missile Launcher (MML) mounts, indirect-mode eligibility SHALL depend on the currently loaded ammo. MML loaded with LRM ammo IS eligible; MML loaded with SRM ammo IS NOT. Switching the loaded ammo between LRM and SRM SHALL re-evaluate the eligibility and SHALL auto-revert `mode` to `'Direct'` if the new ammo makes the weapon ineligible.

#### Scenario: MML loaded with LRM ammo — eligible

- **GIVEN** an MML-5 with LRM-5 ammo loaded
- **WHEN** the player toggles `mode: 'Indirect'`
- **THEN** the toggle SHALL succeed

#### Scenario: MML loaded with SRM ammo — ineligible

- **GIVEN** an MML-5 with SRM-5 ammo loaded
- **WHEN** the player toggles `mode: 'Indirect'`
- **THEN** the toggle SHALL be rejected

#### Scenario: Switching MML ammo from LRM to SRM auto-reverts mode

- **GIVEN** an MML-5 in `'Indirect'` mode with LRM-5 ammo loaded
- **WHEN** the player switches the loaded ammo to SRM-5
- **THEN** `weapon.mode` SHALL auto-revert to `'Direct'`
- **AND** the UI SHALL render a notice `'Mode reverted to Direct: SRM ammo cannot fire indirectly'`

