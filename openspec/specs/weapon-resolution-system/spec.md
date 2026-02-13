# weapon-resolution-system Specification

## Purpose

The weapon-resolution-system defines how cluster weapons and special weapon types resolve their attacks in BattleTech combat. This system implements the cluster hit table for missile weapons, special firing modes for advanced autocannons (Ultra AC, Rotary AC, LB-X), Anti-Missile System (AMS) interception, and cluster roll modifiers from Artemis IV/V, Narc beacons, TAG designation, and MRM column shifts.

This specification covers the resolution mechanics that occur after a successful to-hit roll, determining how many projectiles/pellets hit and where they strike. It bridges the gap between to-hit-resolution (which determines if an attack succeeds) and damage-system (which applies damage to locations).

## Requirements

### Requirement: Cluster Hit Table

The system SHALL use the canonical BattleTech cluster hit table to determine the number of hits for cluster weapons.

#### Scenario: Cluster table structure

- **WHEN** resolving a cluster weapon attack
- **THEN** the cluster hit table SHALL have rows for 2d6 rolls (2-12)
- **AND** the cluster hit table SHALL have columns for cluster sizes: 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20
- **AND** the table SHALL be immutable (Readonly<Record<number, Readonly<Record<number, number>>>>)

#### Scenario: Cluster table lookup with roll 7, size 10

- **WHEN** rolling 7 on 2d6 for a 10-missile cluster weapon
- **THEN** the cluster hit table SHALL return 6 hits
- **AND** each hit SHALL be rolled for hit location independently

#### Scenario: Cluster table lookup with roll 2, size 5

- **WHEN** rolling 2 on 2d6 for a 5-missile cluster weapon
- **THEN** the cluster hit table SHALL return 1 hit
- **AND** the low roll SHALL result in minimal hits

#### Scenario: Cluster table lookup with roll 12, size 20

- **WHEN** rolling 12 on 2d6 for a 20-missile cluster weapon
- **THEN** the cluster hit table SHALL return 20 hits
- **AND** all missiles SHALL hit (maximum result)

#### Scenario: Cluster size rounding

- **WHEN** a weapon has a cluster size not in the table (e.g., 11)
- **THEN** the system SHALL round down to the nearest supported size (10)
- **AND** the lookup SHALL use the rounded size

#### Scenario: Out-of-range roll clamping

- **WHEN** a cluster roll is less than 2 or greater than 12
- **THEN** the roll SHALL be clamped to the valid range [2, 12]
- **AND** the clamped roll SHALL be used for table lookup

### Requirement: Cluster Weapon Resolution

The system SHALL resolve cluster weapon attacks by rolling on the cluster table and determining hit locations.

#### Scenario: LRM-10 cluster resolution

- **WHEN** resolving an LRM-10 attack (cluster size 10, damage 1 per missile)
- **THEN** a 2d6 cluster roll SHALL be made
- **AND** the number of hits SHALL be determined from the cluster table
- **AND** each hit SHALL roll for hit location independently
- **AND** each hit SHALL deal 1 point of damage

#### Scenario: SRM-6 cluster resolution

- **WHEN** resolving an SRM-6 attack (cluster size 6, damage 2 per missile)
- **THEN** a 2d6 cluster roll SHALL be made
- **AND** the number of hits SHALL be determined from the cluster table
- **AND** each hit SHALL roll for hit location independently
- **AND** each hit SHALL deal 2 points of damage

#### Scenario: Cluster hit location distribution

- **WHEN** a cluster weapon scores 5 hits
- **THEN** 5 independent hit location rolls SHALL be made
- **AND** each hit location SHALL be determined by the firing arc
- **AND** hits MAY strike different locations

#### Scenario: Cluster result structure

- **WHEN** resolving a cluster attack
- **THEN** the result SHALL include the cluster roll (IDiceRoll)
- **AND** the result SHALL include the number of hits scored
- **AND** the result SHALL include damage per hit
- **AND** the result SHALL include total damage
- **AND** the result SHALL include hit distribution (array of IClusterHitLocation)

