# Dice System Specification

## Purpose

The Dice System provides the foundational random number generation and dice rolling functionality for all BattleTech gameplay mechanics. It defines two complementary roller types—`D6Roller` for single die rolls and `DiceRoller` for complete 2d6 results—and implements the injectable dependency injection pattern to enable deterministic testing, seeded randomness, and replay functionality. This system is the single source of truth for all dice operations across combat resolution, fall mechanics, physical attacks, and other gameplay systems that require randomness.

## Requirements

### Requirement: D6Roller Type Definition

The system SHALL define a `D6Roller` type as a function that returns a single d6 value (1-6) with no parameters.

#### Scenario: D6Roller returns valid d6 range

- **GIVEN** a `D6Roller` function
- **WHEN** the roller is called
- **THEN** the returned value SHALL be an integer between 1 and 6 inclusive
- **AND** the value SHALL be uniformly distributed across the range (with sufficient samples)

#### Scenario: D6Roller is injectable

- **GIVEN** a function that accepts a `D6Roller` parameter
- **WHEN** the function is called with a custom roller
- **THEN** the custom roller SHALL be invoked instead of the default
- **AND** the function's behavior SHALL depend on the custom roller's output

### Requirement: DiceRoller Type Definition

The system SHALL define a `DiceRoller` type as a function that returns a complete 2d6 roll result object with individual dice values, total, and special roll detection.

#### Scenario: DiceRoller returns complete result object

- **GIVEN** a `DiceRoller` function
- **WHEN** the roller is called
- **THEN** the returned object SHALL have properties: `dice` (readonly number array), `total` (number), `isSnakeEyes` (boolean), `isBoxcars` (boolean)
- **AND** `dice` SHALL contain exactly 2 elements
- **AND** each element SHALL be between 1 and 6 inclusive

#### Scenario: DiceRoller detects snake eyes (2)

- **GIVEN** a `DiceRoller` that rolls [1, 1]
- **WHEN** the roller is called
- **THEN** `total` SHALL be 2
- **AND** `isSnakeEyes` SHALL be true
- **AND** `isBoxcars` SHALL be false

#### Scenario: DiceRoller detects boxcars (12)

- **GIVEN** a `DiceRoller` that rolls [6, 6]
- **WHEN** the roller is called
- **THEN** `total` SHALL be 12
- **AND** `isBoxcars` SHALL be true
- **AND** `isSnakeEyes` SHALL be false

#### Scenario: DiceRoller normal roll (neither snake eyes nor boxcars)

- **GIVEN** a `DiceRoller` that rolls [3, 4]
- **WHEN** the roller is called
- **THEN** `total` SHALL be 7
- **AND** `isSnakeEyes` SHALL be false
- **AND** `isBoxcars` SHALL be false

### Requirement: Default D6 Roller Implementation

The system SHALL provide a `defaultD6Roller` function that implements the standard d6 roller using `Math.random()`.

#### Scenario: defaultD6Roller uses Math.random

- **GIVEN** the `defaultD6Roller` function
- **WHEN** called multiple times
- **THEN** it SHALL produce varying results across the range [1, 6]
- **AND** the distribution SHALL approximate uniform randomness

#### Scenario: defaultD6Roller is exported

- **GIVEN** the `diceTypes.ts` module
- **WHEN** imported
- **THEN** `defaultD6Roller` SHALL be available as a named export
- **AND** it SHALL be usable as a `D6Roller` type

### Requirement: rollD6 Function

The system SHALL provide a `rollD6` function that rolls a single d6 using an injectable `D6Roller` parameter, defaulting to `defaultD6Roller`.

#### Scenario: rollD6 with default roller

- **GIVEN** no `D6Roller` parameter provided to `rollD6`
- **WHEN** `rollD6()` is called
- **THEN** it SHALL use `defaultD6Roller` internally
- **AND** the result SHALL be between 1 and 6 inclusive

#### Scenario: rollD6 with custom roller

- **GIVEN** a custom `D6Roller` that always returns 4
- **WHEN** `rollD6(customRoller)` is called
- **THEN** the result SHALL be 4
- **AND** the custom roller SHALL be invoked exactly once

#### Scenario: rollD6 deterministic with seeded roller

- **GIVEN** a seeded `D6Roller` that produces [3, 5, 2, 6, 1] in sequence
- **WHEN** `rollD6(seededRoller)` is called 5 times
- **THEN** results SHALL be [3, 5, 2, 6, 1] in order
- **AND** the same seed SHALL produce the same sequence on subsequent calls

### Requirement: roll2d6 Function

The system SHALL provide a `roll2d6` function that rolls two d6 dice and returns a complete result object with individual dice, total, and special roll detection.

#### Scenario: roll2d6 with default roller

- **GIVEN** no `D6Roller` parameter provided to `roll2d6`
- **WHEN** `roll2d6()` is called
- **THEN** it SHALL use `defaultD6Roller` internally
- **AND** the returned object SHALL have `dice` array with 2 elements
- **AND** each element SHALL be between 1 and 6 inclusive

