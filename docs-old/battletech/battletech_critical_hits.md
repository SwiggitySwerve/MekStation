# ⚔️ BattleTech Critical Hit Mechanics & Damage Systems

## 🎯 **Document Overview**
**Purpose**: Complete reference for critical hit resolution, equipment damage, and combat vulnerability systems  
**Scope**: ✅ **Critical hit tables, progressive damage effects, equipment destruction, and damage transfer mechanics**  
**Application**: Combat resolution, equipment vulnerability analysis, and tactical planning

---

## 📊 **Critical Hit Trigger System**

### **✅ Fundamental Critical Hit Rules**
- **Trigger Condition**: Each point of internal structure damage
- **Resolution Method**: Roll 2d6 on Critical Hit Table
- **Location Specific**: Critical hits affect only the damaged location
- **Equipment Target**: Roll randomly among occupied critical slots
- **Multiple Damage**: Each structure point = separate critical hit roll

### **🎯 Critical Hit Probability Table**
| 2d6 Roll | Result | Probability | Cumulative Chance |
|----------|--------|-------------|-------------------|
| **2-7** | 1 Critical Hit | 72.22% | 72.22% |
| **8-9** | 2 Critical Hits | 16.67% | 88.89% |
| **10-11** | 3 Critical Hits | 8.33% | 97.22% |
| **12** | Head Destroyed* | 2.78% | 100% |

*Head destruction on roll of 12 only applies to head location damage

---

## 🎲 **Critical Hit Resolution Mechanics**

### **1. Critical Hit Sequence**

#### **Step-by-Step Resolution**
1. **Determine Number**: Roll 2d6 for critical hit quantity
2. **Identify Targets**: List all equipment in damaged location
3. **Roll for Each Hit**: Separate 1d6 roll per critical hit
4. **Apply Effects**: Implement damage based on equipment type
5. **Check Destruction**: Determine if mech systems are compromised

#### **Equipment Targeting Rules**
- **Occupied Slots Only**: Empty slots cannot be critically hit
- **Multi-Slot Items**: Any critical hit destroys entire item
- **System Equipment**: Engine, gyro, actuators have special rules
- **Random Selection**: Equal probability for all occupied slots

### **2. Equipment Destruction Categories**

#### **Single-Hit Destruction (Most Equipment)**
| Equipment Type | Effect of Critical Hit | Examples |
|----------------|------------------------|----------|
| **Weapons** | Destroyed permanently | Lasers, PPCs, Autocannons |
| **Ammunition** | Explosion check required | All ballistic/missile ammo |
| **Electronics** | Destroyed permanently | C3, ECM, Targeting Computer |
| **Support Systems** | Destroyed permanently | CASE, Heat Sinks, Jump Jets |

#### **Progressive Damage Systems**
| System | 1st Critical | 2nd Critical | 3rd Critical |
|--------|-------------|-------------|-------------|
| **Engine** | +5 heat/turn | +10 heat/turn | Mech shutdown |
| **Gyroscope** | +3 piloting modifier | +5 piloting modifier | Mech falls, shutdown |
| **Actuators** | Reduced capability | Further reduction | Complete disability |
| **Life Support** | No immediate effect | No immediate effect | Pilot death (vacuum) |

---

## 🔥 **Engine Critical Hit System**

### **1. Engine Damage Progression**

#### **Heat Generation Penalties**
| Criticals | Heat Penalty | Combat Effect | Tactical Impact |
|-----------|-------------|---------------|-----------------|
| **0** | +0 heat/turn | Normal operation | Standard performance |
| **1** | +5 heat/turn | Moderate impact | Reduced firing rate |
| **2** | +10 heat/turn | Severe impact | Limited weapon use |
| **3** | **Shutdown** | Mech disabled | Combat ineffective |

