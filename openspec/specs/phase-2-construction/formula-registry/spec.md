# Formula Registry Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2025-11-28
**Dependencies**: All Phase 1 Core Types, All Phase 2 Construction Subsystem Specs
**Affects**: Construction Rules, Validation System, Weight Calculations, Critical Slot Allocation, UI Displays

---

## Overview

### Purpose
Provides a centralized reference for all calculation formulas used in BattleMech construction to ensure consistency, prevent duplication, and serve as the single source of truth for all mathematical operations in the system. This specification consolidates formulas from all subsystems into one searchable, maintainable document.

### Scope
**In Scope:**
- All movement-related formulas (Walk MP, Run MP, Jump MP)
- All engine-related formulas (weight, rating constraints, integral heat sinks)
- All gyro-related formulas (weight by type)
- All structure formulas (weight, points by tonnage)
- All armor formulas (points per ton, max armor, weight)
- All critical slot formulas (slot counts by location)
- All weight budget formulas (available tonnage)
- All heat sink formulas (external heat sink weights and slots)
- Rounding rules and edge case handling
- Tech base variants where applicable
- Formula relationships and dependencies

**Out of Scope:**
- Implementation-specific code or function signatures (covered in implementation specs)
- UI-specific display logic (covered in UI specs)
- Combat-related formulas (covered in Combat System spec)
- Economic formulas like cost and Battle Value (covered in Economics System spec)
- Damage calculations (covered in Combat System spec)

### Key Concepts
- **Formula**: Mathematical expression producing deterministic output from inputs
- **Rounding Rule**: Specification for handling fractional results (floor, ceiling, half-ton)
- **Edge Case**: Boundary condition requiring special handling
- **Tech Variant**: Formula variation based on Inner Sphere vs Clan technology
- **Constraint**: Validation rule limiting valid input/output ranges
- **Dependency**: Formula requiring output from another formula as input

---

## Requirements

### Requirement: Formula Consistency
The system SHALL use identical formulas across all implementations for the same calculation.

**Rationale**: Prevents inconsistencies between different parts of the codebase and ensures predictable results.

**Priority**: Critical

#### Scenario: Walk MP calculation consistency
**GIVEN** engine rating 300 and tonnage 75
**WHEN** walk MP is calculated in any subsystem
**THEN** result SHALL be floor(300 / 75) = 4
**AND** all implementations SHALL produce identical result

#### Scenario: Weight calculation consistency
**GIVEN** armor points 152 with Standard armor (16 pts/ton)
**WHEN** armor weight is calculated
**THEN** result SHALL be ceil((152 / 16) × 2) / 2 = 9.5 tons
**AND** all implementations SHALL use same rounding method

### Requirement: Rounding Rule Standardization
The system SHALL apply consistent rounding rules per formula type.

**Rationale**: BattleTech uses different rounding conventions for different calculations.

**Priority**: Critical

#### Scenario: Movement uses floor rounding
**GIVEN** walk MP = 5
**WHEN** calculating run MP = walk × 1.5
**THEN** result SHALL use floor(7.5) = 7
**AND** fractional MP SHALL be discarded

#### Scenario: Weight uses half-ton rounding
**GIVEN** calculated weight = 9.375 tons
**WHEN** rounding to valid weight
**THEN** result SHALL be ceil(9.375 × 2) / 2 = 9.5 tons
**AND** weight SHALL be in 0.5 ton increments

#### Scenario: TSM run uses ceiling rounding
**GIVEN** TSM-enhanced walk = 5
**WHEN** calculating run MP with TSM
**THEN** result SHALL use ceiling(5 × 1.5) = 8
**AND** TSM SHALL round up instead of down

### Requirement: Edge Case Documentation
Each formula SHALL document edge cases and boundary conditions.

**Rationale**: Edge cases cause most calculation bugs; explicit documentation prevents errors.

**Priority**: High

#### Scenario: Head armor maximum edge case
**GIVEN** any mech with head location
**WHEN** calculating maximum head armor
**THEN** result SHALL be 9 points (not 2× structure)
**AND** edge case SHALL be explicitly handled

#### Scenario: Jump jet weight bracket boundaries
**GIVEN** mech tonnage exactly 55 tons
**WHEN** calculating jump jet weight
**THEN** weight SHALL be 0.5 tons per jet (light bracket)
**AND** boundary condition SHALL be clearly specified

### Requirement: Formula Dependencies
The system SHALL document dependencies between formulas.

**Rationale**: Some formulas require outputs from other formulas; dependencies must be clear.

**Priority**: High

#### Scenario: Run MP depends on Walk MP
**GIVEN** run MP calculation
**WHEN** identifying dependencies
**THEN** walk MP MUST be calculated first
**AND** dependency SHALL be documented

#### Scenario: Gyro weight depends on engine rating
**GIVEN** gyro weight calculation
**WHEN** identifying dependencies
**THEN** engine rating MUST be known first
**AND** dependency SHALL be documented

---

## Formula Categories

### Movement Formulas

#### Walk MP Formula

**Formula**:
```
walkMP = floor(engineRating / mechTonnage)
```

**Parameters**:
- `engineRating`: number (10-500, multiples of 5)
- `mechTonnage`: number (20-100 for standard BattleMechs)
- Returns: number (typically 1-8, absolute 0-12)

**TypeScript Signature**:
```typescript
function calculateWalkMP(engineRating: number, mechTonnage: number): number {
  return Math.floor(engineRating / mechTonnage);
}
```

**Examples**:
```
Input: engineRating = 300, mechTonnage = 75
Output: floor(300 / 75) = 4

Input: engineRating = 280, mechTonnage = 55
Output: floor(280 / 55) = floor(5.09) = 5

Input: engineRating = 160, mechTonnage = 20
Output: floor(160 / 20) = 8
```

**Edge Cases**:
- When engineRating < mechTonnage: walkMP = 0 (invalid, mech cannot move)
- When engineRating = mechTonnage: walkMP = 1 (minimum viable)
- When walkMP > 8: Very rare, requires extremely high engine rating

**Rounding Rule**: Always floor (round down)

**Validation**:
- walkMP MUST be >= 1 for valid mech construction
- walkMP = 0 triggers error: "Engine too weak for mech tonnage"

**Tech Variants**: None (identical for IS and Clan)

**Dependencies**: Requires engine rating from Engine System

**Used By**: Run MP calculation, Jump MP validation

---

#### Run MP Formula (Standard)

**Formula**:
```
runMP = floor(walkMP × 1.5)
```

**Parameters**:
- `walkMP`: number (1-8 typical)
- Returns: number (typically 1-12)

**TypeScript Signature**:
```typescript
function calculateRunMP(walkMP: number): number {
  return Math.floor(walkMP * 1.5);
}
```

**Examples**:
```
Input: walkMP = 4
Output: floor(4 × 1.5) = 6

Input: walkMP = 5
Output: floor(5 × 1.5) = floor(7.5) = 7

Input: walkMP = 8
Output: floor(8 × 1.5) = 12
```

**Edge Cases**:
- Even walkMP: No rounding loss (4 → 6, 6 → 9)
- Odd walkMP: Loses 0.5 MP to rounding (5 → 7, 7 → 10)

**Rounding Rule**: Always floor (round down)

**Validation**: None (derived value, always valid if walkMP is valid)

**Tech Variants**: None (identical for IS and Clan)

**Dependencies**: Requires walkMP

**Used By**: Movement display, extended jump jet validation

---

#### Run MP Formula (TSM Enhanced)

**Formula**:
```
tsmRunMP = ceiling(tsmWalkMP × 1.5)
```

**Parameters**:
- `tsmWalkMP`: number (TSM-enhanced walk MP)
- Returns: number (typically 3-12)

