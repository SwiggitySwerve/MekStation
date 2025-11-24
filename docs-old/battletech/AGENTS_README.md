# 🤖 BattleTech Rules - Agent Reference Guide

## 🚨 **START HERE**

This directory contains **all BattleTech construction rules** that must be followed when working on this project. **ALWAYS reference these rules before implementing or modifying BattleTech-related code.**

---

## 🚀 **Quick Start for Agents**

### **1. Master Index**
👉 **[Start Here: 00-INDEX.md](agents/00-INDEX.md)**
- Complete overview of all rule categories
- Code to rules mapping
- Quick reference tables

### **2. Construction Rules**
👉 **[01-construction-rules.md](agents/01-construction-rules.md)**
- Structure, armor, engine calculations
- Movement and weight rules
- Code references and examples

### **3. Quick Reference**
👉 **[Quick Reference](reference/quick-reference.md)**
- Common formulas
- Lookup tables
- Example calculations

---

💡 **When to Use These Rules**

### **✅ Always Reference When:**
- Implementing construction calculations
- Adding validation logic
- Working with equipment placement
- Calculating weights, structure, or armor
- Implementing tech level restrictions
- Working with critical slots
- Any BattleTech rule-related code changes

### **📚 Rule Categories**

| Category | File | Use Case |
|----------|------|----------|
| **Construction** | [01-construction-rules.md](agents/01-construction-rules.md) | Structure, armor, engine, movement |
| **Validation** | [02-validation-rules.md](agents/02-validation-rules.md) | Rule enforcement and compliance |
| **Critical Slots** | [03-critical-slots.md](agents/03-critical-slots.md) | Equipment mounting and slots |
| **Equipment** | [04-equipment-rules.md](agents/04-equipment-rules.md) | Equipment restrictions and compatibility |
| **Tech Level** | [05-tech-level-rules.md](agents/05-tech-level-rules.md) | Tech base and era rules |
| **Calculations** | [06-calculations.md](agents/06-calculations.md) | All formulas and math |
| **Critical Hits** | [07-critical-hits.md](agents/07-critical-hits.md) | Combat mechanics |
| **Advanced Systems** | [08-advanced-systems.md](agents/08-advanced-systems.md) | Advanced technology rules |

---

## 💻 **Code References**

### **Single Source of Truth**
- **File**: `constants/BattleTechConstructionRules.ts`
- **Purpose**: All official BattleTech rule constants and calculations
- **Rule**: Never duplicate these values elsewhere

### **Validation Services**
- **Main**: `services/ConstructionRulesValidator.ts`
- **Specialized**: `services/validation/*Validator.ts`
- **Purpose**: Rule enforcement and compliance checking

### **Calculation Engines**
- **Engine**: `utils/constructionRules/ConstructionRulesEngine.ts`
- **Calculations**: `services/systemComponents/calculations/`
- **Purpose**: Rule calculations and formulas

---

## 📊 **Key Rules Summary**

### **Structure Rules**
- Standard: 10% of tonnage
- Endo Steel: 5% of tonnage (rounded up to 0.5 tons)
- Head: Always 3 structure points

### **Armor Rules**
- Head maximum: 9 points (fixed)
- Other locations: 2x structure points
- Standard: 16 points per ton
- Ferro-Fibrous: 17.92 points per ton

### **Engine Rules**
- Heat sink capacity: Rating / 25 (no minimum)
- Maximum rating: 400
- Walk MP: Engine rating / tonnage
- Run MP: Walk MP * 1.5 (rounded down)

### **Critical Slots**
- Total: 78 slots per mech
- Head: 6 slots
- Center Torso: 12 slots
- Side Torsos: 12 slots each
- Arms: 12 slots each
- Legs: 6 slots each

### **Heat Sinks**
- Minimum total: MAX(10, heat-generating weapons)
- Engine capacity: Rating / 25 (no minimum)
- Single: 1 slot, 1 heat dissipation
- Double (IS): 3 slots, 2 heat dissipation
- Double (Clan): 2 slots, 2 heat dissipation

---

## ⚠️ **Critical Reminders**