### Requirement: Streak Missile All-or-Nothing

Streak missile weapons SHALL use all-or-nothing behavior: all missiles hit if the to-hit roll succeeds, no missiles fire if it fails.

#### Scenario: Streak SRM-2 all hit

- **WHEN** a Streak SRM-2 attack succeeds
- **THEN** all 2 missiles SHALL hit
- **AND** no cluster roll SHALL be made
- **AND** each missile SHALL roll for hit location independently
- **AND** each missile SHALL deal 2 points of damage

#### Scenario: Streak SRM-6 all hit

- **WHEN** a Streak SRM-6 attack succeeds
- **THEN** all 6 missiles SHALL hit
- **AND** the cluster roll SHALL be simulated as 12 (boxcars) for display purposes
- **AND** each missile SHALL roll for hit location independently

#### Scenario: Streak weapon detection

- **WHEN** checking if a weapon is a Streak weapon
- **THEN** the weapon ID SHALL be checked for "streak" substring (case-insensitive)
- **AND** Streak weapons SHALL use resolveStreakAttack() instead of resolveClusterAttack()

### Requirement: Ultra AC Independent Shots

Ultra Autocannons SHALL fire 2 independent shots, each with its own to-hit roll and hit location, with a jam risk on natural 2.

#### Scenario: Ultra AC/5 fires 2 shots

- **WHEN** an Ultra AC/5 fires in ultra mode
- **THEN** 2 independent to-hit rolls SHALL be made
- **AND** each shot SHALL deal 5 points of damage independently
- **AND** each hit SHALL roll for hit location independently
- **AND** the weapon SHALL generate base heat + 1 (ultra mode penalty)

#### Scenario: Ultra AC jam on natural 2

- **WHEN** either Ultra AC to-hit roll is a natural 2 (snake eyes)
- **THEN** the weapon SHALL jam
- **AND** the jammed flag SHALL be set to true
- **AND** the shot that rolled 2 SHALL NOT hit (even if to-hit number was 2)

#### Scenario: Ultra AC both shots hit

- **WHEN** an Ultra AC/10 fires and both shots hit
- **THEN** the first shot SHALL deal 10 damage to its hit location
- **AND** the second shot SHALL deal 10 damage to its hit location
- **AND** the two hit locations MAY be different
- **AND** total damage SHALL be 20

#### Scenario: Ultra AC one shot hits

- **WHEN** an Ultra AC fires and only one shot hits
- **THEN** the hit shot SHALL deal full damage
- **AND** the miss shot SHALL deal 0 damage
- **AND** total damage SHALL equal the weapon's base damage

#### Scenario: Ultra AC result structure

- **WHEN** resolving an Ultra AC attack
- **THEN** the result SHALL include fire mode 'ultra'
- **AND** the result SHALL include an array of 2 IShotResult objects
- **AND** each shot result SHALL include shotNumber, roll, hit, hitLocation, damage, causedJam
- **AND** the result SHALL include totalHits, totalDamage, jammed, heatGenerated

### Requirement: Rotary AC Variable Rate of Fire

Rotary Autocannons SHALL fire 1-6 shots (pilot-selected), each with its own to-hit roll and hit location, with a jam risk on natural 2.

#### Scenario: Rotary AC/2 fires 4 shots

- **WHEN** a Rotary AC/2 fires at rate of fire 4
- **THEN** 4 independent to-hit rolls SHALL be made
- **AND** each shot SHALL deal 2 points of damage independently
- **AND** each hit SHALL roll for hit location independently
- **AND** the weapon SHALL generate base heat × 4 (rate of fire multiplier)

#### Scenario: Rotary AC jam on natural 2

- **WHEN** any Rotary AC to-hit roll is a natural 2 (snake eyes)
- **THEN** the weapon SHALL jam
- **AND** the jammed flag SHALL be set to true
- **AND** the shot that rolled 2 SHALL NOT hit

