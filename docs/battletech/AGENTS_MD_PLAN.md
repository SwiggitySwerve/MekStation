# BattleTech Rules Documentation Plan - agents.md Structure

## 🎯 **Executive Summary**

This document outlines the plan for creating comprehensive `agents.md` files to codify all BattleTech rules that are documented and implemented in this project. The goal is to create structured, machine-readable documentation that can be used by AI agents and developers to understand and enforce BattleTech construction rules.

---

## 📋 **Documentation Structure Overview**

### **1. Core Documentation Hierarchy**

```
docs/battletech/
├── agents/
│   ├── 00-INDEX.md                    # Master index of all rules
│   ├── 01-construction-rules.md        # Core construction mechanics
│   ├── 02-validation-rules.md          # Validation and compliance rules
│   ├── 03-critical-slots.md            # Critical slot system rules
│   ├── 04-equipment-rules.md           # Equipment mounting and restrictions
│   ├── 05-tech-level-rules.md          # Technology base and era rules
│   ├── 06-calculations.md              # Mathematical formulas and calculations
│   ├── 07-critical-hits.md             # Critical hit mechanics
│   └── 08-advanced-systems.md          # Advanced technology rules
├── rules/
│   ├── armor-rules.yaml                # Armor rules in structured format
│   ├── structure-rules.yaml            # Structure rules in structured format
│   ├── engine-rules.yaml               # Engine rules in structured format
│   ├── heat-sink-rules.yaml            # Heat sink rules in structured format
│   ├── equipment-rules.yaml            # Equipment rules in structured format
│   └── validation-rules.yaml           # Validation rules in structured format
└── reference/
    ├── quick-reference.md               # Quick lookup tables
    └── rule-mappings.md                 # Mapping between code and rules
```

---

## 📐 **agents.md File Format Specification**

### **Standard Template Structure**

Each `agents.md` file should follow this structure:

```markdown
# [Rule Category Name] - BattleTech Rules

## Metadata
- **Category**: [Category Name]
- **Source**: [TechManual / Implementation / Both]
- **Last Updated**: [Date]
- **Related Files**: [Links to code files]
- **Related Rules**: [Links to other agents.md files]

## Overview
[Brief description of what this rule category covers]

## Core Rules

### Rule Name
- **Type**: [Constraint | Calculation | Validation | Restriction]
- **Priority**: [Critical | High | Medium | Low]
- **Source**: [TechManual Section / Code File]
- **Description**: [Human-readable description]
- **Formula**: [If applicable, mathematical formula]
- **Code Reference**: [Link to implementation]
- **Examples**: [Concrete examples]
- **Exceptions**: [Any exceptions or special cases]

## Implementation Details

### Code Location
[File paths and function names]

### Validation Logic
[How this rule is validated in code]

### Edge Cases
[Special cases and how they're handled]

## Related Rules
[Links to related rules in other agents.md files]

## Quick Reference
[Tables, formulas, and quick lookup information]
```

---

## 🗂️ **Rule Categories and Mapping**

### **1. Construction Rules (`01-construction-rules.md`)**

**Source Files:**
- `constants/BattleTechConstructionRules.ts`
- `docs/battletech/battletech_construction_guide.md`

**Rules to Document:**
- ✅ Internal structure weight calculation (10% of tonnage)
- ✅ Structure point distribution formulas
- ✅ Armor allocation rules (2:1 ratio, head exception)
- ✅ Armor weight calculations
- ✅ Engine weight calculations
- ✅ Engine heat sink capacity
- ✅ Movement point calculations
- ✅ Weight limit validations

**Key Sections:**
1. Structure Rules
2. Armor Rules
3. Engine Rules
4. Movement Rules
5. Weight Limits

---

### **2. Validation Rules (`02-validation-rules.md`)**

**Source Files:**
- `services/ConstructionRulesValidator.ts`
- `services/validation/ValidationManager.ts`
- `services/validation/*Validator.ts`
- `docs/battletech/battletech_validation_rules.md`

