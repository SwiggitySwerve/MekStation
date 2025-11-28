# Armor System Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2025-11-27
**Dependencies**: Core Entity Types, Physical Properties System, Internal Structure System, Critical Slot Allocation
**Affects**: Weight Calculation, Construction Rules, Battle Value, Unit Survivability

---

## Overview

### Purpose
Defines the armor subsystem for BattleMech units, including armor types, point allocation, weight formulas, maximum armor rules, rear armor mechanics, and critical slot requirements. Armor protects the BattleMech from combat damage and is the primary user-allocated defensive component.

### Scope
**In Scope:**
- Armor type definitions (Standard, Ferro-Fibrous variants, Stealth, Reactive, Hardened, etc.)
- Points-per-ton ratios for each armor type
- Weight calculation formulas (armor points / points-per-ton)
- Maximum armor rules (2× internal structure per location, head special case)
- Rear armor rules (torso locations only)
- Critical slot requirements per armor type
- Armor distribution and allocation mechanics
- Tech base variants (Inner Sphere vs Clan differences)
- Special armor requirements (Stealth requires ECM, etc.)
- Armor validation rules

**Out of Scope:**
- Internal structure points calculation (covered in Internal Structure System spec)
- Combat damage mechanics (covered in Combat System spec)
- Armor cost and Battle Value formulas (covered in Economics System spec)
- Patchwork armor mixing (advanced feature, future spec)
- Vehicle and aerospace armor systems (future specs)
- Armor repair and maintenance (future specs)

### Key Concepts
- **Armor Points**: Discrete units of protection allocated to mech locations
- **Points Per Ton**: Efficiency ratio determining armor weight (varies by armor type)
- **Maximum Armor**: Each location can hold at most 2× its internal structure points (except head)
- **Head Armor Cap**: Head location limited to 9 points regardless of internal structure
- **Rear Armor**: Torso locations (CT, LT, RT) can allocate armor to rear facing
- **User Allocation**: Unlike structure, armor tonnage is chosen by the user within max limits
- **Weight Multiplier**: Some armor types have different weight characteristics (Hardened is 2× weight)
- **Critical Slots**: Advanced armor types require critical slot allocation

---

## Requirements

### Requirement: Armor Type Classification
The system SHALL support all standard BattleTech armor types with distinct properties.

**Rationale**: Different armor technologies offer trade-offs between weight efficiency, protection, cost, and availability.

**Priority**: Critical

#### Scenario: Standard Armor
**GIVEN** a mech requires basic armor protection
**WHEN** selecting Standard armor type
**THEN** armor SHALL provide 16 points per ton
**AND** armor SHALL require 0 critical slots
**AND** armor SHALL be available to both Inner Sphere and Clan
**AND** armor SHALL use 1.0 weight multiplier
**AND** armor SHALL support rear armor allocation

#### Scenario: Ferro-Fibrous Armor (Inner Sphere)
**GIVEN** a mech requires improved armor efficiency
**WHEN** selecting Ferro-Fibrous (IS) armor type
**THEN** armor SHALL provide 17.92 points per ton
**AND** armor SHALL require 14 critical slots
**AND** armor SHALL be Inner Sphere tech only
**AND** armor SHALL use 1.0 weight multiplier
**AND** armor SHALL support rear armor allocation

#### Scenario: Ferro-Fibrous Armor (Clan)
**GIVEN** a Clan mech requires improved armor efficiency
**WHEN** selecting Ferro-Fibrous (Clan) armor type
**THEN** armor SHALL provide 19.2 points per ton
**AND** armor SHALL require 7 critical slots
**AND** armor SHALL be Clan tech only
**AND** armor SHALL use 1.0 weight multiplier
**AND** armor SHALL support rear armor allocation

#### Scenario: Light Ferro-Fibrous Armor
**GIVEN** a mech requires moderate efficiency improvement with fewer slots
**WHEN** selecting Light Ferro-Fibrous armor type
**THEN** armor SHALL provide 16.8 points per ton
**AND** armor SHALL require 7 critical slots
**AND** armor SHALL be Inner Sphere tech only
**AND** armor SHALL use 1.0 weight multiplier
**AND** armor SHALL support rear armor allocation

#### Scenario: Heavy Ferro-Fibrous Armor
**GIVEN** a mech requires maximum armor efficiency
**WHEN** selecting Heavy Ferro-Fibrous armor type
**THEN** armor SHALL provide 19.2 points per ton
**AND** armor SHALL require 21 critical slots
**AND** armor SHALL be Inner Sphere tech only
**AND** armor SHALL use 1.0 weight multiplier
**AND** armor SHALL support rear armor allocation

#### Scenario: Stealth Armor
**GIVEN** a mech requires stealth capabilities
**WHEN** selecting Stealth armor type
**THEN** armor SHALL provide 16 points per ton (same as standard)
**AND** armor SHALL require 12 critical slots
**AND** armor SHALL require Guardian ECM equipment
**AND** armor SHALL require Double Heat Sinks
**AND** armor SHALL be Inner Sphere tech only
**AND** armor SHALL use 1.0 weight multiplier
**AND** armor SHALL support rear armor allocation

#### Scenario: Reactive Armor
**GIVEN** a mech requires ballistic and missile protection
**WHEN** selecting Reactive armor type
**THEN** armor SHALL provide 14 points per ton
**AND** armor SHALL require 14 critical slots
**AND** armor SHALL be available to both Inner Sphere and Clan
**AND** armor SHALL use 1.0 weight multiplier
**AND** armor SHALL provide half damage from Ballistic and Missile weapons
**AND** armor SHALL support rear armor allocation

