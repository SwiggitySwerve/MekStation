# combat-resolution Specification

## Purpose

TBD - created by archiving change implement-comprehensive-campaign-system. Update Purpose after archive.

## Requirements

### Requirement: ACAR System

The system SHALL provide Auto-Calculate and Resolve (ACAR) combat resolution for scenarios without tactical gameplay.

#### Scenario: Calculate force BV

- **GIVEN** a force with 4 units having BV values [1897, 1220, 1101, 432]
- **WHEN** calculateForceBV is called
- **THEN** total BV of 4650 is returned

#### Scenario: Calculate victory probability

- **GIVEN** player force BV 5000 and opponent force BV 5000
- **WHEN** calculateVictoryProbability is called
- **THEN** probability is approximately 0.5 (50% chance)

#### Scenario: Higher BV increases win chance

- **GIVEN** player force BV 8000 and opponent force BV 4000 (2:1 ratio)
- **WHEN** calculateVictoryProbability is called
- **THEN** probability is greater than 0.7 (70%+ chance)

### Requirement: Damage Distribution

The system SHALL distribute damage across units based on battle intensity and outcome.

#### Scenario: Victory results in light damage

- **GIVEN** a battle with outcome VICTORY and 4 player units
- **WHEN** distributeDamage is called
- **THEN** units receive 0-30% damage on average

#### Scenario: Defeat results in heavy damage

- **GIVEN** a battle with outcome DEFEAT and 4 player units
- **WHEN** distributeDamage is called
- **THEN** units receive 40-80% damage on average

#### Scenario: Draw results in moderate damage

- **GIVEN** a battle with outcome DRAW and 4 player units
- **WHEN** distributeDamage is called
- **THEN** units receive 20-50% damage on average

#### Scenario: Aerospace fly-off counts as surviving

- **GIVEN** a battle where an aerospace unit exited the map before destruction
- **WHEN** distributeDamage is called
- **THEN** the aerospace unit SHALL be treated as surviving (not wrecked)
- **AND** only actual SI/arc damage SHALL be recorded

#### Scenario: Vehicle damage respects motive penalties

- **GIVEN** a battle that destroys a vehicle by motive immobilization
- **WHEN** damage is distributed
- **THEN** the immobilized-but-intact vehicle SHALL count as combat-eligible salvage, not wreckage

#### Scenario: Partial BA squad survival

- **GIVEN** a battle where a 4-trooper BA squad ends with 2 surviving troopers
- **WHEN** distributeDamage is called
- **THEN** the squad SHALL be counted at 50% strength for post-battle reporting

### Requirement: Casualty Determination

The system SHALL determine personnel casualties based on battle intensity and unit damage.

#### Scenario: Light battle has few casualties

- **GIVEN** a battle with intensity 0.3 and 8 personnel
- **WHEN** determineCasualties is called
- **THEN** 0-2 casualties occur

#### Scenario: Heavy battle has more casualties

- **GIVEN** a battle with intensity 0.8 and 8 personnel
- **WHEN** determineCasualties is called
- **THEN** 2-5 casualties occur

#### Scenario: Casualties have varied statuses

- **GIVEN** a battle with casualties
- **WHEN** determineCasualties is called
- **THEN** casualties are assigned statuses (WOUNDED, KIA, MIA) based on severity

### Requirement: Scenario Resolution

The system SHALL process complete scenario results including damage, casualties, and salvage.

#### Scenario: Process victory result

- **GIVEN** a scenario with outcome VICTORY
- **WHEN** processScenarioResult is called
- **THEN** unit damage is applied, personnel injuries are recorded, salvage is added to finances, and scenario status is updated to VICTORY

#### Scenario: Process defeat result

- **GIVEN** a scenario with outcome DEFEAT
- **WHEN** processScenarioResult is called
- **THEN** heavy unit damage is applied, casualties are processed, no salvage is gained, and scenario status is updated to DEFEAT

#### Scenario: Salvage value is recorded

- **GIVEN** a victory with salvage worth 50000 C-bills
- **WHEN** processScenarioResult is called
- **THEN** a transaction of type SALVAGE with amount 50000 is added to campaign finances

### Requirement: Seeded Random for Testing

The system SHALL support seeded random number generation for deterministic combat resolution in tests.

#### Scenario: Same seed produces same results