**TypeScript Signature**:
```typescript
function calculateTSMRunMP(tsmWalkMP: number): number {
  return Math.ceil(tsmWalkMP * 1.5);
}
```

**Examples**:
```
Input: tsmWalkMP = 5
Output: ceil(5 × 1.5) = ceil(7.5) = 8

Input: tsmWalkMP = 4
Output: ceil(4 × 1.5) = 6

Input: tsmWalkMP = 7
Output: ceil(7 × 1.5) = ceil(10.5) = 11
```

**Edge Cases**:
- TSM only active when heat >= 9
- Uses ceiling instead of floor (unique to TSM)

**Rounding Rule**: Always ceiling (round up) - UNIQUE TO TSM

**Validation**: Requires TSM installed and heat >= 9

**Tech Variants**: TSM is primarily Inner Sphere technology

**Dependencies**: Requires TSM walk MP (base walk + TSM modifier)

**Used By**: Movement display when TSM active

---

#### Run MP Formula (Supercharger)

**Formula**:
```
superchargerRunMP = floor(walkMP × 2.0)
```

**Parameters**:
- `walkMP`: number (may be TSM-enhanced)
- Returns: number (typically 4-16)

**TypeScript Signature**:
```typescript
function calculateSuperchargerRunMP(walkMP: number): number {
  return Math.floor(walkMP * 2.0);
}
```

**Examples**:
```
Input: walkMP = 4
Output: floor(4 × 2.0) = 8

Input: walkMP = 5 (TSM-enhanced)
Output: floor(5 × 2.0) = 10

Input: walkMP = 6
Output: floor(6 × 2.0) = 12
```

**Edge Cases**:
- If TSM active: uses TSM-boosted walk MP as base
- Replaces standard run calculation

**Rounding Rule**: Floor (round down)

**Validation**: Requires Supercharger installed

**Tech Variants**: None (identical for IS and Clan)

**Dependencies**: Requires walkMP (potentially TSM-enhanced)

**Used By**: Movement display, MASC combined calculation

---

#### Sprint MP Formula (MASC)

**Formula**:
```
sprintMP = floor(walkMP × 2.0)
```

**Parameters**:
- `walkMP`: number
- Returns: number (typically 4-16)

**TypeScript Signature**:
```typescript
function calculateSprintMP(walkMP: number): number {
  return Math.floor(walkMP * 2.0);
}
```

**Examples**:
```
Input: walkMP = 4
Output: floor(4 × 2.0) = 8

Input: walkMP = 5
Output: floor(5 × 2.0) = 10

Input: walkMP = 6
Output: floor(6 × 2.0) = 12
```

**Edge Cases**:
- MASC and TSM mutually exclusive (cannot coexist)
- MASC activation generates heat and risks damage
- Sprint replaces run for that turn

**Rounding Rule**: Floor (round down)

**Validation**:
- Requires MASC installed
- Cannot install if TSM present
- MASC must be activated (not automatic)

**Tech Variants**: None (identical for IS and Clan)

**Dependencies**: Requires walkMP

**Used By**: Movement display when MASC activated

---

#### Sprint MP Formula (MASC + Supercharger)

**Formula**:
```
combinedSprintMP = floor(walkMP × 2.5)
```

**Parameters**:
- `walkMP`: number
- Returns: number (typically 5-20)

**TypeScript Signature**:
```typescript
function calculateCombinedSprintMP(walkMP: number): number {
  return Math.floor(walkMP * 2.5);
}
```

**Examples**:
```
Input: walkMP = 4
Output: floor(4 × 2.5) = 10

Input: walkMP = 6
Output: floor(6 × 2.5) = 15

Input: walkMP = 8
Output: floor(8 × 2.5) = 20
```

**Edge Cases**:
- Most extreme speed boost available
- Requires both MASC and Supercharger installed
- High heat generation and MASC damage risk

**Rounding Rule**: Floor (round down)

**Validation**:
- Requires both MASC and Supercharger
- MASC must be activated

**Tech Variants**: None

**Dependencies**: Requires walkMP, MASC, Supercharger

**Used By**: Movement display when MASC activated with Supercharger

---

#### Jump MP Formula

**Formula**:
```
For Standard/Improved/Extended/UMU/Jump Booster/Prototype:
  jumpMP = numberOfJumpJets

For Mechanical Jump Booster:
  jumpMP = 1 (fixed)

For Partial Wing:
  jumpMP = 0 (does not provide jump MP)
```

**Parameters**:
- `numberOfJumpJets`: number (0-8 typical)
- `jumpJetType`: JumpJetType enum
- Returns: number (0-8 typical)

**TypeScript Signature**:
```typescript
function calculateJumpMP(
  numberOfJumpJets: number,
  jumpJetType: JumpJetType
): number {
  if (jumpJetType === JumpJetType.MECHANICAL_BOOSTER) {
    return 1; // Fixed at 1 MP
  }
  if (jumpJetType === JumpJetType.PARTIAL_WING) {
    return 0; // Does not provide jump MP
  }
  return numberOfJumpJets;
}
```

**Examples**:
```
Input: numberOfJumpJets = 5, jumpJetType = STANDARD
Output: 5

Input: numberOfJumpJets = 1, jumpJetType = MECHANICAL_BOOSTER
Output: 1

Input: numberOfJumpJets = 0, jumpJetType = PARTIAL_WING
Output: 0
```

**Edge Cases**:
- Standard jets: jumpMP <= walkMP (hard limit)
- Extended jets: jumpMP <= runMP (higher limit)
- Mechanical booster: jumpMP = 1 exactly (cannot exceed)

**Rounding Rule**: None (always integer count)

**Validation**:
- Standard jets: jumpMP <= walkMP
- Extended jets: jumpMP <= runMP
- Mechanical booster: jumpMP = 1 exactly

**Tech Variants**:
- IS: Standard, Improved (2 slots), Extended, Mechanical, Partial Wing
- Clan: Standard, Jump Booster (2 slots), UMU

**Dependencies**: Requires jump jet count and type

**Used By**: Movement display, heat calculation

---

### Engine Formulas

#### Standard Fusion Engine Weight

**Formula**:
```
standardFusionWeight = ((rating / 100)² × 5) tons
roundedWeight = ceil(standardFusionWeight × 2) / 2
```

**Parameters**:
- `rating`: number (10-500, multiples of 5)
- Returns: number (weight in tons, 0.5 ton increments)

**TypeScript Signature**:
```typescript
function calculateStandardFusionWeight(rating: number): number {
  const baseWeight = Math.pow(rating / 100, 2) * 5;
  return Math.ceil(baseWeight * 2) / 2;
}
```

**Examples**:
```
Input: rating = 300
Calculation: (300/100)² × 5 = 9² × 5 = 45 tons
Note: This is incorrect - use official engine rating table
Correct: Rating 300 = 19.0 tons (from table)

Input: rating = 100
Table lookup: 3.0 tons

Input: rating = 250
Table lookup: 14.5 tons
```

**Edge Cases**:
- Formula approximates but does not match official table exactly
- Always use official engine rating table for accuracy
- When rating < 100: Weight may be less than 5 tons

**Rounding Rule**: Half-ton (0.5 ton increments)

**Validation**: rating MUST be 10-500, multiples of 5

**Tech Variants**: None (identical for IS and Clan)

**Dependencies**: None

**Used By**: XL, Light, Compact, XXL, Fuel Cell, Fission weight calculations

**NOTE**: The formula is approximate. Implementations SHOULD use the official engine rating table for precise values.

---

#### XL Engine Weight

**Formula**:
```
xlWeight = standardFusionWeight × 0.5
roundedWeight = ceil(xlWeight × 2) / 2
```