#### Scenario: Reflective Armor
**GIVEN** a mech requires energy weapon protection
**WHEN** selecting Reflective armor type
**THEN** armor SHALL provide 16 points per ton
**AND** armor SHALL require 10 critical slots
**AND** armor SHALL be available to both Inner Sphere and Clan
**AND** armor SHALL use 1.0 weight multiplier
**AND** armor SHALL provide half damage from Energy weapons
**AND** armor SHALL take double damage from Ballistic weapons
**AND** armor SHALL support rear armor allocation

#### Scenario: Hardened Armor
**GIVEN** a mech requires maximum protection
**WHEN** selecting Hardened armor type
**THEN** armor SHALL provide 8 points per ton (half of standard)
**AND** armor SHALL require 0 critical slots
**AND** armor SHALL use 2.0 weight multiplier (double weight)
**AND** armor SHALL be available to both Inner Sphere and Clan
**AND** armor SHALL reduce damage by 1 point per hit
**AND** armor SHALL prevent critical hits through armor
**AND** armor SHALL support rear armor allocation

### Requirement: Points Per Ton Ratios
Each armor type SHALL have a defined points-per-ton ratio determining weight efficiency.

**Rationale**: Points per ton is the fundamental efficiency metric for armor types and determines armor weight calculation.

**Priority**: Critical

#### Scenario: Calculate armor weight
**GIVEN** a mech has 152 armor points with Standard armor
**WHEN** calculating armor weight
**THEN** weight SHALL equal 152 / 16 = 9.5 tons
**AND** weight SHALL round to nearest half-ton (9.5 tons)

#### Scenario: Calculate armor weight with Ferro-Fibrous
**GIVEN** a mech has 152 armor points with Ferro-Fibrous (IS) armor
**WHEN** calculating armor weight
**THEN** weight SHALL equal 152 / 17.92 = 8.482 tons
**AND** weight SHALL round to nearest half-ton (8.5 tons)

#### Scenario: Calculate armor weight with Hardened armor
**GIVEN** a mech has 76 armor points with Hardened armor
**WHEN** calculating armor weight
**THEN** base weight SHALL equal 76 / 8 = 9.5 tons
**AND** actual weight SHALL equal 9.5 × 2.0 = 19 tons (weight multiplier applied)
**AND** weight SHALL round to nearest half-ton (19 tons)

### Requirement: Maximum Armor Per Location
Each location SHALL have a maximum armor limit based on internal structure points.

**Rationale**: BattleTech rules limit armor to 2× internal structure per location, with head exception.

**Priority**: Critical

#### Scenario: Calculate max armor for standard location
**GIVEN** a 75-ton mech with Center Torso internal structure of 24 points
**WHEN** calculating maximum armor for Center Torso
**THEN** maximum front+rear armor SHALL equal 24 × 2 = 48 points
**AND** armor allocation SHALL not exceed 48 total points

#### Scenario: Calculate max armor for head location
**GIVEN** any mech with Head internal structure of 3 points
**WHEN** calculating maximum armor for Head
**THEN** maximum armor SHALL equal 9 points (special rule)
**AND** armor allocation SHALL not exceed 9 points
**AND** 2× structure rule SHALL NOT apply to head

#### Scenario: Validate location armor within limit
**GIVEN** a Left Arm with 13 internal structure points (75-ton mech)
**WHEN** user allocates 26 armor points to Left Arm
**THEN** allocation SHALL succeed (26 ≤ 13 × 2)
**AND** validation SHALL pass

#### Scenario: Reject armor exceeding location limit
**GIVEN** a Right Leg with 17 internal structure points (75-ton mech)
**WHEN** user attempts to allocate 35 armor points to Right Leg
**THEN** allocation SHALL fail (35 > 17 × 2)
**AND** error SHALL indicate "Exceeds maximum armor for location (max: 34)"

### Requirement: Rear Armor Allocation
Torso locations SHALL support rear-facing armor allocation.

**Rationale**: BattleTech allows rear armor only on torso locations to protect from rear attacks.

**Priority**: Critical

#### Scenario: Allocate rear armor to Center Torso
**GIVEN** a mech with Center Torso max armor of 48 points
**WHEN** user allocates 36 front and 12 rear armor to CT
**THEN** allocation SHALL succeed
**AND** total armor (36 + 12 = 48) SHALL not exceed location maximum
**AND** both front and rear SHALL be tracked separately

#### Scenario: Allocate rear armor to Left Torso
**GIVEN** a 75-ton mech with Left Torso max armor of 34 points
**WHEN** user allocates 25 front and 9 rear armor to LT
**THEN** allocation SHALL succeed
**AND** total armor (25 + 9 = 34) SHALL not exceed location maximum

#### Scenario: Reject rear armor on non-torso location
**GIVEN** a mech with Left Arm
**WHEN** user attempts to allocate rear armor to Left Arm
**THEN** allocation SHALL fail
**AND** error SHALL indicate "Rear armor only allowed on torso locations"

#### Scenario: Validate rear armor counts toward location total
**GIVEN** a Right Torso with max armor of 34 points
**WHEN** user allocates 30 front and 10 rear armor to RT
**THEN** allocation SHALL fail
**AND** error SHALL indicate "Total armor (40) exceeds maximum (34)"
**AND** front + rear combined SHALL be validated

### Requirement: Total Maximum Armor
Total mech armor SHALL not exceed the sum of all location maximums.

**Rationale**: Overall armor limit is determined by structural capacity and tonnage constraints.

**Priority**: Critical

#### Scenario: Calculate total maximum armor
**GIVEN** a 75-ton mech with internal structure:
  - Head: 3 points → max 9 armor
  - CT: 24 points → max 48 armor
  - LT: 17 points → max 34 armor
  - RT: 17 points → max 34 armor
  - LA: 13 points → max 26 armor
  - RA: 13 points → max 26 armor
  - LL: 17 points → max 34 armor
  - RL: 17 points → max 34 armor
