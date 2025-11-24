# 📋 BattleTech Construction Validation Rules Summary

## 🎯 **Document Overview**
**Purpose**: Complete validation checklist for BattleMech construction compliance  
**Scope**: ✅ **All construction constraints, validation formulas, and error checking procedures**  
**Application**: Design tool validation, construction verification, and rule compliance checking

---

## ⚖️ **Primary Weight & Structure Validation**

### **✅ Fundamental Weight Constraints**
```
RULE: Total Component Weight ≤ Mech Tonnage
Components: Structure + Armor + Engine + Equipment + Weapons + Ammunition
Validation: Sum(all_components) ≤ mech_tonnage
Error: "Design exceeds maximum tonnage by X tons"
```

### **🎯 Internal Structure Requirements**
```
RULE: Structure Weight = 10% of Tonnage (Standard) OR 5% (Endo Steel)
Standard: structure_weight = mech_tonnage × 0.10
Endo Steel: structure_weight = ROUND_UP(mech_tonnage × 0.05, 0.5)
Validation: structure_weight == calculated_weight
Error: "Internal structure weight incorrect"
```

### **📊 Structure Point Distribution Validation**
```
RULE: Structure Points Must Match Tonnage-Based Formula
Head: ALWAYS 3 points
Center Torso: ROUND_UP(3.2 × (tonnage ÷ 10))
Left/Right Torso: ROUND_UP(2.1 × (tonnage ÷ 10)) each
Left/Right Arm: ROUND_UP(1.7 × (tonnage ÷ 10)) each
Left/Right Leg: ROUND_UP(2.1 × (tonnage ÷ 10)) each

Validation: 
  total_structure = head + ct + (2×torso) + (2×arm) + (2×leg)
  expected_total = ROUND_UP(tonnage × 0.1)
  total_structure == expected_total
Error: "Structure point distribution incorrect for tonnage"
```

---

## 🛡️ **Armor Allocation Validation**

### **✅ Maximum Armor Constraints**
```
RULE: Location Armor ≤ 2 × Structure Points (Except Head)
For each location (except head):
  location_armor ≤ (structure_points × 2)
  
Head Exception:
  head_armor ≤ 9 (regardless of 3 structure points)

Validation: Check each location individually
Error: "Location X exceeds maximum armor (Y points maximum)"
```

### **🎯 Torso Armor Distribution**
```
RULE: Front + Rear Armor ≤ Maximum for Location
For each torso location:
  front_armor + rear_armor ≤ (structure_points × 2)
  front_armor ≥ 0 AND rear_armor ≥ 0

Validation: 
  total_torso_armor = front + rear
  total_torso_armor ≤ max_armor_for_location
Error: "Torso armor distribution exceeds maximum"
```

### **📊 Armor Weight Calculation**
```
RULE: Armor Weight = Total Points ÷ Efficiency Rating
Standard Armor: armor_weight = total_armor_points ÷ 16
Ferro-Fibrous: armor_weight = total_armor_points ÷ 20

Validation: calculated_weight == assigned_weight
Error: "Armor weight calculation incorrect"
```

---

## ⚙️ **Critical Slot Validation**

### **✅ Slot Distribution Constraints**
```
RULE: Fixed Slot Allocation Per Location
Head: 6 slots maximum
Center Torso: 12 slots maximum
Left/Right Torso: 12 slots each maximum
Left/Right Arm: 12 slots each maximum
Left/Right Leg: 6 slots each maximum
Total: 78 slots maximum

Validation: 
  For each location: used_slots ≤ max_slots_for_location
  total_used ≤ 78
Error: "Location X exceeds slot capacity" OR "Total slots exceeded"
```

### **🎯 Mandatory System Requirements**
```
RULE: Required Systems Must Be Present
Head Requirements:
  - Life Support: 2 slots
  - Sensors: 2 slots  
  - Cockpit: 1 slot

Center Torso Requirements:
  - Engine: 6 slots (standard) OR 6+sides (XL)
  - Gyroscope: 4 slots (standard)

Leg Requirements (each):
  - Hip Actuator: 1 slot
  - Upper Leg Actuator: 1 slot
  - Lower Leg Actuator: 1 slot
  - Foot Actuator: 1 slot

Validation: Required systems present in correct locations
Error: "Missing mandatory system: X in location Y"
```