#### **Engine Type Vulnerability**
| Engine Type | Critical Locations | Destruction Condition | Special Rules |
|-------------|-------------------|----------------------|---------------|
| **Standard** | Center Torso only | 3 criticals in CT | Standard progression |
| **XL (Inner Sphere)** | CT + both side torsos | 3 criticals total* | Any location counts |
| **XL (Clan)** | CT + both side torsos | 3 criticals total* | Any location counts |
| **Light** | CT + both side torsos | 3 criticals total* | Partial XL rules |
| **Compact** | Center Torso only | 3 criticals in CT | Double heat penalty |

*XL engines: Critical hits to side torso engine components count toward 3-hit destruction

### **2. XL Engine Special Vulnerability**

#### **Multi-Location Tracking**
- **Center Torso Hits**: Count toward engine destruction
- **Side Torso Hits**: Engine components also count toward destruction
- **Cumulative Effect**: Total from all locations = engine status
- **No Location Limit**: Can be destroyed by side torso hits alone

#### **Tactical Implications**
- **Increased Vulnerability**: 3x more locations can cause engine destruction
- **Strategic Targeting**: Opponents focus on side torsos
- **Design Trade-off**: Weight savings vs survivability
- **Pilot Considerations**: Enhanced defensive positioning required

---

## ⚖️ **Gyroscope Critical Hit Effects**

### **1. Progressive Piloting Penalties**

#### **Piloting Skill Degradation**
| Gyro Status | Piloting Modifier | Movement Effect | Combat Impact |
|-------------|------------------|-----------------|---------------|
| **Undamaged** | +0 | Normal movement | Standard agility |
| **1 Critical** | +3 difficulty | Reduced stability | Fall risk increase |
| **2 Criticals** | +5 difficulty | High instability | Frequent falls |
| **3 Criticals** | **Shutdown** | Mech falls, disabled | Combat ineffective |

#### **Gyro Type Variations**
| Gyro Type | Standard Effect | Special Modifiers |
|-----------|----------------|-------------------|
| **Standard** | Normal progression | No modifications |
| **Compact** | +1 base penalty | Always +1 worse than standard |
| **Heavy Duty** | +1 critical resistance | First critical ignored |
| **XL Gyro** | Extra vulnerability | Each critical = 2 standard criticals |

### **2. Movement and Stability Impact**

#### **Piloting Check Triggers**
- **Standing Up**: +3/+5 difficulty increase
- **Running**: Additional stability checks required
- **Jumping**: Severe penalties to landing
- **Rough Terrain**: Compounded difficulty increases
- **Weapons Fire**: Heat-induced stability checks worsened

---

## 🦾 **Actuator Critical Hit Effects**

### **1. Arm Actuator Damage**

#### **Progressive Arm Disability**
| Actuator Hit | Effect | Combat Capability | Physical Attacks |
|--------------|--------|-------------------|------------------|
| **Shoulder** | Arm disabled | No weapons fire | No physical attacks |
| **Upper Arm** | Reduced mobility | Weapons functional | Reduced punch accuracy |
| **Lower Arm** | Limited flexibility | Weapons functional | No punching |
| **Hand** | No grasping | Weapons functional | No grasping attacks |

#### **Weapon Mounting Implications**
- **Arm-Mounted Weapons**: Disabled if shoulder/upper arm hit
- **Hand-Held Weapons**: Dropped if hand actuator destroyed
- **Targeting Penalties**: Damaged actuators reduce accuracy
- **Heat Dissipation**: Arm-mounted heat sinks remain functional

### **2. Leg Actuator Damage**

#### **Mobility Degradation**
| Actuator Hit | Effect | Movement Penalty | Special Rules |
|--------------|--------|------------------|---------------|
| **Hip** | Leg disabled | Half movement | +4 piloting penalty |
| **Upper Leg** | Reduced mobility | -2 movement points | +2 piloting penalty |
| **Lower Leg** | Limited flexibility | -1 movement point | +1 piloting penalty |
| **Foot** | Poor ground contact | -1 movement point | +1 piloting penalty |

#### **Cumulative Effects**
- **Multiple Hits**: Penalties stack within same leg
- **Both Legs**: Damage to both legs compounds penalties
- **Jump Jets**: Leg damage affects jump capability
- **Standing**: Severely damaged legs prevent standing

