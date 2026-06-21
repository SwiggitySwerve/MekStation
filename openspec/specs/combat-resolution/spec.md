# combat-resolution Specification

## Purpose

Defines Combat Resolution requirements for ACAR System, Damage Distribution, Casualty Determination, and Scenario Resolution, preserving the source-of-truth scope introduced by archived change implement-comprehensive-campaign-system.

## Requirements
### Requirement: ACAR System

The system SHALL provide Auto-Calculate and Resolve (ACAR) combat resolution for scenarios without tactical gameplay. ACAR victory probability SHALL be computed with the linear Battle-Value odds model `playerBV / (playerBV + opponentBV)`, and the spec SHALL NOT assert a victory probability the linear model cannot produce.

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
- **THEN** probability SHALL equal `8000 / (8000 + 4000)`, i.e. approximately 0.667 (2/3)
- **AND** the result SHALL be greater than 0.5 (higher BV favours the player) but SHALL NOT exceed the linear ceiling; the previously documented `> 0.7` claim is removed because the shipped linear model at `src/lib/combat/acar.ts` cannot produce it for a 2:1 ratio.

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

The system SHALL use vehicle-specific hit-location tables per attack direction,
and SHALL apply MegaMek hull-down fixed-location behavior when a hull-down
vehicle or vehicle-mode QuadVee is hit through a protected arc.

#### Scenario: Hull-down turreted vehicle protected arc uses turret

- **GIVEN** a hull-down vehicle or vehicle-mode QuadVee with an available turret
- **AND** the attack direction is front, left, or right for a non-backed entry
- **WHEN** vehicle hit location is resolved
- **THEN** the hit location SHALL be `turret`
- **AND** no normal vehicle hit-location table roll SHALL be consumed
- **AND** the result SHALL not be a TAC result.

#### Scenario: Hull-down non-turret vehicle protected arc uses incoming side

- **GIVEN** a hull-down vehicle or vehicle-mode QuadVee without an available
  turret, or whose turret is ignored
- **AND** the attack direction is front, left, or right for a non-backed entry
- **WHEN** vehicle hit location is resolved
- **THEN** the hit location SHALL be the fixed incoming side location:
  `front`, `left_side`, or `right_side`
- **AND** the result SHALL not be a TAC result.

#### Scenario: Hull-down vehicle exposed opposite arc uses normal table

- **GIVEN** a hull-down vehicle or vehicle-mode QuadVee that did not back into
  hull-down
- **AND** the attack direction is rear
- **WHEN** vehicle hit location is resolved
- **THEN** the normal rear vehicle hit-location table SHALL be used
- **AND** VTOL rotor redirection and TAC handling SHALL remain normal.

#### Scenario: Backed hull-down entry flips protected direction

- **GIVEN** a hull-down vehicle or vehicle-mode QuadVee whose entry path
  included a backward step
- **WHEN** vehicle hit location is resolved
- **THEN** rear, left, and right attacks SHALL use hull-down fixed-location
  behavior
- **AND** front attacks SHALL use the normal front vehicle hit-location table.

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

### Requirement: Session Vehicle Damage Dispatch

The system SHALL resolve committed weapon hits against targets whose derived
unit state carries `combatState.kind === "vehicle"` with the vehicle combat
pipeline rather than the generic Mek hit-location and damage pipeline.

#### Scenario: Represented vehicle target uses vehicle damage

- **GIVEN** a weapon attack hits a target with `combatState.kind === "vehicle"`
- **WHEN** the session resolves the attack
- **THEN** the hit location SHALL be selected by the vehicle hit-location table
  for the computed attack direction
- **AND** the emitted `AttackResolved.location` SHALL be the corresponding
  vehicle armor location such as `Front`, `Left`, `Right`, `Rear`, `Turret`, or
  `Rotor`
- **AND** emitted `DamageApplied` events SHALL carry vehicle armor and
  structure remaining values from `vehicleResolveDamage`
- **AND** the generic Mek damage transfer chain SHALL NOT be used for that hit.

#### Scenario: Hull-down fixed location is honored during session resolution

- **GIVEN** a hull-down represented vehicle target is hit through a protected
  arc
- **AND** the vehicle has an available represented turret
- **WHEN** the session resolves the attack
- **THEN** the committed hit SHALL resolve to `Turret`
- **AND** no normal vehicle location-table dice SHALL be consumed for that hit.

#### Scenario: Vehicle motive and crash events are replay-visible

- **GIVEN** vehicle damage triggers motive damage, immobilization, or VTOL rotor
  crash handling
- **WHEN** the session resolves the attack
- **THEN** the event stream SHALL include the applicable vehicle events:
  `MotiveDamaged`, `MotivePenaltyApplied`, `VehicleImmobilized`, and
  `VTOLCrashCheck`
- **AND** fatal vehicle damage SHALL emit `UnitDestroyed` with a compatible
  destruction cause.

### Requirement: Session Vehicle Critical Dispatch

The system SHALL dispatch represented vehicle weapon-hit critical triggers from
the committed session attack path through the vehicle critical-hit resolver.

#### Scenario: Vehicle TAC critical is replay-visible

- **GIVEN** a committed weapon attack hits a target with
  `combatState.kind === "vehicle"`
- **AND** the vehicle hit-location result is a TAC trigger
- **WHEN** the session resolves the attack
- **THEN** the session SHALL roll and apply a vehicle critical result
- **AND** the event stream SHALL include a `CriticalHitResolved` event naming
  the vehicle critical effect that was applied.

#### Scenario: Vehicle structure exposure triggers critical dispatch

- **GIVEN** a committed weapon attack hits a target with
  `combatState.kind === "vehicle"`
- **AND** vehicle damage exposes structure at the hit location
- **WHEN** the session resolves the attack
- **THEN** the session SHALL roll and apply a vehicle critical result after the
  vehicle damage event has been emitted.

#### Scenario: Vehicle critical effects emit state-specific events

- **GIVEN** a vehicle critical result applies a crew stun, weapon destruction,
  ammo explosion, engine destruction, or crew kill effect
- **WHEN** the session emits replay events for the critical
- **THEN** the event stream SHALL include the applicable state-specific events
  from `VehicleCrewStunned`, `ComponentDestroyed`, `AmmoExplosion`, and
  `UnitDestroyed`
- **AND** replaying the events SHALL reconstruct the vehicle combat-state
  mutation.

### Requirement: Location-Sensitive Vehicle Critical Tables

The vehicle critical resolver SHALL select critical effects using the struck
vehicle location instead of one generic vehicle critical table.

#### Scenario: Front vehicle critical roll uses the front table

- **GIVEN** a represented ground vehicle is critically hit in the front
- **WHEN** the vehicle critical roll total is 12
- **THEN** the applied critical effect SHALL be `crew_killed`.

#### Scenario: Rear vehicle critical roll uses engine fuel context

- **GIVEN** a represented ground vehicle is critically hit in the rear
- **WHEN** the vehicle critical roll total is 12
- **AND** the vehicle has a non-fusion fuel-bearing engine
- **THEN** the applied critical effect SHALL be `fuel_tank`.

#### Scenario: Turret vehicle critical roll can lock or destroy the turret

- **GIVEN** a represented vehicle is critically hit in the turret
- **WHEN** the vehicle critical roll total is 9 or 12
- **THEN** the applied critical effect SHALL be `turret_locked` for 9 and
  `turret_destroyed` for 12.

#### Scenario: VTOL rotor critical roll uses rotor-specific results

- **GIVEN** a represented VTOL is critically hit in the rotor
- **WHEN** the vehicle critical roll total is 6, 9, or 11
- **THEN** the applied critical effect SHALL be `rotor_damage`,
  `flight_stabilizer`, or `rotor_destroyed` respectively.

### Requirement: Vehicle Critical Availability Fallthrough

Vehicle critical resolution SHALL continue through the struck-location critical
table when represented state proves that the current table entry cannot apply.
If no later entry applies, the resolver SHALL retry the same struck-location
table once from roll 6 before resolving to `none`, matching MegaMek Tank / VTOL
critical-effect selection.

#### Scenario: Rear ammo critical falls through when no explosive ammo is represented

- **GIVEN** a represented ground vehicle is critically hit in the rear
- **AND** the vehicle has no represented explosive ammo remaining
- **WHEN** the vehicle critical roll total is 11
- **THEN** the resolver SHALL skip `ammo_explosion`
- **AND** the applied critical effect SHALL fall through to the roll-12
  engine or fuel-tank outcome for that vehicle's represented engine state.

#### Scenario: Turret ammo critical falls through to turret destruction

- **GIVEN** a represented vehicle is critically hit in the turret
- **AND** the vehicle has no represented explosive ammo remaining
- **WHEN** the vehicle critical roll total is 11
- **THEN** the applied critical effect SHALL be `turret_destroyed`
- **AND** the event stream SHALL NOT emit an `AmmoExplosion` event.

#### Scenario: Crew hit counters alter repeated front criticals

- **GIVEN** a represented ground vehicle is critically hit in the front
- **AND** the driver has already taken a represented hit
- **WHEN** the vehicle critical roll total is 6
- **THEN** the applied critical effect SHALL fall through to a crew-stun or
  crew-kill outcome instead of a duplicate driver hit.

#### Scenario: Rotor damage falls through when the VTOL is already immobile

- **GIVEN** a represented VTOL is critically hit in the rotor
- **AND** the VTOL is already immobilized
- **WHEN** the vehicle critical roll total is 6
- **THEN** the resolver SHALL skip `rotor_damage`
- **AND** the applied critical effect SHALL fall through to the next available
  rotor-table result.

#### Scenario: Unrepresented equipment availability remains optimistic

- **GIVEN** the current session state does not represent target vehicle weapon,
  cargo, or stabilizer inventory availability
- **WHEN** a vehicle critical result depends on that unrepresented inventory
- **THEN** the resolver SHALL preserve the existing optimistic table behavior
  unless a caller supplies explicit availability context.

### Requirement: Vehicle Critical Target Equipment Availability

Committed vehicle critical resolution SHALL use represented target vehicle
equipment availability when selecting availability-sensitive critical effects.
When target equipment availability is unknown, the resolver SHALL preserve the
existing optimistic table behavior rather than inventing absence.

#### Scenario: Adapted vehicle weapons seed critical availability

- **GIVEN** a represented vehicle enters a session with adapted weapons carrying
  vehicle mount locations
- **WHEN** the session unit bindings are created
- **THEN** the vehicle unit SHALL carry critical availability metadata listing
  the locations with represented weapon mounts
- **AND** the metadata SHALL separately list represented locations with live
  weapons available for weapon-jam and weapon-destroyed critical entries.

#### Scenario: Missing target weapon location falls through weapon criticals

- **GIVEN** a represented vehicle is critically hit in the front
- **AND** target availability metadata proves there is no mounted weapon at the
  front location
- **WHEN** the vehicle critical roll total selects a front weapon critical
- **THEN** the resolver SHALL skip weapon-jam, weapon-destroyed, and stabilizer
  outcomes that require a weapon at that location
- **AND** the committed event stream SHALL emit the next available critical
  effect selected by the struck-location fallthrough table.

#### Scenario: Explicit cargo absence falls through cargo criticals

- **GIVEN** a represented vehicle is critically hit in a location whose table can
  select `cargo_hit`
- **AND** target availability metadata explicitly says no cargo is loaded
- **WHEN** the vehicle critical roll total selects `cargo_hit`
- **THEN** the resolver SHALL skip `cargo_hit`
- **AND** the resolver SHALL continue through the same struck-location
  fallthrough table.

#### Scenario: Unknown equipment state remains optimistic

- **GIVEN** a represented vehicle has no target equipment availability metadata
- **WHEN** a vehicle critical entry depends on weapon, cargo, or stabilizer
  availability
- **THEN** the resolver SHALL preserve legacy optimistic behavior for that entry.

### Requirement: Vehicle Critical Stabilizer Mount Presence

Committed vehicle critical resolution SHALL distinguish represented weapon mount
presence from represented live weapon availability when selecting Tank / VTOL
location-sensitive critical results.

#### Scenario: Unavailable mounted weapon still allows stabilizer critical

- **GIVEN** a represented vehicle target has a weapon mounted at the struck
  location
- **AND** the same target has no represented jammable or destroyable weapon
  available at that location
- **WHEN** the vehicle critical table falls through from a weapon entry to a
  stabilizer entry for that location
- **THEN** committed vehicle critical resolution SHALL keep the stabilizer
  result available
- **AND** the weapon-jam and weapon-destroyed entries SHALL remain unavailable.

#### Scenario: No mounted weapon skips stabilizer critical

- **GIVEN** target metadata proves the struck vehicle location has no mounted
  weapon
- **WHEN** the vehicle critical table reaches a stabilizer entry for that
  location
- **THEN** committed vehicle critical resolution SHALL skip the stabilizer result
  and continue fallthrough to the next eligible critical result.

### Requirement: Runtime Vehicle Critical Equipment State

Committed vehicle critical resolution SHALL use represented runtime target
equipment state from prior vehicle critical events when selecting later
availability-sensitive vehicle critical results.

#### Scenario: Prior weapon destruction reduces live weapon availability

- **GIVEN** a represented vehicle target has one known live weapon at the struck
  location
- **AND** a prior committed vehicle critical destroyed a weapon at that location
- **WHEN** a later vehicle critical roll reaches a weapon-jam or
  weapon-destroyed entry for the same location
- **THEN** committed vehicle critical resolution SHALL treat that live weapon as
  unavailable for weapon-jam and weapon-destroyed selection
- **AND** mounted weapon presence SHALL remain available for stabilizer
  selection at that location.

#### Scenario: Prior stabilizer hit falls through later stabilizer entries

- **GIVEN** a represented vehicle target has already resolved a stabilizer
  critical at a struck location
- **WHEN** a later vehicle critical roll reaches a stabilizer entry for that
  same location
- **THEN** committed vehicle critical resolution SHALL skip the stabilizer entry
  and continue through the struck-location fallthrough table.

#### Scenario: Unknown weapon counts remain optimistic

- **GIVEN** a represented vehicle target has location-level weapon availability
  but no represented count of live weapons at that location
- **WHEN** a prior vehicle weapon critical exists at the same location
- **THEN** committed vehicle critical resolution SHALL NOT infer that all live
  weapons at that location are unavailable.

### Requirement: Integrated Combat Projection Agreement

Combat projection SHALL represent the same target legality, range band, firing
arc, selected-weapon applicability, LOS/visibility state, cover, and represented
environmental restrictions that committed attack validation and resolution will
enforce.

#### Scenario: Represented attacks stay preview/commit aligned

- **GIVEN** a selected unit previews weapon or physical attacks on the tactical
  map
- **WHEN** the projection marks a target legal, blocked, out of range, out of
  arc, hidden, covered, or restricted by represented terrain/environment state
- **THEN** committing the unchanged attack SHALL use the same range, arc, LOS,
  cover, weapon, and to-hit context
- **AND** rejected attacks SHALL surface the same typed reason the preview
  exposed before commit.

### Requirement: Damage Application Events

Damage caused by runtime movement consequences SHALL use the same
`DamageApplied` replay/reducer event shape as weapon and physical-attack damage,
while preserving the phase in which the consequence occurred.

#### Scenario: Movement consequence damage carries movement phase

- **GIVEN** a movement-phase runtime command produces armor/internal damage
- **WHEN** that damage is emitted as `DamageApplied`
- **THEN** the event SHALL carry `phase: GamePhase.Movement`
- **AND** replaying the event SHALL update the target unit's armor, structure,
  and phase-damage counters through the standard reducer.

### Requirement: Destruction Lifecycle Events

Damage caused by runtime movement consequences SHALL fan out through the same
destruction lifecycle event vocabulary as weapon and physical-attack damage.

#### Scenario: Movement consequence damage destroys a location

- **GIVEN** a movement-phase runtime consequence applies damage through
  `DamageApplied`
- **WHEN** that damage destroys a location
- **THEN** the event stream SHALL append a movement-phase `LocationDestroyed`
  event for that location
- **AND** any normal transfer overflow SHALL append a movement-phase
  `TransferDamage` event.

#### Scenario: Movement consequence damage destroys the unit

- **GIVEN** a movement-phase runtime consequence applies fall damage
- **WHEN** the damage resolver marks the unit destroyed
- **THEN** the event stream SHALL append a movement-phase `UnitDestroyed`
  event before later pilot-hit consequence events.

### Requirement: Movement Consequence Critical Events

Structure-exposing damage caused by runtime movement consequences SHALL resolve
critical-hit follow-through through the same shared damage/critical resolver as
weapon and physical-attack damage.

#### Scenario: AirMek landing crash damage triggers a critical hit

- **GIVEN** a failed AirMek landing-control check applies fall cluster damage
  during movement phase
- **AND** that cluster exposes internal structure without destroying the hit
  location
- **WHEN** the critical-hit roll succeeds
- **THEN** the event stream SHALL append movement-phase `CriticalHit`,
  `CriticalHitResolved`, and `ComponentDestroyed` events in causal order after
  the matching `DamageApplied`
- **AND** the target unit state SHALL replay the resolved component damage.

#### Scenario: AirMek landing crash critical destroys the unit

- **GIVEN** movement-phase AirMek landing crash damage triggers a critical
  cascade that destroys the unit
- **WHEN** the critical stream emits `UnitDestroyed`
- **THEN** the runtime movement command SHALL emit exactly one movement-phase
  `UnitDestroyed` event for that critical destruction.

### Requirement: BattleMech Combat Validation Catalog

Combat resolution SHALL maintain a catalog-driven validation suite that enumerates every BattleMech combat action, modifier, legality gate, source-truth reference, executable test surface, and unsupported gap. Catalog rows SHALL classify support as `integrated`, `helper-only`, `unsupported`, or `out-of-scope`, and unresolved `helper-only` / `unsupported` rows SHALL remain visible until an implementation and executable evidence exist.

#### Scenario: Unsupported mechanics stay explicit

- **GIVEN** a combat mechanic is known from source-truth rules but is not implemented
- **WHEN** the validation catalog is generated or contract-tested
- **THEN** the mechanic SHALL appear as `unsupported`
- **AND** the catalog SHALL include a concise reason or follow-up label
- **AND** the mechanic SHALL NOT be omitted from the suite
- **AND** helper-only and unsupported rows SHALL remain queryable as a machine-readable unresolved completion-blocker inventory
- **AND** the unresolved inventory SHALL expose stable catalog refs, support levels, evidence, gap text, and row-level source references outside test-local helper code
- **AND** combat validation tooling SHALL expose the unresolved inventory through a named command suitable for review and PR gates
- **AND** the combat validation gate SHALL assert the reviewed unresolved-summary baseline by total, support level, leaf/aggregate scope, and catalog section so unreviewed gap drift fails the suite without treating explicitly tracked gaps as implemented
- **AND** source-pinned non-BattleMech and non-combat control-plane rows SHALL be queryable as `out-of-scope` audit evidence through combat validation tooling without counting as BattleMech unresolved completion blockers

#### Scenario: Integrated mechanics require executable evidence

- **GIVEN** a combat mechanic is marked `integrated`
- **WHEN** the catalog contract tests run
- **THEN** the row SHALL reference executable tests or source support
- **AND** the referenced tests SHALL validate behavior through the narrowest helper and at least one higher-level combat path when that path exists

#### Scenario: Catalog maps declare source-boundary and executable test evidence

- **GIVEN** a combat validation support map catalogs one or more BattleMech combat mechanics
- **WHEN** the aggregate catalog contract tests run
- **THEN** the support map SHALL declare whether its source authority boundary is row-level source references, requirement-primary-authority inheritance, or a MekStation deviation boundary
- **AND** every map with integrated rows SHALL cite executable test files and the assertion surface those tests protect
- **AND** every indexed support row SHALL carry row-level source references, including MekStation product-boundary rows and unsupported gap rows
- **AND** maps that claim row-level source-reference authority SHALL fail contract validation if any row lacks structured `sourceRefs`
- **AND** MegaMek and MekHQ row references SHALL be commit-pinned and line-anchored
- **AND** MekStation deviation row references SHALL be line-anchored
- **AND** this map-level triad evidence SHALL NOT be treated as full row-level rule parity for mechanics that still rely on requirement inheritance or MekStation deviation boundaries

### Requirement: Diff-Area Outcome Traceability

Every implementation area touched by the BattleMech combat validation suite SHALL have a high-level expected outcome recorded in the OpenSpec change before that area is presented for review. The outcome text SHALL connect the code area to one of the three validation lanes: catalog contracts, behavior-class tests, or representative runner-vs-interactive integration scenarios.

#### Scenario: OpenSpec and audit files describe review outcomes

- **GIVEN** a combat feature slice changes `openspec/` or `docs/audits/`
- **WHEN** reviewers inspect the change
- **THEN** the files SHALL state the intended combat outcome, the source-truth authority boundary, and any unsupported gaps that remain visible
- **AND** detailed rule rows SHALL not be the only place where the feature's review purpose can be inferred

#### Scenario: Runner and catalog files describe quick-sim outcomes

- **GIVEN** a combat feature slice changes `src/simulation/runner/`
- **WHEN** the runner catalog and behavior tests execute
- **THEN** official weapon, ammo, critical-slot, equipment, movement, heat, physical, PSR, lifecycle, and terminal-state data SHALL hydrate from catalog or event state before use
- **AND** static weapon defaults, synthetic Medium Laser fallbacks, zero-damage string parsing, and broad known-limitation suppression SHALL remain explicit validation traps
- **AND** every integrated runner outcome SHALL cite executable catalog or behavior evidence

#### Scenario: Gameplay helper and interactive engine files describe shared behavior outcomes

- **GIVEN** a combat feature slice changes `src/utils/gameplay/` or `src/engine/`
- **WHEN** helper, event-sourced session, and interactive-engine paths are reviewed
- **THEN** legality checks, invalid attack no-side-effect guarantees, targetability, action locking, heat, PSR, damage, physical resolution, and terminal-state transitions SHALL match the cataloged behavior class
- **AND** any runner-only or helper-only behavior SHALL remain classified as partial or unsupported until a higher-level path proves the same outcome

#### Scenario: UI, wire, multiplayer, and type files describe action-boundary outcomes

- **GIVEN** a combat feature slice changes `src/components/gameplay/`, `src/lib/p2p/`, `src/lib/multiplayer/`, `src/types/gameplay/`, or `src/types/multiplayer/`
- **WHEN** action-surface and event-payload coverage is reviewed
- **THEN** the spec SHALL state which command, game intent, wire payload, P2P host translation, server dispatch, replay event, or type payload is expected to preserve the combat action outcome
- **AND** product-visible commands without official rule authority SHALL be cataloged as MekStation deviation or unsupported rows instead of implied BattleTech parity

#### Scenario: AI, scenario, and validation tooling files describe evidence outcomes

- **GIVEN** a combat feature slice changes AI selection, representative scenarios, or `scripts/validate-combat-suite.mjs`
- **WHEN** the validation suite is run
- **THEN** AI and scenario tests SHALL prove hydrated combat state is consumed for weapon ranges, ammo, arcs, movement state, physical legality, lifecycle status, objectives, and terminal outcomes
- **AND** validation tooling SHALL continue to execute catalog contracts, behavior-class tests, and representative integration scenarios as separate evidence lanes

#### Scenario: Destruction cause persists through combat state and replay

- **GIVEN** a BattleMech damage path reports `unitDestroyed=true` with a canonical destruction cause
- **WHEN** runner state snapshots apply that result or event replay applies the corresponding `UnitDestroyed` event
- **THEN** `IUnitGameState.destroyed` SHALL be true
- **AND** `IUnitGameState.destructionCause` SHALL preserve the same canonical cause
- **AND** ammo-explosion cascades SHALL be able to override generic damage destruction with `ammo_explosion`
- **AND** this persistence SHALL be cataloged as a MekStation lifecycle contract rather than an external rulebook claim

#### Scenario: Fatal head and center-torso destruction use cause-specific terminal labels

- **GIVEN** a BattleMech damage path destroys the head location without reaching lethal pilot wounds
- **WHEN** the damage pipeline checks unit destruction
- **THEN** the terminal cause SHALL be `head_destroyed`
- **AND** runner snapshots and `UnitDestroyed` events SHALL preserve `head_destroyed`
- **GIVEN** a BattleMech damage path destroys the center torso location
- **WHEN** the damage pipeline checks unit destruction
- **THEN** the terminal cause SHALL be `ct_destroyed`
- **AND** runner snapshots and `UnitDestroyed` events SHALL preserve `ct_destroyed`
- **AND** lethal pilot wounds SHALL still take priority as `pilot_death`

#### Scenario: Shutdown stays outside UnitDestroyed cause taxonomy

- **GIVEN** a BattleMech overheats into avoidable or automatic shutdown
- **WHEN** the heat lifecycle persists shutdown state
- **THEN** the unit SHALL leave normal action rotation through shutdown lifecycle support
- **AND** the engine SHALL NOT emit `UnitDestroyed` with `cause: 'shutdown'`
- **AND** the canonical `UnitDestroyed.cause` and damage `destructionCause` unions SHALL exclude `shutdown`
- **AND** destruction-cause catalog coverage SHALL not carry a helper-only shutdown row

#### Scenario: Missing action surfaces stay visible

- **GIVEN** a BattleMech action surface has source-backed or product-visible relevance but no authoritative command, game intent, wire payload, P2P translation, or runner action path
- **WHEN** the action support catalog is contract-tested
- **THEN** optional TacOps sprint and evade movement SHALL appear as integrated tactical command rows when their command, intent, wire, P2P, movement, heat, and state paths exist
- **AND** the sprint row SHALL cite MegaMek source anchors for optional TacOps sprint availability, BattleMech sprint MP, MASC/Supercharger sprint formulas, sprint heat, attacker-sprinted firing failure, target-sprinted to-hit relief, and sprinting spotter rejection
- **AND** the evade row SHALL cite MegaMek source anchors for optional TacOps evade availability, evasion state, evasion heat, attacker-evading firing restrictions, and target-evading to-hit modifiers
- **AND** product-visible MekStation command surfaces without identified BattleMech rule authority, including `movement.stabilize`, SHALL stay in `COMBAT_COMMAND_ACTION_SUPPORT` as `out-of-scope` `mekstation-deviation` rows rather than absent official action rows or BattleMech completion blockers
- **AND** integrated movement tactical command rows, including walk, run, sprint, evade, jump, stand, go-prone, MASC activation, and Supercharger activation, SHALL cite the MekStation command factory that exposes the movement surface
- **AND** utility tactical command rows, including eject, concede, withdraw, and request-spot, SHALL cite the MekStation command factory that exposes the utility surface
- **AND** weapon tactical command rows, including the fire-volley attack commit surface, SHALL cite the MekStation command factory that exposes the weapon surface
- **AND** facing tactical command rows, including chassis rotation and torso twist surfaces, SHALL cite the MekStation command factory that exposes the facing surface
- **AND** physical tactical command rows, including punch, kick, push, charge, death from above, and melee weapon surfaces, SHALL cite the MekStation command factory that exposes the physical attack surface
- **AND** heat/end tactical command rows, including heat continue, end phase, and next turn, SHALL cite the MekStation command factory that exposes the phase-control surface
- **AND** request-spot command rows SHALL cite the MekStation command factory that exposes the local surface, MegaMek `SpotAction` source anchors, and SHALL be integrated once the command preserves active/target ids, emits `SpottingDeclared`, latches `isSpotting` plus `spotTargetId`, locks the spotting unit, clears spotting on turn/movement reset, maps `requestSpot` to `RequestSpot`, dispatches through server and P2P paths, and applies the source-backed +1 spotting attacker penalty to ranged and physical attacks
- **AND** request-spot coverage SHALL document that the active command-console exception remains unmodeled until command-console state is hydrated into MekStation combat state
- **AND** local draft/reset and superseded command-shell rows, including movement cancel, weapon draft declaration/clear, and the edge-less withdraw shortcut, SHALL cite the MekStation command factory as `out-of-scope` UI shell rows outside official BattleMech combat action handling
- **AND** direct UI action rows, including withdrawal edge selection, SHALL cite the MekStation component that exposes the direct action surface
- **AND** every game-intent action row SHALL cite the MekStation game-intent mapper that constructs or maps the local intent to its server wire payload
- **AND** every wire-intent action row SHALL cite the MekStation server dispatcher, with lobby and reconnect wire intents remaining `out-of-scope` non-combat scope splits
- **AND** every P2P intent translation row SHALL cite the MekStation intent translator, plus host-router source anchors for host-owned command translations
- **AND** P2P phase-advance, movement, and weapon-attack rows SHALL prove the host revalidates or rebuilds combat state from authoritative host data instead of trusting guest-supplied phase events, movement MP/heat/path, to-hit numbers, or weapon stats
- **AND** `physicalAttackCommands` catalog rows SHALL enforce row-level MekStation command source references before PR approval
- **AND** GM command exclusion rows SHALL cite the MekStation GM/referee command factory as `out-of-scope` control-plane rows and SHALL remain outside player BattleMech combat action handling
- **AND** those rows SHALL NOT be inferred from helper prose or omitted because no UI command currently emits them

#### Scenario: Torso twist emits source-backed secondary facing through command and wire paths

