# Internal Structure System Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2025-11-27
**Dependencies**: Core Entity Types, Physical Properties System, Rules Level System, Era & Temporal System
**Affects**: Armor System, Weight Calculation, Critical Slot Allocation, Unit Construction

---

## Overview

### Purpose
Defines the internal structure subsystem for BattleMechs, including structure types, weight calculations based on mech tonnage, internal structure point distribution by location, and critical slot requirements for advanced structure types. Internal structure provides the structural framework and hit points for each location of a BattleMech.

### Scope
**In Scope:**
- Structure type definitions (Standard, Endo Steel, Endo-Composite, Reinforced, Composite, Industrial)
- Weight calculation formulas (percentage of mech tonnage)
- Internal structure point distribution by location (Head, Torso, Arms, Legs)
- Critical slot requirements for advanced structures
- Tech base variants (Inner Sphere vs Clan differences)
- Rules level classifications
- Structure point multipliers for special types (Reinforced doubles, Composite halves)
- Slot distribution patterns for Endo Steel structures

**Out of Scope:**
- Armor system specifications (covered in Armor System spec)
- Critical hit damage resolution (covered in Critical Hit System spec)
- Maximum armor calculations (derived from structure points, covered in Armor System spec)
- Construction costs and Battle Value (covered in Economics System spec)
- Industrial structure special rules (covered in IndustrialMech spec)

### Key Concepts
- **Internal Structure**: The skeletal framework of a BattleMech providing hit points for each location
- **Structure Weight**: Calculated as a percentage of total mech tonnage (10% for Standard, 5% for Endo Steel)
- **Structure Points**: Hit points per location, determined by mech tonnage using official tables
- **Structure Type**: Classification affecting weight, slots, and structure point multipliers
- **Endo Steel**: Advanced structure saving 50% weight but requiring critical slots (14 IS / 7 Clan)
- **Reinforced Structure**: Heavy structure doubling internal structure points at 100% weight increase
- **Composite Structure**: Lightweight structure reducing weight 50% but halving structure points

---

## Requirements

### Requirement: Structure Type Classification
The system SHALL support all standard BattleTech structure types with distinct characteristics.

**Rationale**: Different structure technologies offer trade-offs between weight, protection, and critical slot usage.

**Priority**: Critical

#### Scenario: Standard Structure
**GIVEN** a BattleMech is being constructed
**WHEN** selecting Standard Structure
**THEN** structure weight SHALL be 10% of mech tonnage
**AND** structure SHALL occupy 0 critical slots
**AND** structure points SHALL use base values from official table
**AND** structure SHALL be Introductory rules level
**AND** structure SHALL be available to both IS and Clan

#### Scenario: Endo Steel (Inner Sphere)
**GIVEN** an Inner Sphere mech requires weight savings
**WHEN** selecting Endo Steel (IS) structure
**THEN** structure weight SHALL be 5% of mech tonnage (50% savings)
**AND** structure SHALL occupy 14 critical slots distributed across mech
**AND** structure points SHALL use base values (no multiplier)
**AND** structure SHALL be Standard rules level
**AND** weight SHALL round up to nearest 0.5 ton

#### Scenario: Endo Steel (Clan)
**GIVEN** a Clan mech requires weight savings
**WHEN** selecting Endo Steel (Clan) structure
**THEN** structure weight SHALL be 5% of mech tonnage (50% savings)
**AND** structure SHALL occupy 7 critical slots distributed across mech
**AND** structure points SHALL use base values (no multiplier)
**AND** structure SHALL be Standard rules level
**AND** weight SHALL round up to nearest 0.5 ton

#### Scenario: Reinforced Structure
**GIVEN** a mech requires maximum protection
**WHEN** selecting Reinforced Structure
**THEN** structure weight SHALL be 20% of mech tonnage (100% increase)
**AND** structure SHALL occupy 0 critical slots
**AND** structure points SHALL be DOUBLED (2x base values)
**AND** structure SHALL be Advanced rules level
**AND** maximum armor points SHALL also be doubled

#### Scenario: Composite Structure
**GIVEN** a mech requires minimum weight structure
**WHEN** selecting Composite Structure
**THEN** structure weight SHALL be 5% of mech tonnage (50% savings)
**AND** structure SHALL occupy 4 critical slots distributed across mech
**AND** structure points SHALL be HALVED (0.5x base values)
**AND** structure SHALL be Experimental rules level
**AND** maximum armor points SHALL also be halved

#### Scenario: Endo-Composite Structure
**GIVEN** a mech requires advanced lightweight structure
**WHEN** selecting Endo-Composite Structure
**THEN** structure weight SHALL be 5% of mech tonnage (50% savings)
**AND** structure SHALL occupy 4 critical slots distributed across mech
**AND** structure points SHALL use base values (no multiplier)
**AND** structure SHALL be Experimental rules level