**Rules to Document:**
- ✅ Weight constraint validation
- ✅ Structure point validation
- ✅ Armor maximum validation
- ✅ Critical slot capacity validation
- ✅ Equipment placement validation
- ✅ Tech base compatibility validation
- ✅ Era restriction validation
- ✅ Heat management validation

**Key Sections:**
1. Weight Validation
2. Structure Validation
3. Armor Validation
4. Critical Slot Validation
5. Equipment Validation
6. Tech Level Validation
7. Heat Validation
8. Movement Validation

---

### **3. Critical Slots (`03-critical-slots.md`)**

**Source Files:**
- `docs/battletech/battletech_critical_slots.md`
- `services/validation/EquipmentValidationManager.ts`
- `components/criticalSlots/`

**Rules to Document:**
- ✅ Fixed slot distribution (78 total slots)
- ✅ Location-specific slot maximums
- ✅ Mandatory system requirements
- ✅ Equipment slot consumption
- ✅ Advanced technology slot costs
- ✅ Slot placement restrictions

**Key Sections:**
1. Slot Distribution
2. Mandatory Systems
3. Equipment Slot Requirements
4. Advanced Technology Costs
5. Placement Restrictions

---

### **4. Equipment Rules (`04-equipment-rules.md`)**

**Source Files:**
- `services/equipment/EquipmentService.ts`
- `services/validation/EquipmentValidationManager.ts`
- `data/equipment/`

**Rules to Document:**
- ✅ Equipment location restrictions
- ✅ Weapon mounting rules
- ✅ Ammunition requirements
- ✅ Equipment compatibility rules
- ✅ Tech base restrictions
- ✅ Era availability rules
- ✅ Equipment weight and slot requirements

**Key Sections:**
1. Location Restrictions
2. Weapon Rules
3. Ammunition Rules
4. Equipment Compatibility
5. Availability Rules

---

### **5. Tech Level Rules (`05-tech-level-rules.md`)**

**Source Files:**
- `services/validation/TechLevelRulesValidator.ts`
- `services/validation/modules/`

**Rules to Document:**
- ✅ Tech base definitions (Inner Sphere, Clan, Mixed)
- ✅ Era-based availability
- ✅ Technology progression rules
- ✅ Mixed tech restrictions
- ✅ Availability rating system
- ✅ Component compatibility matrix

**Key Sections:**
1. Tech Base Definitions
2. Era Restrictions
3. Mixed Tech Rules
4. Availability System
5. Compatibility Matrix

---

### **6. Calculations (`06-calculations.md`)**

**Source Files:**
- `constants/BattleTechConstructionRules.ts`
- `utils/constructionRules/ConstructionRulesEngine.ts`
- `services/systemComponents/calculations/`

**Rules to Document:**
- ✅ Structure weight formulas
- ✅ Structure point formulas
- ✅ Armor weight formulas
- ✅ Engine weight formulas
- ✅ Heat sink calculations
- ✅ Movement calculations
- ✅ Critical slot calculations

**Key Sections:**
1. Structure Calculations
2. Armor Calculations
3. Engine Calculations
4. Heat Sink Calculations
5. Movement Calculations
6. Weight Calculations

---

### **7. Critical Hits (`07-critical-hits.md`)**

**Source Files:**
- `docs/battletech/battletech_critical_hits.md`

**Rules to Document:**
- ✅ Critical hit trigger conditions
- ✅ Critical hit probability tables
- ✅ Equipment destruction rules
- ✅ Progressive damage systems
- ✅ Ammunition explosion mechanics
- ✅ Damage transfer rules

**Key Sections:**
1. Critical Hit Triggers
2. Probability Tables
3. Equipment Destruction
4. Progressive Damage
5. Ammunition Explosions
6. Damage Transfer

---

### **8. Advanced Systems (`08-advanced-systems.md`)**

**Source Files:**
- `constants/BattleTechConstructionRules.ts`
- `services/validation/ComponentValidationManager.ts`

