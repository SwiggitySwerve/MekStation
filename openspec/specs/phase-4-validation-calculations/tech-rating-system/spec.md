# Tech Rating System Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2025-11-28
**Dependencies**: Phase 1-3 specifications (Core Entity Types, Construction Systems, Equipment Systems)
**Affects**: Construction Rules Core, Equipment Placement, Validation System

---

## Overview

### Purpose
The Tech Rating system calculates a unit's overall technology complexity based on component technology levels, providing a standardized way to assess unit advancement and determine scenario eligibility.

### Scope
**In Scope:**
- Component technology level classification
- Overall unit tech rating calculation
- Technology availability constraints
- Mixed tech rating determination
- Tech rating validation for scenarios

**Out of Scope:**
- Rules level systems (separate specification)
- Era-based availability (separate temporal system)
- Technology acquisition rules

### Key Concepts
- **Tech Rating (TR)**: Overall unit technology level (A-F)
- **Component Tech Level**: Individual component technology (Introductory-Experimental)
- **Tech Base**: Inner Sphere, Clan, or Mixed technology
- **Technology Modifier**: Adjustments for special cases and mixed technology
- **Technology Complexity**: Overall technological advancement measurement

---

## Requirements

### Requirement: Calculate Component Tech Levels
The system SHALL determine the technology level of each component based on its base technology and era availability.

**Rationale**: Component tech levels form the foundation for overall unit tech rating calculations.

**Priority**: Critical

#### Scenario: Standard Inner Sphere Technology
**GIVEN** a standard Inner Sphere Medium Laser
**WHEN** determining component tech level
**THEN** assign Tech Level 2 (Standard)
**AND** classify as Inner Sphere technology base

#### Scenario: Advanced Clan Technology
**GIVEN** a Clan ER PPC
**WHEN** determining component tech level
**THEN** assign Tech Level 4 (Advanced)
**AND** classify as Clan technology base

#### Scenario: Experimental Technology
**GIVEN** an Improved Jump Jet system
**WHEN** determining component tech level
**THEN** assign Tech Level 5 (Experimental)
**AND** apply experimental technology penalties

#### Scenario: Primitive Technology
**GIVEN** a primitive industrial fusion engine
**WHEN** determining component tech level
**THEN** assign Tech Level 0 (Primitive)
**AND** apply primitive technology penalties

### Requirement: Determine Unit Technology Base
The system SHALL classify the overall technology base of a unit based on component composition.

**Rationale**: Technology base affects component compatibility and overall tech rating calculations.

**Priority**: Critical

#### Scenario: Pure Inner Sphere Design
**GIVEN** a BattleMech with all Inner Sphere components
**WHEN** determining unit tech base
**THEN** classify as Inner Sphere
**AND** use Inner Sphere tech rating tables

#### Scenario: Pure Clan Design
**GIVEN** a BattleMech with all Clan components
**WHEN** determining unit tech base
**THEN** classify as Clan
**AND** use Clan tech rating tables

#### Scenario: Mixed Technology Design
**GIVEN** a BattleMech with both Inner Sphere and Clan components
**WHEN** determining unit tech base
**THEN** classify as Mixed Technology
**AND** apply mixed technology calculation rules

#### Scenario: Predominant Technology Base
**GIVEN** a Mixed Tech unit with 80% Clan components
**WHEN** determining unit tech base
**THEN** classify as Clan-dominant Mixed
**AND** use Clan tech rating tables with mixed tech penalties

### Requirement: Calculate Overall Tech Rating
The system SHALL calculate the overall unit tech rating from component technology levels using weighted averages.

**Rationale**: Overall tech rating provides a standardized measure of unit complexity for scenario balance.

**Priority**: Critical

#### Scenario: Standard Inner Sphere Tech Rating
**GIVEN** a BattleMech with predominantly Tech Level 2 components
**WHEN** calculating overall tech rating
**THEN** assign Tech Rating C (Standard)
**AND** apply standard Inner Sphere modifiers

#### Scenario: Advanced Clan Tech Rating
**GIVEN** a BattleMech with predominantly Tech Level 4 components
**WHEN** calculating overall tech rating
**THEN** assign Tech Rating E (Advanced)
**AND** apply Clan technology advancement bonus