**Parameters**:
- `standardFusionWeight`: number (from table or formula)
- Returns: number (weight in tons)

**TypeScript Signature**:
```typescript
function calculateXLWeight(rating: number): number {
  const standardWeight = getEngineWeightFromTable(rating);
  const xlWeight = standardWeight * 0.5;
  return Math.ceil(xlWeight * 2) / 2;
}
```

**Examples**:
```
Input: rating = 300, standard weight = 19.0 tons
Output: 19.0 × 0.5 = 9.5 tons

Input: rating = 375, standard weight = 26.5 tons
Output: 26.5 × 0.5 = 13.25 → 13.5 tons

Input: rating = 250, standard weight = 14.5 tons
Output: 14.5 × 0.5 = 7.25 → 7.5 tons
```

**Edge Cases**:
- Weight calculation may produce X.25 or X.75 values
- Round to nearest 0.5 ton

**Rounding Rule**: Half-ton (ceil then divide by 2)

**Validation**: rating MUST be 10-500, multiples of 5

**Tech Variants**:
- IS XL: 3 slots per side torso
- Clan XL: 2 slots per side torso
- Weight identical between variants

**Dependencies**: Requires standard fusion weight

**Used By**: Mech weight calculation, construction validation

---

#### XXL Engine Weight

**Formula**:
```
xxlWeight = standardFusionWeight × 0.333
roundedWeight = ceil(xxlWeight × 2) / 2
```

**Parameters**:
- `standardFusionWeight`: number
- Returns: number (weight in tons)

**TypeScript Signature**:
```typescript
function calculateXXLWeight(rating: number): number {
  const standardWeight = getEngineWeightFromTable(rating);
  const xxlWeight = standardWeight * 0.333;
  return Math.ceil(xxlWeight * 2) / 2;
}
```

**Examples**:
```
Input: rating = 400, standard weight = 33.5 tons
Output: 33.5 × 0.333 = 11.1555 → 11.5 tons

Input: rating = 300, standard weight = 19.0 tons
Output: 19.0 × 0.333 = 6.327 → 6.5 tons
```

**Edge Cases**:
- 1/3 multiplier produces many fractional values
- Always round up to nearest half-ton

**Rounding Rule**: Half-ton (ceil then divide by 2)

**Validation**: rating MUST be 10-500, multiples of 5

**Tech Variants**: None (available to both IS and Clan)

**Dependencies**: Requires standard fusion weight

**Used By**: Mech weight calculation, experimental mech construction

---

#### Light Engine Weight

**Formula**:
```
lightWeight = standardFusionWeight × 0.75
roundedWeight = ceil(lightWeight × 2) / 2
```

**Parameters**:
- `standardFusionWeight`: number
- Returns: number (weight in tons)

**TypeScript Signature**:
```typescript
function calculateLightWeight(rating: number): number {
  const standardWeight = getEngineWeightFromTable(rating);
  const lightWeight = standardWeight * 0.75;
  return Math.ceil(lightWeight * 2) / 2;
}
```

**Examples**:
```
Input: rating = 280, standard weight = 15.5 tons
Output: 15.5 × 0.75 = 11.625 → 11.5 tons

Input: rating = 300, standard weight = 19.0 tons
Output: 19.0 × 0.75 = 14.25 → 14.5 tons
```

**Edge Cases**:
- 75% weight provides middle ground between Standard and XL
- Round up to nearest half-ton

**Rounding Rule**: Half-ton (ceil then divide by 2)

**Validation**: rating MUST be 10-500, multiples of 5

**Tech Variants**: Inner Sphere only (Clan does not have Light engines)

**Dependencies**: Requires standard fusion weight

**Used By**: IS mech weight calculation

---

#### Compact Engine Weight

**Formula**:
```
compactWeight = standardFusionWeight × 1.5
roundedWeight = ceil(compactWeight × 2) / 2
```

**Parameters**:
- `standardFusionWeight`: number
- Returns: number (weight in tons)

**TypeScript Signature**:
```typescript
function calculateCompactWeight(rating: number): number {
  const standardWeight = getEngineWeightFromTable(rating);
  const compactWeight = standardWeight * 1.5;
  return Math.ceil(compactWeight * 2) / 2;
}
```

**Examples**:
```
Input: rating = 100, standard weight = 3.0 tons
Output: 3.0 × 1.5 = 4.5 tons

Input: rating = 200, standard weight = 8.5 tons
Output: 8.5 × 1.5 = 12.75 → 13.0 tons
```

**Edge Cases**:
- Compact engines trade weight for fewer critical slots
- Heavier than standard but saves critical space

**Rounding Rule**: Half-ton (ceil then divide by 2)

**Validation**: rating MUST be 10-500, multiples of 5

**Tech Variants**: Inner Sphere only

**Dependencies**: Requires standard fusion weight

**Used By**: IS mech weight calculation

---

#### Integral Heat Sinks Formula

**Formula**:
```
integralHeatSinks = min(10, floor(rating / 25))
```

**Parameters**:
- `rating`: number (engine rating)
- Returns: number (0-10)

**TypeScript Signature**:
```typescript
function calculateIntegralHeatSinks(rating: number): number {
  return Math.min(10, Math.floor(rating / 25));
}
```

**Examples**:
```
Input: rating = 100
Output: min(10, floor(100 / 25)) = min(10, 4) = 4

Input: rating = 250
Output: min(10, floor(250 / 25)) = min(10, 10) = 10

Input: rating = 300
Output: min(10, floor(300 / 25)) = min(10, 12) = 10
```

**Edge Cases**:
- Rating 250+: Always 10 integral heat sinks (capped)
- Rating < 25: 0 integral heat sinks (very rare)

**Rounding Rule**: Floor (round down), then cap at 10

**Validation**: None (derived value)

**Tech Variants**: None (identical for IS and Clan)

**Dependencies**: Requires engine rating

**Used By**: Heat sink validation, minimum heat sink calculation

---

#### Center Torso Slot Count Formula

**Formula**:
```
For Standard, XL, XXL, Light, ICE, Fuel Cell, Fission:
  if rating <= 100:       ctSlots = 3
  else if rating <= 150:  ctSlots = 4
  else if rating <= 225:  ctSlots = 5
  else if rating <= 325:  ctSlots = 6
  else if rating <= 400:  ctSlots = 7
  else:                   ctSlots = 8

For Compact:
  ctSlots = max(2, ceil(rating / 25))
```

**Parameters**:
- `rating`: number (engine rating)
- `engineType`: EngineType enum
- Returns: number (2-8)

**TypeScript Signature**:
```typescript
function calculateCenterTorsoSlots(
  rating: number,
  engineType: EngineType
): number {
  if (engineType === EngineType.COMPACT) {
    return Math.max(2, Math.ceil(rating / 25));
  }

  if (rating <= 100) return 3;
  if (rating <= 150) return 4;
  if (rating <= 225) return 5;
  if (rating <= 325) return 6;
  if (rating <= 400) return 7;
  return 8;
}
```

**Examples**:
```
Input: rating = 100, type = STANDARD
Output: 3 slots

Input: rating = 300, type = STANDARD
Output: 6 slots

Input: rating = 100, type = COMPACT
Output: ceil(100 / 25) = 4 slots

Input: rating = 450, type = STANDARD
Output: 8 slots
```

**Edge Cases**:
- Compact engine uses different formula
- Boundaries at 100, 150, 225, 325, 400
- Maximum 8 slots for any engine

**Rounding Rule**:
- Standard: None (bracket-based)
- Compact: Ceiling (round up)

**Validation**: Result must be 2-8

**Tech Variants**: None (identical for IS and Clan)

**Dependencies**: Requires engine rating and type

**Used By**: Critical slot allocation, validation

---

#### Side Torso Slot Count Formula

