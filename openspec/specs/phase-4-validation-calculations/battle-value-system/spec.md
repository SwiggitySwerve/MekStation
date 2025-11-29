# Battle Value System Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2025-11-28
**Dependencies**: Phase 1-3 specifications (Core Entity Types, Construction Systems, Equipment Systems)
**Affects**: Construction Rules Core, Unit Entity Model

---

## Overview

### Purpose
The Battle Value (BV) system calculates a numerical rating of a BattleMech's combat effectiveness, providing a standardized way to balance forces in BattleTech gameplay scenarios.

### Scope
**In Scope:**
- Defensive BV calculation (armor, structure, movement)
- Offensive BV calculation (weapons, ammunition)
- Heat management modifiers
- Special equipment adjustments
- Technology level multipliers

**Out of Scope:**
- Scenario-specific BV adjustments
- Pilot skill modifications
- Force composition balancing

### Key Concepts
- **Defensive Battle Value (DBV)**: Combat value derived from survivability factors
- **Offensive Battle Value (OBV)**: Combat value derived from weapon systems
- **Battle Value (BV)**: Combined combat effectiveness rating
- **BV Modifier**: Multiplicative adjustments for special equipment
- **Speed Factor**: Movement-based defensive multiplier

---

## Requirements

### Requirement: Calculate Defensive Battle Value
The system SHALL calculate DBV from armor, internal structure, and movement factors.

**Rationale**: Defensive capabilities represent a unit's ability to absorb damage and avoid being hit.

**Priority**: Critical

#### Scenario: Standard BattleMech DBV calculation
**GIVEN** a 70-ton BattleMech with standard armor, standard structure, and 5/8 movement
**WHEN** calculating defensive battle value
**THEN** DBV = (Armor Points × 1.0) + (IS Points × 2.5) + (Speed Factor × Movement Points)
**AND** Speed Factor = ((Walk MP + 1) × 10)

#### Scenario: XL Engine defensive penalty
**GIVEN** a BattleMech equipped with an XL engine
**WHEN** calculating defensive battle value
**THEN** apply 0.8 multiplier to final DBV
**AND** reflect reduced survivability due to larger side torso sections

#### Scenario: Endo Steel structure modification
**GIVEN** a BattleMech with Endo Steel internal structure
**WHEN** calculating defensive battle value
**THEN** apply 1.05 multiplier to structure component
**AND** reflect increased critical slot vulnerability

### Requirement: Calculate Offensive Battle Value
The system SHALL calculate OBV from weapon systems and ammunition based on damage, range, and special abilities.

**Rationale**: Offensive capabilities determine a unit's damage output potential across different engagement ranges.

**Priority**: Critical

#### Scenario: Direct-fire weapon OBV calculation
**GIVEN** a Medium Laser (5 damage, medium range)
**WHEN** calculating offensive battle value
**THEN** OBV = Damage × (Range Bracket Modifier + Special Abilities Modifier)
**AND** Range Bracket Modifier = (Short × 1.0) + (Medium × 0.75) + (Long × 0.5)

#### Scenario: Missile weapon OBV calculation
**GIVEN** an LRM-20 system (20 damage, long range, indirect fire)
**WHEN** calculating offensive battle value
**THEN** OBV = Damage × Range Factor × Indirect Fire Modifier
**AND** apply cluster hit spread penalty of 0.8

#### Scenario: PPC with abilities
**GIVEN** a PPC (10 damage, long range, heat, target modifiers)
**WHEN** calculating offensive battle value
**THEN** OBV = (10 × 1.0 × 1.2) + Heat Penalty + Target Modifier Bonus
**AND** include -1 to-hit modifier as offensive bonus

### Requirement: Apply Heat Management Modifications
The system SHALL modify battle value based on heat generation and dissipation capabilities.

**Rationale**: Heat management directly impacts sustained combat effectiveness and should be reflected in BV calculations.

**Priority**: High

#### Scenario: Heat-efficient designs
**GIVEN** a BattleMech with 20% more heat dissipation than weapon heat generation
**WHEN** calculating final battle value
**THEN** apply 1.1 multiplier to offensive component
**AND** reward designs with sustainable heat profiles