- **GIVEN** two ACAR resolutions with identical inputs and seed 42
- **WHEN** both resolutions are executed
- **THEN** both produce identical outcomes (same damage, same casualties)

#### Scenario: Different seeds produce different results

- **GIVEN** two ACAR resolutions with identical inputs but different seeds
- **WHEN** both resolutions are executed
- **THEN** outcomes differ (different damage distribution, different casualties)

#### Scenario: No seed uses true random

- **GIVEN** an ACAR resolution with no seed provided
- **WHEN** the resolution is executed multiple times
- **THEN** outcomes vary randomly

### Requirement: Battle Intensity Calculation

The system SHALL calculate battle intensity based on BV ratio and outcome.

#### Scenario: Even match has moderate intensity

- **GIVEN** player BV 5000 and opponent BV 5000
- **WHEN** battle intensity is calculated
- **THEN** intensity is approximately 0.5

#### Scenario: Overwhelming victory has low intensity

- **GIVEN** player BV 10000 and opponent BV 2000 with VICTORY outcome
- **WHEN** battle intensity is calculated
- **THEN** intensity is less than 0.3

#### Scenario: Narrow defeat has high intensity

- **GIVEN** player BV 4500 and opponent BV 5000 with DEFEAT outcome
- **WHEN** battle intensity is calculated
- **THEN** intensity is greater than 0.6

### Requirement: Unit Damage Application

The system SHALL apply calculated damage to unit armor and structure.

#### Scenario: Damage reduces armor first

- **GIVEN** a unit with full armor and 30% damage
- **WHEN** damage is applied
- **THEN** armor is reduced by 30% and structure remains at 100%

#### Scenario: Excess damage affects structure

- **GIVEN** a unit with 20% armor remaining and 50% damage
- **WHEN** damage is applied
- **THEN** armor is reduced to 0% and structure is reduced by 30%

#### Scenario: Critical damage destroys unit

- **GIVEN** a unit with 100% damage
- **WHEN** damage is applied
- **THEN** unit is marked as destroyed

### Requirement: Personnel Injury Application

The system SHALL apply injuries to personnel based on casualty determination.

#### Scenario: Wounded personnel get injuries

- **GIVEN** a person with casualty status WOUNDED
- **WHEN** injuries are applied
- **THEN** person status changes to WOUNDED, an injury is added with healing duration, and daysToWaitForHealing is set

#### Scenario: KIA personnel are marked dead

- **GIVEN** a person with casualty status KIA
- **WHEN** injuries are applied
- **THEN** person status changes to KIA and deathDate is set

#### Scenario: MIA personnel are marked missing

- **GIVEN** a person with casualty status MIA
- **WHEN** injuries are applied
- **THEN** person status changes to MIA

### Requirement: Salvage Calculation

The system SHALL calculate salvage value based on opponent force BV and battle outcome.

#### Scenario: Victory yields salvage

- **GIVEN** a victory against opponent force with 5000 BV
- **WHEN** salvage is calculated
- **THEN** salvage value is 10-30% of opponent BV (500-1500 C-bills)

#### Scenario: Defeat yields no salvage

- **GIVEN** a defeat against opponent force
- **WHEN** salvage is calculated
- **THEN** salvage value is 0 C-bills

#### Scenario: Draw yields partial salvage

- **GIVEN** a draw against opponent force with 5000 BV
- **WHEN** salvage is calculated
- **THEN** salvage value is 5-15% of opponent BV (250-750 C-bills)

### Requirement: Pure Function Design

The system SHALL implement ACAR functions as pure functions with no side effects.

#### Scenario: Functions are deterministic

- **GIVEN** identical inputs to an ACAR function
- **WHEN** the function is called multiple times
- **THEN** identical outputs are produced (with same seed)

#### Scenario: Functions have no side effects

- **GIVEN** an ACAR function is called
- **WHEN** the function executes
- **THEN** no external state is modified (campaign, units, personnel remain unchanged)

#### Scenario: Functions return new objects

- **GIVEN** an ACAR function that modifies data
- **WHEN** the function is called
- **THEN** new objects are returned and input objects are not mutated

### Requirement: Test Coverage

The system SHALL have comprehensive test coverage for all ACAR functions.

#### Scenario: All functions have unit tests

- **GIVEN** ACAR module with 4 core functions
- **WHEN** tests are run
- **THEN** all 4 functions have test coverage (calculateForceBV, calculateVictoryProbability, distributeDamage, determineCasualties)