#### Scenario: Industrial Structure
**GIVEN** an IndustrialMech is being constructed
**WHEN** selecting Industrial Structure
**THEN** structure weight SHALL be 10% of mech tonnage (same as Standard)
**AND** structure SHALL occupy 0 critical slots
**AND** structure points SHALL use base values
**AND** structure SHALL be Introductory rules level
**AND** structure SHALL only be available for IndustrialMech unit types

### Requirement: Structure Weight Calculation
The system SHALL calculate structure weight as a percentage of mech tonnage based on structure type.

**Rationale**: Structure weight is a fundamental component of mech construction and varies by technology type.

**Priority**: Critical

#### Scenario: Standard Structure weight
**GIVEN** a mech with tonnage T and Standard Structure
**WHEN** calculating structure weight
**THEN** weight = T × 0.10 (10% of tonnage)
**AND** weight SHALL be exact (no rounding required)

#### Scenario: Endo Steel weight calculation
**GIVEN** a mech with tonnage T and Endo Steel structure
**WHEN** calculating structure weight
**THEN** base weight = T × 0.05 (5% of tonnage)
**AND** weight SHALL round up to nearest 0.5 ton
**EXAMPLE**: 75-ton mech: 75 × 0.05 = 3.75 → rounds to 4.0 tons

#### Scenario: Reinforced Structure weight
**GIVEN** a mech with tonnage T and Reinforced Structure
**WHEN** calculating structure weight
**THEN** weight = T × 0.20 (20% of tonnage, double standard)
**AND** weight SHALL be exact (no rounding required)

#### Scenario: Composite Structure weight
**GIVEN** a mech with tonnage T and Composite Structure
**WHEN** calculating structure weight
**THEN** base weight = T × 0.05 (5% of tonnage)
**AND** weight SHALL round up to nearest 0.5 ton
**AND** structure points SHALL be halved

#### Scenario: Weight calculation examples
**GIVEN** various mech tonnages
**WHEN** calculating structure weights
**THEN** examples SHALL be:
| Tonnage | Standard | Endo Steel IS | Endo Steel Clan | Reinforced | Composite |
|---------|----------|---------------|-----------------|------------|-----------|
| 20 tons | 2.0 tons | 1.0 tons      | 1.0 tons        | 4.0 tons   | 1.0 tons  |
| 35 tons | 3.5 tons | 2.0 tons      | 2.0 tons        | 7.0 tons   | 2.0 tons  |
| 50 tons | 5.0 tons | 2.5 tons      | 2.5 tons        | 10.0 tons  | 2.5 tons  |
| 75 tons | 7.5 tons | 4.0 tons      | 4.0 tons        | 15.0 tons  | 4.0 tons  |
| 100 tons| 10.0 tons| 5.0 tons      | 5.0 tons        | 20.0 tons  | 5.0 tons  |

### Requirement: Internal Structure Point Distribution
The system SHALL assign internal structure points to each location based on official BattleTech tables.

**Rationale**: Structure points determine hit points and maximum armor for each location. Values are standardized by tonnage.

**Priority**: Critical

#### Scenario: Head structure points
**GIVEN** any BattleMech tonnage
**WHEN** calculating head structure points
**THEN** head SHALL always have 3 points
**AND** head points SHALL NOT scale with tonnage

#### Scenario: Center Torso structure points
**GIVEN** a BattleMech with standard structure table
**WHEN** looking up center torso points
**THEN** CT points SHALL vary by tonnage class:
- 20 tons: 7 points
- 25 tons: 8 points
- 30 tons: 10 points
- 40 tons: 12 points
- 50 tons: 16 points
- 75 tons: 24 points
- 100 tons: 32 points

#### Scenario: Side Torso structure points
**GIVEN** center torso structure points
**WHEN** calculating side torso points
**THEN** each side torso SHALL be approximately 70% of CT points
**AND** exact values SHALL follow official table

#### Scenario: Arm structure points
**GIVEN** center torso structure points
**WHEN** calculating arm points
**THEN** each arm SHALL be approximately 50-60% of CT points
**AND** exact values SHALL follow official table

#### Scenario: Leg structure points
**GIVEN** center torso structure points
**WHEN** calculating leg points
**THEN** each leg SHALL be approximately 60-70% of CT points
**AND** exact values SHALL follow official table

#### Scenario: Complete structure point table
**GIVEN** official BattleTech construction rules
**WHEN** defining structure points by tonnage
**THEN** official table SHALL be:

