# Validation Rules - BattleTech Rules

## 📋 **Metadata**
- **Category**: Validation Rules
- **Source**: TechManual / Implementation
- **Last Updated**: [Current Date]
- **Related Files**:
  - Code: `services/ConstructionRulesValidator.ts`
  - Docs: `docs/battletech/battletech_validation_rules.md`
- **Related Rules**:
  - [Construction Rules](01-construction-rules.md)
  - [Equipment Rules](04-equipment-rules.md)
  - [Tech Level Rules](05-tech-level-rules.md)

---

## 🔍 **Overview**

This document defines the comprehensive validation rules used to ensure BattleMech designs are legal according to BattleTech construction rules. Validation occurs at multiple levels: strict rule enforcement (illegal designs), warnings (suboptimal or dangerous designs), and informational checks.

---

## 📜 **Core Rules**

### **Weight Limit Validation**

- **Type**: Constraint
- **Priority**: Critical
- **Source**: TechManual / `services/validation/WeightRulesValidator.ts`
- **Description**: The total weight of all components (structure, engine, gyro, cockpit, armor, heat sinks, jump jets, equipment, weapons, ammunition) must not exceed the mech's total tonnage.
- **Formula**: `SUM(all_component_weights) <= mech_tonnage`
- **Code Reference**:
  ```typescript
  // File: services/validation/WeightRulesValidator.ts
  // Function: validateWeight()
  export function validateWeight(unit: UnitConfiguration): ValidationResult {
    const totalWeight = calculateTotalWeight(unit);
    if (totalWeight > unit.tonnage) {
      return { valid: false, error: `Overweight: ${totalWeight}/${unit.tonnage}` };
    }
    return { valid: true };
  }
  ```
- **Examples**:
  - Legal: 49.5 tons used / 50 tons total
  - Illegal: 50.5 tons used / 50 tons total