- **GIVEN** a BattleMech commits torso twist during the weapon-attack phase through local tactical commands, game intent, wire intent, P2P host command translation, or server dispatch
- **WHEN** the action and movement rule catalogs are contract-tested
- **THEN** `facing.torso-twist`, `torsoTwist`, and `TorsoTwist` rows SHALL cite MegaMek source anchors for `TorsoTwistAction`, secondary-facing persistence, BattleMech twist legality, extended/no-twist quirk boundaries, and secondary-facing arc consumption
- **AND** the action SHALL reject non-weapon-attack phases, inactive or terminal units, non-BattleMech units, prone units, bracing units, already-twisted units, `no_twist` units, and twist distances beyond one hexside unless `ext_twist` allows two
- **AND** successful torso twist SHALL emit replayable `FacingChanged` secondary-facing state
- **AND** event-sourced secondary facing SHALL feed replay, AI weapon-arc filtering, runner secondary-target front-arc math, game intent, wire intent, P2P translation, and server dispatch paths

#### Scenario: Core movement rule rows stay source-backed

- **GIVEN** the movement rule catalog covers walk, run, jump, stand, voluntary go-prone, facing, occupancy, elevation, heat MP penalties, and torso twist
- **WHEN** the aggregate catalog triad and BattleMech combat catalog contract tests run
- **THEN** every integrated or helper-only movement rule row SHALL carry structured MegaMek source references with commit-pinned URLs and line anchors
- **AND** the aggregate catalog triad for `movementRules` SHALL require row-level source references rather than inherited requirement authority
- **AND** ground movement validation SHALL include path-alignment and terminal facing-change MP in addition to path and terrain costs so same-hex, bent-path, and moved-then-turned facings are all validated as movement spend
- **AND** helper-only movement rows SHALL keep their remaining runtime gaps explicit instead of treating source-backed row evidence as complete parity

#### Scenario: Voluntary go-prone emits source-backed movement step

- **GIVEN** MegaMek defines voluntary go-prone as `MoveStepType.GO_PRONE` for standing Meks
- **WHEN** a unit commits the go-prone movement command through local, wire, P2P command routing, or an opt-in runner AI movement decision
- **THEN** the action SHALL emit a same-hex `MovementDeclared` payload with a `goProne` step, `mpUsed: 1`, `heatGenerated: 0`, and `hexesMoved: 0`
- **AND** the reducer SHALL mark the unit prone and lock its movement activation
- **AND** runner movement SHALL preserve the same `goProne` step when the AI chooses the opt-in stationary go-prone posture
- **AND** explicit non-Mek and already-prone units SHALL be rejected before emitting a go-prone movement declaration
- **AND** a hull-down go-prone transition SHALL cost 0 MP and clear `hullDown` when the reducer marks the unit prone
- **AND** BattleMech swarmer dislodge, enemy-occupied-start follow-up blocking, and explicit `infernoBurning` wash-off SHALL be represented without inferring coverage from Inferno ammo catalog rows
- **AND** broader tactical go-prone policy SHALL remain an explicit follow-up gap

#### Scenario: Movement booster activation emits replayable active state

- **GIVEN** a BattleMech has installed MASC or Supercharger equipment
- **WHEN** the unit commits the matching activation command through local, wire, or P2P command routing during movement
- **THEN** the action SHALL emit a `MovementEnhancementActivated` event for `MASC` or `Supercharger`
- **AND** the reducer SHALL mark `activeMASC` or `activeSupercharger` without locking movement activation
- **AND** later run movement validation SHALL consume the active booster state for boosted MP and failure-PSR handling

#### Scenario: Weapon catalog hygiene traps stay explicit

- **GIVEN** official ranged weapon validation relies on catalog hydration rather than legacy defaults
- **WHEN** the validation scope and requirement crosswalks are contract-tested
- **THEN** the static weapon database subset, synthetic Medium Laser fallback ban, and variable missile damage-string guard SHALL each appear as explicit integrated validation-scope rows
- **AND** every official string-damage missile weapon row SHALL be pinned to its resolved nonzero volley damage, including MML-style `1-2/missile` descriptors
- **AND** fallback-prevention and damage-string-hazards requirements SHALL reference those specific rows rather than relying only on broad official-catalog coverage
- **AND** every requirement crosswalk row SHALL carry row-level source references derived from its support-map refs, while preserving its explicit primary authority classification
- **AND** broad known-limitation filters SHALL remain banned from catalog validation gates
- **AND** every broad known-limitation category SHALL have a BattleMech validation trap proving the validation invariant bypass remains visible instead of filtered
- **AND** known-limitation filtering and partitioning helpers SHALL preserve BattleMech validation traps as potential bugs even when their text matches broad known-limitation patterns
- **AND** every validation-scope row for known-limitation bypasses, catalog filter gates, fallback guards, variable-damage parsing, and non-BattleMech scope splits SHALL carry anchored MekStation source references
- **AND** validation-scope non-BattleMech ammo and combat-system split rows SHALL remain `out-of-scope` audit evidence instead of unresolved BattleMech completion blockers
- **AND** the non-BattleMech objective requirement row SHALL remain `out-of-scope` until separate vehicle, aerospace, infantry, battle armor, and ProtoMech validation matrices exist

#### Scenario: Non-BattleMech event scope rows stay explicit

- **GIVEN** the BattleMech combat event support catalog partitions every `GameEventType`
- **WHEN** event-stream support is contract-tested
- **THEN** vehicle, VTOL, battle armor, swarm, leg-attack, mimetic, and stealth event rows SHALL remain `out-of-scope` non-BattleMech rows outside the BattleMech combat matrix
- **AND** each non-BattleMech event-scope row SHALL carry anchored MekStation source references to the event factory, payload, helper, or scenario surface that owns that non-BattleMech event family
- **AND** non-BattleMech event-scope rows SHALL be excluded from the unresolved BattleMech gap count while remaining available through the catalog's out-of-scope audit inventory

#### Scenario: BattleMech event stream rows stay source pinned

- **GIVEN** the BattleMech combat event support catalog lists lifecycle, phase, initiative, movement, attack, damage, heat, PSR, physical, objective, morale, retreat, withdrawal, and ejection event rows
- **WHEN** event-stream support is contract-tested
- **THEN** each BattleMech event-stream row SHALL carry anchored MekStation source references to the event factory, runner phase, session helper, reducer, test, or explicit unsupported enum boundary that owns that event contract
- **AND** broad event-stream triad prose SHALL NOT satisfy event coverage without row-level source references
- **AND** initiative resolution SHALL emit both the dice-bearing `InitiativeRolled` event and a replayable `InitiativeOrderSet` event that records the winning side, first mover, and second mover for turn-rotation replay
- **AND** weapon attack locking SHALL emit a public `AttacksRevealed` boundary after every active weapon-phase unit has locked attacks, replay that boundary into the `Revealed` lock state, and still allow phase advancement once all active units are locked, revealed, or resolved
- **AND** replayable `FacingChanged` secondary-facing events SHALL be integrated when torso twist is covered through tactical command, game intent, wire intent, P2P translation, server dispatch, session emission, replay, and runner arc-consumption evidence

#### Scenario: Ammo catalog compatibility traps stay explicit

- **GIVEN** official ammunition validation relies on `compatibleWeaponIds` to hydrate consumable BattleMech ammo bins
- **WHEN** the ammunition compatibility catalog is contract-tested
- **THEN** official ammo rows that hydrate consumable BattleMech ammo bins SHALL be pinned by exact id
- **AND** every compatible ammo row SHALL initialize an ammo bin, report total rounds, and consume through combat ammo tracking for each referenced official weapon id
- **AND** source-backed Improved Autocannon ammunition rows SHALL name their matching official Improved Autocannon weapon ids before they are counted as consumable BattleMech ammo
- **AND** source-backed LB 2-X cluster ammunition SHALL name the matching Inner Sphere and Clan LB 2-X AC weapon ids before it is counted as consumable BattleMech ammo
- **AND** official ammo rows that duplicate weapon runtime ids SHALL be pinned by exact id and classified before compatibility checks
- **AND** standard or advanced official ammo rows with no compatible weapon references SHALL be pinned by exact id as explicit BattleMech ammo gaps before any generic missing-compatible bucket can be treated as empty
- **AND** exact official RAC/10 and RAC/20 ammo rows with no official matching BattleMech weapon refs SHALL remain represented as non-consumable catalog rows that SHALL NOT hydrate runtime ammo bins through ammo-id, alias, static BV, or unofficial weapon-class fallback
- **AND** aerospace/capital, battle armor, ProtoMech, ProtoMech proto machine-gun, aquatic torpedo, and artillery ammo rows SHALL be pinned by exact id as `out-of-scope` separate validation-matrix scope splits
- **AND** those non-BattleMech ammo scope splits SHALL be excluded from the unresolved BattleMech gap count while remaining available through the catalog's out-of-scope audit inventory
- **AND** remaining experimental or unofficial BattleMech-family official ammo rows with no compatible weapon references SHALL be pinned by exact id as out-of-scope separate validation-matrix scope splits
- **AND** every ammunition compatibility support row SHALL carry structured row-level source references to the official ammo catalog import list, ammo hydration or tracking path, and exact-id classification contract
- **AND** the ammunition compatibility catalog triad SHALL enforce row-level source references before PR approval
- **AND** remaining no-compatible-reference rows SHALL NOT be counted as consumable BattleMech ammunition until catalog data supplies unambiguous compatible weapon references

#### Scenario: Range bracket rows stay source-backed

- **GIVEN** the range bracket catalog covers short, medium, long, extreme, and out-of-range attack boundaries
- **WHEN** the aggregate catalog triad and BattleMech combat catalog contract tests run
- **THEN** every integrated range bracket row SHALL carry structured MegaMek source references with commit-pinned URLs and line anchors
- **AND** the minimum-range to-hit modifier row SHALL carry structured MegaMek source references for its close-range penalty formula
- **AND** the aggregate catalog triad for `rangeBrackets` SHALL require row-level source references rather than inherited requirement authority
- **AND** out-of-range attacks SHALL remain invalidation coverage instead of being treated as a normal declared attack range

#### Scenario: Ranged to-hit modifier rows stay source-backed

- **GIVEN** the ranged to-hit modifier catalog covers gunnery, range, minimum range, attacker movement, target movement, target evasion, heat, environmental conditions, partial cover, target prone/immobile state, indirect fire, pilot wounds, sensor damage, actuator damage, attacker prone state, hull-down, secondary targets, called shots, ECM, C3, terrain features, and physical-DFA to-hit boundaries
- **WHEN** the aggregate catalog triad and BattleMech combat catalog contract tests run
- **THEN** every integrated or helper-only to-hit modifier row SHALL carry structured MegaMek source references with commit-pinned URLs and line anchors
- **AND** the aggregate catalog triad for `toHitModifiers` SHALL require row-level source references rather than inherited requirement authority
- **AND** the integrated ECM row SHALL describe source-backed guidance suppression and no generic ECM to-hit penalty across Artemis, NARC/iNARC Homing, semi-guided TAG, and C3 paths
- **AND** helper-only modifier rows such as C3 equipment network formation SHALL keep their runtime gaps explicit instead of treating source-backed row evidence as complete parity

#### Scenario: Ranged invalid target-state rows stay source-backed

- **GIVEN** the ranged invalidation catalog covers missing, destroyed, same-side, retreated, and ejected target states
- **WHEN** the aggregate catalog triad and attack-invalidation catalog contract tests run
- **THEN** every invalid target-state row SHALL carry structured MegaMek source references with commit-pinned URLs and line anchors
- **AND** the aggregate catalog triad for `invalidTargetStates` SHALL require row-level source references rather than inherited requirement authority
- **AND** MekStation lifecycle targetability removal SHALL stay visible as executable product evidence layered over the MegaMek targetability/removal source boundary

#### Scenario: Ranged invalidation reason rows stay source-backed or explicitly deviated

- **GIVEN** the attack invalidation catalog covers out-of-ammo, same-hex, out-of-range, no-LOS, invalid target, attacker-evading, unknown weapon, destroyed weapon, and jammed weapon reasons
- **WHEN** the aggregate catalog triad and attack-invalidation catalog contract tests run
- **THEN** every AttackInvalid reason row SHALL carry structured source references with line anchors
- **AND** MegaMek-backed rows SHALL use commit-pinned MegaMek source references
- **AND** local event-shape rows such as `SameHex` SHALL identify their MekStation-deviation boundary instead of inheriting generic invalidation authority
- **AND** the aggregate catalog triad for `attackReasons` SHALL require row-level source references rather than inherited requirement authority

#### Scenario: Evading attackers cannot make ranged attacks

- **GIVEN** a unit has explicit `isEvading: true`
- **WHEN** that unit attempts a ranged weapon attack through runner attack resolution or event-sourced `declareAttack`
- **THEN** the attack SHALL emit `AttackInvalid` with reason `AttackerEvading`
- **AND** no `AttackDeclared`, `AttackResolved`, heat, ammo, damage, or fired-weapon state side effects SHALL follow

#### Scenario: TacOps Evade movement declares a source-backed run-based action

- **GIVEN** a unit declares `MovementType.Evade` through the movement command, game intent, wire intent, P2P host translation, interactive reducer, or runner movement phase
- **WHEN** movement validation and movement event creation resolve the action
- **THEN** the action SHALL use the unit's unboosted run MP envelope, run pathing, and run animation mode
- **AND** the action SHALL generate source-backed BattleMech evade movement heat of `4`
- **AND** the action SHALL set authoritative current-turn `isEvading: true` and default `evasionBonus: 1` state for attack invalidation, target evasion modifiers, and spotter rejection
- **AND** active MASC or Supercharger SHALL NOT extend the Evade movement envelope
- **AND** turn reset SHALL clear Evade current-turn state before the next unit action cycle
- **AND** the legacy local `evasive` SPA row SHALL remain out-of-scope so TacOps Evade action coverage is not counted as an unresolved pilot-ability blocker

#### Scenario: Sprinting attackers cannot make ranged attacks

- **GIVEN** a unit has explicit `sprintedThisTurn: true`
- **WHEN** that unit attempts a ranged weapon attack through runner attack resolution or event-sourced `declareAttack`
- **THEN** the attack SHALL emit `AttackInvalid` with reason `AttackerSprinted`
- **AND** no `AttackDeclared`, `AttackResolved`, heat, ammo, damage, or fired-weapon state side effects SHALL follow
- **AND** declared TacOps Sprint movement SHALL be one source-backed creator of that current-turn state
- **AND** engine-variant/coolant sprint heat SHALL remain a visible heat-rule gap until source-backed engine-state hydration exists

#### Scenario: TacOps Sprint declares movement state

- **GIVEN** a BattleMech declares `MovementType.Sprint` through movement UI, game intent, wire, P2P, interactive, or runner movement paths
- **WHEN** movement validation computes its envelope and commits the movement
- **THEN** base Sprint MP SHALL be `walkMP * 2`
- **AND** one active MASC or Supercharger SHALL validate Sprint MP against `ceil(walkMP * 2.5)`
- **AND** active MASC plus active Supercharger SHALL validate Sprint MP against `walkMP * 3`
- **AND** Sprint SHALL use run-based terrain/pathing/PSR behavior and queue active MASC/Supercharger failure PSRs when boosters are used
- **AND** the committed movement SHALL create current-turn `sprintedThisTurn: true`, `movementThisTurn: MovementType.Sprint`, normal-engine sprint heat `+3`, and a run-mode movement animation payload
- **AND** engine-variant/coolant sprint heat SHALL remain a visible heat-rule gap until source-backed engine-state hydration exists

#### Scenario: Sprinting and evading units cannot spot indirect fire

- **GIVEN** an indirect-capable ranged attack has no attacker-to-target line of sight
- **AND** the only friendly spotter candidates with target line of sight have explicit `sprintedThisTurn: true`, `isEvading: true`, `movementType: MovementType.Sprint`, or `movementType: MovementType.Evade`
- **WHEN** the runner or interactive indirect-fire context elects a LOS spotter
- **THEN** those candidates SHALL be rejected before spotter election
- **AND** the attack SHALL continue through the normal no-spotter `NoLineOfSight` invalidation path without heat, ammo, fired-weapon, or damage side effects

#### Scenario: Sprint state and Evade movement generate movement heat

- **GIVEN** a unit has explicit `sprintedThisTurn: true`, declared `MovementType.Sprint`, or declared `MovementType.Evade`
- **WHEN** runner heat resolution computes movement heat
- **THEN** explicit sprint state and declared Sprint movement SHALL generate normal-engine sprint heat
- **AND** Evade movement SHALL generate run heat plus the source-backed evasion heat surcharge
- **AND** engine-variant/coolant sprint heat SHALL remain a visible heat-rule gap until source-backed engine-state hydration exists

#### Scenario: Evading targets modify ranged to-hit

- **GIVEN** a ranged attack targets a unit with explicit `isEvading: true`
- **WHEN** helper to-hit calculation, event-sourced `declareAttack`, or runner attack resolution builds the `AttackDeclared` to-hit payload
- **THEN** the attack SHALL include a `Target Evasion` to-hit modifier of `+1`
- **AND** explicit `evasionBonus` values SHALL be consumed as a source-backed Skilled Evasion bonus from `0` through `3`, where `0` suppresses the modifier without clearing evasion
- **AND** prone evading targets SHALL not receive the target-evasion modifier
- **AND** declared Evade movement SHALL create the default `+1` target-evasion state, while explicit `evasionBonus` state remains the source-backed hook for optional Skilled Evasion scaling

#### Scenario: Sprinting targets modify ranged to-hit

- **GIVEN** a ranged attack targets a unit with explicit `sprintedThisTurn: true`
- **WHEN** helper to-hit calculation, event-sourced `declareAttack`, or runner attack resolution builds the `AttackDeclared` to-hit payload
- **THEN** the attack SHALL include a `Target Sprinted` to-hit modifier of `-1`
- **AND** runner turn reset SHALL clear `sprintedThisTurn` so the target-sprinted modifier is current-turn state
- **AND** declared TacOps Sprint movement SHALL be one source-backed creator of that current-turn state
- **AND** engine-variant/coolant sprint heat SHALL remain a visible heat-rule gap until source-backed engine-state hydration exists

#### Scenario: Evading targets modify physical to-hit

- **GIVEN** a physical attack targets a unit with explicit `isEvading: true`
- **WHEN** helper physical to-hit calculation, event-sourced `declarePhysicalAttack` or physical resolution, or runner physical resolution builds the physical attack to-hit number
- **THEN** the physical attack SHALL apply a `Target Evasion` to-hit modifier of `+1`
- **AND** explicit `evasionBonus` values SHALL be consumed as a source-backed Skilled Evasion bonus from `0` through `3`, where `0` suppresses the modifier without clearing evasion
- **AND** prone evading physical targets SHALL not receive the target-evasion modifier
- **AND** declared Evade movement SHALL create the default `+1` target-evasion state, while explicit `evasionBonus` state remains the source-backed hook for optional Skilled Evasion scaling

#### Scenario: Invalid ranged attack side-effect guards stay source-backed as MekStation contracts

- **GIVEN** the attack invalidation catalog covers no `AttackDeclared`, no `AttackResolved`, no heat, no ammo, no damage, and no fired-weapon state side effects
- **WHEN** the aggregate catalog triad and attack-invalidation catalog contract tests run
- **THEN** every invalid attack side-effect row SHALL carry structured MekStation source references with line anchors
- **AND** the source references SHALL point to the invalidation gates and the event/state mutation boundaries they must not reach
- **AND** the aggregate catalog triad for `invalidAttackSideEffects` SHALL require row-level source references rather than inherited requirement authority

#### Scenario: Physical damage modifier rows stay source-backed

- **GIVEN** the physical damage modifier catalog covers active TSM, claws, talons, and underwater physical damage
- **WHEN** the aggregate catalog triad and BattleMech combat catalog contract tests run
- **THEN** every integrated or helper-only physical damage modifier row SHALL carry structured MegaMek source references with commit-pinned URLs and line anchors
- **AND** core claw punch and talon kick/DFA damage modifier rows SHALL be integrated only when their source-backed damage, to-hit, option-rule, hydration, critical-event cleanup, destroyed-location replay, and runner/session consumption paths are represented
- **AND** physical critical manifests that explicitly carry missing/breached Claw or Talons equipment SHALL skip those source-unavailable slots during critical selection, emit Physical Attack `CriticalHitResolved` lifecycle cleanup only when matching represented modifier state is active, and avoid `ComponentDestroyed` for missing/breached cleanup
- **AND** separate helper-only claw and talon equipment-lifecycle rows SHALL keep remaining automatic damaged-equipment state creation, full source authoring/hydration, and claw club-with-hand interaction gaps explicit instead of treating source-backed damage formulas or represented manifest cleanup as full physical-weapon lifecycle parity
- **AND** the aggregate catalog triad for `physicalDamageModifiers` SHALL require row-level source references rather than inherited requirement authority

#### Scenario: AMS family boundary splits represented behavior from residual mechanics

- **GIVEN** AMS behavior is represented by automatic interception assignment, projectile reduction, mounted-arc enforcement when `mountingArc` state is available, canonical `isRearMounted` equipment hydration into Front/Rear `mountingArc` state, Streak/all-shots-hit cluster parity, single-missile interception, standard single-use exclusion, explicit `amsMultiUse` or `PLAYTEST_3` reuse when state is already authored, ammo/heat/fired lifecycle, and interception-event rows
- **WHEN** the special weapon catalog rows are contract-tested
- **THEN** the AMS family row and AMS mechanic rows SHALL cite MegaMek source anchors for assignment, defender choice, arc checks, cluster-table reduction, single-missile interception, ammo/heat usage, represented standard single-use lifecycle, and optional multi-use lifecycle
- **AND** the AMS family row SHALL be integrated only when the represented runner/session behavior above is covered by focused tests and source refs
- **AND** replayable `AttackDeclared.selectedAMSWeaponIds` selections SHALL be preserved and consumed by runner missile interception when explicitly supplied
- **AND** ineligible explicit runner selected AMS ids SHALL not fall back to another automatic AMS mount and SHALL NOT consume defender AMS ammo, emit AMS interception events, or mark defender AMS fired
- **AND** replayable `AttackDeclared.selectedAMSWeaponMounts` snapshots SHALL be consumed by the event-sourced session resolver for selected defender AMS interception, defender ammo consumption, `AMSInterception` emission, and fired-state replay without falling back to automatic AMS when the selected snapshot is absent or illegal
- **AND** manual defender-selected AMS assignment SHALL expose `selectedAMSWeaponIds` through the interactive declaration surface, SHALL snapshot legal selected defender AMS mount metadata onto `AttackDeclared.selectedAMSWeaponMounts` before commit, and SHALL reject illegal non-missile, non-AMS, out-of-arc, already-fired, missing, destroyed, or no-ammo selected AMS ids with `AttackInvalid` before `AttackDeclared`
- **AND** optional AMS bay, multi-use, and `PLAYTEST_3` variant authoring SHALL remain visible under an explicit helper-only mechanic row until official catalog hydration, game-option authoring, runner/session declaration surfaces, supported bay or multi-mount modeling, heat/ammo/fired lifecycle, and behavior tests cover the full optional AMS variant set

#### Scenario: Special weapon family rows stay source-backed

- **GIVEN** the special weapon family catalog covers UAC, RAC, LB-X, Streak SRM, MML, NARC/iNARC, AMS, TAG, Artemis, and plasma-cannon family behavior
- **WHEN** the special weapon family support map is contract-tested
- **THEN** every integrated or helper-only special weapon family row SHALL carry structured MegaMek source references with commit-pinned URLs and line anchors
- **AND** official UAC, RAC, LB-X, and MML family ids SHALL be pinned exactly before their firing-mode support rows are treated as integrated
- **AND** damage-capable official Streak SRM ids SHALL be pinned separately from zero-damage Streak LRM/OS/prototype catalog rows before Streak support is treated as integrated
- **AND** zero-damage Streak LRM/OS/prototype rows SHALL remain catalog-visible data gaps instead of inheriting Streak SRM damage behavior by name match
- **AND** the official zero-damage Clan Plasma Cannon SHALL emit zero BattleMech damage plus external target heat from the source-backed 2d6 plasma roll when runner combat hits a heat-tracking BattleMech target
- **AND** the Clan Plasma Cannon SHALL halve external target heat through intact reflective or heat-dissipating armor when combat state includes armor-type data for the hit location
- **AND** the Clan Plasma Cannon SHALL follow source-backed `PLAYTEST_3` armor behavior where reflective armor no longer halves plasma heat and heat-dissipating armor receives zero plasma heat
- **AND** the Clan Plasma Cannon and Plasma Rifle SHALL hydrate official plasma ammunition bins from source-backed catalog ammo rows and consume those rounds during runner combat despite MegaMek energy weapon flags
- **AND** the Clan Plasma Cannon SHALL queue BattleMech target heat in a Heat Phase pending bucket, apply it as capped external Heat Phase heat, clear the pending bucket after application, and split non-Mek special damage plus terrain/building special damage paths into out-of-scope accounting for a separate matrix
- **AND** the NARC/iNARC family row SHALL be integrated once standard NARC markers, iNARC selected-ammo pod attachment, Homing guidance, Haywire to-hit, ECM flight-path/C3 disruption, Nemesis redirect, event replay, and marker lifecycle behavior are represented
- **AND** carrier-level attached iNARC pod Brush-Off removal SHALL be integrated only for the narrow runner lifecycle where successful Brush-Off against the pod carrier removes one attached pod
- **AND** represented iNARC explosive selected ammo SHALL resolve source-backed 6-point impact damage without attaching a marker, represented iNARC ECM pods SHALL affect tactical sensor-contact brackets when explicit sensor-check and sensor-range bracket state are present, typed iNARC `DesignatorMarkerApplied` event replay SHALL rehydrate Homing/ECM/Haywire/Nemesis pod state without falling back to standard NARC state, attached typed iNARC pod state SHALL persist across turn-reset cleanup, same-team/same-type iNARC pod target identity and helper-level equivalent-pod removal SHALL stay represented, carrier-level Brush-Off SHALL collapse same-team/same-type carrier pod options by source-backed iNARC target identity, carrier-level Brush-Off SHALL carry same-team/same-type selected pod identity from the interactive physical plan store/panel through declared/resolved events and replay, and the iNARC pod object lifecycle row SHALL be integrated for MegaMek-style carrier-attached pod target identity rather than kept as a residual unsupported mechanic
- **AND** producer-side iNARC C3 authoring SHALL be tracked outside the special-weapon helper blocker list as duplicate C3-network authoring scope, with C3 formation gaps kept under `ruleSupport.toHitModifiers.c3-equipment-network-formation`
- **AND** the aggregate catalog triad for `specialWeaponFamilies` SHALL require row-level source references rather than inherited requirement authority
- **AND** helper-only family rows SHALL keep their remaining runtime/session gaps explicit instead of treating source-backed family evidence as complete parity

#### Scenario: Special weapon mechanic rows stay source-backed

- **GIVEN** the special weapon mechanic catalog covers UAC, RAC, LB-X, Streak SRM, MML, NARC/iNARC, AMS, TAG, Artemis, ECM, active-probe, and stealth mechanics
- **WHEN** the special weapon mechanic support map is contract-tested
- **THEN** every integrated or helper-only special weapon mechanic row SHALL carry structured MegaMek source references with commit-pinned URLs and line anchors
- **AND** the aggregate catalog triad for `specialWeaponMechanics` SHALL require row-level source references rather than inherited requirement authority
- **AND** source-checked mechanic mismatches SHALL remain unsupported gaps or be removed from official combat surfaces instead of integrated parity claims
- **AND** the Artemis link-network lifecycle row SHALL keep mixed-kind, mismatched-count, or otherwise ambiguous multi-launcher/FCS allocation authoring without explicit `linkedEquipment` and stealth mode/damage lifecycle visible as the remaining unsupported feature gaps while represented explicit links, unambiguous single-launcher or exact-cardinality same-location FCS hydration, represented ECM mode consumption for Artemis suppression, source-backed active-probe ECM countering from BAP/CEWS equipment state, and Nova CEWS C3-style network range-sharing stay integrated

#### Scenario: Catalog critical slots seed runner critical resolution