**Formula**:
```
For Standard, Compact, ICE, Fuel Cell, Fission:
  sideSlots = 0

For XL (Inner Sphere), XXL:
  sideSlots = 3 per torso

For XL (Clan), Light:
  sideSlots = 2 per torso
```

**Parameters**:
- `engineType`: EngineType enum
- Returns: number (0, 2, or 3)

**TypeScript Signature**:
```typescript
function calculateSideTorsoSlots(engineType: EngineType): number {
  switch (engineType) {
    case EngineType.XL_INNER_SPHERE:
    case EngineType.XXL:
      return 3;
    case EngineType.XL_CLAN:
    case EngineType.LIGHT:
      return 2;
    default:
      return 0;
  }
}
```

**Examples**:
```
Input: engineType = STANDARD
Output: 0 (no side torso slots)

Input: engineType = XL_INNER_SPHERE
Output: 3 slots per side torso

Input: engineType = XL_CLAN
Output: 2 slots per side torso

Input: engineType = LIGHT
Output: 2 slots per side torso
```

**Edge Cases**:
- Only XL-type engines use side torso slots
- IS XL more vulnerable (3 slots) vs Clan XL (2 slots)

**Rounding Rule**: None (fixed values)

**Validation**: Must be 0, 2, or 3

**Tech Variants**:
- IS XL: 3 slots per side
- Clan XL: 2 slots per side
- Light (IS only): 2 slots per side

**Dependencies**: Requires engine type

**Used By**: Critical slot allocation, construction validation

---

### Gyro Formulas

#### Standard Gyro Weight

**Formula**:
```
standardGyroWeight = ceil(engineRating / 100)
```

**Parameters**:
- `engineRating`: number (10-500)
- Returns: number (weight in tons, whole number)

**TypeScript Signature**:
```typescript
function calculateStandardGyroWeight(engineRating: number): number {
  return Math.ceil(engineRating / 100);
}
```

**Examples**:
```
Input: engineRating = 300
Output: ceil(300 / 100) = 3 tons

Input: engineRating = 280
Output: ceil(280 / 100) = ceil(2.8) = 3 tons

Input: engineRating = 400
Output: ceil(400 / 100) = 4 tons

Input: engineRating = 100
Output: ceil(100 / 100) = 1 ton
```

**Edge Cases**:
- Minimum gyro weight: 1 ton (rating 10-100)
- Maximum gyro weight: 5 tons (rating 500)

**Rounding Rule**: Ceiling (round up to whole ton)

**Validation**: rating MUST be 10-500

**Tech Variants**: None (identical for IS and Clan)

**Dependencies**: Requires engine rating

**Used By**: XL, Compact, Heavy-Duty gyro calculations

---

#### XL Gyro Weight

**Formula**:
```
xlGyroWeight = ceil(standardGyroWeight / 2)
```

**Parameters**:
- `standardGyroWeight`: number
- Returns: number (weight in tons, whole number)

**TypeScript Signature**:
```typescript
function calculateXLGyroWeight(engineRating: number): number {
  const standardWeight = Math.ceil(engineRating / 100);
  return Math.ceil(standardWeight / 2);
}
```

**Examples**:
```
Input: engineRating = 300, standard gyro = 3 tons
Output: ceil(3 / 2) = ceil(1.5) = 2 tons

Input: engineRating = 400, standard gyro = 4 tons
Output: ceil(4 / 2) = 2 tons

Input: engineRating = 100, standard gyro = 1 ton
Output: ceil(1 / 2) = ceil(0.5) = 1 ton
```

**Edge Cases**:
- Minimum XL gyro: 1 ton (cannot be less)
- Odd standard weights round up (3 → 2, 5 → 3)

**Rounding Rule**: Ceiling (round up to whole ton)

**Validation**: rating MUST be 10-500

**Tech Variants**: None (identical for IS and Clan)

**Dependencies**: Requires standard gyro weight

**Used By**: Weight calculation for XL gyro mechs

---

#### Compact Gyro Weight

**Formula**:
```
compactGyroWeight = ceil(standardGyroWeight × 1.5)
```

**Parameters**:
- `standardGyroWeight`: number
- Returns: number (weight in tons, whole number)

**TypeScript Signature**:
```typescript
function calculateCompactGyroWeight(engineRating: number): number {
  const standardWeight = Math.ceil(engineRating / 100);
  return Math.ceil(standardWeight * 1.5);
}
```

**Examples**:
```
Input: engineRating = 300, standard gyro = 3 tons
Output: ceil(3 × 1.5) = ceil(4.5) = 5 tons

Input: engineRating = 200, standard gyro = 2 tons
Output: ceil(2 × 1.5) = 3 tons

Input: engineRating = 400, standard gyro = 4 tons
Output: ceil(4 × 1.5) = 6 tons
```

**Edge Cases**:
- Heavier than standard but uses fewer slots
- Always rounds up

**Rounding Rule**: Ceiling (round up to whole ton)

**Validation**: rating MUST be 10-500

**Tech Variants**: None (identical for IS and Clan)

**Dependencies**: Requires standard gyro weight

**Used By**: Weight calculation for compact gyro mechs

---

#### Heavy-Duty Gyro Weight

**Formula**:
```
heavyDutyGyroWeight = standardGyroWeight × 2
```

**Parameters**:
- `standardGyroWeight`: number
- Returns: number (weight in tons, whole number)

**TypeScript Signature**:
```typescript
function calculateHeavyDutyGyroWeight(engineRating: number): number {
  const standardWeight = Math.ceil(engineRating / 100);
  return standardWeight * 2;
}
```

**Examples**:
```
Input: engineRating = 300, standard gyro = 3 tons
Output: 3 × 2 = 6 tons

Input: engineRating = 250, standard gyro = 3 tons
Output: 3 × 2 = 6 tons

Input: engineRating = 400, standard gyro = 4 tons
Output: 4 × 2 = 8 tons
```

**Edge Cases**:
- Twice the weight of standard
- Provides better damage resistance

**Rounding Rule**: None (always whole number)

**Validation**: rating MUST be 10-500

**Tech Variants**: None (identical for IS and Clan)

**Dependencies**: Requires standard gyro weight

**Used By**: Weight calculation for heavy-duty gyro mechs

---

### Structure Formulas

#### Standard Structure Weight

**Formula**:
```
standardStructureWeight = ceil((tonnage / 10) × 2) / 2
```

**Parameters**:
- `tonnage`: number (20-100)
- Returns: number (weight in tons, 0.5 ton increments)

**TypeScript Signature**:
```typescript
function calculateStandardStructureWeight(tonnage: number): number {
  return Math.ceil((tonnage / 10) * 2) / 2;
}
```

**Examples**:
```
Input: tonnage = 75
Output: ceil((75 / 10) × 2) / 2 = ceil(15) / 2 = 7.5 tons

Input: tonnage = 50
Output: ceil((50 / 10) × 2) / 2 = ceil(10) / 2 = 5.0 tons

Input: tonnage = 100
Output: ceil((100 / 10) × 2) / 2 = ceil(20) / 2 = 10.0 tons

Input: tonnage = 20
Output: ceil((20 / 10) × 2) / 2 = ceil(4) / 2 = 2.0 tons
```

**Edge Cases**:
- Tonnages divisible by 10 produce exact half-ton values
- Odd tonnages may round up

**Rounding Rule**: Half-ton (ceil then divide by 2)

**Validation**: tonnage MUST be 20-100 for standard mechs

**Tech Variants**: None (identical for IS and Clan)

**Dependencies**: None

**Used By**: Endo-Steel, Composite, Reinforced structure calculations

---

#### Endo-Steel Structure Weight

**Formula**:
```
endoSteelWeight = ceil((standardStructureWeight × 0.5) × 2) / 2
```

