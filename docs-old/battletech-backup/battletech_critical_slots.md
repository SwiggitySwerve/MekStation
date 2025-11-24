# ⚙️ BattleTech Critical Slot System & Equipment Mounting

## 🎯 **Document Overview**
**Purpose**: Complete reference for critical slot allocation, equipment mounting rules, and space management  
**Scope**: ✅ **Fixed slot distributions, mounting restrictions, technology costs, and optimization strategies**  
**Application**: Essential for equipment placement validation, design tools, and construction planning

---

## 📊 **Universal Critical Slot Constants**

### **✅ Fixed Slot Distribution (All Mechs)**
- **Total Critical Slots**: 78 slots per BattleMech (regardless of tonnage)
- **Head**: 6 critical slots
- **Center Torso**: 12 critical slots  
- **Left/Right Torso**: 12 critical slots each
- **Left/Right Arm**: 12 critical slots each
- **Left/Right Leg**: 6 critical slots each

### **🎯 Tonnage Independence Principle**
- **20-ton Locust**: 78 critical slots
- **100-ton Atlas**: 78 critical slots
- **Design Impact**: Equipment capacity limited by space, not just weight
- **Strategic Balance**: Prevents unlimited equipment stacking on large mechs

---

## 🔧 **Mandatory System Requirements**

### **1. Fixed System Placements**

#### **Cockpit Systems (Head - 6 slots total)**
| System | Slots Required | Location | Moveable |
|--------|----------------|----------|-----------|
| **Life Support** | 2 slots | Head | No |
| **Sensors** | 2 slots | Head | No |
| **Cockpit** | 1 slot | Head | No |
| **Available Space** | 1 slot | Head | Yes |

#### **Engine Systems (Center Torso + Side Torsos)**
| Engine Type | CT Slots | Side Torso Slots | Total Slots | Weight Efficiency | Technology Base |
|-------------|----------|------------------|-------------|-------------------|-----------------|
| **Standard Fusion** | 6 slots | 0 slots | 6 slots | 100% weight | Universal |
| **Light Fusion** | 6 slots | 2 slots each side | 10 slots | 75% weight | IS/Clan |
| **XL (Inner Sphere)** | 6 slots | 3 slots each side | 12 slots | 50% weight | Inner Sphere |
| **XL (Clan)** | 6 slots | 2 slots each side | 10 slots | 50% weight | Clan |
| **XXL Fusion** | 6 slots | 6 slots each side | 18 slots | 33% weight | IS/Clan |
| **Compact Fusion** | 3 slots | 0 slots | 3 slots | 150% weight | IS/Clan |
| **ICE Engine** | 6 slots | 0 slots | 6 slots | Standard weight | Industrial |
| **Fuel Cell** | 6 slots | 0 slots | 6 slots | Standard weight | Industrial |

#### **Engine Slot Placement Rules**
- **Center Torso**: All engines use slots 1-3, then additional slots after gyro (slots 8-10, 11-12 as needed)
- **Side Torsos**: XL, Light, and XXL engines place additional slots starting from slot 1
- **Gyro Dependency**: Engine's second CT group placement depends on gyro size
- **Critical Vulnerability**: XL and XXL engines are destroyed if either side torso is destroyed

#### **Gyroscope Systems (Center Torso)**
| Gyro Type | Slots Required | Special Rules | Weight | Technology Base |
|-----------|----------------|---------------|---------|-----------------|
| **Standard** | 4 slots | None | 100% weight | Universal |
| **Compact** | 2 slots | +1 Piloting penalty | 150% weight | IS/Clan |
| **Heavy-Duty** | 4 slots | +1 critical hit resistance | 200% weight | IS/Clan |
| **XL Gyro** | 6 slots | Extra vulnerability | 50% weight | IS/Clan |

#### **Gyro Slot Placement Rules**
- **Placement**: All gyros use Center Torso slots 4-7 (standard), expanding as needed
- **Standard Gyro**: Slots 4-7 (4 slots total)
- **XL Gyro**: Slots 4-9 (6 slots total)
- **Compact Gyro**: Slots 4-5 (2 slots total)
- **Heavy-Duty Gyro**: Slots 4-7 (4 slots total)
- **Engine Interaction**: Engine's second slot group starts after gyro ends

### **2. Actuator Systems**