| Tonnage | Head | CT | LT | RT | LA | RA | LL | RL | Total |
|---------|------|----|----|----|----|----|----|----| ------|
| 20      | 3    | 7  | 5  | 5  | 4  | 4  | 5  | 5  | 38    |
| 25      | 3    | 8  | 6  | 6  | 4  | 4  | 6  | 6  | 43    |
| 30      | 3    | 10 | 7  | 7  | 5  | 5  | 7  | 7  | 51    |
| 35      | 3    | 11 | 8  | 8  | 6  | 6  | 8  | 8  | 58    |
| 40      | 3    | 12 | 10 | 10 | 6  | 6  | 10 | 10 | 67    |
| 45      | 3    | 14 | 11 | 11 | 7  | 7  | 11 | 11 | 75    |
| 50      | 3    | 16 | 11 | 11 | 9  | 9  | 11 | 11 | 81    |
| 55      | 3    | 18 | 13 | 13 | 9  | 9  | 13 | 13 | 91    |
| 60      | 3    | 20 | 14 | 14 | 10 | 10 | 14 | 14 | 99    |
| 65      | 3    | 21 | 15 | 15 | 10 | 10 | 15 | 15 | 104   |
| 70      | 3    | 22 | 15 | 15 | 11 | 11 | 15 | 15 | 107   |
| 75      | 3    | 24 | 17 | 17 | 13 | 13 | 17 | 17 | 121   |
| 80      | 3    | 25 | 17 | 17 | 13 | 13 | 17 | 17 | 122   |
| 85      | 3    | 27 | 18 | 18 | 14 | 14 | 18 | 18 | 130   |
| 90      | 3    | 29 | 19 | 19 | 15 | 15 | 19 | 19 | 138   |
| 95      | 3    | 31 | 20 | 20 | 17 | 17 | 20 | 20 | 148   |
| 100     | 3    | 32 | 21 | 21 | 17 | 17 | 21 | 21 | 153   |

### Requirement: Structure Point Multipliers
The system SHALL apply structure point multipliers for Reinforced and Composite structures.

**Rationale**: Some structure types modify the base structure points, affecting both durability and maximum armor.

**Priority**: Critical

#### Scenario: Reinforced Structure point multiplier
**GIVEN** Reinforced Structure is selected
**WHEN** calculating structure points per location
**THEN** ALL location points SHALL be multiplied by 2.0
**AND** maximum armor SHALL also be doubled
**EXAMPLE**: 50-ton mech CT: 16 base points → 32 Reinforced points

#### Scenario: Composite Structure point multiplier
**GIVEN** Composite Structure is selected
**WHEN** calculating structure points per location
**THEN** ALL location points SHALL be multiplied by 0.5 (halved)
**AND** maximum armor SHALL also be halved
**AND** fractional points SHALL round down
**EXAMPLE**: 50-ton mech CT: 16 base points → 8 Composite points

#### Scenario: Standard structure types point multiplier
**GIVEN** Standard, Endo Steel, or Endo-Composite Structure
**WHEN** calculating structure points
**THEN** point multiplier SHALL be 1.0 (no change)
**AND** base table values SHALL be used directly

### Requirement: Critical Slot Requirements
Advanced structure types SHALL occupy critical slots distributed across the BattleMech.

**Rationale**: Weight-saving structures require additional space for honeycomb framework distribution.

**Priority**: High

#### Scenario: Standard Structure slots
**GIVEN** Standard, Reinforced, or Industrial Structure
**WHEN** allocating critical slots
**THEN** structure SHALL occupy 0 critical slots
**AND** all slots SHALL be available for equipment

#### Scenario: Endo Steel (IS) slot allocation
**GIVEN** Endo Steel (Inner Sphere) Structure
**WHEN** allocating critical slots
**THEN** structure SHALL occupy 14 total slots
**AND** slots SHALL be distributed across any valid locations
**AND** slots MAY be split across multiple locations
**AND** common distribution: 2-4 slots per location across 6-8 locations

#### Scenario: Endo Steel (Clan) slot allocation
**GIVEN** Endo Steel (Clan) Structure
**WHEN** allocating critical slots
**THEN** structure SHALL occupy 7 total slots
**AND** slots SHALL be distributed across any valid locations
**AND** slots MAY be split across multiple locations
**AND** common distribution: 1-2 slots per location across 4-7 locations

#### Scenario: Composite/Endo-Composite slot allocation
**GIVEN** Composite or Endo-Composite Structure
**WHEN** allocating critical slots
**THEN** structure SHALL occupy 4 total slots
**AND** slots SHALL be distributed across any valid locations

#### Scenario: Slot distribution constraints
**GIVEN** any advanced structure requiring slots
**WHEN** placing structure slots
**THEN** slots MAY be placed in any location except Head
**AND** slots MAY be split across multiple locations
**AND** each location SHALL track how many structure slots it contains
**AND** structure slots CANNOT be placed in same slots as other equipment