### **📋 Equipment Slot Consumption**
```
RULE: Equipment Slot Usage Must Match Specifications
Single-Slot Items: 1 slot each
Multi-Slot Items: Specified slot count
Advanced Technologies:
  - Endo Steel (IS): 14 slots total
  - Endo Steel (Clan): 7 slots total
  - Ferro-Fibrous (IS): 14 slots total
  - Ferro-Fibrous (Clan): 7 slots total

Validation: 
  For each item: slots_used == specification_requirement
Error: "Equipment X using incorrect slot count"
```

---

## 🔧 **Engine & Mobility Validation**

### **✅ Engine Rating Constraints**
```
RULE: Engine Must Support Desired Movement
Minimum Rating: (tonnage × desired_speed²) ÷ 400
Maximum Rating: 400 (practical limit)
Standard Increments: 25, 50, 75, 100, 125, 150, etc.

Validation:
  rating ≥ minimum_for_speed
  rating ≤ 400
  rating IN valid_engine_ratings
Error: "Engine rating invalid for tonnage/speed combination"
```

### **🎯 Engine Type Slot Requirements**
```
RULE: Engine Types Have Fixed Slot Costs
Standard Engine: 6 center torso slots
Light Engine: 6 CT + 2 per side torso (10 total)
XL Engine (IS): 6 CT + 3 per side torso (12 total)
XL Engine (Clan): 6 CT + 2 per side torso (10 total)
Compact Engine: 3 center torso slots

Validation: slots_allocated == engine_type_requirement
Error: "Engine type requires different slot allocation"
```

### **📊 Heat Sink Capacity Validation**
```
RULE: Heat Sink Placement Rules
Engine Capacity: MIN(10, engine_rating ÷ 25) free heat sinks
External Requirement: total_heat_sinks - engine_capacity
Single Heat Sinks: 1 slot each external
Double Heat Sinks: 3 slots each external (IS) OR 2 slots (Clan)

Validation:
  engine_sinks ≤ engine_capacity
  external_sinks × slot_cost ≤ available_slots
Error: "Heat sink allocation violates engine/slot constraints"
```

---

## 🔫 **Weapon & Equipment Validation**

### **✅ Equipment Location Restrictions**
```
RULE: Equipment Must Be Placed in Valid Locations
Head Restrictions:
  - Maximum weapon size: 1 slot
  - No ammunition storage
  - No heat sinks (except compact)

Arm Restrictions:
  - Actuator requirements for physical attacks
  - Lower arm/hand removable for large weapons

Leg Restrictions:
  - Limited to 6 slots each
  - Stealth armor must be in legs

Validation: equipment_location IN allowed_locations_for_item
Error: "Equipment X cannot be mounted in location Y"
```

### **🎯 Ammunition Dependency Validation**
```
RULE: Ballistic/Missile Weapons Require Ammunition
For each ballistic/missile weapon:
  - Matching ammunition type must exist
  - Ammunition must be accessible to weapon
  - Minimum 1 ton per weapon type recommended

Validation:
  For weapon in ballistic_weapons:
    matching_ammo_exists(weapon.ammo_type) == TRUE
Error: "Weapon X has no ammunition supply"
```

### **📋 Equipment Compatibility Validation**
```
RULE: Equipment Must Match Technology Base
Mech Tech Base: ["Inner Sphere", "Clan", "Mixed (IS Chassis)", "Mixed (Clan Chassis)"]
Equipment Tech Base: ["IS", "Clan"]

Compatibility Matrix:
  - IS Chassis: IS equipment allowed, Clan equipment allowed if Mixed
  - Clan Chassis: Clan equipment allowed, IS equipment allowed if Mixed
  - Mixed Chassis: Both types allowed with restrictions

Validation: equipment.tech_base IN allowed_tech_bases_for_chassis
Error: "Equipment X tech base incompatible with chassis Y"
```

---

## 🔬 **Advanced Technology Validation**