#### **Arm Actuators (Each Arm)**
| Actuator | Slots | Function | Removeable |
|----------|-------|----------|------------|
| **Shoulder** | 1 slot | Basic arm movement | No |
| **Upper Arm** | 1 slot | Arm rotation | No |
| **Lower Arm** | 1 slot | Elbow joint | Yes* |
| **Hand** | 1 slot | Grasping, punching | Yes* |

*Lower Arm and Hand can be removed to mount arm-flipped weapons

#### **Leg Actuators (Each Leg)**
| Actuator | Slots | Function | Removeable |
|----------|-------|----------|------------|
| **Hip** | 1 slot | Leg attachment | No |
| **Upper Leg** | 1 slot | Thigh movement | No |
| **Lower Leg** | 1 slot | Knee joint | No |
| **Foot** | 1 slot | Ground contact | No |

---

## 🛡️ **Advanced Technology Slot Costs**

### **1. Advanced Structure & Armor Systems**

#### **Inner Sphere Technologies**
| Technology | Slot Cost | Location Restrictions | Weight Benefit |
|------------|-----------|----------------------|----------------|
| **Endo Steel** | 14 slots | Any location | 50% structure weight |
| **Ferro-Fibrous** | 14 slots | Any location | 20% armor weight |
| **Light Ferro-Fibrous** | 7 slots | Any location | 15% armor weight |
| **Heavy Ferro-Fibrous** | 21 slots | Any location | 24% armor weight |
| **Stealth Armor** | 12 slots | Legs only | ECM + armor |

#### **Clan Technologies**
| Technology | Slot Cost | Location Restrictions | Weight Benefit |
|------------|-----------|----------------------|----------------|
| **Endo Steel** | 7 slots | Any location | 50% structure weight |
| **Ferro-Fibrous** | 7 slots | Any location | 20% armor weight |
| **Ferro-Lamellor** | 7 slots | Any location | 15% armor weight |
| **Laser Reflective** | 10 slots | Any location | Energy weapon protection |

### **2. Heat Dissipation Systems**

#### **Heat Sink Technologies**
| Heat Sink Type | Slots per Unit | Heat Dissipation | Weight | Special Rules |
|----------------|----------------|------------------|--------|---------------|
| **Single Heat Sink** | 1 slot | 1 heat/turn | 1 ton | Basic cooling |
| **Double Heat Sink (IS)** | 3 slots | 2 heat/turn | 1 ton | 10 free in engine |
| **Double Heat Sink (Clan)** | 2 slots | 2 heat/turn | 1 ton | 10 free in engine |
| **Compact Heat Sink** | 1 slot | 1 heat/turn | 1 ton | No engine mounting |
| **Laser Heat Sink** | 2 slots | 2 heat/turn | 1 ton | Laser weapons only |

#### **Engine Heat Sink Capacity**
| Engine Rating | Free Heat Sinks | Additional Capacity | External Required |
|---------------|-----------------|-------------------|-------------------|
| **100-200** | 10 singles/doubles | None | All extras external |
| **250-300** | 10 + extras | Up to rating÷25 | Remainder external |
| **325-400** | 10 + extras | Up to rating÷25 | Remainder external |

---

## 🔫 **Weapon System Slot Requirements**

### **1. Energy Weapons**

#### **Laser Systems**
| Weapon | Slots | Tonnage | Heat | Damage | Range |
|--------|-------|---------|------|--------|-------|
| **Small Laser** | 1 slot | 0.5 tons | 1 | 3 | Short |
| **Medium Laser** | 1 slot | 1 ton | 3 | 5 | Medium |
| **Large Laser** | 2 slots | 5 tons | 8 | 8 | Long |
| **PPC** | 3 slots | 7 tons | 10 | 10 | Long |
| **ER Large Laser** | 2 slots | 5 tons | 12 | 8 | Extended |
| **Heavy PPC** | 4 slots | 10 tons | 15 | 15 | Long |

#### **Pulse Laser Systems**
| Weapon | Slots | Tonnage | Heat | Damage | Special |
|--------|-------|---------|------|--------|---------|
| **Small Pulse** | 1 slot | 1 ton | 2 | 3 | +2 accuracy |
| **Medium Pulse** | 1 slot | 2 tons | 4 | 6 | +2 accuracy |
| **Large Pulse** | 2 slots | 7 tons | 10 | 9 | +2 accuracy |

### **2. Ballistic Weapons**