1. **Rules are IMMUTABLE** - They come from official BattleTech TechManual
2. **Single Source of Truth** - Use `BattleTechConstructionRules.ts`
3. **Always Validate** - Use validation services
4. **Type Safety** - No `as any`, use proper types
5. **SOLID Architecture** - Follow established patterns

## 🚫 **Forbidden Patterns**

The following patterns are strictly prohibited in this codebase:

1. **`as any` Casting**
   - **Prohibited**: `const x = y as any;`
   - **Why**: Silences compiler, leads to runtime crashes.
   - **Use**: Type guards (`isValidUnitConfiguration`) or concrete types.

2. **Double Casting (`as unknown as`)**
   - **Prohibited**: `const x = y as unknown as Target;`
   - **Why**: Bypasses all type safety masks incompatibilities.
   - **Use**: Proper conversion functions or intermediate types.

3. **Legacy Imports**
   - **Prohibited**: Importing from `types/systemComponents.ts` or `enhancedSystemComponents.ts`.
   - **Why**: Deprecated bridge files.
   - **Use**: `import { ... } from 'src/types/core';`

4. **Magic Strings**
   - **Prohibited**: `if (techBase === 'Inner Sphere')`
   - **Why**: Fragile and error-prone.
   - **Use**: `TechBase.INNER_SPHERE`, `ComponentCategory.ENGINE`.

5. **Unsafe Property Access**
   - **Prohibited**: Accessing properties on `unknown` data without validation.
   - **Why**: Causes runtime errors on malformed data.
   - **Use**: `isValid*` type guards.

---

## 📂 **Documentation Files**

### **Structured Rules (agents/)**
- `agents/00-INDEX.md` - Master index
- `agents/01-construction-rules.md` - Construction mechanics
- `agents/TEMPLATE.md` - Template for new rules

### **Comprehensive Guides**
- `battletech_construction_guide.md` - Complete construction reference
- `battletech_validation_rules.md` - Validation checklist
- `battletech_critical_slots.md` - Slot system reference
- `battletech_critical_hits.md` - Combat mechanics

### **Reference Materials**
- `reference/quick-reference.md` - Quick lookup tables
- `rules/README.md` - YAML format guide (future)

---

## =□□ **Document Status**

| Document | Status | Last Updated |
|----------|--------|--------------|
| 00-INDEX.md | ✅ Complete | [Current Date] |
| 01-construction-rules.md | ✅ Complete | [Current Date] |
| 02-validation-rules.md | ✅ Complete | [Current Date] |
| 03-critical-slots.md | ✅ Complete | [Current Date] |
| 04-equipment-rules.md | ✅ Complete | [Current Date] |
| 05-tech-level-rules.md | ✅ Complete | [Current Date] |
| 06-calculations.md | ✅ Complete | [Current Date] |
| 07-critical-hits.md | ✅ Complete | [Current Date] |
| 08-advanced-systems.md | ✅ Complete | [Current Date] |

---

## 🔍 **Quick Lookup**

### **Common Formulas**
```typescript
// Structure weight
structure_weight = tonnage * 0.10  // Standard
structure_weight = ROUND_UP(tonnage * 0.05, 0.5)  // Endo Steel

// Armor maximum
head_armor_max = 9  // Fixed
location_armor_max = structure_points * 2  // Other locations

// Engine heat sinks
engine_heat_sinks = FLOOR(rating / 25)  // No minimum

// Movement
walk_mp = FLOOR(rating / tonnage)
run_mp = FLOOR(walk_mp * 1.5)
```

### **Key Constants**
```typescript
// From constants/BattleTechConstructionRules.ts
ARMOR_POINTS_PER_TON
STRUCTURE_WEIGHT_MULTIPLIER
HEAT_SINK_DISSIPATION
ENGINE_CRITICAL_SLOTS
```

---

## ❓ **Need Help?**

1. **Check the Master Index**: [agents/00-INDEX.md](agents/00-INDEX.md)
2. **Review Quick Reference**: [reference/quick-reference.md](reference/quick-reference.md)
3. **Read Full Guides**: `battletech_*.md` files
4. **Check Code**: `constants/BattleTechConstructionRules.ts`

---

**Last Updated**: 2025-01-XX
**Version**: 1.1
**Status**: Active Reference