#### Scenario: Edge cases are tested

- **GIVEN** ACAR functions
- **WHEN** tests are run
- **THEN** edge cases are covered (zero BV, single unit, all units destroyed, no personnel)

#### Scenario: Seeded random is tested

- **GIVEN** ACAR functions with seeded random
- **WHEN** tests are run
- **THEN** deterministic behavior is verified with fixed seeds

### Requirement: Contract Morale Tracking

The system SHALL track morale levels per contract and update based on scenario outcomes.

#### Scenario: Initial morale level

- **GIVEN** a new contract is created
- **WHEN** checking the morale level
- **THEN** morale defaults to STALEMATE (value 0)

#### Scenario: Morale levels

- **GIVEN** the morale system
- **WHEN** listing available morale levels
- **THEN** levels SHALL be: ROUTED (-3), CRITICAL (-2), WEAKENED (-1), STALEMATE (0), ADVANCING (+1), DOMINATING (+2), OVERWHELMING (+3)

#### Scenario: Victory increases morale

- **GIVEN** a contract with morale STALEMATE
- **WHEN** a scenario is completed with outcome "victory"
- **THEN** morale increases to ADVANCING (+1)

#### Scenario: Defeat decreases morale

- **GIVEN** a contract with morale STALEMATE
- **WHEN** a scenario is completed with outcome "defeat"
- **THEN** morale decreases to WEAKENED (-1)

#### Scenario: Draw maintains morale

- **GIVEN** a contract with morale ADVANCING
- **WHEN** a scenario is completed with outcome "draw"
- **THEN** morale remains ADVANCING

#### Scenario: Morale clamping at maximum

- **GIVEN** a contract with morale OVERWHELMING (+3)
- **WHEN** a scenario is completed with outcome "victory"
- **THEN** morale remains OVERWHELMING (cannot exceed +3)

#### Scenario: Morale clamping at minimum

- **GIVEN** a contract with morale ROUTED (-3)
- **WHEN** a scenario is completed with outcome "defeat"
- **THEN** morale remains ROUTED (cannot go below -3)

### Requirement: Battle Type Modifier

The system SHALL calculate battle type modifiers based on morale level.

#### Scenario: Battle type modifier at STALEMATE

- **GIVEN** a contract with morale STALEMATE
- **WHEN** calculating battle type modifier
- **THEN** modifier = 1 + (3 - 3) × 5 = 1

#### Scenario: Battle type modifier at ROUTED

- **GIVEN** a contract with morale ROUTED (ordinal 0)
- **WHEN** calculating battle type modifier
- **THEN** modifier = 1 + (3 - 0) × 5 = 16

#### Scenario: Battle type modifier at OVERWHELMING

- **GIVEN** a contract with morale OVERWHELMING (ordinal 6)
- **WHEN** calculating battle type modifier
- **THEN** modifier = 1 + (3 - 6) × 5 = -14

### Requirement: Real Weapon Data in Attack Resolution

Weapon attack resolution SHALL use actual weapon damage, heat, and range values from `IWeaponData` instead of hardcoded constants.

#### Scenario: Weapon damage from IWeaponData

- **WHEN** resolving a weapon attack
- **THEN** damage SHALL be read from the weapon's `IWeaponData.damage` field
- **AND** the hardcoded `damage = 5` SHALL NOT be used

#### Scenario: Weapon heat from IWeaponData

- **WHEN** resolving a weapon attack and calculating heat generated
- **THEN** heat SHALL be read from the weapon's `IWeaponData.heat` field
- **AND** the hardcoded `heat = 3` SHALL NOT be used

#### Scenario: Weapon range from IWeaponData

- **WHEN** determining range modifiers for an attack
- **THEN** range brackets SHALL be read from the weapon's `IWeaponData` short/medium/long range fields
- **AND** the hardcoded range brackets `(3, 6, 9)` SHALL NOT be used

### Requirement: Firing Arc Computed from Positions

Attack resolution SHALL compute the firing arc from the attacker's position relative to the target's facing, replacing the hardcoded `FiringArc.Front`.

#### Scenario: Firing arc computed dynamically

- **WHEN** resolving a weapon attack
- **THEN** the firing arc SHALL be computed using the firing-arc-calculation system
- **AND** the appropriate hit location table (front/left/right/rear) SHALL be selected based on the computed arc
- **AND** `FiringArc.Front` SHALL NOT be used as a default

