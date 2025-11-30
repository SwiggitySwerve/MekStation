# Variable Equipment - BattleTech Rules

## 📋 **Metadata**
- **Category**: Equipment Calculations
- **Source**: TechManual / Implementation
- **Last Updated**: 2025-11-30
- **Related Files**:
  - Types: `src/types/equipment/VariableEquipment.ts`
  - Calculations: `src/utils/equipment/variableEquipmentCalculations.ts`
  - Calculator: `src/utils/equipment/EquipmentCalculator.ts`
- **Related Rules**:
  - [Equipment Rules](04-equipment-rules.md)
  - [Calculations](06-calculations.md)
  - [Construction Rules](01-construction-rules.md)

---

## 🔍 **Overview**

Certain BattleTech equipment has properties (weight, slots, cost) that vary based on mech configuration. This document defines all variable equipment calculation formulas per the TechManual.

---

## 📜 **Variable Equipment Formulas**

### **Targeting Computer**

| Property | IS Formula | Clan Formula | Source |
|----------|-----------|--------------|--------|
| Weight | `ceil(directFireWeaponTonnage / 4)` | `ceil(directFireWeaponTonnage / 5)` | TM p.149 |
| Slots | `weight` (1 per ton) | `weight` (1 per ton) | TM p.149 |
| Cost | `weight × 10,000 C-Bills` | `weight × 10,000 C-Bills` | TM p.149 |

**Direct Fire Weapons Include:**
- Energy weapons (lasers, PPCs, flamers)
- Ballistic weapons (ACs, Gauss rifles)

**Direct Fire Weapons Exclude:**
- Missile weapons (LRMs, SRMs)
- Artillery weapons
- Support weapons

**Example (50-ton mech, 15 tons of direct-fire weapons):**
- IS: Weight = ceil(15 / 4) = 4 tons, 4 slots, 40,000 C-Bills
- Clan: Weight = ceil(15 / 5) = 3 tons, 3 slots, 30,000 C-Bills

---

### **MASC (Myomer Accelerator Signal Circuitry)**

| Property | IS Formula | Clan Formula | Source |
|----------|-----------|--------------|--------|
| Weight | `ceil(engineRating / 20)` | `ceil(engineRating / 25)` | TM p.230 |
| Slots | `ceil(engineRating / 20)` | `ceil(engineRating / 25)` | TM p.230 |
| Cost | `mechTonnage × 1,000 C-Bills` | `mechTonnage × 1,000 C-Bills` | TM p.230 |

**Placement:** No special restrictions (any location with available slots)

**Example (50-ton mech, 200 engine):**
- IS: Weight = ceil(200 / 20) = 10 tons, 10 slots, 50,000 C-Bills
- Clan: Weight = ceil(200 / 25) = 8 tons, 8 slots, 50,000 C-Bills

---

### **Supercharger**

| Property | Formula | Source |
|----------|---------|--------|
| Weight | `ceil(engineWeight / 10)` rounded to 0.5t | TM p.232 |
| Slots | 1 (fixed) | TM p.232 |
| Cost | `engineWeight × 10,000 C-Bills` | TM p.232 |

**Placement:** Must be in torso, adjacent to engine

**Example (50-ton mech, 8.5 ton engine):**
- Weight = ceil(8.5 / 10) = 1 ton
- Cost = 85,000 C-Bills

---

### **Partial Wing**

| Property | Formula | Source |
|----------|---------|--------|
| Weight | `mechTonnage × 0.05` rounded to 0.5t | TM p.234 |
| Slots | 6 (3 per side torso) | TM p.234 |
| Cost | `weight × 50,000 C-Bills` | TM p.234 |

**Placement:** Requires 3 slots in each side torso

**Example (50-ton mech):**
- Weight = 50 × 0.05 = 2.5 tons
- Cost = 125,000 C-Bills

---

### **Triple Strength Myomer (TSM)**

| Property | Formula | Source |
|----------|---------|--------|
| Weight | 0 (replaces standard myomer) | TM p.218 |
| Slots | 6 (distributed across torso/legs) | TM p.218 |
| Cost | `mechTonnage × 16,000 C-Bills` | TM p.218 |

**Example (50-ton mech):**
- Weight = 0 tons
- Cost = 800,000 C-Bills

---

### **Jump Jets**

| Tonnage Class | Standard Weight | Improved Weight | Source |
|--------------|-----------------|-----------------|--------|
| Light (10-55t) | 0.5t per JJ | 1.0t per JJ | TM p.53 |
| Medium (60-85t) | 1.0t per JJ | 2.0t per JJ | TM p.53 |
| Heavy (90-100t) | 2.0t per JJ | 4.0t per JJ | TM p.53 |