- **GIVEN** a catalog-hydrated BattleMech unit carries location-keyed `criticalSlots`
- **WHEN** UnitHydration prepares runner combat data for that unit
- **THEN** occupied critical slots SHALL be mapped into the runner `CriticalSlotManifest` by source location and source slot index
- **AND** heat sink slots SHALL resolve through `applyHeatSinkHit` so later heat phases reduce dissipation through `heatSinksDestroyed`
- **AND** jump-jet slots SHALL resolve through `applyJumpJetHit` so later movement phases reduce effective jump MP through `jumpJetsDestroyed`
- **AND** weapon slots hydrated with runtime weapon ids SHALL resolve through `applyWeaponHit` so later attack planning and stale declaration validation remove destroyed weapon mounts
- **AND** ammo critical-slot strings SHALL hydrate runtime ammo bins with stable `binId`, `weaponType`, location, remaining/max rounds, and explosive flag data
- **AND** ammo critical entries SHALL carry `ammoBinId` when the catalog slot resolves to a runtime ammo bin
- **AND** mounted CASE, CASE-P/prototype CASE, and CASE II critical-slot strings SHALL hydrate per-location `caseProtection` combat state
- **AND** represented equipment critical slots that already carry an equipment identity plus positive `explosionDamage`, including exact single same-location source equipment metadata hydrated into generic equipment critical slots, SHALL resolve to equipment `AmmoExplosion` critical effects and route that represented damage through the runner damage cascade
- **AND** catalog-hydrated `Extended Fuel Tank` BattleMech critical slots, including official tonnage-suffixed critical text such as `Extended Fuel Tank (1 ton)` and `Extended Fuel Tank (3 tons)`, SHALL carry secondary-effect-gated 20-point equipment explosion metadata, while generic `Fuel Tank` aliases, LAM fuel equipment, incendiary/inferno ammunition lifecycle, and bomb-bay fuel checks remain explicit out-of-scope or separate-lane gaps
- **AND** catalog-hydrated `RISC Emergency Coolant System` BattleMech critical slots SHALL carry secondary-effect-gated 5-point equipment explosion metadata, preserve damaged-coolant-system state when the critical resolves, and leave coolant use, coolant failure, and heat-phase behavior as explicit gaps
- **AND** catalog-hydrated `RISC Laser Pulse Module` BattleMech critical slots SHALL carry linked-laser critical metadata only when explicit `linkedEquipment` state identifies the linked working laser or when exactly one same-location working laser weapon is available, represented RISC Laser Pulse Module criticals SHALL destroy that linked laser without emitting `AmmoExplosion` damage, and ambiguous or absent linked-laser evidence SHALL remain generic module destruction without synthesizing random same-location laser destruction
- **AND** represented official `Blue Shield Particle Field Damper` critical-slot text SHALL hydrate with source-backed 5-point secondary-effect-gated explosion metadata unless source equipment mode is explicitly `Off`, represented active/default Blue Shield critical slots or events SHALL resolve that equipment explosion, and represented Off-mode Blue Shield critical slots SHALL remain non-explosive shield equipment while broader Blue Shield activation lifecycle, ARAD, hit-location, and special defensive rules remain explicit gaps
- **AND** represented hot-loaded weapon critical slots or events SHALL resolve explosion damage only when they explicitly carry `hotLoaded=true` plus positive `explosionDamage`, or when critical-slot hydration finds source equipment `HotLoad` mode state on exactly one matching mounted weapon entry that also carries positive `explosionDamage`
- **AND** the runner SHALL NOT synthesize equipment or hot-loaded weapon explosion damage from static aliases, fallback names, linked ammunition, duplicate mounted-weapon entries, HotLoad mode text without positive `explosionDamage`, generic explosive-equipment labels, name-only equipment entries, or duplicate source metadata when explicit positive `explosionDamage` is absent or ambiguous
- **AND** critical-slot hydration, effect, and aggregate critical-component catalog rows SHALL carry MegaMek source anchors for the system/equipment slot boundary before any row can be used as validation evidence
- **AND** the aggregate catalog triads for critical-slot hydration and critical-slot effects SHALL require row-level source references rather than inherited requirement authority
- **AND** explicit equipment-critical branch gaps SHALL distinguish represented BattleMech blockers from separate-lane scope: generic `Fuel Tank` aliases, LAM fuel equipment, bomb bays, and incendiary/inferno ammunition lifecycle SHALL remain explicit out-of-scope or separate-lane rows rather than unsupported BattleMech equipment-critical blockers; RAC/HVAC lifecycle branches are represented through PLAYTEST_3 autocannon first-hit plus follow-up destruction handling; ambiguous or absent RISC Laser Pulse Module linkage remains represented only as generic no-fallback module destruction; Blue Shield special rules beyond represented shield preservation/mode-gated official 5-point explosion payloads remain pinned out of BattleMech combat-state scope; and hot-loaded linked-ammo inference remains fail-closed beyond explicit or source-HotLoad positive `explosionDamage`

#### Scenario: Jump-jet critical damage reduces runner jump movement

- **GIVEN** a BattleMech has base jump MP and accumulated `componentDamage.jumpJetsDestroyed`
- **WHEN** runner movement validation computes the unit's jump capability
- **THEN** each destroyed jump jet SHALL subtract one base jump MP before jump movement validation
- **AND** Partial Wing bonuses SHALL NOT recreate jump capability after critical damage has reduced base jump MP to zero

#### Scenario: Weapon critical damage removes runner attack availability

- **GIVEN** a BattleMech has hydrated weapon critical slots with runtime weapon ids
- **WHEN** critical resolution records that weapon id in `componentDamage.weaponsDestroyed`
- **THEN** AI attack planning SHALL see that hydrated mount as destroyed and SHALL NOT declare it
- **AND** runner attack resolution SHALL reject any stale declaration for that destroyed weapon with `AttackInvalid` before heat, ammo, fired-weapon, or damage side effects

#### Scenario: Ammo critical damage targets hydrated bin

- **GIVEN** a catalog-hydrated BattleMech has ammo critical slots and matching runtime ammo bins
- **WHEN** critical resolution destroys one of those ammo slots
- **THEN** `CriticalHitResolved` and `ComponentDestroyed` SHALL carry the resolved `ammoBinId`
- **AND** any crit-induced `AmmoExplosion` SHALL use that same `binId`
- **AND** a crit on an empty exact bin SHALL NOT explode another loaded ammo bin in the same location

#### Scenario: CASE-contained ammo cookoffs suppress transfer

- **GIVEN** a BattleMech has mounted CASE, CASE-P/prototype CASE, or CASE II projected into `caseProtection` for the ammo bin location
- **WHEN** runner heat, runner crit, or event-sourced heat ammo explosion resolution emits `AmmoExplosion`
- **THEN** `AmmoExplosion.caseProtection` SHALL report the protection level used for the cascade
- **AND** standard CASE and CASE-P/prototype CASE SHALL cap protected explosion damage at 10 before local runner or event-sourced damage resolution
- **AND** CASE II SHALL cap protected explosion damage at 1 before local runner or event-sourced damage resolution
- **AND** ammo explosion damage SHALL bypass normal armor absorption and apply the capped or uncapped cascade directly to internal structure
- **AND** protected torso ammo explosions that do not destroy the source location SHALL blow out that torso's rear armor while preserving front armor
- **AND** protected explosion damage SHALL NOT emit `TransferDamage` from the CASE-protected location
- **AND** event-sourced heat cookoffs SHALL empty the exploded bin before applying the CASE-adjusted damage cascade
- **AND** broad non-CASE equipment names that merely contain the substring "case" SHALL NOT hydrate phantom CASE protection

#### Scenario: Ammo-explosion pilot damage emits pilot-hit state

- **GIVEN** MegaMek applies BattleMech ammunition-explosion pilot damage and reduces that damage for Pain Resistance or Iron Man
- **WHEN** runner heat, runner critical, or event-sourced heat cookoff resolution emits `AmmoExplosion`
- **THEN** the cookoff path SHALL emit `PilotHit` with `source: 'ammo_explosion'`, persist the pilot wound total, and destroy the unit with `pilot_death` when the lethal wound threshold is reached
- **AND** Iron Man or Pain Resistance SHALL reduce the ammo-explosion pilot damage by one, while artificial pain shunt SHALL suppress the pilot damage
- **AND** `PilotHit` event support SHALL include ammo-explosion coverage only after runner heat, runner critical, and event-sourced heat cookoff paths share that behavior end to end

#### Scenario: Damage and death catalog rows expose row-level source truth

- **GIVEN** the BattleMech damage/death support catalog covers damage resolution, pilot damage, and destruction causes
- **WHEN** the catalog triad marks `damageResolution`, `pilotDamage`, or `destructionCauses` as row-source-backed
- **THEN** every row in those maps SHALL carry structured source references
- **AND** core damage rows SHALL include source-backed rule or MegaMek anchors plus MekStation resolver/state anchors
- **AND** event, heat-cascade, pilot-wound, and destruction-cause rows SHALL cite the executable MekStation event/state paths they claim
- **AND** the `damageResolution`, `pilotDamage`, and `destructionCauses` catalog triads SHALL enforce row-level source references before PR approval

### Requirement: Physical Attack Legality Gates

Physical attack declaration and resolution SHALL validate action-specific legality gates before scheduling a combat action. Push, charge, death from above, melee weapon, punch, kick, and club logic SHALL share the same legality helpers across eligibility display, event-sourced declaration, and simulation runner resolution so UI options, game events, and automated combat cannot diverge.

#### Scenario: BattleMech physical classes stay source-backed

- **GIVEN** MegaMek exposes BattleMech-applicable brush-off, thrash, trip, grapple, break-grapple, and jump-jet physical action classes
- **WHEN** the physical action class scope catalog is contract-tested
- **THEN** every physical action class scope row SHALL cite the matching MegaMek source class with commit-pinned line anchors
- **AND** supported punch, kick, push, trip, thrash, jump-jet attack, brush-off, grapple, charge, death-from-above, and club/melee rows SHALL expose row-level MegaMek source references before PR approval
- **AND** non-BattleMech AirMek, battle armor, infantry explosive, ProtoMek, and aerospace ram rows SHALL remain explicit `out-of-scope` splits with row-level MegaMek source references
- **AND** `break-grapple` SHALL expose a runtime `PhysicalAttackType`, tactical command, event-sourced declaration/resolution, runner resolution path, source-backed optional-rule, airborne, common locked-grapple, chain-whip rejection, unit-type, grapple-target, original-attacker automatic-success, actuator/AES, and weight-class modifier branches, zero damage, both-unit grapple state clearing, grid-backed adjacent displacement, and moved-unit facing updates
- **AND** shared physical displacement coverage SHALL mark the represented recursive push/charge/DFA/charge-miss domino chain integrated under `shared.displacement-domino-chain`, keep positional payload evidence under `shared.displacement-domino-positional-chain`, keep represented `TerrainType.Mines` and conventional coordinate-state minefield destination fallout under `shared.displacement-domino-minefield-fallout`, including represented density reduction, already-detonated suppression, and typed non-conventional no-fallback guards, keep represented destination terrain/building/environment PSR fallout under `shared.displacement-domino-terrain-building-environment-fallout`, treat `shared.displacement-domino-secondary-fallout` as a split-accounted non-blocking umbrella, keep represented `blockerStepOutDecision` CFR handling integrated under `shared.displacement-domino-step-out-cfr` with `domino_step_out` success payloads plus forced fallback for failed/declined/invalid/no-response decisions, and retain `shared.displacement-domino-dropship-secondary-hex` as an out-of-scope large-unit split; hidden/reveal minefield behavior and non-conventional minefield type semantics beyond those represented coordinate-state guards SHALL remain owned by exact `ruleSupport.terrainEnvironment` minefield branch rows while `ruleSupport.terrainEnvironment.minefield-variant-side-paths` remains a split-accounting row
- **AND** `brush-off` SHALL expose a runtime `PhysicalAttackType`, tactical command, selected-arm payload, event-sourced declaration/resolution, runner resolution path, source-backed swarming-infantry target legality, arm gates, dedicated brush-off modifiers, hit dislodgement, punch-equivalent target damage, punch-equivalent miss self-damage, and carrier-level selected attached iNARC pod removal on successful runner/session/replay Brush-Off
- **AND** `grapple` SHALL expose a runtime `PhysicalAttackType`, tactical command, event-sourced declaration/resolution, runner resolution path, source-backed optional-rule, airborne, common locked-grapple, friendly-fire, unit-type, arm/shoulder, range, elevation, front-arc, prone, weapon-fire, already-grappled, actuator/AES/TSM, and weight-class branches, zero damage, attacker relocation into the target hex, target facing reversal, and both-unit grapple state
- **AND** optional TacOps `trip` SHALL expose a runtime `PhysicalAttackType`, tactical command, event-sourced declaration/resolution, runner resolution path, optional-rule gate, source-backed front-arc/range/prone/elevation/usable-limb restrictions, `-1` base to-hit adjustment, zero damage on hit, and a target PSR trigger
- **AND** `thrash` SHALL expose a runtime `PhysicalAttackType`, tactical command, event-sourced declaration/resolution, runner resolution path, prone-Mek same-hex infantry legality, clear/pavement terrain validation, automatic-hit resolution, weight-based infantry damage, no target PSR, and an attacker PSR trigger
- **AND** optional TacOps `jump-jet-attack` SHALL expose a runtime `PhysicalAttackType`, tactical command, selected-leg payload, event-sourced declaration/resolution, runner resolution path, optional-rule gate, ready-jump-jet gate, leg-weapon-fire gate, source-backed range/elevation/facing restrictions, source-specific to-hit modifiers, selected-leg damage, and no self-PSR side effects
- **AND** no BattleMech-applicable physical action class scope row SHALL remain `unsupported` or `helper-only` for the normal BattleMech physical action classes listed above while chain-whip maintenance and simultaneous counter-grapple exchange remain separate explicit gaps
- **AND** the `physicalActionClassScope` catalog triad SHALL enforce row-level source references before PR approval

#### Scenario: Jump jet attacks resolve as selected-leg optional TacOps damage

- **GIVEN** a BattleMech with ready jump jets in the selected leg declares `jump-jet-attack` against an adjacent target with the TacOps jump-jet attack option enabled
- **WHEN** helper, eligibility, tactical-command, intent/wire, event-sourced, or runner resolution surfaces validate the declaration
- **THEN** the attack SHALL apply the source-backed jump-jet attack to-hit modifier
- **AND** target damage SHALL be `3 * ready jump jets` for each selected non-wet leg
- **AND** the attack SHALL not queue attacker or target PSR side effects
- **AND** disabled optional rules, missing selected-leg jump jets, prior jump movement, prior selected-leg weapon fire, invalid range, invalid elevation, and invalid feet-facing state SHALL reject the attack before damage

#### Scenario: Thrash resolves as source-backed automatic infantry damage

- **GIVEN** a prone BattleMech declares `thrash` against enemy infantry in the same clear or pavement hex at the same elevation
- **WHEN** helper, eligibility, tactical-command, intent/wire, event-sourced, or runner resolution surfaces validate the declaration
- **THEN** the attack SHALL resolve as an automatic hit with a to-hit number and roll of `0`
- **AND** target damage SHALL be `round(attackerWeight / 3)`
- **AND** the target SHALL not receive a physical-hit PSR
- **AND** the attacker SHALL receive a `thrash_attacker_hit` PSR for the thrashing attack
- **AND** standing attackers, non-infantry targets, non-same-hex targets, non-clear/non-pavement terrain, prior weapon fire, and missing usable arm/leg state SHALL reject the attack before damage or PSR side effects

#### Scenario: Brush-off resolves as source-backed swarmer dislodgement or miss self-damage

- **GIVEN** a BattleMech declares `brush-off` with a selected arm against enemy swarming infantry or Battle Armor attached to that attacker
- **WHEN** helper, eligibility, tactical-command, intent/wire, event-sourced, or runner resolution surfaces validate the declaration
- **THEN** the attack SHALL apply the source-backed `+4` brush-off to-hit modifier plus selected-arm actuator/AES/claw/sensor/magnetic-claw modifiers
- **AND** a hit SHALL apply punch-equivalent damage to the swarming target and clear that target's swarming attachment state
- **AND** a miss SHALL apply punch-equivalent self-damage to the attacker on the punch hit table without dislodging the swarmer
- **AND** non-Mek attackers, missing or invalid selected arms, non-swarming non-iNARC targets, quad attackers, flipped arms, no/minimal-arms quirks, shoulder destruction, selected-arm weapon fire, target-DFA state, prone attackers, and explicit building/fuel-tank/hex targets SHALL reject the attack before damage
- **AND** carrier-level iNARC pod-object target UI/selection SHALL expose same-team/same-type attached-pod targets as selectable Brush-Off options and carry selected pod identity into declaration/resolution without inventing map-ground-object pod state

#### Scenario: Grapple resolves as source-backed zero-damage grapple state

- **GIVEN** a biped BattleMech declares `grapple` against an adjacent Mek or ProtoMek with the TacOps grappling option enabled
- **WHEN** helper, eligibility, tactical-command, intent/wire, event-sourced, or runner resolution surfaces validate the declaration
- **THEN** the attack SHALL apply source-backed actuator/AES/TSM, target movement, evasion, spotting, SPA, and weight-class to-hit modifiers
- **AND** a hit SHALL deal zero damage, set both units' grapple state, move the attacker into the target hex, mark both units as grappled this round, mark the attacker as the grapple initiator, and face the target opposite the attacker
- **AND** disabled optional rules, airborne state, common locked-grapple impossibility, friendly targets, invalid attacker or target unit type, missing arms, destroyed shoulders, invalid range, invalid elevation, non-front-arc targets, prone-state gates, selected-arm weapon fire, and already-grappled state SHALL reject the attack before grapple state changes
- **AND** chain-whip follow-up behavior and simultaneous counter-grapple exchange SHALL remain tracked as separate gaps from normal grapple state resolution

#### Scenario: Break-grapple resolves as source-backed zero-damage grapple release

- **GIVEN** a biped BattleMech or ProtoMek declares `break-grapple` against its currently grappled target with the TacOps grappling option enabled
- **WHEN** helper, eligibility, tactical-command, intent/wire, event-sourced, or runner resolution surfaces validate the declaration
- **THEN** the original grapple attacker SHALL resolve break-grapple as an automatic hit with a to-hit number and roll of `0`
- **AND** a defender breaking free SHALL apply source-backed both-arm actuator, both-arm AES, weight-class, target movement, evasion, spotting, SPA, and normal physical to-hit modifiers
- **AND** a hit SHALL deal zero damage, clear both units' grapple state, move the original grapple attacker to the least-dangerous valid adjacent hex when the original attacker breaks the grapple, or move the defender's opponent to the most-dangerous valid adjacent hex when the defender breaks free
- **AND** the moved unit SHALL face back toward its counterpart after displacement
- **AND** disabled optional rules, airborne state, common locked-grapple impossibility, chain-whip grapple state, invalid attacker unit type, target mismatch, and missing grapple target state SHALL reject the attack before grapple state, displacement, or damage side effects
- **AND** chain-whip maintenance/follow-up behavior and simultaneous counter-grapple exchange SHALL remain tracked as separate gaps from normal break-grapple release

#### Scenario: Physical attacks require existing targets

- **GIVEN** an attacker declares any supported BattleMech physical attack against a target id that is not present in combat state
- **WHEN** the shared physical legality gate runs
- **THEN** the attack SHALL be rejected with `TargetMissing`
- **AND** no physical attack declaration SHALL be scheduled
- **AND** explicit non-unit target-object declarations SHALL use their source-backed object rejection code instead of falling back to `TargetMissing`

#### Scenario: Stale physical declarations resolve missing targets as invalid

- **GIVEN** an already-declared physical attack whose target unit is missing at resolution time
- **WHEN** the physical attack resolver runs
- **THEN** the resolver SHALL emit `PhysicalAttackResolved` with `TargetMissing`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted
- **AND** explicit non-unit target-object context SHALL resolve with the source-backed object rejection code instead of `TargetMissing`

#### Scenario: Physical attacks cannot target destroyed units

- **GIVEN** an attacker declares any supported BattleMech physical attack against a destroyed target unit
- **WHEN** the shared physical legality gate runs
- **THEN** the attack SHALL be rejected with `TargetDestroyed`
- **AND** no physical attack declaration SHALL be scheduled

#### Scenario: Stale physical declarations resolve destroyed targets as invalid

- **GIVEN** an already-declared physical attack whose target unit is destroyed at resolution time
- **WHEN** the physical attack resolver runs
- **THEN** the resolver SHALL emit `PhysicalAttackResolved` with `TargetDestroyed`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted

#### Scenario: Physical attacks cannot target ejected units

- **GIVEN** an attacker declares any supported BattleMech physical attack against an ejected target unit
- **WHEN** the shared physical legality gate runs
- **THEN** the attack SHALL be rejected with `TargetEjected`
- **AND** physical eligibility and runner target selection SHALL remove ejected units from target lists
- **AND** no damage, displacement, or PSR side effect SHALL be emitted

#### Scenario: Stale physical declarations resolve ejected targets as invalid

- **GIVEN** an already-declared physical attack whose target unit ejects before resolution
- **WHEN** the physical attack resolver runs
- **THEN** the resolver SHALL emit `PhysicalAttackResolved` with `TargetEjected`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted

#### Scenario: Physical attacks cannot target retreated units

- **GIVEN** an attacker declares any supported BattleMech physical attack against a retreated or withdrawn target unit
- **WHEN** the shared physical legality gate runs
- **THEN** the attack SHALL be rejected with `TargetRetreated`
- **AND** physical eligibility and runner target selection SHALL remove retreated units from target lists
- **AND** no damage, displacement, or PSR side effect SHALL be emitted

#### Scenario: Stale physical declarations resolve retreated targets as invalid

- **GIVEN** an already-declared physical attack whose target unit retreats before resolution
- **WHEN** the physical attack resolver runs
- **THEN** the resolver SHALL emit `PhysicalAttackResolved` with `TargetRetreated`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted

#### Scenario: Push target must be directly ahead

- **GIVEN** an attacker declares a push against an adjacent target
- **AND** the target does not occupy the hex directly in front of the attacker's feet facing
- **WHEN** the push legality gate runs
- **THEN** the push SHALL be rejected with `TargetNotDirectlyAhead`
- **AND** no physical attack declaration SHALL be scheduled

#### Scenario: Physical attacks require adjacent targets

- **GIVEN** an attacker declares any supported BattleMech physical attack against a target more than one hex away
- **WHEN** the shared physical legality gate runs
- **THEN** the attack SHALL be rejected with `TargetNotAdjacent`
- **AND** no physical attack declaration SHALL be scheduled

#### Scenario: Physical attacks cannot self-target

- **GIVEN** an attacker declares any supported BattleMech physical attack against itself
- **WHEN** the shared physical legality gate runs
- **THEN** the attack SHALL be rejected with `SelfTarget`
- **AND** no physical attack declaration SHALL be scheduled

#### Scenario: Physical attacks cannot target friendly units

- **GIVEN** an attacker declares any supported BattleMech physical attack against a same-side unit
- **WHEN** the shared physical legality gate runs
- **THEN** the attack SHALL be rejected with `FriendlyTarget`
- **AND** no physical attack declaration SHALL be scheduled

#### Scenario: Push rejects invalid unit type, posture, arm, elevation, quirk, and displacement gates

- **GIVEN** a push declaration fails because of explicit non-Mek attacker/target unit type, missing arm location, no-arm quirk, elevation mismatch, prone attacker, prone target, or blocked destination
- **WHEN** the push legality gate runs
- **THEN** the push SHALL be rejected with the matching restriction code
- **AND** eligibility UI, event-sourced declaration, and runner resolution SHALL report the same gate outcome

#### Scenario: Punch and kick reject missing attacker limbs

- **GIVEN** a BattleMech punch uses a selected arm location that has been destroyed or blown off
- **WHEN** the punch legality gate runs
- **THEN** the punch SHALL be rejected with `LimbMissing`
- **AND** no physical declaration, damage, PSR, or displacement side effect SHALL be emitted
- **GIVEN** a BattleMech kick has either leg location destroyed or blown off
- **WHEN** the kick legality gate runs
- **THEN** the kick SHALL be rejected with `LimbMissing`
- **AND** eligibility UI, event-sourced declaration, and runner resolution SHALL report the same gate outcome from the shared helper

#### Scenario: Physical declarations reject invalid hex target objects

- **GIVEN** a physical helper or event-sourced declaration evaluates a woods-clearing, building-ignition, or hex-ignition target object
- **WHEN** the shared physical legality gate runs
- **THEN** the attack SHALL be rejected with `InvalidPhysicalTarget`
- **AND** stale declared resolution with explicit non-unit target context SHALL preserve `InvalidPhysicalTarget` without damage, displacement, or PSR side effects

#### Scenario: Push declarations reject building and fuel-tank target objects

- **GIVEN** a push helper or event-sourced declaration evaluates a building or fuel-tank target object
- **WHEN** the push legality gate runs
- **THEN** the push SHALL be rejected with `TargetBuilding`
- **AND** stale declared resolution with explicit non-unit target context SHALL preserve `TargetBuilding` without damage, displacement, or PSR side effects

#### Scenario: Charge and death from above declarations reject non-entity building targets

- **GIVEN** a charge or death from above helper or event-sourced declaration evaluates a building or fuel-tank target object
- **WHEN** the action-specific legality gate runs
- **THEN** the attack SHALL be rejected with `InvalidPhysicalTarget`
- **AND** the catalog SHALL record that MegaMek source order returns `Invalid Target` for non-entity targets before the later adjacent-building branch
- **AND** non-unit building and fuel-tank physical damage resolution SHALL remain an explicit gap

#### Scenario: Gun-emplacement physical targets resolve as automatic hits

- **GIVEN** a punch, kick, death from above, or runtime melee physical attack targets an adjacent gun emplacement
- **WHEN** the physical to-hit and resolution helpers run
- **THEN** the attack SHALL resolve as an automatic hit without consuming to-hit dice
- **AND** the resolved event SHALL carry automatic-hit metadata

#### Scenario: Charge rejects gun-emplacement targets by standing-Mek source order

- **GIVEN** a BattleMech-compatible attacker declares a charge against an adjacent gun emplacement
- **WHEN** the charge legality gate runs through helper, eligibility, event-sourced declaration, or runner resolution inputs
- **THEN** the charge SHALL be rejected with `TargetNotMek`
- **AND** no automatic-hit metadata, damage, displacement, or PSR side effects SHALL be emitted

#### Scenario: Charge rejects prone attackers

- **GIVEN** a BattleMech-compatible attacker declares a charge after running this turn
- **AND** the attacker is prone at charge resolution time
- **WHEN** the charge legality gate runs
- **THEN** the charge SHALL be rejected with `AttackerProne`
- **AND** no physical declaration, damage, displacement, or PSR side effect SHALL be emitted
- **AND** runner physical phase SHALL skip prone attackers before bot or automatic charge declarations

#### Scenario: Charge rejects jump movement paths

- **GIVEN** a BattleMech-compatible attacker declares a charge after jumping this turn
- **WHEN** the charge legality gate runs
- **THEN** the charge SHALL be rejected with `ChargeJumpMovement`
- **AND** the jump movement rejection SHALL run before the generic no-run, backward-movement, and prone-attacker gates
- **AND** event-sourced declarations, stale physical resolution, and runner injected declarations SHALL consume the same movement-state-derived jump flag

#### Scenario: Charge rejects backward movement paths

- **GIVEN** a BattleMech-compatible attacker declares a charge after running this turn
- **AND** the attacker's movement step chain included backward or backward-lateral movement
- **WHEN** the charge legality gate runs
- **THEN** the charge SHALL be rejected with `ChargeBackwardMovement`
- **AND** event-sourced declarations, stale physical resolution, runner injected declarations, and automatic runner selection SHALL consume the same movement-step-derived state

#### Scenario: Charge rejects invalid standing-Mek target gates

- **GIVEN** a BattleMech-compatible attacker declares a charge after running this turn
- **AND** the target is explicitly non-Mek or prone
- **WHEN** the charge legality gate runs
- **THEN** the charge SHALL be rejected with `TargetNotMek` or `TargetProne`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted
- **AND** eligibility UI, event-sourced declaration, and runner resolution SHALL report the same gate outcome

#### Scenario: Charge rejects non-Mek charges against Infantry or ProtoMech targets

- **GIVEN** an explicit non-Mek attacker declares a charge after running this turn
- **AND** the target is Infantry, Battle Armor, or ProtoMech
- **WHEN** the charge legality gate runs
- **THEN** the charge SHALL be rejected with `TargetInfantryOrProtoMek`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted
- **AND** eligibility UI, event-sourced declaration, and runner resolution SHALL report the same gate outcome

#### Scenario: Charge rejects non-overlapping elevation bands

- **GIVEN** a BattleMech-compatible attacker declares a charge after running this turn
- **AND** the target elevation band does not overlap the attacker elevation band
- **WHEN** the charge legality gate runs
- **THEN** the charge SHALL be rejected with `ElevationMismatch`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted
- **AND** eligibility UI, event-sourced declaration, and runner resolution SHALL report the same gate outcome

#### Scenario: Charge rejects targets that have not completed movement unless immobile

- **GIVEN** a charge declaration is evaluated after the attacker ran this turn
- **AND** the target has not completed movement this turn
- **AND** the target is not immobile
- **WHEN** the charge legality gate runs
- **THEN** the charge SHALL be rejected with `TargetMovementIncomplete`
- **AND** immobile targets SHALL remain legal for this gate even when movement is incomplete
- **AND** no damage, displacement, or PSR side effect SHALL be emitted on rejection

#### Scenario: Blocked successful charge displacement keeps both units in place

- **GIVEN** a charge attack hits after charge damage is resolved
- **AND** the target displacement hex in the attacker's facing direction is blocked or otherwise invalid
- **WHEN** the successful charge displacement branch runs
- **THEN** the target and attacker SHALL remain in their original hexes
- **AND** charge target damage and charge attacker self-damage SHALL still apply
- **AND** charge-specific displacement PSRs SHALL NOT be emitted for either unit
- **AND** the resolver SHALL NOT emit `cause=impossible_displacement`
- **AND** helper, event-sourced resolution, runner resolution, catalog, and source-truth audit evidence SHALL report the same source-backed outcome

#### Scenario: Physical displacement rejects climbs above BattleMech limits

- **GIVEN** a push, charge, or death-from-above displacement would move a BattleMech target into a destination hex more than two elevation levels above its source hex
- **WHEN** the shared displacement helper evaluates the destination
- **THEN** the displacement SHALL be treated as invalid before position changes or displacement PSRs are emitted
- **AND** successful charge damage SHALL still apply while both units remain in their original hexes
- **AND** helper, event-sourced resolution, runner resolution, catalog, and source-truth audit evidence SHALL cite the MegaMek `Compute.isValidDisplacement` and `Mek.getMaxElevationChange` anchors
- **AND** represented domino step-out/CFR decisions SHALL remain integrated under `shared.displacement-domino-step-out-cfr` through replayable `blockerStepOutDecision` payloads that record the eligible blocker, side-entered/non-jumping context, legal step option, blocker PSR result, `CFR_DOMINO_EFFECT` response, accepted path, and forced fallback for failed/declined/invalid/no-response decisions, while broader DropShip footprint/secondary-hex consequences SHALL remain an out-of-scope large-unit split under `shared.displacement-domino-dropship-secondary-hex`