#### Scenario: Rotary AC/5 fires 6 shots, 3 hit

- **WHEN** a Rotary AC/5 fires at rate of fire 6 and 3 shots hit
- **THEN** the 3 hit shots SHALL each deal 5 damage
- **AND** total damage SHALL be 15
- **AND** the 3 miss shots SHALL deal 0 damage

#### Scenario: Rotary AC rate of fire selection

- **WHEN** a pilot selects rate of fire for a Rotary AC
- **THEN** the rate of fire SHALL be an integer from 1 to 6
- **AND** higher rates of fire SHALL generate more heat
- **AND** higher rates of fire SHALL increase jam risk (more rolls = more chances for natural 2)

#### Scenario: Rotary AC result structure

- **WHEN** resolving a Rotary AC attack
- **THEN** the result SHALL include fire mode 'rotary'
- **AND** the result SHALL include an array of IShotResult objects (length = rate of fire)
- **AND** each shot result SHALL include shotNumber, roll, hit, hitLocation, damage, causedJam
- **AND** the result SHALL include totalHits, totalDamage, jammed, heatGenerated

### Requirement: LB-X Slug and Cluster Modes

LB-X Autocannons SHALL support two fire modes: slug (standard AC behavior) and cluster (shotgun spread with -1 to-hit).

#### Scenario: LB-10-X in slug mode

- **WHEN** an LB-10-X fires in slug mode
- **THEN** it SHALL behave as a standard autocannon
- **AND** a single to-hit roll SHALL be made
- **AND** if hit, a single hit location SHALL be determined
- **AND** the hit SHALL deal 10 points of damage
- **AND** no to-hit modifier SHALL be applied

#### Scenario: LB-10-X in cluster mode

- **WHEN** an LB-10-X fires in cluster mode
- **THEN** it SHALL use the cluster hit table with cluster size 10
- **AND** each cluster hit SHALL deal 1 point of damage
- **AND** a -1 to-hit modifier SHALL be applied (easier to hit with spread)
- **AND** each hit SHALL roll for hit location independently

#### Scenario: LB-20-X cluster mode with roll 9

- **WHEN** an LB-20-X fires in cluster mode and rolls 9 on the cluster table
- **THEN** the cluster table SHALL return 16 hits (roll 9, size 20)
- **AND** 16 hit locations SHALL be determined
- **AND** total damage SHALL be 16 (16 hits × 1 damage each)

#### Scenario: LB-X cluster mode to-hit modifier

- **WHEN** calculating to-hit for an LB-X in cluster mode
- **THEN** the to-hit number SHALL receive a -1 modifier
- **AND** this modifier SHALL be applied before the to-hit roll

#### Scenario: LB-X fire mode selection

- **WHEN** a pilot selects fire mode for an LB-X
- **THEN** the fire mode SHALL be either 'lbx-slug' or 'lbx-cluster'
- **AND** the mode SHALL determine resolution method (standard vs cluster)

### Requirement: AMS Missile Interception

Anti-Missile System (AMS) SHALL reduce incoming missile cluster hits by rolling 1d6.

#### Scenario: AMS reduces LRM-15 hits

- **WHEN** an LRM-15 attack scores 9 hits and the target has active AMS
- **THEN** AMS SHALL roll 1d6 (using first die of 2d6 roll)
- **AND** the number of hits SHALL be reduced by the d6 result
- **AND** the reduced hits SHALL be applied to hit locations
- **AND** AMS SHALL consume 1 ammo

#### Scenario: AMS rolls 4, reduces 9 hits to 5

- **WHEN** AMS rolls 4 on 1d6 against 9 incoming missile hits
- **THEN** the hits SHALL be reduced by 4
- **AND** 5 hits SHALL remain
- **AND** 5 hit locations SHALL be determined

#### Scenario: AMS cannot reduce below 0