### Requirement: Unified CombatResolver for Both Paths

Both the interactive game session and the simulation runner SHALL use the same `CombatResolver` module for weapon attack resolution.

#### Scenario: Interactive session uses CombatResolver

- **WHEN** a weapon attack is resolved in an interactive game session
- **THEN** the attack SHALL be processed through the unified `CombatResolver.resolveWeaponAttack()` function

#### Scenario: Simulation uses CombatResolver

- **WHEN** a weapon attack is resolved in a simulation run
- **THEN** the attack SHALL be processed through the same `CombatResolver.resolveWeaponAttack()` function
- **AND** both paths SHALL produce identical results for identical inputs

### Requirement: Injectable DiceRoller for All Randomness

All randomness in combat resolution SHALL flow through an injectable `DiceRoller` function for deterministic testing and replay.

#### Scenario: DiceRoller used for to-hit rolls

- **WHEN** rolling to-hit for a weapon attack
- **THEN** the injectable DiceRoller SHALL be used instead of `Math.random()`

#### Scenario: DiceRoller used for hit location

- **WHEN** determining hit location after a successful attack
- **THEN** the injectable DiceRoller SHALL be used for the 2d6 hit location roll

#### Scenario: DiceRoller used for critical hit determination

- **WHEN** checking for critical hits after damage application
- **THEN** the injectable DiceRoller SHALL be used for the 2d6 critical hit roll

#### Scenario: Seeded random produces deterministic results

- **WHEN** the same seed is provided to two identical attack resolutions
- **THEN** both resolutions SHALL produce identical outcomes

### Requirement: Physical Attack Phase Integration

The combat resolution system SHALL include a physical attack phase after weapon attacks and before heat resolution.

#### Scenario: Physical attack phase in turn sequence

- **WHEN** the weapon attack phase completes
- **THEN** the physical attack phase SHALL be activated
- **AND** physical attacks SHALL be resolved through `CombatResolver.resolvePhysicalAttack()`
- **AND** the heat phase SHALL follow after physical attacks complete

### Requirement: Fine-Grained Combat Events

Weapon attack resolution SHALL emit fine-grained events for each combat effect.

#### Scenario: Single weapon hit generates multiple events

- **WHEN** a weapon attack hits and causes a critical hit
- **THEN** the following events SHALL be emitted in order:
  1. `AttackResolved` (hit/miss, weapon data, target)
  2. `DamageApplied` (location, armor/structure changes)
  3. `CriticalHitRolled` (if structure exposed, slot selection, component hit)
  4. Additional cascade events as appropriate (AmmoExplosion, PilotHit, UnitDestroyed)

### Requirement: Aerospace Combat Dispatch

The combat resolution engine SHALL route aerospace targets to an aerospace-specific damage pipeline distinct from the BattleMech and Vehicle paths.

#### Scenario: Aerospace target routing

- **GIVEN** an attack whose target has `unitType === UnitType.AEROSPACE_FIGHTER`, `CONVENTIONAL_FIGHTER`, or `SMALL_CRAFT`
- **WHEN** the engine resolves the hit
- **THEN** `aerospaceResolveDamage()` SHALL be invoked
- **AND** aerospace-specific hit-location and critical-hit tables SHALL be used

### Requirement: Aerospace Damage Chain

The system SHALL apply aerospace damage to arc armor first, then reduce Structural Integrity.

#### Scenario: Damage absorbed by armor

- **GIVEN** an ASF whose Nose arc has 20 armor and the current SI is 6
- **WHEN** 15 damage hits the Nose
- **THEN** Nose armor SHALL be reduced to 5
- **AND** SI SHALL remain 6

#### Scenario: Damage reduces SI

- **GIVEN** the same ASF after Nose armor has dropped to 0
- **WHEN** 20 additional damage hits the Nose
- **THEN** SI SHALL be reduced by `floor(20 / 10) = 2`
- **AND** SI SHALL equal 4

#### Scenario: SI destruction destroys unit

- **GIVEN** an aerospace unit with SI 1
- **WHEN** damage reduces SI to 0 or below
- **THEN** the unit SHALL be destroyed
- **AND** a `UnitDestroyed` event SHALL fire

### Requirement: Aerospace Control Roll

Damage exceeding 10% of current SI SHALL trigger a Control Roll.

#### Scenario: Control roll trigger