#### Scenario: Heat-critical designs
**GIVEN** a BattleMech generating 50% more heat than it can dissipate
**WHEN** calculating final battle value
**THEN** apply 0.85 multiplier to offensive component
**AND** penalize designs with severe heat limitations

### Requirement: Calculate Final Battle Value
The system SHALL combine defensive and offensive components into final BV with appropriate modifiers.

**Rationale**: Final BV represents the complete combat effectiveness of the unit.

**Priority**: Critical

#### Scenario: Standard BV combination
**GIVEN** DBV = 1000, OBV = 800, standard equipment
**WHEN** calculating final battle value
**THEN** BV = (DBV + OBV) × 1.0
**AND** result = 1800

#### Scenario: ECM-equipped design
**GIVEN** a BattleMech with Guardian ECM system
**WHEN** calculating final battle value
**THEN** apply 1.05 equipment modifier
**AND** reflect electronic warfare capabilities

#### Scenario: Advanced technology modifier
**GIVEN** a Clan technology BattleMech
**WHEN** calculating final battle value
**THEN** apply 1.2 technology modifier
**AND** reflect superior performance characteristics

### Requirement: Validate Battle Value Results
The system SHALL validate calculated BV values against expected ranges and identify calculation errors.

**Rationale**: BV calculations must be consistent and accurate for game balance purposes.

**Priority**: High

#### Scenario: BV range validation
**GIVEN** a 25-ton light BattleMech
**WHEN** validating calculated battle value
**THEN** BV must be between 300 and 1200
**AND** flag values outside this range as potential errors

#### Scenario: Component validation
**GIVEN** a BattleMech with OBV greater than 80% of total BV
**WHEN** validating battle value distribution
**THEN** issue warning about glass cannon design
**AND** suggest review of defensive allocation

---

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * Battle Value calculation components and results
 */
interface IBattleValueCalculation {
  /** Defensive battle value from armor, structure, and movement */
  readonly defensiveBV: number;

  /** Offensive battle value from weapons and equipment */
  readonly offensiveBV: number;

  /** Heat management efficiency modifier */
  readonly heatModifier: number;

  /** Technology level multiplier */
  readonly techModifier: number;

  /** Special equipment modifiers */
  readonly equipmentModifiers: IBattleValueModifiers;

  /** Final calculated battle value */
  readonly finalBV: number;

  /** Battle value breakdown for analysis */
  readonly breakdown: IBattleValueBreakdown;
}

/**
 * Battle value modifiers from special equipment
 */
interface IBattleValueModifiers {
  /** Electronic warfare systems multiplier */
  readonly ewMultiplier: number;

  /** Advanced targeting systems multiplier */
  readonly targetingMultiplier: number;

  /** Physical weapon systems multiplier */
  readonly physicalMultiplier: number;

  /** Anti-infantry systems multiplier */
  readonly antiInfantryMultiplier: number;

  /** Combined equipment modifier */
  readonly combinedModifier: number;
}

/**
 * Detailed breakdown of battle value calculation
 */
interface IBattleValueBreakdown {
  /** Armor contribution to defensive BV */
  readonly armorBV: number;

  /** Internal structure contribution to defensive BV */
  readonly structureBV: number;

  /** Movement contribution to defensive BV */
  readonly movementBV: number;

  /** Weapon contributions by range bracket */
  readonly shortRangeBV: number;
  readonly mediumRangeBV: number;
  readonly longRangeBV: number;
  readonly extremeRangeBV: number;

  /** Equipment and system contributions */
  readonly equipmentBV: number;

  /** Heat management adjustments */
  readonly heatAdjustment: number;
}

/**
 * Battle value calculation configuration
 */
interface IBattleValueConfig {
  /** Technology level multipliers */
  readonly techMultipliers: {
    readonly innerSphere: number;
    readonly clan: number;
    readonly mixed: number;
  };