---

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * Internal Structure component interface
 * Extends ITechBaseEntity for tech base and rules level classification
 */
interface IStructure extends ITechBaseEntity, IPhysicalProperties {
  /**
   * Structure type classification
   * @example "Endo Steel (IS)"
   */
  readonly structureType: StructureType;

  /**
   * Total internal structure points across all locations
   * @example 81 (for 50-ton mech with Standard Structure)
   */
  readonly totalPoints: number;

  /**
   * Internal structure points by location
   * @example { head: 3, centerTorso: 16, leftTorso: 11, ... }
   */
  readonly pointsByLocation: IStructurePoints;

  /**
   * Structure point multiplier (1.0 standard, 2.0 reinforced, 0.5 composite)
   * @example 2.0
   */
  readonly pointMultiplier: number;

  /**
   * Critical slots required for this structure type
   * @example 14 (for IS Endo Steel)
   */
  readonly criticalSlots: number;

  /**
   * Slot distribution across locations (for advanced structures)
   * @example { leftTorso: 2, rightTorso: 2, leftArm: 2, ... }
   */
  readonly slotDistribution?: Partial<Record<LocationType, number>>;
}

/**
 * Structure points per location
 */
interface IStructurePoints {
  readonly head: number;           // Always 3 for BattleMechs
  readonly centerTorso: number;     // Varies by tonnage
  readonly leftTorso: number;       // ~70% of CT
  readonly rightTorso: number;      // ~70% of CT
  readonly leftArm: number;         // ~50-60% of CT
  readonly rightArm: number;        // ~50-60% of CT
  readonly leftLeg: number;         // ~60-70% of CT
  readonly rightLeg: number;        // ~60-70% of CT
}

/**
 * Structure type enumeration
 */
enum StructureType {
  STANDARD = 'Standard',
  ENDO_STEEL_IS = 'Endo Steel (IS)',
  ENDO_STEEL_CLAN = 'Endo Steel (Clan)',
  REINFORCED = 'Reinforced',
  COMPOSITE = 'Composite',
  ENDO_COMPOSITE = 'Endo-Composite',
  INDUSTRIAL = 'Industrial'
}

/**
 * Structure definition with static properties
 */
