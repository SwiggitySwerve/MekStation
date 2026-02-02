# Core Simulation Infrastructure Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-02-01
**Dependencies**: None (foundation)
**Affects**: All simulation components

---

## Overview

### Purpose
Provides foundational infrastructure for deterministic game simulation including seeded random number generation, weighted selection, and simulation configuration management.

### Scope
**In Scope:**
- Seeded PRNG (Mulberry32 algorithm)
- Weighted random selection (adapted from MekHQ pattern)
- Simulation configuration types
- Simulation result types
- Simulation context management

**Out of Scope:**
- Game engine modifications
- UI components
- Browser-specific APIs
- Network communication

### Key Concepts
- **Seeded Random**: Deterministic pseudo-random number generator that produces identical sequences from the same seed
- **Weighted Table**: Data structure for probability-based selection where items have different selection weights
- **Simulation Context**: Container holding seed, configuration, and shared state for a simulation run
- **Reproducibility**: Ability to replay exact same simulation by using same seed value

---

## Requirements

### Requirement: Seeded Random Number Generation

The system SHALL provide deterministic random number generation using the Mulberry32 algorithm.

**Rationale**: Reproducibility is critical for debugging failed scenarios and validating bug fixes.

**Priority**: Critical

#### Scenario: Deterministic sequence generation
**GIVEN** a SeededRandom instance with seed 12345
**WHEN** calling next() multiple times
**THEN** the sequence SHALL be identical across all runs with same seed
**AND** the sequence SHALL differ from sequences with different seeds

#### Scenario: Integer range generation
**GIVEN** a SeededRandom instance
**WHEN** calling nextInt(1, 6) for dice roll
**THEN** result SHALL be integer between 1 and 6 inclusive
**AND** distribution SHALL be uniform over many calls

#### Scenario: 2d6 dice roll
**GIVEN** a SeededRandom instance
**WHEN** calling roll2d6()
**THEN** result SHALL be sum of two independent 1-6 rolls
**AND** result SHALL be between 2 and 12 inclusive
**AND** distribution SHALL match standard 2d6 probability curve

### Requirement: Weighted Random Selection

The system SHALL support weighted random selection using WeightedTable pattern from MekHQ.

**Rationale**: Scenario generation requires non-uniform probability distributions for realistic force composition.

**Priority**: Critical

#### Scenario: Basic weighted selection
**GIVEN** a WeightedTable with entries: (weight=3, value='A'), (weight=1, value='B')
**WHEN** selecting with seeded random over 1000 iterations
**THEN** 'A' SHALL be selected approximately 75% of the time
**AND** 'B' SHALL be selected approximately 25% of the time

#### Scenario: Roll modifier support
**GIVEN** a WeightedTable with multiple entries
**WHEN** selecting with rollMod parameter
**THEN** selection SHALL bias toward higher-weight entries when rollMod > 0
**AND** selection SHALL bias toward lower-weight entries when rollMod < 0

#### Scenario: Empty table handling
**GIVEN** an empty WeightedTable
**WHEN** calling select()
**THEN** result SHALL be null
**AND** no exception SHALL be thrown

### Requirement: Simulation Configuration

The system SHALL define configuration interface for simulation parameters.

**Rationale**: Standardized configuration enables consistent scenario generation and batch execution.

**Priority**: High

#### Scenario: Valid configuration
**GIVEN** an ISimulationConfig with all required fields
**WHEN** validating configuration
**THEN** seed SHALL be non-negative integer
**AND** turnLimit SHALL be positive integer
**AND** unitCount SHALL be between 1 and 4 inclusive
**AND** mapRadius SHALL be between 5 and 10 inclusive

#### Scenario: Preset configuration
**GIVEN** a preset name 'standard-lance'
**WHEN** creating configuration from preset
**THEN** configuration SHALL have preset-specific defaults
**AND** configuration SHALL be valid per validation rules

### Requirement: Simulation Result Structure

The system SHALL define result interface capturing simulation outcomes.

**Rationale**: Standardized results enable metrics collection, reporting, and replay.

**Priority**: High

#### Scenario: Complete result capture
**GIVEN** a completed simulation
**WHEN** creating ISimulationResult
**THEN** result SHALL include seed, config, winner, turns, duration
**AND** result SHALL include full event history
**AND** result SHALL include final game state
**AND** result SHALL include all violations detected