#### Scenario: Physical displacement rejects prohibited BattleMech terrain

- **GIVEN** a push, charge, or death-from-above displacement would move a BattleMech target into an explicit impassable terrain hex or a represented woods/jungle terrain feature above level two
- **WHEN** the shared displacement helper evaluates the destination
- **THEN** the displacement SHALL be treated as invalid before position changes or displacement PSRs are emitted
- **AND** successful charge damage SHALL still apply while both units remain in their original hexes
- **AND** helper, event-sourced resolution, runner resolution, catalog, and source-truth audit evidence SHALL cite MegaMek `Compute.isValidDisplacement` prohibited-destination handling plus `Mek.isLocationProhibited` impassable and woods/jungle terrain-level handling
- **AND** hidden-unit deployment restrictions, track/wheel motive restrictions, and broader DropShip footprint/secondary-hex consequences SHALL remain explicit gaps while represented domino step-out/CFR decisions remain integrated under `shared.displacement-domino-step-out-cfr`

#### Scenario: Runner physical displacement refreshes same-phase occupancy

- **GIVEN** one physical attack displaces a unit into a hex that a later same-phase physical attack would otherwise use as its displacement destination
- **WHEN** the runner resolves the later physical attack
- **THEN** the runner SHALL evaluate displacement legality against the refreshed grid occupancy from the earlier displacement payload
- **AND** the later attack SHALL NOT emit a displacement payload or charge-specific displacement PSRs when that refreshed destination is occupied
- **AND** runner behavior, parity catalog, task list, and source-truth audit evidence SHALL report the same stale-occupancy closure
- **AND** represented domino step-out/CFR decisions SHALL remain integrated under `shared.displacement-domino-step-out-cfr`, while broader DropShip footprint/secondary-hex consequences SHALL remain an out-of-scope large-unit split under `shared.displacement-domino-dropship-secondary-hex`

#### Scenario: Displacement chain edge gaps stay source-backed

- **GIVEN** the physical legality support catalog tracks BattleMech displacement behavior
- **WHEN** the catalog is contract-tested
- **THEN** represented occupied-hex domino displacement SHALL remain a source-backed integrated sibling row that recursively moves blockers, cascades position updates, and queues DominoEffect PSRs through helper, event-sourced, and runner physical resolution
- **AND** represented `TerrainType.Mines` and conventional coordinate-state minefield fallout on domino displacement SHALL remain an integrated sibling row with PhysicalAttack-phase damage, PSR, represented coordinate-state mutation evidence, already-detonated suppression, and typed non-conventional no-fallback guards
- **AND** represented `TWGameManager.doEntityDisplacement` terrain, building, and environment fallout SHALL remain integrated under `shared.displacement-domino-terrain-building-environment-fallout`, and represented domino step-out/CFR handling SHALL remain integrated under `shared.displacement-domino-step-out-cfr` by carrying the eligible blocker, side-entered/non-jumping context, legal forward/backward step options, blocker step-out PSR result, `CFR_DOMINO_EFFECT` response, returned step-out path, `domino_step_out` displacement, and null/no-response forced-displacement fallback in replayable physical attack declaration payloads
- **AND** DFA-miss friendly occupied displacement avoidance SHALL remain an integrated source-backed row that passes same-side target friendlies into preferred displacement before falling back to occupied friendly destinations
- **AND** grounded DropShip-radius displacement search SHALL be an integrated source-backed row that scans the radius-two ring in MegaMek `Compute.getValidDisplacement` order when same-board grounded DropShip source context is supplied or runtime-hydrated for runner and event-sourced DFA hit displacement
- **AND** broader DropShip footprint/secondary-hex consequences SHALL remain an exact explicit gap under `shared.displacement-domino-dropship-secondary-hex`, while full hidden/non-conventional minefield variant lifecycles SHALL remain owned by exact `ruleSupport.terrainEnvironment` minefield branch rows until those source paths are modeled beyond same-hex DropShip source context and represented conventional coordinate-state minefields
- **AND** each helper-only, integrated, or unsupported row SHALL cite the corresponding MegaMek `Compute` or `TWGameManager` source anchor with commit-pinned line references

#### Scenario: Push rejects arm-mounted weapons fired this turn

- **GIVEN** a push declaration is evaluated with evidence that either attacker arm fired a weapon this turn
- **WHEN** the push legality gate runs
- **THEN** the push SHALL be rejected with `WeaponFiredThisTurn`
- **AND** helper and event-sourced declaration paths SHALL reject before side effects
- **AND** event-sourced and runner paths SHALL use hydrated mounted weapon locations to reject left/right-arm fire while allowing non-arm mounted fire
- **AND** unknown or unhydrated fired weapon ids SHALL remain conservative and reject the push rather than silently allowing a potentially arm-fired weapon

#### Scenario: Death from above rejects prone attackers

- **GIVEN** an attacker that jumped this turn is prone before resolving death from above
- **WHEN** the DFA legality gate runs
- **THEN** death from above SHALL be rejected before hit resolution
- **AND** the validation catalog SHALL record the gate as integrated only when helper and runner evidence exist

#### Scenario: Death from above rejects mechanical jump booster movement paths

- **GIVEN** a BattleMech movement declaration contains a jump step marked as using a mechanical jump booster
- **WHEN** the DFA legality gate runs
- **THEN** death from above SHALL be rejected with `MechanicalJumpBooster`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted
- **AND** eligibility UI, event-sourced declaration/resolution, runner resolution, and automatic runner selection SHALL use the same movement-step-derived gate

#### Scenario: Death from above evaluates airborne VTOL reach with hydrated jump context

- **GIVEN** a BattleMech declares death from above against an airborne VTOL target
- **AND** the declaration context carries attacker jump MP and target elevation difference
- **WHEN** the target elevation above the attacker's height exceeds attacker jump MP
- **THEN** death from above SHALL be rejected with `ElevationMismatch`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted
- **AND** eligibility UI, event-sourced declaration/resolution, runner resolution, and automatic runner selection SHALL use the same reach gate for explicit airborne VTOL targets and airborne WIGE targets represented by combat motion type

#### Scenario: Death from above rejects infantry-family attackers

- **GIVEN** an Infantry or Battle Armor attacker declares death from above after jumping this turn
- **WHEN** the DFA legality gate runs
- **THEN** death from above SHALL be rejected with `AttackerInfantry`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted
- **AND** eligibility UI, event-sourced declaration, and runner resolution SHALL report the same gate outcome

#### Scenario: Death from above rejects DropShip targets

- **GIVEN** a BattleMech declares death from above against a DropShip target after jumping this turn
- **WHEN** the DFA legality gate runs
- **THEN** death from above SHALL be rejected with `TargetDropShip`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted
- **AND** eligibility UI, event-sourced declaration/resolution, and runner resolution SHALL report the same gate outcome

#### Scenario: Death from above rejects targets that have not completed movement unless immobile

- **GIVEN** a DFA declaration is evaluated after the attacker jumped this turn
- **AND** the target has not completed movement this turn
- **AND** the target is not immobile
- **WHEN** the DFA legality gate runs
- **THEN** death from above SHALL be rejected with `TargetMovementIncomplete`
- **AND** immobile targets SHALL remain legal for this gate even when movement is incomplete
- **AND** no damage, displacement, or PSR side effect SHALL be emitted on rejection

#### Scenario: Death from above helper checks VTOL/WIGE elevation reach

- **GIVEN** a DFA helper evaluates an airborne VTOL or WIGE target
- **WHEN** the target elevation above the attacker's height is within the attacker's jump MP
- **THEN** the generic airborne-target gate SHALL NOT reject the target
- **WHEN** the target elevation above the attacker's height exceeds the attacker's jump MP
- **THEN** death from above SHALL be rejected with `ElevationMismatch`
- **AND** eligibility, event-sourced declarations, runner resolution, and automatic runner selection SHALL hydrate explicit airborne VTOL targets from unit type and airborne WIGE targets from combat motion type when attacker jump MP and elevation context are present
- **AND** the validation catalog SHALL mark the VTOL/WIGE reach gate integrated only when helper, event-sourced, runner, and automatic-selection evidence are present

#### Scenario: Death from above applies Infantry and Battle Armor target-class modifiers

- **GIVEN** a DFA declaration is evaluated after the attacker jumped this turn
- **WHEN** the target is Infantry
- **THEN** death from above to-hit SHALL include a +3 target-class modifier
- **WHEN** the target is Battle Armor
- **THEN** death from above to-hit SHALL include a +1 target-class modifier
- **AND** helper, eligibility UI, event-sourced declaration, and runner resolution SHALL report the same modifier outcome

#### Scenario: Death from above applies piloting skill differential

- **GIVEN** a DFA declaration is evaluated after the attacker jumped this turn
- **AND** the attacker and target have different piloting skills
- **WHEN** the DFA to-hit number is calculated
- **THEN** death from above to-hit SHALL include attacker piloting minus target piloting as a modifier
- **AND** helper, eligibility UI, event-sourced declaration, and runner resolution SHALL report the same modifier outcome

#### Scenario: Death from above impossible displacement destroys the blocked unit

- **GIVEN** a DFA hit or miss is resolved and every legal displacement hex for the target is blocked or off-map
- **WHEN** the DFA displacement branch runs
- **THEN** a successful DFA SHALL destroy the target with `cause=impossible_displacement` and move the attacker into the target hex
- **AND** a missed DFA SHALL destroy the attacker with `cause=impossible_displacement` without queuing the normal miss PSR
- **AND** helper, event-sourced resolution, runner resolution, and the destruction-cause catalog SHALL report the same source-backed outcome

#### Scenario: Death from above successful attacker PSR uses source-backed modifier

- **GIVEN** a death-from-above attack hits its target
- **WHEN** the attacker-side post-DFA piloting skill roll is queued
- **THEN** the attacker PSR SHALL use the MegaMek-backed +4 "executed death from above" modifier
- **AND** the target PSR SHALL use the MegaMek-backed +2 "hit by death from above" modifier
- **AND** event-sourced resolution and runner resolution SHALL both surface the same modifiers

#### Scenario: Physical PSR trigger rows stay source-backed

- **GIVEN** the runner PSR trigger catalog covers kick, charge, push, DFA, and physical-miss fallout
- **WHEN** the BattleMech combat catalog contract tests run
- **THEN** kick target, kick miss, push target, charge hit, DFA target, successful-DFA attacker, charge miss, and missed-DFA rows SHALL carry structured MegaMek source references with commit-pinned line anchors
- **AND** successful charge target and attacker PSRs SHALL use the MegaMek-backed `+2` modifier
- **AND** successful DFA target PSRs SHALL use the MegaMek-backed `+2` modifier
- **AND** normal missed charges SHALL displace the attacker without queuing a normal `ChargeMiss` PSR, keeping the legacy/local `ChargeMiss` factory in the `out-of-scope` audit inventory rather than an integrated parity claim or unresolved BattleMech blocker
- **AND** missed-DFA grid resolution SHALL remain immediate fall handling rather than a queued normal `DFAMiss` PSR, with the no-grid fallback factory remaining an `out-of-scope` audit row outside source-backed BattleMech blocker accounting

#### Scenario: Death from above miss immediately drops the attacker

- **GIVEN** a death-from-above attack misses and the target has a legal displacement hex
- **WHEN** the DFA miss displacement branch runs
- **THEN** the target SHALL move to the preferred displacement hex and the attacker SHALL fall into the target's original hex
- **AND** event-sourced resolution and runner resolution SHALL immediately apply fall damage, set the attacker prone with the source-backed rear fall facing, emit `UnitFell`, and avoid queuing the normal `DFAMiss` PSR for that grid-backed fall branch
- **AND** the attacker SHALL roll the source-backed fall pilot-damage avoidance check, applying one fall-sourced pilot wound and `PilotHit` only when that check fails

### Requirement: Source-Backed Physical Weapon Runtime Support

BattleMech physical weapon runtime support SHALL stay aligned with MegaMek `ClubAttackAction` damage, to-hit, and legality behavior before a cataloged physical weapon is marked integrated. Physical equipment that modifies existing physical actions, such as talons, SHALL be source-checked against the relevant MegaMek action resolvers before it is marked helper-only or integrated.

#### Scenario: Official physical weapon catalog partitions into runtime attacks and modifier equipment

- **GIVEN** the official physical weapon construction catalog includes standalone melee weapons and modifier equipment
- **WHEN** the physical weapon runtime-boundary contract runs
- **THEN** every official physical weapon id SHALL have a combat support row
- **AND** local construction physical weapon definitions SHALL expose the same id set as `weapons/physical.json`
- **AND** standalone physical weapon rows SHALL exactly match `SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES`
- **AND** claws and talons SHALL remain integrated modifier-only rows that do not pass intent, wire, or physical option validation as selectable attack types
- **AND** no official physical weapon row SHALL be left unsupported without an explicit support-map entry

#### Scenario: Retractable blade uses source-backed damage, to-hit, and extension gate

- **GIVEN** a BattleMech declares a retractable blade attack against an adjacent valid target
- **WHEN** the blade is extended or the caller does not yet hydrate blade mode state
- **THEN** helper, eligibility, intent/wire validation, event-sourced resolution, and runner resolution SHALL accept `retractable-blade` as a runtime physical attack type
- **AND** target damage SHALL be `ceil(attackerWeight / 10)` with active TSM affecting effective weight
- **AND** to-hit SHALL include the source-backed `-2` retractable blade modifier
- **WHEN** the caller explicitly marks the retractable blade as not extended
- **THEN** helper and event-sourced declaration validation SHALL reject the attack with `RetractableBladeNotExtended`
- **AND** the validation catalog SHALL keep physical weapon mode hydration as a separate out-of-scope concern until combat units carry actual physical weapon mode state

#### Scenario: Flail and wrecking ball use source-backed constant club attacks

- **GIVEN** a BattleMech declares a flail or wrecking ball attack against an adjacent valid target
- **WHEN** helper, eligibility, tactical-command, intent/wire, event-sourced, or runner resolution surfaces validate the declaration
- **THEN** both `flail` and `wrecking-ball` SHALL be accepted as runtime physical attack types
- **AND** flail target damage SHALL be constant `9` plus physical damage bonuses, with underwater halving but without active TSM doubling
- **AND** wrecking ball target damage SHALL be constant `8` plus physical damage bonuses, with underwater halving but without active TSM doubling
- **AND** flail to-hit SHALL include source-backed `+0` and wrecking ball to-hit SHALL include source-backed `+1`
- **AND** flail SHALL not require a hand actuator but SHALL stay blocked on quad BattleMechs
- **AND** wrecking ball SHALL be treated as a non-arm-mounted physical weapon for arm, hand, shoulder, No Arms, and quad legality gates
- **AND** the validation catalog SHALL have no unsupported standalone official physical weapon runtime types after flail and wrecking ball integration, while modifier-only claw/talon lifecycle and full mounted physical-weapon lifecycle remain visible gaps under the physical-weapon action and damage-modifier lifecycle rows

#### Scenario: Talons modify kick and DFA damage without becoming a selectable attack type

- **GIVEN** a BattleMech has explicit biped leg talon combat state and a working foot actuator
- **WHEN** it resolves a kick using that leg
- **THEN** kick target damage SHALL apply MegaMek's source-backed `round(baseKickDamage * 1.5)` talon modifier before physical damage bonuses
- **AND** quad/non-biped BattleMech front-leg kicks SHALL map the selected kicking leg to the matching arm-location talon state before applying the same modifier
- **WHEN** it resolves death from above with at least one qualifying talon leg
- **THEN** DFA target damage SHALL apply MegaMek's source-backed truncating `baseDfaDamage * 1.5` talon modifier before physical damage bonuses
- **AND** quad/non-biped DFA talon checks SHALL include MegaMek's right-arm talon gate plus explicit and catalog-hydrated arm-location talon state for front legs
- **AND** talons SHALL remain non-selectable in runtime physical attack option lists because they modify existing kick/DFA actions rather than declaring a distinct physical attack
- **AND** catalog UnitHydration SHALL derive biped leg talon state from `LEFT_LEG` and `RIGHT_LEG` critical slots and quad/non-biped front-leg talon state from `LEFT_ARM` and `RIGHT_ARM` critical slots containing Talons entries
- **AND** `CriticalHitResolved` events that destroy, mark missing, or mark breached Talons equipment SHALL remove the matching leg or arm-location talon modifier from event replay and runner combat state
- **AND** destroyed leg or arm-location replay and runner damage persistence SHALL remove the matching talon modifier from represented combat state
- **AND** the validation catalog SHALL mark core talon damage modifier behavior integrated while keeping automatic missing/breached talon event production from mounted-equipment state beyond represented destroyed-location replay visible through a separate helper-only lifecycle row

#### Scenario: Claws modify punch damage and to-hit without becoming a selectable attack type

- **GIVEN** a BattleMech has explicit arm claw combat state for the punching arm
- **WHEN** it resolves a punch using that arm
- **THEN** punch target damage SHALL use MegaMek's source-backed `ceil(attackerWeight / 7)` claw base before actuator, pilot ability, quirk, and environmental modifiers
- **AND** punch to-hit SHALL include MegaMek's source-backed `+1` claw modifier while suppressing the hand-actuator destroyed modifier for that claw arm
- **AND** claws SHALL remain non-selectable in runtime physical attack option lists because they modify punch rather than declaring a distinct physical attack
- **AND** catalog UnitHydration SHALL derive arm claw state from `LEFT_ARM` and `RIGHT_ARM` critical slots containing `ISClaw` entries
- **AND** `CriticalHitResolved` events that destroy, mark missing, or mark breached Claw equipment SHALL remove the matching arm claw modifier from event replay and runner combat state
- **AND** destroyed arm location replay and runner damage persistence, including side-torso arm cascades, SHALL remove the matching arm claw modifier from represented combat state
- **AND** PLAYTEST_3 SHALL remove only the claw punch to-hit penalty while preserving claw punch damage
- **AND** the validation catalog SHALL mark core claw damage modifier behavior integrated while keeping automatic missing/breached claw event production from mounted-equipment state beyond represented destroyed-location replay and claw club-with-hand interactions visible through a separate helper-only lifecycle row

### Requirement: Designator Marker Replay State

Designator marker events SHALL replay into the same target marker state consumed by combat resolution. TAG markers SHALL set transient `tagDesignated` state that clears at turn start. Standard NARC markers SHALL append the marking team to `narcedBy` without duplicate entries and SHALL persist across turn starts. iNARC launcher hits SHALL derive the attached `iNarcPods` `podType` from the selected ammo weapon type so Homing, ECM, Haywire, and Nemesis ammo can each attach distinct marker state without falling back to `narcedBy`. Event replay SHALL consume `DesignatorMarkerApplied` events with `marker='inarc'` plus Homing/ECM/Haywire/Nemesis `podType` payloads, rehydrate typed `iNarcPods` carrier state with hit location when present, and deduplicate repeated team/pod events without falling back to standard NARC `narcedBy` state. Attached typed iNARC pod state SHALL persist across turn-reset cleanup while transient TAG and per-turn combat state clear. iNARC explosive selected ammo SHALL resolve source-backed 6-point impact damage without attaching a marker. Direct NARC-compatible missile cluster resolution and runner to-hit declaration SHALL consume Homing pod state when the target is not ECM-protected. Target ECM SHALL suppress standard NARC and iNARC Homing guidance without adding a generic ECM to-hit penalty. Runner to-hit declaration SHALL consume Haywire pod state on the attacker as a source-backed +1 attacker to-hit modifier. Semi-guided TAG to-hit resolution SHALL cancel positive target-movement modifiers and apply source-backed indirect-fire relief when semi-guided ammunition attacks a TAG-designated target not protected by ECM. Semi-guided TAG SHALL NOT expose or consume a cluster-table helper in official combat resolution. Runner missile cluster resolution SHALL consume attacker iNARC ECM pod state as flight-path ECM for Artemis IV/prototype IV/V suppression without treating it as target ECM for NARC guidance. C3 ECM disruption SHALL consume iNARC ECM pod state and deny C3 targeting benefit through the same ECM-disrupted C3 helper path. Tactical sensor contact filtering SHALL consume iNARC ECM pod state as a source-backed active-sensor ECM modifier when explicit sensor-check and sensor-bracket state are present, reducing or eliminating visible contacts according to the adjusted range bracket. Runner weapon attack resolution SHALL consume friendly intervening iNARC Nemesis pod state to redirect source-backed direct confusable missile attacks. Interactive physical planning plus runner, session, and replay physical Brush-Off SHALL carry optional same-team/same-type `selectedINarcPod` identity through declaration/resolution and remove the selected matching attached iNARC pod from the carrier on successful carrier-level Brush-Off resolution, preserving first-pod removal for legacy declarations without an explicit selector. The iNARC pod-object lifecycle row SHALL be integrated for MegaMek-style carrier-attached pod target identity, deduped target options, selected declaration/resolution/replay, and selected same-team/same-type pod removal without inventing map-ground-object pod state. Producer-side iNARC C3 authoring SHALL remain out-of-scope special-weapon accounting and be tracked with C3 network formation gaps instead.

#### Scenario: Replay applies TAG, standard NARC, and iNARC variant marker state

- **GIVEN** a replay stream contains `DesignatorMarkerApplied` events for TAG, standard NARC, and iNARC variant hits
- **WHEN** the event-sourced state reducer applies those events
- **THEN** TAG events SHALL mark the target as TAG-designated for the turn
- **AND** standard NARC events SHALL add the marking team to the target's `narcedBy` list without duplicate markers
- **AND** iNARC selected-ammo hits SHALL add Homing, ECM, Haywire, or Nemesis `{ teamId, podType }` entries to target `iNarcPods` without adding the team to `narcedBy`
- **AND** direct NARC-compatible missile cluster and to-hit resolution SHALL consume source-backed iNARC Homing state while indirect-fire and target-ECM-suppressed guidance bonuses stay suppressed
- **AND** attack declaration SHALL consume source-backed iNARC Haywire state on the attacker as a +1 to-hit modifier
- **AND** target ECM SHALL suppress standard NARC and iNARC Homing guidance without adding a generic ECM to-hit modifier
- **AND** missile cluster resolution SHALL consume source-backed attacker iNARC ECM state to suppress Artemis flight-path guidance while preserving target-only NARC guidance
- **AND** C3 ECM disruption helpers SHALL consume source-backed iNARC ECM pod state to deny C3 targeting benefit
- **AND** tactical sensor contact filtering SHALL consume source-backed iNARC ECM pod state to apply active-sensor range-bracket penalties when explicit sensor-check and sensor-bracket state are available
- **AND** direct confusable missile attacks SHALL redirect to friendly intervening units carrying source-backed iNARC Nemesis pod state
- **AND** typed iNARC marker replay SHALL rehydrate Homing, ECM, Haywire, or Nemesis pod state with hit location when present and deduplicate repeated team/pod events without falling back to standard NARC state
- **AND** attached typed iNARC pod state SHALL persist through turn-reset cleanup while transient TAG and per-turn combat state clear
- **AND** successful carrier-level Brush-Off SHALL remove the selected same-team/same-type attached iNARC pod from the carrier and keep nonmatching pod objects attached
- **AND** the catalog SHALL mark iNARC pod-object lifecycle integrated for carrier-attached target identity and keep producer-side C3 authoring under C3-network authoring scope rather than as a special-weapon blocker

#### Scenario: Semi-guided TAG to-hit cancels target movement and offsets indirect fire

- **GIVEN** a semi-guided LRM, MML, NLRM, or mortar attack targets a TAG-designated unit that is not protected by ECM
- **WHEN** ranged to-hit is calculated against a target with a positive target-movement modifier
- **THEN** the normal target-movement modifier SHALL remain visible in the modifier list
- **AND** an equal negative `Semi-guided TAG target movement` modifier SHALL be appended to cancel it
- **WHEN** that attack is indirect fire
- **THEN** the normal indirect-fire penalty SHALL remain visible in the modifier list
- **AND** a `-1` `Semi-guided TAG indirect fire` modifier SHALL be appended
- **AND** no semi-guided TAG to-hit modifier SHALL apply when the target lacks TAG designation or ECM suppresses the guidance
- **AND** the validation catalog SHALL NOT include a semi-guided TAG cluster-bonus row or helper as BattleMech parity

### Requirement: Source-Backed Sandblaster Cluster-Table Modifier

Cluster-table validation SHALL apply MegaMek's Sandblaster SPA modifier when the attacker has Sandblaster, the firing weapon matches the designated weapon type, and attack range is known. Sandblaster SHALL add `+4` at short range, `+3` beyond short through medium, and `+2` beyond medium to the cluster-table roll, and SHALL take precedence over Cluster Hitter for that attack. MekStation SHALL apply this to represented LB-X, missile cluster-table, selected UAC/RAC rate-of-fire resolution, and official ordinary AC TacOps rapid-fire modes authored from the catalog.

#### Scenario: Sandblaster applies to designated LB-X cluster fire

- **GIVEN** a pilot with Sandblaster has designated an LB-X autocannon
- **AND** the LB-X autocannon fires in cluster mode at short range
- **WHEN** cluster-table damage is resolved
- **THEN** the cluster-table roll SHALL include the source-backed `+4` Sandblaster modifier
- **AND** the validation catalog SHALL keep official ordinary AC TacOps rapid-fire Sandblaster support integrated without static fallback

#### Scenario: Sandblaster applies to designated UAC/RAC selected rate-of-fire expansion

- **GIVEN** a pilot with Sandblaster has designated a UAC/RAC weapon
- **AND** the UAC/RAC weapon fires in a selected rate-of-fire mode at a known attack range
- **WHEN** the runner expands the selected mode into shot events
- **THEN** the selected shot count SHALL be resolved through the Sandblaster-modified cluster table
- **AND** non-Sandblaster selected UAC/RAC modes SHALL continue to expand to the mode's normal independent shot count
- **AND** the validation catalog SHALL keep official ordinary AC TacOps rapid-fire Sandblaster support integrated without static fallback

#### Scenario: Sandblaster SPA catalogs require weapon designation

- **GIVEN** the canonical SPA catalog and legacy gameplay SPA catalog both expose Sandblaster
- **WHEN** the BattleMech combat catalog contract validates SPA metadata
- **THEN** both Sandblaster entries SHALL require a `weapon_type` designation
- **AND** the legacy gameplay SPA catalog SHALL describe the source-backed range-based cluster-table bonus instead of the obsolete flat UAC/RAC bonus

### Requirement: C3 Range Modifier Integration

Direct runner and interactive weapon attack declarations SHALL consume explicit `IGameState.c3Network` state when scenario/session builders or `GameCreated` payloads provide it. `GameCreated` SHALL carry explicit session-authored C3/C3i state through event replay without rerunning producer assignment logic. Compendium adaptation and pre-battle preparation SHALL carry mounted C3 equipment and represented Boosted Comm Implant pilot C3i access into `GameCreated` unit seeds, and runner plus `GameCreated` state creation SHALL seed conservative unambiguous per-side C3 master/slave and C3i networks from hydrated BattleMech C3 equipment or represented Boosted Comm Implant C3i access. C3 attack declarations SHALL refresh C3 member positions, operational lifecycle state, matching C3 equipment critical-slot damage, and ECM/iNARC ECM disruption from current unit state before calculating the declared to-hit number, SHALL suppress C3 range sharing for indirect fire, SHALL use default MegaMek C3 behavior where the network range-sharing unit does not need line of sight to the target, SHALL require spotter-to-target line of sight for C3 range sharing when the `PLAYTEST_3` optional rule is enabled, and SHALL keep manual C3 assignment UI, ambiguous equipment-derived C3 network assignment, automatic multiple same-side partitioning, and oversized network splitting explicit until those state builders exist.

#### Scenario: Direct weapon attack uses explicit C3 state

- **GIVEN** a direct weapon attack has an attacker and same-team spotter in explicit C3 network state
- **WHEN** the runner or interactive declaration path emits `AttackDeclared`
- **THEN** the declared to-hit number SHALL use the best C3 network range bracket when it improves the attacker's own bracket
- **AND** current unit positions SHALL override stale C3 member positions before range math
- **AND** current destroyed, ejected, retreated, withdrawing, shutdown, or transported C3 member state SHALL suppress stale C3 range sharing before range math
- **AND** matching destroyed C3 equipment critical slots SHALL suppress stale C3 range sharing before range math
- **AND** iNARC ECM pod state on a C3 member SHALL deny C3 benefit through the ECM-disrupted C3 path
- **AND** the attack payload SHALL retain the attacker's actual range band while listing the effective C3 range math in modifiers

#### Scenario: Catalog hydration records mounted C3 equipment roles

- **GIVEN** a BattleMech catalog unit carries mounted C3 Master, C3 Slave, boosted C3, or C3i equipment in its equipment list or critical slots
- **WHEN** UnitHydration creates combat state for that unit
- **THEN** the unit state SHALL record mounted C3 equipment roles as `master`, `slave`, or `c3i` with source equipment id and mount location
- **AND** boosted C3 master/slave entries SHALL retain a boosted marker in the hydrated equipment state
- **AND** Battle Armor C3 and Battle Armor Improved C3 entries SHALL NOT hydrate as BattleMech C3 equipment
- **AND** runner initial state SHALL seed one same-side C3 master/slave network when there is exactly one C3 master, at least one C3 slave, and no more than four standard C3 members
- **AND** runner initial state SHALL seed one same-side C3i network when there are at least two and no more than six C3i members
- **AND** Compendium adaptation and pre-battle preparation SHALL carry mounted C3 equipment into `GameCreated` unit seeds
- **AND** `GameCreated` replay SHALL seed one same-side C3 master/slave or C3i network under the same conservative unambiguous limits as runner initial state
- **AND** the catalog SHALL continue to list manual C3 assignment UI, automatic multiple same-side C3 network partitioning, ambiguous multi-master equipment, and oversize network splitting as explicit gaps

