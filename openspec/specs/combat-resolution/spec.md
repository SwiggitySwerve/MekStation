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

#### Scenario: Routed infantry surviving at 0 combat strength

- **GIVEN** a battle where an infantry platoon routed off-board
- **WHEN** distributeDamage is called
- **THEN** the routed platoon SHALL count as surviving-but-withdrawn (not wrecked)
- **AND** only actual casualties SHALL be recorded

#### Scenario: Partial BA squad survival

- **GIVEN** a battle where a 4-trooper BA squad ends with 2 surviving troopers
- **WHEN** distributeDamage is called
- **THEN** the squad SHALL be counted at 50% strength for post-battle reporting

#### Scenario: Abandoned proto counts as destroyed

- **GIVEN** a battle where a proto was abandoned due to pilot kill
- **WHEN** distributeDamage is called
- **THEN** the proto SHALL be counted as destroyed for victory/salvage purposes

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

### Requirement: Infantry Combat Dispatch

The combat resolution engine SHALL route infantry targets to an infantry-specific damage pipeline.

#### Scenario: Infantry target routing

- **GIVEN** an attack whose target has `unitType === UnitType.INFANTRY`
- **WHEN** the engine resolves the hit
- **THEN** `infantryResolveDamage()` SHALL be invoked
- **AND** damage SHALL convert to trooper casualties after applying the weapon damage divisor

#### Scenario: No mech-style criticals on infantry

- **GIVEN** damage applied to an infantry platoon
- **WHEN** critical-hit resolution runs
- **THEN** mech-style crit slot effects SHALL NOT be computed

### Requirement: Infantry Damage Divisor

Incoming damage on infantry SHALL be multiplied by the weapon's anti-infantry divisor before converting to casualties.

#### Scenario: Flamer doubles damage

- **GIVEN** a Flamer dealing 2 damage base to an infantry platoon
- **WHEN** effective damage is computed
- **THEN** effective damage SHALL equal `2 × 2 = 4`

#### Scenario: Machine Gun doubles damage

- **GIVEN** an MG dealing 2 damage base to infantry
- **WHEN** effective damage is computed
- **THEN** effective damage SHALL equal `2 × 2 = 4`

#### Scenario: PPC baseline on infantry

- **GIVEN** a PPC dealing 10 damage base to infantry
- **WHEN** effective damage is computed
- **THEN** effective damage SHALL equal 10 (multiplier 1.0)

### Requirement: Infantry Casualties from Effective Damage

The system SHALL convert effective damage to casualties using trooper resilience.

#### Scenario: Simple casualty math

- **GIVEN** a 28-trooper Foot platoon with trooper resilience 1 (no Flak)
- **WHEN** effective damage of 5 is applied
- **THEN** 5 troopers SHALL die
- **AND** `survivingTroopers` SHALL become 23
- **AND** an `InfantryCasualties` event SHALL fire

#### Scenario: Flak reduces ballistic damage

- **GIVEN** the same platoon wearing Flak kit taking 10 effective ballistic damage
- **WHEN** casualties are computed
- **THEN** ballistic damage SHALL be divided by 2 per Flak rule, yielding 5 casualties

### Requirement: Infantry Morale Rule

When a platoon drops below 25% of starting strength, the system SHALL roll morale.

#### Scenario: Morale check trigger

- **GIVEN** a 28-trooper Foot platoon reduced to 6 troopers (below 25% = 7)
- **WHEN** the Casualties event fires
- **THEN** an `InfantryMoraleCheck` SHALL be queued

#### Scenario: Failed morale → pinned

- **GIVEN** a morale check that fails by 1 (e.g., rolls 7 vs TN 8)
- **WHEN** the result is applied
- **THEN** `InfantryPinned` SHALL fire
- **AND** the platoon SHALL skip firing and movement next phase

#### Scenario: Failed morale by 2+ → routed

- **GIVEN** a morale check that fails by 3 or more
- **WHEN** the result is applied
- **THEN** `InfantryRouted` SHALL fire
- **AND** the platoon SHALL retreat off-board and no longer participate in combat

### Requirement: Field Gun Firing

Field guns SHALL fire once per turn at the gun's mech-scale damage, consuming ammo.

#### Scenario: AC/5 field gun fires

- **GIVEN** a platoon crewing an AC/5 field gun with 10 rounds
- **WHEN** the field gun fires
- **THEN** damage to the target SHALL equal the AC/5 catalog damage
- **AND** ammo SHALL decrement by 1
- **AND** `FieldGunFired` SHALL fire

#### Scenario: Field gun cannot fire when pinned

- **GIVEN** a pinned platoon
- **WHEN** the field gun firing option is evaluated
- **THEN** firing SHALL be disallowed

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

### Requirement: ProtoMech Combat Dispatch

The combat resolution engine SHALL route ProtoMech targets to a proto-specific damage pipeline.

#### Scenario: Proto target routing

- **GIVEN** an attack whose target has `unitType === UnitType.PROTOMECH`
- **WHEN** the engine resolves the hit
- **THEN** `protoMechResolveDamage()` SHALL be invoked
- **AND** proto-specific hit-location and crit tables SHALL be used

### Requirement: ProtoMech Damage Chain

The proto damage chain SHALL apply armor-then-structure per location with no cross-location transfer.

#### Scenario: Damage contained to location

- **GIVEN** a proto where the LeftArm has 3 armor and 3 structure
- **WHEN** 15 damage hits the LeftArm
- **THEN** armor and structure SHALL both be reduced to 0
- **AND** the LeftArm SHALL be destroyed
- **AND** the 9 excess damage SHALL be discarded (not transferred to Torso)

#### Scenario: Torso destruction destroys proto

- **GIVEN** a proto whose Torso armor and structure drop to 0
- **WHEN** the destruction event fires
- **THEN** the proto SHALL be flagged destroyed
- **AND** a `UnitDestroyed` event SHALL fire

#### Scenario: Main gun destruction

- **GIVEN** a proto whose MainGun location is destroyed
- **WHEN** the destruction event fires
- **THEN** the main gun weapon SHALL be removed
- **AND** a `ProtoLocationDestroyed` event SHALL specify MainGun
- **AND** the proto SHALL continue operating (not destroyed)