**WHEN** calculating total maximum armor
**THEN** total SHALL equal 9 + 48 + 34 + 34 + 26 + 26 + 34 + 34 = 245 points

#### Scenario: Validate armor within structural limits
**GIVEN** a 75-ton mech with 230 total armor points allocated
**WHEN** validating total armor
**THEN** validation SHALL pass (230 ≤ 245 max)
**AND** each individual location SHALL also be within its max

#### Scenario: Reject excessive total armor
**GIVEN** a 75-ton mech
**WHEN** user attempts to allocate 250 total armor points
**THEN** validation SHALL fail (250 > 245 max)
**AND** error SHALL indicate "Total armor exceeds structural maximum"

### Requirement: Weight Calculation Formula
Armor weight SHALL be calculated as total armor points divided by points-per-ton, rounded to nearest half-ton.

**Rationale**: Weight determines how much tonnage is consumed by armor allocation.

**Priority**: Critical

#### Scenario: Calculate Standard armor weight
**GIVEN** total armor points = 152
**WHEN** armor type is Standard (16 points/ton)
**THEN** weight = 152 / 16 = 9.5 tons
**AND** rounded weight = 9.5 tons (already half-ton)

#### Scenario: Calculate Ferro-Fibrous weight with rounding
**GIVEN** total armor points = 168
**WHEN** armor type is Ferro-Fibrous IS (17.92 points/ton)
**THEN** weight = 168 / 17.92 = 9.375 tons
**AND** rounded weight = 9.5 tons (round up to nearest half-ton)

#### Scenario: Calculate weight with weight multiplier
**GIVEN** total armor points = 76
**WHEN** armor type is Hardened (8 points/ton, 2.0 weight multiplier)
**THEN** base weight = 76 / 8 = 9.5 tons
**AND** actual weight = 9.5 × 2.0 = 19 tons
**AND** rounded weight = 19 tons

### Requirement: Critical Slot Allocation
Advanced armor types SHALL require critical slot allocation spread across multiple locations.

**Rationale**: Ferro-Fibrous and special armors require internal structure integration consuming critical slots.

**Priority**: High

#### Scenario: Allocate Ferro-Fibrous IS slots
**GIVEN** a mech selects Ferro-Fibrous (IS) armor
**WHEN** allocating critical slots
**THEN** 14 critical slots SHALL be allocated
**AND** slots SHALL be spread across multiple locations
**AND** slots SHALL be marked as armor (non-removable)
**AND** slots SHALL reduce available equipment space

#### Scenario: Allocate Ferro-Fibrous Clan slots
**GIVEN** a Clan mech selects Ferro-Fibrous (Clan) armor
**WHEN** allocating critical slots
**THEN** 7 critical slots SHALL be allocated
**AND** slots SHALL be spread across multiple locations
**AND** efficiency gain (19.2 vs 17.92 pts/ton) SHALL justify fewer slots

#### Scenario: Standard armor requires no slots
**GIVEN** a mech selects Standard armor
**WHEN** allocating critical slots
**THEN** 0 critical slots SHALL be allocated
**AND** all location slots SHALL remain available for equipment

#### Scenario: Heavy Ferro-Fibrous requires 21 slots
**GIVEN** a mech selects Heavy Ferro-Fibrous armor
**WHEN** allocating critical slots
**THEN** 21 critical slots SHALL be allocated
**AND** slots SHALL be spread across multiple locations
**AND** user SHALL be warned of significant slot consumption

### Requirement: Special Armor Requirements
Certain armor types SHALL enforce special equipment or configuration requirements.

**Rationale**: Some armor types have specific technological dependencies per BattleTech rules.

**Priority**: High

#### Scenario: Stealth armor requires ECM
**GIVEN** a mech selects Stealth armor
**WHEN** validating configuration
**THEN** mech MUST have Guardian ECM equipment installed
**AND** validation SHALL fail if ECM is missing
**AND** error SHALL indicate "Stealth armor requires Guardian ECM"

#### Scenario: Stealth armor requires Double Heat Sinks
**GIVEN** a mech selects Stealth armor
**WHEN** validating heat sink system
**THEN** mech MUST use Double Heat Sinks (IS or Clan)
**AND** validation SHALL fail if using Single Heat Sinks
**AND** error SHALL indicate "Stealth armor requires Double Heat Sinks"

#### Scenario: Reactive armor special rules
**GIVEN** a mech selects Reactive armor
**WHEN** armor type is configured
**THEN** armor SHALL have "Half damage from Ballistic and Missile weapons" special rule
**AND** special rules SHALL be displayed in UI
**AND** combat system SHALL apply damage reduction

#### Scenario: Hardened armor special rules
**GIVEN** a mech selects Hardened armor
**WHEN** armor type is configured
**THEN** armor SHALL have "Reduces damage by 1 point per hit" special rule
**AND** armor SHALL have "No critical hits through armor" special rule
**AND** combat system SHALL apply both effects

### Requirement: Armor Distribution Validation
Armor allocation SHALL be validated for completeness and balance.

**Rationale**: Ensures mech has reasonable protection and warns about vulnerabilities.

**Priority**: Medium

#### Scenario: Warn about unarmored locations
**GIVEN** a mech under construction
**WHEN** a location has 0 armor points allocated
**THEN** validation SHALL emit warning
**AND** warning SHALL indicate "Location has no armor protection"
**AND** construction MAY continue (warning, not error)