- **WHEN** AMS rolls 6 on 1d6 against 3 incoming missile hits
- **THEN** the hits SHALL be reduced by 3 (not 6)
- **AND** 0 hits SHALL remain
- **AND** no damage SHALL be applied

#### Scenario: AMS ammo consumption

- **WHEN** AMS activates to intercept missiles
- **THEN** 1 ton of AMS ammo SHALL be consumed
- **AND** ammo consumption SHALL occur regardless of reduction amount

#### Scenario: AMS result structure

- **WHEN** resolving AMS interception
- **THEN** the result SHALL include hitsReduced (number of hits stopped)
- **AND** the result SHALL include ammoConsumed (always 1)
- **AND** the result SHALL include roll (IDiceRoll with 2d6, first die used as d6)

### Requirement: Artemis IV/V Cluster Bonus

Artemis IV and Artemis V fire control systems SHALL add +2 to cluster hit table rolls, nullified by enemy ECM.

#### Scenario: Artemis IV adds +2 to cluster roll

- **WHEN** a weapon with Artemis IV fires at a target without ECM protection
- **THEN** the cluster roll SHALL receive a +2 modifier
- **AND** the modified roll SHALL be used for cluster table lookup
- **AND** the modified roll SHALL be clamped to [2, 12]

#### Scenario: Artemis IV with roll 5 becomes 7

- **WHEN** an LRM-10 with Artemis IV rolls 5 on the cluster table
- **THEN** the modified roll SHALL be 7 (5 + 2)
- **AND** the cluster table lookup SHALL use roll 7, size 10
- **AND** the result SHALL be 6 hits (instead of 3 hits without Artemis)

#### Scenario: Artemis V adds +2 to cluster roll

- **WHEN** a weapon with Artemis V fires at a target without ECM protection
- **THEN** the cluster roll SHALL receive a +2 modifier
- **AND** the bonus SHALL be identical to Artemis IV (+2)

#### Scenario: Artemis nullified by ECM

- **WHEN** a weapon with Artemis IV/V fires at a target with ECM protection
- **THEN** the +2 cluster roll bonus SHALL NOT apply
- **AND** the cluster roll SHALL be unmodified

#### Scenario: Artemis equipment flag

- **WHEN** checking for Artemis bonus
- **THEN** the weapon equipment flags SHALL include hasArtemisIV or hasArtemisV
- **AND** the target status flags SHALL include ecmProtected
- **AND** the bonus SHALL be 0 if ecmProtected is true

### Requirement: Narc Beacon Cluster Bonus

Narc and iNarc beacons SHALL add +2 to cluster hit table rolls for missile attacks against marked targets, nullified by enemy ECM.

#### Scenario: Narc beacon adds +2 to cluster roll

- **WHEN** a missile weapon fires at a target with a Narc beacon and no ECM protection
- **THEN** the cluster roll SHALL receive a +2 modifier
- **AND** the modified roll SHALL be used for cluster table lookup

#### Scenario: Narc with roll 6 becomes 8

- **WHEN** an SRM-6 fires at a narced target and rolls 6 on the cluster table
- **THEN** the modified roll SHALL be 8 (6 + 2)
- **AND** the cluster table lookup SHALL use roll 8, size 6
- **AND** the result SHALL be 4 hits (instead of 3 hits without Narc)

#### Scenario: Narc nullified by ECM

- **WHEN** a missile weapon fires at a narced target with ECM protection
- **THEN** the +2 cluster roll bonus SHALL NOT apply
- **AND** the cluster roll SHALL be unmodified

#### Scenario: Narc only affects missile weapons

- **WHEN** a non-missile weapon (ballistic, energy) fires at a narced target
- **THEN** the Narc bonus SHALL NOT apply
- **AND** the cluster roll SHALL be unmodified

#### Scenario: Narc target status flag

- **WHEN** checking for Narc bonus
- **THEN** the target status flags SHALL include narcedTarget
- **AND** the target status flags SHALL include ecmProtected
- **AND** the bonus SHALL be 0 if ecmProtected is true or narcedTarget is false

