# Equipment Rules - BattleTech Rules

## 📋 **Metadata**
- **Category**: Equipment Rules
- **Source**: TechManual / Implementation
- **Last Updated**: [Current Date]
- **Related Files**:
  - Code: `services/equipment/EquipmentService.ts`
  - Docs: `docs/battletech/battletech_equipment.md`
- **Related Rules**:
  - [Construction Rules](01-construction-rules.md)
  - [Critical Slots](03-critical-slots.md)
  - [Tech Level Rules](05-tech-level-rules.md)

---

## 🔍 **Overview**

Equipment rules govern the selection, placement, and interaction of all non-structural components on a BattleMech. This includes weapons, ammunition, electronics, defensive systems, and physical combat equipment.

---

## 📜 **Core Rules**

### **Equipment Classification**

- **Type**: Definition
- **Priority**: High
- **Description**: Equipment is categorized into distinct types with specific behaviors:
  - **Energy Weapons**: Lasers, PPCs. Generate heat, no ammo needed.
  - **Ballistic Weapons**: Autocannons, Machine Guns. Low heat, require ammo, heavy.
  - **Missile Weapons**: LRMs, SRMs. Low heat, require ammo, flexible range.
  - **Ammunition**: Explosive bins feeding ballistic/missile weapons.
  - **Equipment**: Electronics (Probe, ECM), CASE, Heat Sinks, Jump Jets.
  - **Physical**: Hatchets, Swords, Claws.

### **Location Restrictions**

- **Type**: Restriction
- **Priority**: High
- **Source**: TechManual
- **Description**: Certain equipment is restricted to specific body locations.
- **Rules**:
  - **Jump Jets**: Legs, Left Torso, Right Torso, Center Torso. *Never* Arms or Head.
  - **Melee Weapons**: Arms only (typically).
  - **Ammunition**: Can be placed anywhere, but Head/CT placement is dangerous.
  - **Legs**: Can only mount Jump Jets, Heat Sinks, and Ammo (and very specific items like Leg Spikes). *No ranged weapons in Legs.*

### **Ammunition Requirements**

- **Type**: Constraint
- **Priority**: High
- **Description**: Any weapon with the `requires_ammo` flag must have at least one ton (or half-ton) of compatible ammunition allocated on the mech.
- **Validation**: Warning if weapon exists without ammo.
- **Cross-Tech Ammo**: Inner Sphere weapons generally cannot use Clan ammo, and vice versa, unless specified (e.g., Machine Gun ammo is universal).

### **Heat Generation**

- **Type**: Calculation
- **Priority**: Medium
- **Description**: Every weapon generates a fixed amount of heat when fired. This contributes to the [Heat Management](02-validation-rules.md#heat-management-validation) validation.

---

## 🛠️ **Implementation Details**

### **Code Location**

**Primary Implementation:**
- File: `services/equipment/EquipmentService.ts`
- Purpose: Provides database of all equipment and helper functions.

**Supporting Code:**
- File: `services/validation/EquipmentValidationManager.ts`
- Purpose: Validates equipment placement and requirements.

### **Equipment Data Structure**

```typescript
interface Equipment {
  id: string;
  name: string;
  type: 'Energy' | 'Ballistic' | 'Missile' | 'Ammo' | 'Equipment';
  techBase: 'Inner Sphere' | 'Clan' | 'Mixed';
  tonnage: number;
  slots: number;
  heat: number;
  damage: number;
  range: { min: number; short: number; medium: number; long: number };
  requiresAmmo: boolean;
  ammoPerTon?: number;
  restrictions?: {
    cantPlaceIn?: string[];
    mustPlaceIn?: string[];
  };
}
```

### **Validation Logic**

1. **Tech Base Check**: Is the equipment compatible with the unit's Tech Base?
2. **Location Check**: Is the equipment in a restricted location?
3. **Space/Weight Check**: Does it fit? (Handled by [Critical Slots](03-critical-slots.md) and [Construction Rules](01-construction-rules.md)).
4. **Ammo Check**: If weapon, search inventory for `item.type === 'Ammo' && item.ammoType === weapon.id`.

### **Edge Cases**

1. **Artemis IV / V**
   - Description: Fire control system that attaches to missile launchers.
   - Handling: Adds 1 ton and 1 slot to the launcher. Must be placed in the same location.

2. **CASE / CASE II**
   - Description: Cellular Ammunition Storage Equipment.
   - Handling: Protects against ammo explosions. Must be placed in the location to be protected (Torso only for IS Standard CASE).

3. **Omni-Pod Equipment**
   - Description: On OmniMechs, equipment is "pod-mounted".
   - Handling: Validation must allow swapping pod equipment while locking fixed chassis equipment.

---

## ⚡ **Quick Reference**

### **Common Equipment Stats**

| Weapon | Heat | Damage | Range (S/M/L) | Tonnage | Slots |
|--------|------|--------|---------------|---------|-------|
| Medium Laser | 3 | 5 | 3/6/9 | 1 | 1 |
| PPC | 10 | 10 | 6/12/18 | 7 | 3 |
| LRM-20 | 6 | 1/msl | 7/14/21 | 10 | 5 |
| AC/20 | 7 | 20 | 3/6/9 | 14 | 10 |
| Gauss Rifle | 1 | 15 | 7/15/22 | 15 | 7 |

---

## 🔗 **Related Rules**

### **Dependencies**
- [Tech Level Rules](05-tech-level-rules.md) - Defines what equipment is available.

### **Dependents**
- [Critical Slots](03-critical-slots.md) - Equipment consumes slots.
- [Construction Rules](01-construction-rules.md) - Equipment consumes tonnage.

### **Interactions**
- Heat Sinks interact with Energy Weapons (high heat).
- Ammo interacts with Ballistic/Missile weapons.

---

## ✅ **Validation Checklist**

- [ ] Equipment tech base matches unit.
- [ ] Equipment location is valid (no JJ in arms).
- [ ] Weapons requiring ammo have ammo.
- [ ] Split items (if any) are valid.
- [ ] Arcs are valid (rear-mounted weapons).

---

## 📝 **Notes**

- "One-Shot" (OS) missile launchers do not require ammo bins; the ammo is built-in.
- Rotary Autocannons can jam; logic for this is in gameplay/critical hits, not construction (usually).
- Tonnage for ammo is almost always 1.0 ton per bin, with varying shot counts (e.g., AC/20 = 5 shots, MG = 200 shots). Half-ton bins exist for Machine Guns and some other weapons.

---

**Document Version**: 1.0
**Last Updated**: [Current Date]
**Status**: Complete