**Parameters**:
- `standardStructureWeight`: number
- Returns: number (weight in tons, 0.5 ton increments)

**TypeScript Signature**:
```typescript
function calculateEndoSteelWeight(tonnage: number): number {
  const standardWeight = Math.ceil((tonnage / 10) * 2) / 2;
  return Math.ceil((standardWeight * 0.5) * 2) / 2;
}
```

**Examples**:
```
Input: tonnage = 75, standard = 7.5 tons
Output: ceil((7.5 × 0.5) × 2) / 2 = ceil(7.5) / 2 = 4.0 tons

Input: tonnage = 100, standard = 10.0 tons
Output: ceil((10.0 × 0.5) × 2) / 2 = ceil(10) / 2 = 5.0 tons

Input: tonnage = 50, standard = 5.0 tons
Output: ceil((5.0 × 0.5) × 2) / 2 = ceil(5) / 2 = 2.5 tons
```

**Edge Cases**:
- 50% weight savings over standard
- Requires 14 critical slots (IS) or 7 critical slots (Clan)

**Rounding Rule**: Half-ton (ceil then divide by 2)

**Validation**: tonnage MUST be 20-100

**Tech Variants**:
- IS Endo-Steel: 14 critical slots
- Clan Endo-Steel: 7 critical slots
- Weight identical between variants

**Dependencies**: Requires standard structure weight

**Used By**: Weight budget calculations

---

#### Internal Structure Points by Location

**Formula**:
```
For Standard/Endo-Steel/Composite:
  HD = 3 (fixed for all tonnages)
  CT = tonnageRow.centerTorso (from table)
  LT = tonnageRow.sideTorso (from table)
  RT = tonnageRow.sideTorso (from table)
  LA = tonnageRow.arm (from table)
  RA = tonnageRow.arm (from table)
  LL = tonnageRow.leg (from table)
  RL = tonnageRow.leg (from table)
```

**Parameters**:
- `tonnage`: number (20-100)
- Returns: IInternalStructurePoints object

**TypeScript Signature**:
```typescript
interface IInternalStructurePoints {
  HD: number;
  CT: number;
  LT: number;
  RT: number;
  LA: number;
  RA: number;
  LL: number;
  RL: number;
}

function getInternalStructurePoints(tonnage: number): IInternalStructurePoints {
  // Lookup from official table by tonnage
}
```

**Examples**:
```
Input: tonnage = 75
Output: { HD: 3, CT: 24, LT: 17, RT: 17, LA: 13, RA: 13, LL: 17, RL: 17 }

Input: tonnage = 50
Output: { HD: 3, CT: 16, LT: 11, RT: 11, LA: 9, RA: 9, LL: 11, RL: 11 }

Input: tonnage = 100
Output: { HD: 3, CT: 31, LT: 21, RT: 21, LA: 17, RA: 17, LL: 21, RL: 21 }
```

**Edge Cases**:
- Head always 3 points regardless of tonnage
- Use official table, not formula

**Rounding Rule**: None (table lookup)

**Validation**: tonnage MUST be in official table (20, 25, 30, ..., 100)

**Tech Variants**: None (identical for IS and Clan)

**Dependencies**: None (table-based)

**Used By**: Maximum armor calculations

---

### Armor Formulas

#### Armor Weight Calculation

**Formula**:
```
armorWeight = ceil((totalArmorPoints / pointsPerTon × weightMultiplier) × 2) / 2
```

**Parameters**:
- `totalArmorPoints`: number (sum of all locations)
- `pointsPerTon`: number (armor type specific)
- `weightMultiplier`: number (default 1.0, Hardened 2.0)
- Returns: number (weight in tons, 0.5 ton increments)

**TypeScript Signature**:
```typescript
function calculateArmorWeight(
  totalArmorPoints: number,
  pointsPerTon: number,
  weightMultiplier: number = 1.0
): number {
  return Math.ceil((totalArmorPoints / pointsPerTon * weightMultiplier) * 2) / 2;
}
```

**Examples**:
```
Input: points = 152, ppt = 16 (Standard), multiplier = 1.0
Output: ceil((152 / 16 × 1.0) × 2) / 2 = ceil(19) / 2 = 9.5 tons

Input: points = 168, ppt = 17.92 (Ferro IS), multiplier = 1.0
Output: ceil((168 / 17.92 × 1.0) × 2) / 2 = ceil(18.75) / 2 = 9.5 tons

Input: points = 76, ppt = 8 (Hardened), multiplier = 2.0
Output: ceil((76 / 8 × 2.0) × 2) / 2 = ceil(38) / 2 = 19 tons
```

**Edge Cases**:
- When totalArmorPoints = 0: weight = 0 tons
- Hardened armor uses 2.0 weight multiplier
- Always round up to nearest half-ton

**Rounding Rule**: Half-ton (ceil then divide by 2)

**Validation**: totalArmorPoints MUST be >= 0

**Tech Variants**:
- Standard: 16 pts/ton
- Ferro-Fibrous IS: 17.92 pts/ton
- Ferro-Fibrous Clan: 19.2 pts/ton
- Light Ferro: 16.8 pts/ton
- Heavy Ferro: 19.2 pts/ton
- Hardened: 8 pts/ton, 2.0 weight multiplier

**Dependencies**: Requires armor type specification

**Used By**: Weight budget calculations

---

#### Maximum Armor Per Location

**Formula**:
```
maxArmor = location === 'HD' ? 9 : internalStructure[location] × 2
```

**Parameters**:
- `location`: string ('HD', 'CT', 'LT', 'RT', 'LA', 'RA', 'LL', 'RL')
- `internalStructure`: IInternalStructurePoints
- Returns: number (maximum armor points)

**TypeScript Signature**:
```typescript
function calculateMaxArmorForLocation(
  location: string,
  internalStructure: IInternalStructurePoints
): number {
  if (location === 'HD') {
    return 9; // Special rule for head
  }
  return internalStructure[location] * 2;
}
```

**Examples**:
```
Input: location = 'HD', structure = 3
Output: 9 (special rule, not 3 × 2 = 6)

Input: location = 'CT', structure = 24
Output: 24 × 2 = 48

Input: location = 'LA', structure = 13
Output: 13 × 2 = 26

Input: location = 'RL', structure = 17
Output: 17 × 2 = 34
```

**Edge Cases**:
- Head is ALWAYS 9 points (exception to 2× rule)
- Torso locations: front + rear combined cannot exceed max
- Invalid location should throw error

**Rounding Rule**: None (always whole number)

**Validation**: location MUST be valid location code

**Tech Variants**: None (identical for IS and Clan)

**Dependencies**: Requires internal structure points

**Used By**: Armor allocation validation

---

#### Total Maximum Armor

**Formula**:
```
totalMaxArmor = 9 + (CT + LT + RT + LA + RA + LL + RL) × 2
```

**Parameters**:
- `internalStructure`: IInternalStructurePoints
- Returns: number (total maximum armor points)

**TypeScript Signature**:
```typescript
function calculateTotalMaxArmor(
  internalStructure: IInternalStructurePoints
): number {
  return 9 + // Head special case
    (internalStructure.CT +
     internalStructure.LT +
     internalStructure.RT +
     internalStructure.LA +
     internalStructure.RA +
     internalStructure.LL +
     internalStructure.RL) * 2;
}
```

