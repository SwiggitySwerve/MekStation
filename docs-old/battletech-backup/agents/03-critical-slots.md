# Critical Slots - BattleTech Rules

## 📋 **Metadata**
- **Category**: Critical Slots
- **Source**: TechManual / Implementation
- **Last Updated**: [Current Date]
- **Related Files**:
  - Code: `components/criticalSlots/`
  - Docs: `docs/battletech/battletech_critical_slots.md`
- **Related Rules**:
  - [Construction Rules](01-construction-rules.md)
  - [Equipment Rules](04-equipment-rules.md)
  - [Validation Rules](02-validation-rules.md)

---

## 🔍 **Overview**

The Critical Slot system is the physical representation of a BattleMech's internal space. Every BattleMech has a fixed number of critical slots distributed across 8 locations (Head, Center Torso, Left/Right Torso, Left/Right Arm, Left/Right Leg). All equipment, including engines, gyros, weapons, and heat sinks, must occupy these slots.

---

## 📜 **Core Rules**

### **Slot Distribution**

- **Type**: Constraint (Fixed)
- **Priority**: Critical
- **Source**: TechManual
- **Description**: Every BattleMech has exactly 78 critical slots distributed as follows:
  - **Head**: 6 slots
  - **Center Torso**: 12 slots
  - **Left Torso**: 12 slots
  - **Right Torso**: 12 slots
  - **Left Arm**: 12 slots
  - **Right Arm**: 12 slots
  - **Left Leg**: 6 slots
  - **Right Leg**: 6 slots
- **Code Reference**:
  ```typescript
  // File: constants/BattleTechConstructionRules.ts
  // Constant: CRITICAL_SLOTS_PER_LOCATION
  export const CRITICAL_SLOTS_PER_LOCATION = {
    HEAD: 6,
    CENTER_TORSO: 12,
    LEFT_TORSO: 12,
    RIGHT_TORSO: 12,
    LEFT_ARM: 12,
    RIGHT_ARM: 12,
    LEFT_LEG: 6,
    RIGHT_LEG: 6
  };
  ```

### **Mandatory Components**

- **Type**: Restriction
- **Priority**: Critical
- **Description**: Certain slots are permanently occupied by mandatory systems and cannot be removed or moved.
- **Locations**:
  - **Head**: Life Support (Slot 0), Sensors (Slot 1), Cockpit (Slot 2), Sensors (Slot 4), Life Support (Slot 5). *Note: Slot indices are 0-based in code.*
  - **Center Torso**: Engine (Slots 0-2), Gyro (Slots 3-6), Engine (Slots 7-9).
  - **Legs**: Hip, Upper Leg Actuator, Lower Leg Actuator, Foot Actuator (Slots 0-3).
  - **Arms**: Shoulder, Upper Arm Actuator (Slots 0-1). Lower Arm and Hand are optional/removable on some mechs (OmniMechs).
- **Exceptions**: Compact Gyro, XL Gyro, XL Engine change these fixed allocations.

### **Equipment Size**

- **Type**: Constraint
- **Priority**: High
- **Description**: Equipment occupies a specific number of **contiguous** slots in a single location.
- **Examples**:
  - Medium Laser: 1 slot
  - PPC: 3 slots
  - AC/20: 10 slots
  - Endo Steel / Ferro-Fibrous: Dynamic floating slots (14 for IS, 7 for Clan) that do not need to be contiguous.

### **Split Criticals**

- **Type**: Exception
- **Priority**: Medium
- **Description**: Certain very large items (like AC/20s in some rulesets or massive artillery) can be split between adjacent locations (e.g., Right Torso and Right Arm).
- **Rule**: Splits must be across valid adjacent locations.

---

## 🛠️ **Implementation Details**

### **Code Location**

**Primary Implementation:**
- File: `utils/criticalSlots/UnitCriticalManager.ts`
- Purpose: Manages the state of critical slots, placement, and validation.

**Supporting Code:**
- File: `components/criticalSlots/CriticalSlotBoard.tsx`
- Purpose: UI representation of the critical slot board.

### **Data Structure**

```typescript
interface CriticalSlot {
  location: string;
  index: number; // 0-11
  item?: EquipmentItem;
  isFixed: boolean; // True for Life Support, Gyro, etc.
  isDynamic: boolean; // True for Endo/Ferro slots
  isEmpty: boolean;
}
```

### **Placement Logic**

1. **Check Capacity**: Does the location have enough empty slots?
2. **Check Contiguity**: Are the empty slots contiguous (for weapons)?
3. **Check Restrictions**: Is this item allowed in this location (e.g., no Jump Jets in Arms)?
4. **Assign**: Update slot array with item reference.

### **Edge Cases**

1. **Endo Steel / Ferro-Fibrous**
   - Description: These technologies consume "critical space" but are not physical items placed in specific spots.
   - Handling: They consume "floating" slots. The user (or auto-allocator) assigns them to empty slots to satisfy the requirement count (e.g., 14 slots for IS Endo Steel).

2. **Engine/Gyro Hits**
   - Description: Engines and Gyros occupy multiple slots. A hit to *any* of their slots counts as a hit to the system.
   - Handling: All slots referencing the same component ID link to the same health status.

3. **OmniMech Pods**
   - Description: OmniMechs have "fixed" items (Engine, etc.) and "pod space" (open slots).
   - Handling: Fixed items are locked; open slots are available for pod equipment.

---

## ⚡ **Quick Reference**

### **Slot Consumption Table**

| Item | Slots (IS) | Slots (Clan) | Notes |
|------|------------|--------------|-------|
| Double Heat Sink | 3 | 2 | |
| Endo Steel | 14 | 7 | Floating |
| Ferro-Fibrous | 14 | 7 | Floating |
| XL Engine | +3 (Side Torsos) | +2 (Side Torsos) | Adds slots to L/R Torso |
| Light Engine | +2 (Side Torsos) | N/A | |
| XL Gyro | 6 | N/A | |
| Compact Gyro | 2 | N/A | |

---

## 🔗 **Related Rules**

### **Dependencies**
- [Construction Rules](01-construction-rules.md) - Defines what *can* be built.
- [Equipment Rules](04-equipment-rules.md) - Defines equipment sizes.

### **Dependents**
- [Validation Rules](02-validation-rules.md) - Checks if slots are legal.

### **Interactions**
- Installing an XL Engine reduces available slots in Side Torsos.
- Installing Endo Steel reduces overall available slots by 14.

---

## ✅ **Validation Checklist**

- [ ] All 78 slots are accounted for.
- [ ] Mandatory components are present and in correct slots.
- [ ] Equipment does not exceed available slots.
- [ ] Multi-slot items are contiguous (unless splitting rules apply).
- [ ] Floating slots (Endo/Ferro) count matches requirements.

---

## 📝 **Notes**

- The "Head" effectively has only 1 free slot for equipment in standard configuration (6 total - 5 fixed).
- Center Torso has 2 free slots (12 - 10 fixed for Engine/Gyro) in standard configuration.
- "Roll Again" or "Empty" slots are treated as empty for placement but have combat implications.

---

**Document Version**: 1.0
**Last Updated**: [Current Date]
**Status**: Complete