#### Scenario: Mixed Tech Rating Calculation
**GIVEN** a Mixed Tech unit with varying component levels
**WHEN** calculating overall tech rating
**THEN** use weighted average of component levels
**AND** apply mixed technology penalty of -0.5 rating

#### Scenario: Tech Rating Rounding
**GIVEN** a calculated tech rating of 2.7
**WHEN** determining final tech rating
**THEN** round to nearest integer (Tech Rating 3)
**AND** follow standard rounding rules

### Requirement: Apply Technology Modifiers
The system SHALL apply appropriate modifiers based on special equipment, technology mixing, and unique configurations.

**Rationale**: Special cases require adjustments to accurately reflect technological complexity.

**Priority**: High

#### Scenario: XL Engine Modifier
**GIVEN** a BattleMech equipped with XL engine technology
**WHEN** applying technology modifiers
**THEN** add +0.5 to tech rating
**AND** reflect advanced engine technology

#### Scenario: Endo Steel Structure Modifier
**GIVEN** a BattleMech with Endo Steel internal structure
**WHEN** applying technology modifiers
**THEN** add +0.5 to tech rating
**AND** reflect advanced materials technology

#### Scenario: Double Heat Sink Modifier
**GIVEN** a BattleMech with Double Heat Sinks
**WHEN** applying technology modifiers
**THEN** add +0.5 to tech rating
**AND** reflect advanced heat management technology

#### Scenario: Targeting Computer Modifier
**GIVEN** a BattleMech equipped with Targeting Computer
**WHEN** applying technology modifiers
**THEN** add +1.0 to tech rating
**AND** reflect advanced electronics technology

### Requirement: Validate Technology Compatibility
The system SHALL validate that component technologies are compatible with the unit's declared technology base.

**Rationale**: Technology compatibility ensures realistic and balanced unit designs.

**Priority**: High

#### Scenario: Inner Sphere Compatibility Check
**GIVEN** an Inner Sphere BattleMech with Clan weapons
**WHEN** validating technology compatibility
**THEN** flag as Mixed Technology
**AND** require mixed technology rules

#### Scenario: Clan Compatibility Check
**GIVEN** a Clan BattleMech with primitive Inner Sphere equipment
**WHEN** validating technology compatibility
**THEN** flag as invalid Clan design
**AND** suggest technology base reclassification

#### Scenario: Era Compatibility Check
**GIVEN** a Succession Wars-era design with Star League technology
**WHEN** validating technology compatibility
**THEN** flag as anachronistic technology
**AND** provide era warning

### Requirement: Generate Tech Rating Reports
The system SHALL provide detailed reports of technology composition and rating calculations.

**Rationale**: Detailed reports help users understand technology composition and identify potential improvements.

**Priority**: Medium

#### Scenario: Component Technology Breakdown
**GIVEN** a completed BattleMech design
**WHEN** generating tech rating report
**THEN** list all components with individual tech levels
**AND** show component contribution to overall rating

#### Scenario: Technology Base Analysis
**GIVEN** a Mixed Technology BattleMech
**WHEN** generating tech rating report
**THEN** provide technology base percentages
**AND** identify dominant technology base

#### Scenario: Improvement Suggestions
**GIVEN** a BattleMech with mixed technology levels
**WHEN** generating tech rating report
**THEN** suggest component standardization
**AND** show rating improvement potential

---

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * Technology rating levels and classifications
 */
enum TechRating {
  PRIMITIVE_A = 'A',    // Pre-spaceflight, Early Industrial
  PRIMITIVE_B = 'B',    // Industrial, Early Spaceflight
  INTRODUCTORY_C = 'C', // Early BattleTech, Basic Military
  STANDARD_D = 'D',     // Common Military Technology
  ADVANCED_E = 'E',      // Advanced Military Systems
  EXPERIMENTAL_F = 'F'  // Cutting Edge, Experimental
}

/**
 * Component technology levels
 */
enum ComponentTechLevel {
  PRIMITIVE = 0,        // Level 0
  INTRODUCTORY = 1,     // Level 1
  STANDARD = 2,         // Level 2
  ADVANCED = 3,         // Level 3
  EXPERIMENTAL = 4      // Level 4
}