### Requirement: TAG Designation for Semi-Guided LRM

TAG designation SHALL enable semi-guided LRM bonuses, including +2 to cluster roll, nullified by enemy ECM.

#### Scenario: Semi-guided LRM with TAG adds +2

- **WHEN** a semi-guided LRM fires at a TAG-designated target without ECM protection
- **THEN** the cluster roll SHALL receive a +2 modifier
- **AND** the modified roll SHALL be used for cluster table lookup

#### Scenario: Semi-guided LRM without TAG

- **WHEN** a semi-guided LRM fires at a non-TAG-designated target
- **THEN** the +2 cluster roll bonus SHALL NOT apply
- **AND** the cluster roll SHALL be unmodified

#### Scenario: TAG nullified by ECM

- **WHEN** a semi-guided LRM fires at a TAG-designated target with ECM protection
- **THEN** the +2 cluster roll bonus SHALL NOT apply
- **AND** the cluster roll SHALL be unmodified

#### Scenario: TAG designation flag

- **WHEN** checking for TAG designation
- **THEN** the target status flags SHALL include tagDesignated
- **AND** the target status flags SHALL include ecmProtected
- **AND** the bonus SHALL be 0 if ecmProtected is true or tagDesignated is false

#### Scenario: Semi-guided equipment flag

- **WHEN** checking for semi-guided LRM bonus
- **THEN** the weapon equipment flags SHALL include isSemiGuided
- **AND** the bonus SHALL be 0 if isSemiGuided is false

### Requirement: MRM Cluster Column Modifier

Medium Range Missiles (MRM) SHALL use a -1 cluster column modifier, resulting in fewer hits than standard missiles.

#### Scenario: MRM-10 with -1 column modifier

- **WHEN** an MRM-10 fires and rolls 7 on the cluster table
- **THEN** the cluster column SHALL be shifted by -1
- **AND** the effective cluster size SHALL be 9 (10 - 1)
- **AND** the cluster table lookup SHALL use roll 7, size 9
- **AND** the result SHALL be 5 hits (instead of 6 hits for standard size 10)

#### Scenario: MRM-20 with -1 column modifier

- **WHEN** an MRM-20 fires and rolls 9 on the cluster table
- **THEN** the cluster column SHALL be shifted by -1
- **AND** the effective cluster size SHALL be 15 (20 - 1 column)
- **AND** the cluster table lookup SHALL use roll 9, size 15
- **AND** the result SHALL be 12 hits (instead of 16 hits for standard size 20)

#### Scenario: MRM weapon detection

- **WHEN** checking if a weapon is an MRM
- **THEN** the weapon ID SHALL be checked for "mrm" substring (case-insensitive)
- **AND** MRM weapons SHALL receive the -1 column modifier

#### Scenario: MRM modifier is negative

- **WHEN** calculating cluster modifiers for an MRM
- **THEN** the MRM penalty SHALL be -1
- **AND** this penalty SHALL be applied to the cluster roll (not the column)

### Requirement: Combined Cluster Modifiers

The system SHALL combine all applicable cluster modifiers (Artemis, Narc, semi-guided, MRM, Cluster Hitter SPA) into a single total modifier.

#### Scenario: LRM-15 with Artemis IV and Narc

- **WHEN** an LRM-15 with Artemis IV fires at a narced target without ECM
- **THEN** the Artemis bonus SHALL be +2
- **AND** the Narc bonus SHALL be +2
- **AND** the total modifier SHALL be +4
- **AND** a cluster roll of 5 SHALL become 9 (5 + 4)

#### Scenario: MRM-20 with Artemis IV

- **WHEN** an MRM-20 with Artemis IV fires at a target without ECM
- **THEN** the Artemis bonus SHALL be +2
- **AND** the MRM penalty SHALL be -1
- **AND** the total modifier SHALL be +1
- **AND** a cluster roll of 7 SHALL become 8 (7 + 1)

