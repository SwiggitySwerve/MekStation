# BattleTech Rules Master Index

## 📋 **Document Overview**

This is the master index for all BattleTech rules documented in this project. Each rule category is documented in a dedicated `agents.md` file with comprehensive details, code references, and examples.

---

## 🗂️ **Rule Categories**

### **1. [Construction Rules](01-construction-rules.md)**
Core BattleTech construction mechanics including structure, armor, engines, and movement calculations.

**Key Topics:**
- Internal structure weight and point calculations
- Armor allocation rules and maximums
- Engine weight and heat sink capacity
- Movement point calculations
- Weight limit validations

**Related Code:**
- `constants/BattleTechConstructionRules.ts`
- `services/systemComponents/calculations/`

---

### **2. [Validation Rules](02-validation-rules.md)**
Comprehensive validation and compliance checking rules for BattleTech unit construction.

**Key Topics:**
- Weight constraint validation
- Structure and armor validation
- Critical slot validation
- Equipment placement validation
- Tech level and era validation
- Heat management validation

**Related Code:**
- `services/ConstructionRulesValidator.ts`
- `services/validation/ValidationManager.ts`
- `services/validation/*Validator.ts`

---

### **3. [Critical Slots](03-critical-slots.md)**
Critical slot system, equipment mounting rules, and space management.

**Key Topics:**
- Fixed slot distribution (78 total slots)
- Mandatory system requirements
- Equipment slot consumption
- Advanced technology slot costs
- Placement restrictions

**Related Code:**
- `services/validation/EquipmentValidationManager.ts`
- `components/criticalSlots/`

---

### **4. [Equipment Rules](04-equipment-rules.md)**
Equipment mounting, restrictions, and compatibility rules.

**Key Topics:**
- Location restrictions
- Weapon mounting rules
- Ammunition requirements
- Equipment compatibility
- Tech base restrictions
- Era availability

**Related Code:**
- `services/equipment/EquipmentService.ts`
- `services/validation/EquipmentValidationManager.ts`
- `data/equipment/`

---

### **5. [Tech Level Rules](05-tech-level-rules.md)**
Technology base definitions, era restrictions, and availability rules.

**Key Topics:**
- Tech base definitions (Inner Sphere, Clan, Mixed)
- Era-based availability
- Technology progression
- Mixed tech restrictions
- Availability rating system

**Related Code:**
- `services/validation/TechLevelRulesValidator.ts`
- `services/validation/modules/`

---

### **6. [Calculations](06-calculations.md)**
Mathematical formulas and calculation methods for all BattleTech construction rules.

**Key Topics:**
- Structure calculations
- Armor calculations
- Engine calculations
- Heat sink calculations
- Movement calculations
- Weight calculations

**Related Code:**
- `constants/BattleTechConstructionRules.ts`
- `utils/constructionRules/ConstructionRulesEngine.ts`
- `services/systemComponents/calculations/`

---

### **7. [Critical Hits](07-critical-hits.md)**
Critical hit mechanics, equipment damage, and combat vulnerability systems.

**Key Topics:**
- Critical hit triggers
- Probability tables
- Equipment destruction
- Progressive damage
- Ammunition explosions
- Damage transfer

**Related Code:**
- Combat resolution systems (future implementation)

---

### **8. [Advanced Systems](08-advanced-systems.md)**
Advanced technology rules including Endo Steel, Ferro-Fibrous, XL Engines, and special equipment.

**Key Topics:**
- Advanced structure technologies
- Advanced armor technologies
- Advanced engine types
- Advanced heat sinks
- Special equipment rules

**Related Code:**
- `constants/BattleTechConstructionRules.ts`
- `services/validation/ComponentValidationManager.ts`

---

## 🔗 **Code to Rules Mapping**

### **Core Constants**
| Code File | Rules Document |
|-----------|---------------|
| `constants/BattleTechConstructionRules.ts` | [Construction Rules](01-construction-rules.md), [Calculations](06-calculations.md), [Advanced Systems](08-advanced-systems.md) |

### **Validation Services**
| Code File | Rules Document |
|-----------|---------------|
| `services/ConstructionRulesValidator.ts` | [Validation Rules](02-validation-rules.md) |
| `services/validation/WeightRulesValidator.ts` | [Validation Rules](02-validation-rules.md), [Construction Rules](01-construction-rules.md) |
| `services/validation/HeatRulesValidator.ts` | [Validation Rules](02-validation-rules.md), [Calculations](06-calculations.md) |
| `services/validation/ArmorRulesValidator.ts` | [Validation Rules](02-validation-rules.md), [Construction Rules](01-construction-rules.md) |
| `services/validation/StructureRulesValidator.ts` | [Validation Rules](02-validation-rules.md), [Construction Rules](01-construction-rules.md) |
| `services/validation/MovementRulesValidator.ts` | [Validation Rules](02-validation-rules.md), [Construction Rules](01-construction-rules.md) |
| `services/validation/TechLevelRulesValidator.ts` | [Tech Level Rules](05-tech-level-rules.md) |
| `services/validation/EquipmentValidationManager.ts` | [Equipment Rules](04-equipment-rules.md), [Critical Slots](03-critical-slots.md) |

### **Calculation Engines**
| Code File | Rules Document |
|-----------|---------------|
| `utils/constructionRules/ConstructionRulesEngine.ts` | [Calculations](06-calculations.md), [Validation Rules](02-validation-rules.md) |
| `services/systemComponents/calculations/` | [Calculations](06-calculations.md) |

---

## ⚡ **Quick Reference**

### **Common Rules Lookup**

#### **Weight Rules**
- Structure weight: 10% of tonnage (standard) / 5% (Endo Steel)
- Armor maximum: 2x structure points (except head = 9)
- Total weight: Must not exceed mech tonnage

#### **Critical Slot Rules**
- Total slots: 78 per mech (fixed)
- Head: 6 slots
- Center Torso: 12 slots
- Side Torsos: 12 slots each
- Arms: 12 slots each
- Legs: 6 slots each

#### **Armor Rules**
- Head maximum: 9 points (fixed)
- Other locations: 2x structure points
- Standard armor: 16 points per ton
- Ferro-Fibrous: 17.92 points per ton (IS) / 17.92 (Clan)

#### **Engine Rules**
- Engine heat sinks: Rating / 25 (no minimum)
- Maximum rating: 400
- Walk MP: Engine rating / tonnage

#### **Heat Sink Rules**
- Minimum total: 10 OR number of heat-generating weapons (whichever is higher)
- Single: 1 slot, 1 heat dissipation
- Double (IS): 3 slots, 2 heat dissipation
- Double (Clan): 2 slots, 2 heat dissipation

---

## 📚 **Related Documentation**

### **Existing Guides**
- [BattleTech Construction Guide](../battletech_construction_guide.md) - Comprehensive construction reference
- [BattleTech Validation Rules](../battletech_validation_rules.md) - Validation checklist
- [BattleTech Critical Slots](../battletech_critical_slots.md) - Slot system reference
- [BattleTech Critical Hits](../battletech_critical_hits.md) - Combat mechanics

### **Planning Documents**
- [Agents.md Plan](../AGENTS_MD_PLAN.md) - Documentation structure plan

---

## 📊 **Document Status**

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

**Document Version**: 1.0
**Last Updated**: [Current Date]
**Maintained By**: BattleTech Editor Project