---

## 💥 **Ammunition Explosion Mechanics**

### **1. Explosion Trigger Conditions**

#### **Critical Hit Resolution**
| Ammunition Status | Explosion Chance | Damage Calculation |
|------------------|------------------|-------------------|
| **Full Bin** | Automatic explosion | Full ammunition damage potential |
| **Half Full** | Automatic explosion | Remaining ammunition damage |
| **Less than Half** | No explosion | Ammunition simply destroyed |
| **Empty Bin** | No explosion | No effect |

#### **Damage Distribution**
- **Internal Damage**: Equal to remaining ammunition damage points
- **Location Specific**: Damage applies to ammunition location only
- **Critical Multiplication**: Each damage point can cause critical hits
- **Transfer Potential**: Excess damage transfers to adjacent locations

### **2. Explosion Protection Systems**

#### **CASE (Cellular Ammunition Storage Equipment)**
| CASE Type | Protection Level | Weight Cost | Slot Cost | Effect |
|-----------|------------------|-------------|-----------|--------|
| **Standard CASE** | Full protection | +0.5 tons | 1 slot | Redirects explosion outward |
| **CASE II** | Enhanced protection | +1 ton | 1 slot | Prevents all damage transfer |
| **Clan CASE** | Integral protection | +0 tons | 0 slots | Built into ammunition |

#### **Cellular Ammunition Storage Equipment (CASE)**
- **Explosion Redirection**: Damage vents externally through armor
- **Structure Protection**: Internal structure takes no explosion damage
- **Equipment Safety**: Other equipment in location protected
- **Armor Sacrifice**: Location armor destroyed by venting explosion

### **3. Ammunition Type Special Rules**

#### **Explosion-Immune Ammunition**
| Ammo Type | Explosion Risk | Special Properties |
|-----------|----------------|-------------------|
| **Gauss Rifle** | No explosion | Magnetic acceleration, inert slugs |
| **Energy Weapons** | N/A | No ammunition required |
| **Arrow IV** | Standard explosion | Tactical missile warheads |
| **Inferno SRM** | Enhanced explosion | Incendiary compounds |

---

## 🔄 **Damage Transfer Mechanics**

### **1. Location Destruction Sequence**

#### **Primary Damage Transfer Paths**
| Destroyed Location | Damage Transfers To | Transfer Amount |
|-------------------|-------------------|-----------------|
| **Left Arm** | Left Torso | Excess damage |
| **Right Arm** | Right Torso | Excess damage |
| **Left Torso** | Center Torso | Excess damage |
| **Right Torso** | Center Torso | Excess damage |
| **Left Leg** | Center Torso | Excess damage |
| **Right Leg** | Center Torso | Excess damage |
| **Head** | No transfer | Pilot death |
| **Center Torso** | No transfer | Mech destruction |

#### **Transfer Damage Rules**
- **Full Transfer**: All excess damage applies to receiving location
- **Armor Bypass**: Transfer damage goes directly to internal structure
- **Critical Generation**: Each transferred point can cause critical hits
- **Cascade Potential**: Destroyed locations can chain damage transfers

### **2. Special Damage Transfer Cases**

#### **XL Engine Vulnerability**
- **Side Torso Destruction**: Automatically destroys XL engine
- **Instant Death**: Mech immediately disabled regardless of CT status
- **No Saving Throw**: Engine destruction is automatic and final
- **Strategic Weakness**: Major tactical vulnerability for XL-equipped mechs

#### **Rear Armor Considerations**
- **Backstab Attacks**: Damage bypasses front armor
- **Critical Hit Bonus**: Rear attacks often generate critical hits
- **Vulnerability Window**: Mechs with minimal rear armor at extreme risk
- **Positioning Importance**: Facing becomes critical tactical element

---

## 🛡️ **Special Equipment Critical Effects**

### **1. Electronic Warfare Systems**