### Requirement: ProtoMech Critical Hit Table

The system SHALL use a proto-specific crit table simpler than the mech table.

#### Scenario: Proto crit outcomes

- **WHEN** a proto critical hit is rolled (2d6)
- **THEN** outcomes SHALL map:
  - 2-7 = no critical
  - 8-9 = random equipment destroyed at the hit location
  - 10-11 = engine hit (1st = -1 MP, 2nd = engine destroyed → proto destroyed)
  - 12 = pilot killed (proto abandoned, counts as destroyed)

#### Scenario: Pilot killed ends participation

- **GIVEN** a proto whose 12 crit fires
- **WHEN** the event is applied
- **THEN** a `ProtoPilotKilled` event SHALL fire
- **AND** the proto SHALL be removed from active play

### Requirement: Glider ProtoMech Fall Rule

Glider protos SHALL make a fall roll on any structure-exposing damage while airborne.

#### Scenario: Fall roll triggered

- **GIVEN** an airborne Glider proto that takes damage exposing structure
- **WHEN** the damage resolves
- **THEN** a piloting roll vs TN 7 SHALL be made
- **AND** on failure a `GliderFall` event SHALL fire
- **AND** the proto SHALL take `10 × altitude` fall damage
- **AND** altitude SHALL reset to 0

### Requirement: Bot-Driven Weapon Selection Respects Combat Resolution Inputs

When `BotPlayer` emits an `AttackDeclared` event, the weapon list SHALL already reflect the combat-resolution inputs that the resolver will check: valid firing arc, range within maximum, sufficient ammo, and weapon not destroyed. Downstream combat resolution SHALL therefore not reject bot-declared attacks for basic viability reasons.

#### Scenario: Bot declares only weapons that pass resolver validation

- **GIVEN** a bot attacker with a mix of destroyed, out-of-arc, and out-of-ammo weapons alongside viable weapons
- **WHEN** `BotPlayer.playAttackPhase` emits an `AttackDeclared` event
- **THEN** every weapon ID in the payload SHALL pass `CombatResolver`'s pre-attack validation (arc, range, ammo, destruction status)
- **AND** the resolver SHALL NOT return a `WeaponUnavailable` rejection for any bot-declared weapon

#### Scenario: Bot does not declare weapons at minimum range penalty when alternatives exist

- **GIVEN** a bot attacker 2 hexes from target with both an LRM-10 (minRange 6) and a Medium Laser available
- **WHEN** the resolver processes the declared attack
- **THEN** only the Medium Laser SHALL appear in the declared weapon list
- **AND** the resolver SHALL NOT be asked to apply a minimum-range penalty for this attack

#### Scenario: Bot respects ammo depletion mid-phase

- **GIVEN** a bot attacker with an AC/20 whose ammo reaches zero after a prior declaration in the same turn
- **WHEN** the bot's next declaration considers the AC/20
- **THEN** the weapon SHALL be excluded from the candidate list
- **AND** the emitted event SHALL NOT reference the depleted weapon

### Requirement: Bot Heat Declaration Matches Resolver Heat Accounting

The projected heat used by bot heat management SHALL be computed using the same formula the `CombatResolver` uses when it applies heat at end of turn — namely `currentHeat + movementHeat + sum(firedWeaponHeat) - dissipation` — so that bot decisions and resolver outcomes agree.

#### Scenario: Bot-projected heat matches post-attack heat in the resolver

- **GIVEN** a bot declaration that includes Medium Laser (3 heat) and PPC (10 heat) with `movementHeat = 2` and `dissipation = 10`
- **WHEN** the resolver completes the heat phase
- **THEN** the resulting heat delta SHALL equal the value the bot used to decide whether to cull weapons
- **AND** the bot SHALL NOT trigger unexpected shutdown because of a mismatched heat model

#### Scenario: Bot accounts for already-dissipating heat

- **GIVEN** a bot at current heat 8 with 10 dissipation
- **WHEN** heat projection runs
- **THEN** the projection SHALL subtract the per-turn dissipation before comparing to `safeHeatThreshold`
- **AND** the bot SHALL be willing to fire slightly more aggressively than a naive additive projection would allow

### Requirement: BattleMech Ejection Lifecycle

The tactical combat system SHALL provide a player-declared BattleMech ejection action. Ejection SHALL emit a `UnitEjected` event, mark the unit ejected, preserve the unit's current mech damage snapshot, remove the unit from normal action eligibility, and remove it from normal target filters, objective control, and survivor counts. Multiplayer ejection SHALL route through the same authoritative intent path as other tactical actions.

#### Scenario: Ejection preserves mech damage and exits combat participation

- **GIVEN** an active BattleMech with existing armor, structure, destruction, and pilot-consciousness state
- **WHEN** the owning player declares ejection
- **THEN** a `UnitEjected` event SHALL be appended
- **AND** the unit SHALL have `hasEjected === true`
- **AND** armor, structure, `destroyed`, and `pilotConscious` SHALL remain unchanged from the pre-ejection snapshot
- **AND** the unit SHALL no longer receive movement, attack, or utility actions

#### Scenario: Ejected unit is no longer a normal target

- **GIVEN** a BattleMech has ejected
- **WHEN** an opposing actor builds target choices or attempts to declare an attack against it
- **THEN** the ejected unit SHALL be excluded from valid target lists
- **AND** a direct attack declaration against that unit SHALL be rejected without combat side effects

#### Scenario: Network ejection uses authoritative intent dispatch

- **GIVEN** a multiplayer match with an active unit controlled by a player
- **WHEN** the player submits an `Eject` combat intent for that unit
- **THEN** the server-authoritative match host SHALL dispatch the intent to the interactive combat session
- **AND** the resulting event stream SHALL include exactly the same `UnitEjected` lifecycle event as the local ejection command

### Requirement: Batch Outcome Aggregation

The combat-resolution system SHALL expose
`aggregateBatchOutcomes(outcomes: IBatchOutcome[]): IBatchResult` that
reduces raw per-run outcomes into a single statistical summary used by
the Quick Resolve UI.

#### Scenario: Win probability computed from winner counts

- **GIVEN** 100 outcomes with winner distribution
  `{player: 62, opponent: 30, draw: 8}`
