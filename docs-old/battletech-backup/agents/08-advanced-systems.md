# Advanced Systems - BattleTech Rules

## 📋 **Metadata**
- **Category**: Advanced Systems
- **Source**: TechManual / Tactical Operations
- **Last Updated**: [Current Date]
- **Related Files**:
  - Code: `constants/BattleTechConstructionRules.ts`
  - Code: `services/validation/ComponentValidationManager.ts`
- **Related Rules**:
  - [Construction Rules](01-construction-rules.md)
  - [Tech Level Rules](05-tech-level-rules.md)

---

## 🔍 **Overview**

Advanced Systems cover technologies that deviate from standard 3025 Succession Wars era rules. This includes space-saving structures (Endo Steel), advanced armors (Ferro-Fibrous), and high-performance engines (XL, Light).

---

## 📜 **Core Rules**

### **Advanced Structure**

- **Endo Steel**:
  - **Weight**: 50% of Standard (5% of Tonnage).
  - **Slots**: Occupies 14 critical slots (Inner Sphere) or 7 slots (Clan).
  - **Constraint**: Slots are "floating" - they must be allocated to specific locations but have no physical location requirement (can be split).

- **Composite**:
  - **Weight**: 50% of Standard.
  - **Slots**: 0 slots.
  - **Drawback**: Brittle (takes double damage from internal hits - Gameplay rule).

### **Advanced Armor**

- **Ferro-Fibrous**:
  - **Bonus**: More points per ton.
    - IS: ~1.12x (17.92 pts/ton).
    - Clan: ~1.2x (19.2 pts/ton).
  - **Slots**: Occupies 14 slots (IS) or 7 slots (Clan).
  
- **Light Ferro-Fibrous**:
  - **Bonus**: Slight increase (16.8 pts/ton).
  - **Slots**: 7 slots (IS).

- **Stealth Armor**:
  - **Slots**: 12 slots (2 in each Side Torso, 2 in each Arm, 2 in each Leg).
  - **Requirement**: ECM Suite must be installed.

### **Advanced Engines**

- **XL Engine (Extra-Light)**:
  - **Weight**: 50% of Standard Engine.
  - **Slots**:
    - IS: 3 slots in *each* Side Torso (6 total side slots).
    - Clan: 2 slots in *each* Side Torso (4 total side slots).
  - **Vulnerability**: IS XL engines die if a Side Torso is destroyed (3 engine hits). Clan XL engines survive one Side Torso loss (2 engine hits).

- **Light Engine (IS Only)**:
  - **Weight**: 75% of Standard Engine.
  - **Slots**: 2 slots in *each* Side Torso.
  - **Durability**: Survives Side Torso loss (like Clan XL).

- **Compact Engine**:
  - **Weight**: 150% of Standard Engine (Heavier).
  - **Slots**: 3 slots total (Center Torso only). Frees up CT space.

### **Advanced Gyros**

- **XL Gyro**:
  - **Weight**: 50% of Standard.
  - **Slots**: 6 slots in Center Torso.
  - **Constraint**: Takes up whole CT. Requires Engine to move some slots elsewhere (only possible with certain engine types or compact engines).

- **Compact Gyro**:
  - **Weight**: 150% of Standard.
  - **Slots**: 2 slots in Center Torso.

---

## 🛠️ **Implementation Details**

### **Code Location**

**Primary Implementation:**
- File: `constants/BattleTechConstructionRules.ts` (Definitions)
- File: `utils/constructionRules/ConstructionRulesEngine.ts` (Calculations)

### **Validation Logic**

1. **Slot Allocation**:
   - Validator must ensure the user has assigned the required number of "Dynamic Slots" (e.g., 14 for Endo Steel).
   - For XL Engines, the validator automatically reserves the Side Torso slots.

2. **Space Constraints**:
   - **XL Gyro**: Validating an XL Gyro requires checking if the CT has space (Standard Engine + XL Gyro = 12 slots, full CT).

3. **Dependencies**:
   - **Stealth Armor**: Check for ECM Suite presence.

### **Edge Cases**

1. **Mixed Tech Structure/Armor**:
   - An IS Mech can use Clan Ferro-Fibrous (Mixed Tech). This changes the slot requirement from 14 to 7.

2. **OmniMechs**:
   - Base configuration defines Structure/Engine/Armor.
   - Validating allocations happens at the "Base" level, not "Loadout" level.

---

## ⚡ **Quick Reference**

### **Engine Table**

| Type | Weight | IS Slots (Side) | Clan Slots (Side) | Survival (Side Loss) |
|------|--------|-----------------|-------------------|----------------------|
| Std | 1.0x | 0 | 0 | Yes |
| XL | 0.5x | 3 | 2 | No (IS) / Yes (Clan) |
| Light| 0.75x | 2 | N/A | Yes |
| Comp | 1.5x | 0 | N/A | Yes |

### **Structure/Armor Slots**

| Type | IS Slots | Clan Slots |
|------|----------|------------|
| Endo Steel | 14 | 7 |
| Ferro-Fibrous | 14 | 7 |
| Light Ferro | 7 | N/A |
| Heavy Ferro | 21 | N/A |

---

## 🔗 **Related Rules**

### **Dependencies**
- [Construction Rules](01-construction-rules.md) - Base formulas.
- [Tech Level Rules](05-tech-level-rules.md) - Era availability.

### **Dependents**
- [Critical Slots](03-critical-slots.md) - Managing the slots these systems consume.

---

## ✅ **Validation Checklist**

- [ ] Correct weight multiplier applied.
- [ ] Correct number of dynamic slots allocated.
- [ ] Side Torso slots reserved for XL/Light Engines.
- [ ] Dependencies met (Stealth -> ECM).

---

## 📝 **Notes**

- "Dynamic Slots" (Endo/Ferro) are often the most confusing part of construction for users. The UI should assist by auto-allocating or clearly showing remaining count.

---

**Document Version**: 1.0
**Last Updated**: [Current Date]
**Status**: Complete