/**
 * Technology base classifications
 */
enum TechnologyBase {
  INNER_SPHERE = 'innerSphere',
  CLAN = 'clan',
  MIXED_TECH = 'mixedTech'
}

/**
 * Component technology information
 */
interface IComponentTechInfo {
  /** Component identifier */
  readonly componentId: string;

  /** Component technology level */
  readonly techLevel: ComponentTechLevel;

  /** Component technology base */
  readonly techBase: TechnologyBase;

  /** Technology weight in calculation (based on BV or critical slots) */
  readonly weight: number;

  /** Special technology modifiers */
  readonly modifiers: TechModifier[];
}

/**
 * Technology modifier information
 */
interface TechModifier {
  /** Type of technology modifier */
  readonly type: TechModifierType;

  /** Modifier value (positive or negative) */
  readonly value: number;

  /** Reason for modifier */
  readonly reason: string;

  /** Whether this modifier affects compatibility */
  readonly affectsCompatibility: boolean;
}

/**
 * Types of technology modifiers
 */
enum TechModifierType {
  ADVANCED_ENGINE = 'advancedEngine',
  ADVANCED_STRUCTURE = 'advancedStructure',
  ADVANCED_HEAT_SINKS = 'advancedHeatSinks',
  ADVANCED_ARMOR = 'advancedArmor',
  ADVANCED_ELECTRONICS = 'advancedElectronics',
  MIXED_TECH_PENALTY = 'mixedTechPenalty',
  EXPERIMENTAL_PENALTY = 'experimentalPenalty',
  PRIMITIVE_PENALTY = 'primitivePenalty'
}

/**
 * Overall unit technology rating
 */
interface IUnitTechRating {
  /** Overall technology rating */
  readonly rating: TechRating;

  /** Numeric rating value (0-5) */
  readonly numericRating: number;

  /** Primary technology base */
  readonly primaryTechBase: TechnologyBase;

  /** Technology base composition percentages */
  readonly techBaseComposition: TechBaseComposition;

  /** Component technology breakdown */
  readonly componentBreakdown: IComponentTechInfo[];

  /** Applied modifiers */
  readonly appliedModifiers: TechModifier[];

  /** Compatibility status */
  readonly isCompatible: boolean;

  /** Compatibility issues */
  readonly compatibilityIssues: string[];
}

/**
 * Technology base composition percentages
 */
interface TechBaseComposition {
  /** Inner Sphere percentage */
  readonly innerSphere: number;

  /** Clan percentage */
  readonly clan: number;

  /** Mixed technology percentage */
  readonly mixed: number;

  /** Dominant technology base */
  readonly dominant: TechnologyBase;
}

/**
 * Technology rating calculation configuration
 */
interface ITechRatingConfig {
  /** Technology level weights */
  readonly levelWeights: {
    readonly [key in ComponentTechLevel]: number;
  };

  /** Modifier values */
  readonly modifiers: {
    readonly [key in TechModifierType]: number;
  };

  /** Technology base thresholds */
  readonly baseThresholds: {
    readonly pureInnerSphere: number;
    readonly pureClan: number;
    readonly mixedTech: number;
  };

  /** Rating conversion tables */
  readonly ratingTables: {
    readonly innerSphere: RatingConversionTable;
    readonly clan: RatingConversionTable;
    readonly mixed: RatingConversionTable;
  };
}

/**
 * Rating conversion table
 */