- **WHEN** `aggregateBatchOutcomes(outcomes)` is called
- **THEN** the returned `winProbability` SHALL be
  `{player: 0.62, opponent: 0.30, draw: 0.08}`
- **AND** the three probabilities SHALL sum to 1.0 (within floating
  point tolerance)

#### Scenario: Error outcomes excluded from probability denominator

- **GIVEN** 100 outcomes where 10 errored and the remaining 90 resolved
  to `{player: 45, opponent: 36, draw: 9}`
- **WHEN** `aggregateBatchOutcomes(outcomes)` is called
- **THEN** `winProbability` SHALL be computed over the 90 successful
  runs (`player: 0.5, opponent: 0.4, draw: 0.1`)
- **AND** `IBatchResult.erroredRuns` SHALL equal 10

#### Scenario: Turn-count percentiles

- **GIVEN** 100 outcomes with the turn counts distributed across
  `[6..24]`
- **WHEN** aggregation runs
- **THEN** `turnCount.median` SHALL equal the 50th-percentile value
- **AND** `turnCount.p25`, `turnCount.p75`, `turnCount.p90` SHALL equal
  the respective percentile values
- **AND** `turnCount.min` and `turnCount.max` SHALL bracket the range

#### Scenario: Heat shutdown frequency

- **GIVEN** 100 outcomes where Player units shut down in 18 matches and
  Opponent units shut down in 9 matches
- **WHEN** aggregation runs
- **THEN** `heatShutdownFrequency` SHALL equal
  `{player: 0.18, opponent: 0.09}`

#### Scenario: Per-unit survival rate

- **GIVEN** 100 outcomes where unit id `"p1-locust"` survived 81 matches
- **WHEN** aggregation runs
- **THEN** `perUnitSurvival["p1-locust"]` SHALL equal 0.81

#### Scenario: Most likely outcome

- **GIVEN** win probabilities `{player: 0.62, opponent: 0.30, draw:
0.08}`
- **WHEN** aggregation runs
- **THEN** `mostLikelyOutcome` SHALL equal `"player"`

#### Scenario: Draw when no clear winner

- **GIVEN** win probabilities `{player: 0.49, opponent: 0.49, draw:
0.02}`
- **WHEN** aggregation runs
- **THEN** `mostLikelyOutcome` SHALL equal `"draw"`
- **AND** ties between player and opponent SHALL resolve to `"draw"`
  regardless of the actual draw probability

### Requirement: Empty Batch Handling

`aggregateBatchOutcomes` SHALL return a well-formed empty `IBatchResult`
when called with zero outcomes so the UI can render a "no data" state
without a runtime error.

#### Scenario: Empty input returns zeros

- **GIVEN** an empty `outcomes` array
- **WHEN** `aggregateBatchOutcomes([])` is called
- **THEN** the result SHALL equal `{totalRuns: 0, winProbability:
{player: 0, opponent: 0, draw: 0}, turnCount: {mean: 0, median: 0,
...}, mostLikelyOutcome: "draw", perUnitSurvival: {}}`
- **AND** no division-by-zero exception SHALL be thrown

### Requirement: Combat Outcome Pilot KIA Path Documented As Wave-5 Gated

The `ICombatOutcome.pilotState` field documentation (TypeScript JSDoc on the type definition in `src/types/combat/CombatOutcome.ts`) SHALL include a remarks block stating that the `'KIA'` value is unreachable in Wave 4 because no engine event flips `pilotConscious=false`, and pointing consumers to the Wave-5 pilot-event wiring change as the unblock dependency.

This requirement is documentation-only (no spec scenario test); it ensures downstream consumers (post-battle-review-ui, repair-queue-integration, roster processors) plan around the limitation rather than discovering it in production.

This requirement closes a Tier 4 audit finding on the keystone `ICombatOutcome` interface introduced by archived `add-combat-outcome-model`.

#### Scenario: ICombatOutcome JSDoc surfaces KIA limitation

- **WHEN** a contributor reads the `ICombatOutcome.pilotState` field in `src/types/combat/CombatOutcome.ts`
- **THEN** the JSDoc `@remarks` block states that `'KIA'` is currently unreachable
- **AND** the remarks cite `src/lib/combat/outcome/combatOutcome.ts:128-133` as the derivation site
- **AND** the remarks reference the Wave-5 pilot-event wiring change name (or the `wire-interactive-psr-integration` change if pilot consciousness events are folded into that work) as the unblock dependency

### Requirement: Bot Behavior Variant Registry

`IBotBehavior` (existing type with `retreatThreshold`, `retreatEdge`, `safeHeatThreshold` fields) SHALL be exposed through a named-variant registry that the swarm harness consumes by name. The registry SHALL ship at least four presets: `default`, `aggressive`, `defensive`, `skirmisher`.

The `default` preset SHALL preserve the existing pre-swarm `DEFAULT_BEHAVIOR` values exactly so any existing call site that does not opt into a variant continues to behave identically.

`BotPlayer` SHALL accept an `IBotBehavior` constructor parameter (with the existing `DEFAULT_BEHAVIOR` as the default value) and SHALL use the injected behavior for retreat triggers and heat-aware fire control. `BotPlayer` SHALL declare `implements IAIPlayer`.

#### Scenario: Default preset preserves existing behavior

- **GIVEN** a `BotPlayer` constructed via `new BotPlayer(random)` (no behavior argument)
- **WHEN** retreat triggers are evaluated
- **THEN** the effective `IBotBehavior` SHALL equal the pre-swarm `DEFAULT_BEHAVIOR`
- **AND** all existing bot-retreat / bot-AI tests SHALL continue to pass

#### Scenario: Aggressive variant yields lower retreat propensity

- **GIVEN** two `BotPlayer` instances, one with `default` behavior and one with `aggressive` behavior
- **AND** both units are at 50% structural integrity
- **WHEN** retreat evaluation runs
- **THEN** the `default` unit SHALL retreat (default `retreatThreshold = 0.5`)
- **AND** the `aggressive` unit SHALL NOT retreat at this damage level (`retreatThreshold > 0.5`)

#### Scenario: Defensive variant yields lower heat tolerance

