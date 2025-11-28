# Weight Class System Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2025-11-28
**Dependencies**: Core Entity Types, Physical Properties System
**Affects**: Movement System, Jump Jet calculations, Validation Patterns, Construction Rules, UI components

---

## Overview

### Purpose
Defines the BattleMech weight class classification system as the single source of truth for tonnage-based categorization. Establishes standardized weight class boundaries, tonnage validation rules, and classification functions for consistent mech categorization throughout the application.

### Scope
**In Scope:**
- Weight class enumeration and boundaries
- Tonnage validation rules (20-100 tons, divisible by 5)
- Weight class classification function
- Weight class consistency validation
- Weight-dependent component rules (jump jet calculations, movement modifiers)
- Unit filtering and categorization by weight class

**Out of Scope:**
- Component-specific weight calculations (covered in individual component specs)
- Total unit weight summation (covered in Construction Rules Core)
- Weight budget validation (covered in Construction Rules Core)
- SuperHeavy mechs (105-200 tons) - reserved for future implementation
- Non-BattleMech unit types (vehicles, aerospace, infantry)

### Key Concepts
- **Weight Class**: Category classification based on mech tonnage (Light, Medium, Heavy, Assault)
- **Tonnage**: The total mass of a BattleMech in tons (must be 20-100 and divisible by 5)
- **Weight Class Boundaries**: Fixed tonnage ranges defining each weight class
- **Weight-Dependent Rules**: Game mechanics that vary by weight class (jump jet MP, walk MP maximums)
- **Classification**: Deterministic function mapping tonnage to weight class

---

## Requirements

### Requirement: Weight Class Enumeration
The system SHALL define four standard BattleMech weight classes with fixed tonnage boundaries.

**Rationale**: BattleTech categorizes all standard mechs into four weight classes that affect gameplay, construction rules, and strategic deployment.

**Priority**: Critical

#### Scenario: Light mech classification
**GIVEN** a BattleMech with tonnage between 20-35 tons (inclusive)
**WHEN** determining weight class
**THEN** it SHALL be classified as Light
**AND** weight class SHALL be WeightClass.LIGHT

#### Scenario: Medium mech classification
**GIVEN** a BattleMech with tonnage between 40-55 tons (inclusive)
**WHEN** determining weight class
**THEN** it SHALL be classified as Medium
**AND** weight class SHALL be WeightClass.MEDIUM

#### Scenario: Heavy mech classification
**GIVEN** a BattleMech with tonnage between 60-75 tons (inclusive)
**WHEN** determining weight class
**THEN** it SHALL be classified as Heavy
**AND** weight class SHALL be WeightClass.HEAVY

#### Scenario: Assault mech classification
**GIVEN** a BattleMech with tonnage between 80-100 tons (inclusive)
**WHEN** determining weight class
**THEN** it SHALL be classified as Assault
**AND** weight class SHALL be WeightClass.ASSAULT

### Requirement: Tonnage Validation
BattleMech tonnage SHALL be validated against standard construction rules.

**Rationale**: BattleTech construction rules require specific tonnage values. Invalid tonnages cannot produce valid mechs.

**Priority**: Critical

#### Scenario: Valid tonnage range
**GIVEN** a BattleMech tonnage value
**WHEN** validating the tonnage
**THEN** tonnage MUST be >= 20 tons
**AND** tonnage MUST be <= 100 tons
**AND** tonnage MUST be finite (not NaN, Infinity, or -Infinity)

#### Scenario: Tonnage divisibility
**GIVEN** a BattleMech tonnage value
**WHEN** validating the tonnage
**THEN** tonnage MUST be divisible by 5
**AND** tonnage MUST be a whole number (integer)

#### Scenario: Invalid tonnage rejected
**GIVEN** a tonnage that is < 20, > 100, not divisible by 5, or non-finite
**WHEN** validating the mech
**THEN** validation SHALL fail with error
**AND** error message SHALL indicate specific tonnage constraint violated

#### Scenario: Boundary tonnages valid
**GIVEN** a tonnage of 20, 35, 40, 55, 60, 75, 80, or 100 tons
**WHEN** validating the tonnage
**THEN** validation SHALL succeed
**AND** mech SHALL be classified into appropriate weight class