#### Scenario: Default C3 range sharing does not require spotter LOS

- **GIVEN** a direct weapon attack has legal attacker-to-target LOS
- **AND** the nearest same-team C3 network member has a better range bracket but blocked LOS to the target
- **WHEN** the runner emits `AttackDeclared`
- **THEN** the declared to-hit number SHALL still use that member's improved C3 range bracket
- **AND** the catalog SHALL not list default C3 spotter LOS hydration as a helper-only gap

#### Scenario: PLAYTEST_3 C3 range sharing requires spotter LOS

- **GIVEN** a direct weapon attack has legal attacker-to-target LOS
- **AND** the nearest same-team C3 network member has a better range bracket but blocked LOS to the target
- **AND** the `PLAYTEST_3` optional rule is enabled
- **WHEN** the runner emits `AttackDeclared`
- **THEN** the declared to-hit number SHALL not use that member's improved C3 range bracket
- **AND** the attack payload SHALL omit the `C3 Network` modifier
- **AND** a C3 network member with clear target LOS SHALL still provide range sharing under `PLAYTEST_3`

#### Scenario: C3 remaining gaps stay separate from explicit-state support

- **GIVEN** runner and interactive declaration paths consume explicit C3 network state for direct weapon attack to-hit math
- **WHEN** the to-hit support catalog and requirement crosswalk are contract-tested
- **THEN** ambiguous C3 equipment/network assignment edges SHALL remain a helper-only to-hit row
- **AND** the C3 support row SHALL describe represented explicit network-state consumption, GameCreated replay of session-authored C3 state, Compendium/pre-battle C3 equipment seed propagation, conservative GameCreated network seeding, position refresh, operational lifecycle refresh, C3 critical-slot damage suppression, ECM/iNARC ECM disruption, indirect-fire suppression, default no-LOS-required C3 range sharing, and optional PLAYTEST_3 spotter LOS gating
- **AND** the C3 support row SHALL remain helper-only until manual C3 assignment UI, ambiguous equipment-derived network assignment, automatic multiple same-side partitioning, and oversized network splitting are implemented

### Requirement: Hull-Down Runner To-Hit Integration

Runner weapon attack declarations SHALL consume explicit target `IUnitGameState.hullDown` state. Hull-down targets SHALL receive MegaMek's source-backed +2 terrain to-hit modifier instead of the normal partial-cover +1 modifier, and confirmed front-arc leg hit-location rolls SHALL be redirected through the hull-down hit-location option before damage is applied.

#### Scenario: Explicit hull-down target affects declared and resolved attacks

- **GIVEN** a target BattleMech has explicit `hullDown: true`
- **WHEN** the runner emits `AttackDeclared`
- **THEN** the declared to-hit number SHALL include a +2 `Hull-Down` terrain modifier
- **AND** the normal `Partial Cover` modifier SHALL NOT also be emitted for that attack
- **AND** a confirmed front-arc leg hit-location roll SHALL resolve against center torso through hull-down hit-location logic

### Requirement: Active TSM Movement Validation

Runner movement validation SHALL consume explicit BattleMech `hasTSM` state and current heat when calculating movement capability. Active TSM SHALL follow MegaMek's source-backed sequence: apply heat movement penalties and the heat-9 TSM walk bonus to walk MP, derive run MP from that adjusted walk MP, then validate the declared movement against the adjusted capability.

#### Scenario: Active TSM expands movement validation at heat 9

- **GIVEN** a BattleMech has `hasTSM: true`, base walk MP 4, and current heat 9
- **WHEN** the runner validates a 5 MP walking movement
- **THEN** the movement SHALL be accepted with 5 MP used
- **AND** a BattleMech with the same TSM equipment below heat 9 SHALL NOT receive the TSM walk bonus
- **AND** the movement-enhancement catalog SHALL mark TSM, core MASC, core Supercharger, and MASC/Supercharger named failure-trigger behavior as integrated

### Requirement: Source-Backed Active MASC/Supercharger Run Movement Boundary

Runner movement validation SHALL consume explicit active `activeMASC` and `activeSupercharger` BattleMech combat state when calculating running and sprinting movement capability. A single active MASC or Supercharger SHALL double the effective walk MP for run validation and validate Sprint MP against `ceil(effectiveWalkMP * 2.5)`, and active MASC plus active Supercharger SHALL validate run movement against `ceil(effectiveWalkMP * 2.5)` and Sprint movement against `effectiveWalkMP * 3`. Runner movement SHALL queue the corresponding MASC and/or Supercharger failure PSR triggers when an explicit active booster is used for running or sprinting movement. TacOps Evade SHALL remain run-based but SHALL use the unboosted run MP envelope rather than the MASC/Supercharger-boosted run capability. Those pending PSRs SHALL carry source-backed fixed target numbers from explicit `mascTurnsUsed` and `superchargerTurnsUsed` prior-use state, selecting the standard table `[3, 5, 7, 11, 13, 13, 13]`, the `alternate_masc` table `[0, 3, 5, 7, 11, 13, 13, 13]`, or the `alternate_masc_enhanced` table `[0, 3, 3, 5, 7, 11, 13, 13, 13]` with enhanced taking precedence when both options are enabled. MASC/Supercharger activation failure PSRs SHALL use the named `masc_failure` or `supercharger_failure` trigger source rather than a synthetic `movement-step:0` trigger source because these checks are queued before the committed movement-step event is replayed; this slice SHALL NOT claim fully simulated mid-path damage interruption. When a runner `MASCFailure` or `SuperchargerFailure` check fails and the pilot has `edge_when_masc_fails` plus remaining Edge, runner PSR resolution SHALL spend one Edge point and reroll the failed check before applying fall or movement-enhancement failure aftermath. When the Edge reroll passes, the original failed roll SHALL be marked superseded and no fall or movement-enhancement failure aftermath SHALL occur. When a final runner `MASCFailure` check fails, runner PSR resolution SHALL apply one critical-slot hit to each leg from the current critical-slot manifest and SHALL NOT destroy the MASC system. When a final runner `SuperchargerFailure` check fails, runner PSR resolution SHALL destroy the Supercharger slot when present, roll the source-backed 2d6 engine critical table (`<=7` no engine hits, `8-9` one hit, `10-11` two hits, `12` three hits), and apply resulting engine critical slots in the center torso. At turn reset, runner state SHALL advance the used booster's prior-use counter, clear active booster use, and decay idle prior-use counters. IndustrialMek/support-unit supercharger adjustment and non-BattleMech Supercharger motive-damage branches SHALL remain outside this BattleMech validation slice.

#### Scenario: Active MASC expands run validation and queues a failure PSR

- **GIVEN** a BattleMech has `hasMASC: true`, `activeMASC: true`, and base walk/run MP `4/6`
- **WHEN** the runner validates an 8 MP running movement
- **THEN** the movement SHALL be accepted with 8 MP used
- **AND** the unit SHALL receive a pending `MASCFailure` PSR with fixed target number 3
- **AND** the movement-enhancement catalog SHALL mark the core MASC row and named failure-trigger behavior integrated with MegaMek source anchors
- **AND** the PSR trigger catalog SHALL mark the MASC failure trigger integrated because standard, alternate, alternate-enhanced, and named trigger-source concerns are represented for this BattleMech slice

#### Scenario: Failed MASC check applies leg critical damage

- **GIVEN** a BattleMech has active MASC and a pending `MASCFailure` PSR
- **WHEN** runner PSR resolution fails that check
- **THEN** one hittable critical slot in each leg SHALL be marked destroyed through the critical-slot manifest
- **AND** critical-hit events SHALL identify the destroyed leg slots
- **AND** the unit SHALL retain installed MASC state

#### Scenario: Failed Supercharger check applies engine-table damage

- **GIVEN** a BattleMech has active Supercharger and a pending `SuperchargerFailure` PSR
- **WHEN** runner PSR resolution fails that check and the Supercharger engine-damage roll is 12
- **THEN** the Supercharger critical slot SHALL be marked destroyed when present
- **AND** three center-torso engine critical slots SHALL be marked destroyed
- **AND** the unit SHALL be marked destroyed from engine destruction
- **AND** the PSR trigger catalog SHALL mark the Supercharger failure trigger integrated because named trigger-source behavior is represented for this BattleMech slice, while IndustrialMek/support-unit adjustments and non-BattleMech motive-damage behavior remain outside this BattleMech validation slice

#### Scenario: Edge reroll suppresses movement-enhancement failure aftermath

- **GIVEN** a BattleMech has `edge_when_masc_fails`, one remaining Edge point, and a pending `MASCFailure` or `SuperchargerFailure` PSR
- **WHEN** the first failure check fails and the Edge reroll passes
- **THEN** one Edge point SHALL be spent
- **AND** the original failed PSR result SHALL be marked superseded
- **AND** the rerolled PSR result SHALL be marked as an Edge reroll
- **AND** the unit SHALL NOT fall or receive movement-enhancement failure aftermath

#### Scenario: Active MASC and Supercharger combine for boosted run validation

- **GIVEN** a BattleMech has `activeMASC: true`, `activeSupercharger: true`, and base walk/run MP `4/6`
- **WHEN** the runner validates a 10 MP running movement
- **THEN** the movement SHALL be accepted with 10 MP used
- **AND** the unit SHALL receive pending `MASCFailure` and `SuperchargerFailure` PSRs
- **AND** a BattleMech with installed but inactive MASC SHALL NOT receive expanded run MP

#### Scenario: Prior active booster use raises fixed failure target numbers

- **GIVEN** a BattleMech has `activeMASC: true`, `activeSupercharger: true`, `mascTurnsUsed: 2`, `superchargerTurnsUsed: 3`, and base walk/run MP `4/6`
- **WHEN** the runner validates a 10 MP running movement
- **THEN** the movement SHALL be accepted with 10 MP used
- **AND** the unit SHALL receive a pending `MASCFailure` PSR with fixed target number 7
- **AND** the unit SHALL receive a pending `SuperchargerFailure` PSR with fixed target number 11

#### Scenario: Turn reset advances and decays booster prior-use counters

- **GIVEN** a BattleMech ended the previous movement phase with explicit active MASC and Supercharger use
- **WHEN** the runner resets state for the next turn
- **THEN** MASC and Supercharger prior-use counters SHALL advance
- **AND** active MASC and Supercharger use SHALL clear before the next movement phase
- **AND** a later idle reset SHALL decay those counters using the source-backed MegaMek idle-decay marker

### Requirement: Source-Backed Partial Wing Jump Movement

Runner movement validation SHALL consume explicit BattleMech `partialWingJumpBonus` state when calculating jump movement capability and jump heat. Partial Wing SHALL follow MegaMek's source-backed sequence: apply the explicit bonus only when the unit already has positive base jump MP, expand jump MP by that bonus, and subtract the bonus from generated jump heat before the minimum jump-heat floor is applied. Atmosphere-specific Partial Wing bonuses and damaged/bad torso critical-slot refinements SHALL remain explicit gaps until combat state hydrates those source-backed conditions.

#### Scenario: Partial Wing expands jump validation and reduces jump heat

- **GIVEN** a BattleMech has `partialWingJumpBonus: 2` and base jump MP 3
- **WHEN** the runner validates a 5 MP jumping movement
- **THEN** the movement SHALL be accepted with 5 MP used
- **AND** generated jump heat SHALL subtract the Partial Wing bonus before applying the minimum jump heat floor
- **AND** the movement-enhancement catalog SHALL mark Partial Wing movement as integrated with MegaMek source anchors

#### Scenario: Partial Wing does not create jump capability

- **GIVEN** a BattleMech has `partialWingJumpBonus: 2` and base jump MP 0
- **WHEN** the runner validates a jumping movement
- **THEN** the movement SHALL be rejected as unable to jump

### Requirement: Source-Backed Dodge Maneuver To-Hit

Runner ranged to-hit validation SHALL apply Dodge Maneuver as a +2 target modifier only when the target has the source-backed Dodge Maneuver SPA and is explicitly dodging. Both canonical `dodge_maneuver` and legacy `dodge-maneuver` ids SHALL resolve through the SPA canonicalization layer. When target unit type is explicit, non-Mek targets SHALL NOT receive the Dodge Maneuver target modifier.

#### Scenario: Dodging Mek target applies Dodge Maneuver

- **GIVEN** a ranged weapon attack targets a BattleMech with `dodge_maneuver`
- **AND** the target has `isDodging: true`
- **WHEN** the runner emits `AttackDeclared`
- **THEN** the declared to-hit number SHALL include a +2 `Dodge Maneuver` SPA modifier

#### Scenario: Non-dodging or non-Mek targets do not apply Dodge Maneuver

- **GIVEN** a ranged weapon attack targets a unit with `dodge_maneuver`
- **WHEN** the target is not explicitly dodging
- **THEN** the declared to-hit number SHALL NOT include a `Dodge Maneuver` modifier
- **WHEN** the target unit type is explicit and is not a Mek type
- **THEN** the declared to-hit number SHALL NOT include a `Dodge Maneuver` modifier

### Requirement: Source-Backed Jump Attack SPA To-Hit Relief

Ranged to-hit validation SHALL apply MegaMek's jump-attacker SPA relief: Jumping Jack reduces the attacker's jump movement penalty from +3 to +1, Hopping Jack reduces it from +3 to +2, and plain jump movement remains +3. Both canonical (`jumping_jack`, `hopping_jack`) and legacy (`jumping-jack`, `hopping-jack`) ids SHALL resolve through the SPA canonicalization layer. If both jump SPAs are present, Jumping Jack SHALL take precedence.

#### Scenario: Jumping Jack applies stronger jump attacker relief

- **GIVEN** a ranged weapon attack is declared by an attacker with `jumping_jack`
- **AND** the attacker moved by jumping this turn
- **WHEN** the to-hit number is computed
- **THEN** the declared to-hit number SHALL include a `Jumping Jack` SPA modifier of `-2`
- **AND** the net attacker jump movement penalty SHALL be +1

#### Scenario: Hopping Jack applies lighter jump attacker relief

- **GIVEN** a ranged weapon attack is declared by an attacker with `hopping_jack`
- **AND** the attacker moved by jumping this turn
- **WHEN** the to-hit number is computed
- **THEN** the declared to-hit number SHALL include a `Hopping Jack` SPA modifier of `-1`
- **AND** the net attacker jump movement penalty SHALL be +2

#### Scenario: Non-jumping attackers do not consume jump SPAs

- **GIVEN** a ranged weapon attack is declared by an attacker with `hopping_jack` or `jumping_jack`
- **WHEN** the attacker did not jump this turn
- **THEN** no jump-attack SPA modifier SHALL apply

### Requirement: Source-Backed VDNI And Buffered VDNI Target Numbers

Ranged to-hit validation SHALL apply MegaMek's Manei Domini neural-interface target-number modifier: attackers with canonical `vdni` or `bvdni` SHALL receive a named `VDNI` `-1` ranged attack modifier, and explicit `neuralInterfaceActive: false` state SHALL suppress that relief. Piloting skill roll validation SHALL apply the MegaMek VDNI piloting-roll modifier only for canonical `vdni`; `bvdni` SHALL NOT receive the VDNI piloting-roll relief, and explicit disconnected neural-interface state SHALL suppress the VDNI piloting relief. Canonical VDNI and Buffered VDNI scope SHALL include replayable `NeuralInterfaceStateChanged` jack-in/jack-out state transitions plus represented neural-feedback side effects, so those canonical rows SHALL NOT remain unresolved once the lifecycle event and reducer are covered. The represented Triple-Core Processor aimed-shot and initiative slices SHALL prove called-shot Targeting Computer `-1` relief and initiative bonuses only when Triple-Core Processor is paired with active VDNI or Buffered VDNI, and SHALL suppress represented TCP relief when `neuralInterfaceActive` is false. Actual mounted Targeting Computer equipment SHALL hydrate into explicit combat state independently of Triple-Core Processor SPA state, apply the source-backed `Targeting Computer` modifier without needing TCP, and SHALL NOT double-apply that modifier when TCP aimed-shot eligibility is also present. Canonical `triple_core_processor` SHALL NOT remain an unresolved BattleMech SPA blocker once represented initiative, aimed-shot relief, disconnected neural-interface suppression, neural-interface lifecycle state, and actual Targeting Computer equipment state all have runner or shared to-hit evidence.

Prototype DNI validation SHALL apply current MegaMek source-backed BattleMech executable behavior: attackers with canonical `proto_dni` SHALL receive a named `Prototype DNI` `-2` ranged attack modifier, BattleMech PSRs for canonical `proto_dni` SHALL receive a named `Prototype DNI` `-3` piloting target-number modifier, and explicit `neuralInterfaceActive: false` state SHALL suppress both effects. Canonical `proto_dni` SHALL share replayable `NeuralInterfaceStateChanged` jack-in/jack-out state transitions because current MegaMek includes `proto_dni` in active-DNI detection. Current MegaMek option text mentions Prototype DNI damage feedback, but the executable damage-feedback branch checks active DNI plus `MD_VDNI` and does not branch on `MD_PROTO_DNI`; MekStation SHALL document that source-text/runtime mismatch and SHALL NOT infer VDNI neural-feedback pilot damage for Prototype DNI from option text alone.

#### Scenario: VDNI and Buffered VDNI apply ranged to-hit relief

- **GIVEN** a ranged weapon attack is declared by an attacker with `vdni` or `bvdni`
- **WHEN** the runner emits `AttackDeclared`
- **THEN** the declared to-hit number SHALL include a `VDNI` SPA modifier of `-1`
- **AND** the pilot modifier resolver catalog SHALL track this as integrated support backed by represented canonical VDNI/BVDNI lifecycle state

#### Scenario: VDNI applies piloting relief but Buffered VDNI does not

- **GIVEN** a BattleMech with `vdni` resolves a piloting skill roll
- **WHEN** the PSR target number is computed
- **THEN** the PSR target number SHALL include a `VDNI` SPA modifier of `-1`
- **GIVEN** a BattleMech with `bvdni` resolves the same PSR
- **WHEN** the PSR target number is computed
- **THEN** the PSR target number SHALL NOT include a `VDNI` piloting modifier
- **AND** the parent canonical VDNI/BVDNI rows SHALL remain integrated when `NeuralInterfaceStateChanged` jack-in/jack-out lifecycle replay and represented neural-feedback side effects are covered

#### Scenario: Prototype DNI applies represented target-number relief and active-DNI lifecycle

- **GIVEN** a ranged weapon attack is declared by an attacker with `proto_dni`
- **WHEN** the runner emits `AttackDeclared`
- **THEN** the declared to-hit number SHALL include a `Prototype DNI` SPA modifier of `-2`
- **GIVEN** a BattleMech with `proto_dni` resolves a piloting skill roll
- **WHEN** the PSR target number is computed
- **THEN** the PSR target number SHALL include a `Prototype DNI` SPA modifier of `-3`
- **AND** explicit disconnected neural-interface state SHALL suppress both represented Prototype DNI target-number modifiers
- **AND** `pilotSkills.pilotModifierResolvers.proto-dni-ranged-to-hit-application` and `pilotSkills.pilotModifierResolvers.proto-dni-piloting-target-number-application` SHALL be integrated
- **AND** `NeuralInterfaceStateChanged` replay SHALL update represented Prototype DNI active-DNI state
- **AND** Prototype DNI internal damage SHALL NOT emit VDNI neural-feedback pilot damage unless a future source-backed executable branch explicitly consumes `MD_PROTO_DNI`
- **AND** `featureSupport.canonicalPilotAbilityScope.proto_dni` SHALL be integrated for current executable BattleMech behavior while preserving the option-text/runtime damage-feedback mismatch in source references

### Requirement: Source-Backed Comm Implant Indirect-Fire Spotter Relief

Indirect-fire validation SHALL apply current MegaMek source-backed Comm Implant behavior for represented LOS spotter indirect LRM target-number relief: an elected LOS spotter with canonical `comm_implant` or `boost_comm_implant` SHALL reduce the net indirect-fire spotter penalty by 1, after base indirect-fire, represented spotter movement, represented spotter-attacked, Forward Observer, and Oblique Attacker modifiers are composed. NARC, iNARC, and semi-guided TAG indirect-fire paths SHALL NOT receive comm-implant relief because they do not elect a LOS spotter. `boost_comm_implant` SHALL also hydrate represented BattleMech C3i access into conservative C3i network seeding, subject to the same singleton, oversized, mixed-family, and manual-authoring failure boundaries as mounted C3i equipment. Non-LRM artillery spotting belongs in an artillery validation matrix, and current MegaMek minefield detonation relief is Infantry-only and SHALL remain outside the BattleMech SPA resolver scope.

#### Scenario: Comm Implant applies represented indirect-fire spotter relief without closing canonical rows

- **GIVEN** an indirect LRM attack elects a friendly LOS spotter with `comm_implant`
- **WHEN** the indirect-fire penalty is computed
- **THEN** the represented comm-implant relief SHALL reduce the net indirect-fire spotter penalty by 1
- **GIVEN** the elected LOS spotter has `boost_comm_implant`
- **WHEN** the same indirect-fire penalty is computed
- **THEN** the represented boosted comm-implant relief SHALL reduce the net indirect-fire spotter penalty by 1
- **AND** `pilotSkills.pilotModifierResolvers.comm-implant-indirect-fire-spotter-application` SHALL be integrated
- **AND** `featureSupport.canonicalPilotAbilityScope.comm_implant` and `featureSupport.canonicalPilotAbilityScope.boost_comm_implant` SHALL be integrated for their represented BattleMech weapon-attack and C3i-network behavior while non-LRM artillery spotting and Infantry-only minefield relief stay split outside this BattleMech combat matrix

### Requirement: Source-Backed Eagle Eyes Active-Probe Range And Minefield Relief

Electronic-warfare and terrain validation SHALL apply MegaMek's Eagle Eyes BattleMech effects only through represented active-probe ECM-counter range and represented minefield detonation target-number relief. Hydrated BattleMech state with canonical `eagle_eyes` SHALL seed active probes with a one-hex `eagleEyesRangeBonus`, and active-probe ECM countering SHALL consume that bonus without changing baseline probe ranges. Represented BattleMech `TerrainType.Mines` and `IGameState.minefields` coordinate-state entry rolls SHALL add Eagle Eyes `+2` detonation target-number relief before explicit per-leg damage and PSR fallout. Represented `IGameState.minefields` coordinate entries SHALL preserve optional density, apply MegaMek-aligned density trigger targets before Eagle Eyes relief, reduce represented conventional, inferno, or active density by one 5-point step when the source-backed post-detonation density-reduction roll succeeds, support explicit inferno density entry as pending external heat plus `infernoBurning` without conventional leg damage, support represented active ground-entry suppression without movement damage or minefield state side effects, support represented BattleMech jump-entry active mine triggering through explicit per-leg damage plus MinefieldChanged detonation/reduction state, support represented vibrabomb density/setting triggers through BattleMech tonnage-gated same-hex and proximity detonation behavior, support manual conventional and command-detonated detonation as replayable no-damage/PSR MinefieldChanged state transitions, support explicit conventional clearing/mine-sweeper density reduction or removal plus supplied-map collateral reset as replayable no-damage/PSR MinefieldChanged state transitions, and fail closed for unsupported typed non-conventional coordinate-state data without movement damage or minefield state side effects. Represented EMP coordinate entries SHALL preserve their type, density, and setting while failing closed with no movement damage, no PSRs, and no `MinefieldChanged` side effects. MegaMek EMP target/electronics effects SHALL remain tracked by exact `ruleSupport.terrainEnvironment.minefield-emp-effects`; inferno controls beyond represented density external-heat entry and fail-closed guards SHALL remain tracked by `ruleSupport.terrainEnvironment.minefield-inferno-residual-controls` instead of by the canonical Eagle Eyes row.

#### Scenario: Eagle Eyes extends represented active-probe ECM countering

- **GIVEN** a hydrated BattleMech has an active probe and canonical `eagle_eyes`
- **WHEN** runner initial state builds represented electronic-warfare state
- **THEN** the active probe SHALL carry an Eagle Eyes range-bonus marker
- **WHEN** Guardian ECM is one hex beyond the probe's baseline counter range
- **THEN** represented active-probe ECM countering SHALL treat the ECM as countered
- **AND** the `pilotSkills.pilotModifierResolvers.eagle-eyes-active-probe-range-application` row SHALL be integrated

#### Scenario: Eagle Eyes raises represented minefield detonation target numbers

- **GIVEN** a BattleMech with canonical `eagle_eyes` enters a represented `TerrainType.Mines` hex
- **WHEN** the minefield detonation roll is one below the Eagle Eyes-adjusted target number but would detonate without Eagle Eyes
- **THEN** no represented minefield leg damage or minefield PSR fallout SHALL be applied
- **AND** the `pilotSkills.pilotModifierResolvers.eagle-eyes-minefield-detonation-application` row SHALL be integrated
- **AND** the broad `featureSupport.canonicalPilotAbilityScope.eagle_eyes` row SHALL be integrated while hidden/reveal and minefield-variant side paths remain explicit gaps elsewhere

### Requirement: Source-Aligned Environmental Specialist Designation Options

Environmental Specialist designation validation SHALL expose MegaMek CustomMekDialog's runtime-consumed Fog, Light, Rain, Snow, and Wind choices through the canonical SPA picker contract while preserving the terrain-shaped pilot designation payload consumed by represented combat resolvers. Generic terrain-designated SPAs SHALL continue to use the generic terrain option list, and generic terrain-only values such as vacuum, underground, and low_gravity SHALL NOT count as Environmental Specialist source coverage. Hail SHALL NOT be exposed as a source-backed picker option or represented modifier unless local MegaMek source adds a Hail-specific option and runtime branch. The broad `featureSupport.canonicalPilotAbilityScope.env_specialist` row SHALL be integrated for source-backed BattleMech to-hit behavior once represented Fog/Snow/Rain/Wind/Light ranged relief and Light physical relief are covered, because the pinned MegaMek runtime path consumes Environmental Specialist as to-hit behavior rather than BattleMech movement or PSR behavior.

#### Scenario: Environmental Specialist picker exposes source-backed environment choices

- **GIVEN** the canonical `env_specialist` SPA requires a terrain-shaped designation
- **WHEN** the designation picker resolves options for `env_specialist`
- **THEN** the options SHALL be exactly Fog, Light, Rain, Snow, and Wind
- **AND** the options SHALL NOT include vacuum, underground, or low_gravity
- **AND** the designation kind SHALL remain terrain-shaped so existing combat designation hydration can pass the selected environment into to-hit state

#### Scenario: Generic terrain designation options stay separate from Environmental Specialist

- **GIVEN** a terrain-designated SPA other than `env_specialist`
- **WHEN** the designation registry resolves generic terrain options
- **THEN** the generic terrain list SHALL remain available for terrain-oriented SPA selections
- **AND** generic terrain coverage SHALL NOT be cited as Environmental Specialist Fog/Light/Rain/Snow/Wind source coverage

### Requirement: Source-Backed Environmental Specialist Represented Ranged To-Hit

Ranged to-hit validation SHALL apply MegaMek's Environmental Specialist relief only for represented ranged weather and light slices. Attackers with canonical `env_specialist` and an explicit fog terrain/environment designation SHALL receive a named `Environmental Specialist (Fog)` `-1` ranged attack modifier when the weapon is an energy weapon and represented fog state is heavy fog. Attackers with canonical `env_specialist` and an explicit snow terrain/environment designation SHALL receive a named `Environmental Specialist (Snow)` `-1` ranged attack modifier when represented weather state is snow. Attackers with canonical `env_specialist` and an explicit rain terrain/environment designation SHALL receive a named `Environmental Specialist (Rain)` `-1` ranged attack modifier when represented weather state is heavy rain. Attackers with canonical `env_specialist` and an explicit wind terrain/environment designation SHALL receive a named `Environmental Specialist (Wind)` `-1` ranged attack modifier when the weapon is a missile weapon and represented wind state is moderate. Attackers with canonical `env_specialist` and an explicit light terrain/environment designation SHALL receive a named `Environmental Specialist (Light)` `-1` ranged attack modifier only when target illumination state is explicit and represented light state matches MegaMek's Light Specialist ranged gates: unilluminated targets in dusk, full moon, glare, moonless, solar flare, or pitch black, or illuminated targets in pitch black. Hail designations SHALL NOT produce a represented ranged to-hit modifier because current local MegaMek source registers the constant but does not expose or consume a Hail specialist branch. Light rain's conventional-infantry branch, strong-wind branches beyond the represented moderate missile case, unhydrated illumination producers, and unsupported terrain/environment designation values SHALL stay explicit exclusions without demoting the integrated `featureSupport.canonicalPilotAbilityScope.env_specialist` BattleMech to-hit row.

#### Scenario: Environmental Specialist applies to represented heavy-fog energy ranged attacks