interface RatingConversionTable {
  /** Minimum numeric rating for each tech rating */
  readonly [key in TechRating]: number;
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `rating` | `TechRating` | Yes | Overall technology rating | A-F | C |
| `numericRating` | `number` | Yes | Numeric rating value | 0-5 | 2 |
| `primaryTechBase` | `TechnologyBase` | Yes | Primary technology base | enum values | innerSphere |
| `isCompatible` | `boolean` | Yes | Technology compatibility status | true/false | true |

### Type Constraints

- `numericRating` MUST be >= 0 and <= 5
- `techBaseComposition.innerSphere + techBaseComposition.clan + techBaseComposition.mixed` MUST equal 100
- Component weights MUST sum to 1.0 for calculation purposes
- Technology base percentages MUST be >= 0 and <= 100
- When `isCompatible` is false, at least one compatibility issue must be provided

---

## Calculation Formulas

### Component Technology Level Determination

**Formula**:
```
Component Tech Level = Base Tech Level + Era Adjustment + Tech Base Modifier
```

**Where**:
- `Base Tech Level` = Component's intrinsic technology level (0-4)
- `Era Adjustment` = Era-based availability adjustment (-2 to +2)
- `Tech Base Modifier` = Tech base level adjustment (IS = 0, Clan = +1)

**Example**:
```
Input: Clan ER PPC (Base Level 3), Star League Era (+1), Clan (+1)
Calculation: Component Tech Level = 3 + 1 + 1 = 5
Output: Tech Level 4 (Experimental) - capped at maximum
```

**Special Cases**:
- Primitive equipment: Apply -2 level modifier
- Experimental equipment: Apply +1 level modifier
- Mixed tech components: Use higher of available tech levels

**Rounding Rules**:
- Clamp to valid range (0-4)
- No fractional tech levels allowed

### Technology Base Composition

**Formula**:
```
Inner Sphere % = (Sum of IS Component Weights) × 100
Clan % = (Sum of Clan Component Weights) × 100
Mixed % = (Sum of Mixed Component Weights) × 100
```

**Where**:
- Component Weights = Based on BV contribution or critical slot allocation
- Total weight = 100%

**Example**:
```
Input: IS Engine (40%), IS Structure (30%), Clan Weapons (20%), IS Electronics (10%)
Calculation: Inner Sphere % = 40% + 30% + 10% = 80%
Clan % = 20%
Mixed % = 0%
Output: Inner Sphere: 80%, Clan: 20%, Mixed: 0%
```

**Technology Base Determination**:
- Inner Sphere >= 80%: Pure Inner Sphere
- Clan >= 80%: Pure Clan
- Otherwise: Mixed Technology

### Overall Tech Rating Calculation

**Formula**:
```
Base Rating = Σ(Component Tech Level × Component Weight)
Tech Rating = Base Rating + Technology Modifiers
Final Rating = Clamp(Round(Tech Rating), 0, 5)
```

**Where**:
- Component Weights = Normalized weights summing to 1.0
- Technology Modifiers = Sum of all applicable modifiers

**Example**:
```
Input: Components: TL2 (50%), TL3 (30%), TL1 (20%), Modifiers: +0.5 (XL), +0.5 (DHS)
Calculation: Base Rating = (2 × 0.5) + (3 × 0.3) + (1 × 0.2) = 1.0 + 0.9 + 0.2 = 2.1
Tech Rating = 2.1 + 0.5 + 0.5 = 3.1
Final Rating = Round(3.1) = 3
Output: Tech Rating 3 (Advanced)
```

**Special Cases**:
- Mixed Technology: Apply -0.5 rating penalty
- Experimental Components: Apply -0.25 rating penalty per component
- Primitive Components: Apply -0.5 rating penalty per component

### Technology Modifier Application

**Formula**:
```
Total Modifier = Σ(Modifier Type Value × Modifier Count)
Adjusted Rating = Base Rating + Total Modifier
```

**Where**:
- Modifier Type Value = Predefined modifier for each technology type
- Modifier Count = Number of components of that type

**Example**:
```
Input: 1 XL Engine (+0.5), 2 DHS (+0.5 each), 1 Targeting Computer (+1.0)
Calculation: Total Modifier = (1 × 0.5) + (2 × 0.5) + (1 × 1.0) = 0.5 + 1.0 + 1.0 = 2.5
Adjusted Rating = Base Rating + 2.5
Output: Apply 2.5 point adjustment to base rating
```

### Tech Rating Letter Conversion

**Formula**:
```
Letter Rating = ConvertNumericToLetter(Numeric Rating)
```

**Where**:
- 0.0 - 0.9: Tech Rating A (Primitive)
- 1.0 - 1.9: Tech Rating B (Primitive)
- 2.0 - 2.9: Tech Rating C (Introductory)
- 3.0 - 3.9: Tech Rating D (Standard)
- 4.0 - 4.9: Tech Rating E (Advanced)
- 5.0 - 5.0: Tech Rating F (Experimental)

**Example**:
```
Input: Numeric Rating = 2.7
Calculation: Letter Rating = C (Introductory)
Output: Tech Rating C
```

**Technology Base Adjustments**:
- Inner Sphere: Use standard conversion table
- Clan: Apply +0.5 to numeric rating before conversion
- Mixed: Use standard conversion table (no adjustment)

---

## Validation Rules

### Validation: Technology Base Compatibility

**Rule**: Components must be compatible with declared unit technology base.

**Severity**: Error

**Condition**:
```typescript
const validateTechBaseCompatibility = (unit: IUnitTechRating) => {
  const incompatibleComponents = unit.componentBreakdown.filter(
    component => !isComponentCompatible(component.techBase, unit.primaryTechBase)
  );

  if (incompatibleComponents.length > 0 && unit.primaryTechBase !== TechnologyBase.MIXED_TECH) {
    throw new ValidationError(
      `${incompatibleComponents.length} components incompatible with ${unit.primaryTechBase} technology base`
    );
  }
};

const isComponentCompatible = (componentBase: TechnologyBase, unitBase: TechnologyBase): boolean => {
  if (unitBase === TechnologyBase.MIXED_TECH) return true;
  return componentBase === unitBase || componentBase === TechnologyBase.MIXED_TECH;
};
```

**Error Message**: "Unit contains components incompatible with declared technology base"

**User Action**: Reclassify unit as Mixed Technology or replace incompatible components

### Validation: Technology Level Consistency

**Rule**: Technology levels must be consistent with unit's declared era and technology base.

**Severity**: Warning

**Condition**:
```typescript
const validateTechLevelConsistency = (unit: IUnitTechRating, era: Era) => {
  const maxAllowedTech = getMaxTechForEraAndBase(era, unit.primaryTechBase);
  const advancedComponents = unit.componentBreakdown.filter(
    component => component.techLevel > maxAllowedTech
  );

  if (advancedComponents.length > 0) {
    return {
      valid: false,
      message: `${advancedComponents.length} components exceed ${era} technology level`,
      components: advancedComponents.map(c => c.componentId)
    };
  }

  return { valid: true };
};
```

**Error Message**: "Unit contains technology beyond specified era limits"

**User Action**: Update unit era or replace anachronistic components

### Validation: Tech Rating Range

**Rule**: Calculated tech rating must be within expected ranges for unit tonnage and technology base.

**Severity**: Warning

**Condition**:
```typescript
const validateTechRatingRange = (unit: IUnitTechRating, tonnage: number) => {
  const expectedRanges = getExpectedTechRanges(tonnage, unit.primaryTechBase);
  const rating = unit.numericRating;

  if (rating < expectedRanges.min || rating > expectedRanges.max) {
    return {
      valid: false,
      message: `Tech Rating ${rating} outside expected range [${expectedRanges.min}, ${expectedRanges.max}] for ${tonnage} ton ${unit.primaryTechBase} unit`
    };
  }

  return { valid: true };
};
```

**Error Message**: "Tech rating is outside expected range for unit configuration"

**User Action**: Review component selection and technology composition

### Validation: Mixed Technology Balance

**Rule**: Mixed technology units should have balanced technology distribution.

**Severity**: Info

**Condition**:
```typescript
const validateMixedTechBalance = (unit: IUnitTechRating) => {
  if (unit.primaryTechBase !== TechnologyBase.MIXED_TECH) return { valid: true };

  const minRequired = 20; // Minimum 20% of any technology base
  const { innerSphere, clan } = unit.techBaseComposition;

  if (innerSphere < minRequired || clan < minRequired) {
    return {
      valid: false,
      message: `Mixed technology unit should have at least ${minRequired}% of each major technology base (IS: ${innerSphere}%, Clan: ${clan}%)`,
      suggestion: "Consider reclassifying as pure technology base or adding more components from minority technology"
    };
  }

  return { valid: true };
};
```

**Error Message**: "Mixed technology unit has unbalanced technology distribution"

**User Action**: Add components from minority technology base or reclassify as pure technology

---

## Technology Base Variants

### Inner Sphere Implementation

**Differences from base specification**:
- Tech Level Maximum: 4 (Experimental) in late eras
- Standard Technology Period: Succession Wars (Tech Level 2)
- Advanced Technology Access: Limited to Star League and Post-Jihad eras

**Special Rules**:
- Clan Equipment: Rare, extremely expensive, tech rating penalty
- Advanced Materials: Limited availability, higher tech rating cost
- Experimental Systems: High failure rate, maintenance penalties

**Example**:
```typescript
const innerSphereConfig: ITechRatingConfig = {
  levelWeights: {
    [ComponentTechLevel.PRIMITIVE]: 0.5,
    [ComponentTechLevel.INTRODUCTORY]: 1.0,
    [ComponentTechLevel.STANDARD]: 1.5,
    [ComponentTechLevel.ADVANCED]: 2.0,
    [ComponentTechLevel.EXPERIMENTAL]: 2.5
  },
  modifiers: {
    [TechModifierType.ADVANCED_ENGINE]: 0.5,
    [TechModifierType.ADVANCED_STRUCTURE]: 0.5,
    [TechModifierType.ADVANCED_HEAT_SINKS]: 0.5,
    [TechModifierType.EXPERIMENTAL_PENALTY]: 0.25
  }
};
```

### Clan Implementation

**Differences from base specification**:
- Tech Level Baseline: +1 compared to Inner Sphere equivalent
- Standard Technology Period: Invasion Era (Tech Level 3-4)
- Advanced Technology Access: Common, lower tech rating cost

**Special Rules**:
- Inner Sphere Equipment: Primitive status, -1 tech level
- Experimental Systems: Lower failure rate, faster adoption
- Omni Technology: No tech rating penalty for Omni systems

**Example**:
```typescript
const clanConfig: ITechRatingConfig = {
  levelWeights: {
    [ComponentTechLevel.PRIMITIVE]: 0.25,
    [ComponentTechLevel.INTRODUCTORY]: 0.75,
    [ComponentTechLevel.STANDARD]: 1.25,
    [ComponentTechLevel.ADVANCED]: 1.75,
    [ComponentTechLevel.EXPERIMENTAL]: 2.25
  },
  modifiers: {
    [TechModifierType.ADVANCED_ENGINE]: 0.25,
    [TechModifierType.ADVANCED_STRUCTURE]: 0.25,
    [TechModifierType.ADVANCED_HEAT_SINKS]: 0.25,
    [TechModifierType.ADVANCED_ELECTRONICS]: 0.5
  }
};
```

### Mixed Tech Rules

**When unit tech base is Mixed**:
- Apply mixed technology penalty of -0.5 to overall tech rating
- Use higher technology base's rules for advanced components
- Apply compatibility restrictions for component interactions

**Compatibility Rules**:
- IS Structure with Clan Equipment: Use IS structure rules
- Clan Structure with IS Equipment: Use Clan structure rules
- Mixed Electronics: Apply most restrictive rules

**Calculation Rules**:
- Component weights based on technology base of origin
- Technology base percentages include all components
- Dominant technology base used for primary calculation rules

---

## Dependencies

### Depends On
- **Core Entity Types**: Base technology and era information
- **Construction Rules Core**: Component placement and integration
- **Equipment Systems**: Technology levels for weapons and equipment
- **Tech Base Integration**: Technology base classification rules

### Used By
- **Construction Rules Core**: Final tech rating validation
- **Unit Entity Model**: Tech rating property for complete units
- **Validation System**: Technology compatibility checking
- **Scenario Balance System**: Force composition and balance validation

### Construction Sequence
1. Basic construction must be completed with tech base declaration
2. Equipment and weapons must be placed with technology levels
3. Technology base composition must be calculated
4. Tech rating must be calculated and validated
5. Final unit validation includes tech rating compatibility

---

## Implementation Notes

### Performance Considerations
- Cache component technology level lookups for repeated equipment types
- Use pre-calculated weight tables for common component types
- Implement lazy evaluation for complex technology compatibility checks

### Edge Cases
- **Zero Technology Components**: Handle equipment with no tech rating (life support, basic sensors)
- **Negative Tech Levels**: Process primitive technology with negative modifiers
- **Fractional Components**: Handle equipment that spans multiple technology bases

### Common Pitfalls
- **Pitfall**: Double-counting technology modifiers
  - **Solution**: Clear separation between component tech levels and unit modifiers
- **Pitfall**: Incorrect technology base classification
  - **Solution**: Explicit calculation rules with clear thresholds
- **Pitfall**: Rounding errors in tech rating calculation
  - **Solution**: Consistent rounding rules at calculation completion

---

## Examples

### Example 1: Standard Inner Sphere BattleMech

**Input**:
```typescript
const shadowHawk = {
  tonnage: 55,
  techBase: 'innerSphere',
  components: [
    { id: 'engine', techLevel: 2, base: 'innerSphere', weight: 0.3 },
    { id: 'structure', techLevel: 2, base: 'innerSphere', weight: 0.15 },
    { id: 'armor', techLevel: 2, base: 'innerSphere', weight: 0.2 },
    { id: 'ac5', techLevel: 2, base: 'innerSphere', weight: 0.15 },
    { id: 'laser', techLevel: 2, base: 'innerSphere', weight: 0.1 },
    { id: 'heatSinks', techLevel: 1, base: 'innerSphere', weight: 0.1 }
  ]
};
```

**Processing**:
```typescript
// Component technology breakdown
const componentTechBreakdown = {
  techLevel2: 0.3 + 0.15 + 0.2 + 0.15 + 0.1, // 90% = 0.9
  techLevel1: 0.1 // 10% = 0.1
};

// Base rating calculation
const baseRating = (2 × 0.9) + (1 × 0.1) = 1.8 + 0.1 = 1.9;

// Technology modifiers
const totalModifiers = 0; // No advanced technology

// Final rating
const adjustedRating = 1.9 + 0 = 1.9;
const finalRating = Math.round(adjustedRating) = 2;
```

**Output**:
```typescript
const shadowHawkTechRating = {
  rating: TechRating.INTRODUCTORY_C,
  numericRating: 2,
  primaryTechBase: TechnologyBase.INNER_SPHERE,
  techBaseComposition: {
    innerSphere: 100,
    clan: 0,
    mixed: 0,
    dominant: TechnologyBase.INNER_SPHERE
  },
  componentBreakdown: [
    { componentId: 'engine', techLevel: 2, techBase: 'innerSphere', weight: 0.3, modifiers: [] },
    // ... other components
  ],
  appliedModifiers: [],
  isCompatible: true,
  compatibilityIssues: []
};
```

### Example 2: Advanced Clan Omnimech

**Input**:
```typescript
const madcat = {
  tonnage: 75,
  techBase: 'clan',
  components: [
    { id: 'xlEngine', techLevel: 4, base: 'clan', weight: 0.25 },
    { id: 'endoStructure', techLevel: 3, base: 'clan', weight: 0.1 },
    { id: 'ferroFibrous', techLevel: 3, base: 'clan', weight: 0.15 },
    { id: 'erPpc', techLevel: 4, base: 'clan', weight: 0.2 },
    { id: 'lrm20', techLevel: 3, base: 'clan', weight: 0.15 },
    { id: 'doubleHeatSinks', techLevel: 3, base: 'clan', weight: 0.1 },
    { id: 'targetingComputer', techLevel: 4, base: 'clan', weight: 0.05 }
  ]
};
```

**Processing**:
```typescript
// Component technology breakdown
const componentTechBreakdown = {
  techLevel4: 0.25 + 0.2 + 0.05, // 50% = 0.5
  techLevel3: 0.1 + 0.15 + 0.15 + 0.1 // 50% = 0.5
};

// Base rating calculation
const baseRating = (4 × 0.5) + (3 × 0.5) = 2.0 + 1.5 = 3.5;

// Technology modifiers
const totalModifiers = 0.25 + 0.25 + 0.25 + 1.0 = 1.75; // XL, ES, FF, TC

// Clan technology bonus
const clanBonus = 0.5;

// Final rating
const adjustedRating = 3.5 + 1.75 + 0.5 = 5.75;
const clampedRating = Math.min(5.75, 5.0) = 5.0;
```

**Output**:
```typescript
const madcatTechRating = {
  rating: TechRating.EXPERIMENTAL_F,
  numericRating: 5,
  primaryTechBase: TechnologyBase.CLAN,
  techBaseComposition: {
    innerSphere: 0,
    clan: 100,
    mixed: 0,
    dominant: TechnologyBase.CLAN
  },
  componentBreakdown: [
    { componentId: 'xlEngine', techLevel: 4, techBase: 'clan', weight: 0.25,
      modifiers: [{ type: TechModifierType.ADVANCED_ENGINE, value: 0.25, reason: 'XL Engine' }] },
    // ... other components
  ],
  appliedModifiers: [
    { type: TechModifierType.ADVANCED_ENGINE, value: 0.25, reason: 'XL Engine', affectsCompatibility: false },
    { type: TechModifierType.ADVANCED_ELECTRONICS, value: 1.0, reason: 'Targeting Computer', affectsCompatibility: false }
  ],
  isCompatible: true,
  compatibilityIssues: []
};
```

### Example 3: Mixed Technology BattleMech

**Input**:
```typescript
const mixedDesign = {
  tonnage: 65,
  techBase: 'mixed',
  components: [
    { id: 'xlEngine', techLevel: 4, base: 'clan', weight: 0.3 },
    { id: 'structure', techLevel: 2, base: 'innerSphere', weight: 0.15 },
    { id: 'armor', techLevel: 2, base: 'innerSphere', weight: 0.2 },
    { id: 'gaussRifle', techLevel: 4, base: 'clan', weight: 0.15 },
    { id: 'mediumLasers', techLevel: 2, base: 'innerSphere', weight: 0.1 },
    { id: 'doubleHeatSinks', techLevel: 3, base: 'clan', weight: 0.1 }
  ]
};
```

**Processing**:
```typescript
// Technology base composition
const techBaseComposition = {
  clan: 0.3 + 0.15 + 0.1, // 55% = 0.55
  innerSphere: 0.15 + 0.2 + 0.1 // 45% = 0.45
};

// Component technology breakdown
const componentTechBreakdown = {
  techLevel4: 0.3 + 0.15, // 45% = 0.45
  techLevel3: 0.1, // 10% = 0.1
  techLevel2: 0.15 + 0.2 + 0.1 // 45% = 0.45
};

// Base rating calculation
const baseRating = (4 × 0.45) + (3 × 0.1) + (2 × 0.45) = 1.8 + 0.3 + 0.9 = 3.0;

// Technology modifiers
const totalModifiers = 0.25 + 0.25 + 0.25 = 0.75; // XL, Gauss, DHS

// Mixed technology penalty
const mixedPenalty = -0.5;

// Final rating
const adjustedRating = 3.0 + 0.75 - 0.5 = 3.25;
const finalRating = Math.round(adjustedRating) = 3;
```

**Output**:
```typescript
const mixedTechRating = {
  rating: TechRating.ADVANCED_E,
  numericRating: 3,
  primaryTechBase: TechnologyBase.MIXED_TECH,
  techBaseComposition: {
    innerSphere: 45,
    clan: 55,
    mixed: 0,
    dominant: TechnologyBase.CLAN
  },
  componentBreakdown: [
    { componentId: 'xlEngine', techLevel: 4, techBase: 'clan', weight: 0.3,
      modifiers: [{ type: TechModifierType.ADVANCED_ENGINE, value: 0.25, reason: 'XL Engine' }] },
    // ... other components
  ],
  appliedModifiers: [
    { type: TechModifierType.ADVANCED_ENGINE, value: 0.25, reason: 'XL Engine', affectsCompatibility: false },
    { type: TechModifierType.MIXED_TECH_PENALTY, value: -0.5, reason: 'Mixed Technology', affectsCompatibility: false }
  ],
  isCompatible: true,
  compatibilityIssues: []
};
```

---

## References

### Official BattleTech Rules
- **TechManual**: Pages 23-24 - Technology Level Classifications
- **Strategic Operations**: Pages 60-62 - Technology Availability and Costs
- **Campaign Operations**: Pages 134-136 - Technology Acquisition

### Related Documentation
- Technology Base Integration Specification
- Era Temporal System Specification
- Construction Rules Core Specification

---

## Changelog

### Version 1.0 (2025-11-28)
- Initial specification
- Comprehensive tech rating calculation formulas
- Technology base variant rules
- Mixed technology handling
- Validation and compatibility rules