#### Scenario: Warn about minimal rear armor
**GIVEN** a mech with torso locations
**WHEN** rear armor is less than 10% of total location armor
**THEN** validation SHALL emit warning
**AND** warning SHALL indicate "Minimal rear armor - vulnerable to rear attacks"

#### Scenario: Warn about head armor below maximum
**GIVEN** a mech with head armor less than 9 points
**WHEN** validating armor allocation
**THEN** validation SHALL emit warning
**AND** warning SHALL indicate "Head armor below maximum (9 points recommended)"
**AND** recommendation SHALL suggest increasing head armor

---

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * Armor type definition with all properties
 */
interface IArmorType extends ITechBaseEntity, ISlottedComponent {
  /**
   * Unique identifier for armor type
   * @example "ferro_fibrous_is"
   */
  readonly id: string;

  /**
   * Display name
   * @example "Ferro-Fibrous (Inner Sphere)"
   */
  readonly name: string;

  /**
   * Armor points provided per ton of weight
   * @example 17.92
   */
  readonly pointsPerTon: number;

  /**
   * Critical slots required for this armor type
   * @example 14
   */
  readonly criticalSlots: number;

  /**
   * Technology base classification
   */
  readonly techBase: TechBase;

  /**
   * Rules level requirement
   */
  readonly rulesLevel: RulesLevel;

  /**
   * Cost multiplier for this armor type
   * @example 2.0
   */
  readonly costMultiplier: number;

  /**
   * Weight multiplier (default 1.0, Hardened is 2.0)
   * @example 1.0
   */
  readonly weightMultiplier?: number;

  /**
   * Whether this armor type supports rear armor
   * @example true
   */
  readonly hasRearArmor: boolean;

  /**
   * Special rules or requirements for this armor
   * @example ["Requires ECM", "Requires Double Heat Sinks"]
   */
  readonly specialRules?: string[];
}

/**
 * Armor allocation for a single location
 */
interface ILocationArmor {
  /**
   * Front-facing armor points
   * @minimum 0
   */
  readonly front: number;

  /**
   * Rear-facing armor points (torso locations only)
   * @minimum 0
   */
  readonly rear?: number;
}

/**
 * Complete armor allocation map for all mech locations
 */
interface IArmorAllocation {
  /**
   * Head armor (max 9 points, no rear)
   */
  readonly HD: ILocationArmor;

  /**
   * Center Torso armor (supports rear)
   */
  readonly CT: ILocationArmor;

  /**
   * Left Torso armor (supports rear)
   */
  readonly LT: ILocationArmor;

  /**
   * Right Torso armor (supports rear)
   */
  readonly RT: ILocationArmor;

  /**
   * Left Arm armor (no rear)
   */
  readonly LA: ILocationArmor;

  /**
   * Right Arm armor (no rear)
   */
  readonly RA: ILocationArmor;

  /**
   * Left Leg armor (no rear)
   */
  readonly LL: ILocationArmor;

  /**
   * Right Leg armor (no rear)
   */
  readonly RL: ILocationArmor;
}

/**
 * Armor configuration for entire mech
 */
interface IArmorConfiguration {
  /**
   * Selected armor type
   */
  readonly armorType: IArmorType;

  /**
   * Armor point allocation by location
   */
  readonly allocation: IArmorAllocation;

  /**
   * Total armor points allocated
   * @minimum 0
   */
  readonly totalPoints: number;

  /**
   * Total armor weight in tons
   * @minimum 0
   */
  readonly totalWeight: number;

  /**
   * Critical slots consumed by armor
   * @minimum 0
   */
  readonly slotsUsed: number;
}

/**
 * Maximum armor limits for a mech
 */
interface IArmorLimits {
  /**
   * Maximum armor per location
   */
  readonly byLocation: {
    readonly HD: number;  // Always 9
    readonly CT: number;  // 2× structure
    readonly LT: number;  // 2× structure
    readonly RT: number;  // 2× structure
    readonly LA: number;  // 2× structure
    readonly RA: number;  // 2× structure
    readonly LL: number;  // 2× structure
    readonly RL: number;  // 2× structure
  };

  /**
   * Total maximum armor for entire mech
   */
  readonly totalMaximum: number;

  /**
   * Mech tonnage used for calculation
   */
  readonly tonnage: number;
}

/**
 * Armor validation result
 */
interface IArmorValidationResult {
  /**
   * Whether armor configuration is valid
   */
  readonly isValid: boolean;

  /**
   * Critical errors preventing construction
   */
  readonly errors: string[];

  /**
   * Warnings about suboptimal configuration
   */
  readonly warnings: string[];

  /**
   * Informational messages
   */
  readonly info?: string[];

