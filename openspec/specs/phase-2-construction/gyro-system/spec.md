# Gyro System Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2025-11-27
**Dependencies**: Core Entity Types, Physical Properties System, Rules Level System, Era & Temporal System
**Affects**: Engine System, Critical Slot Allocation, Weight Calculation, Unit Construction

---

## Overview

### Purpose
Defines the gyroscope system for BattleMechs, including gyro types, weight calculations, critical slot requirements, and placement rules. The gyro is a critical system component that enables bipedal/quadrupedal movement and balance, located in the Center Torso immediately after the engine's first slot group.

### Scope
**In Scope:**
- Gyro type definitions (Standard, XL, Compact, Heavy-Duty)
- Weight calculation formulas based on engine rating
- Critical slot requirements for each gyro type
- Exact slot placement rules in Center Torso
- Tech base variants (Inner Sphere and Clan)
- Rules level classifications
- Special rules and restrictions
- Interaction with engine slot placement
- Critical hit effects and durability

**Out of Scope:**
- Engine system specifications (covered in Engine System spec)
- Critical hit resolution mechanics (covered in Critical Hit System spec)
- Heat sink mounting locations (covered in Heat Sink System spec)
- OmniMech configuration rules (covered in OmniMech Construction spec)
- UI-specific rendering (covered in UI Integration spec)

### Key Concepts
- **Gyro**: Stabilization system enabling BattleMech movement, always located in Center Torso
- **Gyro Weight**: Calculated as `CEIL(engineRating / 100) * multiplier`, where multiplier varies by gyro type
- **Gyro Slots**: Fixed number of critical slots in Center Torso, varying by gyro type (2-6 slots)
- **Slot Placement**: Gyro slots immediately follow engine's first slot group in CT (typically slots 3-6 for Standard)
- **Critical Vulnerability**: Gyro critical hits impose severe piloting penalties; 3 gyro crits = shutdown

---

## Requirements

### Requirement: Gyro Type Classification
All gyros SHALL be classified into one of four types: Standard, XL, Compact, or Heavy-Duty.

**Rationale**: BattleTech construction rules define four distinct gyro types with different weight/slot trade-offs.

**Priority**: Critical

#### Scenario: Standard Gyro selection
**GIVEN** a BattleMech is being constructed
**WHEN** no advanced gyro type is selected
**THEN** Standard Gyro SHALL be used by default
**AND** gyro weight SHALL be CEIL(engineRating / 100) * 1.0
**AND** gyro SHALL occupy 4 critical slots in Center Torso

#### Scenario: XL Gyro selection
**GIVEN** a BattleMech with sufficient tech level
**WHEN** XL Gyro is selected
**THEN** gyro weight SHALL be CEIL(engineRating / 100) * 0.5
**AND** gyro SHALL occupy 6 critical slots in Center Torso
**AND** gyro SHALL be more vulnerable to critical hits

#### Scenario: Compact Gyro selection
**GIVEN** a BattleMech requiring more available CT slots
**WHEN** Compact Gyro is selected
**THEN** gyro weight SHALL be CEIL(engineRating / 100) * 1.5
**AND** gyro SHALL occupy 2 critical slots in Center Torso

#### Scenario: Heavy-Duty Gyro selection
**GIVEN** a BattleMech requiring enhanced durability
**WHEN** Heavy-Duty Gyro is selected
**THEN** gyro weight SHALL be CEIL(engineRating / 100) * 2.0
**AND** gyro SHALL occupy 4 critical slots in Center Torso
**AND** gyro SHALL have +1 critical hit resistance

### Requirement: Weight Calculation
Gyro weight SHALL be calculated based on engine rating and gyro type multiplier.

**Rationale**: Gyro weight scales with engine size, as larger engines require more powerful gyroscopic stabilization.

**Priority**: Critical

#### Scenario: Weight calculation for 300-rated engine with Standard Gyro
**GIVEN** engine rating is 300
**WHEN** calculating Standard Gyro weight
**THEN** base weight SHALL be CEIL(300 / 100) = 3 tons
**AND** final weight SHALL be 3 * 1.0 = 3.0 tons

#### Scenario: Weight calculation for 300-rated engine with XL Gyro
**GIVEN** engine rating is 300
**WHEN** calculating XL Gyro weight
**THEN** base weight SHALL be CEIL(300 / 100) = 3 tons
**AND** final weight SHALL be 3 * 0.5 = 1.5 tons

#### Scenario: Weight calculation for 255-rated engine with Compact Gyro
**GIVEN** engine rating is 255
**WHEN** calculating Compact Gyro weight
**THEN** base weight SHALL be CEIL(255 / 100) = 3 tons
**AND** final weight SHALL be 3 * 1.5 = 4.5 tons

#### Scenario: Minimum weight enforcement
**GIVEN** any engine rating less than 100
**WHEN** calculating gyro weight
**THEN** base weight SHALL be CEIL(rating / 100) = 1 ton minimum
**AND** multiplier SHALL still apply

