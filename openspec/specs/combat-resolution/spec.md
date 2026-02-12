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