**Examples**:
```
Input: 75-ton mech
Structure: HD=3, CT=24, LT=17, RT=17, LA=13, RA=13, LL=17, RL=17
Output: 9 + (24+17+17+13+13+17+17) × 2 = 9 + 236 = 245 points

Input: 50-ton mech
Structure: HD=3, CT=16, LT=11, RT=11, LA=9, RA=9, LL=11, RL=11
Output: 9 + (16+11+11+9+9+11+11) × 2 = 9 + 156 = 165 points

Input: 100-ton mech
Structure: HD=3, CT=31, LT=21, RT=21, LA=17, RA=17, LL=21, RL=21
Output: 9 + (31+21+21+17+17+21+21) × 2 = 9 + 298 = 307 points
```

**Edge Cases**:
- Head contributes fixed 9 points (not 2× structure)
- All other locations contribute 2× structure

**Rounding Rule**: None (always whole number)

**Validation**: None (calculated value)

**Tech Variants**: None (identical for IS and Clan)

**Dependencies**: Requires internal structure points

**Used By**: Total armor validation

---

### Critical Slot Formulas

#### Critical Slots Per Location

**Formula**:
```
For all locations:
  HD = 6 slots
  CT = 12 slots
  LT = 12 slots
  RT = 12 slots
  LA = 12 slots (if no hand/lower arm actuator)
  RA = 12 slots (if no hand/lower arm actuator)
  LL = 6 slots
  RL = 6 slots

With actuators:
  LA/RA = 12 - actuatorSlots
```

**Parameters**:
- `location`: string
- `hasHandActuator`: boolean
- `hasLowerArmActuator`: boolean
- Returns: number (total slots available)

**TypeScript Signature**:
```typescript
function getTotalSlotsForLocation(
  location: string,
  hasHandActuator: boolean = false,
  hasLowerArmActuator: boolean = false
): number {
  const baseSlotsPerLocation = {
    HD: 6,
    CT: 12,
    LT: 12,
    RT: 12,
    LA: 12,
    RA: 12,
    LL: 6,
    RL: 6,
  };

  let slots = baseSlotsPerLocation[location];

  // Arm actuators consume slots
  if (location === 'LA' || location === 'RA') {
    // Shoulder and upper arm always present (4 slots)
    slots -= 4;
    if (hasLowerArmActuator) slots -= 1;
    if (hasHandActuator) slots -= 1;
  }

  return slots;
}
```

**Examples**:
```
Input: location = 'CT'
Output: 12 slots

Input: location = 'LA', hasHand = true, hasLower = true
Output: 12 - 4 (shoulder/upper) - 1 (lower) - 1 (hand) = 6 slots

Input: location = 'LA', hasHand = false, hasLower = false
Output: 12 - 4 (shoulder/upper) = 8 slots

Input: location = 'LL'
Output: 6 slots
```

**Edge Cases**:
- Arms always have shoulder and upper arm actuators (4 slots)
- Removing hand and lower arm frees 2 slots
- Head has only 6 slots (limited space)
- Legs have only 6 slots

**Rounding Rule**: None (fixed values)

**Validation**: location MUST be valid

**Tech Variants**: None (identical for IS and Clan)

**Dependencies**: None

**Used By**: Equipment placement validation

---

### Weight Budget Formulas

#### Available Tonnage Calculation

**Formula**:
```
availableTonnage = mechTonnage - (
  engineWeight +
  gyroWeight +
  cockpitWeight +
  structureWeight +
  armorWeight +
  heatSinkWeight +
  jumpJetWeight +
  enhancementWeight
)
```

**Parameters**:
- `mechTonnage`: number (20-100)
- All component weights: number
- Returns: number (remaining tonnage for weapons/equipment)

**TypeScript Signature**:
```typescript
function calculateAvailableTonnage(
  mechTonnage: number,
  components: IComponentWeights
): number {
  return mechTonnage - (
    components.engine +
    components.gyro +
    components.cockpit +
    components.structure +
    components.armor +
    components.heatSinks +
    components.jumpJets +
    components.enhancements
  );
}
```

**Examples**:
```
Input: 75-ton mech with:
  - Engine: 19.0 tons
  - Gyro: 3 tons
  - Cockpit: 3 tons
  - Structure: 7.5 tons
  - Armor: 9.5 tons
  - Heat Sinks: 0 tons (all integral)
  - Jump Jets: 0 tons
  - Enhancements: 0 tons
Output: 75 - (19 + 3 + 3 + 7.5 + 9.5 + 0 + 0 + 0) = 33 tons available

Input: 50-ton mech with:
  - Engine: 14.5 tons
  - Gyro: 3 tons
  - Cockpit: 3 tons
  - Structure: 2.5 tons (Endo-Steel)
  - Armor: 9.5 tons (Ferro-Fibrous)
  - Heat Sinks: 1 ton (10 singles)
  - Jump Jets: 2.5 tons (5 × 0.5t)
  - Enhancements: 0 tons
Output: 50 - (14.5 + 3 + 3 + 2.5 + 9.5 + 1 + 2.5 + 0) = 13.5 tons available
```

**Edge Cases**:
- Available tonnage MUST be >= 0
- Negative tonnage indicates over-weight mech (invalid)
- Must account for all fixed components

**Rounding Rule**: Half-ton (all components round to 0.5)

**Validation**: availableTonnage MUST be >= 0

**Tech Variants**: None (calculation identical for all tech bases)

**Dependencies**: Requires all component weights

**Used By**: Construction validation, equipment budget

---

### Heat Sink Formulas

#### External Heat Sink Weight

**Formula**:
```
For Single Heat Sinks:
  weightPerHS = 1.0 ton

For Double Heat Sinks (IS):
  weightPerHS = 1.0 ton

For Double Heat Sinks (Clan):
  weightPerHS = 1.0 ton

Total weight = numberOfExternalHS × weightPerHS
```

**Parameters**:
- `numberOfExternalHS`: number
- `heatSinkType`: 'Single' | 'Double (IS)' | 'Double (Clan)'
- Returns: number (weight in tons)

**TypeScript Signature**:
```typescript
function calculateExternalHeatSinkWeight(
  numberOfExternalHS: number,
  heatSinkType: string
): number {
  return numberOfExternalHS * 1.0; // All types weigh 1 ton each
}
```

**Examples**:
```
Input: 5 Single Heat Sinks
Output: 5 × 1.0 = 5.0 tons

Input: 10 Double Heat Sinks (IS)
Output: 10 × 1.0 = 10.0 tons

Input: 15 Double Heat Sinks (Clan)
Output: 15 × 1.0 = 15.0 tons
```

**Edge Cases**:
- All heat sink types weigh 1 ton each (no variation)
- Integral heat sinks weigh 0 tons (included in engine)

**Rounding Rule**: None (always whole tons)

**Validation**: numberOfExternalHS MUST be >= 0

**Tech Variants**: Weight identical; dissipation differs
- Single: 1 heat/sink
- Double IS: 2 heat/sink, 3 slots/sink
- Double Clan: 2 heat/sink, 2 slots/sink

**Dependencies**: Requires heat sink type

**Used By**: Weight budget calculations

---

#### External Heat Sink Slots

**Formula**:
```
For Single Heat Sinks:
  slotsPerHS = 1

For Double Heat Sinks (IS):
  slotsPerHS = 3

For Double Heat Sinks (Clan):
  slotsPerHS = 2

Total slots = numberOfExternalHS × slotsPerHS
```

**Parameters**:
- `numberOfExternalHS`: number
- `heatSinkType`: 'Single' | 'Double (IS)' | 'Double (Clan)'
- Returns: number (critical slots)

**TypeScript Signature**:
```typescript
function calculateExternalHeatSinkSlots(
  numberOfExternalHS: number,
  heatSinkType: string
): number {
  const slotsPerType = {
    'Single': 1,
    'Double (IS)': 3,
    'Double (Clan)': 2,
  };
  return numberOfExternalHS * slotsPerType[heatSinkType];
}
```