#### Scenario: Semi-guided LRM with TAG and Artemis IV

- **WHEN** a semi-guided LRM with Artemis IV fires at a TAG-designated target without ECM
- **THEN** the Artemis bonus SHALL be +2
- **AND** the semi-guided bonus SHALL be +2
- **AND** the total modifier SHALL be +4

#### Scenario: Cluster Hitter SPA adds +1

- **WHEN** a pilot with Cluster Hitter SPA fires a cluster weapon
- **THEN** the Cluster Hitter bonus SHALL be +1
- **AND** this bonus SHALL stack with Artemis, Narc, and semi-guided bonuses

#### Scenario: Cluster modifier structure

- **WHEN** calculating cluster modifiers
- **THEN** the result SHALL include artemisBonus (0 or +2)
- **AND** the result SHALL include narcBonus (0 or +2)
- **AND** the result SHALL include clusterHitterBonus (0 or +1)
- **AND** the result SHALL include mrmPenalty (0 or -1)
- **AND** the result SHALL include total (sum of all modifiers)

#### Scenario: Modified roll clamped to [2, 12]

- **WHEN** a cluster roll of 11 receives a +4 modifier
- **THEN** the modified roll SHALL be 15 (11 + 4)
- **AND** the clamped roll SHALL be 12 (maximum)
- **AND** the cluster table lookup SHALL use roll 12

### Requirement: Cluster Weapon Type Detection

The system SHALL detect cluster weapon types by weapon ID to apply correct resolution logic.

#### Scenario: LRM weapon detection

- **WHEN** checking if a weapon is an LRM
- **THEN** the weapon ID SHALL be checked for "lrm" substring (case-insensitive)
- **AND** LRM weapons SHALL use cluster resolution

#### Scenario: SRM weapon detection

- **WHEN** checking if a weapon is an SRM
- **THEN** the weapon ID SHALL be checked for "srm" substring (case-insensitive)
- **AND** SRM weapons SHALL use cluster resolution

#### Scenario: Ultra AC weapon detection

- **WHEN** checking if a weapon is an Ultra AC
- **THEN** the weapon ID SHALL be checked for "uac" or "ultra" substring (case-insensitive)
- **AND** Ultra AC weapons SHALL use resolveUltraAC()

#### Scenario: Rotary AC weapon detection

- **WHEN** checking if a weapon is a Rotary AC
- **THEN** the weapon ID SHALL be checked for "rac" or "rotary" substring (case-insensitive)
- **AND** Rotary AC weapons SHALL use resolveRotaryAC()

#### Scenario: LB-X weapon detection

- **WHEN** checking if a weapon is an LB-X
- **THEN** the weapon ID SHALL be checked for "lb-" or "lbx" substring (case-insensitive)
- **AND** LB-X weapons SHALL support slug and cluster modes

#### Scenario: AMS weapon detection

- **WHEN** checking if a weapon is an AMS
- **THEN** the weapon ID SHALL be checked for "ams" or "anti-missile" substring (case-insensitive)
- **AND** AMS weapons SHALL use resolveAMS()

## Cross-References

### Dependencies

- **dice-system**: IDiceRoll, DiceRoller, roll2d6 for cluster rolls and to-hit rolls
- **weapon-system**: IWeaponAttack, weapon properties (damage, clusterSize, isCluster)
- **to-hit-resolution**: To-hit number calculation (used by Ultra AC, Rotary AC, LB-X)
- **damage-system**: Hit location determination (determineHitLocation, determineHitLocationFromRoll)
- **ecm-electronic-warfare**: ECM protection status (nullifies Artemis, Narc, TAG)

### Used By

- **combat-resolution**: Weapon attack resolution pipeline
- **damage-system**: Cluster hit distribution for damage application
- **game-event-system**: WeaponFired events with cluster results
- **battle-replay**: Cluster roll and hit distribution display
- **tactical-ui**: Weapon resolution visualization
