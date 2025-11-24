# Calculations - BattleTech Rules

## 📋 **Metadata**
- **Category**: Calculations
- **Source**: TechManual / Implementation
- **Last Updated**: [Current Date]
- **Related Files**:
  - Code: `utils/constructionRules/ConstructionRulesEngine.ts`
  - Code: `services/systemComponents/calculations/`
- **Related Rules**:
  - [Construction Rules](01-construction-rules.md)
  - [Validation Rules](02-validation-rules.md)

---

## 🔍 **Overview**

This document serves as a central reference for all mathematical formulas used in BattleMech construction. While specific rules (like Structure) are defined in their respective files, this document aggregates the math for easy auditing and implementation verification.

---

## 📜 **Core Formulas**

### **Tonnage & Mass**

| System | Formula | Notes |
|--------|---------|-------|
| **Internal Structure** | `Tonnage * 0.1` (Standard) | |
| **Internal Structure** | `ROUND_UP(Tonnage * 0.05, 0.5)` (Endo Steel) | |
| **Engine** | *Table Lookup* or Complex Formula | See Engine Table |
| **Gyro** | `CEIL(EngineRating / 100)` (Standard) | |
| **Gyro** | `CEIL(EngineRating / 100) * 2` (Heavy Duty) | |
| **Gyro** | `CEIL(EngineRating / 100) * 0.5` (XL) | |
| **Cockpit** | `3.0` (Standard) | Fixed weight |
| **Jump Jets** | `0.5` (Standard, < 60 tons) | Per Jet |
| **Jump Jets** | `1.0` (Standard, 60-85 tons) | Per Jet |
| **Jump Jets** | `2.0` (Standard, > 85 tons) | Per Jet |
| **Armor** | `TotalPoints / PointsPerTon` | |

### **Movement**

- **Walking MP**: `FLOOR(EngineRating / Tonnage)`
- **Running MP**: `CEIL(WalkingMP * 1.5)`
- **Jump MP**: User selectable, max usually limited by Walk/Run MP depending on ruleset.

### **Heat Sinks**

- **Internal Capacity**: `FLOOR(EngineRating / 25)`
- **Free Heat Sinks**: `10` (First 10 tons are weight-free, but must be allocated if not internal)
- **Total Dissipation**: `(SinkCount * 2)` for Double, `SinkCount * 1` for Single.

### **Battle Value (BV2)**

*Note: BV2 is extremely complex. This is a simplified overview.*

- **Defensive BV**:
  - `ArmorPoints * 2.5 * ArmorFactor`
  - `StructurePoints * 1.5 * StructureFactor`
  - Modifiers for TMM (Target Movement Modifier).
- **Offensive BV**:
  - Sum of weapon BV.
  - Adjusted for heat efficiency (if mech overheats, weapon BV decreases).
  - Adjusted for speed factor.

---

## 🛠️ **Implementation Details**

### **Code Location**

**Primary Implementation:**
- File: `utils/constructionRules/ConstructionRulesEngine.ts`
- Purpose: Main calculation engine for ongoing construction.

**Helper Functions:**
- File: `constants/BattleTechConstructionRules.ts`
- Purpose: Pure functions for specific calculations (e.g., `calculateGyroWeight`).

### **Rounding Rules**

BattleTech uses specific rounding rules that must be followed strictly:
1. **Tonnage**: Usually rounded up to the nearest 0.5 ton (e.g., Endo Steel).
2. **Multipliers**: Generally standard math, then Floor/Ceil as specified.
3. **Armor**: Rounded to nearest integer point (usually down from weight, or weight matches points exactly).

### **Example: Engine Weight**

```typescript
function calculateEngineWeight(rating: number, type: string): number {
  // 1. Get Base Weight from Table (simplified formula approximation)
  // Base Formula roughly: (Rating / 25) tons + shielding overhead
  // ACTUAL implementation uses a lookup table or precise polynomial approximation.
  let weight = EngineWeights[rating]; 
  
  // 2. Apply Multipliers
  if (type === 'XL') weight *= 0.5;
  if (type === 'Light') weight *= 0.75;
  
  // 3. Rounding (if applicable, usually table values are exact)
  return weight;
}
```

---

## ⚡ **Quick Reference**

### **Common Multipliers**

- **Endo Steel Weight**: 0.5x Standard Structure.
- **XL Engine Weight**: 0.5x Standard Engine.
- **Light Engine Weight**: 0.75x Standard Engine.
- **Ferro-Fibrous Points**: 1.12x Standard (16 -> 17.92 approx).

---

## 🔗 **Related Rules**

### **Dependencies**
- [Construction Rules](01-construction-rules.md) - Defines the base logic.

### **Dependents**
- [Validation Rules](02-validation-rules.md) - Uses these calculations to validate.

---

## ✅ **Validation Checklist**

- [ ] Calculations match TechManual examples.
- [ ] Rounding direction (up/down/nearest) is correct for each formula.
- [ ] Edge case inputs (0 tonnage, 400 engine) handled gracefully.

---

## 📝 **Notes**

- Engine weights are technically defined by a table in the TechManual, not a smooth formula. The code uses a lookup table or a formula that exactly matches the table steps.
- Gyro weight for XL/Compact is calculated from the *Standard* Gyro weight, which is `Ceil(Rating/100)`.

---

**Document Version**: 1.0
**Last Updated**: [Current Date]
**Status**: Complete