### Requirement: Critical Slot Allocation
Each gyro type SHALL occupy a fixed number of critical slots in the Center Torso.

**Rationale**: Different gyro technologies trade weight for space or vice versa.

**Priority**: Critical

#### Scenario: Standard Gyro slot requirement
**GIVEN** Standard Gyro is selected
**WHEN** allocating critical slots
**THEN** gyro SHALL occupy exactly 4 slots
**AND** slots SHALL be contiguous in Center Torso

#### Scenario: XL Gyro slot requirement
**GIVEN** XL Gyro is selected
**WHEN** allocating critical slots
**THEN** gyro SHALL occupy exactly 6 slots
**AND** slots SHALL be contiguous in Center Torso
**AND** more slots are required due to weight-saving technology

#### Scenario: Compact Gyro slot requirement
**GIVEN** Compact Gyro is selected
**WHEN** allocating critical slots
**THEN** gyro SHALL occupy exactly 2 slots
**AND** slots SHALL be contiguous in Center Torso

#### Scenario: Heavy-Duty Gyro slot requirement
**GIVEN** Heavy-Duty Gyro is selected
**WHEN** allocating critical slots
**THEN** gyro SHALL occupy exactly 4 slots
**AND** slots SHALL be contiguous in Center Torso

### Requirement: Slot Placement in Center Torso
Gyro slots SHALL be placed immediately after the engine's first slot group in the Center Torso.

**Rationale**: BattleTech construction rules specify exact slot positions for system components to ensure consistency.

**Priority**: Critical

#### Scenario: Standard configuration slot placement
**GIVEN** Standard Engine (6 CT slots) and Standard Gyro (4 slots)
**WHEN** allocating Center Torso slots
**THEN** engine SHALL occupy slots 0-2 (first group)
**AND** gyro SHALL occupy slots 3-6 (immediately after engine)
**AND** engine SHALL occupy slots 7-9 (second group)
**AND** slots 10-11 SHALL be available for equipment

#### Scenario: XL Gyro slot placement
**GIVEN** Standard Engine (6 CT slots) and XL Gyro (6 slots)
**WHEN** allocating Center Torso slots
**THEN** engine SHALL occupy slots 0-2 (first group)
**AND** gyro SHALL occupy slots 3-8 (immediately after engine)
**AND** engine SHALL occupy slots 9-11 (second group)
**AND** no slots SHALL remain for equipment in CT

#### Scenario: Compact Gyro slot placement
**GIVEN** Standard Engine (6 CT slots) and Compact Gyro (2 slots)
**WHEN** allocating Center Torso slots
**THEN** engine SHALL occupy slots 0-2 (first group)
**AND** gyro SHALL occupy slots 3-4 (immediately after engine)
**AND** engine SHALL occupy slots 5-7 (second group, shifted forward)
**AND** slots 8-11 SHALL be available for equipment

#### Scenario: Compact Engine interaction
**GIVEN** Compact Engine (3 CT slots) and Standard Gyro (4 slots)
**WHEN** allocating Center Torso slots
**THEN** engine SHALL occupy slots 0-2 (all in first group)
**AND** gyro SHALL occupy slots 3-6 (immediately after engine)
**AND** slots 7-11 SHALL be available for equipment
**AND** no second engine slot group exists

### Requirement: Tech Base Availability
Gyro types SHALL have different availability based on technology base and era.

**Rationale**: Advanced gyro types were introduced at different times and by different factions.

**Priority**: High

#### Scenario: Standard Gyro availability
**GIVEN** any tech base (IS or Clan)
**WHEN** checking Standard Gyro availability
**THEN** Standard Gyro SHALL be available
**AND** introduction year SHALL be 2439 (Age of War)
**AND** rules level SHALL be Introductory

#### Scenario: Advanced gyro availability for Inner Sphere
**GIVEN** Inner Sphere tech base
**WHEN** checking advanced gyro availability after 3067
**THEN** XL Gyro SHALL be available
**AND** Compact Gyro SHALL be available
**AND** Heavy-Duty Gyro SHALL be available
**AND** rules level SHALL be Advanced

#### Scenario: Advanced gyro availability before introduction
**GIVEN** construction year is before 3067
**WHEN** filtering available gyros
**THEN** only Standard Gyro SHALL be available
**AND** advanced gyros SHALL be excluded

### Requirement: Engine Compatibility
Gyros SHALL be compatible with all engine types, with placement adjusted based on engine slot configuration.

**Rationale**: Any engine can work with any gyro type, though slot placement varies.

**Priority**: High

#### Scenario: Standard Engine with any gyro
**GIVEN** Standard Engine (6 CT slots total)
**WHEN** selecting any gyro type
**THEN** gyro SHALL be compatible
**AND** gyro SHALL be placed after engine's first 3 slots

