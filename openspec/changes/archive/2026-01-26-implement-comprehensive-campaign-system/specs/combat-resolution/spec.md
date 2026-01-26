# Combat Resolution Specification

## ADDED Requirements

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