#### **Autocannon Systems**
| Weapon | Slots | Tonnage | Heat | Damage | Ammo per Ton |
|--------|-------|---------|------|--------|--------------|
| **AC/2** | 1 slot | 6 tons | 1 | 2 | 45 rounds |
| **AC/5** | 4 slots | 8 tons | 1 | 5 | 20 rounds |
| **AC/10** | 7 slots | 12 tons | 3 | 10 | 10 rounds |
| **AC/20** | 10 slots | 14 tons | 7 | 20 | 5 rounds |
| **Ultra AC/5** | 5 slots | 9 tons | 1 | 5 | 20 rounds |
| **LB 10-X** | 6 slots | 11 tons | 2 | 10 | 10 rounds |

#### **Gauss Rifle Systems**
| Weapon | Slots | Tonnage | Heat | Damage | Ammo per Ton |
|--------|-------|---------|------|--------|--------------|
| **Gauss Rifle** | 7 slots | 15 tons | 1 | 15 | 8 rounds |
| **Light Gauss** | 5 slots | 12 tons | 1 | 8 | 16 rounds |
| **Heavy Gauss** | 11 slots | 18 tons | 2 | 25 | 4 rounds |

### **3. Missile Systems**

#### **Long Range Missiles**
| Weapon | Slots | Tonnage | Heat | Damage | Ammo per Ton |
|--------|-------|---------|------|--------|--------------|
| **LRM-5** | 1 slot | 2 tons | 2 | 5 | 24 rounds |
| **LRM-10** | 2 slots | 5 tons | 4 | 10 | 12 rounds |
| **LRM-15** | 3 slots | 7 tons | 5 | 15 | 8 rounds |
| **LRM-20** | 5 slots | 10 tons | 6 | 20 | 6 rounds |

#### **Short Range Missiles**
| Weapon | Slots | Tonnage | Heat | Damage | Ammo per Ton |
|--------|-------|---------|------|--------|--------------|
| **SRM-2** | 1 slot | 1 ton | 2 | 2 | 50 rounds |
| **SRM-4** | 1 slot | 2 tons | 3 | 4 | 25 rounds |
| **SRM-6** | 2 slots | 3 tons | 4 | 6 | 15 rounds |

---

## 📦 **Ammunition and Support Systems**

### **1. Ammunition Storage**

#### **Standard Ammunition**
| Ammo Type | Slots per Ton | Rounds per Ton | Special Rules |
|-----------|---------------|----------------|---------------|
| **AC/2 Ammo** | 1 slot | 45 rounds | Standard ballistic |
| **AC/5 Ammo** | 1 slot | 20 rounds | Standard ballistic |
| **AC/10 Ammo** | 1 slot | 10 rounds | Standard ballistic |
| **AC/20 Ammo** | 1 slot | 5 rounds | Standard ballistic |
| **Gauss Ammo** | 1 slot | 8 rounds | Explosion immune |
| **LRM Ammo** | 1 slot | 120 missiles | Standard missile |
| **SRM Ammo** | 1 slot | 100 missiles | Standard missile |

#### **Special Ammunition Types**
| Ammo Type | Effect | Slot Modifier | Weight Modifier |
|-----------|--------|---------------|-----------------|
| **Precision** | +2 accuracy | Same | Same |
| **Armor Piercing** | Ignore some armor | Same | Same |
| **Incendiary** | Heat damage | Same | Same |
| **Cluster** | Area effect | Same | Same |
| **CASE Protection** | Prevents ammo explosion transfer | +0 | +0.5 tons |

### **2. Electronic Systems**

#### **Targeting and Sensors**
| System | Slots | Tonnage | Effect |
|--------|-------|---------|--------|
| **Targeting Computer** | 1-7 slots | 1-7 tons | +1 accuracy per ton |
| **Artemis IV** | 1 slot | 1 ton | LRM/SRM accuracy |
| **Narc Beacon** | 2 slots | 3 tons | Target painting |
| **TAG Laser** | 1 slot | 1 ton | Artillery guidance |
| **C3 Master** | 5 slots | 5 tons | Network coordination |
| **C3 Slave** | 1 slot | 1 ton | Network member |

#### **Electronic Countermeasures**
| System | Slots | Tonnage | Effect |
|--------|-------|---------|--------|
| **Guardian ECM** | 2 slots | 1.5 tons | Stealth/jamming |
| **Angel ECM** | 2 slots | 2 tons | Enhanced jamming |
| **Beagle Probe** | 2 slots | 1.5 tons | Enhanced sensors |
| **Bloodhound Probe** | 3 slots | 2 tons | Superior sensors |