#### Scenario: XL Engine with any gyro
**GIVEN** XL Engine (6 CT slots + side torso slots)
**WHEN** selecting any gyro type
**THEN** gyro SHALL be compatible
**AND** gyro placement in CT SHALL remain unchanged
**AND** side torso engine slots SHALL not affect gyro placement

#### Scenario: Compact Engine with any gyro
**GIVEN** Compact Engine (3 CT slots total)
**WHEN** selecting any gyro type
**THEN** gyro SHALL be compatible
**AND** gyro SHALL be placed after all 3 engine slots
**AND** more CT space SHALL be available for equipment

### Requirement: Critical Hit Effects
Gyro critical hits SHALL impose cumulative piloting penalties and eventual shutdown.

**Rationale**: Gyro damage severely affects BattleMech stability and control.

**Priority**: High

#### Scenario: First gyro critical hit
**GIVEN** gyro takes 1 critical hit
**WHEN** pilot makes Piloting Skill Roll
**THEN** pilot SHALL suffer +3 difficulty modifier
**AND** BattleMech SHALL remain operational

#### Scenario: Second gyro critical hit
**GIVEN** gyro has 2 critical hits
**WHEN** pilot makes Piloting Skill Roll
**THEN** pilot SHALL suffer +5 difficulty modifier (cumulative)
**AND** BattleMech SHALL remain operational with severe stability issues

#### Scenario: Third gyro critical hit (destruction)
**GIVEN** gyro takes 3 critical hits
**WHEN** resolving critical damage
**THEN** BattleMech SHALL immediately shut down
**AND** BattleMech SHALL be immobilized
**AND** pilot SHALL make immediate falling check

#### Scenario: Heavy-Duty Gyro critical resistance
**GIVEN** Heavy-Duty Gyro is installed
**WHEN** gyro takes critical hit
**THEN** gyro SHALL have +1 resistance to first critical
**AND** standard critical progression SHALL apply thereafter

---

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * Gyro type enumeration
 */
enum GyroType {
  STANDARD = 'Standard',
  XL = 'XL',
  COMPACT = 'Compact',
  HEAVY_DUTY = 'Heavy-Duty'
}

/**
 * Gyro interface - system component with calculated properties
 */
interface IGyro extends ITechBaseEntity, ITemporalEntity, IDocumentedEntity {
  /**
   * Gyro type classification
   */
  readonly gyroType: GyroType;

  /**
   * Weight calculation depends on engine rating - NOT a fixed property
   * Weight = CEIL(engineRating / 100) * weightMultiplier
   * @calculated
   */
  readonly weight?: number;  // Optional - calculated at runtime

  /**
   * Critical slots required - fixed per gyro type
   */
  readonly criticalSlots: number;

  /**
   * Weight multiplier for calculation
   * Standard: 1.0, XL: 0.5, Compact: 1.5, Heavy-Duty: 2.0
   */
  readonly weightMultiplier: number;

  /**
   * Critical hit resistance modifier
   * Heavy-Duty: +1, others: 0
   */
  readonly criticalHitResistance: number;

  /**
   * Special rules or effects
   */
  readonly specialRules?: string[];

  /**
   * Cost in C-Bills (may vary by gyro type and tonnage)
   * @calculated
   */
  readonly cost?: number;

  /**
   * Battle Value contribution
   */
  readonly battleValue: number;
}

/**
 * Gyro definition (static database entry)
 */
interface IGyroDefinition extends ITechBaseEntity, ITemporalEntity, IDocumentedEntity {
  readonly gyroType: GyroType;
  readonly criticalSlots: number;
  readonly weightMultiplier: number;
  readonly criticalHitResistance: number;
  readonly specialRules?: string[];
  readonly baseCost: number;  // Base cost, actual cost calculated
  readonly battleValue: number;
}

/**
 * Gyro placement information
 */
interface IGyroPlacement {
  /**
   * Gyro definition
   */
  readonly gyro: IGyroDefinition;

  /**
   * Calculated weight based on engine rating
   */
  readonly weight: number;

  /**
   * Starting slot index in Center Torso
   */
  readonly startSlot: number;

  /**
   * Ending slot index in Center Torso (inclusive)
   */
  readonly endSlot: number;