#### Scenario: Failed simulation result
**GIVEN** a simulation that crashes or times out
**WHEN** creating ISimulationResult
**THEN** winner SHALL be null
**AND** violations SHALL include error details
**AND** events SHALL include all events up to failure point

---

## Data Model Requirements

### Required Interfaces

The implementation MUST provide the following TypeScript interfaces:

```typescript
/**
 * Seeded pseudo-random number generator using Mulberry32 algorithm.
 * Provides deterministic random sequences for reproducible simulations.
 */
interface ISeededRandom {
  /**
   * Generate next random number in sequence.
   * @returns Random float between 0 (inclusive) and 1 (exclusive)
   */
  readonly next: () => number;

  /**
   * Generate random integer in range [min, max] inclusive.
   * @param min Minimum value (inclusive)
   * @param max Maximum value (inclusive)
   * @returns Random integer in specified range
   */
  readonly nextInt: (min: number, max: number) => number;

  /**
   * Roll 2d6 (two six-sided dice).
   * @returns Sum of two independent 1-6 rolls (2-12)
   */
  readonly roll2d6: () => number;
}

/**
 * Weighted random selection table.
 * Adapted from MekHQ's WeightedTable pattern.
 * @template T Type of values stored in table
 */
interface IWeightedTable<T> {
  /**
   * Add entry to weighted table.
   * @param weight Selection weight (higher = more likely)
   * @param value Value to return when selected
   */
  readonly add: (weight: number, value: T) => void;

  /**
   * Select random entry based on weights.
   * @param random Seeded random instance for deterministic selection
   * @param rollMod Modifier to bias selection (-1 to 1, default 0)
   * @returns Selected value or null if table empty
   */
  readonly select: (random: ISeededRandom, rollMod?: number) => T | null;

  /**
   * Get total weight of all entries.
   * @returns Sum of all weights
   */
  readonly getTotalWeight: () => number;

  /**
   * Get number of entries in table.
   * @returns Entry count
   */
  readonly size: () => number;
}

/**
 * Configuration for a single simulation run.
 */
interface ISimulationConfig {
  /**
   * PRNG seed for reproducibility.
   * Same seed produces identical simulation.
   * @example 12345
   */
  readonly seed: number;

  /**
   * Maximum turns before timeout.
   * @example 100
   */
  readonly turnLimit: number;

  /**
   * Units per side (player and opponent).
   * @example 4
   */
  readonly unitCount: number;

  /**
   * Hex map radius (distance from center).
   * @example 8
   */
  readonly mapRadius: number;

  /**
   * Optional preset configuration name.
   * @example "standard-lance"
   */
  readonly preset?: 'light-skirmish' | 'standard-lance' | 'stress-test';
}

/**
 * Result of a completed simulation run.
 */
interface ISimulationResult {
  /**
   * Seed used for this simulation.
   * Use to reproduce exact scenario.
   */
  readonly seed: number;

  /**
   * Configuration used for this simulation.
   */
  readonly config: ISimulationConfig;

  /**
   * Winner of the simulation.
   * null if timed out or crashed.
   */
  readonly winner: 'player' | 'opponent' | 'draw' | null;

  /**
   * Number of turns completed.
   */
  readonly turns: number;

  /**
   * Simulation duration in milliseconds.
   */
  readonly durationMs: number;

  /**
   * Full event history for replay.
   */
  readonly events: IBaseEvent[];

  /**
   * Final game state after last event.
   */
  readonly finalState: IGameState;

  /**
   * Invariant violations detected during simulation.
   */
  readonly violations: IViolation[];

  /**
   * Per-game metrics collected during simulation.
   */
  readonly metrics: ISimulationMetrics;
}

/**
 * Simulation context holding shared state.
 */
interface ISimulationContext {
  /**
   * Seeded random instance for this simulation.
   */
  readonly random: ISeededRandom;

  /**
   * Configuration for this simulation.
   */
  readonly config: ISimulationConfig;

  /**
   * Current game state.
   */
  readonly state: IGameState;
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `seed` | `number` | Yes | PRNG seed | Non-negative integer | N/A |
| `turnLimit` | `number` | Yes | Max turns | Positive integer | 100 |
| `unitCount` | `number` | Yes | Units per side | 1-4 | 4 |
| `mapRadius` | `number` | Yes | Map radius | 5-10 | 8 |
| `preset` | `string` | No | Preset name | See enum | undefined |

### Type Constraints

- `seed` MUST be non-negative integer
- `turnLimit` MUST be positive integer (> 0)
- `unitCount` MUST be integer between 1 and 4 inclusive
- `mapRadius` MUST be integer between 5 and 10 inclusive
- `winner` MUST be one of: 'player', 'opponent', 'draw', null

---

## Calculation Formulas

### Mulberry32 PRNG Algorithm

**Formula**:
```typescript
let t = state += 0x6D2B79F5;
t = Math.imul(t ^ t >>> 15, t | 1);
t ^= t + Math.imul(t ^ t >>> 7, t | 61);
return ((t ^ t >>> 14) >>> 0) / 4294967296;
```

**Where**:
- `state` = internal PRNG state (32-bit integer)
- `Math.imul` = 32-bit integer multiplication
- `>>>` = unsigned right shift
- `^` = bitwise XOR
- `|` = bitwise OR

**Example**:
```typescript
Input: state = 12345
Step 1: t = 12345 + 0x6D2B79F5 = 1835627322
Step 2: t = Math.imul(1835627322 ^ 112226, 1835627323) = ...
Output: 0.123456789 (example value)
```

**Special Cases**:
- When state = 0: Algorithm still produces valid sequence
- When state overflows: Wraps to 32-bit unsigned integer

**Rounding Rules**:
- Division by 4294967296 produces float in [0, 1)
- No rounding needed for next()
- nextInt() uses Math.floor for integer conversion

### Weighted Selection Algorithm

**Formula**:
```typescript
roll = min(floor(random.next() * total + total * rollMod + 0.5), total - 1)
```

**Where**:
- `total` = sum of all weights
- `random.next()` = random float [0, 1)
- `rollMod` = modifier in range [-1, 1]

**Example**:
```typescript
Input: weights = [3, 1], total = 4, random.next() = 0.6, rollMod = 0
Calculation: roll = floor(0.6 * 4 + 0 + 0.5) = floor(2.9) = 2
Selection: 2 < 3? No. 2 - 3 = -1 < 1? Yes. Return value at index 1.
Output: Second entry selected
```

**Special Cases**:
- When rollMod = 1: Always selects last entry
- When rollMod = -1: Always selects first entry
- When total = 0: Return null

**Rounding Rules**:
- Use Math.floor for roll calculation
- Clamp roll to [0, total - 1]

---

## Validation Rules

### Validation: Seed Non-Negative

**Rule**: Seed must be non-negative integer

**Severity**: Error

**Condition**:
```typescript
if (seed < 0 || !Number.isInteger(seed)) {
  // invalid
} else {
  // valid
}
```

**Error Message**: "Seed must be non-negative integer, got: {seed}"

**User Action**: Provide valid seed value (0 or positive integer)

### Validation: Turn Limit Positive

**Rule**: Turn limit must be positive integer

**Severity**: Error

**Condition**:
```typescript
if (turnLimit <= 0 || !Number.isInteger(turnLimit)) {
  // invalid
} else {
  // valid
}
```

**Error Message**: "Turn limit must be positive integer, got: {turnLimit}"

**User Action**: Provide valid turn limit (> 0)

### Validation: Unit Count Range

**Rule**: Unit count must be between 1 and 4 inclusive

**Severity**: Error

**Condition**:
```typescript
if (unitCount < 1 || unitCount > 4 || !Number.isInteger(unitCount)) {
  // invalid
} else {
  // valid
}
```

**Error Message**: "Unit count must be 1-4, got: {unitCount}"

**User Action**: Provide valid unit count (1, 2, 3, or 4)

### Validation: Map Radius Range

**Rule**: Map radius must be between 5 and 10 inclusive

**Severity**: Error

**Condition**:
```typescript
if (mapRadius < 5 || mapRadius > 10 || !Number.isInteger(mapRadius)) {
  // invalid
} else {
  // valid
}
```

**Error Message**: "Map radius must be 5-10, got: {mapRadius}"

**User Action**: Provide valid map radius (5-10)

---

## Dependencies

### Depends On
- **TypeScript**: Language features (interfaces, generics)
- **Math.imul**: 32-bit integer multiplication (ES6+)

### Used By
- **Valid Move AI**: Uses SeededRandom for move selection
- **Scenario Generator**: Uses WeightedTable for force composition
- **Simulation Runner**: Uses ISimulationConfig and ISimulationResult
- **Metrics Collector**: Uses ISimulationResult
- **Snapshot Manager**: Uses ISimulationResult

### Construction Sequence
1. Create SeededRandom with seed
2. Create WeightedTable instances for scenario generation
3. Create ISimulationConfig
4. Create SimulationContext with random, config, state
5. Run simulation using context
6. Create ISimulationResult with outcomes

---

## Implementation Notes

### Performance Considerations
- Mulberry32 is fast (~10ns per call on modern hardware)
- WeightedTable.select() is O(n) where n = entry count
- Consider caching total weight if table is static
- Avoid creating new SeededRandom instances mid-simulation

### Edge Cases
- **Seed = 0**: Valid seed, produces deterministic sequence
- **Empty WeightedTable**: select() returns null
- **Single entry WeightedTable**: Always returns that entry
- **Negative weights**: Not validated, may produce unexpected results

### Common Pitfalls
- **Pitfall**: Using Math.random() instead of SeededRandom
  - **Solution**: Always pass SeededRandom instance explicitly
- **Pitfall**: Modifying state outside SeededRandom class
  - **Solution**: Keep state private, expose only next() method
- **Pitfall**: Forgetting to use same seed for reproduction
  - **Solution**: Always log seed in simulation results

---

## Examples

### Example 1: Basic SeededRandom Usage

**Input**:
```typescript
const random = new SeededRandom(12345);
```

**Processing**:
```typescript
// Generate sequence of random numbers
const values = [
  random.next(),      // 0.123456789
  random.next(),      // 0.987654321
  random.nextInt(1, 6), // 4
  random.roll2d6()    // 7
];
```

**Output**:
```typescript
// Same seed always produces same sequence
const random2 = new SeededRandom(12345);
random2.next(); // 0.123456789 (identical to first call above)
```

### Example 2: WeightedTable for Unit Selection

**Input**:
```typescript
const unitTable = new WeightedTable<string>();
unitTable.add(3, 'Light');   // 3/7 = 43% chance
unitTable.add(2, 'Medium');  // 2/7 = 29% chance
unitTable.add(1, 'Heavy');   // 1/7 = 14% chance
unitTable.add(1, 'Assault'); // 1/7 = 14% chance
```

**Processing**:
```typescript
const random = new SeededRandom(54321);
const selections = [];
for (let i = 0; i < 1000; i++) {
  selections.push(unitTable.select(random));
}
```

**Output**:
```typescript
// Distribution over 1000 selections:
// Light: ~430 (43%)
// Medium: ~290 (29%)
// Heavy: ~140 (14%)
// Assault: ~140 (14%)
```

### Example 3: Simulation Configuration

**Input**:
```typescript
const config: ISimulationConfig = {
  seed: Date.now(),
  turnLimit: 100,
  unitCount: 4,
  mapRadius: 8,
  preset: 'standard-lance'
};
```

**Processing**:
```typescript
// Validate configuration
function validateConfig(config: ISimulationConfig): string[] {
  const errors: string[] = [];
  if (config.seed < 0) errors.push('Seed must be non-negative');
  if (config.turnLimit <= 0) errors.push('Turn limit must be positive');
  if (config.unitCount < 1 || config.unitCount > 4) {
    errors.push('Unit count must be 1-4');
  }
  if (config.mapRadius < 5 || config.mapRadius > 10) {
    errors.push('Map radius must be 5-10');
  }
  return errors;
}
```

**Output**:
```typescript
const errors = validateConfig(config);
// errors = [] (valid configuration)
```

---

## References

### External References
- **Mulberry32 PRNG**: https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32
- **MekHQ WeightedTable**: `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\againstTheBot\WeightedTable.java`

### Related Documentation
- Simulation Runner Specification (depends on this spec)
- Scenario Generator Specification (depends on this spec)
- Valid Move AI Specification (depends on this spec)

---

## Changelog

### Version 1.0 (2026-02-01)
- Initial specification
- Defined SeededRandom interface and Mulberry32 algorithm
- Defined WeightedTable interface and selection algorithm
- Defined ISimulationConfig and ISimulationResult interfaces
- Defined validation rules for configuration parameters