---

## 🎯 **Critical Slot Management Strategies**

### **1. Slot Allocation Priorities**

#### **Essential Systems (Non-Negotiable)**
1. **Life Support/Sensors** - 4 head slots (fixed)
2. **Cockpit** - 1 head slot (fixed)  
3. **Engine** - 6-12 slots depending on type
4. **Gyroscope** - 4 slots (standard)
5. **Actuators** - 8 slots minimum (4 per leg + shoulders)

#### **High-Priority Allocations**
1. **Primary Weapons** - Main offensive capability
2. **Ammunition** - Sufficient for sustained combat
3. **Heat Sinks** - Thermal management for weapons
4. **Advanced Structure/Armor** - If weight savings needed

#### **Secondary Allocations**
1. **Electronic Systems** - C3, ECM, targeting computers
2. **Jump Jets** - Mobility enhancement
3. **CASE Systems** - Ammunition explosion protection
4. **Backup Weapons** - Redundancy and close combat

### **2. Location-Specific Strategies**

#### **Head (6 slots - Very Limited)**
- **Mandatory**: Life Support (2), Sensors (2), Cockpit (1)
- **Available**: 1 slot typically
- **Best Use**: Small weapons, sensors, or ECM
- **Avoid**: Critical systems (high destruction risk)

#### **Center Torso (12 slots - Engine Constrained)**
- **Mandatory**: Engine (6-12 slots), Gyro (4 slots)
- **Standard Engine**: 2 slots available after engine/gyro
- **XL Engine**: No slots available (6 engine + 4 gyro + 2 more engine)
- **Best Use**: Heat sinks, ammunition with CASE

#### **Side Torsos (12 slots each - Most Flexible)**
- **XL Engine Impact**: 2-3 slots used for XL engine sides
- **High Capacity**: Best for large weapons and equipment
- **Ammunition Safety**: Install CASE for explosion protection
- **Heat Sink Placement**: Efficient heat dissipation location

#### **Arms (12 slots each - Weapon Focused)**
- **Actuator Cost**: 2-4 slots for actuators (depending on configuration)
- **Weapon Mounting**: Primary location for direct-fire weapons
- **Arm Flipping**: Remove lower arm/hand for large weapons
- **Targeting Systems**: Good location for targeting computers

#### **Legs (6 slots each - Limited but Safe)**
- **Mandatory**: 4 actuator slots per leg
- **Available**: 2 slots per leg typically
- **Best Use**: Heat sinks, ammunition, jump jets
- **Safety**: Lower destruction probability in combat

---

## 🔀 **Technology Combination Analysis**

### **1. Advanced Technology Slot Competition**

#### **Double Advanced Technology (28 slots total - IS)**
| Combination | Total Slots | Remaining Space | Viability |
|-------------|-------------|-----------------|-----------|
| **Endo Steel + Ferro-Fibrous** | 28 slots | 50 slots | Challenging |
| **+ Double Heat Sinks** | +30 slots (10 external) | 20 slots | Very tight |
| **+ XL Engine** | +6 side torso | 14 slots side torso | Difficult |

#### **Clan Technology Advantages (14 slots total)**
| Combination | Total Slots | Remaining Space | Viability |
|-------------|-------------|-----------------|-----------|
| **Endo Steel + Ferro-Fibrous** | 14 slots | 64 slots | Manageable |
| **+ Double Heat Sinks** | +20 slots (10 external) | 44 slots | Reasonable |
| **+ XL Engine** | +4 side torso | 40 slots side torso | Good |

### **2. Engine Type Impact on Slot Availability**

#### **Standard Engine (6 CT slots)**
- **Side Torso Freedom**: 24 slots total available
- **Weapon Capacity**: Maximum flexibility for large weapons
- **Technology Space**: Sufficient room for advanced systems
- **Trade-off**: Heavier engine weight

#### **XL Engine (12 total slots)**
- **Side Torso Constraint**: 18 slots total available (6 per side used)
- **Weapon Limitation**: Reduced capacity for large weapons
- **Technology Competition**: Advanced systems compete for space
- **Vulnerability**: XL engine destruction risk

---

## 📊 **Equipment Placement Validation Rules**

### **1. Location Restrictions**

#### **Head-Only Equipment**
- Cockpit systems (mandatory)
- Small sensors and electronics
- Very small weapons (Small Laser maximum)
- **Prohibited**: Large weapons, ammunition, heat sinks