- **GIVEN** an ASF with SI 10 that takes 3 damage in a single hit
- **WHEN** damage is applied
- **THEN** a Control Roll SHALL be required (3 > 10 × 0.1 = 1.0)
- **AND** a `ControlRoll` event SHALL fire with its pass/fail result

#### Scenario: Control roll failure penalty

- **GIVEN** a failed Control Roll
- **WHEN** effects are applied
- **THEN** the unit SHALL take 1 additional SI damage
- **AND** the next movement phase SHALL begin with a −1 thrust penalty

### Requirement: Vehicle Combat Dispatch

The combat resolution engine SHALL route vehicle targets to a vehicle-specific damage pipeline distinct from the BattleMech path.

#### Scenario: Vehicle target routing

- **GIVEN** an attack whose target has `unitType === UnitType.VEHICLE`, `VTOL`, or `SUPPORT_VEHICLE`
- **WHEN** the engine resolves the hit
- **THEN** `vehicleResolveDamage()` SHALL be invoked (not the mech `resolveDamage`)
- **AND** vehicle-specific hit-location and crit tables SHALL be used

#### Scenario: Mech target unchanged

- **GIVEN** an attack whose target is a BattleMech
- **WHEN** the engine resolves the hit
- **THEN** the existing BattleMech pipeline SHALL continue unchanged

### Requirement: Vehicle Motive Damage Roll

When damage exposes structure at a vehicle's Front, Side, or Rear location, the system SHALL roll for motive damage.

#### Scenario: Motive roll on structure exposure

- **GIVEN** a tracked vehicle whose Side location reaches internal structure
- **WHEN** the hit is resolved
- **THEN** the engine SHALL roll 2d6 against the motive-damage table
- **AND** the resulting motive penalty SHALL be applied to the vehicle's cruise MP

#### Scenario: Motive table outcomes

- **WHEN** the 2d6 roll is evaluated
- **THEN** 2-5 SHALL apply no effect
- **AND** 6-7 SHALL apply -1 cruise MP (minor)
- **AND** 8-9 SHALL apply -2 cruise MP (moderate)
- **AND** 10-11 SHALL apply -3 cruise MP (heavy)
- **AND** 12 SHALL immobilize the vehicle

#### Scenario: Hover motive sensitivity

- **GIVEN** a Hover vehicle
- **WHEN** any damage is taken (structure exposure not required)
- **THEN** a motive-damage roll SHALL be made

### Requirement: Vehicle Hit Location Tables

The system SHALL use vehicle-specific hit-location tables per attack direction.

#### Scenario: Front attack table

- **GIVEN** an attack from the Front arc
- **WHEN** 2d6 is rolled
- **THEN** 2 SHALL resolve to Front (TAC)
- **AND** 3-4 SHALL resolve to Right Side
- **AND** 5-7 SHALL resolve to Front
- **AND** 8-9 SHALL resolve to Left Side
- **AND** 10-11 SHALL resolve to Turret
- **AND** 12 SHALL resolve to Front (TAC)

#### Scenario: VTOL roll 12 hits Rotor

- **GIVEN** a VTOL target
- **WHEN** a Front or Rear hit location roll is 12
- **THEN** the hit SHALL land on Rotor instead of Turret

### Requirement: Vehicle Critical Hit Table

The system SHALL use a vehicle-specific critical-hit table.

#### Scenario: Crit table outcomes

- **WHEN** a vehicle critical hit is rolled (2d6)
- **THEN** outcomes SHALL map:
  - 2-5 = no critical
  - 6 = Crew Stunned
  - 7 = Weapon Destroyed
  - 8 = Cargo / Infantry Hit
  - 9 = Driver Hit
  - 10 = Fuel Tank Hit (ICE/FuelCell only; energy → reroll)
  - 11 = Engine Hit
  - 12 = Ammo Explosion (if ammo in crit slot)

#### Scenario: Crew Stunned effect

- **GIVEN** a vehicle that rolls Crew Stunned
- **WHEN** the effect is applied
- **THEN** a `VehicleCrewStunned` event SHALL fire
- **AND** the vehicle SHALL skip its next movement phase and next weapon-attack phase

#### Scenario: Engine Hit effect

- **GIVEN** a vehicle that takes its first Engine Hit
- **WHEN** the effect is applied
- **THEN** the vehicle SHALL be disabled for the current turn
- **AND** a second Engine Hit SHALL destroy the vehicle