#### **ECM Suite Damage**
| System | Critical Effect | Tactical Impact |
|--------|----------------|-----------------|
| **Guardian ECM** | Destroyed | Loss of stealth and jamming |
| **Angel ECM** | Destroyed | Enhanced jamming capabilities lost |
| **C3 Master** | Network disruption | Entire network compromised |
| **C3 Slave** | Unit disconnected | Individual unit loses network benefit |

#### **Targeting System Damage**
| System | Critical Effect | Combat Penalty |
|--------|----------------|----------------|
| **Targeting Computer** | Destroyed | Accuracy bonus lost |
| **Artemis IV** | Destroyed | Missile accuracy bonus lost |
| **Beagle Probe** | Destroyed | Enhanced sensor range lost |
| **TAG Laser** | Destroyed | Artillery guidance capability lost |

### **2. Mobility System Damage**

#### **Jump Jet Critical Hits**
- **Individual Destruction**: Each jump jet destroyed separately
- **Thrust Reduction**: Lost jump jets reduce total jump capacity
- **Minimum Threshold**: Must have 50% functional for any jumping
- **Heat Accumulation**: Damaged jets may generate extra heat

#### **Heat Sink Critical Hits**
- **Single Heat Sink**: Destroyed permanently, -1 heat dissipation
- **Double Heat Sink**: Destroyed permanently, -2 heat dissipation
- **Engine Heat Sinks**: Cannot be critically hit (protected by engine)
- **Cumulative Effect**: Multiple hits severely impact heat management

---

## 📊 **Critical Hit Probability Analysis**

### **1. Statistical Vulnerability Assessment**

#### **Equipment Survival Rates by Structure Damage**
| Structure Damage | 1 Critical Chance | 2+ Critical Chance | Equipment Survival |
|------------------|------------------|-------------------|-------------------|
| **1 Point** | 72.22% | 27.78% | 72.22% intact |
| **2 Points** | 47.84% chance both single | 52.16% enhanced | 34.72% intact |
| **3 Points** | 25.07% all single hits | 74.93% enhanced | 12.58% intact |
| **4 Points** | 6.27% all single hits | 93.73% enhanced | 1.58% intact |

#### **Multi-Slot Equipment Vulnerability**
| Slot Count | Vulnerability Multiplier | Destruction Probability |
|------------|-------------------------|------------------------|
| **1 Slot** | 1x base chance | Standard probability |
| **2 Slots** | 2x base chance | Double destruction risk |
| **3 Slots** | 3x base chance | Triple destruction risk |
| **5 Slots** | 5x base chance | Very high destruction risk |

### **2. Location-Based Risk Assessment**

#### **Damage Frequency by Location**
| Location | Typical Hit Frequency | Critical Risk Level | Strategic Priority |
|----------|---------------------|-------------------|-------------------|
| **Center Torso** | High (center mass) | Extreme (engine/gyro) | Maximum protection |
| **Side Torsos** | High (large target) | High (XL engine) | High protection |
| **Arms** | Medium (weapon mounts) | Medium (weapons) | Balanced protection |
| **Legs** | Low (small target) | Low (mobility only) | Minimal protection |
| **Head** | Very Low (small) | Extreme (pilot death) | Maximum protection |

---

## 🎯 **Tactical Critical Hit Considerations**

### **1. Equipment Placement Strategy**

#### **High-Value Equipment Protection**
- **Vital Systems**: Place in legs or well-armored locations
- **Redundancy**: Distribute similar equipment across multiple locations
- **Backup Systems**: Include secondary systems for critical functions
- **CASE Protection**: Install CASE for all ammunition storage

#### **Acceptable Risk Equipment**
- **Expendable Systems**: Place in arms or lightly armored areas
- **Single-Slot Items**: Better survival rates than multi-slot equipment
- **Non-Critical**: Systems that don't affect core combat capability
- **Easily Replaced**: Equipment that can be repaired or replaced quickly

### **2. Design Philosophy Impact**