### Requirement: Weight Class Classification Function
The system SHALL provide a deterministic function to classify mechs by tonnage.

**Rationale**: Centralized classification logic ensures consistency across the application.

**Priority**: Critical

#### Scenario: Classification by tonnage
**GIVEN** a valid BattleMech tonnage
**WHEN** calling getWeightClass(tonnage)
**THEN** function SHALL return correct WeightClass enum value
**AND** return value SHALL be deterministic (same input always returns same output)
**AND** function SHALL handle all valid tonnages (20-100 in steps of 5)

#### Scenario: Invalid tonnage throws error
**GIVEN** an invalid tonnage (out of range or not divisible by 5)
**WHEN** calling getWeightClass(tonnage)
**THEN** function SHALL throw ValidationError
**AND** error message SHALL indicate why tonnage is invalid

#### Scenario: Boundary value classification
**GIVEN** tonnage at a weight class boundary (35, 40, 55, 60, 75, 80)
**WHEN** calling getWeightClass(tonnage)
**THEN** function SHALL classify into correct weight class
**AND** 35 tons SHALL be Light (not Medium)
**AND** 55 tons SHALL be Medium (not Heavy)
**AND** 75 tons SHALL be Heavy (not Assault)

### Requirement: Weight Class Consistency
Weight class and tonnage SHALL be consistent across a unit's lifecycle.

**Rationale**: Weight class is derived from tonnage and should never contradict it.

**Priority**: High

#### Scenario: Consistent weight class
**GIVEN** a mech with tonnage and weight class properties
**WHEN** validating consistency
**THEN** weight class MUST match classification of tonnage
**AND** if tonnage changes, weight class MUST be recalculated

#### Scenario: Weight class recalculation
**GIVEN** a mech with tonnage = 45 and weightClass = MEDIUM
**WHEN** tonnage changes to 30
**THEN** weight class MUST be updated to LIGHT
**AND** validation SHALL fail if weight class remains MEDIUM

---

## Data Model Requirements

### Required Enumerations

```typescript
/**
 * BattleMech weight classification
 *
 * Standard weight classes with fixed tonnage boundaries.
 * All standard BattleMechs (20-100 tons) fall into one of these categories.
 */
enum WeightClass {
  /**
   * Light BattleMechs (20-35 tons)
   * Fast, maneuverable scouts and strikers
   */
  LIGHT = 'Light',

  /**
   * Medium BattleMechs (40-55 tons)
   * Balanced multi-role platforms
   */
  MEDIUM = 'Medium',

  /**
   * Heavy BattleMechs (60-75 tons)
   * Powerful front-line combatants
   */
  HEAVY = 'Heavy',

  /**
   * Assault BattleMechs (80-100 tons)
   * Maximum firepower and armor
   */
  ASSAULT = 'Assault'
}
```

### Required Interfaces

```typescript
/**
 * Entity with weight class classification
 */
interface IWeightClassifiable {
  /**
   * Mech tonnage (20-100, divisible by 5)
   */
  readonly tonnage: number;

  /**
   * Derived weight class based on tonnage
   */
  readonly weightClass: WeightClass;
}
```

### Required Constants

```typescript
/**
 * Weight class boundaries (inclusive)
 */
const WEIGHT_CLASS_BOUNDARIES = {
  [WeightClass.LIGHT]: { min: 20, max: 35 },
  [WeightClass.MEDIUM]: { min: 40, max: 55 },
  [WeightClass.HEAVY]: { min: 60, max: 75 },
  [WeightClass.ASSAULT]: { min: 80, max: 100 }
} as const;

/**
 * Minimum valid BattleMech tonnage
 */
const MIN_MECH_TONNAGE = 20;

/**
 * Maximum valid BattleMech tonnage (standard)
 */
const MAX_MECH_TONNAGE = 100;

/**
 * Tonnage divisibility requirement
 */
const TONNAGE_DIVISIBILITY = 5;
```

### Required Functions