#### **Torso-Only Equipment**
- Engine systems (Center Torso only)
- CASE systems (explosion protection)
- Large weapons and systems
- **Prohibited**: Some specialty items in specific torsos

#### **Leg-Only Equipment**
- Jump jets (must be distributed)
- Stealth armor (special requirement)
- Modular armor (some types)
- **Standard**: Heat sinks, small equipment

### **2. Mounting Adjacency Rules**

#### **Paired Systems**
- **Targeting Computers**: Must be with controlled weapons
- **Artemis IV**: Must be with compatible launcher
- **CASE**: Must be with ammunition in same location
- **Heat Sinks**: Engine heat sinks must be engine-adjacent

#### **Distribution Requirements**
- **Jump Jets**: Must be distributed across multiple locations
- **Stealth Armor**: Must be in leg locations only
- **Advanced Structure**: Can be distributed anywhere
- **Double Heat Sinks**: 10 free in engine, remainder external

---

## 🛠️ **Construction Examples**

### **Example 1: Standard Engine Heavy Mech (75 tons)**

#### **Mandatory Allocations**
- **Head**: Life Support (2), Sensors (2), Cockpit (1) = 5 slots used, 1 available
- **Center Torso**: Engine (6), Gyro (4) = 10 slots used, 2 available
- **Legs**: Hip (1), Upper (1), Lower (1), Foot (1) per leg = 4 slots each, 2 available each

#### **Available for Equipment**
- **Head**: 1 slot
- **Center Torso**: 2 slots
- **Side Torsos**: 24 slots total (12 each)
- **Arms**: 20 slots total (after removing 2 actuators each)
- **Legs**: 4 slots total (2 each)
- **Total Available**: 51 slots for weapons and equipment

### **Example 2: XL Engine + Advanced Technologies (50 tons)**

#### **Technology Choices**
- **XL Engine**: 6 CT + 3 per side torso = 12 slots total
- **Endo Steel**: 14 slots distributed
- **Ferro-Fibrous**: 14 slots distributed

#### **Slot Budget Analysis**
- **Total Slots**: 78 available
- **Mandatory Systems**: 16 slots (actuators, life support, etc.)
- **XL Engine**: 12 slots
- **Advanced Technologies**: 28 slots
- **Remaining**: 22 slots for weapons, ammunition, and equipment

#### **Design Constraints**
- **Limited Weapons**: Only smaller weapon systems fit
- **Ammunition Restricted**: Limited ammunition storage
- **Heat Sink Competition**: Fewer slots for external heat sinks
- **Weight Benefit**: 7.5 tons saved for more equipment

---

## 🎯 **Quick Reference Charts**

### **Slot Budget Calculator**
```
Total Available Slots = 78
- Mandatory Systems = 16 (life support, sensors, cockpit, actuators)
- Engine Slots = 6 (standard) or 12 (XL)
- Gyro Slots = 4 (standard)
- Advanced Structure = 14 (IS) or 7 (Clan) if used
- Advanced Armor = 14 (IS) or 7 (Clan) if used
= Remaining slots for weapons and equipment
```

### **Critical Space Efficiency**
| Equipment Type | Slots per Ton | Efficiency Rating |
|----------------|---------------|-------------------|
| **Small Laser** | 2 slots/ton | Excellent |
| **Medium Laser** | 1 slot/ton | Excellent |
| **Large Laser** | 0.4 slots/ton | Good |
| **AC/5** | 0.5 slots/ton | Good |
| **PPC** | 0.43 slots/ton | Good |
| **AC/20** | 0.71 slots/ton | Fair |
| **Gauss Rifle** | 0.47 slots/ton | Good |

### **Technology Priority Matrix**
| Situation | Endo Steel | Ferro-Fibrous | XL Engine | Recommendation |
|-----------|------------|---------------|-----------|----------------|
| **Tight Weight** | High | High | Medium | Advanced structure/armor |
| **Weapon Heavy** | Low | Low | High | XL engine for weight |
| **Balanced** | Medium | Medium | Low | Selective technology |
| **Clan Tech** | High | High | High | Multiple technologies viable |

---

**Reference Version**: 1.0 Critical Systems  
**Scope**: Slot Management & Equipment Mounting ✅  
**Accuracy**: MegaMekLab Compatible 🎯  
**Application**: Design Validation & Optimization ⚡