interface IStructureDefinition {
  readonly id: string;
  readonly name: string;
  readonly structureType: StructureType;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly introductionYear: number;
  readonly weightMultiplier: number;     // Multiplier for base weight (0.5, 1.0, 2.0)
  readonly pointMultiplier: number;      // Multiplier for structure points (0.5, 1.0, 2.0)
  readonly criticalSlots: number;        // Total slots required
  readonly description?: string;
  readonly specialRules?: string[];
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `structureType` | `StructureType` | Yes | Structure technology type | See StructureType enum | - |
| `totalPoints` | `number` | Yes | Sum of all location structure points | > 0 | Calculated |
| `pointsByLocation` | `IStructurePoints` | Yes | Structure points per location | Head=3, others from table | - |
| `pointMultiplier` | `number` | Yes | Structure point multiplier | 0.5, 1.0, 2.0 | 1.0 |
| `criticalSlots` | `number` | Yes | Total critical slots required | 0, 4, 7, 14 | 0 |
| `slotDistribution` | `Partial<Record<LocationType, number>>` | No | Slots per location | Valid location assignments | - |

### Type Constraints

- `structureType` MUST be one of the defined StructureType enum values
- `totalPoints` MUST equal sum of all location points
- `pointMultiplier` MUST be 0.5 (Composite), 1.0 (Standard/Endo), or 2.0 (Reinforced)
- `criticalSlots` MUST match structure type requirements (0, 4, 7, or 14)
- Head structure points MUST always be 3 (before multiplier) for BattleMechs
- When `slotDistribution` is provided, sum MUST equal `criticalSlots`

---

## Calculation Formulas

### Structure Weight Formula

**Formula**:
```
structureWeight = ROUND_UP(tonnage × weightMultiplier, 0.5)
```

**Where**:
- `tonnage` = Total mech tonnage (20-100 tons)
- `weightMultiplier` = Structure type multiplier:
  - Standard: 0.10 (10% of tonnage)
  - Endo Steel: 0.05 (5% of tonnage)
  - Reinforced: 0.20 (20% of tonnage)
  - Composite: 0.05 (5% of tonnage)
  - Industrial: 0.10 (10% of tonnage)

**Rounding Rules**:
- Standard and Reinforced: No rounding needed (always exact values)
- Endo Steel and Composite: Round UP to nearest 0.5 ton

**Examples**:
```
50-ton mech, Standard Structure:
  weight = 50 × 0.10 = 5.0 tons

75-ton mech, Endo Steel (IS):
  weight = 75 × 0.05 = 3.75 → rounds to 4.0 tons

100-ton mech, Reinforced:
  weight = 100 × 0.20 = 20.0 tons

35-ton mech, Composite:
  weight = 35 × 0.05 = 1.75 → rounds to 2.0 tons
```

### Structure Points Calculation

**Formula**:
```
locationPoints = basePoints × pointMultiplier
```

**Where**:
- `basePoints` = Points from official structure table (see table in Requirements section)
- `pointMultiplier` = Structure type multiplier:
  - Standard/Endo Steel/Endo-Composite: 1.0
  - Reinforced: 2.0
  - Composite: 0.5

**Special Cases**:
- Head always has 3 base points (before multiplier)
- Composite structure rounds down if fractional (e.g., 11 × 0.5 = 5.5 → 5 points)
- All other locations use exact table values

**Example**:
```
50-ton mech with Reinforced Structure:
  Base CT: 16 points
  Reinforced CT: 16 × 2.0 = 32 points

  Base LT/RT: 11 points each
  Reinforced LT/RT: 11 × 2.0 = 22 points each

50-ton mech with Composite Structure:
  Base CT: 16 points
  Composite CT: 16 × 0.5 = 8 points

  Base LT/RT: 11 points each
  Composite LT/RT: 11 × 0.5 = 5.5 → 5 points each
```

### Total Structure Points

**Formula**:
```
totalPoints = head + centerTorso + leftTorso + rightTorso +
              leftArm + rightArm + leftLeg + rightLeg
```

**Example**:
```
50-ton mech, Standard Structure:
  Total = 3 + 16 + 11 + 11 + 9 + 9 + 11 + 11 = 81 points

75-ton mech, Reinforced Structure:
  Base Total = 3 + 24 + 17 + 17 + 13 + 13 + 17 + 17 = 121 points
  Reinforced Total = 121 × 2.0 = 242 points
```

---

## Validation Rules

### Validation: Structure Weight Accuracy
**Rule**: Calculated structure weight must match assigned weight

**Severity**: Error

**Condition**:
```typescript
const expectedWeight = calculateStructureWeight(tonnage, structureType);
if (Math.abs(assignedWeight - expectedWeight) > 0.01) {
  // invalid - emit error
}
```

**Error Message**: "Structure weight incorrect: expected {expectedWeight} tons for {structureType}, got {assignedWeight} tons"

**User Action**: Recalculate structure weight based on mech tonnage and structure type

### Validation: Structure Points Distribution
**Rule**: Structure points per location must match official table values (accounting for multiplier)

**Severity**: Error

**Condition**:
```typescript
const expectedPoints = getInternalStructurePoints(tonnage);
const actualPoints = structure.pointsByLocation;

// Apply multiplier
const multipliedExpected = applyMultiplier(expectedPoints, structure.pointMultiplier);

if (!pointsMatch(actualPoints, multipliedExpected)) {
  // invalid - emit error
}
```

**Error Message**: "Structure point distribution incorrect for {tonnage}-ton mech with {structureType}"

**User Action**: Use official structure point table and apply correct multiplier

### Validation: Head Structure Points
**Rule**: Head must have 3 base points (or 6 for Reinforced, 1 for Composite)

**Severity**: Error

**Condition**:
```typescript
const baseHeadPoints = 3;
const expectedHeadPoints = baseHeadPoints * structure.pointMultiplier;

if (structure.pointsByLocation.head !== Math.floor(expectedHeadPoints)) {
  // invalid - emit error
}
```

**Error Message**: "Head structure points must be 3 (base) × {multiplier} = {expected}"

**User Action**: Set head structure points to 3 (or appropriate value with multiplier)

### Validation: Critical Slot Count
**Rule**: Total critical slots must match structure type requirements

**Severity**: Error

**Condition**:
```typescript
const requiredSlots = STRUCTURE_CRITICAL_SLOTS[structureType];

if (structure.criticalSlots !== requiredSlots) {
  // invalid - emit error
}
```

**Error Message**: "{structureType} requires {requiredSlots} critical slots, found {actualSlots}"

**User Action**: Allocate correct number of critical slots for structure type

### Validation: Slot Distribution
**Rule**: If slot distribution provided, sum must equal total required slots

**Severity**: Error

**Condition**:
```typescript
if (structure.slotDistribution) {
  const totalAllocated = Object.values(structure.slotDistribution)
    .reduce((sum, count) => sum + count, 0);

  if (totalAllocated !== structure.criticalSlots) {
    // invalid - emit error
  }
}
```

**Error Message**: "Structure slot distribution total ({totalAllocated}) does not match required slots ({requiredSlots})"

**User Action**: Ensure slot distribution adds up to required total slots

### Validation: Industrial Structure Restriction
**Rule**: Industrial Structure can only be used on IndustrialMech units

**Severity**: Error

**Condition**:
```typescript
if (structure.structureType === StructureType.INDUSTRIAL &&
    unit.type !== 'IndustrialMech') {
  // invalid - emit error
}
```

**Error Message**: "Industrial Structure can only be used on IndustrialMech units"

**User Action**: Select appropriate structure type for BattleMech units

---

## Technology Base Variants

See [Tech Base Variants Reference](../tech-base-variants-reference/spec.md) for general Inner Sphere vs Clan differences and the "14-7 Pattern" for distributed slots.

### Internal Structure-Specific Tech Base Differences

**Endo Steel Critical Slot Requirements**:
- Inner Sphere Endo Steel: 14 critical slots distributed across locations
- Clan Endo Steel: 7 critical slots distributed across locations
- Weight savings: Identical (50% reduction to 5% of tonnage)
- Structure points: Identical (no multiplier, use base values)

**Standard and Other Structures**:
- Standard, Reinforced, Industrial: No tech base differences
- Composite, Endo-Composite: No tech base-specific variants (experimental tech)

**Slot Distribution Pattern**:
- IS: Typically 2-3 slots per location across 6-8 locations
- Clan: Typically 1-2 slots per location across 4-7 locations
- Both: Cannot place in Head location
- Both: Distributed flexibly across remaining locations

**Mixed Tech Application**:
- Clan Endo Steel saves 7 critical slots vs IS Endo Steel
- Weight savings identical for both
- Clan Endo Steel strictly superior for mixed tech units


---

## Dependencies

### Defines
- **StructureType enum**: Defines six structure types (Standard, Endo Steel IS/Clan, Reinforced, Composite, Endo-Composite, Industrial)
- **Structure weight formula**: (tonnage × 0.10) × weightMultiplier
- **Weight multipliers**: Standard/Industrial 1.0, Endo Steel/Composite/Endo-Composite 0.5, Reinforced 2.0
- **Point multipliers**: Standard/Endo Steel 1.0, Reinforced 2.0, Composite 0.5
- **Slot requirements**: Standard/Reinforced 0 slots, Endo Steel IS 14 slots, Endo Steel Clan 7 slots, Composite 4 slots
- **Structure points table**: Official tonnage-to-points mapping for all 8 locations
- **IInternalStructure interface**: Complete structure specification
- **Maximum armor formula**: 2× structure points per location (except head: max 9)

### Depends On
- [Core Entity Types](../../phase-1-foundation/core-entity-types/spec.md) - Extends ITechBaseEntity, ITemporalEntity
- [Physical Properties System](../../phase-1-foundation/physical-properties-system/spec.md) - Weight calculations and physical constraints
- [Rules Level System](../../phase-1-foundation/rules-level-system/spec.md) - Classification of structure types by complexity
- [Era & Temporal System](../../phase-1-foundation/era-temporal-system/spec.md) - Availability by introduction year

### Used By
- [Armor System](../armor-system/spec.md) - Structure points determine maximum armor per location (2:1 ratio)
- [Critical Slot Allocation](../critical-slot-allocation/spec.md) - Advanced structures occupy distributed critical slots
- [Construction Rules Core](../construction-rules-core/spec.md) - Structure weight contributes to total
- **Damage System**: Structure points represent location hit points

### Construction Sequence
1. Select unit tonnage (20-100 in 5-ton increments)
2. Choose structure type based on tech base and rules level
3. Calculate structure weight: (tonnage × 0.10) × multiplier
4. Assign structure points per location from official table
5. Apply point multiplier if using Reinforced or Composite
6. Allocate critical slots for Endo Steel/Composite structures
7. Calculate maximum armor based on structure points (Armor System)

---

## Implementation Notes

### Performance Considerations
- Pre-calculate structure point tables for all tonnages (20-100)
- Cache structure weight calculations per tonnage/type combination
- Store structure definitions as static data, not recalculated per instance

### Edge Cases
- **Fractional Structure Points**: Composite structure halves points, round down (e.g., 11 × 0.5 = 5.5 → 5)
- **Reinforced Structure Armor**: Maximum armor also doubles with structure points
- **Endo Steel Slot Distribution**: Player may distribute 14 (IS) or 7 (Clan) slots freely across valid locations
- **Industrial Structure**: Only valid for IndustrialMech unit type, use Standard for BattleMechs

### Common Pitfalls
- **Pitfall**: Calculating structure points as simple percentage of tonnage
  - **Solution**: Always use official structure point table, not formulas
- **Pitfall**: Forgetting to apply point multiplier for Reinforced/Composite
  - **Solution**: Apply multiplier to ALL locations including head
- **Pitfall**: Not rounding Endo Steel weight correctly
  - **Solution**: Always round UP to nearest 0.5 ton for 5% calculations
- **Pitfall**: Allowing Endo slots in Head location
  - **Solution**: Endo Steel slots can only go in CT, LT, RT, LA, RA, LL, RL (not Head)

---

## Examples

### Example 1: 50-ton BattleMech with Standard Structure

**Input**:
```typescript
const mech = {
  tonnage: 50,
  structureType: StructureType.STANDARD
};
```

**Calculation**:
```typescript
// Weight calculation
const weight = 50 × 0.10 = 5.0 tons;

// Structure points (from official table)
const points: IStructurePoints = {
  head: 3,
  centerTorso: 16,
  leftTorso: 11,
  rightTorso: 11,
  leftArm: 9,
  rightArm: 9,
  leftLeg: 11,
  rightLeg: 11
};

const totalPoints = 3 + 16 + 11 + 11 + 9 + 9 + 11 + 11 = 81;
```

**Output**:
```typescript
const structure: IStructure = {
  structureType: StructureType.STANDARD,
  weight: 5.0,
  totalPoints: 81,
  pointsByLocation: points,
  pointMultiplier: 1.0,
  criticalSlots: 0,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.INTRODUCTORY
};
```

### Example 2: 75-ton BattleMech with Endo Steel (IS)

**Input**:
```typescript
const mech = {
  tonnage: 75,
  structureType: StructureType.ENDO_STEEL_IS
};
```

**Calculation**:
```typescript
// Weight calculation (5% of tonnage, rounded up)
const baseWeight = 75 × 0.05 = 3.75;
const weight = Math.ceil(baseWeight * 2) / 2 = 4.0 tons; // Round to 0.5

// Structure points (same as Standard - no multiplier)
const points: IStructurePoints = {
  head: 3,
  centerTorso: 24,
  leftTorso: 17,
  rightTorso: 17,
  leftArm: 13,
  rightArm: 13,
  leftLeg: 17,
  rightLeg: 17
};

const totalPoints = 3 + 24 + 17 + 17 + 13 + 13 + 17 + 17 = 121;

// Slot distribution (example - player may vary)
const slotDistribution = {
  leftTorso: 2,
  rightTorso: 2,
  leftArm: 2,
  rightArm: 2,
  leftLeg: 3,
  rightLeg: 3
}; // Total = 14 slots
```

**Output**:
```typescript
const structure: IStructure = {
  structureType: StructureType.ENDO_STEEL_IS,
  weight: 4.0,
  totalPoints: 121,
  pointsByLocation: points,
  pointMultiplier: 1.0,
  criticalSlots: 14,
  slotDistribution: slotDistribution,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD
};

// Weight savings compared to Standard
const standardWeight = 75 × 0.10 = 7.5 tons;
const savings = standardWeight - 4.0 = 3.5 tons saved;
```

### Example 3: 100-ton Assault Mech with Reinforced Structure

**Input**:
```typescript
const mech = {
  tonnage: 100,
  structureType: StructureType.REINFORCED
};
```

**Calculation**:
```typescript
// Weight calculation (20% of tonnage)
const weight = 100 × 0.20 = 20.0 tons;

// Base structure points (from table)
const basePoints: IStructurePoints = {
  head: 3,
  centerTorso: 32,
  leftTorso: 21,
  rightTorso: 21,
  leftArm: 17,
  rightArm: 17,
  leftLeg: 21,
  rightLeg: 21
};

// Apply Reinforced multiplier (2.0) - doubles all points
const reinforcedPoints: IStructurePoints = {
  head: 3 × 2 = 6,
  centerTorso: 32 × 2 = 64,
  leftTorso: 21 × 2 = 42,
  rightTorso: 21 × 2 = 42,
  leftArm: 17 × 2 = 34,
  rightArm: 17 × 2 = 34,
  leftLeg: 21 × 2 = 42,
  rightLeg: 21 × 2 = 42
};

const totalPoints = 6 + 64 + 42 + 42 + 34 + 34 + 42 + 42 = 306;
```

**Output**:
```typescript
const structure: IStructure = {
  structureType: StructureType.REINFORCED,
  weight: 20.0,
  totalPoints: 306,
  pointsByLocation: reinforcedPoints,
  pointMultiplier: 2.0,
  criticalSlots: 0,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.ADVANCED
};

// Maximum armor also doubles
// Standard CT max armor: 32 × 2 = 64 points
// Reinforced CT max armor: 64 × 2 = 128 points
```

### Example 4: 35-ton Light Mech with Composite Structure

**Input**:
```typescript
const mech = {
  tonnage: 35,
  structureType: StructureType.COMPOSITE
};
```

**Calculation**:
```typescript
// Weight calculation (5% of tonnage, rounded up)
const baseWeight = 35 × 0.05 = 1.75;
const weight = Math.ceil(baseWeight * 2) / 2 = 2.0 tons;

// Base structure points (from table)
const basePoints: IStructurePoints = {
  head: 3,
  centerTorso: 11,
  leftTorso: 8,
  rightTorso: 8,
  leftArm: 6,
  rightArm: 6,
  leftLeg: 8,
  rightLeg: 8
};

// Apply Composite multiplier (0.5) - halves all points, round down
const compositePoints: IStructurePoints = {
  head: Math.floor(3 × 0.5) = 1,
  centerTorso: Math.floor(11 × 0.5) = 5,
  leftTorso: Math.floor(8 × 0.5) = 4,
  rightTorso: Math.floor(8 × 0.5) = 4,
  leftArm: Math.floor(6 × 0.5) = 3,
  rightArm: Math.floor(6 × 0.5) = 3,
  leftLeg: Math.floor(8 × 0.5) = 4,
  rightLeg: Math.floor(8 × 0.5) = 4
};

const totalPoints = 1 + 5 + 4 + 4 + 3 + 3 + 4 + 4 = 28;

// Slot distribution for 4 slots
const slotDistribution = {
  leftTorso: 1,
  rightTorso: 1,
  leftLeg: 1,
  rightLeg: 1
}; // Total = 4 slots
```

**Output**:
```typescript
const structure: IStructure = {
  structureType: StructureType.COMPOSITE,
  weight: 2.0,
  totalPoints: 28,
  pointsByLocation: compositePoints,
  pointMultiplier: 0.5,
  criticalSlots: 4,
  slotDistribution: slotDistribution,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.EXPERIMENTAL
};

// Note: Very fragile - only 1 head structure point!
// Maximum armor also halved (Head max = 9 × 0.5 = 4.5 → 4 points)
```

### Example 5: Comparison Table - 50-ton Mech Structure Types

| Structure Type | Weight | Slots | CT Points | Max CT Armor | Rules Level | Weight Savings |
|----------------|--------|-------|-----------|--------------|-------------|----------------|
| Standard       | 5.0 t  | 0     | 16        | 32           | Intro       | -              |
| Endo Steel IS  | 2.5 t  | 14    | 16        | 32           | Standard    | 2.5 tons       |
| Endo Steel Clan| 2.5 t  | 7     | 16        | 32           | Standard    | 2.5 tons       |
| Reinforced     | 10.0 t | 0     | 32        | 64           | Advanced    | -5.0 tons*     |
| Composite      | 2.5 t  | 4     | 8         | 16           | Experimental| 2.5 tons       |

*Reinforced increases weight but provides double protection

---

## References

### Official BattleTech Rules
- **TechManual**: Pages 52-54 - Internal Structure rules and weight calculations
- **TechManual**: Page 53, Table - Internal Structure Points by Tonnage
- **TechManual**: Pages 207-208 - Endo Steel structure specifications
- **TechManual**: Page 211 - Reinforced Structure rules
- **Tactical Operations**: Pages 284-285 - Composite Structure (Experimental)
- **Total Warfare**: Pages 36-37 - Structure and armor relationship

### Related Documentation
- `openspec/specs/core-entity-types/spec.md` - ITechBaseEntity interface
- `openspec/specs/physical-properties-system/spec.md` - Weight and physical properties
- `openspec/specs/armor-system/spec.md` - Armor maximum calculations (2:1 ratio)
- `openspec/specs/critical-slot-allocation/spec.md` - Slot placement rules

### Code References
- Tables: `src/utils/internalStructureTable.ts` - Official structure point table
- Constants: `src/constants/BattleTechConstructionRules.ts` - Structure weight multipliers
- Types: `src/types/SystemComponents.ts` - IStructure interface
- Adapter: `src/services/systemComponents/adapters/StructureAdapter.ts` - Structure calculations

---

## Changelog

### Version 1.0 (2025-11-27)
- Initial specification
- Defined all structure types (Standard, Endo Steel IS/Clan, Reinforced, Composite, Endo-Composite, Industrial)
- Documented weight calculation formulas (10% standard, 5% endo/composite, 20% reinforced)
- Included complete structure point table for all tonnages (20-100)
- Specified critical slot requirements (0, 4, 7, 14 slots)
- Defined structure point multipliers (0.5x Composite, 1.0x Standard/Endo, 2.0x Reinforced)
- Added tech base variants and rules level classifications
- Provided comprehensive examples with calculations
- Documented validation rules and edge cases