```typescript
/**
 * Determines weight class from tonnage
 *
 * @param tonnage - Mech tonnage (must be valid)
 * @returns Weight class enum value
 * @throws ValidationError if tonnage is invalid
 */
function getWeightClass(tonnage: number): WeightClass {
  // Validate tonnage first
  if (!isValidTonnage(tonnage)) {
    throw new ValidationError(
      `Invalid tonnage: ${tonnage}. Must be 20-100 and divisible by 5.`
    );
  }

  // Classify based on boundaries
  if (tonnage >= 20 && tonnage <= 35) return WeightClass.LIGHT;
  if (tonnage >= 40 && tonnage <= 55) return WeightClass.MEDIUM;
  if (tonnage >= 60 && tonnage <= 75) return WeightClass.HEAVY;
  if (tonnage >= 80 && tonnage <= 100) return WeightClass.ASSAULT;

  // Should never reach here if validation works
  throw new ValidationError(`Tonnage ${tonnage} does not map to any weight class`);
}

/**
 * Validates BattleMech tonnage
 *
 * @param tonnage - Tonnage to validate
 * @returns true if valid
 */
function isValidTonnage(tonnage: number): boolean {
  return (
    Number.isFinite(tonnage) &&
    Number.isInteger(tonnage) &&
    tonnage >= MIN_MECH_TONNAGE &&
    tonnage <= MAX_MECH_TONNAGE &&
    tonnage % TONNAGE_DIVISIBILITY === 0
  );
}

/**
 * Validates weight class consistency with tonnage
 *
 * @param mech - Mech with tonnage and weight class
 * @returns true if consistent
 */
function isWeightClassConsistent(mech: IWeightClassifiable): boolean {
  const expectedClass = getWeightClass(mech.tonnage);
  return mech.weightClass === expectedClass;
}

/**
 * Type guard for WeightClass enum
 */
function isValidWeightClass(value: unknown): value is WeightClass {
  return (
    typeof value === 'string' &&
    (Object.values(WeightClass) as string[]).includes(value)
  );
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `tonnage` | `number` | Yes | Mech mass in tons | 20-100 (divisible by 5) | - |
| `weightClass` | `WeightClass` | Yes | Weight classification | LIGHT, MEDIUM, HEAVY, ASSAULT | Derived from tonnage |

### Type Constraints

- `tonnage` MUST be a finite integer
- `tonnage` MUST be >= 20 and <= 100
- `tonnage` MUST be divisible by 5
- `weightClass` MUST match classification derived from tonnage
- Both properties MUST be readonly
- `weightClass` MUST be recalculated when tonnage changes

---

## Weight Class Definitions

### Light (20-35 tons)

**Tonnage Range**: 20, 25, 30, 35 tons

**Characteristics**:
- Highest speed and maneuverability
- Limited armor and firepower
- Excellent for reconnaissance and hit-and-run tactics
- Typically 5-8 walk MP, 8-12 jump MP possible

**Typical Roles**: Scout, striker, fast support

**Example Mechs**: Locust (20t), Spider (30t), Jenner (35t)

**Construction Notes**:
- Minimum engine rating often constrained by desired speed
- Limited critical slot space restricts weapons loadout
- Armor typically 3-4 tons maximum

### Medium (40-55 tons)

**Tonnage Range**: 40, 45, 50, 55 tons

**Characteristics**:
- Balanced speed, armor, and firepower
- Most versatile weight class
- Good mix of mobility and survivability
- Typically 4-6 walk MP, 4-6 jump MP possible

**Typical Roles**: Multi-role combatant, line trooper, cavalry

**Example Mechs**: Phoenix Hawk (45t), Shadow Hawk (55t), Wolverine (55t)

**Construction Notes**:
- Enough tonnage for balanced weapon mix
- Can mount medium engines without excessive weight
- Armor typically 5-8 tons

### Heavy (60-75 tons)

**Tonnage Range**: 60, 65, 70, 75 tons

**Characteristics**:
- Powerful firepower and armor
- Reduced mobility compared to lighter classes
- Primary front-line combatants
- Typically 3-5 walk MP, 3-5 jump MP possible

**Typical Roles**: Front-line assault, fire support, command

**Example Mechs**: Catapult (65t), Warhammer (70t), Marauder (75t)

**Construction Notes**:
- Heavy weapons loadouts viable
- Can afford heavy armor protection (10-15 tons)
- Engine weight becomes more significant factor

### Assault (80-100 tons)

**Tonnage Range**: 80, 85, 90, 95, 100 tons

**Characteristics**:
- Maximum armor and firepower
- Slowest movement speeds
- Devastating in direct combat
- Typically 2-4 walk MP, 2-4 jump MP possible

**Typical Roles**: Breakthrough assault, command, heavy fire support

**Example Mechs**: Zeus (80t), Stalker (85t), Atlas (100t)

**Construction Notes**:
- Can mount heaviest weapons and armor
- Engine weight proportionally large
- Often 18-19 tons armor (maximum protection)
- Jump jets rare due to weight requirements

---

## Tonnage Validation Rules

### Valid Tonnage Values

Standard BattleMech tonnages (20-100 tons):
```
20, 25, 30, 35,
40, 45, 50, 55,
60, 65, 70, 75,
80, 85, 90, 95, 100
```

Total: 17 valid tonnage values

### Invalid Tonnage Examples

**Below minimum**: 10, 15, 19 tons
**Above maximum**: 105, 110, 200 tons
**Not divisible by 5**: 21, 37, 48, 73, 99 tons
**Non-integer**: 30.5, 45.25, 60.1 tons
**Non-finite**: NaN, Infinity, -Infinity

---

## Validation Rules

### Validation: Tonnage in Valid Range

**Rule**: Tonnage must be between 20 and 100 tons

**Severity**: Error

**Condition**:
```typescript
function validateTonnageRange(tonnage: number): ValidationResult {
  if (!Number.isFinite(tonnage)) {
    return {
      isValid: false,
      error: {
        severity: 'error',
        message: 'Tonnage must be a finite number',
        property: 'tonnage'
      }
    };
  }

  if (tonnage < MIN_MECH_TONNAGE) {
    return {
      isValid: false,
      error: {
        severity: 'error',
        message: `Tonnage ${tonnage} is below minimum (${MIN_MECH_TONNAGE} tons)`,
        property: 'tonnage'
      }
    };
  }

  if (tonnage > MAX_MECH_TONNAGE) {
    return {
      isValid: false,
      error: {
        severity: 'error',
        message: `Tonnage ${tonnage} exceeds maximum (${MAX_MECH_TONNAGE} tons)`,
        property: 'tonnage'
      }
    };
  }

  return { isValid: true };
}
```

**Error Message**: "Tonnage must be between 20 and 100 tons"

**User Action**: Adjust tonnage to valid range

### Validation: Tonnage Divisible by 5

**Rule**: Tonnage must be divisible by 5 with no remainder

**Severity**: Error

**Condition**:
```typescript
function validateTonnageDivisibility(tonnage: number): ValidationResult {
  if (!Number.isInteger(tonnage)) {
    return {
      isValid: false,
      error: {
        severity: 'error',
        message: `Tonnage ${tonnage} must be a whole number`,
        property: 'tonnage'
      }
    };
  }

  if (tonnage % TONNAGE_DIVISIBILITY !== 0) {
    return {
      isValid: false,
      error: {
        severity: 'error',
        message: `Tonnage ${tonnage} must be divisible by 5`,
        property: 'tonnage',
        suggestion: `Try ${Math.floor(tonnage / 5) * 5} or ${Math.ceil(tonnage / 5) * 5} tons`
      }
    };
  }

  return { isValid: true };
}
```

**Error Message**: "Tonnage must be divisible by 5"

**User Action**: Round tonnage to nearest multiple of 5

### Validation: Weight Class Consistency

**Rule**: Weight class must match tonnage classification

**Severity**: Error

**Condition**:
```typescript
function validateWeightClassConsistency(mech: IWeightClassifiable): ValidationResult {
  if (!isValidTonnage(mech.tonnage)) {
    return {
      isValid: false,
      error: {
        severity: 'error',
        message: 'Cannot validate weight class - tonnage is invalid',
        property: 'tonnage'
      }
    };
  }

  const expectedClass = getWeightClass(mech.tonnage);
  if (mech.weightClass !== expectedClass) {
    return {
      isValid: false,
      error: {
        severity: 'error',
        message: `Weight class ${mech.weightClass} does not match tonnage ${mech.tonnage} (should be ${expectedClass})`,
        property: 'weightClass'
      }
    };
  }

  return { isValid: true };
}
```

**Error Message**: "Weight class does not match tonnage"

**User Action**: Recalculate weight class from tonnage

### Validation: Complete Tonnage Validation

**Rule**: Combined validation of all tonnage constraints

**Severity**: Error

**Condition**:
```typescript
function validateTonnage(tonnage: number): ValidationResult {
  const errors: ValidationError[] = [];

  // Check finite
  if (!Number.isFinite(tonnage)) {
    errors.push({
      severity: 'error',
      message: 'Tonnage must be a finite number',
      property: 'tonnage'
    });
    // Can't continue with further checks
    return { isValid: false, errors };
  }

  // Check integer
  if (!Number.isInteger(tonnage)) {
    errors.push({
      severity: 'error',
      message: 'Tonnage must be a whole number',
      property: 'tonnage'
    });
  }

  // Check range
  if (tonnage < MIN_MECH_TONNAGE || tonnage > MAX_MECH_TONNAGE) {
    errors.push({
      severity: 'error',
      message: `Tonnage must be between ${MIN_MECH_TONNAGE} and ${MAX_MECH_TONNAGE} tons`,
      property: 'tonnage'
    });
  }

  // Check divisibility
  if (tonnage % TONNAGE_DIVISIBILITY !== 0) {
    errors.push({
      severity: 'error',
      message: 'Tonnage must be divisible by 5',
      property: 'tonnage'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
```

---

## Technology Base Variants

### Inner Sphere Implementation
**No special rules** - Weight classes and tonnage validation are identical for Inner Sphere mechs.

### Clan Implementation
**No special rules** - Weight classes and tonnage validation are identical for Clan mechs.

**Note**: While Clan mechs may achieve better performance at the same tonnage (due to lighter, more efficient components), the weight class boundaries and tonnage rules remain unchanged.

### Mixed Tech Rules
**No special rules** - Weight classification is independent of technology base. Mixed tech mechs use the same weight class system as pure tech base mechs.

---

## Dependencies

### Defines
- **WeightClass enum**: Four standard weight classifications (Light, Medium, Heavy, Assault)
- **Weight class boundaries**: Fixed tonnage ranges for each class
- **Tonnage validation rules**: Range (20-100), divisibility by 5, integer requirement
- **Classification function**: `getWeightClass(tonnage)` for deterministic classification
- **IWeightClassifiable interface**: Standard interface for entities with weight classification

### Depends On
- [Core Entity Types](../core-entity-types/spec.md) - Base entity interfaces
- [Physical Properties System](../physical-properties-system/spec.md) - Weight property standards and validation

### Used By
- [Movement System](../../phase-2-construction/movement-system/spec.md) - Walk/run MP limits by weight class
- [Jump Jet System](../../phase-2-construction/jump-jet-system/spec.md) - Maximum jump MP calculations based on weight class
- [Construction Rules Core](../../phase-2-construction/construction-rules-core/spec.md) - Weight budget validation
- [Engine System](../../phase-2-construction/engine-system/spec.md) - Engine rating constraints by tonnage
- **UI Filter Components**: Filter mechs by weight class
- **Unit Display Components**: Display weight class badges and indicators
- **Database Queries**: Search and categorize mechs by weight class
- **Strategic Planning**: Lance composition and weight class distribution

### Construction Sequence
1. Define WeightClass enum and constants (this spec)
2. Define IWeightClassifiable interface extending base entities (this spec)
3. Implement tonnage validation (this spec)
4. Implement weight class classification function (this spec)
5. Use in unit construction and validation systems
6. Apply in UI filtering and display components

---

## Implementation Notes

### Performance Considerations
- Weight class classification is O(1) with simple comparison logic
- Tonnage validation is O(1) with basic arithmetic checks
- Classification results can be cached if tonnage doesn't change frequently
- Validation functions are lightweight and suitable for real-time validation

### Edge Cases
- **Boundary values**: 35 is Light (not Medium), 55 is Medium (not Heavy), 75 is Heavy (not Assault)
- **Minimum tonnage**: 20 tons is the smallest valid mech (Locust-1V)
- **Maximum tonnage**: 100 tons is the largest standard mech (Atlas, King Crab)
- **Gap between classes**: 36-39 tons and 56-59 tons and 76-79 tons are invalid (no mechs exist at these weights)
- **SuperHeavy mechs**: 105-200 tons reserved for future implementation
- **Zero tonnage**: Invalid - minimum is 20 tons

### Common Pitfalls
- **Pitfall**: Classifying 35 tons as Medium instead of Light
  - **Solution**: Boundaries are inclusive on both ends for each class
- **Pitfall**: Allowing 37-ton or 48-ton mechs
  - **Solution**: Always validate divisibility by 5
- **Pitfall**: Storing weight class separately from tonnage without validation
  - **Solution**: Always derive weight class from tonnage or validate consistency
- **Pitfall**: Using >= 80 instead of >= 80 && <= 100 for Assault class
  - **Solution**: Always check both min and max boundaries
- **Pitfall**: Forgetting to validate tonnage before classification
  - **Solution**: Classification function should validate first, then classify
- **Pitfall**: Treating weight class as independent of tonnage
  - **Solution**: Weight class is always derived from tonnage, never set independently

### SuperHeavy Mechs (Future)
Reserved for future implementation:
- **Range**: 105-200 tons (divisible by 5)
- **Weight Class**: WeightClass.SUPER_HEAVY
- **Rules**: Special construction rules apply (not covered in this spec)
- **Availability**: Rare, experimental, not standard gameplay

---

## Examples

### Example 1: Basic Weight Class Classification

```typescript
// Classify various mechs by tonnage
const locusTonnage = 20;
const locustClass = getWeightClass(locusTonnage);
console.log(`${locusTonnage}t = ${locustClass}`);
// Output: "20t = Light"

const wolverineTonnage = 55;
const wolverineClass = getWeightClass(wolverineTonnage);
console.log(`${wolverineTonnage}t = ${wolverineClass}`);
// Output: "55t = Medium"

const atlasTonnage = 100;
const atlasClass = getWeightClass(atlasTonnage);
console.log(`${atlasTonnage}t = ${atlasClass}`);
// Output: "100t = Assault"
```

### Example 2: Boundary Case Handling

```typescript
// Test boundary values between weight classes
const boundaryTests = [
  { tonnage: 35, expected: WeightClass.LIGHT },
  { tonnage: 40, expected: WeightClass.MEDIUM },
  { tonnage: 55, expected: WeightClass.MEDIUM },
  { tonnage: 60, expected: WeightClass.HEAVY },
  { tonnage: 75, expected: WeightClass.HEAVY },
  { tonnage: 80, expected: WeightClass.ASSAULT }
];

boundaryTests.forEach(test => {
  const result = getWeightClass(test.tonnage);
  const passed = result === test.expected;
  console.log(
    `${test.tonnage}t -> ${result} (expected ${test.expected}): ${passed ? 'PASS' : 'FAIL'}`
  );
});

// All should output PASS
```

### Example 3: Invalid Tonnage Handling

```typescript
// Test validation of invalid tonnages
const invalidTonnages = [10, 19, 37, 48, 105, 30.5, NaN, Infinity];

invalidTonnages.forEach(tonnage => {
  try {
    const weightClass = getWeightClass(tonnage);
    console.error(`ERROR: ${tonnage} should have failed validation`);
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log(`${tonnage}t correctly rejected: ${error.message}`);
    } else {
      throw error;
    }
  }
});

// Expected output:
// 10t correctly rejected: Tonnage 10 is below minimum (20 tons)
// 19t correctly rejected: Tonnage 19 must be divisible by 5
// 37t correctly rejected: Tonnage 37 must be divisible by 5
// etc.
```

### Example 4: Mech Definition with Weight Class

```typescript
interface IBattleMech extends IWeightClassifiable {
  readonly id: string;
  readonly name: string;
  readonly model: string;
  readonly tonnage: number;
  readonly weightClass: WeightClass;
}

const shadowHawk: IBattleMech = {
  id: 'mech-shadow-hawk-2h',
  name: 'Shadow Hawk',
  model: 'SHD-2H',
  tonnage: 55,
  weightClass: getWeightClass(55)  // Automatically derived: MEDIUM
};

// Validation
const validation = validateWeightClassConsistency(shadowHawk);
if (!validation.isValid) {
  console.error('Weight class inconsistency:', validation.error);
} else {
  console.log(`${shadowHawk.name} validated successfully as ${shadowHawk.weightClass}`);
}
// Output: "Shadow Hawk validated successfully as Medium"
```

### Example 5: Weight Class Filtering

```typescript
// Filter mech database by weight class
interface MechDatabase {
  mechs: IBattleMech[];
}

function filterMechsByWeightClass(
  database: MechDatabase,
  weightClass: WeightClass
): IBattleMech[] {
  return database.mechs.filter(mech => mech.weightClass === weightClass);
}

// Usage
const allMechs: MechDatabase = loadMechDatabase();

const lightMechs = filterMechsByWeightClass(allMechs, WeightClass.LIGHT);
console.log(`Found ${lightMechs.length} light mechs`);

const assaultMechs = filterMechsByWeightClass(allMechs, WeightClass.ASSAULT);
console.log(`Found ${assaultMechs.length} assault mechs`);

// Can also filter by tonnage range
function filterMechsByTonnageRange(
  database: MechDatabase,
  minTonnage: number,
  maxTonnage: number
): IBattleMech[] {
  return database.mechs.filter(
    mech => mech.tonnage >= minTonnage && mech.tonnage <= maxTonnage
  );
}

const mediumToHeavy = filterMechsByTonnageRange(allMechs, 40, 75);
console.log(`Found ${mediumToHeavy.length} medium-to-heavy mechs`);
```

### Example 6: Jump Jet Integration

```typescript
// Maximum jump MP varies by weight class
// (from Jump Jet System spec - shown here for integration example)

function getMaximumJumpMP(mech: IWeightClassifiable): number {
  switch (mech.weightClass) {
    case WeightClass.LIGHT:
      return 8;  // Light mechs can have up to 8 jump MP
    case WeightClass.MEDIUM:
      return 6;  // Medium mechs up to 6 jump MP
    case WeightClass.HEAVY:
      return 5;  // Heavy mechs up to 5 jump MP
    case WeightClass.ASSAULT:
      return 4;  // Assault mechs up to 4 jump MP
    default:
      throw new Error(`Unknown weight class: ${mech.weightClass}`);
  }
}

// Validate jump jet configuration
function validateJumpJets(
  mech: IWeightClassifiable,
  jumpMP: number
): ValidationResult {
  const maxJumpMP = getMaximumJumpMP(mech);

  if (jumpMP > maxJumpMP) {
    return {
      isValid: false,
      error: {
        severity: 'error',
        message: `Jump MP ${jumpMP} exceeds maximum ${maxJumpMP} for ${mech.weightClass} mechs`,
        property: 'jumpMP'
      }
    };
  }

  return { isValid: true };
}

// Usage
const atlasWithJumpJets = {
  tonnage: 100,
  weightClass: WeightClass.ASSAULT
};

const validation = validateJumpJets(atlasWithJumpJets, 3);
if (validation.isValid) {
  console.log('Jump jets valid');
} else {
  console.error(validation.error.message);
}
// Output: "Jump jets valid" (3 is within 4 max for Assault)
```

### Example 7: Tonnage Validation UI Feedback

```typescript
// Real-time tonnage validation for UI
function validateTonnageWithFeedback(tonnage: number): {
  isValid: boolean;
  message: string;
  suggestion?: string;
} {
  if (!Number.isFinite(tonnage)) {
    return {
      isValid: false,
      message: 'Please enter a valid number'
    };
  }

  if (!Number.isInteger(tonnage)) {
    return {
      isValid: false,
      message: 'Tonnage must be a whole number',
      suggestion: `Try ${Math.floor(tonnage)} or ${Math.ceil(tonnage)}`
    };
  }

  if (tonnage < MIN_MECH_TONNAGE) {
    return {
      isValid: false,
      message: `Minimum tonnage is ${MIN_MECH_TONNAGE} tons`,
      suggestion: `Try ${MIN_MECH_TONNAGE}`
    };
  }

  if (tonnage > MAX_MECH_TONNAGE) {
    return {
      isValid: false,
      message: `Maximum tonnage is ${MAX_MECH_TONNAGE} tons`,
      suggestion: `Try ${MAX_MECH_TONNAGE}`
    };
  }

  if (tonnage % TONNAGE_DIVISIBILITY !== 0) {
    const lower = Math.floor(tonnage / 5) * 5;
    const upper = Math.ceil(tonnage / 5) * 5;
    return {
      isValid: false,
      message: 'Tonnage must be divisible by 5',
      suggestion: `Try ${lower} or ${upper}`
    };
  }

  // Valid - show weight class
  const weightClass = getWeightClass(tonnage);
  return {
    isValid: true,
    message: `Valid ${weightClass} mech (${tonnage} tons)`
  };
}

// UI usage
const userInput = 47;  // User types "47"
const feedback = validateTonnageWithFeedback(userInput);

if (feedback.isValid) {
  console.log(`✓ ${feedback.message}`);
} else {
  console.error(`✗ ${feedback.message}`);
  if (feedback.suggestion) {
    console.log(`  Suggestion: ${feedback.suggestion}`);
  }
}
// Output:
// ✗ Tonnage must be divisible by 5
//   Suggestion: Try 45 or 50
```

### Example 8: Weight Class Display Component

```typescript
// UI component for displaying weight class with styling
interface WeightClassBadgeProps {
  mech: IWeightClassifiable;
}

function WeightClassBadge({ mech }: WeightClassBadgeProps) {
  const colorMap = {
    [WeightClass.LIGHT]: '#4CAF50',      // Green
    [WeightClass.MEDIUM]: '#FFC107',      // Amber
    [WeightClass.HEAVY]: '#FF9800',       // Orange
    [WeightClass.ASSAULT]: '#F44336'      // Red
  };

  const iconMap = {
    [WeightClass.LIGHT]: '🏃',
    [WeightClass.MEDIUM]: '⚖️',
    [WeightClass.HEAVY]: '💪',
    [WeightClass.ASSAULT]: '🔥'
  };

  return (
    <div
      style={{
        backgroundColor: colorMap[mech.weightClass],
        padding: '4px 8px',
        borderRadius: '4px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}
    >
      <span>{iconMap[mech.weightClass]}</span>
      <span>{mech.weightClass}</span>
      <span style={{ opacity: 0.7 }}>({mech.tonnage}t)</span>
    </div>
  );
}

// Usage
<WeightClassBadge mech={{ tonnage: 75, weightClass: WeightClass.HEAVY }} />
// Renders: 💪 Heavy (75t) in orange badge
```

---

## References

### Official BattleTech Rules
- **TechManual**: Pages 38-42 - BattleMech weight classes and construction rules
- **Total Warfare**: Pages 28-30 - Weight class definitions and impact on gameplay
- **BattleMech Manual**: Pages 18-20 - Weight class characteristics and tactical roles
- **Strategic Operations**: Lance composition and weight class distribution

### Related Documentation
- `openspec/specs/phase-1-foundation/core-entity-types/spec.md` - Base entity interfaces
- `openspec/specs/phase-1-foundation/physical-properties-system/spec.md` - Weight property standards
- `openspec/specs/phase-2-construction/movement-system/spec.md` - Movement rates by weight class
- `openspec/specs/phase-2-construction/jump-jet-system/spec.md` - Jump MP limits by weight class
- `openspec/specs/phase-2-construction/construction-rules-core/spec.md` - Weight budget validation

### Code References
- Enumeration: `src/types/core/BaseTypes.ts` (WeightClass enum)
- Classification: `src/utils/weightClassUtils.ts` (getWeightClass function)
- Validation: `src/services/validation/tonnageValidator.ts`
- Type Guards: `src/utils/typeGuards/weightClass.ts`

---

## Changelog

### Version 1.0 (2025-11-28)
- Initial specification
- Defined WeightClass enum (LIGHT, MEDIUM, HEAVY, ASSAULT)
- Established weight class boundaries (20-35, 40-55, 60-75, 80-100)
- Defined tonnage validation rules (20-100, divisible by 5, integer)
- Implemented getWeightClass() classification function
- Defined IWeightClassifiable interface
- Added comprehensive validation rules for tonnage and weight class consistency
- Documented boundary cases and edge conditions
- Provided 8 detailed examples covering classification, validation, filtering, and UI integration
- Reserved SuperHeavy (105-200 tons) for future implementation
- Documented integration points with Movement System and Jump Jet System