### **✅ Endo Steel Structure Validation**
```
RULE: Endo Steel Has Specific Requirements
Weight: 50% of standard structure weight (rounded up to 0.5 ton)
Slots: 14 slots (IS) OR 7 slots (Clan)
Distribution: Can be split across any locations
Structure Points: Identical to standard structure

Validation:
  weight == ROUND_UP(standard_weight × 0.5, 0.5)
  total_slots_used == tech_base_requirement
  structure_points == standard_structure_points
Error: "Endo steel configuration incorrect"
```

### **🎯 Ferro-Fibrous Armor Validation**
```
RULE: Ferro-Fibrous Armor Has Specific Requirements
Weight: 80% of standard armor weight
Slots: 14 slots (IS) OR 7 slots (Clan)
Distribution: Can be split across any locations
Protection: Identical armor point values

Validation:
  weight == standard_armor_weight × 0.8
  total_slots_used == tech_base_requirement
  armor_points == standard_armor_points
Error: "Ferro-fibrous armor configuration incorrect"
```

### **📊 Technology Combination Limits**
```
RULE: Multiple Advanced Technologies Compete for Slots
Common Combinations:
  - Endo Steel + Ferro-Fibrous: 28 slots (IS) OR 14 slots (Clan)
  - + XL Engine: Additional 6 side torso slots (IS) OR 4 (Clan)
  - + Double Heat Sinks: 3 slots each external (IS) OR 2 (Clan)

Validation:
  total_advanced_tech_slots ≤ available_non_mandatory_slots
Error: "Insufficient critical slots for technology combination"
```

---

## 🎯 **Construction Sequence Validation**

### **✅ Validation Order Checklist**
```
1. BASIC CONSTRAINTS
   □ Total weight ≤ mech tonnage
   □ Structure weight/points correct for tonnage
   □ Engine rating valid for desired speed
   □ All locations have structure points > 0

2. CRITICAL SLOT VALIDATION
   □ No location exceeds slot maximum
   □ All mandatory systems present
   □ Advanced technologies use correct slot counts
   □ Equipment fits in assigned locations

3. ARMOR VALIDATION
   □ No location exceeds armor maximum
   □ Armor weight calculation correct
   □ Torso front/rear distribution valid

4. EQUIPMENT VALIDATION
   □ All weapons have ammunition (if required)
   □ Equipment tech base compatibility
   □ Location restrictions observed
   □ Heat sink capacity adequate

5. ADVANCED SYSTEMS
   □ Technology slot requirements met
   □ Weight calculations correct
   □ Compatibility rules observed
```

---

## ⚠️ **Common Validation Errors**

### **🔴 Critical Errors (Design Invalid)**
```
ERROR: "Total weight exceeds tonnage limit"
Fix: Remove equipment or upgrade to larger chassis

ERROR: "Location armor exceeds structure limit" 
Fix: Reduce armor OR increase structure (impossible)

ERROR: "Missing mandatory systems"
Fix: Add required life support, engine, gyro, actuators

ERROR: "Critical slots exceeded"
Fix: Remove equipment OR use advanced technologies

ERROR: "Engine insufficient for desired speed"
Fix: Upgrade engine OR reduce target speed
```

### **🟡 Warning Conditions (Design Suboptimal)**
```
WARNING: "Weapon has no ammunition"
Recommendation: Add ammunition supply

WARNING: "Very low armor allocation"
Recommendation: Increase armor for survivability

WARNING: "Excess heat generation"
Recommendation: Add heat sinks OR reduce weapons

WARNING: "Unbalanced armor distribution"
Recommendation: Redistribute armor for better protection
```

### **🟢 Optimization Suggestions**
```
SUGGESTION: "Endo steel would save X tons"
Benefit: Weight savings for more equipment

SUGGESTION: "Ferro-fibrous would save X tons"
Benefit: More equipment capacity

SUGGESTION: "Ammunition consolidation possible"
Benefit: Reduced ammunition types, better efficiency

SUGGESTION: "Heat sink redistribution recommended"
Benefit: Better heat management
```

---

## 📐 **Mathematical Validation Formulas**