### Requirement: BattleArmor Combat Dispatch

The combat resolution engine SHALL route BA targets to a BA-specific damage pipeline.

#### Scenario: BA target routing

- **GIVEN** an attack whose target has `unitType === UnitType.BATTLE_ARMOR`
- **WHEN** the engine resolves the hit
- **THEN** `battleArmorResolveDamage()` SHALL be invoked
- **AND** damage SHALL distribute across surviving troopers per the cluster-hits table

#### Scenario: No mech-style criticals on BA

- **GIVEN** damage applied to a BA squad
- **WHEN** critical-hit resolution runs
- **THEN** mech-style crit slot effects SHALL NOT be computed
- **AND** trooper death SHALL be the only structural consequence

### Requirement: Squad Damage Distribution

Damage to a BA squad SHALL distribute across surviving troopers one hit at a time.

#### Scenario: One hit kills one trooper

- **GIVEN** a BA squad with 4 troopers each having 5 armor
- **WHEN** a single 5-damage weapon hits the squad
- **THEN** exactly one random surviving trooper SHALL take 5 damage and be eliminated
- **AND** a `TrooperKilled` event SHALL fire

#### Scenario: Cluster weapon distributes per table

- **GIVEN** the same squad hit by an LRM-10 (10 missiles)
- **WHEN** damage is resolved
- **THEN** the cluster-hits table SHALL determine how many missiles hit
- **AND** each hit SHALL land on a random surviving trooper (seeded RNG)

#### Scenario: Squad eliminated

- **GIVEN** a BA squad with 1 surviving trooper on 2 armor
- **WHEN** 5 damage is dealt
- **THEN** the trooper SHALL die
- **AND** a `SquadEliminated` event SHALL fire
- **AND** the squad SHALL be removed from active play

### Requirement: Anti-Mech Leg Attack

BA in base contact with a mech SHALL be able to declare a Leg Attack during the physical-attack phase.

#### Scenario: Leg attack success

- **GIVEN** a BA squad adjacent to a mech with 4 surviving troopers
- **WHEN** Leg Attack is declared and the roll succeeds
- **THEN** the mech SHALL take `4 × 4 = 16` damage to the target leg
- **AND** the `LegAttack` event SHALL record success

#### Scenario: Leg attack failure

- **GIVEN** the same attack failing its roll
- **WHEN** failure effect is applied
- **THEN** the BA squad SHALL take 1d6 damage distributed across troopers

### Requirement: Anti-Mech Swarm Attack

BA with Magnetic Clamps SHALL be able to swarm an adjacent mech and deal damage each turn.

#### Scenario: Swarm attach

- **GIVEN** a clamped BA squad in base contact with a mech
- **WHEN** Swarm is declared and the roll succeeds
- **THEN** `swarmingUnitId` SHALL be set to the mech
- **AND** a `SwarmAttached` event SHALL fire

#### Scenario: Swarm damage per turn

- **GIVEN** a swarming BA squad with 3 surviving troopers
- **WHEN** a combat turn ends with the squad still swarming
- **THEN** the attached mech SHALL take `1d6 + 3 = 4-9` damage to a random location
- **AND** a `SwarmDamage` event SHALL fire

#### Scenario: Dismount attempt

- **GIVEN** a mech with a swarming BA squad
- **WHEN** the mech declares a dismount action with a successful Piloting roll
- **THEN** the BA squad SHALL take 2d6 damage
- **AND** the swarm SHALL end
- **AND** a `SwarmDismounted` event SHALL fire

### Requirement: Mimetic and Stealth Armor To-Hit Penalties

The system SHALL apply mimetic and stealth to-hit penalties to attackers targeting BA.

#### Scenario: Mimetic active

- **GIVEN** a BA squad that did not move this turn and is wearing Mimetic armor
- **WHEN** an attacker shoots at the squad
- **THEN** the attack's to-hit TN SHALL increase by 1

#### Scenario: Basic Stealth

- **GIVEN** a BA squad wearing Basic Stealth armor
- **WHEN** any attacker shoots at the squad
- **THEN** the to-hit TN SHALL increase by 1 at all ranges

#### Scenario: Improved Stealth with range

- **GIVEN** a BA squad wearing Improved Stealth armor
- **WHEN** an attacker shoots at long range
- **THEN** the to-hit TN SHALL increase by 3
