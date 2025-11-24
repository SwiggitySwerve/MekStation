# Tech Level Rules - BattleTech Rules

## 📋 **Metadata**
- **Category**: Tech Level Rules
- **Source**: TechManual / Implementation
- **Last Updated**: [Current Date]
- **Related Files**:
  - Code: `services/validation/TechLevelRulesValidator.ts`
  - Docs: `docs/battletech/battletech_tech_levels.md`
- **Related Rules**:
  - [Validation Rules](02-validation-rules.md)
  - [Equipment Rules](04-equipment-rules.md)

---

## 🔍 **Overview**

Tech Level rules enforce historical and technological accuracy. They determine what components are available based on the Unit's Technology Base (Inner Sphere vs. Clan) and the Era (year). This ensures a 3025 Inner Sphere mech doesn't accidentally equip a 3050 Clan ER PPC.

---

## 📜 **Core Rules**

### **Technology Base**

- **Type**: Definition
- **Priority**: Critical
- **Description**: Every BattleMech has a specific Tech Base:
  - **Inner Sphere (IS)**: Standard technology.
  - **Clan**: Advanced technology (lighter, smaller, hotter, longer range).
  - **Mixed**: Allows mixing IS and Clan components (requires advanced rules).
- **Validation**:
  - IS Mechs can ONLY use IS components.
  - Clan Mechs can ONLY use Clan components.
  - Mixed Mechs can use both.

### **Tech Rating (Availability)**

- **Type**: Classification
- **Priority**: Medium
- **Description**: Every component has a Tech Rating indicating its complexity and availability:
  - **A-C**: Common / Low Tech (Retro/Industrial).
  - **D**: Standard Inner Sphere (3025+).
  - **E**: Advanced Inner Sphere / Standard Clan.
  - **F**: Experimental / Advanced Clan.
  - **X**: Risky / Unique.

### **Era Restrictions**

- **Type**: Restriction
- **Priority**: High
- **Description**: Components have an "Introduction Year" and sometimes an "Extinction Year".
- **Rule**: `Unit_Year >= Component_Intro_Year`.
- **Example**: Double Heat Sinks (IS) reintroduced in 3030. A 3025 Mech cannot use them.

---

## 🛠️ **Implementation Details**

### **Code Location**

**Primary Implementation:**
- File: `services/validation/TechLevelRulesValidator.ts`
- Purpose: Validates component choices against unit tech base and year.

### **Data Structure**

```typescript
interface Component {
  // ... standard fields
  techBase: 'Inner Sphere' | 'Clan' | 'Both';
  introYear: number;
  extinctionYear?: number;
  reintroYear?: number; // For Lostech
  rating: string; // A-F, X
}
```

### **Validation Logic**

1. **Base Check**:
   - If `Unit.TechBase == 'Inner Sphere'` AND `Component.TechBase == 'Clan'`, RETURN INVALID.
   - If `Unit.TechBase == 'Clan'` AND `Component.TechBase == 'Inner Sphere'`, RETURN INVALID (usually, unless 'Both').

2. **Year Check**:
   - If `Unit.Year < Component.IntroYear`, RETURN INVALID.
   - If `Unit.Year > Component.ExtinctionYear` AND `Unit.Year < Component.ReintroYear`, RETURN INVALID (Lostech era).

### **Edge Cases**

1. **Mixed Tech Chassis**
   - Description: A chassis built with one tech base but mounting other tech base weapons.
   - Handling: Requires explicit "Mixed Tech" flag on the unit.

2. **Clan Invasion (3050)**
   - Description: The pivotal moment when Clan tech appears.
   - Handling: Strict year checks are crucial here.

3. **Prototypes**
   - Description: Equipment available earlier than mass production but with penalties (X-rated).
   - Handling: Allowed if "Allow Experimental/Prototype" flag is set in validation options.

---

## ⚡ **Quick Reference**

### **Key Dates**

| Era | Year Range | Key Technologies |
|-----|------------|------------------|
| Star League | 2571-2780 | XL Engine, Endo Steel, DHS, ER Lasers |
| Succession Wars | 2781-3049 | Tech decline. Standard everything. |
| Clan Invasion | 3050-3061 | Clan Tech, IS rediscovery (XL, DHS return). |
| Civil War | 3062-3067 | Light Engines, Rotary ACs, Heavy Gauss. |
| Jihad | 3068-3080 | Experimental tech, Compact Engines/Gyros. |

### **Tech Base Compatibility**

| Unit Base | IS Component | Clan Component | Mixed Component |
|-----------|--------------|----------------|-----------------|
| Inner Sphere | ✅ | ❌ | ✅ |
| Clan | ❌ | ✅ | ✅ |
| Mixed | ✅ | ✅ | ✅ |

---

## 🔗 **Related Rules**

### **Dependencies**
- None.

### **Dependents**
- [Equipment Rules](04-equipment-rules.md) - Availability of equipment.
- [Validation Rules](02-validation-rules.md) - Enforces these rules.

### **Interactions**
- Selecting "Clan" Tech Base changes the weight/slot values for Structural components (Endo Steel = 7 slots, Ferro = 7 slots).

---

## ✅ **Validation Checklist**

- [ ] Unit Tech Base is defined.
- [ ] Unit Era/Year is defined.
- [ ] All components match Tech Base.
- [ ] All components available in Era.
- [ ] Mixed Tech validation runs if flag set.

---

## 📝 **Notes**

- Some components are "Both" (e.g., Standard Armor, Standard Heat Sinks, Jump Jets) and can be used by anyone.
- Clan equipment is generally strictly superior (lighter, smaller, longer range) but much more "expensive" in Battle Value (BV).

---

**Document Version**: 1.0
**Last Updated**: [Current Date]
**Status**: Complete