**Note:** Jump jets already have calculations in `movementCalculations.ts`

---

### **Physical Weapons**

All physical weapons have variable weight, slots, and damage based on mech tonnage:

| Weapon | Weight | Slots | Damage |
|--------|--------|-------|--------|
| Hatchet | `ceil(tonnage / 15)` | weight | `floor(tonnage / 5)` |
| Sword | `ceil(tonnage / 15)` | weight | `floor(tonnage / 10) + 1` |
| Mace | `ceil(tonnage / 10)` | weight | `floor(tonnage / 4)` |
| Lance | `ceil(tonnage / 20)` | weight | `floor(tonnage / 5)` |
| Claws | `ceil(tonnage / 15)` | weight | `floor(tonnage / 7)` |
| Talons | `ceil(tonnage / 15)` | weight | `floor(tonnage / 5)` (bonus) |
| Retractable Blade | `ceil(tonnage / 20)` | weight | `floor(tonnage / 10)` |
| Flail | `ceil(tonnage / 10)` | weight | `floor(tonnage / 4)` |
| Wrecking Ball | `ceil(tonnage / 10)` | weight | `floor(tonnage / 5)` |

**Note:** Physical weapons already have calculations in `PhysicalWeaponTypes.ts`

---

## 🛠️ **Implementation Details**

### **Code Architecture**

```
src/types/equipment/
└── VariableEquipment.ts       # Interfaces
    - IVariableEquipmentContext
    - IVariableEquipmentConfig
    - ICalculatedEquipmentProperties
    - VariableProperty enum

src/utils/equipment/
├── variableEquipmentCalculations.ts  # All formulas
├── EquipmentCalculator.ts            # Unified service
└── index.ts                          # Barrel export
```

### **Usage Example**

```typescript
import { 
  calculateEquipmentProperties,
  calculateTargetingComputerProperties,
  calculateMASCProperties 
} from '@/utils/equipment';
import { TechBase } from '@/types/enums/TechBase';

// Using the unified calculator
const tcProps = calculateEquipmentProperties('targeting-computer', {
  mechTonnage: 50,
  engineRating: 200,
  engineWeight: 8.5,
  directFireWeaponTonnage: 15,
  techBase: TechBase.INNER_SPHERE,
});
// Returns: { weight: 4, criticalSlots: 4, costCBills: 40000, ... }

// Using convenience functions
const tcDirect = calculateTargetingComputerProperties(15, TechBase.INNER_SPHERE);
const mascDirect = calculateMASCProperties(200, 50, TechBase.CLAN);
```

### **Identifying Variable Equipment**

```typescript
import { isVariableEquipment } from '@/types/equipment';

if (isVariableEquipment(equipment)) {
  // equipment.variableConfig is available
  const { calculationId, inputRequirements } = equipment.variableConfig;
}
```

---

## ⚡ **Quick Reference**

### **Variable Equipment IDs**

| Equipment | Calculation ID | Variable Properties |
|-----------|---------------|---------------------|
| Targeting Computer (IS) | `targeting-computer` | weight, slots, cost |
| Targeting Computer (Clan) | `targeting-computer` | weight, slots, cost |
| MASC (IS) | `masc` | weight, slots, cost |
| MASC (Clan) | `masc` | weight, slots, cost |
| Supercharger | `supercharger` | weight, cost |
| Partial Wing | `partial-wing` | weight, cost |
| TSM | `tsm` | cost |
| Physical Weapons | `hatchet`, `sword`, etc. | weight, slots, damage |

### **Context Requirements**

| Equipment | Required Inputs |
|-----------|----------------|
| Targeting Computer | directFireWeaponTonnage, techBase |
| MASC | engineRating, mechTonnage, techBase |
| Supercharger | engineWeight |
| Partial Wing | mechTonnage |
| TSM | mechTonnage |
| Physical Weapons | mechTonnage |

---

## 🔗 **Related Rules**

### **Dependencies**
- [Construction Rules](01-construction-rules.md) - Weight limits
- [Equipment Rules](04-equipment-rules.md) - Placement restrictions

### **Dependents**
- [Validation Rules](02-validation-rules.md) - Uses these calculations

---

## ✅ **Validation Checklist**

- [ ] Variable equipment marked with `isVariable: true`
- [ ] All formulas match TechManual exactly
- [ ] Rounding rules followed (ceil, 0.5t increments)
- [ ] Context inputs validated before calculation
- [ ] Edge cases handled (0 tonnage, missing inputs)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-30
**Status**: Complete