- **GIVEN** a ranged weapon attack is declared by an attacker with canonical `env_specialist`
- **AND** the pilot has explicitly designated fog
- **AND** the weapon is an energy weapon
- **AND** the represented fog state is heavy fog
- **WHEN** the runner computes the attack to-hit number
- **THEN** the declared to-hit number SHALL include an `Environmental Specialist (Fog)` modifier of `-1`
- **AND** the `pilotSkills.pilotModifierResolvers.env-specialist-fog-ranged-to-hit-application` row SHALL be integrated
- **AND** the broad `featureSupport.canonicalPilotAbilityScope.env_specialist` row SHALL be integrated for source-backed BattleMech to-hit behavior while unsupported Environmental Specialist environments remain excluded from represented modifier coverage

#### Scenario: Source-registered Hail does not create represented ranged relief

- **GIVEN** a ranged weapon attack is declared by an attacker with canonical `env_specialist`
- **AND** persisted or hand-authored designation state selects Hail
- **AND** the represented weather, fog, wind, and light state would otherwise satisfy represented Environmental Specialist branches
- **WHEN** the runner computes the attack to-hit number
- **THEN** the declared to-hit number SHALL NOT include an Environmental Specialist Hail modifier
- **AND** Hail SHALL remain tracked as a source-registered-but-unconsumed exclusion under `featureSupport.canonicalPilotAbilityScope.env_specialist` rather than a represented modifier

#### Scenario: Environmental Specialist applies to represented snow ranged attacks

- **GIVEN** a ranged weapon attack is declared by an attacker with canonical `env_specialist`
- **AND** the pilot has explicitly designated snow
- **AND** the represented weather state is snow
- **WHEN** the runner computes the attack to-hit number
- **THEN** the declared to-hit number SHALL include an `Environmental Specialist (Snow)` modifier of `-1`
- **AND** the `pilotSkills.pilotModifierResolvers.env-specialist-snow-ranged-to-hit-application` row SHALL be integrated
- **AND** the broad `featureSupport.canonicalPilotAbilityScope.env_specialist` row SHALL be integrated for source-backed BattleMech to-hit behavior while unsupported Environmental Specialist environments remain excluded from represented modifier coverage

#### Scenario: Environmental Specialist applies to represented heavy-rain ranged attacks

- **GIVEN** a ranged weapon attack is declared by an attacker with canonical `env_specialist`
- **AND** the pilot has explicitly designated rain
- **AND** the represented weather state is heavy rain
- **WHEN** the runner computes the attack to-hit number
- **THEN** the declared to-hit number SHALL include an `Environmental Specialist (Rain)` modifier of `-1`
- **AND** the `pilotSkills.pilotModifierResolvers.env-specialist-rain-ranged-to-hit-application` row SHALL be integrated
- **AND** the broad `featureSupport.canonicalPilotAbilityScope.env_specialist` row SHALL be integrated for source-backed BattleMech to-hit behavior while unsupported Environmental Specialist environments remain excluded from represented modifier coverage

#### Scenario: Environmental Specialist applies to represented moderate-wind missile ranged attacks

- **GIVEN** a ranged weapon attack is declared by an attacker with canonical `env_specialist`
- **AND** the pilot has explicitly designated wind
- **AND** the weapon is a missile weapon
- **AND** the represented wind state is moderate
- **WHEN** the runner computes the attack to-hit number
- **THEN** the declared to-hit number SHALL include an `Environmental Specialist (Wind)` modifier of `-1`
- **AND** the `pilotSkills.pilotModifierResolvers.env-specialist-wind-ranged-to-hit-application` row SHALL be integrated
- **AND** the broad `featureSupport.canonicalPilotAbilityScope.env_specialist` row SHALL be integrated for source-backed BattleMech to-hit behavior while unsupported Environmental Specialist environments remain excluded from represented modifier coverage

#### Scenario: Environmental Specialist applies to represented light ranged attacks

- **GIVEN** a ranged weapon attack is declared by an attacker with canonical `env_specialist`
- **AND** the pilot has explicitly designated light
- **AND** the represented light state is glare
- **AND** the target carries explicit `isIlluminated: false` combat state
- **WHEN** the runner computes the attack to-hit number
- **THEN** the declared to-hit number SHALL include an `Environmental Specialist (Light)` modifier of `-1`
- **AND** the `pilotSkills.pilotModifierResolvers.env-specialist-light-ranged-to-hit-application` row SHALL be integrated
- **AND** an illuminated target in pitch-black represented light SHALL also receive the same `Environmental Specialist (Light)` modifier
- **AND** missing target illumination state SHALL fail closed without applying the Light Specialist modifier
- **AND** the broad `featureSupport.canonicalPilotAbilityScope.env_specialist` row SHALL be integrated for source-backed BattleMech to-hit behavior while unsupported Environmental Specialist environments remain excluded from represented modifier coverage

#### Scenario: Environmental Specialist represented ranged relief is not generalized

- **GIVEN** a ranged weapon attack is declared by an attacker with `env_specialist`
- **WHEN** the attacker has no snow designation
- **THEN** no Environmental Specialist snow modifier SHALL apply
- **WHEN** the represented weather state is not snow
- **THEN** no Environmental Specialist snow modifier SHALL apply
- **WHEN** the attacker has no rain designation
- **THEN** no Environmental Specialist rain modifier SHALL apply
- **WHEN** the represented weather state is light rain
- **THEN** no Environmental Specialist rain modifier SHALL apply
- **WHEN** the weapon is not an energy weapon
- **THEN** no Environmental Specialist fog modifier SHALL apply
- **WHEN** the represented fog state is light fog
- **THEN** no Environmental Specialist fog modifier SHALL apply
- **WHEN** the weapon is not a missile weapon
- **THEN** no Environmental Specialist wind modifier SHALL apply
- **WHEN** the represented wind state is strong
- **THEN** no Environmental Specialist wind modifier SHALL apply
- **WHEN** the attacker has no light designation
- **THEN** no Environmental Specialist Light modifier SHALL apply
- **WHEN** target illumination state is missing
- **THEN** no Environmental Specialist Light modifier SHALL apply
- **WHEN** the target is illuminated outside pitch black
- **THEN** no Environmental Specialist Light modifier SHALL apply

### Requirement: Source-Backed Environmental Specialist Light Physical To-Hit

Physical to-hit validation SHALL apply MegaMek's Environmental Specialist Light relief only for the represented physical helper slice. Attackers with canonical `env_specialist` and an explicit light terrain/environment designation SHALL receive a named `Environmental Specialist (Light)` `-1` physical attack modifier when represented light state is moonless, solar flare, or pitch black and the target is explicitly unilluminated. The broad `featureSupport.canonicalPilotAbilityScope.env_specialist` row SHALL be integrated for represented BattleMech ranged and Light physical to-hit behavior while broader illumination producers and unsupported designation values remain explicit exclusions.

#### Scenario: Environmental Specialist Light applies to represented physical to-hit

- **GIVEN** a physical attack to-hit calculation for an attacker with canonical `env_specialist`
- **AND** the pilot has explicitly designated light
- **AND** represented environmental light state is moonless, solar flare, or pitch black
- **AND** target illumination state is explicit and false
- **WHEN** the physical to-hit number is computed
- **THEN** the to-hit number SHALL include an `Environmental Specialist (Light)` modifier of `-1`
- **AND** the `pilotSkills.pilotModifierResolvers.env-specialist-light-physical-to-hit-application` row SHALL be integrated
- **AND** the broad `featureSupport.canonicalPilotAbilityScope.env_specialist` row SHALL be integrated for represented BattleMech ranged and Light physical to-hit behavior while unsupported Environmental Specialist environments remain excluded from represented modifier coverage

#### Scenario: Environmental Specialist Light physical relief is not generalized

- **GIVEN** a physical attack to-hit calculation for an attacker with `env_specialist`
- **WHEN** the attacker has no light designation
- **THEN** no Environmental Specialist Light physical modifier SHALL apply
- **WHEN** represented environmental light state is outside the represented dark-light set
- **THEN** no Environmental Specialist Light physical modifier SHALL apply
- **WHEN** target illumination state is true
- **THEN** no Environmental Specialist Light physical modifier SHALL apply

### Requirement: Source-Backed Terrain Master Frogman Physical To-Hit

Physical to-hit validation SHALL apply MegaMek's Terrain Master: Frogman relief as a `-1` to-hit modifier only when the attacker has canonical `tm_frogman` or legacy `terrain-master-frogman`, the attacker is a Mek or ProtoMek, and the attacker occupies water deeper than level 1. Runner and event-sourced physical resolution SHALL derive or accept attacker water depth without using target-only water. Terrain Master source-backed variant coverage includes Frogman water-entry, Mountaineer rubble-entry plus movement-cost relief, Forest Ranger defender to-hit, Swamp Beast defender to-hit, and Swamp Beast bog-down relief. The local generic `terrain-master` helper row SHALL remain out-of-scope because MegaMek registers variant ids rather than a generic `terrain_master` option. Source-backed Nightwalker low-light movement behavior SHALL remain a canonical helper-only row: represented coarse low-light movement relief is covered, while finer light-state and LAM airborne gates remain explicit gaps.

#### Scenario: Frogman applies in depth-2 attacker water

- **GIVEN** a physical attack is declared by a BattleMech or ProtoMech attacker with `tm_frogman`
- **AND** the attacker occupies depth-2 or deeper water
- **WHEN** the physical to-hit number is computed
- **THEN** the to-hit number SHALL include a `Frogman` SPA modifier of `-1`

#### Scenario: Frogman does not apply from shallow, target-only, or non-Mek state

- **GIVEN** a physical attack is declared by an attacker with `tm_frogman`
- **WHEN** the attacker occupies depth-1 or shallower water
- **THEN** no `Frogman` modifier SHALL apply
- **WHEN** only the target occupies water
- **THEN** no `Frogman` modifier SHALL apply
- **WHEN** the attacker unit type is explicit and is neither Mek nor ProtoMek
- **THEN** no `Frogman` modifier SHALL apply

### Requirement: Source-Backed Terrain Master Frogman Water-Entry PSR

Movement PSR validation SHALL apply MegaMek's water-entry depth modifier when a runner movement step enters water with a known level: depth 1 SHALL apply `-1`, depth 2 SHALL apply `0`, and depth 3 or deeper SHALL apply `+1`. The PSR resolver SHALL also apply Terrain Master: Frogman as a named `-1` SPA modifier only when the pending PSR is an entering-water PSR, the water depth is greater than 1, the acting unit has canonical `tm_frogman` or legacy `terrain-master-frogman`, and the acting unit is a Mek or ProtoMek. Frogman SHALL NOT apply to exiting-water PSRs, shallow water, non-water terrain PSRs, or explicit non-Mek/non-ProtoMek units.

#### Scenario: Frogman applies to depth-2 water-entry PSR

- **GIVEN** a BattleMech or ProtoMech with `tm_frogman`
- **AND** a movement step enters depth-2 or deeper water
- **WHEN** the pending entering-water PSR is resolved
- **THEN** the PSR target number SHALL include a `Frogman` SPA modifier of `-1`

#### Scenario: Water-depth modifier is queued from complex terrain

- **GIVEN** a runner movement step enters a water terrain feature with a known level
- **WHEN** the terrain movement PSR is queued
- **THEN** the pending entering-water PSR SHALL retain the water depth
- **AND** the PSR trigger modifier SHALL match MegaMek's depth 1 `-1`, depth 2 `0`, and depth 3+ `+1` table

#### Scenario: Frogman water-entry boundaries

- **GIVEN** a pending entering-water PSR for a unit with `tm_frogman`
- **WHEN** the water depth is 1 or lower
- **THEN** no `Frogman` PSR modifier SHALL apply
- **WHEN** the unit type is explicit and is neither Mek nor ProtoMek
- **THEN** no `Frogman` PSR modifier SHALL apply
- **WHEN** the PSR reason is not entering water
- **THEN** no `Frogman` PSR modifier SHALL apply

### Requirement: Source-Backed Terrain Master Mountaineer Movement And Rubble-Entry PSR

Movement PSR validation SHALL apply MegaMek's Terrain Master: Mountaineer relief as a named `-1` SPA modifier only when the pending PSR is an entering-rubble PSR and the acting unit has canonical `tm_mountaineer` or legacy `terrain-master-mountaineer`. BattleMech movement pricing SHALL also apply Mountaineer rough/rubble terrain MP relief and upward-elevation MP relief when unit pilot abilities include `tm_mountaineer` or legacy `terrain-master-mountaineer`. Runner movement validation, interactive movement, P2P movement intent validation, pathfinding, and reachable movement previews SHALL consume the same movement-cost context so committed movement and previews agree.

#### Scenario: Mountaineer applies to entering-rubble PSR

- **GIVEN** a unit with `tm_mountaineer`
- **AND** the unit has a pending entering-rubble PSR
- **WHEN** the PSR target number is computed
- **THEN** the PSR target number SHALL include a `Mountaineer` SPA modifier of `-1`

#### Scenario: Mountaineer rubble-entry boundaries

- **GIVEN** a unit with `tm_mountaineer`
- **WHEN** the pending PSR reason is not entering rubble
- **THEN** no `Mountaineer` PSR modifier SHALL apply

#### Scenario: Mountaineer movement-cost relief

- **GIVEN** a unit with `tm_mountaineer`
- **WHEN** the unit validates ground movement into rough or rubble terrain
- **THEN** the terrain entry MP surcharge SHALL be reduced by 1 and never below 0
- **WHEN** the unit validates ground movement up 1 or 2 elevation levels
- **THEN** the upward-elevation MP surcharge SHALL be reduced by 1 and never below 0
- **AND** the normal impassable climb cap for upward elevation changes greater than 2 SHALL still apply
- **AND** runner movement, interactive movement, P2P movement validation, pathfinding, and reachable previews SHALL report the same reduced MP cost

### Requirement: Source-Backed Swamp Bog-Down Stuck State

Terrain PSR validation SHALL queue MegaMek's BattleMech swamp bog-down rule as a stuck-state PSR when a BattleMech-like unit enters swamp by ground movement. The catalog SHALL NOT model swamp bog-down as a normal failed-PSR fall. A failed swamp bog-down PSR SHALL emit `UnitStuck`, set `isStuck`, clear pending PSRs, and SHALL NOT emit `UnitFell` or pilot fall damage. Jumping into swamp SHALL mark BattleMech-like units stuck immediately without queueing a fall PSR. Terrain Master: Swamp Beast bog-down relief SHALL apply as `-1` to swamp bog-down PSRs. MegaMek mud bog-down SHALL remain excluded from BattleMech swamp bog-down coverage because biped and quad movement modes do not bog down in mud.

#### Scenario: Swamp bog-down queues stuck-state PSR

- **GIVEN** a BattleMech-like unit enters swamp by ground movement
- **WHEN** movement terrain PSRs are queued
- **THEN** a swamp bog-down PSR SHALL be queued with MegaMek source references
- **AND** a pilot with `tm_swamp_beast` SHALL receive a `-1` Swamp Beast bog-down modifier

#### Scenario: Failed swamp bog-down marks unit stuck

- **GIVEN** a BattleMech-like unit has a pending swamp bog-down PSR
- **WHEN** the PSR fails during runner or event-sourced PSR resolution
- **THEN** the unit SHALL be marked `isStuck`
- **AND** a `UnitStuck` event SHALL preserve the failed PSR reason and reason code
- **AND** no `UnitFell`, `PilotHit`, or fall-damage side effect SHALL be emitted for that failure

#### Scenario: Jumping into swamp marks unit stuck immediately

- **GIVEN** a BattleMech-like unit jumps into swamp
- **WHEN** the movement phase applies terrain PSR handling
- **THEN** the unit SHALL be marked `isStuck` immediately
- **AND** the terrain handling SHALL emit `UnitStuck` without queueing a normal fall PSR

#### Scenario: Mud is not promoted to a BattleMech bog-down gap

- **GIVEN** the terrain PSR support catalog is generated
- **WHEN** mud terrain support is inspected
- **THEN** mud SHALL remain integrated for the existing BattleMech movement-cost and terrain-modifier coverage

### Requirement: Source-Backed Cross-Country Scope Split

Pilot modifier validation SHALL keep MegaMek's Cross-Country SPA visible as an explicit non-BattleMech combat-vehicle movement/passability scope split. The BattleMech combat matrix SHALL NOT represent Cross-Country as a terrain PSR modifier unless a future source-backed BattleMech rule is identified. Cross-Country SHALL stay in the `out-of-scope` audit inventory until vehicle movement/passability coverage consumes it.

#### Scenario: Cross-Country is cataloged outside BattleMech PSRs

- **GIVEN** the BattleMech SPA and pilot modifier catalogs are generated
- **WHEN** Cross-Country support is inspected
- **THEN** the SPA SHALL be out-of-scope with MegaMek source references to combat-vehicle terrain movement-cost and passability behavior
- **AND** the BattleMech movement resolver family SHALL NOT assign Cross-Country while it remains vehicle-scoped
- **AND** a vehicle movement resolver family SHALL assign Cross-Country as out-of-scope audit coverage
- **AND** the PSR resolver family SHALL NOT assign Cross-Country

### Requirement: Source-Backed Heavy Lifter Carry/Throw Gap

Pilot modifier validation SHALL keep MegaMek's Heavy Lifter SPA visible as represented lift-capacity, pickup/drop carried-object lifecycle, represented throw-release lifecycle, and carried-cargo physical-legality coverage plus a helper-only throw-object action gap. The source-backed BattleMech helper behavior SHALL calculate `5%` of unit tonnage per available hand, apply the `1.5x` Heavy Lifter multiplier for canonical `hvy_lifter` and legacy `heavy-lifter` ids, then apply the active TSM pickup multiplier, author represented pickup/drop carried-object events, author represented throw-release events that place the carried object at a declared hex without damage or displacement resolution, reject overweight pickup without side effects, and lock out physical attacks for an arm represented as carrying cargo. MekStation SHALL still report missing throw-object attack/action resolution through the movement/application gap.

#### Scenario: Heavy Lifter is cataloged as lift capacity without action support

- **GIVEN** the BattleMech SPA and pilot modifier catalogs are generated
- **WHEN** Heavy Lifter support is inspected
- **THEN** the SPA SHALL expose represented MegaMek source references to BattleMech lift-capacity behavior, pickup/drop cargo behavior, per-arm carried-cargo physical legality lockout, represented throw-release events, and MekStation helper/test anchors
- **AND** the movement resolver family SHALL own the visible helper-only throw-object action/resolution gap beyond represented throw-release lifecycle
- **AND** Heavy Lifter SHALL NOT be represented as a physical damage or to-hit modifier

### Requirement: Source-Backed Zweihander Physical Slice

Physical combat validation SHALL represent MegaMek's Zweihander for explicit two-handed BattleMech punch declarations and every official standalone physical-weapon declaration. A represented declaration with canonical `zweihander`, explicit `twoHandedZweihander` state, non-prone attacker state, both represented arms present, represented per-arm hand actuator availability, no represented arm-fire lockout, and explicit off-arm upper/lower actuator state SHALL add source-backed off-arm actuator to-hit penalties, add `floor(weight / 10)` bonus damage, queue the represented miss PSR side effect, and apply represented self-critical side-effect slices. Invalid represented two-handed declarations SHALL fail before damage, displacement, miss-PSR, or self-critical side effects. Runner, event-sourced physical declarations, and the interactive physical forecast SHALL preserve the explicit two-handed flag for punch and official standalone physical weapons. Non-catalog improvised club, breakage, and broader mounted physical-weapon mode authoring SHALL remain excluded by the physical-weapon action scope split rather than being claimed by the canonical Zweihander row.

#### Scenario: Explicit two-handed Zweihander physical attacks add represented bonus damage

- **GIVEN** a BattleMech pilot has canonical `zweihander`
- **AND** a physical punch or supported physical-weapon declaration carries `twoHandedZweihander`
- **WHEN** the represented physical attack hits
- **THEN** the represented physical damage SHALL include the normal physical damage plus `floor(weight / 10)`
- **AND** runner and event-sourced physical resolution SHALL preserve the explicit two-handed declaration
- **AND** represented miss-PSR and self-critical side-effect slices SHALL remain scoped to represented punch and supported physical-weapon declarations
- **AND** the `pilotSkills.pilotModifierResolvers.zweihander-punch-physical-application` row SHALL be integrated
- **AND** the broad `featureSupport.canonicalPilotAbilityScope.zweihander` row SHALL be integrated for the represented official BattleMech physical matrix

#### Scenario: Invalid represented two-handed Zweihander declarations have no side effects

- **GIVEN** a BattleMech punch or supported physical-weapon declaration explicitly carries `twoHandedZweihander`
- **WHEN** the represented SPA, prone, both-arm-present, represented per-arm hand-actuator, or represented arm-fire prerequisite fails
- **THEN** the physical attack SHALL be invalid before target damage is applied
- **AND** the represented Zweihander miss PSR SHALL NOT be queued
- **AND** represented Zweihander self-critical side effects SHALL NOT be applied
- **AND** runner physical resolution SHALL emit the invalid physical result without damage side effects

#### Scenario: Zweihander physical slice does not imply broad two-handed support

- **GIVEN** a pilot has canonical `zweihander`
- **WHEN** a punch or supported physical-weapon declaration does not explicitly carry `twoHandedZweihander`
- **THEN** no Zweihander bonus damage SHALL apply
- **WHEN** the represented two-handed physical attack misses
- **THEN** the represented miss PSR and self-critical side-effect slices SHALL be applied when their represented prerequisites are met
- **AND** represented two-handed off-arm actuator penalties and per-arm hand-actuator gates SHALL stay scoped to the represented sibling row
- **AND** non-catalog improvised club, breakage, and broader mounted physical-weapon mode authoring SHALL remain outside the represented canonical Zweihander row and visible through the physical-weapon action scope split

### Requirement: Source-Backed Shaky Stick Ground-To-Air To-Hit

Pilot modifier validation SHALL integrate MegaMek's Shaky Stick SPA as a ground-to-air defender to-hit modifier. The ranged to-hit pipeline SHALL apply a `+1` defender modifier only when a target with Shaky Stick is airborne and the attacker is not airborne, and SHALL NOT apply Shaky Stick to air-to-air attacks, grounded targets, generic target movement, terrain, or PSR checks. VTOL/WIGE-specific airborne subtype parity SHALL remain outside this BattleMech matrix until richer airborne movement-state hydration exists.

#### Scenario: Shaky Stick applies only to ground-to-air attacks

- **GIVEN** a ranged attack against an airborne target with Shaky Stick
- **WHEN** the attacker is not airborne
- **THEN** the attack to-hit number SHALL include a `+1` Shaky Stick modifier with MegaMek source references
- **AND** the SPA support row and pilot modifier resolver rows SHALL be integrated
- **AND** Shaky Stick SHALL NOT be represented as a generic BattleMech target movement, terrain, or PSR modifier

### Requirement: Source-Backed Weapon Quirk To-Hit Modifiers

Ranged to-hit validation SHALL keep combat-active quirk to-hit rows tied to MegaMek attacker quirk processing before treating them as integrated coverage. Sensor Ghosts SHALL apply as a `+1` attacker to-hit penalty. Accurate, Inaccurate, and Stable Weapon SHALL apply as weapon-specific to-hit modifiers where Stable Weapon applies only when the attacker ran. The support catalog and pilot modifier resolver rows SHALL expose commit-pinned MegaMek source references for those rows.

#### Scenario: Attacker quirk rows cite MegaMek to-hit source truth

- **GIVEN** the BattleMech quirk and pilot modifier resolver catalogs are generated
- **WHEN** Sensor Ghosts or weapon to-hit quirk support is inspected
- **THEN** `sensor_ghosts`, `accurate`, `inaccurate`, and `stable_weapon` SHALL be integrated with structured MegaMek source references
- **AND** the ranged to-hit and weapon-to-hit-quirk resolver rows SHALL cite the same relevant MegaMek attacker quirk anchors
- **AND** those source references SHALL be commit-pinned URLs with line anchors

### Requirement: Source-Backed Range Targeting Quirk Aliases

Ranged to-hit validation SHALL keep Improved Targeting and Poor Targeting rows source-backed while preserving MekStation's current local alias ids. MegaMek `imp_target_short`, `imp_target_med`, `imp_target_long`, `poor_target_short`, `poor_target_med`, and `poor_target_long` SHALL be the source-backed behavior family. MekStation `improved_targeting_*` and `poor_targeting_*` ids SHALL remain visible as local aliases until the catalog is normalized or an import compatibility layer maps the MegaMek ids directly.

#### Scenario: Targeting quirk aliases cite both source and local boundary

- **GIVEN** the BattleMech quirk and pilot modifier resolver catalogs are generated
- **WHEN** Improved Targeting or Poor Targeting support is inspected
- **THEN** every range-specific targeting quirk row SHALL be integrated with structured MegaMek source references for the range modifier behavior
- **AND** every row SHALL cite the MekStation alias boundary for the local `improved_targeting_*` and `poor_targeting_*` ids
- **AND** the ranged to-hit resolver row SHALL cite the MegaMek targeting quirk behavior without hiding the alias boundary on each quirk support row

### Requirement: Source-Backed Multi-Tasker Secondary Target Relief

Ranged to-hit validation SHALL keep MegaMek's Multi-Tasker SPA distinct from MekStation's legacy local Multi-Target row. The `multi-tasker` SPA row SHALL stay integrated for source-backed `multi_tasker` behavior that reduces secondary-target penalties through ranged to-hit calculation. The `multi-target-penalty-application` resolver row SHALL stay integrated only for source-backed secondary-target penalty application and Multi-Tasker relief. The local `multi-target` SPA row SHALL remain out-of-scope and unconsumed by the integrated resolver unless an independent source-backed combat authority is identified.

#### Scenario: Multi-Tasker application stays separate from local Multi-Target

- **GIVEN** the BattleMech SPA and pilot modifier resolver catalogs are generated
- **WHEN** secondary-target penalty support is inspected
- **THEN** `multi-tasker` SHALL be integrated with structured MegaMek source references
- **AND** `multi-target-penalty-application` SHALL be integrated with the same source-backed Multi-Tasker references
- **AND** the resolver assignment SHALL include `multi-tasker` and SHALL NOT include local `multi-target`
- **AND** `multi-target` SHALL remain out-of-scope as a local SPA source-boundary

### Requirement: Source-Backed Multi-Trac Secondary Target Relief

Ranged to-hit validation SHALL keep Multi-Trac source-backed as secondary-target penalty relief. The `multi_trac` quirk row SHALL cite MegaMek `Compute.getSecondaryTargetMod` and option-id anchors, and the ranged to-hit resolver row SHALL expose the same source-backed modifier family before claiming complete quirk to-hit coverage.

#### Scenario: Multi-Trac cites secondary-target source truth

- **GIVEN** the BattleMech quirk and pilot modifier resolver catalogs are generated
- **WHEN** Multi-Trac support is inspected
- **THEN** `multi_trac` SHALL be integrated with structured MegaMek source references for secondary-target modifier suppression
- **AND** the ranged to-hit resolver row SHALL cite the same Multi-Trac secondary-target anchors
- **AND** the source references SHALL be commit-pinned URLs with line anchors

### Requirement: Source-Backed Defensive Quirk Boundary

Ranged to-hit validation SHALL NOT count legacy defensive quirk to-hit helpers as source-backed integrated coverage when the source authority does not match the local helper behavior. `Distracting` SHALL be tracked as an accepted MekStation local deviation only when runner and interactive BattleMech attack declaration behavior prove the local `+1` target to-hit helper is consumed and the row carries both MegaMek option-registration refs and MekStation deviation refs. `Low Profile` SHALL be tracked as integrated only for represented source-backed glancing-blow damage, critical-hit-table, and missile/LB-X cluster-table behavior; MekStation's legacy local `+1` target to-hit helper SHALL remain deviation coverage and SHALL NOT be treated as source-backed ranged to-hit support.

#### Scenario: Defensive quirk helpers expose source mismatch instead of hiding it

- **GIVEN** the BattleMech quirk and pilot modifier resolver catalogs are generated
- **WHEN** `distracting` and `low_profile` support is inspected
- **THEN** `distracting` SHALL be integrated only for the accepted MekStation local `+1` target to-hit deviation with structured MegaMek option-registration references, MekStation deviation references, and runner plus interactive consumption evidence
- **AND** `low_profile` SHALL be integrated with structured MegaMek glancing-blow, critical-hit-table modifier, and MekStation runtime/test source references while preserving the local `+1` target to-hit helper as deviation coverage
- **AND** the helper-only resolver row SHALL own the local `+1` target to-hit helper boundary
- **AND** the source-backed ranged to-hit resolver row SHALL NOT count those two defensive quirk helpers as integrated quirk to-hit coverage

### Requirement: Source-Backed Initiative Quirk Bonuses

Initiative validation SHALL apply MegaMek's Command Mech and Battle Computer force initiative bonuses from active conscious units. Battle Computer SHALL provide `+2`, Command Mech SHALL provide `+1`, and the bonuses SHALL NOT stack. Explicit HQ initiative equipment bonuses SHALL be treated as the same best-of force turn bonus as initiative quirks, while explicit command initiative equipment bonuses SHALL stack as a separate command bonus. Tactical Genius SHALL be modeled as a reroll request that replaces only the requested side's raw initiative roll when that side has an active conscious Tactical Genius unit, not as a flat modifier. Raw `2d6` initiative payload fields SHALL remain raw dice values for replay/RNG arbitration, with modifier and total fields carrying adjusted values. The Command Mech and Battle Computer quirk rows SHALL be integrated once their source-backed quirk behavior is covered; automatic command-console/HQ equipment hydration SHALL remain an explicit gap until equipment-derived command state is modeled. Automatic initiative equipment hydration SHALL fail closed unless source-kind/rules-profile, working/default-mode communications tonnage, active command-console crew, heavy-or-larger weight class, IndustrialMek, and advanced-fire-control eligibility context are represented.