  /**
   * Armor coverage percentage by location
   */
  readonly coverage?: {
    readonly [location: string]: number;
  };
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `pointsPerTon` | `number` | Yes | Armor points per ton | 8-19.2 depending on type | - |
| `criticalSlots` | `number` | Yes | Critical slots required | 0-21 depending on type | - |
| `weightMultiplier` | `number` | No | Weight multiplier | 1.0 or 2.0 | 1.0 |
| `hasRearArmor` | `boolean` | Yes | Supports rear armor | true/false | true |
| `front` | `number` | Yes | Front armor points | >= 0 | 0 |
| `rear` | `number` | No | Rear armor points | >= 0 | undefined |
| `totalPoints` | `number` | Yes | Total armor allocated | >= 0 | 0 |
| `totalWeight` | `number` | Yes | Total armor weight | >= 0 | 0 |

### Type Constraints

- `pointsPerTon` MUST be > 0 and <= 20
- `criticalSlots` MUST be >= 0 and <= 30
- `weightMultiplier` MUST be > 0 (typically 1.0 or 2.0)
- `front` MUST be >= 0
- `rear` MUST be >= 0 if present
- When `rear` is present, location MUST be CT, LT, or RT
- `front + rear` MUST NOT exceed location maximum
- Head location armor MUST NOT exceed 9 points
- Other locations MUST NOT exceed 2× internal structure points
- `totalWeight` MUST equal `totalPoints / pointsPerTon × weightMultiplier`, rounded to nearest 0.5 ton

---

## Calculation Formulas

### Armor Weight Calculation

**Formula**:
```
armorWeight = Math.ceil((totalArmorPoints / pointsPerTon × weightMultiplier) × 2) / 2
```

**Where**:
- `totalArmorPoints` = sum of all armor points across all locations (front + rear)
- `pointsPerTon` = armor type's points-per-ton ratio
- `weightMultiplier` = armor type's weight multiplier (default 1.0, Hardened = 2.0)
- Multiply by 2, ceiling round, divide by 2 = round to nearest half-ton

**Example (Standard Armor)**:
```
Input: totalArmorPoints = 152, pointsPerTon = 16, weightMultiplier = 1.0
Calculation: weight = Math.ceil((152 / 16 × 1.0) × 2) / 2
           = Math.ceil(9.5 × 2) / 2
           = Math.ceil(19) / 2
           = 19 / 2
           = 9.5 tons
Output: armorWeight = 9.5 tons
```

**Example (Ferro-Fibrous IS)**:
```
Input: totalArmorPoints = 168, pointsPerTon = 17.92, weightMultiplier = 1.0
Calculation: weight = Math.ceil((168 / 17.92 × 1.0) × 2) / 2
           = Math.ceil(9.375 × 2) / 2
           = Math.ceil(18.75) / 2
           = 19 / 2
           = 9.5 tons
Output: armorWeight = 9.5 tons
```

**Example (Hardened Armor)**:
```
Input: totalArmorPoints = 76, pointsPerTon = 8, weightMultiplier = 2.0
Calculation: weight = Math.ceil((76 / 8 × 2.0) × 2) / 2
           = Math.ceil(9.5 × 2.0 × 2) / 2
           = Math.ceil(38) / 2
           = 38 / 2
           = 19 tons
Output: armorWeight = 19 tons
```

**Special Cases**:
- When `totalArmorPoints = 0`: weight = 0 tons
- When armor type is invalid: use Standard (16 points/ton) as default

**Rounding Rules**:
- Always round to nearest half-ton (0.5 ton increments)
- Use ceiling for rounding up fractional half-tons

### Maximum Armor Per Location

**Formula**:
```
locationMaxArmor = location === 'HD' ? 9 : internalStructure[location] × 2
```

**Where**:
- `location` = location identifier (HD, CT, LT, RT, LA, RA, LL, RL)
- `internalStructure[location]` = internal structure points for that location
- Head is special case: always 9 points regardless of structure

**Example (75-ton Mech)**:
```
Internal Structure:
  HD = 3, CT = 24, LT = 17, RT = 17, LA = 13, RA = 13, LL = 17, RL = 17

Maximum Armor:
  HD = 9 (special rule, not 3 × 2 = 6)
  CT = 24 × 2 = 48
  LT = 17 × 2 = 34
  RT = 17 × 2 = 34
  LA = 13 × 2 = 26
  RA = 13 × 2 = 26
  LL = 17 × 2 = 34
  RL = 17 × 2 = 34

Total Maximum = 9 + 48 + 34 + 34 + 26 + 26 + 34 + 34 = 245 points
```

**Special Cases**:
- Head: Always 9 points (official exception to 2× rule)
- Torso with rear armor: front + rear combined cannot exceed location max
- Invalid location: throw error

### Total Maximum Armor

**Formula**:
```
totalMaxArmor = 9 + (CT + LT + RT + LA + RA + LL + RL) × 2
```

**Where**:
- Head contributes fixed 9 points
- All other locations contribute 2× their internal structure

**Example (50-ton Mech)**:
```
Internal Structure:
  HD = 3, CT = 16, LT = 11, RT = 11, LA = 9, RA = 9, LL = 11, RL = 11

Total Max = 9 + (16 + 11 + 11 + 9 + 9 + 11 + 11) × 2
          = 9 + 78 × 2
          = 9 + 156
          = 165 points
```

---

## Validation Rules

### Validation: Location Armor Within Maximum

**Rule**: Each location's armor must not exceed its maximum (2× structure, or 9 for head)

**Severity**: Error

**Condition**:
```typescript
const maxArmor = location === 'HD' ? 9 : internalStructure[location] * 2;
const totalArmor = armor.front + (armor.rear || 0);

if (totalArmor > maxArmor) {
  // invalid - exceeds location maximum
}
```

**Error Message**: "Location [name] armor ([total]) exceeds maximum ([max])"

**User Action**: Reduce armor allocation for this location

### Validation: Rear Armor Only on Torso

**Rule**: Rear armor can only be allocated to torso locations (CT, LT, RT)

**Severity**: Error

**Condition**:
```typescript
const torsoLocations = ['CT', 'LT', 'RT'];
if (armor.rear !== undefined && armor.rear > 0 && !torsoLocations.includes(location)) {
  // invalid - rear armor on non-torso location
}
```

**Error Message**: "Rear armor only allowed on torso locations (CT, LT, RT)"

**User Action**: Remove rear armor from non-torso location

### Validation: Armor Points Non-Negative

**Rule**: All armor point values must be >= 0

**Severity**: Error

**Condition**:
```typescript
if (armor.front < 0 || (armor.rear !== undefined && armor.rear < 0)) {
  // invalid - negative armor
}
```

**Error Message**: "Armor points cannot be negative"

**User Action**: Set armor to 0 or positive value

### Validation: Total Armor Within Structural Maximum

**Rule**: Total armor across all locations must not exceed structural maximum

**Severity**: Error

**Condition**:
```typescript
const structuralMax = calculateTotalMaxArmor(tonnage);
if (totalAllocatedArmor > structuralMax) {
  // invalid - exceeds total maximum
}
```

**Error Message**: "Total armor ([total]) exceeds structural maximum ([max])"

**User Action**: Reduce overall armor allocation

### Validation: Stealth Armor Requirements

**Rule**: Stealth armor requires Guardian ECM and Double Heat Sinks

**Severity**: Error

**Condition**:
```typescript
if (armorType.id === 'stealth') {
  const hasECM = equipment.some(e => e.name.includes('Guardian ECM'));
  const hasDoubleHS = heatSinkType === 'Double (IS)' || heatSinkType === 'Double (Clan)';

  if (!hasECM || !hasDoubleHS) {
    // invalid - missing requirements
  }
}
```

**Error Message**:
- "Stealth armor requires Guardian ECM equipment"
- "Stealth armor requires Double Heat Sinks"

**User Action**: Install required equipment or change armor type

### Validation: Head Armor Recommendation

**Rule**: Head armor below 9 points triggers warning

**Severity**: Warning

**Condition**:
```typescript
if (armor.HD.front < 9) {
  // warning - head not fully armored
}
```

**Warning Message**: "Head armor is [current]/9 points. Maximum head protection recommended."

**User Action**: Consider increasing head armor to 9 points

### Validation: Minimal Rear Armor Warning

**Rule**: Rear armor less than 20% of location total triggers warning

**Severity**: Warning

**Condition**:
```typescript
const torsoLocations = ['CT', 'LT', 'RT'];
for (const loc of torsoLocations) {
  const total = armor[loc].front + (armor[loc].rear || 0);
  const rearPercent = (armor[loc].rear || 0) / total;

  if (total > 0 && rearPercent < 0.2) {
    // warning - minimal rear protection
  }
}
```

**Warning Message**: "[Location] has minimal rear armor - vulnerable to rear attacks"

**User Action**: Consider allocating more rear armor for torso locations

---

## Technology Base Variants

See [Tech Base Variants Reference](../tech-base-variants-reference/spec.md) for general Inner Sphere vs Clan differences and the "14-7 Pattern" for distributed slots.

### Armor-Specific Tech Base Differences

**Ferro-Fibrous Armor Points Per Ton and Slots**:
- Inner Sphere Ferro-Fibrous: 17.92 points/ton, 14 critical slots
- Clan Ferro-Fibrous: 19.2 points/ton, 7 critical slots
- Clan advantage: Better efficiency (7%) AND half the slots

**Standard and Special Armors**:
- Standard, Hardened, Reactive, Reflective: No tech base differences
- Stealth: Inner Sphere only
- Light/Heavy Ferro-Fibrous: Inner Sphere only

**Slot Distribution**:
- Same pattern as Endo Steel (distributed across non-head locations)
- IS: 14 slots spread across multiple locations
- Clan: 7 slots spread across multiple locations

**Mixed Tech Application**:
- Clan Ferro-Fibrous provides dual advantage: better efficiency AND fewer slots
- For mixed tech units, Clan Ferro-Fibrous strictly superior to IS variant


---

## Dependencies

### Defines
- **ArmorType enum**: Defines armor types (Standard, Ferro-Fibrous IS/Clan, Light/Heavy FF, Stealth, Reactive, Reflective, Hardened, etc.)
- **Points-per-ton ratios**: Standard 16, FF IS 17.92, FF Clan 19.2, Light FF 16.8, Heavy FF 19.2, etc.
- **Armor weight formula**: CEIL((totalPoints / pointsPerTon) × 2) / 2 (round up to half-ton)
- **Weight multipliers**: Most 1.0, Hardened 2.0
- **Slot requirements**: Standard 0, FF IS 14, FF Clan 7, Light FF 7, Heavy FF 21, Stealth 12, etc.
- **Maximum armor rules**: 2× structure per location, head max 9
- **Rear armor rules**: Torso locations only (CT, LT, RT)
- **IArmorType interface**: Armor type specification
- **IArmorAllocation interface**: Armor distribution across locations
- **IArmor interface**: Complete armor configuration

### Depends On
- [Core Entity Types](../../phase-1-foundation/core-entity-types/spec.md) - Extends ITechBaseEntity, ITemporalEntity, ISlottedComponent
- [Internal Structure System](../internal-structure-system/spec.md) - Maximum armor calculation depends on internal structure points (2:1 ratio)
- [Physical Properties System](../../phase-1-foundation/physical-properties-system/spec.md) - Uses weight and critical slot properties
- [Critical Slot Allocation](../critical-slot-allocation/spec.md) - Advanced armor types consume critical slots

### Used By
- [Construction Rules Core](../construction-rules-core/spec.md) - Armor weight contributes to total mech weight
- **Battle Value Calculation**: Armor points contribute to defensive BV
- **Validation System**: Validates armor allocation against construction rules
- **UI Components**: Armor allocation panels display and edit armor

### Construction Sequence
1. Select tonnage (determines internal structure points)
2. Calculate structure (establishes maximum armor limits per location)
3. Select armor type (determines points-per-ton ratio and slot requirements)
4. Allocate slots (if advanced armor, allocate critical slots)
5. Allocate points (user distributes armor points to locations)
6. Calculate weight: CEIL((totalPoints / pointsPerTon) × 2) / 2
7. Validate configuration (ensure all rules are satisfied)

---

## Implementation Notes

### Performance Considerations
- Cache maximum armor calculations per tonnage (static table)
- Pre-calculate points-per-ton for each armor type
- Avoid recalculating totals on every keystroke - debounce user input
- Store armor allocation as immutable object for efficient change detection

### Edge Cases
- **Zero Armor**: Valid but triggers warnings about vulnerability
- **Head Armor < 9**: Warning, not error - user choice to optimize weight
- **All Rear Armor**: Valid but impractical - warn about minimal front protection
- **Fractional Half-Tons**: Always round up using ceiling formula
- **Hardened Armor**: Remember to apply 2.0 weight multiplier AFTER points/ton calculation

### Common Pitfalls
- **Pitfall**: Forgetting head armor is capped at 9, not 2× structure
  - **Solution**: Always check for 'HD' location before applying 2× rule

- **Pitfall**: Allowing rear armor on non-torso locations
  - **Solution**: Validate location is CT/LT/RT before accepting rear armor

- **Pitfall**: Not applying weight multiplier for Hardened armor
  - **Solution**: Apply weightMultiplier AFTER dividing by pointsPerTon

- **Pitfall**: Forgetting to validate Stealth armor requirements
  - **Solution**: Check for ECM and Double HS when armor type changes

- **Pitfall**: Incorrect rounding (truncate instead of half-ton)
  - **Solution**: Use Math.ceil((value × 2)) / 2 formula for half-ton rounding

---

## Examples

### Example 1: Standard Armor on 75-ton Mech

**Input**:
```typescript
const armorConfig: IArmorConfiguration = {
  armorType: {
    id: 'standard',
    name: 'Standard',
    pointsPerTon: 16,
    criticalSlots: 0,
    techBase: TechBase.BOTH,
    rulesLevel: RulesLevel.INTRODUCTORY,
    costMultiplier: 1.0,
    weightMultiplier: 1.0,
    hasRearArmor: true
  },
  allocation: {
    HD: { front: 9 },
    CT: { front: 36, rear: 12 },
    LT: { front: 25, rear: 9 },
    RT: { front: 25, rear: 9 },
    LA: { front: 26 },
    RA: { front: 26 },
    LL: { front: 34 },
    RL: { front: 34 }
  },
  totalPoints: 0,  // calculated
  totalWeight: 0,  // calculated
  slotsUsed: 0
};
```

**Processing**:
```typescript
// Calculate totals
const totalPoints = 9 + (36+12) + (25+9) + (25+9) + 26 + 26 + 34 + 34
                  = 9 + 48 + 34 + 34 + 26 + 26 + 34 + 34
                  = 245 points

// Calculate weight
const weight = Math.ceil((245 / 16 × 1.0) × 2) / 2
             = Math.ceil(15.3125 × 2) / 2
             = Math.ceil(30.625) / 2
             = 31 / 2
             = 15.5 tons

// Validate against maximum
const maxArmor = {
  HD: 9, CT: 48, LT: 34, RT: 34,
  LA: 26, RA: 26, LL: 34, RL: 34
};
// All locations within max ✓
```

**Output**:
```typescript
{
  ...armorConfig,
  totalPoints: 245,
  totalWeight: 15.5,
  slotsUsed: 0
}
```

### Example 2: Ferro-Fibrous (IS) on 50-ton Mech

**Input**:
```typescript
const armorConfig: IArmorConfiguration = {
  armorType: {
    id: 'ferro_fibrous_is',
    name: 'Ferro-Fibrous (Inner Sphere)',
    pointsPerTon: 17.92,
    criticalSlots: 14,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    costMultiplier: 2.0,
    weightMultiplier: 1.0,
    hasRearArmor: true
  },
  allocation: {
    HD: { front: 9 },
    CT: { front: 24, rear: 8 },
    LT: { front: 16, rear: 6 },
    RT: { front: 16, rear: 6 },
    LA: { front: 18 },
    RA: { front: 18 },
    LL: { front: 22 },
    RL: { front: 22 }
  },
  totalPoints: 0,
  totalWeight: 0,
  slotsUsed: 14
};
```

**Processing**:
```typescript
// Calculate totals
const totalPoints = 9 + (24+8) + (16+6) + (16+6) + 18 + 18 + 22 + 22
                  = 9 + 32 + 22 + 22 + 18 + 18 + 22 + 22
                  = 165 points

// Calculate weight with Ferro-Fibrous
const weight = Math.ceil((165 / 17.92 × 1.0) × 2) / 2
             = Math.ceil(9.207... × 2) / 2
             = Math.ceil(18.414...) / 2
             = 19 / 2
             = 9.5 tons

// Compare to Standard armor
const standardWeight = Math.ceil((165 / 16 × 1.0) × 2) / 2
                     = Math.ceil(10.3125 × 2) / 2
                     = 11 / 2
                     = 10.5 tons

// Weight savings = 10.5 - 9.5 = 1 ton (at cost of 14 critical slots)
```

**Output**:
```typescript
{
  ...armorConfig,
  totalPoints: 165,
  totalWeight: 9.5,
  slotsUsed: 14
}
```

### Example 3: Hardened Armor Weight Calculation

**Input**:
```typescript
const armorConfig: IArmorConfiguration = {
  armorType: {
    id: 'hardened',
    name: 'Hardened',
    pointsPerTon: 8,
    criticalSlots: 0,
    techBase: TechBase.BOTH,
    rulesLevel: RulesLevel.ADVANCED,
    costMultiplier: 2.0,
    weightMultiplier: 2.0,  // Double weight!
    hasRearArmor: true
  },
  allocation: {
    HD: { front: 9 },
    CT: { front: 24, rear: 8 },
    LT: { front: 12, rear: 6 },
    RT: { front: 12, rear: 6 },
    LA: { front: 10 },
    RA: { front: 10 },
    LL: { front: 12 },
    RL: { front: 12 }
  },
  totalPoints: 0,
  totalWeight: 0,
  slotsUsed: 0
};
```

**Processing**:
```typescript
// Calculate totals
const totalPoints = 9 + (24+8) + (12+6) + (12+6) + 10 + 10 + 12 + 12
                  = 9 + 32 + 18 + 18 + 10 + 10 + 12 + 12
                  = 121 points

// Calculate weight with Hardened (8 pts/ton, 2.0× weight)
const baseWeight = 121 / 8 = 15.125 tons
const actualWeight = baseWeight × 2.0 = 30.25 tons
const roundedWeight = Math.ceil(30.25 × 2) / 2 = 31 / 2 = 30.5 tons

// Compare to Standard armor
const standardPoints = 121; // Same protection value in points
const standardWeight = Math.ceil((121 / 16 × 1.0) × 2) / 2
                     = Math.ceil(7.5625 × 2) / 2
                     = 8 / 2
                     = 8 tons

// Hardened provides DOUBLE protection per point (damage reduction)
// So 121 Hardened points ≈ 242 Standard points of actual protection
// But weighs 30.5 tons vs 8 tons for 121 Standard points
```

**Output**:
```typescript
{
  ...armorConfig,
  totalPoints: 121,
  totalWeight: 30.5,  // Very heavy!
  slotsUsed: 0,
  specialRules: [
    'Reduces damage by 1 point per hit',
    'No critical hits through armor'
  ]
}
```

### Example 4: Validation Error - Exceeding Location Maximum

**Input**:
```typescript
const armorAllocation = {
  HD: { front: 12 }  // Exceeds head max of 9!
};
const tonnage = 50;
```

**Processing**:
```typescript
const maxHeadArmor = 9; // Always 9 for head
const allocatedHeadArmor = 12;

if (allocatedHeadArmor > maxHeadArmor) {
  return {
    isValid: false,
    errors: [`Head armor (12) exceeds maximum (9)`]
  };
}
```

**Output**:
```typescript
const validationResult: IArmorValidationResult = {
  isValid: false,
  errors: [
    'Head armor (12) exceeds maximum (9)'
  ],
  warnings: [],
  coverage: {
    HD: 133  // 12/9 × 100 = 133% (over-allocated)
  }
};
```

### Example 5: Validation Warning - Minimal Rear Armor

**Input**:
```typescript
const armorAllocation = {
  CT: { front: 46, rear: 2 }  // 2 rear out of 48 total (4%)
};
```

**Processing**:
```typescript
const totalCT = 46 + 2;
const rearPercent = (2 / totalCT) × 100;

if (rearPercent < 20) {
  warnings.push(
    `Center Torso has minimal rear armor (${rearPercent.toFixed(0)}%) - vulnerable to rear attacks`
  );
}
```

**Output**:
```typescript
const validationResult: IArmorValidationResult = {
  isValid: true,  // Warning, not error
  errors: [],
  warnings: [
    'Center Torso has minimal rear armor (4%) - vulnerable to rear attacks'
  ],
  coverage: {
    CT: 100  // 48/48 × 100 = 100%
  }
};
```

### Example 6: Stealth Armor Requirements Validation

**Input**:
```typescript
const armorType = {
  id: 'stealth',
  name: 'Stealth',
  specialRules: ['Requires ECM', 'Requires Double Heat Sinks']
};
const equipment = [];  // No ECM installed!
const heatSinkType = 'Single';  // Not Double!
```

**Processing**:
```typescript
const errors: string[] = [];

if (armorType.id === 'stealth') {
  const hasECM = equipment.some(e =>
    e.name.includes('Guardian ECM')
  );

  if (!hasECM) {
    errors.push('Stealth armor requires Guardian ECM equipment');
  }

  const hasDoubleHS = heatSinkType.includes('Double');
  if (!hasDoubleHS) {
    errors.push('Stealth armor requires Double Heat Sinks');
  }
}
```

**Output**:
```typescript
const validationResult: IArmorValidationResult = {
  isValid: false,
  errors: [
    'Stealth armor requires Guardian ECM equipment',
    'Stealth armor requires Double Heat Sinks'
  ],
  warnings: []
};
```

---

## References

### Official BattleTech Rules
- **TechManual**: Pages 56-58 - Armor Types and Characteristics
- **TechManual**: Page 102 - Armor Point Allocation Table
- **TechManual**: Page 104 - Maximum Armor by Location
- **Total Warfare**: Page 38 - Armor Point Distribution
- **Total Warfare**: Page 118 - Armor Damage Effects

### Related Documentation
- Internal Structure System Specification (defines structure points and maximum armor basis)
- Critical Slot Allocation Specification (defines slot allocation for advanced armor)
- Construction Rules Specification (defines overall weight limits)
- Core Entity Types Specification (defines base interfaces)

### Code References
- Types: `src/types/Armor.ts`
- Armor calculations: `src/utils/armorCalculations.ts`
- Armor types: `src/utils/armorTypes.ts`
- Internal structure: `src/utils/internalStructureTable.ts`
- Construction rules: `src/constants/BattleTechConstructionRules.ts`

---

## Changelog

### Version 1.0 (2025-11-27)
- Initial specification
- Defined 14 armor types with complete properties
- Specified points-per-ton ratios for all armor types
- Established maximum armor formulas (2× structure, head exception)
- Documented rear armor rules (torso only)
- Created weight calculation formulas with rounding rules
- Added critical slot requirements per armor type
- Defined special armor requirements (Stealth, Reactive, Hardened)
- Provided comprehensive validation rules
- Created detailed examples for all armor types and edge cases