**Examples**:
```
Input: 5 Single Heat Sinks
Output: 5 × 1 = 5 slots

Input: 10 Double Heat Sinks (IS)
Output: 10 × 3 = 30 slots

Input: 10 Double Heat Sinks (Clan)
Output: 10 × 2 = 20 slots
```

**Edge Cases**:
- Clan doubles more efficient (2 slots vs 3 for IS)
- Integral heat sinks consume 0 slots

**Rounding Rule**: None (always whole slots)

**Validation**: numberOfExternalHS MUST be >= 0

**Tech Variants**:
- Single: 1 slot each
- Double IS: 3 slots each
- Double Clan: 2 slots each

**Dependencies**: Requires heat sink type

**Used By**: Critical slot allocation

---

#### Minimum Heat Sinks Required

**Formula**:
```
minimumHeatSinks = 10
totalHeatSinks = integralHeatSinks + externalHeatSinks
requiredExternal = max(0, minimumHeatSinks - integralHeatSinks)
```

**Parameters**:
- `integralHeatSinks`: number (from engine)
- `externalHeatSinks`: number (user-added)
- Returns: number (minimum external required)

**TypeScript Signature**:
```typescript
function calculateRequiredExternalHeatSinks(
  integralHeatSinks: number
): number {
  return Math.max(0, 10 - integralHeatSinks);
}
```

**Examples**:
```
Input: integralHeatSinks = 10 (rating 250+)
Output: max(0, 10 - 10) = 0 (no external required)

Input: integralHeatSinks = 4 (rating 100)
Output: max(0, 10 - 4) = 6 (need 6 external)

Input: integralHeatSinks = 7 (rating 175)
Output: max(0, 10 - 7) = 3 (need 3 external)
```

**Edge Cases**:
- Engine rating 250+: No external heat sinks required
- Engine rating < 250: External heat sinks needed to reach 10
- Mechs can have more than 10 total heat sinks

**Rounding Rule**: None (always whole number)

**Validation**: Total heat sinks MUST be >= 10

**Tech Variants**: None (minimum 10 applies to both IS and Clan)

**Dependencies**: Requires integral heat sink count from engine

**Used By**: Heat sink validation, construction rules

---

### Jump Jet Formulas

#### Jump Jet Weight by Tonnage Class

**Formula**:
```
if mechTonnage <= 55:
  weightPerJet = 0.5 tons
else if mechTonnage <= 85:
  weightPerJet = 1.0 ton
else:
  weightPerJet = 2.0 tons

totalWeight = weightPerJet × numberOfJets
```

**Parameters**:
- `mechTonnage`: number (20-100)
- `numberOfJets`: number
- Returns: number (weight in tons)

**TypeScript Signature**:
```typescript
function calculateJumpJetWeight(
  mechTonnage: number,
  numberOfJets: number
): number {
  let weightPerJet: number;

  if (mechTonnage <= 55) {
    weightPerJet = 0.5;
  } else if (mechTonnage <= 85) {
    weightPerJet = 1.0;
  } else {
    weightPerJet = 2.0;
  }

  return weightPerJet * numberOfJets;
}
```

**Examples**:
```
Input: tonnage = 20, jets = 6
Output: 0.5 × 6 = 3.0 tons (light bracket)

Input: tonnage = 55, jets = 5
Output: 0.5 × 5 = 2.5 tons (light bracket)

Input: tonnage = 56, jets = 5
Output: 1.0 × 5 = 5.0 tons (medium bracket)

Input: tonnage = 75, jets = 4
Output: 1.0 × 4 = 4.0 tons (medium bracket)

Input: tonnage = 85, jets = 3
Output: 1.0 × 3 = 3.0 tons (medium bracket)

Input: tonnage = 86, jets = 3
Output: 2.0 × 3 = 6.0 tons (assault bracket)

Input: tonnage = 100, jets = 3
Output: 2.0 × 3 = 6.0 tons (assault bracket)
```

**Edge Cases**:
- Tonnage exactly 55: Use 0.5t (light bracket)
- Tonnage exactly 56: Use 1.0t (medium bracket)
- Tonnage exactly 85: Use 1.0t (medium bracket)
- Tonnage exactly 86: Use 2.0t (assault bracket)

**Rounding Rule**: Weight per jet is fixed; total may be fractional

**Validation**:
- mechTonnage MUST be 20-100
- numberOfJets MUST be >= 0

**Tech Variants**: None (weight identical for IS and Clan)

**Dependencies**: None

**Used By**: Weight budget calculations, partial wing discount

---

#### Partial Wing Weight Discount

**Formula**:
```
if mechTonnage <= 55:
  partialWingWeight = 2.0 tons
else if mechTonnage <= 85:
  partialWingWeight = 3.0 tons
else:
  partialWingWeight = 5.0 tons

otherJetWeight = numberOfJets × weightPerJet
discountedJetWeight = otherJetWeight × 0.5
totalWeight = partialWingWeight + discountedJetWeight
roundedWeight = ceil(totalWeight × 2) / 2
```

**Parameters**:
- `mechTonnage`: number
- `numberOfJets`: number
- Returns: number (weight in tons, 0.5 ton increments)

**TypeScript Signature**:
```typescript
function calculatePartialWingTotalWeight(
  mechTonnage: number,
  numberOfJets: number
): number {
  let partialWingWeight: number;
  let weightPerJet: number;

  if (mechTonnage <= 55) {
    partialWingWeight = 2.0;
    weightPerJet = 0.5;
  } else if (mechTonnage <= 85) {
    partialWingWeight = 3.0;
    weightPerJet = 1.0;
  } else {
    partialWingWeight = 5.0;
    weightPerJet = 2.0;
  }

  const otherJetWeight = numberOfJets * weightPerJet;
  const discountedJetWeight = otherJetWeight * 0.5;
  const totalWeight = partialWingWeight + discountedJetWeight;

  return Math.ceil(totalWeight * 2) / 2;
}
```

**Examples**:
```
Input: tonnage = 55, jets = 5
Calculation:
  partialWingWeight = 2.0
  otherJetWeight = 5 × 0.5 = 2.5
  discountedJetWeight = 2.5 × 0.5 = 1.25
  totalWeight = 2.0 + 1.25 = 3.25
  rounded = ceil(3.25 × 2) / 2 = 3.5 tons
Output: 3.5 tons

Input: tonnage = 75, jets = 4
Calculation:
  partialWingWeight = 3.0
  otherJetWeight = 4 × 1.0 = 4.0
  discountedJetWeight = 4.0 × 0.5 = 2.0
  totalWeight = 3.0 + 2.0 = 5.0
  rounded = 5.0 tons
Output: 5.0 tons

Input: tonnage = 100, jets = 3
Calculation:
  partialWingWeight = 5.0
  otherJetWeight = 3 × 2.0 = 6.0
  discountedJetWeight = 6.0 × 0.5 = 3.0
  totalWeight = 5.0 + 3.0 = 8.0
  rounded = 8.0 tons
Output: 8.0 tons
```

**Edge Cases**:
- Partial wing without other jets: invalid configuration
- 50% discount applies only to other jump jets, not partial wing itself
- Mechanical jump booster not affected by partial wing

**Rounding Rule**: Half-ton (ceil then divide by 2)

**Validation**:
- Partial wing requires numberOfJets > 0
- Cannot combine with mechanical jump booster

**Tech Variants**: Inner Sphere only (Clan does not have partial wings)

**Dependencies**: Requires jump jet count and tonnage

**Used By**: Weight budget calculations for partial wing mechs

---

## Rounding Rules Summary

### Floor Rounding (Round Down)
**Used For**: Movement points, integral heat sinks
**Formula**: `Math.floor(value)`
**Examples**:
- 7.5 → 7
- 4.9 → 4
- 6.0 → 6