#### Scenario: Battle Computer bonus remains non-cumulative with Command Mech

- **GIVEN** the player force has an active conscious unit with both `battle_computer` and `command_mech`
- **AND** raw initiative dice are lower than the opponent by 3
- **WHEN** initiative is rolled
- **THEN** the player receives only the source-backed `+2` bonus
- **AND** the opponent still wins
- **AND** the event payload retains raw `2d6` values plus modifier and total fields
- **AND** the `command_mech` and `battle_computer` quirk catalog rows SHALL be integrated while automatic HQ and command-console equipment hydration remains tracked under separate unsupported resolver rows

#### Scenario: Explicit command bonus stacks with the best HQ or quirk bonus

- **GIVEN** the player force has an active conscious unit with `battle_computer`
- **AND** that force has an explicit command initiative equipment bonus of `+2`
- **WHEN** initiative is rolled
- **THEN** the player modifier SHALL be the best HQ/quirk bonus plus the command bonus
- **AND** raw `2d6` payload values SHALL remain unchanged

#### Scenario: Explicit HQ and quirk bonuses do not stack

- **GIVEN** the player force has source-backed `battle_computer`
- **AND** the player force has an explicit HQ initiative bonus of `+2`
- **WHEN** initiative is rolled
- **THEN** only the best HQ or quirk bonus SHALL apply before command bonuses

#### Scenario: Tactical Genius replaces the requested side roll

- **GIVEN** the player force has an active conscious unit with `tactical_genius`
- **AND** Tactical Genius is requested for the player side
- **WHEN** initiative is rolled
- **THEN** the player raw initiative roll SHALL be replaced with a new raw `2d6` roll
- **AND** the event payload SHALL retain the initial raw player and opponent rolls separately
- **AND** no flat Tactical Genius initiative modifier SHALL be applied

#### Scenario: Tactical Genius request requires an eligible active unit

- **GIVEN** no active conscious unit on the requested side has `tactical_genius`
- **WHEN** Tactical Genius is requested for that side
- **THEN** no replacement roll SHALL be consumed
- **AND** no Tactical Genius reroll metadata SHALL be emitted

#### Scenario: Command-looking metadata does not imply initiative equipment hydration

- **GIVEN** a unit name, cockpit label, or equipment entry implies command-console or HQ communications equipment
- **AND** that unit does not provide explicit `initiativeHQBonus` or `initiativeCommandBonus`
- **WHEN** initiative is rolled
- **THEN** the initiative modifier SHALL remain `0`
- **AND** the combat validation catalog SHALL continue to mark automatic HQ communications and command-console hydration as unsupported until all MegaMek eligibility gates are modeled

### Requirement: Local-Only SPA Gap Boundaries

Pilot modifier validation SHALL keep local-only SPA rows visible as MekStation deviation boundaries when a MegaMek combat SPA authority has not been identified. Acrobat, Natural Grace, Speed Demon, Combat Intuition, Cool Under Fire, Evasive, Multi-Target, and Antagonizer SHALL NOT be treated as MegaMek parity claims unless the catalog row carries source-backed implementation evidence. Those local-only rows SHALL remain out-of-scope audit evidence and SHALL cite the current MegaMek pilot option registry plus the MekStation SPA catalog row that introduced the local behavior.

#### Scenario: Local SPA rows stay source-boundary explicit

- **GIVEN** the combat catalog includes Acrobat, Natural Grace, Speed Demon, Combat Intuition, Cool Under Fire, Evasive, Multi-Target, or Antagonizer
- **WHEN** the support row is inspected
- **THEN** the row SHALL cite the MegaMek pilot option registry used for the source-truth cross-check
- **AND** the row SHALL cite the MekStation SPA catalog as a `mekstation-deviation`
- **AND** the row SHALL remain out-of-scope until source-backed combat authority exists
- **AND** no row SHALL be promoted to integrated until an implementation and source-backed combat authority exist

### Requirement: Canonical SPA Scope Source References

Pilot modifier validation SHALL treat every canonical SPA catalog row as source-checkable evidence. Each `canonicalPilotAbilityScope` row SHALL carry structured source references to the MekStation canonical SPA catalog plus the pinned MegaMek pilot option registry or category-specific source boundary that justifies the row's integrated, helper-only, unsupported, or out-of-BattleMech-matrix classification.

#### Scenario: Canonical SPA rows cannot inherit prose-only authority

- **GIVEN** the canonical SPA combat scope catalog is generated
- **WHEN** any canonical SPA row is inspected
- **THEN** the row SHALL carry at least one anchored `mekstation-deviation` reference to the canonical SPA catalog or category file
- **AND** the row SHALL carry anchored source references for MegaMek `PilotOptions` or `OptionsConstants` when the id is mirrored from the MegaMek pilot option registry
- **AND** helper-only, unsupported, or out-of-scope rows for infantry, ATOW, bioware, unofficial, legacy, and Edge partitions SHALL cite the specific partition authority that keeps the row out of integrated BattleMech combat coverage
- **AND** infantry-scoped SPAs, AToW/personnel-origin and aerospace-control SPAs, unofficial or legacy SPAs without explicit integrated support, and Aero Edge triggers SHALL remain `out-of-scope` audit evidence instead of unresolved official BattleMech blockers

### Requirement: Source-Backed Bioware Pilot-Damage Split

BattleMech bioware validation SHALL split represented dermal armor head-hit pilot-damage suppression plus dermal armor and TSM implant missed-DFA fall pilot-damage avoidance from non-BattleMech Manei Domini implant branches. The narrow `dermal-armor-head-hit-pilot-damage-suppression` pilot modifier resolver row SHALL be integrated only for the represented head-hit pilot-damage suppression path, cite MegaMek damage-manager source truth plus local resolver and test anchors, and assign only `dermal_armor`. The narrow `dfa-miss-bioware-pilot-damage-avoidance` pilot modifier resolver row SHALL be integrated only for the represented missed-DFA fall pilot-damage immunity path, cite MegaMek fall-damage source truth plus the local helper and behavior-test anchors, and assign only `dermal_armor` and `tsm_implant`. The broad `canonicalPilotAbilityScope.dermal_armor` and `canonicalPilotAbilityScope.tsm_implant` rows SHALL be integrated for the BattleMech matrix only when their source-backed BattleMech behavior is represented and infantry, vehicle, and aerospace implant branches remain explicitly split out of this matrix.

#### Scenario: Dermal armor and TSM implant split represented DFA-miss avoidance from broad implant support

- **GIVEN** the BattleMech canonical SPA and pilot modifier resolver catalogs are generated
- **WHEN** dermal armor, TSM implant, head-hit, and DFA-miss bioware pilot-damage rows are inspected
- **THEN** `pilotSkills.pilotModifierResolvers.dermal-armor-head-hit-pilot-damage-suppression` SHALL be integrated with structured source references to MegaMek head-hit crew-damage suppression plus MekStation resolver and behavior tests
- **AND** the Dermal Armor head-hit resolver assignment SHALL list only `dermal_armor`
- **AND** `pilotSkills.pilotModifierResolvers.dfa-miss-bioware-pilot-damage-avoidance` SHALL be integrated with structured source references to MegaMek missed-DFA fall pilot-damage immunity plus MekStation helper and behavior tests
- **AND** the DFA-miss resolver assignment SHALL list only `dermal_armor` and `tsm_implant`
- **AND** `featureSupport.canonicalPilotAbilityScope.dermal_armor` and `featureSupport.canonicalPilotAbilityScope.tsm_implant` SHALL be integrated BattleMech rows while their source references and evidence text preserve the non-BattleMech infantry, vehicle, and aerospace branch split
- **AND** no broad neural interface, comm/C3, dermal camo, processor, filtration, or generic Manei Domini bioware row SHALL be promoted by these narrow pilot-damage slices

### Requirement: Source-Backed Edge Trigger Boundary

Pilot modifier validation SHALL keep generic Edge point state as helper-only aggregate trigger-state coverage, SHALL mark per-trigger Mek Edge rows integrated only when source-backed MekStation runtime/helper paths and executable tests prove that specific trigger, and SHALL split Aero Edge triggers out of the BattleMech matrix. Edge rows SHALL cite MegaMek's point-pool and trigger-option source anchors plus MekStation row-specific helper, runtime, and test anchors. The `edge_when_headhit`, `edge_when_tac`, `edge_when_ko`, `edge_when_explosion`, and `edge_when_masc_fails` rows SHALL be counted as integrated only for their proven BattleMech trigger paths; the generic `edge`, `edge-application`, and `critical-prevention-application` rows SHALL remain helper-only until every broader Edge lane, producer, and trigger family is proven end-to-end. An empty unsupported Edge export SHALL NOT imply there are no Edge gaps while helper-only aggregate Edge rows remain.

#### Scenario: Edge helper rows cite source truth without claiming resolver parity

- **GIVEN** the BattleMech SPA and pilot modifier resolver catalogs are generated
- **WHEN** Edge, Edge application, or critical-prevention support is inspected
- **THEN** generic Edge point state SHALL remain helper-only with structured source references to MegaMek Edge trigger registration and point consumption
- **AND** `edge_when_headhit` and `edge_when_tac` SHALL be integrated only when hit-location resolution spends Edge, rerolls the location, carries superseded/final metadata, persists remaining Edge, and cites both helper/runtime and runner proof-test paths
- **AND** `edge_when_ko` SHALL be integrated only when consciousness resolution spends Edge, rerolls failed BattleMech knockout checks, carries superseded/final metadata, and persists remaining Edge through runner or interactive pilot-hit paths
- **AND** `edge_when_explosion` SHALL be integrated only when critical-slot resolution spends Edge, redirects avoidable ammo critical-slot hits, carries remaining Edge through callers, and cites both helper/runtime and runner proof-test paths
- **AND** `edge_when_masc_fails` SHALL be integrated only for source-backed runner `MASCFailure` and `SuperchargerFailure` rerolls that spend Edge and suppress failure aftermath when the reroll passes
- **AND** each Aero Edge trigger row SHALL remain out-of-scope with the same source references until an aerospace validation matrix exists
- **AND** each row SHALL cite the MekStation generic Edge helper or SPA catalog partition as a local deviation boundary
- **AND** no generic attack reroll, broad critical negation, producer hydration, or aggregate Edge resolver row SHALL be counted as fully integrated merely because row-specific Edge triggers have source-backed integrated coverage

### Requirement: Source-Backed Terrain Master Defender To-Hit Variants

Ranged to-hit validation SHALL apply MegaMek's Terrain Master defender to-hit variants from target state and target terrain: Forest Ranger SHALL add a `+1` to-hit modifier only when the target has canonical `tm_forest_ranger` or legacy `terrain-master-forest-ranger`, the target moved by walking, and the target occupies wooded terrain; Swamp Beast SHALL add a `+1` to-hit modifier only when the target has canonical `tm_swamp_beast` or legacy `terrain-master-swamp-beast`, the target moved by running, and the target occupies mud or swamp. Runner ranged attacks SHALL hydrate target terrain features into to-hit state. Terrain Master source-backed variant coverage includes Frogman water-entry, Mountaineer rubble-entry plus movement-cost relief, Forest Ranger/Swamp Beast defender to-hit relief, and Swamp Beast bog-down relief. The local generic `terrain-master` helper row SHALL remain out-of-scope because MegaMek registers variant ids rather than a generic `terrain_master` option. Source-backed Nightwalker low-light movement behavior SHALL remain a canonical helper-only row: represented coarse low-light movement relief is covered, while finer light-state and LAM airborne gates remain explicit gaps.

#### Scenario: Forest Ranger applies to walking wooded targets

- **GIVEN** a ranged weapon attack targets a unit with `tm_forest_ranger`
- **AND** the target moved by walking this turn
- **AND** the target occupies woods
- **WHEN** the ranged to-hit number is computed
- **THEN** the declared to-hit number SHALL include a `Forest Ranger` SPA modifier of `+1`

#### Scenario: Swamp Beast applies to running mud or swamp targets

- **GIVEN** a ranged weapon attack targets a unit with `tm_swamp_beast`
- **AND** the target moved by running this turn
- **AND** the target occupies mud or swamp
- **WHEN** the ranged to-hit number is computed
- **THEN** the declared to-hit number SHALL include a `Swamp Beast` SPA modifier of `+1`

#### Scenario: Terrain Master defender variants require matching movement and terrain

- **GIVEN** a ranged weapon attack targets a unit with `tm_forest_ranger` or `tm_swamp_beast`
- **WHEN** the target movement type does not match that variant's MegaMek gate
- **THEN** no Terrain Master defender to-hit modifier SHALL apply
- **WHEN** the target terrain does not match that variant's MegaMek gate
- **THEN** no Terrain Master defender to-hit modifier SHALL apply

### Requirement: Source-Backed Maneuvering Ace Skidding PSR and Lateral Movement

Runner movement and PSR resolution SHALL apply MegaMek's movement-before-skid PSR distance table and subtract 1 for canonical Maneuvering Ace only when resolving skidding PSRs. The skidding distance modifier SHALL be queued as PSR trigger state, while Maneuvering Ace SHALL be applied during PSR resolution from hydrated pilot ability state so runner and interactive paths share the same target-number math. Represented pending out-of-control PSRs SHALL also subtract 1 for canonical Maneuvering Ace during runner PSR resolution, without treating recovery rolls as out-of-control rolls. BattleMech movement validation, movement-step decomposition, and runner movement commits SHALL also consume Maneuvering Ace for source-backed biped lateral shifts and QuadMek lateral-step MP relief. Represented lateral movement SHALL produce controlled-sideslip PSRs for non-walking lateral moves and SHALL suppress that PSR for walking Maneuvering Ace lateral shifts. Aerospace maneuver-thrust relief and producer-side out-of-control control-roll creation for aerospace/airborne LAM units SHALL remain out-of-scope aerospace catalog gaps, while BattleMech flanking-and-turning side-slip movement production SHALL remain an explicit helper-only leaf gap until separately wired. Heavy Lifter pickup/drop carried-object lifecycle SHALL be represented separately from the remaining helper-only throw-object leaf gap.

#### Scenario: Skidding PSRs consume distance and Maneuvering Ace modifiers

- **GIVEN** a running BattleMech turns on pavement or ice
- **WHEN** the movement phase queues a skidding PSR
- **THEN** the queued PSR SHALL carry the source-backed movement-before-skid distance modifier
- **WHEN** that PSR resolves for a pilot with `maneuvering_ace`
- **THEN** the target number SHALL include an additional `Maneuvering Ace` SPA modifier of `-1`
- **AND** non-skidding PSRs SHALL NOT receive the Maneuvering Ace skidding modifier

#### Scenario: Represented out-of-control PSRs consume Maneuvering Ace modifiers

- **GIVEN** a BattleMech with canonical Maneuvering Ace enters the PSR phase with a represented out-of-control pending PSR
- **WHEN** the runner resolves the pending PSR
- **THEN** the target number SHALL include a `Maneuvering Ace` SPA modifier of `-1`
- **AND** the emitted `PSRResolved` event SHALL carry an `out_of_control` reason code
- **AND** recovery rolls SHALL NOT receive the out-of-control Maneuvering Ace modifier

#### Scenario: Maneuvering Ace lateral movement uses BattleMech chassis-specific costs

- **GIVEN** a biped BattleMech with canonical Maneuvering Ace
- **WHEN** movement validation or runner movement commits a legal lateral shift
- **THEN** the lateral shift SHALL preserve facing and SHALL charge the side-step cost as source-backed biped BattleMech movement
- **GIVEN** a QuadMek with canonical Maneuvering Ace
- **WHEN** movement validation or runner movement commits a legal lateral step
- **THEN** the lateral step SHALL preserve facing and SHALL use the destination entry cost without the normal side-step surcharge
- **AND** non-Maneuvering-Ace biped lateral shifts SHALL keep the normal side-step surcharge

#### Scenario: Maneuvering Ace side-slip producer branches are represented

- **GIVEN** a BattleMech with canonical Maneuvering Ace
- **WHEN** runner movement commits a walking lateral shift
- **THEN** no controlled-sideslip PSR SHALL be queued
- **WHEN** runner movement commits a running lateral shift
- **THEN** a `controlled_sideslip` PSR SHALL be queued with the lateral movement-step trigger source and `-1` target modifier
- **AND** the `pilotSkills.pilotModifierResolvers.maneuvering-ace-controlled-sideslip-producer-application` row SHALL be integrated
- **WHEN** runner movement commits a BattleMech run or sprint that changes facing after moving more than one hex
- **THEN** one `flanking_and_turning` PSR SHALL be queued with the triggering movement-step source
- **AND** the PSR resolver SHALL apply Maneuvering Ace target-number relief to that pending PSR
- **AND** walking movement, straight running movement, Infantry, and ProtoMech units SHALL NOT queue the flanking-and-turning PSR
- **AND** the `pilotSkills.pilotModifierResolvers.maneuvering-ace-flanking-turning-producer-application` row SHALL be integrated

### Requirement: Source-Backed Animal Mimicry Quad-Mek PSR Relief

Runner and interactive PSR resolution SHALL apply MegaMek's source-backed Animal Mimicry `-1` piloting-roll modifier only for explicit quad BattleMech combat state. Both canonical `animal_mimic` and legacy `animal-mimicry` ids SHALL resolve through the SPA canonicalization layer, and the Animal Mimicry SPA and canonical scope rows SHALL be marked integrated once those runner and interactive PSR paths are covered.

#### Scenario: Quad Mek PSRs consume Animal Mimicry relief

- **GIVEN** a BattleMech has `isQuad: true` and the `animal_mimic` SPA
- **WHEN** runner or interactive pending PSRs resolve
- **THEN** the target number SHALL include an `Animal Mimicry` SPA modifier of `-1`
- **WHEN** runner or interactive stand-up PSRs resolve
- **THEN** the same `Animal Mimicry` SPA modifier SHALL apply
- **AND** non-quad units SHALL NOT receive the Animal Mimicry PSR modifier

### Requirement: Source-Backed Heat Rule Catalog Anchors

Heat rule support rows SHALL carry source references before they are treated as integrated validation coverage. Weapon heat, movement/jump heat, engine critical heat, dissipation, heat-sink damage, threshold effects, water cooling, fire heat, external-temperature heat, startup, shutdown, ammo-explosion risk, heat-induced ammo explosion, pilot heat damage, and optional MaxTech heat damage SHALL be pinned to MegaMek source references with commit-pinned URLs and line anchors. MekStation-only atmosphere heat adjustment SHALL be marked as a MekStation deviation source instead of being attributed to MegaMek. Any future heat profile, optional TacOps heat, equipment-mode, crew modifier, atmosphere, terrain, or environmental expansion SHALL update those source references or add explicit gap/deviation rows instead of relying on prose.

#### Scenario: Heat rule support rows expose source truth

- **GIVEN** the BattleMech heat rule support catalog is generated
- **WHEN** any heat rule support row is inspected
- **THEN** each row SHALL expose structured source references
- **AND** MegaMek-backed heat rows SHALL use commit-pinned MegaMek URLs with line anchors
- **AND** local atmosphere heat adjustment SHALL use a MekStation deviation source reference
- **AND** the heat rule catalog triad SHALL enforce row-level source references before PR approval

### Requirement: Source-Backed Terrain Environment Catalog Anchors

Terrain/environment support rows SHALL carry source references before they are treated as validation coverage. Terrain movement costs, direct terrain LOS blocking, cumulative woods/smoke LOS density, land-to-depth-2+ water endpoint LOS blocking, represented underwater endpoint-height/minimum-depth LOS metadata, represented same-building building-hex LOS blocking, represented same-building endpoint elevation-difference LOS counting, represented building-height LOS blocking, represented fuel-tank elevation metadata, represented divided LOS side-path blocking and modifier selection, represented divided LOS pure-elevation blocking, represented TacOps diagram pure-elevation overlap for clear-hex straight and divided side paths, represented TacOps woods/smoke/heavy-industrial/planted-field diagram terrain-effect option state, represented TacOps LOS1 combat-caller option propagation, partial cover, terrain to-hit features, water cooling, fire heat, smoke to-hit, fog, night, wind, blowing-sand dust, represented mine marker damage, represented battle-wide coordinate minefield state entry damage, represented coordinate minefield add/set/reset/remove/clear/detect/detonate replay, represented hidden conventional minefield detection/reveal state, represented explicit GameCreated/prebattle coordinate minefield authoring, represented manual conventional and command-detonated minefield detonation controls, represented conventional minefield clearing/sweeper/reset controls, represented coordinate minefield density trigger targets, represented conventional, inferno, and active density reduction, represented inferno density external-heat entry, represented active ground-entry suppression, represented active BattleMech jump-entry triggering, represented vibrabomb density/setting triggers, represented typed non-conventional coordinate-state no-fallback guards, and extreme-temperature rows SHALL be pinned to MegaMek source references with commit-pinned URLs and line anchors when they claim comparable source-backed behavior. The terrain LOS blocking row SHALL be integrated for MekStation direct blockers and cumulative woods/smoke density, the terrain LOS water endpoint row SHALL be integrated for source-backed land-to-depth-2+ endpoint blocking plus runner no-side-effect invalidation, the terrain LOS underwater depth/height row SHALL be integrated only for explicit endpoint LOS elevation water-state classification plus `minimumWaterDepth` metadata, the terrain LOS same-building hex row SHALL be integrated only for represented `buildingId` endpoint and intervening-hex count behavior plus runner no-side-effect invalidation, the terrain LOS same-building level-count row SHALL be integrated only for represented same-`buildingId` endpoint elevation differences counting toward the same-building level/hex limit plus runner no-side-effect invalidation, the terrain LOS building-height row SHALL be integrated only for represented non-diagram sightlines blocked by an intervening Building feature level plus hex elevation rising above the taller endpoint or an adjacent endpoint plus runner no-side-effect invalidation, the terrain LOS fuel-tank elevation row SHALL be integrated only for explicit Building feature `fuelTankElevation` metadata used as the FUEL_TANK_ELEV-derived LOS height, the terrain LOS divided side-path row SHALL be integrated only for represented `degree % 60 == 30` split-side tracing that chooses the defender-favorable blocker or intervening terrain modifier, the terrain LOS divided-elevation row SHALL be integrated only for represented split-side pure-elevation blockers plus runner no-side-effect invalidation, the represented TacOps diagram pure-elevation overlap row SHALL be integrated only for clear-hex pure-elevation blockers already reported by straight and divided local LOS paths, the represented TacOps diagram terrain-effect row SHALL be integrated only for explicit woods/smoke/heavy-industrial/planted-field option-state checks in `calculateLOS`, represented TacOps LOS1 combat-caller option propagation SHALL be integrated only for callers that pass optional rule state through the LOS option mapper, and the terrain LOS side-path row SHALL be integrated only as a split-accounting parent while the exact branch row remains unsupported for grounded DropShip level-10 cover plus damageable-cover provider output. Represented fuel-tank damageable cover-provider metadata, represented hard/soft building classification plus damageable building cover-provider metadata, and damageable-cover hit-resolution routing into represented `constructionFactor` terrain state SHALL be integrated only for encoded Building feature metadata and `TerrainChanged` event-sourced terrain overrides. The same-building building-hex, same-building level-count, building-height, fuel-tank elevation, fuel-tank damageable cover-provider, hard/soft building cover-provider, damageable cover hit-resolution routing, divided side-path, divided-elevation, represented TacOps diagram pure-elevation overlap, represented TacOps woods/smoke/heavy-industrial/planted-field terrain-effect option state, represented TacOps LOS1 combat-caller option propagation, and underwater depth/height sub-slices plus the split-accounting parent SHALL NOT close the remaining grounded DropShip exact branch row while that side path remains open. MekStation-only water walk/run rejection and atmosphere heat adjustment SHALL be marked as MekStation deviation sources instead of being attributed to MegaMek. Dust SHALL be represented as explicit environmental `blowingSand` state that applies the source-backed +1 to-hit modifier only to energy-weapon attacks; the represented `TerrainType.Mines` row SHALL be integrated for bounded BattleMech leg damage plus resulting damage PSR evidence, and the represented `IGameState.minefields` row SHALL be integrated for battle-wide canonical coordinate-key entry damage with explicit per-leg damage plus event-sourced add/set/reset/remove/clear/detect/detonate lifecycle replay, explicit hidden conventional minefield detection/reveal state, explicit GameCreated/prebattle coordinate minefield authoring, represented manual conventional and command-detonated detonation controls, represented clearing/sweeper/reset controls, optional density trigger targets, source-backed conventional/inferno/active density reduction, explicit inferno coordinate-state pending external heat plus infernoBurning state without leg-damage side effects, represented active ground-entry suppression without damage or state side effects, represented active BattleMech jump-entry damage and MinefieldChanged detonation/reduction state, represented vibrabomb same-hex and proximity detonation behavior, and fail-closed typed non-conventional coordinate-state no-damage guards, while exact residual minefield branch rows SHALL remain unsupported for MegaMek EMP effects and inferno controls beyond represented density external-heat entry.

#### Scenario: Terrain environment rows expose source truth

- **GIVEN** the BattleMech terrain/environment support catalog is generated
- **WHEN** any terrain/environment support row is inspected
- **THEN** each integrated or helper-only row SHALL expose structured source references
- **AND** MegaMek-backed terrain/environment rows SHALL use commit-pinned MegaMek URLs with line anchors
- **AND** MekStation-only water ground-disallow, terrain LOS split-accounting and exact residual side-path branches, atmosphere, blowing-sand state, represented mine marker damage, represented inferno density external-heat entry, and residual minefield-variant boundaries SHALL use MekStation deviation source references where the behavior or absence is local
- **AND** the terrain/environment catalog triad SHALL enforce row-level source references before PR approval

### Requirement: Source-Backed TerrainType Movement Catalog Anchors

Every TerrainType movement support row SHALL expose structured source references before the map is treated as source-backed validation coverage. Terrain rows with comparable MegaMek movement-cost behavior SHALL cite commit-pinned MegaMek source URLs with line anchors and the local `TERRAIN_PROPERTIES` row consumed by `getHexMovementCost`. Pavement, road, and bridge rows SHALL cite MegaMek pavement movement handling. MekStation-only water walk/run rejection and flat building movement cost SHALL be marked as MekStation deviation source references instead of being attributed to MegaMek parity. Any future TerrainType movement expansion SHALL either add a MegaMek/MekHQ source reference or explicitly mark the row as a local deviation/gap.

#### Scenario: TerrainType movement rows expose source truth

- **GIVEN** the BattleMech terrain type movement support catalog is generated
- **WHEN** any TerrainType movement row is inspected
- **THEN** the row SHALL expose structured source references with line anchors
- **AND** MegaMek-backed rows SHALL use commit-pinned MegaMek source references
- **AND** local-only water and building movement rows SHALL use MekStation deviation source references
- **AND** the terrainTypeMovement catalog triad SHALL enforce row-level source references before PR approval

### Requirement: Source-Backed TerrainType LOS Catalog Anchors

Every TerrainType LOS support row SHALL expose structured source references before the map is treated as source-backed validation coverage. Every row SHALL cite the local `TERRAIN_PROPERTIES`, `calculateLOS`, and runner attack LOS validation paths. Building SHALL be marked as represented MegaMek non-diagram building-height blocking plus local direct blocking behavior, not grounded DropShip or special-building parity. Heavy woods, light woods, and smoke SHALL be marked integrated only when `calculateLOS` accumulates intervening density and blocks LOS once woods/smoke density exceeds 2. HeavyIndustrial SHALL be marked integrated only when `calculateLOS` applies TacOps LOS1 side-path elevation gating, adds +1 per counted represented heavy-industrial hex, and blocks after more than two represented hexes. PlantedField SHALL be marked integrated only when `calculateLOS` applies TacOps LOS1 side-path elevation gating, adds +1 per two counted represented fields, and blocks after more than five represented fields. Water SHALL be marked integrated only when `calculateLOS` blocks land-to-depth-2+ water endpoint sightlines in both directions, classifies water endpoints from explicit endpoint LOS elevation when supplied, exposes `minimumWaterDepth` metadata, and preserves non-endpoint water as non-blocking local terrain; those endpoint and depth/height sub-paths SHALL also remain split into integrated terrain LOS rows. Same-building building-hex LOS SHALL be represented by a separate integrated row only for encoded `buildingId` endpoint matching, intervening same-building hex-count blocking after more than two hexes, and direct-fire attack invalidation without combat side effects. Same-building endpoint elevation-difference LOS counting SHALL be represented by a separate integrated row only when both endpoints share a `buildingId` and their endpoint elevation difference is added to the same-building level/hex count before blocking after more than two represented levels or hexes, with direct-fire attack invalidation without combat side effects. Building-height LOS SHALL be represented by a separate integrated row only for non-diagram sightlines blocked by an intervening Building feature level plus hex elevation rising above the taller endpoint or an adjacent endpoint, with direct-fire attack invalidation without combat side effects. Fuel-tank elevation LOS SHALL be represented by a separate integrated row only for explicit Building feature `fuelTankElevation` metadata used as the FUEL_TANK_ELEV-derived LOS height. Fuel-tank and building damageable cover-provider metadata SHALL be represented by separate integrated rows only when `calculateLOS` reports encoded Building feature `fuelTankElevation`/`fuelTankId`, `buildingId`, `constructionFactor`, provider side, total elevation, and hard/soft classification metadata. Damageable-cover hit-resolution routing SHALL be represented by a separate integrated row only when covered leg-hit absorption reduces encoded provider `constructionFactor`, removes exhausted represented providers, emits `TerrainChanged { reason: "damageable_cover_hit" }`, and updates the runner grid for later same-phase shots. Divided LOS SHALL be represented by a separate integrated row only for `degree % 60 == 30` split-side tracing that chooses the defender-favorable blocker or intervening terrain modifier from the two adjacent side paths. Divided LOS pure-elevation blocking SHALL be represented by a separate integrated row only when the split-side path reports `blockingElevation` without synthesizing blocking terrain, with direct-fire attack invalidation without combat side effects. TacOps diagram pure-elevation overlap SHALL be represented by a separate integrated row only for the clear-hex pure-elevation branch already covered by straight and divided local LOS paths, without claiming TacOps LOS1 option state or diagram terrain-effect parity. TacOps diagram terrain-effect option state SHALL be represented by a separate integrated row only for explicit woods/smoke/heavy-industrial/planted-field checks in `calculateLOS`, and combat-caller option propagation SHALL be represented only when runner and interactive callers thread optional rules into that LOS option mapping. The terrain LOS side-path row SHALL be integrated only as a split-accounting parent while the exact branch row remains unsupported for grounded DropShip level-10 cover plus damageable-cover provider output. Terrain rows with no LOS blocking behavior SHALL remain source-checked through local no-op source references instead of inheriting generic terrain authority. Any future TerrainType LOS expansion SHALL either add a MegaMek/MekHQ source reference or explicitly mark the row as a local deviation/gap.

