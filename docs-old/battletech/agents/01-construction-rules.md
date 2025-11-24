# Construction Rules - BattleTech Rules

## 📋 **Metadata**
- **Category**: Construction Rules
- **Source**: TechManual / Implementation
- **Last Updated**: [Current Date]
- **Related Files**:
  - Code: `constants/BattleTechConstructionRules.ts`
  - Docs: `docs/battletech/battletech_construction_guide.md`
- **Related Rules**:
  - [Validation Rules](02-validation-rules.md)
  - [Calculations](06-calculations.md)
  - [Advanced Systems](08-advanced-systems.md)

---

## 🔍 **Overview**

This document codifies the core BattleTech construction rules for BattleMech design, including internal structure, armor allocation, engine systems, movement calculations, and weight limits. These rules form the foundation of all BattleMech construction and must be strictly followed.

---

## 📜 **Core Rules**

### **Internal Structure Weight**

- **Type**: Calculation
- **Priority**: Critical
- **Source**: TechManual / `constants/BattleTechConstructionRules.ts`
- **Description**: Internal structure weight is calculated as a percentage of total mech tonnage. Standard structure uses 10% of tonnage, while Endo Steel uses 5% (rounded up to nearest 0.5 tons).
- **Formula**:
  - Standard: `structure_weight = tonnage * 0.10`
  - Endo Steel: `structure_weight = ROUND_UP(tonnage * 0.05, 0.5)`
- **Code Reference**:
  ```typescript
  // File: constants/BattleTechConstructionRules.ts
  // Function: calculateStructureWeight()
  export function calculateStructureWeight(tonnage: number, structureType: string): number {
    const baseWeight = tonnage * 0.1; // 10% of tonnage
    const multiplier = STRUCTURE_WEIGHT_MULTIPLIER[structureType as keyof typeof STRUCTURE_WEIGHT_MULTIPLIER] || 1.0;
    return baseWeight * multiplier;
  }
  ```
- **Examples**:
  - 50-ton mech (Standard): 5.0 tons structure
  - 50-ton mech (Endo Steel): 2.5 tons structure
  - 75-ton mech (Standard): 7.5 tons structure
  - 75-ton mech (Endo Steel): 4.0 tons structure (rounded up from 3.75)
