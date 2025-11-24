# Critical Hits - BattleTech Rules

## 📋 **Metadata**
- **Category**: Gameplay / Critical Hits
- **Source**: Total Warfare / Implementation
- **Last Updated**: [Current Date]
- **Related Files**:
  - Code: `services/gameplay/CriticalHitManager.ts` (Future)
  - Docs: `docs/battletech/battletech_critical_hits.md`
- **Related Rules**:
  - [Critical Slots](03-critical-slots.md)
  - [Validation Rules](02-validation-rules.md)

---

## 🔍 **Overview**

While this project primarily focuses on the **construction** of BattleMechs, understanding Critical Hit mechanics is essential because construction rules (like CASE, component placement, and padding) are entirely driven by the desire to mitigate critical hits.

---

## 📜 **Core Rules**

### **Critical Hit Triggers**

A critical hit check occurs when:
1. **Internal Structure Damage**: A location takes damage to its Internal Structure.
2. **Through-Armor Critical (TAC)**: A specialized roll (2 on 2d6 hit location) bypasses armor.

### **The Critical Roll**

- **2d6 Roll**:
  - **2-7**: No Critical Hit.
  - **8-9**: 1 Critical Hit.
  - **10-11**: 2 Critical Hits.
  - **12**: 3 Critical Hits (Head/Leg blown off triggers separate rules).

### **Location Slots**

- Each location has a lookup table (1-6 dice roll) for slots.
- **Head/Legs**: 1d6 to determine slot.
- **Torso/Arms**: 1d6 for High/Low (1-3, 4-6), then 1d6 for slot.

### **Component Destruction**

- **Weapons/Equipment**: 1 hit destroys the item.
- **Engine**: 3 hits to destroy (each hit adds +5 Heat/turn).
- **Gyro**: 2 hits to destroy (1 hit = Skill Roll penalties).
- **Sensors**: 2 hits to destroy (1 hit = +2 To Hit).
- **Life Support**: 1 hit (Pilot takes damage from heat).
- **Cockpit**: 1 hit (Pilot dead / Mech disabled).
- **Ammo**: 1 hit = **EXPLOSION** (Destroys location, spreads damage inward).

---

## 🛠️ **Implementation Details**

### **Construction Implications**

Because of these rules, the Editor must validate/warn about:

1. **CASE Placement**:
   - CASE stops ammo explosion damage from spreading inward.
   - **Rule**: CASE must be in the same location as the Ammo (for IS).
   - **Warning**: If Ammo is present but no CASE, warn user of risk.

2. **Crit Padding**:
   - Users often fill empty slots with Heat Sinks or Jump Jets to "pad" against crits hitting explosive ammo.
   - The Editor should allow free placement within legal slots to support this strategy.

3. **Floating Crits**:
   - **Endo Steel / Ferro-Fibrous**: These take up slots but cannot be "hit" in a way that disables them (they just re-roll).
   - **Roll Again**: Empty slots cause a re-roll.

### **Ammo Explosions**

- **Damage**: `DamagePerShot * ShotsRemaining`.
- **Mechanic**: Destroys the current location. Excess damage transfers to the next location inward (Arm -> Side Torso -> Center Torso).
- **CASE**: Stops transfer. Damage destroys current location but dissipates out the rear.

---

## ⚡ **Quick Reference**

### **Transfer Diagram**

```
Left Arm  -> Left Torso  -> Center Torso
Right Arm -> Right Torso -> Center Torso
Left Leg  -> Left Torso  -> Center Torso
Right Leg -> Right Torso -> Center Torso
Head      -> Center Torso
```

---

## 🔗 **Related Rules**

### **Dependencies**
- [Critical Slots](03-critical-slots.md) - Defines the layout that can be hit.

### **Dependents**
- None (Gameplay rules).

---

## ✅ **Validation Checklist**

- [ ] (Construction) Warn if Ammo in CT/Head (High lethality).
- [ ] (Construction) Warn if Ammo in Side Torso without CASE (IS).
- [ ] (Construction) Ensure CASE is in valid location.

---

## 📝 **Notes**

- This document is primarily for context. The Editor enforces *placement* rules (CASE location), not gameplay resolution, but the placement rules exist *because* of these gameplay mechanics.

---

**Document Version**: 1.0
**Last Updated**: [Current Date]
**Status**: Complete