#### Scenario: TerrainType LOS rows expose source truth

- **GIVEN** the BattleMech terrain type LOS support catalog is generated
- **WHEN** any TerrainType LOS row is inspected
- **THEN** the row SHALL expose structured source references with line anchors
- **AND** building, heavy woods, light woods, smoke, and water rows SHALL include commit-pinned MegaMek LOS comparison references
- **AND** heavy woods, light woods, and smoke rows SHALL be integrated only when cumulative density blocking over 2 is implemented and covered by behavior tests
- **AND** water SHALL be integrated only when land-to-depth-2+ endpoint LOS blocking is covered by behavior tests
- **AND** represented HeavyIndustrial and PlantedField TacOps LOS1 terrain-effect elevation comparisons SHALL remain integrated only while covered by source-pinned side-path behavior tests
- **AND** grounded DropShip level-10 cover plus damageable-cover provider output SHALL remain an explicit unsupported side-path gap until implemented
- **AND** represented fuel-tank damageable cover-provider metadata, represented hard/soft building cover-provider metadata, and damageable cover hit-resolution routing SHALL be integrated only for encoded terrain-feature metadata and event-sourced `TerrainChanged` provider-state updates
- **AND** TacOps LOS1 combat-caller option propagation SHALL stay represented only while runner and interactive callers pass optional rule state through the LOS option mapper
- **AND** local no-LOS-effect terrain rows SHALL use MekStation deviation source references for the local no-op mapping
- **AND** the terrainTypeLos catalog triad SHALL enforce row-level source references before PR approval

### Requirement: Source-Backed TerrainType Attack Modifier Catalog Anchors

Every TerrainType attack modifier support row SHALL expose structured source references before the map is treated as source-backed validation coverage. Woods, smoke, and building rows SHALL cite commit-pinned MegaMek terrain/LOS to-hit source URLs with line anchors, plus the local `TERRAIN_PROPERTIES`, to-hit utility, terrain helper, and runner attack-phase paths. MekStation-only water and swamp target-in modifiers, plus terrain rows with no attack modifier, SHALL be marked with local source references instead of inheriting generic terrain authority. Any future terrain attack modifier expansion SHALL either add a MegaMek/MekHQ source reference or explicitly mark the row as a local deviation/gap.

#### Scenario: TerrainType attack modifier rows expose source truth

- **GIVEN** the BattleMech terrain type attack modifier support catalog is generated
- **WHEN** any TerrainType attack modifier row is inspected
- **THEN** the row SHALL expose structured source references with line anchors
- **AND** woods, smoke, and building modifier rows SHALL use commit-pinned MegaMek source references
- **AND** local-only water, swamp, and no-modifier rows SHALL use MekStation deviation source references for the local mapping
- **AND** the terrainTypeAttackModifiers catalog triad SHALL enforce row-level source references before PR approval

### Requirement: Source-Backed TerrainType Heat Catalog Anchors

Every TerrainType heat support row SHALL expose structured source references before the map is treated as source-backed validation coverage. Water and fire rows SHALL cite commit-pinned MegaMek source URLs with line anchors for water cooling, heat dissipation, fire heat, and external heat/cooling caps, plus the local `TERRAIN_PROPERTIES`, heat utility, and runner heat-phase paths. Terrain rows with no heat effect SHALL remain source-checked through local no-op source references instead of inheriting a generic terrain authority. Any future terrain heat expansion SHALL either add a MegaMek/MekHQ source reference or explicitly mark the row as a local deviation/gap.

#### Scenario: TerrainType heat rows expose source truth

- **GIVEN** the BattleMech terrain type heat support catalog is generated
- **WHEN** any TerrainType heat row is inspected
- **THEN** the row SHALL expose structured source references with line anchors
- **AND** water and fire rows SHALL use commit-pinned MegaMek source references
- **AND** no-heat terrain rows SHALL use MekStation deviation source references for the local no-op mapping
- **AND** the terrainTypeHeat catalog triad SHALL enforce row-level source references before PR approval

### Requirement: Source-Backed TerrainType PSR Catalog Anchors

Every TerrainType PSR support row SHALL expose structured source references before the map is treated as source-backed validation coverage. Rubble, water, pavement, ice, swamp, and building rows SHALL cite commit-pinned MegaMek source URLs with line anchors for rubble-entry PSRs, water-entry PSRs, skidding PSRs, swamp bog-down, or building-collapse handling, plus local movement-runner, PSR factory, and PSR-resolution paths. Swamp SHALL be integrated only when movement queues swamp bog-down PSRs, jump-entry immediate stuck handling, Swamp Beast relief, and failed-PSR `UnitStuck` outcomes are covered. Building SHALL be integrated only when movement queues building-collapse PSRs from explicit BattleMech tonnage and Building constructionFactor overload checks; damage-triggered collapse, basement collapse, top-floor collapse, and WiGE flyover collapse SHALL remain explicit requirement-level gaps until those state branches are wired. Terrain rows with no terrain-entry PSR SHALL remain source-checked through local no-PSR references instead of inheriting a generic terrain authority. Any future TerrainType PSR expansion SHALL either add a MegaMek/MekHQ source reference or explicitly mark the row as a local deviation/gap.

#### Scenario: TerrainType PSR rows expose source truth

- **GIVEN** the BattleMech terrain type PSR support catalog is generated
- **WHEN** any TerrainType PSR row is inspected
- **THEN** the row SHALL expose structured source references with line anchors
- **AND** rubble, water, pavement, ice, swamp, and building rows SHALL include commit-pinned MegaMek comparison references
- **AND** swamp SHALL remain integrated only while the stuck-state PSR lifecycle stays covered by behavior tests
- **AND** building rows SHALL remain helper-only until building-collapse runtime wiring exists
- **AND** local no-PSR terrain rows SHALL use MekStation deviation source references for the local no-op mapping
- **AND** the terrainTypePsr catalog triad SHALL enforce row-level source references before PR approval

### Requirement: Source-Backed Action Eligibility Catalog Anchors

Every action eligibility support row SHALL expose structured source references before lifecycle action removal is treated as validation coverage. Turn-rotation rows SHALL cite MekStation active-unit/action-queue predicates, interactive action queries, and runner movement/weapon/physical phase actor gates. Targetability rows SHALL cite interactive and ranged/physical target filters, keeping shutdown targetability distinct from retreated/ejected target removal. Ejection damage-preservation rows SHALL cite the local ejection command/reducer path that preserves existing mech damage, and ejected/retreated target-removal rows SHALL also cite the MegaMek original-unit removal boundary where applicable. Survivor-count rows SHALL cite victory, objective, runner terminal, and terminal-event predicates.

#### Scenario: Action eligibility rows expose source truth

- **GIVEN** the BattleMech action eligibility support catalog is generated
- **WHEN** any integrated action eligibility row is inspected
- **THEN** the row SHALL include structured source references with line-anchored source URLs
- **AND** shutdown-targetability rows SHALL cite the local target filter that leaves shutdown enemies targetable
- **AND** ejected target-removal rows SHALL include MegaMek source anchors for original-unit ejection removal
- **AND** the actionEligibility catalog triad SHALL enforce row-level source references before PR approval

### Requirement: Source-Backed Representative Integration Scenario Anchors

Every representative integration scenario support row SHALL expose structured source references before lifecycle, objective, PSR-queue, ejection, terminal-state, or runner/interactive parity claims treat it as validation coverage. Turn-rotation and actor-removal rows SHALL cite active-unit/action-query predicates and runner phase gates. Targetability rows SHALL cite shutdown, retreated, and ejected target filters. Ejection rows SHALL cite the command/intent/wire integration test plus local ejection reducer behavior. Objective rows SHALL cite objective-control occupancy, objective-outcome precedence, runner state, and game-outcome calculator paths. PSR-queue lifecycle rows SHALL cite phase-management state transitions and regression tests. Terminal rows SHALL cite `endGame`, interactive finalization, runner terminal summary, and runner `GameEnded` emission.

#### Scenario: Representative integration rows expose source truth

- **GIVEN** the BattleMech representative integration support catalog is generated
- **WHEN** any integrated representative integration row is inspected
- **THEN** the row SHALL expose at least one structured source reference with a line anchor
- **AND** every row SHALL include a MekStation source reference for the executable integration path it claims
- **AND** ejection, PSR-queue, objective-outcome, and runner-terminal rows SHALL cite their focused behavior or integration tests where those tests are the executable scenario boundary

#### Scenario: Closed ejection lifecycle coverage stays out of unresolved inventory

- **GIVEN** the aggregate BattleMech combat-validation gap inventory is generated
- **WHEN** ejection lifecycle coverage rows are inspected across tactical commands, game intents, wire intents, P2P intents, invalid target states, event stream, action eligibility, representative scenarios, and objective requirements
- **THEN** those ejection coverage rows SHALL remain integrated
- **AND** no ejection or ejected row SHALL appear as helper-only or unsupported without reopening the ejection-lifecycle requirement as an explicit gap

### Requirement: Source-Backed Runner-Interactive Parity Anchors

Every runner-vs-interactive parity support row SHALL expose structured MekStation source references before the row is treated as validation coverage. Movement parity rows SHALL cite runner and interactive movement validation/event-path paths. Weapon parity rows SHALL cite target validation, to-hit calculation, indirect-fire context, and damage/critical resolution paths. Physical parity rows SHALL cite runner, interactive, shared physical resolution, and grid-occupancy refresh paths. Heat and PSR parity rows SHALL cite both quick-sim runner phases and event-sourced interactive/session resolvers. Objective and terminal parity rows SHALL cite the same representative objective and GameEnded source anchors used by integration coverage.

#### Scenario: Runner-interactive parity rows expose source truth

- **GIVEN** the BattleMech runner-interactive parity support catalog is generated
- **WHEN** any integrated parity row is inspected
- **THEN** the row SHALL expose at least one structured MekStation source reference with a line anchor
- **AND** movement, weapon, physical, heat, PSR, objective, and terminal parity rows SHALL cite their executable runner and/or interactive paths
- **AND** the parityAndIntegration catalog triad SHALL enforce row-level source references before PR approval

### Requirement: Source-Backed PSR Resolution Catalog Anchors

Every PSR resolution support row SHALL expose structured source references before the map is treated as source-backed validation coverage. Queued PSR resolution rows SHALL cite MegaMek pending-PSR storage/resolution anchors plus MekStation runner, interactive/session, and core resolver paths. Failed-fall rows SHALL cite MegaMek failed-piloting-roll fall and pilot fall-damage handling plus MekStation `UnitFell`, fall-sourced `PilotHit`, pilot wound/death, and pending-queue clearing paths. Reason-code rows SHALL cite the local reducer and shutdown-PSR queueing paths that preserve canonical reason codes.

#### Scenario: PSR resolution rows expose source truth

- **GIVEN** the BattleMech PSR resolution support catalog is generated
- **WHEN** any integrated PSR resolution row is inspected
- **THEN** the row SHALL include structured source references with line-anchored source URLs
- **AND** failed-fall rows SHALL include MegaMek source anchors for failed piloting checks and fall pilot damage
- **AND** the psrResolution catalog triad SHALL enforce row-level source references before PR approval

### Requirement: Source-Backed Damage And Critical PSR Trigger Catalog Anchors

Damage and critical-component PSR trigger rows SHALL expose structured source references before they are treated as validation coverage. Phase-damage rows SHALL cite MegaMek phase-end 20+ damage PSR checks plus MekStation damage-threshold queueing and factory paths. Hip, leg/foot actuator, and gyro critical rows SHALL cite MegaMek critical-hit PSR branches plus MekStation critical-event bridge and factory paths. EngineHit and leg-structure PSR rows SHALL remain source-visible MekStation deviations where the local trigger is broader or different than the MegaMek source branch.

#### Scenario: Damage and critical PSR trigger rows expose source truth

- **GIVEN** the BattleMech runner PSR trigger support catalog is generated
- **WHEN** the phase-damage, leg-structure, actuator-critical, gyro-critical, or engine-critical trigger rows are inspected
- **THEN** every such row SHALL carry structured source references with line anchors
- **AND** actuator and gyro critical rows SHALL include MegaMek source anchors for queued critical-hit PSRs
- **AND** the EngineHit row SHALL identify its MekStation deviation because MegaMek engine critical handling counts engine hits, heat/destruction, and explosion checks without queuing a normal fall PSR

### Requirement: Source-Backed Terrain PSR Trigger Catalog Anchors

Terrain-origin runner PSR trigger rows SHALL expose structured source references before they are treated as validation coverage. Rubble entry, water entry, skidding, and building collapse SHALL cite their corresponding MegaMek terrain PSR or collapse anchors plus MekStation movement-runner, factory, and resolver paths. Running rough terrain, moving on ice, and exiting water SHALL remain source-visible MekStation rows unless a matching MegaMek parity branch is identified.

#### Scenario: Terrain PSR trigger rows expose source truth

- **GIVEN** the BattleMech runner PSR trigger support catalog is generated
- **WHEN** terrain or building-collapse trigger rows are inspected
- **THEN** every such row SHALL carry structured source references with line anchors
- **AND** rubble, water-entry, skidding, and building-collapse rows SHALL include MegaMek source anchors where comparable
- **AND** running-rough, moving-on-ice, and exiting-water rows SHALL be marked by MekStation source references rather than inferred from unrelated MegaMek terrain behavior

### Requirement: Heat and Movement PSR Trigger Rows Expose Source Truth

Heat and movement runner PSR trigger rows SHALL expose structured source references before they are treated as validation coverage. Reactor shutdown rows SHALL cite MegaMek heat-shutdown PSR queueing plus MekStation shutdown PSR queueing/factory paths. Standing-up rows SHALL cite MegaMek `checkGetUp` and in-place stand-up skill resolution plus MekStation runner/factory paths, and SHALL keep the current failed-stand-up fall-damage difference visible as a local boundary. Running-with-damage rows SHALL cite MegaMek's combined damaged-hip-or-gyro running PSR branch plus MekStation's separate `RunningDamagedHip` and `RunningDamagedGyro` queueing/factory paths.

#### Scenario: Heat and movement PSR trigger rows expose source truth

- **GIVEN** the BattleMech runner PSR trigger support catalog is generated
- **WHEN** shutdown, standing-up, running-damaged-hip, or running-damaged-gyro rows are inspected
- **THEN** each row SHALL expose structured source references
- **AND** MegaMek-backed rows SHALL use commit-pinned MegaMek URLs with line anchors
- **AND** MekStation-specific ordering or reason-code differences SHALL carry MekStation deviation source references instead of being described as complete MegaMek parity

### Requirement: Source-Backed Heat SPA Boundary

Heat-driven pilot ability rows SHALL distinguish source-backed MegaMek behavior from local helper behavior before claiming parity. Some Like It Hot SHALL carry MegaMek source references for reducing positive heat firing modifiers by 1. Hot Dog startup, shutdown, heat-induced ammo-explosion, opt-in MaxTech pilot heat-damage, and opt-in MaxTech critical-damage checks SHALL apply MegaMek's `hotDogMod = 1` target-number relief without shifting heat thresholds. Default life-support heat damage SHALL remain threshold-based at heat 15/25+ because MegaMek does not apply `hotDogMod` to that path. Hot Dog SHALL be integrated for BattleMech heat lifecycle resolution once those source-backed paths are executable in runner and interactive heat resolution. Cool Under Fire SHALL remain out-of-scope local helper evidence and SHALL NOT be consumed by the BattleMech heat resolver until a source authority for generated-heat relief is identified.

#### Scenario: Heat SPA support rows expose source truth

- **GIVEN** the BattleMech SPA and pilot modifier catalogs are generated
- **WHEN** Hot Dog, Cool Under Fire, Some Like It Hot, and the heat-application resolver row are inspected
- **THEN** Some Like It Hot SHALL be integrated with structured MegaMek source references
- **AND** Hot Dog SHALL be integrated with structured MegaMek source references and executable startup, shutdown, ammo-explosion, optional MaxTech pilot heat-damage, and optional MaxTech critical-damage target-number coverage
- **AND** Cool Under Fire SHALL be out-of-scope with the unresolved source authority recorded as local helper evidence
- **AND** the heat-application resolver SHALL be integrated for source-backed Hot Dog, Some Like It Hot, and weapon cooling behavior while leaving Cool Under Fire unconsumed

#### Scenario: Heat-driven modifiers remain separate from core heat lifecycle completeness

- **GIVEN** core heat generation, dissipation, and lifecycle rows are integrated
- **WHEN** the BattleMech validation requirement crosswalk is inspected
- **THEN** heat-driven pilot ability and quirk modifiers SHALL have their own `heat-driven-modifiers` requirement
- **AND** that requirement SHALL reference Hot Dog, Some Like It Hot, Improved Cooling, Poor Cooling, No Cooling, and the heat-application resolver row while Cool Under Fire remains visible through the out-of-scope audit inventory
- **AND** the requirement SHALL be integrated for source-backed official heat modifiers while Cool Under Fire remains out-of-scope and unconsumed
- **AND** the integrated `heat-lifecycle` requirement SHALL NOT imply complete heat-driven modifier parity

### Requirement: Source-Backed Pilot Skill Use Rows

Pilot skill use support rows SHALL expose structured row-level source references before the map is treated as validation coverage. Ranged gunnery rows SHALL cite MegaMek ranged attack gunnery anchors plus MekStation runner/session to-hit hydration. Physical piloting rows SHALL cite MegaMek physical attack piloting baselines plus MekStation runner/session physical to-hit paths. PSR and stand-up rows SHALL cite MegaMek base piloting roll, PSR resolution, and stand-up anchors plus MekStation runner/session resolution paths. Initiative rows SHALL cite source-backed Command Mech, Battle Computer, HQ/command equipment, and Tactical Genius anchors while preserving helper-only gaps for automatic equipment hydration. MekStation-local pilot wound penalties and PSR event skill stamping SHALL be marked as explicit MekStation deviation refs rather than inferred MegaMek parity.

#### Scenario: Pilot skill use rows expose source truth

- **GIVEN** the BattleMech pilot skill support catalog is generated
- **WHEN** any `pilotSkillUse` row is inspected
- **THEN** the row SHALL carry at least one structured source reference with a line anchor
- **AND** MegaMek references SHALL be commit-pinned to the local source snapshot
- **AND** MekStation-local wound and event-stamp rows SHALL identify their executable local anchors
- **AND** the `pilotSkillUse` catalog triad SHALL enforce row-level source references before PR approval

### Requirement: Source-Backed Legacy Pilot Ability Support Rows

Legacy `pilotAbilities` support rows SHALL expose structured row-level source references before the map is treated as validation coverage. Weapon Specialist, Gunnery Specialist, Blood Stalker, Cluster Hitter, Range Master, Sniper, Oblique Attacker, and Forward Observer rows SHALL cite pinned MegaMek behavior plus MekStation helper or runner paths. Called-shot application SHALL be integrated only for the MegaMek-backed TacOps +3 called-shot penalty, and runner/event-sourced BattleMech attack declarations SHALL NOT apply local Marksman or legacy Sharpshooter called-shot reductions to that source-backed path. Marksman and Sharpshooter SHALL remain out-of-scope audit rows because MegaMek source backs TacOps called-shot penalties but does not validate those local reductions. Melee Specialist SHALL apply both source-backed physical to-hit relief and +1 physical damage. Melee Master SHALL enforce the source-backed two-allowed-physical-attacks rule and SHALL NOT be treated as a flat physical damage bonus. Generic Terrain Master SHALL remain an out-of-scope local helper row while source-backed Terrain Master variants are tracked separately, including canonical `tm_nightwalker` as helper-only with represented coarse low-light movement relief and explicit finer-light/LAM gaps.

#### Scenario: Legacy pilot ability rows expose source truth

- **GIVEN** the BattleMech SPA support catalog is generated
- **WHEN** any `pilotAbilities` support row is inspected
- **THEN** the row SHALL carry at least one structured source reference with a line anchor
- **AND** the `pilotAbilities` catalog triad SHALL enforce row-level source references before PR approval
- **AND** called-shot application SHALL remain integrated only when runner and event-sourced BattleMech attack declarations apply the +3 TacOps called-shot penalty without consuming Marksman or legacy Sharpshooter reductions
- **AND** Melee Specialist rows SHALL be integrated only when both physical to-hit and +1 physical damage behavior are wired
- **AND** Melee Master rows SHALL be integrated only when event-sourced declarations, P2P translation, UI planning, and catalog evidence enforce one physical attack for normal pilots, two physical attacks for Melee Master pilots, independent same-limb reuse rejection, and no flat physical damage behavior

### Requirement: Source-Backed Legacy Mech Quirk Support Rows

Legacy `mechQuirks` support rows SHALL expose structured row-level source references before the map is treated as validation coverage. PSR quirks SHALL cite MegaMek PSR behavior and preserve helper-only gaps where MekStation local semantics differ: Easy Pilot SHALL apply only through MegaMek's base-piloting gate for BattleMech difficult-terrain and 20+ phase-damage PSRs before being treated as integrated, Cramped Cockpit SHALL apply only when the pilot lacks MegaMek's `small_pilot` ability before being treated as integrated, Stable SHALL apply only to source-backed Kick/Push PSRs before being treated as integrated, and No Arms SHALL apply only to MegaMek's stand-up PSR branch before its PSR behavior is treated as integrated. Physical quirk rows SHALL cite MegaMek punch/arm/stand-up or local resolver anchors. Battle Fists SHALL apply source-backed matching-arm punch to-hit relief when the hand actuator is working and SHALL NOT be treated as flat punch damage. No Arms physical restrictions SHALL cover punch, push, and arm-mounted melee restrictions before being treated as integrated. Low Arms SHALL remain registry-only `out-of-scope` audit evidence unless a pinned MegaMek or MekHQ authority exposes combat resolver semantics; local elevation gates SHALL NOT be treated as covered behavior. Rugged SHALL cite MekHQ maintenance behavior and stay in the `out-of-scope` audit inventory because campaign maintenance-cycle behavior is outside BattleMech combat runner validation scope. Protected/Exposed Actuators SHALL cite MegaMek anti-Mek target-number behavior and stay in the `out-of-scope` audit inventory because Leg/Swarm anti-Mek attacks belong to the battle-armor/infantry combat matrix.

#### Scenario: Legacy quirk rows expose source truth

- **GIVEN** the BattleMech quirk support catalog is generated
- **WHEN** any `mechQuirks` support row is inspected
- **THEN** the row SHALL carry at least one structured source reference with a line anchor
- **AND** Battle Fists SHALL be integrated only when helper, runner, and catalog coverage apply matching-arm punch to-hit relief without punch damage side effects
- **AND** Stable SHALL be integrated only when damage/terrain/recovery PSRs no longer receive Stable relief and kick/push PSRs still do
- **AND** Easy Pilot SHALL be integrated only when both terrain and 20+ phase-damage PSRs consume the MegaMek piloting-skill gate
- **AND** Cramped Cockpit SHALL be integrated only when Small Pilot suppresses the PSR penalty
- **AND** No Arms SHALL be integrated only when punch, push, arm-mounted melee, runner stand-up PSRs, and interactive stand-up PSRs all consume the MegaMek No/Minimal Arms branches
- **AND** Low Arms SHALL stay out-of-scope and no-op until a pinned MegaMek or MekHQ authority exposes combat resolver semantics
- **AND** Protected/Exposed Actuators SHALL stay out-of-scope for the BattleMech runner matrix while anti-Mek Leg/Swarm actions remain owned by the battle-armor/infantry combat matrix
- **AND** the physical-restriction resolver row SHALL NOT assign Low Arms while the quirk remains registry-only out-of-scope audit evidence

### Requirement: Source-Backed Consciousness Toughness Boundary

Consciousness-related pilot ability rows SHALL distinguish MegaMek RPG Toughness, Pain Resistance, and Iron Man semantics from MekStation legacy aliases before claiming parity. RPG Toughness SHALL be treated as a game-option-gated numeric crew toughness target-number reduction, not as the Pain Resistance SPA. MekStation SHALL support that reduction only through explicit numeric `pilotToughness` combat state until automatic game-option hydration and MUL crew-toughness import are wired. Pain Resistance SHALL be source-backed as +1 consciousness and wake-up rolls plus ammunition-explosion pilot-damage reduction, not ranged to-hit wound-penalty relief. Iron Man SHALL be source-backed as ammunition-explosion pilot-hit reduction, not generic consciousness target-number relief. MekStation local Iron Will SHALL remain out-of-scope for the official BattleMech blocker inventory until a source-backed combat option id is identified, and local Toughness aliases SHALL remain unsupported/no-op for generic consciousness relief.

#### Scenario: Consciousness toughness rows expose source truth

- **GIVEN** the BattleMech SPA and pilot modifier resolver catalogs are generated
- **WHEN** Iron Man, Pain Resistance, Toughness, Iron Will, consciousness application, or local Pain Resistance to-hit application rows are inspected
- **THEN** each row SHALL expose structured MegaMek and MekStation deviation source references
- **AND** Iron Man SHALL be integrated only as source-backed ammunition-explosion pilot-damage reduction
- **AND** Pain Resistance SHALL be integrated only when source-backed consciousness, wake-up, ammunition-explosion reduction, and ranged-to-hit non-application paths are all represented
- **AND** explicit numeric `pilotToughness` state SHALL lower consciousness target numbers in shared damage, runner pilot-damage phases, and interactive PSR/heat/physical/ammo-explosion paths
- **AND** legacy Toughness ability strings SHALL remain unsupported/no-op for generic consciousness relief instead of using local alias behavior
- **AND** local Iron Will SHALL remain out-of-scope for the official BattleMech blocker inventory while source-backed Iron Man remains ammo-explosion-only
- **AND** the legacy Pain Resistance ranged to-hit row SHALL be integrated as a source-backed non-application only when runner and event-sourced ranged attacks preserve raw pilot wound penalties
- **AND** consciousness application SHALL remain helper-only while automatic RPG Toughness game-option hydration and MUL crew toughness import remain absent
- **AND** integrated ranged to-hit resolver rows SHALL NOT list Pain Resistance as source-backed ranged to-hit support

### Requirement: Source-Backed Weapon Cooling Quirk Heat

Weapon cooling quirk validation SHALL use MegaMek weapon heat semantics before counting cooling quirk rows as integrated. Improved Cooling SHALL reduce final weapon heat by 1 but never below 1. Poor Cooling SHALL add 1 heat. No Cooling SHALL add 2 heat, not double the base weapon heat. The support catalog and heat resolver row SHALL expose commit-pinned MegaMek source references for the heat calculation and quirk eligibility boundary.

#### Scenario: Weapon cooling quirks use source-backed heat values

- **GIVEN** the BattleMech quirk and heat resolver catalogs are generated
- **WHEN** Improved Cooling, Poor Cooling, or No Cooling support is inspected
- **THEN** each row SHALL be integrated with structured MegaMek source references for weapon heat calculation and quirk registration
- **AND** focused helper and heat-phase tests SHALL prove Improved Cooling flooring, Poor Cooling `+1`, and No Cooling `+2`
- **AND** the heat-application resolver SHALL cite the same weapon cooling source references while remaining integrated only for source-backed Hot Dog, Some Like It Hot, and weapon cooling behavior

### Requirement: Source-Truth Cross-Check Discipline

Combat feature work SHALL update OpenSpec, the validation catalog, and executable tests together. Before marking a mechanic integrated, the implementation SHALL be cross-checked against official rules or MegaMek / MekHQ behavior notes, with gaps recorded as partial or unsupported rather than inferred as complete.

#### Scenario: Feature headway updates specs and evidence together

- **GIVEN** a developer adds or changes BattleMech combat logic
- **WHEN** the work changes action availability, modifiers, turn lifecycle, damage, heat, movement, targetability, or resolution outcomes
- **THEN** the active OpenSpec change SHALL be updated in the same slice
- **AND** the validation catalog SHALL be updated in the same slice
- **AND** focused tests SHALL prove the updated rule path
- **AND** the aggregate catalog triad evidence SHALL be updated when the work creates or changes a support map's source authority boundary or executable test surface