- **Exceptions**: None
- **Related Rules**: [Structure Point Distribution](#structure-point-distribution), [Advanced Systems](08-advanced-systems.md)

---

### **Structure Point Distribution**

- **Type**: Calculation
- **Priority**: Critical
- **Source**: TechManual / `docs/battletech/battletech_construction_guide.md`
- **Description**: Structure points are distributed across mech locations based on tonnage. Head always has 3 points. Other locations use proportional formulas.
- **Formula**:
  - Head: `3` (constant)
  - Center Torso: `ROUND_UP(3.2 * (tonnage / 10))`
  - Left/Right Torso: `ROUND_UP(2.1 * (tonnage / 10))` each
  - Left/Right Arm: `ROUND_UP(1.7 * (tonnage / 10))` each
  - Left/Right Leg: `ROUND_UP(2.1 * (tonnage / 10))` each
- **Code Reference**:
  ```typescript
  // File: utils/internalStructureTable.ts
  // INTERNAL_STRUCTURE_TABLE contains pre-calculated values
  ```
- **Examples**:
  - 25-ton mech: Head=3, CT=8, Torso=6, Arm=4, Leg=6
  - 50-ton mech: Head=3, CT=16, Torso=12, Arm=8, Leg=12
  - 75-ton mech: Head=3, CT=24, Torso=18, Arm=13, Leg=18
- **Exceptions**: Head structure is always 3, regardless of tonnage
- **Related Rules**: [Armor Maximum Rules](#armor-maximum-rules)

---

### **Armor Maximum Rules**

- **Type**: Constraint
- **Priority**: Critical
- **Source**: TechManual / `constants/BattleTechConstructionRules.ts`
- **Description**: Maximum armor points per location follow a 2:1 ratio with structure points, except the head which has a fixed maximum of 9 points.
- **Formula**:
  - Head: `armor <= 9` (fixed)
  - Other locations: `armor <= (structure_points * 2)`
- **Code Reference**:
  ```typescript
  // File: constants/BattleTechConstructionRules.ts
  // Function: calculateMaxArmorPoints()
  export function calculateMaxArmorPoints(tonnage: number): number {
    return tonnage * 2;
  }
  ```
- **Examples**:
  - 50-ton mech head: Maximum 9 armor points
  - 50-ton mech center torso (16 structure): Maximum 32 armor points
  - 50-ton mech arm (8 structure): Maximum 16 armor points
- **Exceptions**: Head has fixed 9-point maximum regardless of structure
- **Related Rules**: [Armor Weight Calculation](#armor-weight-calculation), [Validation Rules](02-validation-rules.md)

---

### **Armor Weight Calculation**

- **Type**: Calculation
- **Priority**: Critical
- **Source**: TechManual / `constants/BattleTechConstructionRules.ts`
- **Description**: Armor weight is calculated by dividing total armor points by the armor type's efficiency rating (points per ton).
- **Formula**: `armor_weight = total_armor_points / points_per_ton`
- **Code Reference**:
  ```typescript
  // File: constants/BattleTechConstructionRules.ts
  // Function: calculateArmorWeight()
  export function calculateArmorWeight(armorPoints: number, armorType: string): number {
    const pointsPerTon = ARMOR_POINTS_PER_TON[armorType as keyof typeof ARMOR_POINTS_PER_TON] || 16;
    return armorPoints / pointsPerTon;
  }
  ```
- **Examples**:
  - 160 points Standard Armor: 160 / 16 = 10.0 tons
  - 160 points Ferro-Fibrous: 160 / 17.92 = 8.93 tons
  - 160 points Heavy Ferro-Fibrous: 160 / 19.2 = 8.33 tons
- **Exceptions**: None
- **Related Rules**: [Armor Types](08-advanced-systems.md#armor-types)

---

### **Engine Weight Calculation**

- **Type**: Calculation
- **Priority**: Critical
- **Source**: TechManual / `constants/BattleTechConstructionRules.ts`
- **Description**: Engine weight is calculated based on engine rating and type, with different multipliers for XL, Light, Compact, and XXL engines.
- **Formula**:
  - Base: `baseWeight = CEIL(engineRating / 25) * 0.5`
  - Standard: `weight = baseWeight`
  - XL: `weight = baseWeight * 0.5`
  - Light: `weight = baseWeight * 0.75`
  - Compact: `weight = baseWeight * 1.5`
  - XXL: `weight = baseWeight * 0.33`
- **Code Reference**:
  ```typescript
  // File: constants/BattleTechConstructionRules.ts
  // Function: calculateEngineWeight()
  export function calculateEngineWeight(engineRating: number, engineType: string): number {
    if (engineRating <= 0) return 0;

    let baseWeight: number;
    if (engineRating <= 100) {
      baseWeight = Math.ceil(engineRating / 25) * 0.5;
    } else if (engineRating <= 400) {
      baseWeight = Math.ceil(engineRating / 25) * 0.5;
    } else {
      baseWeight = Math.ceil(engineRating / 25) * 0.5;
    }

    switch (engineType) {
      case 'Standard': return baseWeight;
      case 'XL': return baseWeight * 0.5;
      case 'Light': return baseWeight * 0.75;
      case 'Compact': return baseWeight * 1.5;
      case 'XXL': return baseWeight * 0.33;
      default: return baseWeight;
    }
  }
  ```
- **Examples**:
  - 250 Standard: 5.0 tons
  - 250 XL: 2.5 tons
  - 250 Light: 3.75 tons
  - 250 Compact: 7.5 tons
- **Exceptions**: Engine rating cannot exceed 400
- **Related Rules**: [Engine Heat Sink Capacity](#engine-heat-sink-capacity), [Movement Calculations](#movement-calculations)

---

### **Engine Heat Sink Capacity**

- **Type**: Calculation
- **Priority**: Critical
- **Source**: TechManual / `constants/BattleTechConstructionRules.ts`
- **Description**: Engine provides free heat sink capacity based on rating. Formula is engine rating / 25 (rounded down), with NO minimum requirement.
- **Formula**: `engine_heat_sinks = FLOOR(engine_rating / 25)`
- **Code Reference**:
  ```typescript
  // File: constants/BattleTechConstructionRules.ts
  // Function: calculateEngineHeatSinks()
  export function calculateEngineHeatSinks(engineRating: number): number {
    if (engineRating <= 0) return 0;
    return Math.floor(engineRating / 25);
  }
  ```
- **Examples**:
  - 100 rating: 4 heat sinks (100 / 25 = 4)
  - 200 rating: 8 heat sinks (200 / 25 = 8)
  - 250 rating: 10 heat sinks (250 / 25 = 10)
  - 300 rating: 12 heat sinks (300 / 25 = 12)
- **Exceptions**: No minimum - engines below 250 rating provide fewer than 10 heat sinks
- **Related Rules**: [Minimum Total Heat Sinks](#minimum-total-heat-sinks), [Heat Sink Rules](08-advanced-systems.md#heat-sinks)

---

### **Minimum Total Heat Sinks**

- **Type**: Constraint
- **Priority**: Critical
- **Source**: TechManual / `constants/BattleTechConstructionRules.ts`
- **Description**: Total heat sinks (engine + external) must meet minimum of 10 OR number of heat-generating weapons, whichever is higher. This is separate from engine capacity.
- **Formula**: `minimum_total = MAX(10, heat_generating_weapons)`
- **Code Reference**:
  ```typescript
  // File: constants/BattleTechConstructionRules.ts
  // Function: calculateMinimumTotalHeatSinks()
  export function calculateMinimumTotalHeatSinks(heatGeneratingWeapons: number): number {
    return Math.max(10, heatGeneratingWeapons);
  }
  ```
- **Examples**:
  - 5 heat-generating weapons: Minimum 10 total heat sinks
  - 15 heat-generating weapons: Minimum 15 total heat sinks
  - 8 heat-generating weapons: Minimum 10 total heat sinks
- **Exceptions**: None
- **Related Rules**: [Engine Heat Sink Capacity](#engine-heat-sink-capacity), [Validation Rules](02-validation-rules.md)

---

### **Movement Calculations**

- **Type**: Calculation
- **Priority**: Critical
- **Source**: TechManual / `constants/BattleTechConstructionRules.ts`
- **Description**: Walking movement points are calculated by dividing engine rating by tonnage. Running MP is 1.5x walking MP (rounded down).
- **Formula**:
  - Walking MP: `walkMP = FLOOR(engine_rating / tonnage)`
  - Running MP: `runMP = FLOOR(walkMP * 1.5)`
- **Code Reference**:
  ```typescript
  // File: constants/BattleTechConstructionRules.ts
  // Function: calculateWalkingMP(), calculateRunningMP()
  export function calculateWalkingMP(engineRating: number, tonnage: number): number {
    if (tonnage <= 0) return 0;
    return Math.floor(engineRating / tonnage);
  }

  export function calculateRunningMP(walkingMP: number): number {
    return Math.floor(walkingMP * 1.5);
  }
  ```
- **Examples**:
  - 50-ton mech, 250 engine: Walk 5, Run 7 (5 * 1.5 = 7.5, floor = 7)
  - 75-ton mech, 300 engine: Walk 4, Run 6 (4 * 1.5 = 6)
  - 100-ton mech, 300 engine: Walk 3, Run 4 (3 * 1.5 = 4.5, floor = 4)
- **Exceptions**: Engine rating cannot exceed 400
- **Related Rules**: [Engine Weight Calculation](#engine-weight-calculation), [Validation Rules](02-validation-rules.md)

---

### **Total Weight Limit**

- **Type**: Constraint
- **Priority**: Critical
- **Source**: TechManual / `services/validation/WeightRulesValidator.ts`
- **Description**: Total weight of all components must not exceed mech tonnage. Components include structure, armor, engine, equipment, weapons, and ammunition.
- **Formula**: `total_weight = structure + armor + engine + equipment + weapons + ammo`
- **Validation**: `total_weight <= mech_tonnage`
- **Code Reference**:
  ```typescript
  // File: services/validation/WeightRulesValidator.ts
  // Function: validateWeightLimits()
  ```
- **Examples**:
  - 50-ton mech: All components must sum to <= 50.0 tons
  - 100-ton mech: All components must sum to <= 100.0 tons
- **Exceptions**: None - this is an absolute limit
- **Related Rules**: [All weight calculation rules](#), [Validation Rules](02-validation-rules.md)

---

## 🛠️ **Implementation Details**

### **Code Location**

**Primary Implementation:**
- File: `constants/BattleTechConstructionRules.ts`
- Purpose: Single source of truth for all construction rule constants and calculations
- Lines: 1-276

**Supporting Code:**
- File: `services/validation/WeightRulesValidator.ts`
- Purpose: Weight limit validation
- File: `services/validation/StructureRulesValidator.ts`
- Purpose: Structure validation
- File: `services/validation/ArmorRulesValidator.ts`
- Purpose: Armor validation
- File: `services/validation/MovementRulesValidator.ts`
- Purpose: Movement validation

### **Validation Logic**

All construction rules are validated through the `ConstructionRulesValidator` service:

```typescript
// Validation flow
1. Structure weight calculated and validated
2. Structure points distributed and validated
3. Armor maximums checked
4. Armor weight calculated
5. Engine weight calculated
6. Engine heat sink capacity calculated
7. Movement points calculated
8. Total weight validated against tonnage
```

### **Edge Cases**

1. **Low Tonnage Mechs (20-25 tons)**
   - Description: Very small mechs have limited structure points
   - Handling: Head always 3 points, other locations scale proportionally
   - Example: 20-ton mech has 2.0 tons structure, 6 CT structure points

2. **High Tonnage Mechs (95-100 tons)**
   - Description: Maximum tonnage mechs have maximum structure
   - Handling: All formulas scale linearly
   - Example: 100-ton mech has 10.0 tons structure, 32 CT structure points

3. **Low Engine Ratings (< 250)**
   - Description: Engines below 250 rating provide fewer than 10 heat sinks
   - Handling: No minimum enforced on engine capacity, but total minimum still applies
   - Example: 200 rating engine provides 8 heat sinks, but mech still needs 10 total

---

## ⚡ **Quick Reference**

### **Formulas**

| Rule | Formula | Notes |
|------|---------|-------|
| Structure Weight (Standard) | `tonnage * 0.10` | 10% of tonnage |
| Structure Weight (Endo Steel) | `ROUND_UP(tonnage * 0.05, 0.5)` | 5% of tonnage |
| Head Structure | `3` | Constant for all tonnages |
| CT Structure | `ROUND_UP(3.2 * (tonnage / 10))` | Proportional |
| Armor Maximum (Head) | `9` | Fixed maximum |
| Armor Maximum (Other) | `structure_points * 2` | 2:1 ratio |
| Armor Weight | `points / points_per_ton` | Type-dependent |
| Engine Weight | `CEIL(rating / 25) * 0.5 * multiplier` | Type-dependent |
| Engine Heat Sinks | `FLOOR(rating / 25)` | No minimum |
| Walk MP | `FLOOR(rating / tonnage)` | Movement calculation |
| Run MP | `FLOOR(walkMP * 1.5)` | 1.5x walk speed |

### **Constants**

```typescript
// Armor points per ton
ARMOR_POINTS_PER_TON = {
  'Standard': 16,
  'Ferro-Fibrous': 17.92,
  'Ferro-Fibrous (Clan)': 17.92,
  'Light Ferro-Fibrous': 16.8,
  'Heavy Ferro-Fibrous': 19.2,
  'Stealth': 16,
  'Reactive': 14,
  'Reflective': 16,
  'Hardened': 8
}

// Structure weight multipliers
STRUCTURE_WEIGHT_MULTIPLIER = {
  'Standard': 1.0,
  'Endo Steel': 0.5,
  'Endo Steel (Clan)': 0.5,
  'Composite': 0.5,
  'Reinforced': 2.0
}
```

---

## 🔗 **Related Rules**

### **Dependencies**
- None (these are foundational rules)

### **Dependents**
- [Validation Rules](02-validation-rules.md) - Validates these construction rules
- [Calculations](06-calculations.md) - Implements these formulas
- [Advanced Systems](08-advanced-systems.md) - Extends these rules

### **Interactions**
- Structure rules interact with armor maximum rules
- Engine rules interact with movement and heat sink rules
- All rules interact with weight limit validation

---

## ✅ **Validation Checklist**

- [x] Rule is documented in code
- [x] Rule has unit tests
- [x] Rule is validated in ConstructionRulesValidator
- [x] Rule has examples
- [x] Edge cases are handled
- [x] Related rules are cross-referenced

---

## 📝 **Notes**

- All formulas are based on official BattleTech TechManual rules
- Code implementation in `BattleTechConstructionRules.ts` is the single source of truth
- Validation occurs at multiple levels: calculation, validation service, and UI feedback
- These rules form the foundation for all other BattleTech rules

---

**Document Version**: 1.0
**Last Updated**: [Current Date]
**Status**: Complete