#### Scenario: roll2d6 with custom roller

- **GIVEN** a custom `D6Roller` that always returns 3
- **WHEN** `roll2d6(customRoller)` is called
- **THEN** `dice` SHALL be [3, 3]
- **AND** `total` SHALL be 6
- **AND** `isSnakeEyes` SHALL be false
- **AND** `isBoxcars` SHALL be false

#### Scenario: roll2d6 deterministic with seeded roller

- **GIVEN** a seeded `D6Roller` that produces [2, 5, 1, 1, 4, 6] in sequence
- **WHEN** `roll2d6(seededRoller)` is called 3 times
- **THEN** results SHALL be:
  - First: `{dice: [2, 5], total: 7, isSnakeEyes: false, isBoxcars: false}`
  - Second: `{dice: [1, 1], total: 2, isSnakeEyes: true, isBoxcars: false}`
  - Third: `{dice: [4, 6], total: 10, isSnakeEyes: false, isBoxcars: false}`

#### Scenario: roll2d6 probability distribution

- **GIVEN** a `roll2d6` function called 36,000 times with default roller
- **WHEN** results are aggregated by total value
- **THEN** the distribution SHALL approximate the standard 2d6 probabilities:
  - Total 2: ~2.8% (1/36)
  - Total 7: ~16.7% (6/36)
  - Total 12: ~2.8% (1/36)
- **AND** no total SHALL be outside the range [2, 12]

### Requirement: Injectable Dependency Injection Pattern

The system SHALL support the injectable dependency injection pattern for all dice functions, enabling deterministic testing and replay functionality.

#### Scenario: Seeded roller enables deterministic testing

- **GIVEN** two identical game scenarios with the same seeded `D6Roller`
- **WHEN** both scenarios execute all dice rolls
- **THEN** all dice results SHALL be identical
- **AND** the game outcomes SHALL be identical

#### Scenario: Different seeds produce different results

- **GIVEN** two identical game scenarios with different seeded `D6Roller` instances
- **WHEN** both scenarios execute all dice rolls
- **THEN** at least one dice result SHALL differ
- **AND** the game outcomes MAY differ

#### Scenario: Roller injection in combat context

- **GIVEN** a combat resolution function that accepts a `D6Roller` parameter
- **WHEN** called with a deterministic seeded roller
- **THEN** the combat result SHALL be reproducible
- **AND** the same seed SHALL produce the same attack outcome, hit location, and damage

#### Scenario: No seed uses true randomness

- **GIVEN** a `roll2d6` function called with `defaultD6Roller` (no seed)
- **WHEN** called multiple times in sequence
- **THEN** results SHALL vary randomly
- **AND** the sequence SHALL not repeat predictably

### Requirement: Cross-Module Usage

The system SHALL be used by combat resolution, fall mechanics, and physical attack systems for all randomness.

#### Scenario: Combat resolution uses DiceRoller

- **GIVEN** a combat resolution system that needs to roll 2d6 for to-hit
- **WHEN** the system calls `roll2d6(diceRoller)`
- **THEN** the result SHALL be used for hit determination
- **AND** the same seeded roller SHALL produce the same hit/miss outcome

#### Scenario: Fall mechanics uses D6Roller

- **GIVEN** a fall mechanics system that needs to roll 1d6 for damage
- **WHEN** the system calls `rollD6(diceRoller)`
- **THEN** the result SHALL be between 1 and 6
- **AND** the same seeded roller SHALL produce the same fall damage

#### Scenario: Physical attack system uses DiceRoller

- **GIVEN** a physical attack system that needs to roll 2d6 for punch to-hit
- **WHEN** the system calls `roll2d6(diceRoller)`
- **THEN** the result SHALL determine punch accuracy
- **AND** the same seeded roller SHALL produce the same punch outcome

### Requirement: Type Safety and Exports

The system SHALL export all types and functions as named exports for type-safe usage across the codebase.

#### Scenario: All types are exported

- **GIVEN** the `diceTypes.ts` module
- **WHEN** imported in another module
- **THEN** `D6Roller` type SHALL be available
- **AND** `DiceRoller` type SHALL be available
- **AND** both types SHALL be usable in function signatures

#### Scenario: All functions are exported

- **GIVEN** the `diceTypes.ts` module
- **WHEN** imported in another module
- **THEN** `defaultD6Roller` function SHALL be available
- **AND** `rollD6` function SHALL be available
- **AND** `roll2d6` function SHALL be available
- **AND** all functions SHALL be callable

#### Scenario: IDiceRoll interface is imported

- **GIVEN** the `diceTypes.ts` module
- **WHEN** examined for imports
- **THEN** it SHALL import `IDiceRoll` from `@/types/gameplay`
- **AND** `roll2d6` SHALL return an object matching `IDiceRoll` interface