  /** Heat efficiency thresholds and modifiers */
  readonly heatEfficiency: {
    readonly efficientThreshold: number;
    readonly efficientModifier: number;
    readonly criticalThreshold: number;
    readonly criticalModifier: number;
  };

  /** Movement speed factors */
  readonly speedFactors: {
    readonly walkingBase: number;
    readonly runningMultiplier: number;
    readonly jumpingMultiplier: number;
  };
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `defensiveBV` | `number` | Yes | Defensive battle value | >= 0 | 0 |
| `offensiveBV` | `number` | Yes | Offensive battle value | >= 0 | 0 |
| `heatModifier` | `number` | Yes | Heat management modifier | > 0 | 1.0 |
| `techModifier` | `number` | Yes | Technology level modifier | > 0 | 1.0 |
| `finalBV` | `number` | Yes | Final calculated battle value | >= 0 | 0 |

### Type Constraints

- `defensiveBV` MUST be >= 0 and <= 10000
- `offensiveBV` MUST be >= 0 and <= 15000
- `heatModifier` MUST be between 0.5 and 1.5
- `techModifier` MUST be between 0.8 and 1.5
- When `finalBV < 100`, system SHALL issue warning about potentially incorrect calculation
- When `finalBV > 20000`, system SHALL validate for calculation errors

---

## Calculation Formulas

### Defensive Battle Value

**Formula**:
```
DBV = (Armor Points × 1.0) + (Structure Points × 2.5) + (Movement Points × Speed Factor)
```

**Where**:
- `Armor Points` = Total armor points on all locations
- `Structure Points` = Total internal structure points
- `Movement Points` = Walking MP
- `Speed Factor` = ((Walking MP + 1) × 10)

**Example**:
```
Input: Armor = 160, Structure = 131, Walking MP = 5
Calculation: DBV = (160 × 1.0) + (131 × 2.5) + (5 × ((5 + 1) × 10))
DBV = 160 + 327.5 + (5 × 60) = 160 + 327.5 + 300 = 787.5
Output: DBV = 787.5
```

**Special Cases**:
- XL Engine: Apply 0.8 multiplier to final DBV
- Compact Engine: Apply 1.1 multiplier to final DBV
- Endo Steel: Apply 1.05 multiplier to structure component

**Rounding Rules**:
- Round structure contribution to nearest 0.5
- Round movement contribution to nearest 5
- Round final DBV to nearest whole number

### Offensive Battle Value

**Formula**:
```
Weapon BV = Damage × (Range Factor + Special Modifiers)
OBV = Σ(Weapon BV) + Equipment BV
```

**Where**:
- `Damage` = Base weapon damage
- `Range Factor` = (Short × 1.0) + (Medium × 0.75) + (Long × 0.5) + (Extreme × 0.25)
- `Special Modifiers` = Heat penalty, ability bonuses, special effects

**Example**:
```
Input: Medium Laser (5 damage), ranges: S=3, M=6, L=9, N/A extreme
Calculation: Range Factor = (1.0 × 1.0) + (0.75 × 1.0) = 1.75
Weapon BV = 5 × 1.75 = 8.75
OBV contribution = 9 (rounded)
Output: Medium Laser BV = 9
```

**Special Cases**:
- Missile weapons: Apply 0.8 cluster hit modifier
- PPC-class weapons: Add +2 for target modifiers
- Ultra/AC weapons: Add +1 for rapid fire capability
- LB-X weapons: Add +0.5 for cluster ammunition option

### Heat Management Modifier

**Formula**:
```
Heat Ratio = Total Weapon Heat / Total Heat Dissipation
Heat Modifier =
  Heat Ratio >= 1.2: 0.85
  1.0 <= Heat Ratio < 1.2: 1.0
  0.8 <= Heat Ratio < 1.0: 1.1
  Heat Ratio < 0.8: 1.05
```

**Example**:
```
Input: Weapon Heat = 30, Heat Dissipation = 20
Calculation: Heat Ratio = 30 / 20 = 1.5
Heat Modifier = 0.85 (heat-critical penalty)
Output: Apply 0.85 multiplier to offensive BV
```

### Final Battle Value

**Formula**:
```
BV = (DBV + (OBV × Heat Modifier) + Equipment BV) × Tech Modifier × Equipment Modifiers
```

**Example**:
```
Input: DBV = 1000, OBV = 800, Heat Modifier = 1.0, Tech Modifier = 1.2
Calculation: BV = (1000 + (800 × 1.0)) × 1.2 = 1800 × 1.2 = 2160
Output: Final BV = 2160
```

---

## Validation Rules

### Validation: BV Component Ranges

**Rule**: Each BV component must be within expected ranges for unit size and technology level.

**Severity**: Error

**Condition**:
```typescript
const validateBVComponents = (calc: IBattleValueCalculation, tonnage: number) => {
  const expectedRanges = getExpectedBVRanges(tonnage);

  if (calc.defensiveBV < expectedRanges.minDefensive ||
      calc.defensiveBV > expectedRanges.maxDefensive) {
    throw new ValidationError(`Defensive BV ${calc.defensiveBV} outside expected range [${expectedRanges.minDefensive}, ${expectedRanges.maxDefensive}]`);
  }

  if (calc.offensiveBV < expectedRanges.minOffensive ||
      calc.offensiveBV > expectedRanges.maxOffensive) {
    throw new ValidationError(`Offensive BV ${calc.offensiveBV} outside expected range [${expectedRanges.minOffensive}, ${expectedRanges.maxOffensive}]`);
  }
};
```

**Error Message**: "Battle value components are outside expected ranges for unit tonnage"

**User Action**: Review component calculations and equipment configurations

### Validation: Total BV Range

**Rule**: Final BV must be reasonable for unit tonnage and technology level.

**Severity**: Warning

**Condition**:
```typescript
const validateTotalBV = (finalBV: number, tonnage: number, techLevel: TechLevel) => {
  const bvPerTon = finalBV / tonnage;
  const expectedBVPerTon = getExpectedBVPerTon(techLevel);

  if (bvPerTon > expectedBVPerTon * 2) {
    return { valid: false, message: `BV per ton (${bvPerTon.toFixed(1)}) is unusually high` };
  }

  if (bvPerTon < expectedBVPerTon * 0.5) {
    return { valid: false, message: `BV per ton (${bvPerTon.toFixed(1)}) is unusually low` };
  }

  return { valid: true };
};
```

**Error Message**: "Final battle value is unusually high/low for unit configuration"

**User Action**: Verify all equipment and weapon configurations are correct

### Validation: Heat Calculation Consistency

**Rule**: Heat generation and dissipation calculations must be consistent with construction rules.

**Severity**: Error

**Condition**:
```typescript
const validateHeatConsistency = (calc: IBattleValueCalculation, unit: IBattleMech) => {
  const expectedHeatDissipation = calculateHeatDissipation(unit);
  const actualHeatDissipation = extractHeatDissipation(calc);

  if (expectedHeatDissipation !== actualHeatDissipation) {
    throw new ValidationError(`Heat dissipation mismatch: expected ${expectedHeatDissipation}, got ${actualHeatDissipation}`);
  }
};
```

**Error Message**: "Heat dissipation calculation does not match construction rules"

**User Action**: Reconcile heat calculation differences between systems

---

## Technology Base Variants

### Inner Sphere Implementation

**Differences from base specification**:
- Tech Multiplier: 1.0 (baseline)
- Heat Modifier Thresholds: Efficient at < 0.9 ratio, Critical at > 1.3 ratio
- Weapon Special Modifiers: Reduced for advanced weapons

**Special Rules**:
- Double Heat Sinks: Count as 2 heat dissipation each
- XL Engines: Apply 0.8 defensive multiplier
- Gauss Rifles: Add +10 BV for explosive ammunition vulnerability

**Example**:
```typescript
const isBVConfig: IBattleValueConfig = {
  techMultipliers: {
    innerSphere: 1.0,
    clan: 1.2,
    mixed: 1.1
  },
  heatEfficiency: {
    efficientThreshold: 0.9,
    efficientModifier: 1.1,
    criticalThreshold: 1.3,
    criticalModifier: 0.85
  }
};
```

### Clan Implementation

**Differences from base specification**:
- Tech Multiplier: 1.2 (superior technology)
- Heat Modifier Thresholds: Efficient at < 0.8 ratio, Critical at > 1.1 ratio
- Weapon Special Modifiers: Enhanced for advanced targeting

**Special Rules**:
- Double Heat Sinks: Count as 2 heat dissipation each, +2 critical slots
- XL Engines: Standard configuration (no defensive penalty)
- Targeting Computers: Add +5% to offensive BV

**Example**:
```typescript
const clanBVConfig: IBattleValueConfig = {
  techMultipliers: {
    innerSphere: 0.8,
    clan: 1.0,
    mixed: 0.9
  },
  heatEfficiency: {
    efficientThreshold: 0.8,
    efficientModifier: 1.15,
    criticalThreshold: 1.1,
    criticalModifier: 0.9
  }
};
```

### Mixed Tech Rules

**When unit tech base is Mixed**:
- Apply average of IS and Clan modifiers: 1.1 tech multiplier
- Use more restrictive heat thresholds from both systems
- Calculate component BV using appropriate tech base rules

**Compatibility Rules**:
- IS weapons with Clan structure: Use IS weapon calculations, Clan structure calculations
- Clan weapons with IS structure: Use Clan weapon calculations, IS structure calculations
- Mixed equipment: Apply weighted average based on BV contribution

---

## Dependencies

### Depends On
- **Core Entity Types**: Base interfaces for all components
- **Construction Rules Core**: Tonnage, critical slots, and equipment placement
- **Equipment Systems**: Weapon data, damage values, and special abilities
- **Heat Sink System**: Heat dissipation calculations
- **Movement System**: Speed and movement capabilities

### Used By
- **Construction Rules Core**: BV calculation as final construction step
- **Unit Entity Model**: BV property for complete units
- **Scenario Balance System**: Force comparison and balancing
- **Import/Export Formats**: BV preservation in saved units

### Construction Sequence
1. Basic construction (engine, structure, armor) must be completed
2. Equipment and weapons must be placed and validated
3. Heat calculations must be finalized
4. Battle Value calculated as final step
5. BV used for unit validation and scenario balance

---

## Implementation Notes

### Performance Considerations
- Cache weapon BV calculations for repeated equipment types
- Use lookup tables for range factor calculations
- Pre-calculate technology modifiers to avoid repeated computation

### Edge Cases
- **Zero BV Equipment**: Handle equipment with no BV contribution (life support, sensors)
- **Negative Modifiers**: Process penalties for ammunition explosions, vulnerable components
- **Extreme Values**: Validate calculations for very high or low BV units

### Common Pitfalls
- **Pitfall**: Double-counting equipment in BV calculation
  - **Solution**: Clear separation between defensive, offensive, and equipment components
- **Pitfall**: Incorrect heat modifier application
  - **Solution**: Apply heat modifier only to offensive component, not total BV
- **Pitfall**: Rounding errors in component calculations
  - **Solution**: Use consistent rounding rules throughout calculation process

---

## Examples

### Example 1: Standard Inner Sphere Medium BattleMech

**Input**:
```typescript
const hunchback = {
  tonnage: 50,
  armor: 128,
  structure: 85,
  walkingMP: 4,
  techBase: 'innerSphere',
  weapons: [
    { name: 'AC/20', damage: 20, ranges: { short: 3, medium: 6, long: 9 } },
    { name: 'Medium Laser', damage: 5, ranges: { short: 3, medium: 6, long: 9 } }
  ],
  heatDissipation: 10
};
```

**Processing**:
```typescript
// Defensive BV
const speedFactor = (hunchback.walkingMP + 1) * 10; // (4 + 1) * 10 = 50
const defensiveBV = (128 * 1.0) + (85 * 2.5) + (4 * 50); // 128 + 212.5 + 200 = 540.5

// Offensive BV
const ac20BV = 20 * ((1.0 * 1.0) + (0.75 * 1.0) + (0.5 * 1.0)); // 20 * 2.25 = 45
const medlaserBV = 5 * ((1.0 * 1.0) + (0.75 * 1.0)); // 5 * 1.75 = 8.75
const offensiveBV = Math.round(45) + Math.round(8.75); // 45 + 9 = 54

// Heat Ratio (simplified - would include all weapon heat)
const heatRatio = 25 / 10; // 2.5 (heat critical)
const heatModifier = 0.85;

// Final BV
const finalBV = Math.round((540.5 + (54 * 0.85)) * 1.0); // (540.5 + 45.9) = 586.4
```

**Output**:
```typescript
const hunchbackBV = {
  defensiveBV: 541,
  offensiveBV: 54,
  heatModifier: 0.85,
  techModifier: 1.0,
  finalBV: 586,
  breakdown: {
    armorBV: 128,
    structureBV: 213,
    movementBV: 200,
    shortRangeBV: 45,
    mediumRangeBV: 9,
    equipmentBV: 0,
    heatAdjustment: -9
  }
};
```

### Example 2: Clan Omnimech

**Input**:
```typescript
const madcat = {
  tonnage: 75,
  armor: 208,
  structure: 119,
  walkingMP: 5,
  techBase: 'clan',
  weapons: [
    { name: 'ER PPC', damage: 15, ranges: { short: 7, medium: 15, long: 23 } },
    { name: 'LRM-20', damage: 20, ranges: { short: 7, medium: 14, long: 21, extreme: 28 } }
  ],
  heatDissipation: 20,
  targetingComputer: true
};
```

**Processing**:
```typescript
// Defensive BV
const speedFactor = (madcat.walkingMP + 1) * 10; // (5 + 1) * 10 = 60
const defensiveBV = (208 * 1.0) + (119 * 2.5) + (5 * 60); // 208 + 297.5 + 300 = 805.5

// Offensive BV
const erppcBV = 15 * ((1.0 * 1.0) + (0.75 * 1.0) + (0.5 * 1.0)) + 3; // 15 * 2.25 + 3 = 37.875
const lrm20BV = 20 * ((0.5 * 0.25) + (0.75 * 1.0) + (0.5 * 1.0) + (0.25 * 1.0)) * 0.8; // 20 * 1.875 * 0.8 = 30
const offensiveBV = Math.round(37.875) + Math.round(30); // 38 + 30 = 68

// Heat Ratio (simplified)
const heatRatio = 30 / 20; // 1.5 (heat critical)
const heatModifier = 0.85;

// Equipment Modifiers
const targetingComputerMod = 1.05;

// Final BV
const finalBV = Math.round((805.5 + (68 * 0.85)) * 1.2 * 1.05); // (805.5 + 57.8) = 863.3
finalBV = Math.round(863.3 * 1.2 * 1.05) // 1088
```

**Output**:
```typescript
const madcatBV = {
  defensiveBV: 806,
  offensiveBV: 68,
  heatModifier: 0.85,
  techModifier: 1.2,
  equipmentModifiers: {
    targetingMultiplier: 1.05,
    combinedModifier: 1.05
  },
  finalBV: 1088,
  breakdown: {
    armorBV: 208,
    structureBV: 298,
    movementBV: 300,
    shortRangeBV: 38,
    longRangeBV: 30,
    equipmentBV: 0,
    heatAdjustment: -12
  }
};
```

---

## References

### Official BattleTech Rules
- **TechManual**: Pages 194-199 - Battle Value Calculation Rules
- **Total Warfare**: Pages 275-277 - Battle Value in Gameplay
- **Strategic Operations**: Pages 162-165 - Alternative BV Systems

### Related Documentation
- Battle Value Calculator Tool (MegaMek)
- CGL Battle Value Calculation Guidelines
- Historical BV Calculation Errata

---

## Changelog

### Version 1.0 (2025-11-28)
- Initial specification
- Comprehensive BV calculation formulas
- Technology base variants
- Validation rules and examples