- **Exceptions**: None. Fractional weight is allowed but total cannot exceed limit.
- **Related Rules**: [Construction Rules - Total Weight Limit](01-construction-rules.md#total-weight-limit)

---

### **Critical Slot Validation**

- **Type**: Constraint
- **Priority**: Critical
- **Source**: TechManual / `services/validation/EquipmentValidationManager.ts`
- **Description**: Equipment placed in a location must fit within the available critical slots for that location. Total slots per location are fixed.
- **Formula**: `slots_used <= slots_available` (per location)
- **Code Reference**:
  ```typescript
  // File: services/validation/EquipmentValidationManager.ts
  // Function: validateLocationCapacity()
  ```
- **Examples**:
  - Arm (12 slots): Can fit PPC (3 slots) + Medium Laser (1 slot) + Hand (1 slot) + Shoulder/Upper/Lower (3 slots) = 8 slots used.
  - Head (6 slots): Cannot fit LRM-20 (5 slots) if Cockpit/Sensors/Life Support take 5 slots.
- **Exceptions**: Some items can be split across locations (notably large engines, AC/20s in some rulesets).
- **Related Rules**: [Critical Slots](03-critical-slots.md)

---

### **Tech Base & Era Validation**

- **Type**: Restriction
- **Priority**: High
- **Source**: TechManual / `services/validation/TechLevelRulesValidator.ts`
- **Description**: All components must be compatible with the unit's Technology Base (Inner Sphere, Clan, Mixed) and Era (year).
- **Formula**: `component.techBase == unit.techBase || unit.techBase == 'Mixed'`
- **Code Reference**:
  ```typescript
  // File: services/validation/TechLevelRulesValidator.ts
  // Function: validateTechBase()
  ```
- **Examples**:
  - Inner Sphere Mech: Cannot mount Clan ER Large Laser (unless Mixed Tech).
  - 3025 Era Mech: Cannot mount ER PPC (introduced 3037).
- **Exceptions**: Mixed Tech units can use components from both bases.
- **Related Rules**: [Tech Level Rules](05-tech-level-rules.md)

---

### **Equipment Placement Validation**

- **Type**: Restriction
- **Priority**: High
- **Source**: TechManual / `services/validation/EquipmentValidationManager.ts`
- **Description**: Certain equipment has specific placement restrictions (e.g., Jump Jets in Legs/Torso only, Ammo not in Head without special rules).
- **Code Reference**:
  ```typescript
  // File: services/validation/EquipmentValidationManager.ts
  // Function: validatePlacementRestrictions()
  ```
- **Examples**:
  - Jump Jets: Cannot be placed in Arms or Head.
  - Legs: Can only hold Jump Jets, Heat Sinks, and Ammo (plus special equipment).
- **Exceptions**: Improved Jump Jets have different rules.
- **Related Rules**: [Equipment Rules](04-equipment-rules.md)

---

### **Ammunition Validation**

- **Type**: Restriction
- **Priority**: High
- **Source**: TechManual / `services/validation/EquipmentValidationManager.ts`
- **Description**: Weapons requiring ammunition must have at least one bin of compatible ammo allocated.
- **Code Reference**:
  ```typescript
  // File: services/validation/EquipmentValidationManager.ts
  // Function: validateAmmo()
  ```
- **Examples**:
  - LRM-20 requires LRM-20 Ammo.
  - AC/10 requires AC/10 Ammo.
- **Exceptions**: Energy weapons do not require ammo. One-shot weapons do not require external ammo.
- **Related Rules**: [Equipment Rules](04-equipment-rules.md)

---

## 🛠️ **Implementation Details**

### **Code Location**

**Primary Implementation:**
- File: `services/ConstructionRulesValidator.ts`
- Purpose: Main orchestrator for all validation checks
- Lines: 1-300+

**Supporting Code:**
- File: `services/validation/WeightRulesValidator.ts`
- File: `services/validation/EquipmentValidationManager.ts`
- File: `services/validation/TechLevelRulesValidator.ts`

### **Validation Logic**

```typescript
function validateUnit(unit: UnitConfiguration): ValidationReport {
  const report = new ValidationReport();
  
  // 1. Weight Check
  if (!WeightValidator.validate(unit)) report.addError("Overweight");
  
  // 2. Tech Base Check
  if (!TechValidator.validate(unit)) report.addError("Invalid Tech Base");
  
  // 3. Critical Slots Check
  if (!SlotValidator.validate(unit)) report.addError("Slot Overflow");
  
  // 4. Equipment Rules
  if (!EquipmentValidator.validate(unit)) report.addError("Invalid Equipment Placement");
  
  return report;
}
```

### **Edge Cases**

1. **Mixed Tech**
   - Description: Validating units with Mixed Tech base requires checking component origin against allowed lists.
   - Handling: Validator checks `unit.isMixedTech` flag.

2. **Split Criticals**
   - Description: Large items (AC/20, Arrow IV) can be split across adjacent locations.
   - Handling: Validator must account for "phantom" slots in adjacent location.

3. **OmniMechs**
   - Description: OmniMechs have fixed structure/engine/armor but variable pods.
   - Handling: Validator separates "Base Chassis" validation from "Loadout" validation.

---

## ⚡ **Quick Reference**

### **Validation Checklist**

| Check | Condition | Severity |
|-------|-----------|----------|
| **Weight** | `used <= max` | Critical |
| **Slots** | `used <= max (per loc)` | Critical |
| **Era** | `intro_year <= current_year` | Error |
| **Tech Base** | `component_base == unit_base` | Error |
| **Ammo** | `weapon_needs_ammo -> has_ammo` | Warning/Error |
| **Heat** | `sinks >= 10` | Error |

---

## 🔗 **Related Rules**

### **Dependencies**
- [Construction Rules](01-construction-rules.md) - Provides weight and slot limits.
- [Tech Level Rules](05-tech-level-rules.md) - Provides era and tech base definitions.

### **Dependents**
- None (Validation is the final step).

### **Interactions**
- Equipment rules define *what* can be placed; Validation rules check *if* it was placed correctly.

---

## ✅ **Validation Checklist**

- [ ] All critical constraints (weight, slots) throw Errors.
- [ ] Configuration mismatches (ammo, invalid location) throw Errors.
- [ ] Suboptimal designs (low armor, high heat) throw Warnings.
- [ ] Validation covers all unit types (Mech, Vehicle, etc.).

---

## 📝 **Notes**

- Validation should be run reactively as the user edits the unit.
- Errors prevent saving/exporting as "Legal".
- Warnings allow saving but flag potential issues.

---

**Document Version**: 1.0
**Last Updated**: [Current Date]
**Status**: Complete