### Ceiling Rounding (Round Up)
**Used For**: Gyro weight, TSM run MP, structure weight (before half-ton)
**Formula**: `Math.ceil(value)`
**Examples**:
- 2.1 → 3
- 4.5 → 5
- 7.0 → 7

### Half-Ton Rounding (0.5 ton increments)
**Used For**: Engine weight, armor weight, structure weight, component weights
**Formula**: `Math.ceil(value × 2) / 2`
**Examples**:
- 9.1 → 9.5
- 9.5 → 9.5
- 9.6 → 10.0
- 14.25 → 14.5

### No Rounding (Exact Values)
**Used For**: Slot counts, armor points, structure points, heat sink counts
**Examples**:
- Critical slots: exactly 1, 2, 3, etc.
- Armor points: exactly 152, 168, etc.
- Heat sinks: exactly 10, 15, etc.

---

## Formula Dependencies Graph

```
Engine Rating
  ├─> Walk MP = floor(rating / tonnage)
  │     ├─> Run MP = floor(walkMP × 1.5)
  │     │     └─> Extended Jump Jet Limit
  │     ├─> TSM Run MP = ceiling(tsmWalkMP × 1.5)
  │     ├─> Supercharger Run MP = floor(walkMP × 2.0)
  │     ├─> Sprint MP (MASC) = floor(walkMP × 2.0)
  │     └─> Standard Jump Jet Limit
  ├─> Integral Heat Sinks = min(10, floor(rating / 25))
  │     └─> Required External Heat Sinks = max(0, 10 - integral)
  ├─> Engine Weight (from table or formula)
  │     ├─> XL Weight = standardWeight × 0.5
  │     ├─> XXL Weight = standardWeight × 0.333
  │     ├─> Light Weight = standardWeight × 0.75
  │     └─> Compact Weight = standardWeight × 1.5
  ├─> Gyro Weight = ceil(rating / 100)
  │     ├─> XL Gyro = ceil(standardGyro / 2)
  │     ├─> Compact Gyro = ceil(standardGyro × 1.5)
  │     └─> Heavy-Duty Gyro = standardGyro × 2
  └─> Center Torso Slots (from rating brackets)

Mech Tonnage
  ├─> Structure Weight = ceil((tonnage / 10) × 2) / 2
  │     ├─> Endo-Steel Weight = structureWeight × 0.5
  │     └─> Composite Weight = structureWeight × 1.5
  ├─> Structure Points (from table)
  │     └─> Maximum Armor = 9 (head) or structure × 2
  │           └─> Total Max Armor = sum of all location maxes
  ├─> Jump Jet Weight Per Jet
  │     ├─> ≤55t: 0.5 tons
  │     ├─> 56-85t: 1.0 ton
  │     └─> ≥86t: 2.0 tons
  └─> Available Tonnage = tonnage - all component weights

Armor Points
  └─> Armor Weight = ceil((points / ppt × multiplier) × 2) / 2

Component Weights
  └─> Available Tonnage = mechTonnage - sum(all weights)
```

---

## Edge Case Reference

### Boundary Conditions

#### Tonnage Boundaries
- **20 tons**: Minimum standard BattleMech tonnage
- **55 tons**: Jump jet weight boundary (0.5t → 1.0t at 56t)
- **85 tons**: Jump jet weight boundary (1.0t → 2.0t at 86t)
- **100 tons**: Maximum standard BattleMech tonnage

#### Engine Rating Boundaries
- **10**: Minimum valid engine rating
- **25**: Minimum for 1 integral heat sink
- **100**: Center torso slot boundary (3 → 4 slots at 105)
- **150**: Center torso slot boundary (4 → 5 slots at 155)
- **225**: Center torso slot boundary (5 → 6 slots at 230)
- **250**: Minimum for 10 integral heat sinks
- **325**: Center torso slot boundary (6 → 7 slots at 330)
- **400**: Center torso slot boundary (7 → 8 slots at 405)
- **500**: Maximum valid engine rating

#### Special Cases
- **Head Armor**: Always 9 max (not 2× structure = 6)
- **Walk MP = 0**: Invalid (engine too weak)
- **TSM Rounding**: Uses ceiling for run MP (unique)
- **Hardened Armor**: 2.0 weight multiplier (unique)
- **Mechanical Jump Booster**: Fixed 1 jump MP (unique)

---

## Validation Rules

### Critical Errors (Construction Invalid)
- Walk MP < 1 (engine too weak for tonnage)
- Armor exceeds location maximum
- Total weight exceeds mech tonnage
- Total heat sinks < 10
- Jump MP exceeds limit for jump jet type
- MASC and TSM both installed (mutually exclusive)
- Partial wing without other jump jets
- Engine rating not multiple of 5
- Engine rating < 10 or > 500

### Warnings (Suboptimal but Valid)
- Walk MP > 8 (extremely fast, unusual)
- Walk MP <= 2 (very slow)
- Head armor < 9 (vulnerable)
- Rear armor < 20% of location total
- Available tonnage < 0.5 tons (very tight build)

---

## Implementation Notes

### Performance Considerations
- Cache engine weight table lookups (frequently accessed)
- Pre-calculate structure points by tonnage (static table)
- Memoize movement calculations (reused frequently)
- Use lookup tables for CT slot counts (faster than conditionals)

### Common Pitfalls
- **Pitfall**: Using floor for TSM run calculation
  - **Solution**: TSM uses ceiling (round up), not floor

- **Pitfall**: Forgetting head armor is capped at 9
  - **Solution**: Always check for 'HD' location before applying 2× rule

- **Pitfall**: Wrong weight bracket for 55/56 or 85/86 ton mechs
  - **Solution**: Use <= for lower bound in conditionals

- **Pitfall**: Not applying weight multiplier for Hardened armor
  - **Solution**: Apply multiplier AFTER dividing by points-per-ton

- **Pitfall**: Using formula for engine weight instead of table
  - **Solution**: Use official engine rating table for precision

- **Pitfall**: Forgetting to round armor weight to half-ton
  - **Solution**: Always apply ceil(× 2) / 2 formula

- **Pitfall**: Allowing fractional movement points
  - **Solution**: Always floor() movement calculations (except TSM)

---

## References

### Official BattleTech Rules
- **TechManual**: Pages 78-81 - Engine Systems
- **TechManual**: Pages 102-104 - Armor and Structure
- **TechManual**: Pages 118-119 - Jump Jet Weights
- **TechManual**: Page 136-137 - Engine Rating Table
- **Total Warfare**: Pages 48-52 - Movement Rules
- **Total Warfare**: Page 38 - Armor Distribution
- **Total Warfare**: Page 54 - Critical Slot Allocation

### Related Documentation
- Engine System Specification
- Movement System Specification
- Armor System Specification
- Internal Structure System Specification
- Gyro System Specification
- Heat Sink System Specification
- Critical Slot Allocation Specification

---

## Changelog

### Version 1.0 (2025-11-28)
- Initial specification
- Documented all movement formulas (Walk, Run, Jump, TSM, MASC, Supercharger)
- Documented all engine formulas (weight by type, integral heat sinks, slots)
- Documented all gyro formulas (Standard, XL, Compact, Heavy-Duty)
- Documented all structure formulas (weight by type, points by tonnage)
- Documented all armor formulas (weight, points per ton, max armor)
- Documented all critical slot formulas (slots by location)
- Documented all weight budget formulas (available tonnage)
- Documented all heat sink formulas (weight and slots)
- Documented all jump jet formulas (weight by tonnage, partial wing discount)
- Specified rounding rules for each formula type
- Documented edge cases and boundary conditions
- Provided TypeScript function signatures for all formulas
- Created formula dependency graph
- Consolidated validation rules
- Added comprehensive examples with step-by-step calculations