#### **Survivability-Focused Design**
- **Single-Slot Preference**: Choose smaller, more survivable equipment
- **Protection Investment**: Heavy armor on critical locations
- **Redundant Systems**: Multiple smaller systems vs single large systems
- **Conservative Technology**: Avoid high-risk technologies like XL engines

#### **Performance-Focused Design**
- **Risk Acceptance**: Use XL engines and advanced systems despite vulnerability
- **Firepower Priority**: Accept equipment vulnerability for maximum damage output
- **Speed Emphasis**: Rely on mobility to avoid damage rather than armor
- **Offensive Philosophy**: Destroy enemy before they can exploit vulnerabilities

---

## 🛠️ **Critical Hit Examples**

### **Example 1: Medium Laser Critical Hit**
**Situation**: AC/10 hits right torso with 2 damage after armor
**Resolution**:
1. **Structure Damage**: 2 points to right torso internal structure
2. **Critical Rolls**: Two separate 2d6 rolls required
3. **First Roll**: 8 = 2 critical hits in right torso
4. **Second Roll**: 6 = 1 critical hit in right torso
5. **Total**: 3 critical hits to resolve in right torso
6. **Equipment**: Medium Laser occupying 1 slot destroyed
7. **Result**: Laser permanently disabled, 2 other hits on different equipment

### **Example 2: XL Engine Multi-Location Vulnerability**
**Previous Damage**: 1 engine critical in center torso
**Current Situation**: PPC hits left torso causing 1 internal damage
**Resolution**:
1. **Critical Roll**: 2d6 = 9 (2 critical hits)
2. **Equipment Hit**: XL engine components in left torso
3. **Engine Status**: 1 (previous) + 2 (current) = 3 total engine criticals
4. **Result**: Engine destroyed, mech immediately shuts down
5. **Combat Status**: Mech is eliminated from combat

### **Example 3: Ammunition Explosion with CASE**
**Situation**: SRM ammunition bin (60 missiles remaining) critically hit
**Without CASE**:
1. **Explosion**: 60 points internal damage to location
2. **Critical Generation**: 60 separate critical hit rolls possible
3. **Likely Result**: Complete location destruction and damage transfer

**With CASE**:
1. **Explosion**: Damage vents through armor
2. **Internal Protection**: No internal structure damage
3. **Equipment Safety**: Other location equipment undamaged
4. **Armor Loss**: Location armor destroyed by venting

---

## 📋 **Quick Reference Tables**

### **Critical Hit Resolution Flowchart**
```
Internal Structure Damage → Roll 2d6 → Determine Critical Hits
↓
For Each Critical Hit: Roll 1d6 among occupied slots
↓
Apply Equipment Effect:
- Single-Hit Items: Destroyed
- Progressive Items: Apply next level damage
- Ammunition: Check for explosion
- Empty Slots: No effect
```

### **Equipment Criticality Matrix**
| Equipment Type | Destruction Threshold | Combat Impact | Replacement Difficulty |
|----------------|----------------------|---------------|----------------------|
| **Engine** | 3 progressive hits | Mech disabled | Mission kill |
| **Gyro** | 3 progressive hits | Mech disabled | Mission kill |
| **Weapons** | 1 hit | Firepower reduced | Significant |
| **Ammunition** | 1 hit (+explosion) | Variable | Moderate |
| **Electronics** | 1 hit | Capability lost | Moderate |
| **Heat Sinks** | 1 hit | Heat management | Minor |

### **Survival Probability Guide**
| Structure Points Lost | Equipment Survival Chance | Recommended Action |
|----------------------|--------------------------|-------------------|
| **1 Point** | ~72% survival | Monitor for additional damage |
| **2 Points** | ~35% survival | Expect equipment losses |
| **3 Points** | ~13% survival | Assume equipment destroyed |
| **4+ Points** | <2% survival | Location effectively gutted |

---

**Reference Version**: 1.0 Critical Systems  
**Scope**: Critical Hit Mechanics & Damage Resolution ✅  
**Accuracy**: Official BattleTech Rules Compatible 🎯  
**Application**: Combat Resolution & Tactical Analysis ⚡