- **GIVEN** two `BotPlayer` instances, one with `default` behavior and one with `defensive` behavior
- **AND** both units have a fire plan that would push heat to 12
- **WHEN** `AttackAI` heat budgeting runs
- **THEN** the `default` unit SHALL fire the full plan (under default `safeHeatThreshold = 13`)
- **AND** the `defensive` unit SHALL drop the highest-heat weapon (under defensive `safeHeatThreshold < 13`)

#### Scenario: Variant lookup with unknown name throws

- **GIVEN** the `getBehaviorVariant(name)` lookup in `behaviorVariants.ts`
- **WHEN** called with `name = 'nonexistent'`
- **THEN** the lookup SHALL throw an error
- **AND** the error message SHALL name the requested variant

#### Scenario: Head-to-head match between two variants converges

- **GIVEN** a 200-run batch of `aggressive` vs `defensive` on the same seed-base, same map, same unit selection
- **WHEN** the batch completes
- **THEN** the `aggressive` win rate SHALL fall in the inclusive range [10%, 90%]
- **AND** the result SHALL NOT degenerate to 0% or 100% (proving both variants make consequential decisions)

### Requirement: BotPlayer Conforms to IAIPlayer

`BotPlayer` SHALL declare `implements IAIPlayer` and SHALL expose the four-method surface defined by `IAIPlayer` (`evaluateRetreat`, `playMovementPhase`, `playAttackPhase`, `playPhysicalAttackPhase`). Method signatures SHALL accept `IGameSession` / `IAIUnitState` / `IHexGrid` and produce `IRetreatEvent` / `IMovementEvent` / `IAttackEvent` (or `null` / array thereof). Internal `AttackAI` / `MoveAI` / `RetreatAI` types SHALL NOT leak through `IAIPlayer`'s public surface.

#### Scenario: BotPlayer satisfies the IAIPlayer contract

- **GIVEN** a `BotPlayer` instance
- **WHEN** assigned to a variable typed `IAIPlayer`
- **THEN** the assignment SHALL type-check without `as` casts or interface adapters

#### Scenario: BotPlayer produces interface-typed outputs

- **GIVEN** a `BotPlayer` driving a unit during a movement phase
- **WHEN** `playMovementPhase` returns
- **THEN** the return value SHALL be `IMovementEvent | null` typed
- **AND** the consumer SHALL NOT need internal `MoveAI` types to consume it

#### Scenario: Alternative IAIPlayer can be substituted

- **GIVEN** a `StandStillAIPlayer` test stub implementing `IAIPlayer`
- **AND** the `SimulationRunner` factory wired to construct it instead of `BotPlayer`
- **WHEN** a 5-turn battle runs
- **THEN** the runner SHALL invoke `StandStillAIPlayer.playMovementPhase` for every unit each turn
- **AND** no unit SHALL change position
- **AND** the simulation SHALL still terminate cleanly (e.g., on turn limit)

### Requirement: Math.random() Audit Guard in Combat Pipeline

The CI pipeline SHALL include a grep-based audit that fails when `Math.random()` is used inside `src/utils/gameplay/` or `src/simulation/`, except at the explicit `defaultD6Roller` definition site (`src/utils/gameplay/diceTypes.ts`). The audit guard exists to prevent regressions that bypass the seeded `D6Roller` injection contract used by the combat-fidelity test pyramid.

#### Scenario: New Math.random() in damage utility fails CI

- **GIVEN** a hypothetical PR introducing `Math.random()` in `src/utils/gameplay/damage/critical.ts` outside the roller-injection contract
- **WHEN** the determinism-audit CI step runs
- **THEN** the step MUST exit non-zero with a message identifying the offending file and line

#### Scenario: Math.random() at defaultD6Roller definition site passes audit

- **GIVEN** the canonical `defaultD6Roller` implementation at `src/utils/gameplay/diceTypes.ts` that internally uses `Math.random()`
- **WHEN** the audit runs
- **THEN** the audit MUST PASS — the definition site is the documented exception

#### Scenario: Math.random() outside audit scope (e.g., UI code) passes

- **GIVEN** a `Math.random()` call in `src/components/` (UI sparkle effect)
- **WHEN** the audit runs
- **THEN** the audit MUST PASS — the audit scope is only `src/utils/gameplay/` and `src/simulation/`

### Requirement: Critical Hit Trigger Return Value Captured

`resolveDamage()` at `src/utils/gameplay/damage/resolve.ts` SHALL capture the return value of `checkCriticalHitTrigger()` and propagate the trigger result to `resolveCriticalHits()` from `src/utils/gameplay/criticalHitResolution/resolver.ts`. The resulting per-slot critical outcomes MUST be appended to `IDamageResult.criticalHits[]` and returned to the caller. The current implementation discards the trigger return value, leaving `criticalHits[]` permanently empty.

#### Scenario: Structure damage with crit roll 8 produces 1 critical

- **GIVEN** a unit with structure damage applied to its CT
- **AND** a seeded `D6Roller` configured to return rolls summing to 8 on `roll2d6()`
- **WHEN** `resolveDamage` is called with that roller
- **THEN** the returned `IDamageResult.criticalHits` MUST contain exactly 1 critical hit entry

#### Scenario: Structure damage with crit roll 7 produces 0 criticals

- **GIVEN** a unit with structure damage applied
- **AND** a seeded roller returning sum 7
- **WHEN** `resolveDamage` is called
- **THEN** `IDamageResult.criticalHits` MUST be empty

#### Scenario: Structure damage with crit roll 12 produces 3 criticals or limb-blown-off

- **GIVEN** a unit with structure damage applied to a limb (e.g., LA)
- **AND** a seeded roller returning sum 12
- **WHEN** `resolveDamage` is called
- **THEN** the result MUST emit either 3 critical-hit entries OR a single "limb blown off" effect that destroys all remaining slots in that limb (per BattleTech Total Warfare rules)

### Requirement: Critical Hit Events Emitted by Runner

The weapon attack runner phase at `src/simulation/runner/phases/weaponAttack.ts` SHALL emit `CriticalHit`, `CriticalHitResolved`, and `ComponentDestroyed` events from the populated `IDamageResult.criticalHits[]` array. Event payloads MUST include sufficient identity to attribute the crit to a specific attacker, target, weapon, location, and component.