### **✅ Core Calculation Verification**
```
Structure Weight Validation:
  standard_weight = tonnage × 0.10
  endo_weight = ROUND_UP(tonnage × 0.05, 0.5)

Structure Points Validation:
  head = 3
  center_torso = ROUND_UP(3.2 × (tonnage ÷ 10))
  side_torso = ROUND_UP(2.1 × (tonnage ÷ 10))
  arm = ROUND_UP(1.7 × (tonnage ÷ 10))
  leg = ROUND_UP(2.1 × (tonnage ÷ 10))

Armor Validation:
  max_armor_per_location = structure_points × 2 (except head = 9)
  armor_weight = total_armor ÷ 16 (standard) OR ÷ 20 (ferro-fibrous)

Heat Validation:
  heat_generated = SUM(weapon_heat_per_turn)
  heat_dissipated = heat_sinks × dissipation_rate
  heat_efficiency = heat_dissipated ≥ heat_generated
```

### **🎯 Technology Validation Formulas**
```
Endo Steel:
  slot_requirement = 14 (IS) OR 7 (Clan)
  weight_savings = standard_structure_weight × 0.5

Ferro-Fibrous:
  slot_requirement = 14 (IS) OR 7 (Clan)  
  weight_savings = standard_armor_weight × 0.2

XL Engine:
  side_torso_slots = 3 (IS) OR 2 (Clan) per side
  weight_savings = standard_engine_weight × 0.5
  vulnerability = multi_location_destruction_risk
```

---

## 🔍 **Automated Validation Implementation**

### **✅ Validation Function Pseudocode**
```python
def validate_battlemech_design(mech):
    errors = []
    warnings = []
    
    # Weight validation
    if mech.total_weight > mech.tonnage:
        errors.append(f"Exceeds tonnage by {mech.total_weight - mech.tonnage}")
    
    # Structure validation
    expected_structure = calculate_structure_points(mech.tonnage)
    if mech.structure_points != expected_structure:
        errors.append("Structure point allocation incorrect")
    
    # Armor validation
    for location in mech.locations:
        max_armor = get_max_armor(location)
        if location.armor > max_armor:
            errors.append(f"{location.name} armor exceeds maximum")
    
    # Slot validation
    for location in mech.locations:
        if location.used_slots > location.max_slots:
            errors.append(f"{location.name} exceeds slot capacity")
    
    # Equipment validation
    validate_mandatory_systems(mech, errors)
    validate_ammunition_supplies(mech, warnings)
    validate_tech_base_compatibility(mech, errors)
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings
    }
```

---

## 📊 **Quick Validation Reference Tables**

### **Structure Points by Tonnage (Key Values)**
| Tonnage | H | CT | LT/RT | LA/RA | LL/RL | Total |
|---------|---|----|----|----|----|-------|
| **25** | 3 | 8 | 6 | 4 | 6 | 43 |
| **50** | 3 | 16 | 12 | 8 | 12 | 83 |
| **75** | 3 | 24 | 17 | 13 | 17 | 121 |
| **100** | 3 | 32 | 23 | 17 | 23 | 161 |

### **Critical Slot Maximums**
| Location | Max Slots | Typical Mandatory | Available |
|----------|-----------|-------------------|-----------|
| **Head** | 6 | 5 (systems) | 1 |
| **Center Torso** | 12 | 10 (engine+gyro) | 2 |
| **Torsos** | 12 each | 0-3 (XL engine) | 9-12 |
| **Arms** | 12 each | 2 (actuators) | 10 |
| **Legs** | 6 each | 4 (actuators) | 2 |

### **Advanced Technology Costs**
| Technology | IS Slots | Clan Slots | Weight Savings |
|------------|----------|------------|----------------|
| **Endo Steel** | 14 | 7 | 50% structure |
| **Ferro-Fibrous** | 14 | 7 | 20% armor |
| **XL Engine** | +6 side torso | +4 side torso | 50% engine |
| **Double Heat Sinks** | 3 each external | 2 each external | Heat efficiency |

---

**Reference Version**: 1.0 Validation Focus  
**Scope**: Complete Construction Rule Compliance ✅  
**Accuracy**: MegaMekLab Validation Compatible 🎯  
**Application**: Design Tool Implementation & Quality Assurance ⚡