**Rules to Document:**
- ✅ Endo Steel rules
- ✅ Ferro-Fibrous armor rules
- ✅ XL Engine rules
- ✅ Double Heat Sink rules
- ✅ Advanced gyro rules
- ✅ Special equipment rules

**Key Sections:**
1. Advanced Structure
2. Advanced Armor
3. Advanced Engines
4. Advanced Heat Sinks
5. Special Equipment

---

## 📊 **YAML Rules Format**

### **Purpose**
Structured, machine-readable format for rules that can be:
- Validated programmatically
- Used by AI agents
- Imported into validation systems
- Version controlled

### **Example Structure**

```yaml
# armor-rules.yaml
rules:
  - id: armor-max-head
    name: Head Armor Maximum
    type: constraint
    priority: critical
    source: TechManual
    description: Head armor cannot exceed 9 points regardless of structure
    formula: head_armor <= 9
    validation:
      type: max_value
      value: 9
      location: head
    exceptions: []
    
  - id: armor-max-location
    name: Location Armor Maximum
    type: constraint
    priority: critical
    source: TechManual
    description: Maximum armor equals 2x structure points for all locations except head
    formula: location_armor <= (structure_points * 2)
    validation:
      type: calculated_max
      formula: structure_points * 2
      location: all_except_head
    exceptions:
      - location: head
        rule: armor-max-head
```

---

## 🔗 **Rule Mapping and Cross-References**

### **Master Index Structure (`00-INDEX.md`)**

```markdown
# BattleTech Rules Master Index

## Rule Categories
1. [Construction Rules](01-construction-rules.md)
2. [Validation Rules](02-validation-rules.md)
3. [Critical Slots](03-critical-slots.md)
4. [Equipment Rules](04-equipment-rules.md)
5. [Tech Level Rules](05-tech-level-rules.md)
6. [Calculations](06-calculations.md)
7. [Critical Hits](07-critical-hits.md)
8. [Advanced Systems](08-advanced-systems.md)

## Code to Rules Mapping
[Table mapping code files to rule documents]

## Quick Reference
[Common rules lookup]
```

---

## 📝 **Implementation Plan**

### **Phase 1: Core Structure** ✅
- [x] Create plan document
- [ ] Create directory structure
- [ ] Create master index template
- [ ] Define YAML schema

### **Phase 2: Core Rules Documentation**
- [ ] Document construction rules (01)
- [ ] Document validation rules (02)
- [ ] Document critical slots (03)
- [ ] Document calculations (06)

### **Phase 3: Equipment and Tech Rules**
- [ ] Document equipment rules (04)
- [ ] Document tech level rules (05)
- [ ] Document advanced systems (08)

### **Phase 4: Combat Rules**
- [ ] Document critical hits (07)

### **Phase 5: Structured Rules**
- [ ] Create YAML rule files
- [ ] Validate YAML against code
- [ ] Create rule mapping document

### **Phase 6: Integration**
- [ ] Link rules to code files
- [ ] Create cross-references
- [ ] Validate completeness
- [ ] Create quick reference guide

---

## 🎯 **Success Criteria**

1. ✅ All BattleTech rules from code are documented
2. ✅ All rules from existing docs are included
3. ✅ Rules are cross-referenced with code
4. ✅ Rules are in machine-readable format (YAML)
5. ✅ Rules are organized by category
6. ✅ Quick reference guides are available
7. ✅ Rules can be validated programmatically

---

## 📚 **Reference Materials**

### **Existing Documentation**
- `docs/battletech/battletech_construction_guide.md`
- `docs/battletech/battletech_validation_rules.md`
- `docs/battletech/battletech_critical_slots.md`
- `docs/battletech/battletech_critical_hits.md`

### **Code References**
- `constants/BattleTechConstructionRules.ts`
- `services/ConstructionRulesValidator.ts`
- `services/validation/*.ts`
- `utils/constructionRules/*.ts`

---

**Document Version**: 1.0  
**Last Updated**: [Current Date]  
**Status**: Planning Phase