#### Scenario: Gyro destruction event chain

- **GIVEN** a seeded scenario where a critical hit destroys the gyro on a unit
- **WHEN** the runner processes the damage result
- **THEN** the event log MUST contain `CriticalHit { unitId, location: 'CT', count: 1 }`, `CriticalHitResolved { unitId, location: 'CT', slot: <gyro-slot>, component: 'gyro' }`, and `ComponentDestroyed { unitId, component: 'gyro' }`

#### Scenario: Engine-3-hit destruction triggers UnitDestroyed

- **GIVEN** a seeded scenario where 3 critical hits land on engine slots
- **WHEN** the third engine crit resolves
- **THEN** `UnitDestroyed { unitId, cause: 'engine_destroyed' }` MUST fire after the third `ComponentDestroyed { component: 'engine' }`

### Requirement: Weapon Attack Lifecycle Events

`weaponAttack.ts` SHALL emit `AttackDeclared` immediately before the to-hit roll, with payload containing `attackerId`, `targetId`, `weaponId`, `range`, `firingArc`, and the full modifier list contributing to the target number. Immediately after the roll resolves, `AttackResolved` MUST emit with `attackerId`, `targetId`, `weaponId`, `rolledTN`, `rolled2d6`, `hit: bool`, and (when `hit: true`) `hitLocation`. The current implementation emits neither event.

#### Scenario: AC/20 attack at short range vs stationary target

- **GIVEN** a seeded Atlas firing AC/20 at a stationary Locust at range 2 (short bracket)
- **AND** the to-hit calculation produces TN 4 (gunnery 4 + 0 modifiers)
- **WHEN** the attack resolves
- **THEN** `AttackDeclared { weaponId: 'ac20', range: 'short', modifiers: [{ key: 'gunnery', value: 4 }] }` MUST fire BEFORE the roll
- **AND** `AttackResolved { rolledTN: 4, hit: <bool>, hitLocation: <if hit> }` MUST fire AFTER the roll

#### Scenario: Out-of-range attack emits AttackInvalid

- **GIVEN** a weapon attack declared at range exceeding the weapon's longRange
- **WHEN** the runner validates the attack
- **THEN** `AttackInvalid { reason: 'out_of_range' }` MUST emit
- **AND** no `AttackDeclared` / `AttackResolved` for that attempt

### Requirement: Location Destruction and Damage Transfer Events

When a location's armor and internal structure both reach zero, `weaponAttack.ts` SHALL emit `LocationDestroyed { unitId, location }`. When residual damage transfers from a destroyed location to the next location in the canonical transfer chain (HD blocked, CT terminal, LT/RT → CT, LA → LT, RA → RT, LL → LT, RL → RT), `TransferDamage { unitId, fromLocation, toLocation, damage }` MUST emit before `DamageApplied` for the receiving location.

#### Scenario: LA destroyed transfers remaining damage to LT

- **GIVEN** a unit with LA at 1 armor + 1 structure
- **AND** an attack delivering 5 damage to LA
- **WHEN** damage resolves
- **THEN** events MUST emit in order: `DamageApplied { location: 'LA', damage: 2 }`, `LocationDestroyed { location: 'LA' }`, `TransferDamage { from: 'LA', to: 'LT', damage: 3 }`, `DamageApplied { location: 'LT', damage: 3 }`

#### Scenario: HD destruction does not transfer damage

- **GIVEN** a unit with HD at 1 armor + 1 structure
- **AND** an attack delivering 10 damage to HD
- **WHEN** damage resolves
- **THEN** `LocationDestroyed { location: 'HD' }` MUST emit
- **AND** no `TransferDamage` event MUST follow
- **AND** `UnitDestroyed { cause: 'head_destroyed' }` MUST emit

### Requirement: Heat Lifecycle Events

The heat phase at `src/simulation/runner/phases/postCombat.ts` SHALL emit `HeatGenerated`, `HeatDissipated`, and (when crossing thresholds) `HeatEffectApplied` events for every unit every turn. The current implementation mutates `unit.heat` silently with no events emitted, leaving downstream consumers blind.

#### Scenario: Atlas alpha-strike at heat 0 produces shutdown event chain

- **GIVEN** an Atlas at heat 0 firing AC/20 + LRM-20 + 4× ML + SRM-6 (~30 heat)
- **WHEN** the heat phase resolves
- **THEN** `HeatGenerated { unitId, amount: ~30, breakdown: { weapons: ~30, movement: 0, terrain: 0 } }` MUST fire
- **AND** `HeatDissipated { unitId, amount: 20 }` (Atlas has 20 single heat sinks) MUST fire
- **AND** `HeatEffectApplied { unitId, threshold: 30, effect: 'shutdown' }` MUST fire
- **AND** `ShutdownCheck { unitId, automatic: true }` MUST fire

### Requirement: Ammo Consumption and Explosion Events

When a weapon fires, the runner SHALL emit `AmmoConsumed { unitId, ammoBinId, amount }` for each round expended. When a critical hit lands on a loaded ammo bin, `AmmoExplosion { unitId, ammoBinId, location, damage }` MUST emit before the cascade damage is applied to the bin's location. CASE / CASE-II rules MUST confine the explosion damage to the bin's location when present.

#### Scenario: AC/20 ammo cookoff from internal critical

- **GIVEN** an Atlas with AC/20 ammo bin in RT (no CASE)
- **AND** a seeded scenario where a critical hit lands on the ammo bin
- **WHEN** the runner processes the crit
- **THEN** `AmmoExplosion { ammoBinId: 'ac20-ammo', location: 'RT', damage: 200 }` MUST fire
- **AND** the resulting damage cascade MUST destroy RT and transfer to CT (no CASE)

#### Scenario: With CASE, ammo explosion stays in source location

- **GIVEN** the same Atlas but with CASE installed in RT
- **WHEN** the same crit fires
- **THEN** `AmmoExplosion` MUST emit
- **AND** RT MUST be destroyed
- **AND** no `TransferDamage` to CT — the explosion MUST be confined per CASE rules

### Requirement: AttackResolved Side-Effect Chain Ordering