  /**
   * All slot indices occupied by gyro
   */
  readonly slotIndices: readonly number[];
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `id` | `string` | Yes | Unique identifier | Non-empty string | - |
| `name` | `string` | Yes | Display name | Non-empty string | - |
| `gyroType` | `GyroType` | Yes | Gyro classification | Standard, XL, Compact, Heavy-Duty | Standard |
| `techBase` | `TechBase` | Yes | Technology base | INNER_SPHERE, CLAN | INNER_SPHERE |
| `rulesLevel` | `RulesLevel` | Yes | Rules complexity | INTRODUCTORY, STANDARD, ADVANCED, EXPERIMENTAL | - |
| `criticalSlots` | `number` | Yes | CT slots required | 2, 4, or 6 | 4 |
| `weightMultiplier` | `number` | Yes | Weight calculation multiplier | 0.5, 1.0, 1.5, 2.0 | 1.0 |
| `criticalHitResistance` | `number` | Yes | Crit resistance modifier | 0 or 1 | 0 |
| `introductionYear` | `number` | Yes | Year introduced | 2439-3150+ | 2439 |
| `era` | `Era` | Yes | Timeline era | AGE_OF_WAR, SUCCESSION_WARS, etc. | - |
| `baseCost` | `number` | Yes | Base cost in C-Bills | >= 0 | - |
| `battleValue` | `number` | Yes | BV contribution | >= 0 | 0 |
| `specialRules` | `string[]` | No | Special rules/effects | Array of strings | undefined |
| `description` | `string` | No | Description text | Any string | undefined |
| `sourceBook` | `string` | No | Source reference | Book name | undefined |
| `pageReference` | `number` | No | Page number | Positive integer | undefined |

### Type Constraints

- `gyroType` MUST be one of the four defined GyroType enum values
- `criticalSlots` MUST be 2 (Compact), 4 (Standard/Heavy-Duty), or 6 (XL)
- `weightMultiplier` MUST be 0.5 (XL), 1.0 (Standard), 1.5 (Compact), or 2.0 (Heavy-Duty)
- `criticalHitResistance` MUST be 0 (Standard/XL/Compact) or 1 (Heavy-Duty)
- Weight calculation result MUST be >= 0.5 tons (minimum gyro weight)
- When `criticalHitResistance` > 0, `gyroType` MUST be HEAVY_DUTY

---

## Calculation Formulas

### Gyro Weight Calculation

**Formula**:
```
gyroWeight = CEIL(engineRating / 100) * weightMultiplier
```

**Where**:
- `engineRating` = Engine rating (100-400 typical range)
- `weightMultiplier` = Gyro type multiplier (0.5, 1.0, 1.5, or 2.0)
- `CEIL()` = Round up to nearest integer

**Example 1 - Standard Gyro with 300-rated engine**:
```
Input: engineRating = 300, gyroType = Standard
weightMultiplier = 1.0
baseWeight = CEIL(300 / 100) = CEIL(3.0) = 3
gyroWeight = 3 * 1.0 = 3.0 tons
```

**Example 2 - XL Gyro with 300-rated engine**:
```
Input: engineRating = 300, gyroType = XL
weightMultiplier = 0.5
baseWeight = CEIL(300 / 100) = 3
gyroWeight = 3 * 0.5 = 1.5 tons
```

**Example 3 - Compact Gyro with 255-rated engine**:
```
Input: engineRating = 255, gyroType = Compact
weightMultiplier = 1.5
baseWeight = CEIL(255 / 100) = CEIL(2.55) = 3
gyroWeight = 3 * 1.5 = 4.5 tons
```

**Example 4 - Heavy-Duty Gyro with 400-rated engine**:
```
Input: engineRating = 400, gyroType = Heavy-Duty
weightMultiplier = 2.0
baseWeight = CEIL(400 / 100) = 4
gyroWeight = 4 * 2.0 = 8.0 tons
```

**Special Cases**:
- When engineRating < 100: baseWeight = CEIL(rating / 100) = 1 ton minimum
- When engineRating = 100: baseWeight = 1 ton exactly
- Weight is NOT rounded - use full precision (e.g., 1.5 tons for XL with rating 300)

**Rounding Rules**:
- Use CEIL() for base weight calculation (rating / 100)
- Do NOT round final weight after multiplier application
- Store and display exact weight (including 0.5 ton increments)

### Gyro Cost Calculation

**Formula**:
```
gyroCost = baseCost * CEIL(engineRating / 100)
```

**Where**:
- `baseCost` = Base cost per ton of gyro (varies by type)
- Standard: 300,000 C-Bills/ton
- XL: 750,000 C-Bills/ton
- Compact: 400,000 C-Bills/ton
- Heavy-Duty: 500,000 C-Bills/ton

**Example**:
```
Input: engineRating = 300, gyroType = XL
baseCost = 750,000 C-Bills
baseWeight = CEIL(300 / 100) = 3
gyroCost = 750,000 * 3 = 2,250,000 C-Bills
```

### Gyro Slot Placement Calculation

**Formula**:
```
gyroStartSlot = engineFirstGroupSlots
gyroEndSlot = gyroStartSlot + gyroSlots - 1
```

**Where**:
- `engineFirstGroupSlots` = Number of engine slots in first group (typically 3)
- `gyroSlots` = Critical slots for gyro type (2, 4, or 6)

**Example 1 - Standard Engine + Standard Gyro**:
```
Input: Standard Engine (6 CT slots), Standard Gyro (4 slots)
engineFirstGroupSlots = 3 (slots 0-2)
gyroStartSlot = 3
gyroEndSlot = 3 + 4 - 1 = 6
gyroSlots = [3, 4, 5, 6]
engineSecondGroupStart = 7 (slots 7-9)
```

**Example 2 - Standard Engine + XL Gyro**:
```
Input: Standard Engine (6 CT slots), XL Gyro (6 slots)
engineFirstGroupSlots = 3 (slots 0-2)
gyroStartSlot = 3
gyroEndSlot = 3 + 6 - 1 = 8
gyroSlots = [3, 4, 5, 6, 7, 8]
engineSecondGroupStart = 9 (slots 9-11)
```

**Example 3 - Compact Engine + Standard Gyro**:
```
Input: Compact Engine (3 CT slots), Standard Gyro (4 slots)
engineFirstGroupSlots = 3 (slots 0-2, no second group)
gyroStartSlot = 3
gyroEndSlot = 3 + 4 - 1 = 6
gyroSlots = [3, 4, 5, 6]
availableSlots = [7, 8, 9, 10, 11] (5 slots free)
```

---

## Validation Rules

### Validation: Gyro Type Compatibility

**Rule**: Gyro type must be compatible with tech base and construction year

**Severity**: Error

**Condition**:
```typescript
function validateGyroAvailability(
  gyro: IGyroDefinition,
  techBase: TechBase,
  constructionYear: number
): ValidationResult {
  // Check introduction year
  if (constructionYear < gyro.introductionYear) {
    return {
      valid: false,
      error: `${gyro.name} not available until ${gyro.introductionYear}`
    };
  }

  // Check tech base compatibility
  if (gyro.techBase === TechBase.CLAN && techBase === TechBase.INNER_SPHERE) {
    return {
      valid: false,
      error: `${gyro.name} requires Clan tech base`
    };
  }

  return { valid: true };
}
```

**Error Message**: "{Gyro Type} not available until {year}" or "{Gyro Type} requires {tech base}"

**User Action**: Select a gyro compatible with unit's tech base and construction year

### Validation: Gyro Weight Calculation

**Rule**: Calculated gyro weight must be finite and >= 0.5 tons

**Severity**: Error

**Condition**:
```typescript
function validateGyroWeight(
  engineRating: number,
  gyro: IGyroDefinition
): ValidationResult {
  const baseWeight = Math.ceil(engineRating / 100);
  const weight = baseWeight * gyro.weightMultiplier;

  if (!Number.isFinite(weight) || weight < 0.5) {
    return {
      valid: false,
      error: `Invalid gyro weight: ${weight} tons`
    };
  }

  return { valid: true, weight };
}
```

**Error Message**: "Invalid gyro weight: {weight} tons (must be >= 0.5 tons)"

**User Action**: Verify engine rating is valid (>= 10)

### Validation: Critical Slot Availability

**Rule**: Center Torso must have sufficient slots for gyro placement

**Severity**: Error

**Condition**:
```typescript
function validateGyroSlotSpace(
  gyro: IGyroDefinition,
  engineSlots: number,
  totalCTSlots: number = 12
): ValidationResult {
  const engineFirstGroup = 3; // Engine always uses slots 0-2 first
  const gyroStartSlot = engineFirstGroup;
  const gyroEndSlot = gyroStartSlot + gyro.criticalSlots - 1;

  if (gyroEndSlot >= totalCTSlots) {
    return {
      valid: false,
      error: `${gyro.name} requires slots ${gyroStartSlot}-${gyroEndSlot} but CT only has ${totalCTSlots} slots`
    };
  }

  return { valid: true };
}
```

**Error Message**: "{Gyro Type} requires slots {start}-{end} but Center Torso only has {total} slots"

**User Action**: Select a gyro type requiring fewer slots (Compact) or verify mech configuration

### Validation: Engine Compatibility

**Rule**: Gyro must be compatible with selected engine type

**Severity**: Warning

**Condition**:
```typescript
function validateGyroEngineCompatibility(
  gyro: IGyroDefinition,
  engine: IEngineDefinition
): ValidationResult {
  // Most gyros compatible with all engines
  // This is a placeholder for future restrictions

  // Example future restriction:
  // if (gyro.gyroType === GyroType.XL && engine.engineType === EngineType.COMPACT) {
  //   return {
  //     valid: false,
  //     warning: 'XL Gyro may conflict with Compact Engine slot allocation'
  //   };
  // }

  return { valid: true };
}
```

**Error Message**: "{Gyro Type} may conflict with {Engine Type} slot allocation"

**User Action**: Review slot allocation and consider alternative gyro/engine combination

---

## Technology Base Variants

See [Tech Base Variants Reference](../tech-base-variants-reference/spec.md) for general Inner Sphere vs Clan differences and common patterns.

### Gyro-Specific Tech Base Differences

**Weight and Slot Characteristics**:
- All gyro types have IDENTICAL weight multipliers (Standard: 1.0, XL: 0.5, Compact: 1.5, Heavy-Duty: 2.0)
- All gyro types have IDENTICAL critical slot requirements (Standard/Heavy-Duty: 4, XL: 6, Compact: 2)
- No difference in gyro mechanics between Inner Sphere and Clan

**Introduction Year Differences**:
- Inner Sphere advanced gyros: Available 3067+ (Civil War era)
- Clan advanced gyros: Available ~2850+ (Clan Golden Century)
- Gap: ~215 years earlier for Clan
- Reflects Clan continuous technological advancement

**Tech Base Impact**:
- Gyro selection does NOT differ by tech base for weight/slots
- Primary difference is availability timeline
- Mixed tech units may use either IS or Clan gyro vintages (same specs, different intro years)


---

## Dependencies

### Defines
- **GyroType enum**: Defines four gyro types (Standard, XL, Compact, Heavy-Duty)
- **Gyro weight formula**: CEIL(engineRating / 100) × weightMultiplier
- **Weight multipliers**: Standard 1.0, XL 0.5, Compact 1.5, Heavy-Duty 2.0
- **Slot requirements**: Standard/Heavy-Duty 4 slots, XL 6 slots, Compact 2 slots
- **Placement rules**: Gyro always in CT, immediately after engine first group
- **IGyro interface**: Complete gyro specification
- **IGyroPlacement interface**: Gyro placement information

### Depends On
- [Core Entity Types](../../phase-1-foundation/core-entity-types/spec.md) - Extends ITechBaseEntity, ITemporalEntity, IDocumentedEntity
- [Physical Properties System](../../phase-1-foundation/physical-properties-system/spec.md) - Weight and slot standards
- [Rules Level System](../../phase-1-foundation/rules-level-system/spec.md) - RulesLevel classification
- [Era & Temporal System](../../phase-1-foundation/era-temporal-system/spec.md) - Era and introduction year tracking
- [Engine System](../engine-system/spec.md) - Engine rating for weight calculation, engine slot allocation

### Used By
- [Heat Sink System](../heat-sink-system/spec.md) - Engine-mounted heat sinks placed after gyro
- [Critical Slot Allocation](../critical-slot-allocation/spec.md) - Gyro placement determines available CT slots
- [Construction Rules Core](../construction-rules-core/spec.md) - Gyro weight contributes to total
- **Tech Rating System**: Advanced gyros affect unit tech rating
- **Critical Hit System**: Gyro criticals have specific effects (3 crits = shutdown)

### Construction Sequence
1. Select engine type and rating (determines gyro weight calculation basis)
2. Select gyro type (determines weight multiplier and slot count)
3. Calculate gyro weight: CEIL(engineRating / 100) × multiplier
4. Allocate engine slots (first group in CT slots 0-2)
5. Allocate gyro slots (immediately after engine first group, slots 3+)
6. Allocate engine second group (after gyro slots)
7. Allocate remaining equipment in available CT slots

---

## Implementation Notes

### Performance Considerations
- Gyro weight is calculated, not stored - recalculate when engine rating changes
- Cache gyro slot placement to avoid recalculation during rendering
- Gyro definitions (static data) can be loaded once at app initialization
- Validation can be performed incrementally (don't revalidate entire unit on gyro change)

### Edge Cases
- **Very low engine ratings** (< 100): Still use CEIL(rating / 100) = 1 ton minimum
- **Very high engine ratings** (> 400): Gyro weight scales linearly, no special handling
- **Compact Engine + XL Gyro**: Valid combination - gyro slots 3-8, all equipment in slots 9-11
- **XL Engine + XL Gyro**: Valid - side torso engine slots don't affect gyro placement in CT
- **Zero engine rating**: Invalid unit configuration, caught by engine validation
- **Fractional weights**: XL Gyro produces 0.5-ton increments (e.g., 1.5, 2.5 tons) - this is valid

### Common Pitfalls
- **Pitfall**: Storing gyro weight as fixed value instead of calculating from engine rating
  - **Solution**: Always calculate gyro weight dynamically based on current engine rating
- **Pitfall**: Assuming gyro always occupies slots 3-6
  - **Solution**: Calculate gyro slots based on engine first group end + gyro slot count
- **Pitfall**: Rounding gyro weight to nearest ton
  - **Solution**: Use exact weight including 0.5-ton increments (XL gyros commonly have fractional weight)
- **Pitfall**: Forgetting to update gyro weight when engine rating changes
  - **Solution**: Implement reactive calculation that automatically recalculates on engine change
- **Pitfall**: Assuming all gyros cost the same
  - **Solution**: Use gyro type's baseCost and calculate total cost based on CEIL(rating / 100)
- **Pitfall**: Placing gyro slots before validating engine slot allocation
  - **Solution**: Always allocate engine first group, then gyro, then engine second group

---

## Examples

### Example 1: Standard Configuration
```typescript
// 50-ton medium mech with Standard Engine and Standard Gyro
const config = {
  tonnage: 50,
  engine: {
    rating: 200,
    type: EngineType.STANDARD
  },
  gyro: {
    id: 'standard-gyro',
    name: 'Standard Gyro',
    gyroType: GyroType.STANDARD,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    criticalSlots: 4,
    weightMultiplier: 1.0,
    criticalHitResistance: 0
  }
};

// Weight calculation
const gyroWeight = Math.ceil(200 / 100) * 1.0 = 2.0 tons;

// Slot allocation
const engineFirstGroup = [0, 1, 2]; // CT slots 0-2
const gyroSlots = [3, 4, 5, 6];     // CT slots 3-6
const engineSecondGroup = [7, 8, 9]; // CT slots 7-9
const availableSlots = [10, 11];     // CT slots 10-11 free

// Cost calculation
const gyroCost = 300000 * Math.ceil(200 / 100) = 600,000 C-Bills;
```

### Example 2: Weight-Optimized Configuration
```typescript
// 75-ton heavy mech with XL Engine and XL Gyro (maximum weight savings)
const config = {
  tonnage: 75,
  engine: {
    rating: 300,
    type: EngineType.XL
  },
  gyro: {
    id: 'xl-gyro-is',
    name: 'XL Gyro (IS)',
    gyroType: GyroType.XL,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    criticalSlots: 6,
    weightMultiplier: 0.5,
    criticalHitResistance: 0
  }
};

// Weight calculation
const gyroWeight = Math.ceil(300 / 100) * 0.5 = 1.5 tons;

// Weight savings vs Standard Gyro
const standardWeight = 3.0 tons;
const weightSaved = 3.0 - 1.5 = 1.5 tons;

// Slot allocation
const engineFirstGroup = [0, 1, 2];      // CT slots 0-2
const gyroSlots = [3, 4, 5, 6, 7, 8];    // CT slots 3-8 (6 slots)
const engineSecondGroup = [9, 10, 11];   // CT slots 9-11
const availableSlots = [];               // No free CT slots!

// Cost calculation
const gyroCost = 750000 * Math.ceil(300 / 100) = 2,250,000 C-Bills;
```

### Example 3: Slot-Optimized Configuration
```typescript
// 60-ton mech with Compact Engine and Compact Gyro (maximum CT space)
const config = {
  tonnage: 60,
  engine: {
    rating: 240,
    type: EngineType.COMPACT
  },
  gyro: {
    id: 'compact-gyro',
    name: 'Compact Gyro',
    gyroType: GyroType.COMPACT,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    criticalSlots: 2,
    weightMultiplier: 1.5,
    criticalHitResistance: 0
  }
};

// Weight calculation
const gyroWeight = Math.ceil(240 / 100) * 1.5 = 4.5 tons;

// Weight penalty vs Standard Gyro
const standardWeight = 3.0 tons;
const weightPenalty = 4.5 - 3.0 = 1.5 tons additional;

// Slot allocation
const engineSlots = [0, 1, 2];          // CT slots 0-2 (Compact Engine has no second group)
const gyroSlots = [3, 4];               // CT slots 3-4 (only 2 slots!)
const availableSlots = [5, 6, 7, 8, 9, 10, 11]; // 7 free CT slots!

// Cost calculation
const gyroCost = 400000 * Math.ceil(240 / 100) = 1,200,000 C-Bills;
```

### Example 4: Durability-Optimized Configuration
```typescript
// 80-ton assault mech with Heavy-Duty Gyro (enhanced survivability)
const config = {
  tonnage: 80,
  engine: {
    rating: 320,
    type: EngineType.STANDARD
  },
  gyro: {
    id: 'heavy-duty-gyro',
    name: 'Heavy-Duty Gyro',
    gyroType: GyroType.HEAVY_DUTY,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    criticalSlots: 4,
    weightMultiplier: 2.0,
    criticalHitResistance: 1
  }
};

// Weight calculation
const gyroWeight = Math.ceil(320 / 100) * 2.0 = 8.0 tons;

// Weight penalty vs Standard Gyro
const standardWeight = 4.0 tons;
const weightPenalty = 8.0 - 4.0 = 4.0 tons additional;

// Slot allocation (same as Standard)
const engineFirstGroup = [0, 1, 2];
const gyroSlots = [3, 4, 5, 6];
const engineSecondGroup = [7, 8, 9];
const availableSlots = [10, 11];

// Critical hit benefits
const critResistance = +1; // First critical hit ignored or reduced effect

// Cost calculation
const gyroCost = 500000 * Math.ceil(320 / 100) = 2,000,000 C-Bills;
```

### Example 5: Gyro Type Comparison Table
```typescript
// Comparing all gyro types for 300-rated engine
const engineRating = 300;
const baseGyroWeight = Math.ceil(engineRating / 100); // = 3 tons base

const gyroComparison = [
  {
    type: 'Standard',
    weight: baseGyroWeight * 1.0,  // 3.0 tons
    slots: 4,
    cost: 300000 * 3,              // 900,000 C-Bills
    special: 'Baseline configuration'
  },
  {
    type: 'XL',
    weight: baseGyroWeight * 0.5,  // 1.5 tons (saves 1.5 tons!)
    slots: 6,                      // +2 slots penalty
    cost: 750000 * 3,              // 2,250,000 C-Bills
    special: 'Weight savings, more vulnerable'
  },
  {
    type: 'Compact',
    weight: baseGyroWeight * 1.5,  // 4.5 tons (+1.5 tons penalty)
    slots: 2,                      // -2 slots benefit!
    cost: 400000 * 3,              // 1,200,000 C-Bills
    special: 'Frees CT space, +1 piloting penalty'
  },
  {
    type: 'Heavy-Duty',
    weight: baseGyroWeight * 2.0,  // 6.0 tons (+3.0 tons penalty)
    slots: 4,                      // Same as Standard
    cost: 500000 * 3,              // 1,500,000 C-Bills
    special: '+1 critical hit resistance'
  }
];

// Design decision matrix:
// - Need weight savings? → XL Gyro (-1.5 tons, +2 slots)
// - Need CT space? → Compact Gyro (+1.5 tons, -2 slots)
// - Need durability? → Heavy-Duty (+3.0 tons, +1 crit resistance)
// - Balanced design? → Standard (baseline)
```

### Example 6: Validation Flow
```typescript
function validateGyroConfiguration(
  unit: IBattleMech,
  gyro: IGyroDefinition
): ValidationResult[] {
  const results: ValidationResult[] = [];

  // 1. Check tech base compatibility
  if (gyro.techBase === TechBase.CLAN &&
      unit.techBase === TechBase.INNER_SPHERE) {
    results.push({
      severity: 'error',
      message: `${gyro.name} requires Clan tech base`,
      property: 'gyro.techBase'
    });
  }

  // 2. Check introduction year
  if (unit.constructionYear < gyro.introductionYear) {
    results.push({
      severity: 'error',
      message: `${gyro.name} not available until ${gyro.introductionYear}`,
      property: 'gyro.introductionYear'
    });
  }

  // 3. Validate weight calculation
  const baseWeight = Math.ceil(unit.engine.rating / 100);
  const gyroWeight = baseWeight * gyro.weightMultiplier;
  if (!Number.isFinite(gyroWeight) || gyroWeight < 0.5) {
    results.push({
      severity: 'error',
      message: `Invalid gyro weight: ${gyroWeight} tons`,
      property: 'gyro.weight'
    });
  }

  // 4. Validate slot availability
  const gyroStartSlot = 3; // After engine first group
  const gyroEndSlot = gyroStartSlot + gyro.criticalSlots - 1;
  if (gyroEndSlot >= 12) {
    results.push({
      severity: 'error',
      message: `${gyro.name} requires slots ${gyroStartSlot}-${gyroEndSlot} but CT only has 12 slots`,
      property: 'gyro.criticalSlots'
    });
  }

  // 5. Check rules level compatibility
  if (gyro.rulesLevel === RulesLevel.ADVANCED &&
      unit.rulesLevel === RulesLevel.INTRODUCTORY) {
    results.push({
      severity: 'warning',
      message: `${gyro.name} is Advanced tech, unit will require Advanced rules`,
      property: 'gyro.rulesLevel'
    });
  }

  return results;
}
```

---

## References

### Official BattleTech Rules
- **TechManual**: Page 206 - Gyro types and specifications
- **TechManual**: Page 42 - Gyro weight calculation formula
- **TechManual**: Page 96-97 - Critical slot allocation in Center Torso
- **Total Warfare**: Page 48 - Critical hit effects on gyro
- **BattleMech Manual**: Page 28 - System component placement rules
- **Strategic Operations**: Advanced gyro types and special rules

### Related Documentation
- `openspec/specs/core-entity-types/spec.md` - Base interfaces
- `openspec/specs/physical-properties-system/spec.md` - Weight and slot standards
- `openspec/specs/rules-level-system/spec.md` - Rules level classification
- `openspec/specs/era-temporal-system/spec.md` - Timeline and era definitions
- `openspec/specs/engine-system/spec.md` - Engine integration and slot allocation
- `openspec/specs/critical-slot-allocation/spec.md` - Slot placement rules

### Code References
- Interfaces: `src/types/core/ComponentInterfaces.ts`
- Calculations: `src/services/systemComponents/calculations/ComponentCalculations.ts`
- Lookup Tables: `src/services/systemComponents/calculations/LookupTables.ts`
- Adapter: `src/services/systemComponents/adapters/GyroAdapter.ts`
- Validation: `src/services/validation/GyroRulesValidator.ts`

---

## Changelog

### Version 1.0 (2025-11-27)
- Initial specification
- Defined 4 gyro types: Standard, XL, Compact, Heavy-Duty
- Established weight calculation formula: CEIL(engineRating / 100) * multiplier
- Defined critical slot requirements: Standard/Heavy-Duty (4), Compact (2), XL (6)
- Specified exact slot placement: immediately after engine first group (typically slots 3+)
- Documented tech base variants with introduction years
- Added comprehensive examples and validation rules
- Included cost calculation formulas and critical hit effects