When a weapon attack resolves with `hit: true`, the simulation runner SHALL emit the resulting events in causal-deterministic order so consumers can replay the cascade without ambiguity. The canonical ordering for a single resolved hit is:

1. `attack_resolved` (the GATOR-validated outcome of the to-hit roll)
2. `damage_applied` (one event per location that takes damage; for cluster weapons, one per cluster after the cluster-hits-table roll)
3. `location_destroyed` (if the location's structure dropped to 0; carries `viaTransfer: false` for the directly-hit location)
4. `transfer_damage` (if there is residual damage to transfer to a parent location)
5. `damage_applied` (cascade — repeats steps 2-4 for each transfer until a location absorbs the residual or the unit is destroyed)
6. `critical_hit` (one event per crit roll triggered by the damage chain)
7. `critical_hit_resolved` (one event per slot resolved by the crit)
8. `component_destroyed` (one event per destroyed component slot)
9. `unit_destroyed` (if the cascade caused unit destruction; carries the canonical `cause`)

For cluster / multi-location attacks (LRMs, SRMs, LB-X, etc.), the runner SHALL repeat steps 2-8 once per cluster in the order produced by the per-cluster location rolls.

For misses (`hit: false`), the runner SHALL emit `attack_resolved` and SHALL NOT emit any of the side-effect events 2-9.

#### Scenario: Hit producing direct damage with no transfer emits the minimum chain

- **GIVEN** a weapon attack that hits with damage less than the location's armor remaining
- **WHEN** the runner resolves the attack
- **THEN** the event log SHALL contain `attack_resolved` (hit=true) followed by `damage_applied` for the hit location
- **AND** the runner SHALL NOT emit `location_destroyed`, `transfer_damage`, `critical_hit`, or `unit_destroyed` for this hit

#### Scenario: Hit destroying a location triggers the transfer chain

- **GIVEN** a weapon attack whose damage exceeds the hit location's combined armor + structure
- **WHEN** the runner resolves the attack
- **THEN** the events SHALL appear in order: `attack_resolved`, `damage_applied` (hit location), `location_destroyed` (`viaTransfer: false`), `transfer_damage` (toLocation = parent), `damage_applied` (parent location)
- **AND** if the parent location also destroys, the chain SHALL continue (`location_destroyed` with `viaTransfer: true` for the parent), terminating either when residual damage is absorbed or when the unit is destroyed

#### Scenario: Cluster weapon emits per-cluster damage events

- **GIVEN** an LRM-20 attack that hits with the cluster-hits-table producing 11 missiles
- **WHEN** the runner resolves the attack
- **THEN** the events SHALL contain exactly one `attack_resolved`
- **AND** the events SHALL contain at least 11 `damage_applied` events (one per cluster), distributed by the per-cluster location roll
- **AND** the cluster's per-location damage chain (steps 3-8) SHALL repeat for each cluster that destroys a location

#### Scenario: Miss emits only attack_resolved

- **GIVEN** a weapon attack with `roll < toHitNumber`
- **WHEN** the runner resolves the attack
- **THEN** the event log SHALL contain exactly one `attack_resolved` event with `hit: false`
- **AND** the event log SHALL NOT contain any of `damage_applied`, `location_destroyed`, `transfer_damage`, `critical_hit`, `critical_hit_resolved`, `component_destroyed`, `unit_destroyed` causally attributable to this attack

### Requirement: Air-to-Air Dispatch

When both the attacker and the target are airborne aerospace units (`airborneState === 'airborne'` or `'taking-off'` or `'landing'`), the combat resolver SHALL route the attack to the air-to-air resolver in `aerospace-deployment`. The air-to-air resolver SHALL handle to-hit modifier calculation and delegate damage application to the existing `aerospaceResolveDamage` per the existing `Aerospace Damage Chain` requirement.

#### Scenario: Two airborne aero — air-to-air dispatch

- **GIVEN** attacker A and target T both in `airborneState: 'airborne'`
- **WHEN** A declares an attack against T
- **THEN** the resolver SHALL invoke the air-to-air resolver
- **AND** the existing `aerospaceResolveDamage` SHALL be invoked for damage application

#### Scenario: Grounded aero attacker bypasses air-to-air

- **GIVEN** A is a grounded aero (`airborneState: 'grounded'`), T is airborne
- **WHEN** A declares an attack at T
- **THEN** the resolver SHALL route through Ground-to-Air Dispatch (A is treated as a ground unit)

### Requirement: Air-to-Ground Dispatch

When the attacker is an airborne aerospace unit and the target is a ground unit (BattleMech, Vehicle, Infantry, Battle Armor, ProtoMek, grounded Aero), the combat resolver SHALL route the attack to the air-to-ground resolver in `aerospace-deployment`. The resolver SHALL apply the +2 base strafe penalty + altitude-tier modifier per `aerospace-deployment → Air-to-Ground Combat`.

#### Scenario: Airborne ASF fires at ground mech — air-to-ground

- **GIVEN** A is `airborneState: 'airborne'` at altitude 5, T is a ground mech
- **WHEN** A declares a forward-arc weapon attack at T's hex during movement
- **THEN** the resolver SHALL invoke the air-to-ground resolver
- **AND** the to-hit penalty SHALL include +2 (strafe) + 1 (medium altitude) = +3

### Requirement: Ground-to-Air Dispatch

When the attacker is a ground unit and the target is an airborne aerospace unit, the combat resolver SHALL route the attack to the ground-to-air resolver in `aerospace-deployment`. The resolver SHALL apply the altitude-tier penalty (low +1, med +2, high +3) and SHALL reject indirect-fire weapons with a warning event.

#### Scenario: Ground mech fires at airborne aero — ground-to-air

- **GIVEN** A is a mech with PPC, T is airborne aero at altitude 8 (high tier)
- **WHEN** A declares the attack
- **THEN** the resolver SHALL invoke the ground-to-air resolver
- **AND** the to-hit penalty SHALL include +3 (high altitude)

#### Scenario: Ground-to-air preview suppresses ground-only minimum range

- **GIVEN** A is a ground unit with a direct-fire weapon that has minimum range
- **AND** T is an airborne aerospace unit at altitude 3 within that weapon's nominal minimum range
- **WHEN** the tactical map projects the target and A declares the attack
- **THEN** the preview and committed to-hit modifiers SHALL NOT include `Minimum Range`
- **AND** the preview and committed to-hit modifiers SHALL include the ground-to-air altitude-tier penalty
- **AND** the tactical map SHALL NOT render a minimum-range badge for T's hex
- **AND** T's altitude and velocity metadata SHALL remain visible in top-down and isometric map projections

#### Scenario: Indirect-fire weapon rejected against airborne target

- **GIVEN** A is a mech with LRM-15 in `weapon.mode: 'Indirect'`, T is airborne aero
- **WHEN** A attempts the attack
- **THEN** the resolver SHALL reject the attack
- **AND** a warning event SHALL be emitted: `'Indirect-fire weapons cannot engage airborne targets'`
- **AND** no ammo or heat SHALL be consumed (attack fully rejected, not auto-miss)

### Requirement: Aerospace Dispatch Matrix Completeness

The combat resolver's aerospace dispatch SHALL cover all combinations of (attacker airborne-state × target airborne-state) for aerospace units per the following matrix:

| Attacker | Target | Dispatch |
|---|---|---|
| Airborne aero | Airborne aero | Air-to-Air |
| Airborne aero | Ground unit | Air-to-Ground |
| Airborne aero | Grounded aero | Air-to-Ground (grounded aero treated as ground unit) |
| Grounded aero | Airborne aero | Ground-to-Air |
| Grounded aero | Ground unit | Standard ground-combat dispatch (per existing `combat-resolution`) |
| Ground unit | Airborne aero | Ground-to-Air |
| Ground unit | Grounded aero | Standard ground-combat dispatch with `aerospaceResolveDamage` for hit-location |

#### Scenario: Grounded aero vs airborne aero — ground-to-air

- **GIVEN** A is a grounded aero, T is airborne
- **WHEN** A declares an attack at T
- **THEN** the resolver SHALL invoke the ground-to-air resolver (A treated as ground)

#### Scenario: Airborne aero vs grounded aero — air-to-ground

- **GIVEN** A is airborne, T is grounded aero
- **WHEN** A declares an attack at T
- **THEN** the resolver SHALL invoke the air-to-ground resolver (T treated as ground unit)

### Requirement: Battle Armor Combat Dispatch

The combat resolver SHALL route attacks involving Battle Armor units to BA-specific handlers per the following dispatch table:

| Attacker | Target | Weapon kind | Handler |
|---|---|---|---|
| BA | Mek | `SwarmAttack` | `swarmAttachResolver` |
| BA (swarmed) | Mek host | `SwarmWeaponAttack` | `swarmFireResolver` |
| BA | Mek | `LegAttack` | `legAttackResolver` |
| BA | Any adjacent | `BAVibroClawAttack` | `vibroclawResolver` |
| Mek | (swarmed by BA) | (brush-off declared) | `brushOffResolver` |
| Non-BA | BA squad | (any weapon) | apply `allocateSquadDamage` instead of mech hit-location |
| Non-BA | Mek with mounted BA | (hits to CT/LT/RT) | route via `getTrooperAtLocation` adapter |

#### Scenario: BA-attacker SwarmAttack routes correctly

- **GIVEN** attacker A has `unitType === BATTLE_ARMOR` and weapon kind is `SwarmAttack`
- **WHEN** the resolver processes the attack
- **THEN** the `swarmAttachResolver` SHALL be invoked (not the mech weapon handler)

#### Scenario: Non-BA attacker fires at BA target — squad damage allocation

- **GIVEN** attacker A is a mech, target T has `unitType === BATTLE_ARMOR`
- **WHEN** A's weapon hits T
- **THEN** the resolver SHALL invoke `allocateSquadDamage(T.combatState.squad, damage, rng)` instead of mech hit-location
- **AND** emitted events SHALL include per-trooper damage allocations + any `BATrooperKilled` events

#### Scenario: Non-BA attacker hits host mech with mounted-trooper at location

- **GIVEN** host mech L has swarmer B attached, A fires a hit landing on L's CT-rear
- **WHEN** damage is applied
- **THEN** the resolver SHALL consult `getTrooperAtLocation(CT_rear, ...)` → trooper 5
- **AND** if trooper 5 is alive, damage SHALL be routed to that trooper (per `Anti-Personnel Fire on Mounted Troopers` in `battle-armor-combat`)
- **AND** if trooper 5 is dead, damage SHALL be applied to L's CT-rear armor normally

#### Scenario: Mek brush-off declaration consumes weapon slot

- **GIVEN** mek L with attached swarmer B declares Brush-Off
- **WHEN** the resolver processes the declaration
- **THEN** one of L's weapon-attack slots for the turn SHALL be marked consumed
- **AND** the `brushOffResolver` SHALL be invoked

### Requirement: Battle Armor Combat Event Coverage

The typed combat event log SHALL emit one or more of seven BA-specific event variants whenever a BA-related attack resolves: `BASwarmAttached`, `BASwarmDetached`, `BASwarmDamageApplied`, `BALegAttackResolved`, `BAVibroclawAttackResolved`, `BATrooperKilled`, `BABrushOffAttempted`. Each event SHALL carry stable fields per the discriminated-union definition in `battle-armor-combat`.

#### Scenario: Swarm-attached emits BASwarmAttached

- **GIVEN** B's `SwarmAttack` against L succeeds
- **WHEN** the resolver records the result
- **THEN** a `BASwarmAttached { attackerId: B.id, hostId: L.id }` event SHALL be emitted

#### Scenario: Squad destroyed mid-swarm emits both BATrooperKilled and BASwarmDetached

- **GIVEN** swarmer B attached to L, last surviving trooper killed by enemy fire
- **WHEN** the trooper-killing damage is applied
- **THEN** a `BATrooperKilled` event SHALL be emitted for that trooper
- **AND** at end-of-turn cleanup, a `BASwarmDetached { reason: 'SquadDestroyed' }` event SHALL be emitted
- **AND** the two events SHALL be ordered: trooper kill first, detach second

#### Scenario: Brush-off attempt emits BABrushOffAttempted regardless of outcome

- **GIVEN** L declares Brush-Off against B
- **WHEN** the resolver processes the attempt
- **THEN** a `BABrushOffAttempted` event SHALL be emitted with `outcome: 'hit' | 'miss'`
- **AND** on hit, an additional `BASwarmDetached { reason: 'BrushedOff' }` SHALL be emitted

#### Scenario: Event log replay round-trips BA events

- **GIVEN** a JSONL event log containing all 7 BA event variants
- **WHEN** the replay loader replays the log
- **THEN** all 7 event types SHALL be parsed without loss
- **AND** the columnar formatter SHALL render each with its stable fields per the line-format suite (pairs with `project_event_log_line_format_suite`)

### Requirement: Indirect-Fire Dispatch

The combat resolver SHALL invoke `InteractiveSession.computeIndirectFireContext` before `computeToHit` whenever an attack's weapon mode is `'Indirect'` OR the attacker has no line of sight to the target. The returned `IIndirectFireResolution` SHALL be folded into the attack record and the `toHitPenalty` SHALL be added to the running to-hit number.

#### Scenario: Indirect mode triggers dispatch

- **GIVEN** attacker A has weapon W toggled to `mode: 'Indirect'`
- **WHEN** A declares an attack against hex H
- **THEN** the resolver SHALL call `computeIndirectFireContext(A.id, W.id, H)` before `computeToHit`
- **AND** the resolution SHALL be attached to the attack record as `attackRecord.indirectFire = IIndirectFireResolution`

#### Scenario: No LOS triggers dispatch even when mode is Direct

- **GIVEN** attacker A has weapon W in `mode: 'Direct'`
- **AND** A has no line of sight to target hex H
- **WHEN** A declares an attack against H
- **THEN** the resolver SHALL call `computeIndirectFireContext` to check whether indirect resolution is available
- **AND** if the resolution is `{ permitted: true, isIndirect: true }`, the attack SHALL proceed as indirect
- **AND** if the resolution is `{ permitted: false }`, the attack SHALL be rejected with the resolution's `reason` field

#### Scenario: LOS + Direct mode bypasses dispatch

- **GIVEN** attacker A has line of sight to target T
- **AND** weapon W is in `mode: 'Direct'`
- **WHEN** A declares an attack against T
- **THEN** the resolver SHALL NOT call `computeIndirectFireContext`
- **AND** the attack SHALL resolve via the existing direct-fire pipeline

### Requirement: Indirect-Fire Event Coverage

The typed combat event log SHALL emit one of four event variants whenever an indirect-fire resolution is computed: `IndirectFireSpotterSelected` (basis='los'), `IndirectFireNarcOverride` (basis='narc' or 'inarc'), `IndirectFireForwardObserver` (FO SPA cancelled the spotter-walked penalty), or `IndirectFireSpotterLost` (spotter destroyed before damage resolution).

#### Scenario: LOS spotter selected — emits IndirectFireSpotterSelected

- **GIVEN** an indirect attack resolves with a friendly LOS spotter elected
- **WHEN** `computeIndirectFireContext` completes
- **THEN** an `IndirectFireSpotterSelected` event SHALL be emitted with fields `{ attackerId, spotterId, weaponId, ammoId, targetHex, toHitPenalty, basis: 'los' }`

#### Scenario: NARC override — emits IndirectFireNarcOverride

- **GIVEN** an indirect attack resolves via NARC override (no LOS spotter, target NARC-marked by friendly team)
- **WHEN** `computeIndirectFireContext` completes
- **THEN** an `IndirectFireNarcOverride` event SHALL be emitted with fields `{ attackerId, spotterId: null, weaponId, ammoId, targetHex, toHitPenalty, basis: 'narc' | 'inarc' }`

#### Scenario: Forward Observer SPA active — emits IndirectFireForwardObserver

- **GIVEN** an indirect attack with a walking spotter whose pilot has the `FORWARD_OBSERVER` SPA
- **WHEN** the resolver cancels the +1 spotter-walked penalty
- **THEN** an `IndirectFireForwardObserver` event SHALL be emitted with fields `{ attackerId, spotterId, weaponId, basis: 'los', penaltyCancelled: 1 }`
- **AND** this event SHALL be emitted in addition to (not instead of) the `IndirectFireSpotterSelected` event

#### Scenario: Spotter destroyed mid-attack — emits IndirectFireSpotterLost

- **GIVEN** a spotter elected at to-hit time
- **WHEN** the spotter is destroyed by an intervening attack before damage resolution
- **THEN** an `IndirectFireSpotterLost` event SHALL be emitted with fields `{ attackerId, spotterId, weaponId, ammoId, targetHex, reason: 'Spotter destroyed before resolution' }`
- **AND** the attack outcome SHALL be `'auto-miss'` with ammo + heat still consumed

#### Scenario: Event log replay round-trips indirect events

- **GIVEN** an indirect-fire attack with all four event types in the JSONL event log
- **WHEN** the replay loader replays the log
- **THEN** the four event types SHALL be parsed without loss
- **AND** the columnar formatter SHALL render each with its stable fields per the line-format suite

### Requirement: Spotter-Fire Penalty on Elected Spotter

The spotter unit elected for an indirect-fire attack SHALL receive a +1 to-hit modifier on any of its OWN direct-fire attacks during the same turn, mirroring MegaMek's `ComputeAttackerToHitMods.java:172-177` rule. This penalty SHALL apply for the entire turn once the spotter has been elected, even if a subsequent indirect attack invalidates the spotter via liveness check.

#### Scenario: Spotter takes its own attack — +1 penalty

- **GIVEN** spotter S was elected for attacker A's indirect attack
- **WHEN** S subsequently fires its own direct attack on a different target
- **THEN** S's to-hit calculation SHALL include `+1 spotting-fire` modifier
- **AND** the modifier SHALL be tagged in the to-hit breakdown as `'Spotting for indirect fire'`

#### Scenario: Penalty persists after spotter-lost auto-miss

- **GIVEN** S was elected as spotter and S was subsequently destroyed before A's damage step
- **WHEN** S's earlier own-attacks are replayed
- **THEN** the +1 spotting-fire penalty SHALL still apply (the penalty is fixed at election time, not retroactively cancelled)

