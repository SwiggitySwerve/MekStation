# Tech Base Rules Matrix

**Status**: Active
**Version**: 1.0
**Last Updated**: 2025-11-28
**Scope**: Single source of truth for all Inner Sphere vs Clan technology differences
**Authority**: This is the authoritative reference for tech base rules and differences

---

## Overview

### Purpose
This document serves as the SINGLE SOURCE OF TRUTH for all technology base differences between Inner Sphere and Clan. All tech base rules, component variations, patterns, and validation logic are consolidated here to eliminate duplication and ensure consistency across the application.

### Scope
**In Scope:**
- Complete comparison matrix of ALL components with IS vs Clan differences
- Documented patterns in tech base variations (3-2 Pattern, 14-7 Pattern, etc.)
- Tech base declaration and mixed tech rules
- Introduction year gaps between IS and Clan technologies
- Validation rules for tech base compatibility
- Component availability by tech base
- Philosophy and design approaches of each tech base

**Out of Scope:**
- Detailed component implementation (refer to individual component specs)
- Combat mechanics and damage resolution
- Battle Value and cost calculations
- Equipment and weapons (covered separately)

### How to Use This Document
- **For Developers**: This is your authoritative reference for any tech base question
- **For Specifications**: Other specs reference this document rather than duplicating tech base rules
- **For Validation**: Use the validation matrix to implement tech base checking
- **For UI/UX**: Use the comparison matrix to display tech base differences to users

---

## Complete Component Comparison Matrix

This table provides a comprehensive comparison of ALL structural components across Inner Sphere and Clan tech bases.

### Engines

| Engine Type | Inner Sphere Specs | Clan Specs | Key Differences | IS Intro Year | Clan Intro Year | Year Gap |
|-------------|-------------------|------------|-----------------|---------------|-----------------|----------|
| **Standard Fusion** | Weight: Standard formula<br/>CT Slots: By rating<br/>Side Slots: 0<br/>Rules: Introductory | Same as IS | None - identical | 2439 | 2439 | 0 years |
| **XL (Extra-Light)** | Weight: 50% of standard<br/>CT Slots: By rating<br/>Side Slots: 3 per side (6 total)<br/>Rules: Advanced | Weight: 50% of standard<br/>CT Slots: By rating<br/>Side Slots: 2 per side (4 total)<br/>Rules: Standard | **MAJOR**: Clan saves 2 slots total<br/>Clan is Standard rules level<br/>Same weight, different vulnerability | 3035 | 2830 | ~205 years |
| **XXL (Extra-Extra-Light)** | Weight: 33% of standard<br/>CT Slots: By rating<br/>Side Slots: 3 per side<br/>Rules: Experimental | Same as IS | None - identical | 3055 | 3055 | 0 years |
| **Light** | Weight: 75% of standard<br/>CT Slots: By rating<br/>Side Slots: 2 per side<br/>Rules: Advanced | **NOT AVAILABLE** | IS-exclusive technology<br/>Clans use XL instead | 3055 | N/A | N/A |
| **Compact** | Weight: 150% of standard<br/>CT Slots: Reduced (rating/25)<br/>Side Slots: 0<br/>Rules: Advanced | **NOT AVAILABLE** | IS-exclusive technology | 3068 | N/A | N/A |
| **ICE (Internal Combustion)** | Weight: 40% of fusion<br/>CT Slots: By rating<br/>Side Slots: 0<br/>Rules: Introductory | Same as IS | None - identical | Pre-2439 | Pre-2439 | 0 years |
| **Fuel Cell** | Weight: 120% of standard<br/>CT Slots: By rating<br/>Side Slots: 0<br/>Rules: Advanced | Same as IS | None - identical | 3068 | 3068 | 0 years |
| **Fission** | Weight: 150% of standard<br/>CT Slots: By rating + shielding<br/>Side Slots: 0<br/>Rules: Primitive | Same as IS | None - identical | 2470 | 2470 | 0 years |

**Pattern: 3-2 Side Torso Slots**
- IS XL: 3 slots per side torso (6 total)
- Clan XL: 2 slots per side torso (4 total)
- Saves 2 critical slots total for Clan

### Gyroscopes

| Gyro Type | Inner Sphere Specs | Clan Specs | Key Differences | IS Intro Year | Clan Intro Year | Year Gap |
|-----------|-------------------|------------|-----------------|---------------|-----------------|----------|
| **Standard** | Weight: CEIL(rating/100) × 1.0<br/>CT Slots: 4<br/>Rules: Introductory | Same as IS | None - identical specs<br/>Different intro years | 2439 | 2470 | ~30 years |
| **XL** | Weight: CEIL(rating/100) × 0.5<br/>CT Slots: 6<br/>Rules: Advanced | **NOT AVAILABLE** | IS-exclusive technology<br/>Clans only use Standard gyro | 3067 | N/A | N/A |
| **Compact** | Weight: CEIL(rating/100) × 1.5<br/>CT Slots: 2<br/>Rules: Advanced | **NOT AVAILABLE** | IS-exclusive technology | 3068 | N/A | N/A |
| **Heavy-Duty** | Weight: CEIL(rating/100) × 2.0<br/>CT Slots: 4<br/>Rules: Advanced | **NOT AVAILABLE** | IS-exclusive technology | 3067 | N/A | N/A |

**Pattern: Clan Gyro Restriction**
- Clan forces use ONLY Standard Gyro
- All advanced gyro types are IS-exclusive
- Rationale: Clan standard gyros deemed sufficiently reliable

### Heat Sinks

| Heat Sink Type | Inner Sphere Specs | Clan Specs | Key Differences | IS Intro Year | Clan Intro Year | Year Gap |
|----------------|-------------------|------------|-----------------|---------------|-----------------|----------|
| **Single** | Dissipation: 1 heat/turn<br/>Weight: 1 ton<br/>External Slots: 1<br/>Engine Slots: 0 additional<br/>Rules: Introductory | Same as IS | None - identical | 2439 | 2470 | ~30 years |
| **Double** | Dissipation: 2 heat/turn<br/>Weight: 1 ton<br/>External Slots: 3<br/>Engine Slots: 0 additional<br/>Rules: Advanced | Dissipation: 2 heat/turn<br/>Weight: 1 ton<br/>External Slots: 2<br/>Engine Slots: 0 additional<br/>Rules: Standard | **MAJOR**: Clan saves 1 slot per external DHS<br/>Same dissipation and weight<br/>Clan is Standard rules level | 3050 | 2828 | ~222 years |
| **Compact** | Dissipation: 1 heat/turn<br/>Weight: 1.5 tons<br/>Slots: 1 (not engine-mountable)<br/>Rules: Advanced | Same as IS | None - identical | 3068 | 3068 | 0 years |
| **Laser** | Dissipation: 1 heat/turn (lasers only)<br/>Weight: 1 ton<br/>Slots: 1<br/>Rules: Experimental | Same as IS | None - identical | 3059 | 3059 | 0 years |

**Pattern: 3-2 External Slots**
- IS Double Heat Sink: 3 external slots
- Clan Double Heat Sink: 2 external slots
- Same weight (1 ton), same dissipation (2 heat/turn)
- Clan saves 1 slot per external heat sink

**Note**: Clan forces do NOT use Single Heat Sinks in standard configurations

### Internal Structure

| Structure Type | Inner Sphere Specs | Clan Specs | Key Differences | IS Intro Year | Clan Intro Year | Year Gap |
|----------------|-------------------|------------|-----------------|---------------|-----------------|----------|
| **Standard** | Weight: 10% of tonnage<br/>Slots: 0<br/>Points Multiplier: 1.0×<br/>Rules: Introductory | Same as IS | None - identical | 2439 | 2470 | ~30 years |
| **Endo Steel** | Weight: 5% of tonnage (round up)<br/>Slots: 14 distributed<br/>Points Multiplier: 1.0×<br/>Rules: Standard | Weight: 5% of tonnage (round up)<br/>Slots: 7 distributed<br/>Points Multiplier: 1.0×<br/>Rules: Standard | **MAJOR**: Clan uses half the slots (7 vs 14)<br/>Same weight savings (50%) | 3040 | 2845 | ~195 years |
| **Endo-Composite** | Weight: 5% of tonnage (round up)<br/>Slots: 4 distributed<br/>Points Multiplier: 1.0×<br/>Rules: Experimental | Same as IS | None - identical | 3055 | 3055 | 0 years |
| **Reinforced** | Weight: 20% of tonnage<br/>Slots: 0<br/>Points Multiplier: 2.0×<br/>Rules: Advanced | Same as IS | None - identical | 3050 | 3050 | 0 years |
| **Composite** | Weight: 5% of tonnage (round up)<br/>Slots: 4 distributed<br/>Points Multiplier: 0.5×<br/>Rules: Experimental | Same as IS | None - identical | 3055 | 3055 | 0 years |
| **Industrial** | Weight: 10% of tonnage<br/>Slots: 0<br/>Points Multiplier: 1.0×<br/>Rules: Introductory | Same as IS | None - identical | 2439 | N/A | N/A |

**Pattern: 14-7 Distributed Slots**
- IS Endo Steel: 14 critical slots distributed across locations
- Clan Endo Steel: 7 critical slots distributed across locations
- Same weight reduction (50%), Clan uses half the slots
- Slots can be distributed across any location except head

### Armor

| Armor Type | Inner Sphere Specs | Clan Specs | Key Differences | IS Intro Year | Clan Intro Year | Year Gap |
|------------|-------------------|------------|-----------------|---------------|-----------------|----------|
| **Standard** | Points/Ton: 16<br/>Slots: 0<br/>Weight Multiplier: 1.0×<br/>Rules: Introductory | Same as IS | None - identical | 2439 | 2470 | ~30 years |
| **Ferro-Fibrous** | Points/Ton: 17.92<br/>Slots: 14 distributed<br/>Weight Multiplier: 1.0×<br/>Rules: Standard | Points/Ton: 19.2<br/>Slots: 7 distributed<br/>Weight Multiplier: 1.0×<br/>Rules: Standard | **MAJOR**: Clan 7% more efficient (19.2 vs 17.92)<br/>Clan uses half the slots (7 vs 14)<br/>Dual advantage for Clan | 3040 | 2825 | ~215 years |
| **Light Ferro-Fibrous** | Points/Ton: 16.8<br/>Slots: 7 distributed<br/>Weight Multiplier: 1.0×<br/>Rules: Standard | **NOT AVAILABLE** | IS-exclusive technology | 3058 | N/A | N/A |
| **Heavy Ferro-Fibrous** | Points/Ton: 19.2<br/>Slots: 21 distributed<br/>Weight Multiplier: 1.0×<br/>Rules: Standard | **NOT AVAILABLE** | IS-exclusive (matches Clan FF efficiency but more slots) | 3069 | N/A | N/A |
| **Stealth** | Points/Ton: 16<br/>Slots: 12 distributed<br/>Weight Multiplier: 1.0×<br/>Requires: ECM, DHS<br/>Rules: Advanced | Points/Ton: 16<br/>Slots: 12 distributed<br/>Weight Multiplier: 1.0×<br/>Requires: ECM, DHS<br/>Rules: Advanced | None - identical specs<br/>Different intro years | 3063 | 3063 | 0 years |
| **Reactive** | Points/Ton: 14<br/>Slots: 14 distributed<br/>Weight Multiplier: 1.0×<br/>Rules: Experimental | Same as IS | None - identical | 3055 | 3055 | 0 years |
| **Reflective** | Points/Ton: 16<br/>Slots: 10 distributed<br/>Weight Multiplier: 1.0×<br/>Rules: Experimental | Same as IS | None - identical | 3060 | 3060 | 0 years |
| **Hardened** | Points/Ton: 8<br/>Slots: 0<br/>Weight Multiplier: 2.0×<br/>Rules: Experimental | Same as IS | None - identical | 3047 | 3047 | 0 years |

**Pattern: 14-7 Distributed Slots + Efficiency Advantage**
- IS Ferro-Fibrous: 17.92 pts/ton, 14 slots
- Clan Ferro-Fibrous: 19.2 pts/ton, 7 slots
- Clan has BOTH better efficiency AND fewer slots
- This is a significant double advantage for Clan armor

### Cockpits

| Cockpit Type | Inner Sphere Specs | Clan Specs | Key Differences | IS Intro Year | Clan Intro Year | Year Gap |
|--------------|-------------------|------------|-----------------|---------------|-----------------|----------|
| **Standard** | Weight: 3 tons<br/>Head Slots: 1<br/>CT Slots: 0<br/>Rules: Introductory | Same as IS | None - identical | 2439 | 2470 | ~30 years |
| **Small** | Weight: 2 tons<br/>Head Slots: 1<br/>CT Slots: 0<br/>Rules: Standard | Same as IS | None - identical | 3067 | 3067 | 0 years |
| **Command Console** | Weight: 3 tons<br/>Head Slots: 1<br/>CT Slots: 3<br/>Rules: Advanced | Same as IS | Different intro years only | 3050 | 2828 | ~222 years |
| **Torso-Mounted** | Weight: 4 tons<br/>Head Slots: 0<br/>CT Slots: 2<br/>Rules: Advanced | Same as IS | None - identical | 3067 | 3067 | 0 years |
| **Interface** | Weight: 3 tons<br/>Head Slots: 1<br/>CT Slots: 0<br/>Requires: DNI implant<br/>Rules: Experimental | Same as IS | None - identical | 3055 | 3055 | 0 years |

**Pattern: Minimal Differences**
- Most cockpit types have identical specs
- Primary difference is introduction years
- Command Console shows typical ~220 year Clan advantage

### Movement Systems

| Movement Type | Inner Sphere Specs | Clan Specs | Key Differences | IS Intro Year | Clan Intro Year | Year Gap |
|---------------|-------------------|------------|-----------------|---------------|-----------------|----------|
| **Standard Jump Jets** | Weight: By tonnage class<br/>Slots: 1 per JJ<br/>Max: Walk MP<br/>Rules: Introductory | Same formula<br/>Slots: 1 per JJ<br/>Max: Walk MP<br/>Rules: Introductory | None - identical mechanics | 2471 | 2470 | ~1 year |
| **Improved Jump Jets** | Weight: 2× standard<br/>Slots: 2 per JJ<br/>Max: Walk MP<br/>Rules: Advanced | Same as IS | Different intro years only | 3069 | 2830 | ~239 years |
| **Jump Booster** | Weight: Special<br/>Slots: Varies<br/>One-time use<br/>Rules: Experimental | Weight: Special<br/>Slots: 2<br/>One-time use<br/>Rules: Experimental | Clan version uses fewer slots | 3055 | 3055 | 0 years |
| **UMU (Underwater)** | Weight: By tonnage class<br/>Slots: 1 per UMU<br/>Rules: Standard | Same as IS | None - identical | 2449 | 2470 | ~21 years |

**Pattern: Weight Identity**
- Movement systems generally have same weight formulas
- Jump Jets identical between IS and Clan
- Improved Jump Jets show ~239 year Clan introduction advantage

### Actuators and Myomer

| Component Type | Inner Sphere Specs | Clan Specs | Key Differences | IS Intro Year | Clan Intro Year | Year Gap |
|----------------|-------------------|------------|-----------------|---------------|-----------------|----------|
| **Standard Actuators** | Weight: Included in structure<br/>Slots: Shoulder 1, Upper 1, Lower 1, Hand 1<br/>Rules: Introductory | Same as IS | None - identical | 2439 | 2470 | ~30 years |
| **Standard Myomer** | Weight: Included in structure<br/>Slots: 0<br/>Rules: Introductory | Same as IS | None - identical | 2439 | 2470 | ~30 years |
| **Triple Strength Myomer (TSM)** | Weight: Special<br/>Slots: 6 distributed<br/>Activation: Heat-based<br/>Rules: Advanced | **NOT AVAILABLE** | IS-exclusive technology<br/>Clans consider it unreliable | 3050 | N/A | N/A |
| **MASC** | Weight: Tonnage-based<br/>Slots: Varies by tonnage<br/>Rules: Advanced | Same weight formula<br/>Same slot formula<br/>Rules: Advanced | Specs identical, different intro years | 3035 | 2760 | ~275 years |

**Pattern: Tech-Exclusive Components**
- Triple Strength Myomer: IS-exclusive (Clans don't use)
- Actuators and base myomer: identical across tech bases
- MASC shows largest year gap (~275 years)

---

## Common Patterns Reference

### Pattern 1: The "3-2 Pattern" (Most Common Slot Difference)

**Definition**: Inner Sphere requires 3 critical slots, Clan requires 2 critical slots for the same component

**Applies To**:
- XL Engine side torso slots (IS: 3 per side, Clan: 2 per side)
- Double Heat Sinks external (IS: 3 slots, Clan: 2 slots)

**Rationale**: Clan miniaturization technology reduces space requirements by 1 slot per component

**Impact**:
- Each XL engine saves 2 slots total (1 per side torso)
- Each external DHS saves 1 slot
- On a typical Clan XL mech with 5 external DHS: 2 + 5 = 7 total slots saved

**Example**:
```
Inner Sphere Mech:
- XL Engine 300: 6 CT + 3 LT + 3 RT = 12 total engine slots
- 5 External DHS: 5 × 3 = 15 slots
- Total: 27 slots for engine and heat sinks

Clan Mech (same config):
- XL Engine 300: 6 CT + 2 LT + 2 RT = 10 total engine slots
- 5 External DHS: 5 × 2 = 10 slots
- Total: 20 slots for engine and heat sinks
- SAVINGS: 7 critical slots
```

### Pattern 2: The "14-7 Pattern" (Distributed Systems)

**Definition**: Inner Sphere requires 14 critical slots distributed, Clan requires 7 slots distributed (exactly half)

**Applies To**:
- Endo Steel internal structure (IS: 14 slots, Clan: 7 slots)
- Ferro-Fibrous armor (IS: 14 slots, Clan: 7 slots)

**Rationale**: Advanced materials require distributed integration points; Clan materials science reduces required integration points by 50%

**Distribution Rules**:
- Slots may be distributed across any location except head
- Slots can be split across multiple locations (common: 2-4 slots per location)
- IS typically spreads across 6-8 locations, Clan across 4-7 locations

**Impact**:
- Clan saves 7 slots for each advanced structure or armor type
- Combined Endo Steel + Ferro-Fibrous: 14 total slots saved
- Allows significantly more equipment on Clan mechs

**Example**:
```
Inner Sphere Mech (Endo Steel + Ferro-Fibrous):
- Endo Steel: 14 slots distributed
- Ferro-Fibrous: 14 slots distributed
- Total: 28 slots consumed by structure/armor

Clan Mech (same config):
- Endo Steel: 7 slots distributed
- Ferro-Fibrous: 7 slots distributed
- Total: 14 slots consumed by structure/armor
- SAVINGS: 14 critical slots
```

### Pattern 3: Weight Identity, Slot Difference

**Definition**: Component has identical weight between IS and Clan, but different critical slot requirements

**Applies To**:
- Double Heat Sinks (1 ton both, IS: 3 slots, Clan: 2 slots)
- XL Engines (50% weight both, IS: 6 side slots, Clan: 4 side slots)
- Endo Steel (5% weight both, IS: 14 slots, Clan: 7 slots)
- Most advanced technologies

**Rationale**: Clan miniaturization doesn't always reduce weight, but consistently reduces space requirements

**Impact**: Clan mechs can fit more equipment without weight penalty

**Key Insight**: Weight savings come from component choice (e.g., XL vs Standard), slot savings come from tech base (Clan vs IS)

### Pattern 4: Tech-Exclusive Components

**Definition**: Component available only to one tech base, with no equivalent for the other

**Inner Sphere Exclusive**:
- Light Engine (75% weight, 2 side slots) - Clans use XL instead
- Compact Engine (150% weight, reduced CT slots) - Clan engineering doesn't need
- All advanced Gyros (XL, Compact, Heavy-Duty) - Clans satisfied with Standard
- Triple Strength Myomer (TSM) - Clans consider unreliable
- Light Ferro-Fibrous armor - IS compromise solution
- Heavy Ferro-Fibrous armor - IS alternative to Clan efficiency

**Clan Exclusive**:
- None in structural components (Clan uses superior versions of IS tech)

**Rationale**: Different technological development paths led to different solutions
- IS: Developed intermediate solutions (Light engines, various armor compromises)
- Clan: Maintained and improved original Star League technology (XL engines, Ferro-Fibrous)

### Pattern 5: Introduction Year Gap

**Definition**: Clan technology available significantly earlier (typically 200-275 years) than IS equivalent

**Common Gaps**:
- 200-220 years: Most advanced technologies (XL engines, Endo Steel, Ferro-Fibrous, DHS)
- 275 years: MASC (largest gap documented)
- 30-50 years: Basic technologies (Standard components)
- 0 years: Experimental technologies introduced simultaneously

**Applies To**:

| Technology | IS Year | Clan Year | Gap |
|------------|---------|-----------|-----|
| Double Heat Sinks | 3050 | 2828 | 222 years |
| Ferro-Fibrous Armor | 3040 | 2825 | 215 years |
| XL Engine | 3035 | 2830 | 205 years |
| Endo Steel | 3040 | 2845 | 195 years |
| Improved Jump Jets | 3069 | 2830 | 239 years |
| MASC | 3035 | 2760 | 275 years |
| Command Console | 3050 | 2828 | 222 years |

**Historical Context**:
- Clans left Inner Sphere in 2784 with full Star League technology
- IS suffered Succession Wars technology regression (2785-3049)
- Clan maintained continuous technological advancement
- Clan Invasion (3049-3050) introduced advanced tech to IS
- IS began rediscovering and reverse-engineering Clan tech post-3050

### Pattern 6: Rules Level Difference

**Definition**: Same component classified at different rules complexity levels between IS and Clan

**Applies To**:
- XL Engine (IS: Advanced, Clan: Standard)
- Double Heat Sinks (IS: Advanced, Clan: Standard)

**Rationale**:
- Clans adopted advanced technologies earlier and more widely
- Technologies become "standard" with widespread adoption and manufacturing
- IS treats these as advanced/experimental due to limited production and recent introduction

**Impact**:
- Affects tournament legality and campaign availability
- Clan "Standard" units can be more advanced than IS "Standard" units
- Rules level affects tech rating calculations

### Pattern 7: Dual Advantage (Efficiency + Slots)

**Definition**: Clan version has BOTH better efficiency AND fewer slots than IS equivalent

**Applies To**:
- Ferro-Fibrous Armor (Clan: 19.2 pts/ton + 7 slots, IS: 17.92 pts/ton + 14 slots)

**Rationale**: Superior Clan materials science provides compound advantage

**Impact**: Most significant single advantage for Clan technology
- 7% better armor efficiency (can fit more armor in same weight)
- 50% fewer critical slots (7 vs 14)
- Makes Clan Ferro-Fibrous strictly superior to IS version

**Example**:
```
75-ton Mech with 240 total armor points:

Inner Sphere Ferro-Fibrous:
- Weight: 240 / 17.92 = 13.4 tons → rounds to 13.5 tons
- Slots: 14 distributed
- Efficiency: 17.8 pts/ton actual

Clan Ferro-Fibrous:
- Weight: 240 / 19.2 = 12.5 tons
- Slots: 7 distributed
- Efficiency: 19.2 pts/ton actual
- ADVANTAGE: 1.0 ton saved + 7 slots saved
```

### Pattern 8: Same Specs, Different Intro Years

**Definition**: Component has identical specifications but was available to Clans much earlier

**Applies To**:
- Standard components (Standard engine, gyro, heat sinks, etc.) - typically 30 year gap
- Command Console - 222 year gap
- Improved Jump Jets - 239 year gap

**Rationale**:
- Basic technologies have similar implementation
- Clan technological continuity provided earlier access
- IS rediscovered or independently developed same solutions later

**Impact**:
- In era-specific campaigns, Clans have access to more advanced tech
- Same component specs mean no mechanical advantage, just availability advantage

---

## Tech Base Philosophy and Design Approaches

### Inner Sphere Technology Philosophy

**Development Approach**: Incremental rediscovery and reverse engineering

**Historical Context**:
- Suffered catastrophic technology loss during Succession Wars (2785-3049)
- Prioritized battlefield repair and maintainability over efficiency
- Developed intermediate solutions and compromises
- Post-3050: Rapid advancement through Clan technology recovery and analysis

**Design Characteristics**:
1. **Proven Designs**: Preference for tested, reliable technology over cutting-edge
2. **Distributed Systems**: Technology spreads across more components (14-7 pattern)
3. **Reliability Trade-offs**: Often sacrifice efficiency for robustness
4. **Vulnerability**: Advanced tech like XL engines have greater weaknesses (3 slots vs 2)
5. **Protection Trade-offs**: Weight-saving tech often means more vulnerable points

**Engineering Philosophy**:
- "If it's not broken, don't fix it"
- Easier field repair over optimal performance
- Redundancy and ruggedness valued
- Technology must be manufacturable with available industrial base

**Representative Technologies**:
- Light Engine: Compromise between Standard and XL (75% weight, less vulnerable)
- Light Ferro-Fibrous: Compromise armor (fewer slots than FF, less efficient)
- Triple Strength Myomer: Innovative solution to increase performance

**Typical Inner Sphere Mech**:
```
Chassis: 75 tons
Engine: XL 300 (IS) - 50% weight, 6 side torso slots
Structure: Endo Steel (IS) - 5% weight, 14 slots
Armor: Ferro-Fibrous (IS) - 17.92 pts/ton, 14 slots
Heat Sinks: 10 DHS (IS) - 3 slots each external
Gyro: Standard - reliable, 4 slots

Total Advanced System Slots: 6 (engine sides) + 14 (structure) + 14 (armor) + 9 (3 external DHS) = 43 slots
Weight Savings: Engine 50% + Structure 50% + Armor efficiency
```

### Clan Technology Philosophy

**Development Approach**: Continuous improvement of Star League heritage

**Historical Context**:
- Maintained unbroken technological lineage from Star League exodus (2784)
- Clan Golden Century (2800s-2900s): Perfected advanced technologies
- Never suffered regression or dark ages
- Technology became standardized through consistent production

**Design Characteristics**:
1. **Miniaturization**: Superior materials science reduces space requirements
2. **Efficiency**: Better performance-to-weight ratios
3. **Integration**: More compact component designs (3-2, 14-7 patterns)
4. **Advanced Materials**: Superior alloys and manufacturing processes
5. **Standardization**: Advanced tech is "standard" due to widespread adoption

**Engineering Philosophy**:
- "Perfection through iteration"
- Compact, efficient designs prioritized
- Superior manufacturing enables better tolerances
- Technology must honor Clan warrior traditions

**Representative Technologies**:
- XL Engine (Clan): Only 2 side slots vs IS 3 - better integration
- Endo Steel (Clan): Only 7 slots vs IS 14 - superior materials
- Ferro-Fibrous (Clan): Both more efficient AND fewer slots - compound advantage
- Standard-level advanced tech: XL and DHS are "Standard" rules level

**Typical Clan Mech**:
```
Chassis: 75 tons
Engine: XL 300 (Clan) - 50% weight, 4 side torso slots
Structure: Endo Steel (Clan) - 5% weight, 7 slots
Armor: Ferro-Fibrous (Clan) - 19.2 pts/ton, 7 slots
Heat Sinks: 10 DHS (Clan) - 2 slots each external
Gyro: Standard - no need for advanced types

Total Advanced System Slots: 4 (engine sides) + 7 (structure) + 7 (armor) + 6 (3 external DHS) = 24 slots
Weight Savings: Engine 50% + Structure 50% + Armor efficiency + bonus armor from 19.2 pts/ton
Slot Advantage: 43 (IS) - 24 (Clan) = 19 ADDITIONAL SLOTS for weapons/equipment
```

### Comparative Analysis

| Aspect | Inner Sphere | Clan | Advantage |
|--------|--------------|------|-----------|
| **Weight Efficiency** | Good with advanced tech | Slightly better (armor) | Clan marginal |
| **Critical Slots** | 40-45 slots for advanced systems | 20-25 slots for same systems | Clan significant (15-20 slots) |
| **Tech Availability** | Limited until post-3050 | Widespread in 2800s+ | Clan ~220 years |
| **Reliability** | Prioritized | Assumed | IS design focus |
| **Manufacturing** | Rebuilt post-Succession Wars | Continuous production | Clan |
| **Vulnerability** | More critical hit points (XL 3 slots) | Fewer critical hit points (XL 2 slots) | Clan |
| **Innovation** | Rapid post-3050 | Steady state pre-3050 | IS (post-invasion) |
| **Cost** | Higher for advanced tech | Standard pricing for advanced | Clan |
| **Rules Complexity** | Advanced level | Standard level | Clan (simpler) |

**The Critical Slot Advantage**:
The most significant Clan advantage is critical slot savings:
- Typical advanced IS mech: ~40-45 slots for structure/engine/armor/heat
- Typical advanced Clan mech: ~20-25 slots for same systems
- Advantage: 15-20 additional slots for weapons and equipment
- This translates to more firepower, electronics, or ammunition

**The Introduction Year Advantage**:
In era-based campaigns (2850-3049):
- Clan forces have access to advanced tech for 200+ years
- IS forces limited to Standard technology
- Creates significant technological disparity
- Post-3050: IS begins catching up through salvage and development

---

## Tech Base Declaration and Mixed Tech Rules

### Unit Tech Base Declaration

Every BattleMech must declare one of three tech base options:

#### Option 1: Inner Sphere (Pure)
- **Declaration**: `techBase: TechBase.INNER_SPHERE`
- **Structural Components**: ALL must be Inner Sphere variants
- **Equipment**: Can be any tech base (see Equipment Rules below)
- **Tech Rating**: Based on IS component ratings
- **Tournament Legality**: Standard (if using Introductory/Standard components)

**Structural Component Locking**:
```
LOCKED to Inner Sphere:
- Internal Structure: Must use IS variants (Standard, Endo Steel IS, etc.)
- Engine: Must use IS variants (Standard, XL IS, Light, Compact, etc.)
- Gyro: Must use IS variants (Standard, XL, Compact, Heavy-Duty)
- Heat Sinks: Must use IS variants (Single, Double IS, Compact, Laser)
- Armor: Must use IS variants (Standard, Ferro-Fibrous IS, Light FF, Heavy FF, Stealth IS, etc.)
- Myomer: Must use IS variants (Standard, TSM, MASC IS)
- Actuators: Must use IS variants
- Movement: Must use IS variants (Jump Jets IS, Improved JJ IS, etc.)
```

#### Option 2: Clan (Pure)
- **Declaration**: `techBase: TechBase.CLAN`
- **Structural Components**: ALL must be Clan variants
- **Equipment**: Can be any tech base (see Equipment Rules below)
- **Tech Rating**: Based on Clan component ratings (typically lower)
- **Tournament Legality**: Standard (if using Introductory/Standard components)

**Structural Component Locking**:
```
LOCKED to Clan:
- Internal Structure: Must use Clan variants (Standard, Endo Steel Clan)
- Engine: Must use Clan variants (Standard, XL Clan, XXL Clan, ICE, Fuel Cell, Fission)
  - NOTE: Light and Compact NOT AVAILABLE to Clan
- Gyro: Must use Clan variants (Standard ONLY - no advanced gyros)
- Heat Sinks: Must use Clan variants (Double Clan ONLY - no singles in practice)
- Armor: Must use Clan variants (Standard, Ferro-Fibrous Clan, Stealth Clan, etc.)
  - NOTE: Light FF and Heavy FF NOT AVAILABLE to Clan
- Myomer: Must use Clan variants (Standard, MASC Clan)
  - NOTE: TSM NOT AVAILABLE to Clan
- Actuators: Must use Clan variants
- Movement: Must use Clan variants (Jump Jets Clan, Improved JJ Clan, etc.)
```

#### Option 3: Mixed Tech
- **Declaration**: `techBase: TechBaseFilter.MIXED`
- **Structural Components**: EACH category independently selects IS or Clan
- **Equipment**: Can be any tech base
- **Tech Rating**: Calculated with Mixed Tech penalty (+1 rating)
- **Tournament Legality**: Advanced or Restricted (mixed tech limited in tournaments)
- **Battle Value**: 1.25× multiplier applied

**Independent Category Selection**:
```
For EACH structural category, select tech base independently:
- Structure: [Inner Sphere | Clan]
- Engine: [Inner Sphere | Clan]
- Gyro: [Inner Sphere | Clan]
- Heat Sinks: [Inner Sphere | Clan]
- Armor: [Inner Sphere | Clan]
- Myomer: [Inner Sphere | Clan]
- Actuators: [Inner Sphere | Clan]
- Movement: [Inner Sphere | Clan]

Example Mixed Configuration:
- Structure: Endo Steel (IS) - 14 slots
- Engine: XL (Clan) - 2 side slots
- Gyro: XL (IS) - 6 CT slots (save weight)
- Heat Sinks: Double (Clan) - 2 slots each
- Armor: Ferro-Fibrous (IS) - 14 slots
- Myomer: MASC (IS) - IS exclusive
- Actuators: Standard (IS)
- Movement: Improved Jump Jets (Clan) - earlier availability

This creates optimal configuration combining best of both tech bases.
```

### Equipment vs Structural Components

**Critical Distinction**: Equipment availability is NOT constrained by unit tech base declaration

**Structural Components** (Tech Base Locked):
- Internal Structure
- Engine
- Gyro
- Heat Sinks (base system)
- Armor
- Myomer/Enhancements
- Actuators
- Movement Systems (Jump Jets, UMU)
- Cockpit

**Equipment** (Year/Era Only):
- Weapons (lasers, autocannons, missiles, etc.)
- Ammunition
- Electronics (ECM, Artemis, BAP, C3, TAG, etc.)
- Physical weapons (claws, hatchets, etc.)
- Optional equipment (cases, supercharger, etc.)
- Heat management equipment (coolant pods, exchanger, etc.)

**Equipment Availability Rules**:
```typescript
// CORRECT: Equipment filtered by year only
if (constructionYear >= equipment.introductionYear) {
  // Equipment is available regardless of unit tech base
  return true;
}

// WRONG: Do NOT filter equipment by unit tech base
if (unit.techBase === TechBase.INNER_SPHERE &&
    equipment.techBase === TechBase.CLAN) {
  return false; // WRONG - this is incorrect validation
}
```

**Example**:
```
Inner Sphere Mech (techBase: INNER_SPHERE), year 3055:
- Structural Components: MUST be Inner Sphere
  - Engine: XL (IS) ✓ Valid
  - Engine: XL (Clan) ✗ Invalid - structural component must match
  - Structure: Endo Steel (IS) ✓ Valid
  - Heat Sinks: Double (IS) ✓ Valid

- Equipment: Year-based ONLY
  - ER Large Laser (Clan) ✓ Valid - introduced 2824, before 3055
  - LRM 15 (IS) ✓ Valid - introduced 2300, before 3055
  - Ultra AC/5 (Clan) ✓ Valid - introduced 2825, before 3055
  - This IS mech CAN use Clan weapons (salvage scenario)

Impact:
- Structural: Pure IS (all IS structural components)
- Equipment: Mixed (uses both IS and Clan weapons)
- Tech Rating: Increased due to equipment mixing
- Tournament: May be restricted as "mixed technology"
- NOT declared as "Mixed Tech" but acts similarly
```

### Mixed Tech Construction Rules

**Rule 1: One Type Per Category**
For systems with tech variants, choose ONE variant consistently:
```
Heat Sinks:
✓ Valid: All 15 heat sinks are Double (IS)
✓ Valid: All 15 heat sinks are Double (Clan)
✗ Invalid: Mix of 10 Double (IS) and 5 Double (Clan)

Rationale: Heat sink type must be consistent across entire unit
```

**Rule 2: Tech Base Declaration Per Component**
Each component explicitly declares its tech base:
```typescript
{
  engine: {
    type: 'XL',
    techBase: TechBase.CLAN,  // Explicitly Clan
    rating: 300
  },
  structure: {
    type: 'Endo Steel',
    techBase: TechBase.INNER_SPHERE,  // Explicitly IS
  }
}
```

**Rule 3: Availability Check**
Component must be available to its declared tech base:
```
✓ Valid: XL Engine (Clan) on Mixed Tech unit
✗ Invalid: Light Engine (Clan) - doesn't exist
✓ Valid: Light Engine (IS) on Mixed Tech unit
✗ Invalid: TSM (Clan) - doesn't exist
```

**Rule 4: Weight and Slot Calculations**
Mixed tech units calculate properties per-component:
```typescript
For each component:
  1. Use component's declared tech base
  2. Apply that tech base's weight formula
  3. Apply that tech base's slot requirements
  4. Sum all components for total weight/slots

Example:
- XL Engine (Clan): Uses Clan XL formula (50% weight, 2 side slots)
- Endo Steel (IS): Uses IS formula (5% weight, 14 slots)
- Ferro-Fibrous (Clan): Uses Clan formula (19.2 pts/ton, 7 slots)
```

**Rule 5: Tech Rating Escalation**
Mixed tech increases unit tech rating:
```typescript
Unit Tech Rating = MAX(
  Base chassis tech rating,
  Highest component tech rating,
  Mixed tech penalty (if IS using Clan tech: +1)
)

Example:
- IS mech (Standard rating) using Clan DHS (Standard rating Clan)
- Mixed tech penalty: +1
- Result: Advanced tech rating
```

**Rule 6: Battle Value Modifier**
Mixed Tech units have BV multiplier:
```
Pure IS or Pure Clan: BV × 1.0 (no modifier)
Mixed Tech declared: BV × 1.25 (+25% increase)

Rationale: Mixed tech units more complex to maintain and operate
```

### Tech Base Memory System

For Mixed Tech units, the system remembers component selections when toggling categories:

```typescript
interface ITechBaseMemory {
  structure: {
    [TechBase.INNER_SPHERE]: 'Endo Steel',
    [TechBase.CLAN]: 'Endo Steel (Clan)'
  },
  engine: {
    [TechBase.INNER_SPHERE]: 'Light',
    [TechBase.CLAN]: 'XL (Clan)'
  },
  // ... for each category
}

// User flow:
1. User selects Mixed Tech
2. Sets Engine category to "Inner Sphere", selects "Light Engine"
3. Toggles Engine category to "Clan", selects "XL (Clan)"
4. Toggles back to "Inner Sphere"
5. System restores "Light Engine" (previous IS selection)
```

This allows users to experiment with different tech base combinations without losing work.

---

## Component Availability Matrices

### Matrix: Internal Structure

| Structure Type | Inner Sphere | Clan | Rules Level | Special Notes |
|----------------|--------------|------|-------------|---------------|
| Standard | ✓ Available | ✓ Available | Introductory | Universal baseline |
| Endo Steel | ✓ Available (14 slots) | ✓ Available (7 slots) | Standard | Clan uses half the slots |
| Endo-Composite | ✓ Available | ✓ Available | Experimental | Identical specs |
| Reinforced | ✓ Available | ✓ Available | Advanced | Identical specs |
| Composite | ✓ Available | ✓ Available | Experimental | Identical specs |
| Industrial | ✓ Available | ✗ Not Available | Introductory | IndustrialMechs only |

**Key Insight**: Clan has access to all IS structure types except Industrial. Primary difference is slot reduction for Endo Steel (14→7).

### Matrix: Engines

| Engine Type | Inner Sphere | Clan | Rules Level IS | Rules Level Clan | Special Notes |
|-------------|--------------|------|----------------|------------------|---------------|
| Standard Fusion | ✓ Available | ✓ Available | Introductory | Introductory | Universal baseline |
| XL | ✓ Available (3 side slots) | ✓ Available (2 side slots) | Advanced | **Standard** | Clan saves 2 slots, lower rules level |
| XXL | ✓ Available | ✓ Available | Experimental | Experimental | Identical specs |
| Light | ✓ Available | ✗ **Not Available** | Advanced | N/A | IS-exclusive |
| Compact | ✓ Available | ✗ **Not Available** | Advanced | N/A | IS-exclusive |
| ICE | ✓ Available | ✓ Available | Introductory | Introductory | Identical specs |
| Fuel Cell | ✓ Available | ✓ Available | Advanced | Advanced | Identical specs |
| Fission | ✓ Available | ✓ Available | Primitive | Primitive | Identical specs |

**Key Insight**: Clans have NO access to Light or Compact engines. Clans treat XL as Standard rules level (widespread adoption). IS has more engine variety (Light, Compact) as interim solutions.

### Matrix: Gyroscopes

| Gyro Type | Inner Sphere | Clan | Rules Level | Special Notes |
|-----------|--------------|------|-------------|---------------|
| Standard | ✓ Available | ✓ Available | Introductory | Identical specs |
| XL | ✓ Available | ✗ **Not Available** | Advanced | IS-exclusive |
| Compact | ✓ Available | ✗ **Not Available** | Advanced | IS-exclusive |
| Heavy-Duty | ✓ Available | ✗ **Not Available** | Advanced | IS-exclusive |

**Key Insight**: Clan uses ONLY Standard Gyro. All advanced gyro types are IS-exclusive. Clans see no need for gyro variants beyond proven Standard.

### Matrix: Heat Sinks

| Heat Sink Type | Inner Sphere | Clan | External Slots IS | External Slots Clan | Rules Level IS | Rules Level Clan |
|----------------|--------------|------|-------------------|---------------------|----------------|------------------|
| Single | ✓ Available | ✓ Available (not used) | 1 | 1 | Introductory | Introductory |
| Double | ✓ Available | ✓ Available | 3 | 2 | Advanced | **Standard** |
| Compact | ✓ Available | ✓ Available | 1 | 1 | Advanced | Advanced |
| Laser | ✓ Available | ✓ Available | 1 | 1 | Experimental | Experimental |

**Key Insight**: Clan Double Heat Sinks are Standard rules level (vs IS Advanced). Clan forces do not use Single Heat Sinks in practice (all use Double). Clan saves 1 slot per external DHS (3→2).

### Matrix: Armor

| Armor Type | Inner Sphere | Clan | Pts/Ton IS | Pts/Ton Clan | Slots IS | Slots Clan | Special Notes |
|------------|--------------|------|------------|--------------|----------|------------|---------------|
| Standard | ✓ Available | ✓ Available | 16 | 16 | 0 | 0 | Universal baseline |
| Ferro-Fibrous | ✓ Available | ✓ Available | 17.92 | **19.2** | 14 | 7 | Clan dual advantage |
| Light Ferro-Fibrous | ✓ Available | ✗ **Not Available** | 16.8 | N/A | 7 | N/A | IS-exclusive |
| Heavy Ferro-Fibrous | ✓ Available | ✗ **Not Available** | 19.2 | N/A | 21 | N/A | IS-exclusive |
| Stealth | ✓ Available | ✓ Available | 16 | 16 | 12 | 12 | Identical specs |
| Reactive | ✓ Available | ✓ Available | 14 | 14 | 14 | 14 | Identical specs |
| Reflective | ✓ Available | ✓ Available | 16 | 16 | 10 | 10 | Identical specs |
| Hardened | ✓ Available | ✓ Available | 8 | 8 | 0 | 0 | Identical specs |

**Key Insight**: Clan Ferro-Fibrous has BOTH better efficiency (19.2 vs 17.92) AND fewer slots (7 vs 14) - most significant single advantage. IS developed Light and Heavy FF as alternatives/compromises.

### Matrix: Cockpits

| Cockpit Type | Inner Sphere | Clan | Weight | Slots | Special Notes |
|--------------|--------------|------|--------|-------|---------------|
| Standard | ✓ Available | ✓ Available | 3 tons | 1 head | Universal baseline |
| Small | ✓ Available | ✓ Available | 2 tons | 1 head | Identical specs |
| Command Console | ✓ Available | ✓ Available | 3 tons | 1 head + 3 CT | Different intro years (3050 IS, 2828 Clan) |
| Torso-Mounted | ✓ Available | ✓ Available | 4 tons | 2 CT | Identical specs |
| Interface | ✓ Available | ✓ Available | 3 tons | 1 head | Identical specs |

**Key Insight**: Cockpits have minimal tech base differences. Primary distinction is introduction years. Command Console shows typical ~220 year Clan advantage.

### Matrix: Movement Systems

| Movement Type | Inner Sphere | Clan | Weight Formula | Slots | Special Notes |
|---------------|--------------|------|----------------|-------|---------------|
| Standard Jump Jets | ✓ Available | ✓ Available | By tonnage class | 1 per JJ | Identical mechanics |
| Improved Jump Jets | ✓ Available | ✓ Available | 2× standard | 2 per JJ (IS)<br/>2 per JJ (Clan) | Different intro years (3069 IS, 2830 Clan) |
| Jump Booster | ✓ Available | ✓ Available | Special | Varies (IS)<br/>2 (Clan) | Clan version fewer slots |
| UMU | ✓ Available | ✓ Available | By tonnage class | 1 per UMU | Identical mechanics |

**Key Insight**: Movement systems largely identical. Jump Jets same formulas and slots. Improved JJ shows ~239 year Clan introduction advantage.

### Matrix: Myomer and Enhancements

| Component | Inner Sphere | Clan | Weight | Slots | Special Notes |
|-----------|--------------|------|--------|-------|---------------|
| Standard Myomer | ✓ Available | ✓ Available | Included in structure | 0 | Universal baseline |
| Standard Actuators | ✓ Available | ✓ Available | Included in structure | 1 per | Universal baseline |
| TSM | ✓ Available | ✗ **Not Available** | Special | 6 distributed | IS-exclusive |
| MASC | ✓ Available | ✓ Available | Tonnage-based | Tonnage-based | Identical specs, different intro (3035 IS, 2760 Clan) |

**Key Insight**: Triple Strength Myomer (TSM) is IS-exclusive - Clans consider it unreliable. MASC available to both with identical specs but 275-year Clan introduction advantage (largest gap documented).

---

## Validation Rules Matrix

### Validation Rule: Structural Component Tech Base Match

**Rule**: All structural components must match their declared or selected tech base

**Severity**: Error (construction invalid)

**Validation Logic**:
```typescript
// Pure Inner Sphere Unit
if (unit.techBase === TechBase.INNER_SPHERE) {
  for (const category of StructuralCategories) {
    if (component[category].techBase !== TechBase.INNER_SPHERE) {
      return {
        valid: false,
        error: `${category} component has tech base ${component[category].techBase} but unit requires INNER_SPHERE`,
        component: component[category].name,
        severity: 'critical'
      };
    }
  }
}

// Pure Clan Unit
if (unit.techBase === TechBase.CLAN) {
  for (const category of StructuralCategories) {
    if (component[category].techBase !== TechBase.CLAN) {
      return {
        valid: false,
        error: `${category} component has tech base ${component[category].techBase} but unit requires CLAN`,
        component: component[category].name,
        severity: 'critical'
      };
    }
  }
}

// Mixed Tech Unit
if (unit.techBase === TechBaseFilter.MIXED) {
  for (const category of StructuralCategories) {
    const declaredTechBase = unit.structuralTechBases[category];
    if (component[category].techBase !== declaredTechBase) {
      return {
        valid: false,
        error: `${category} component has tech base ${component[category].techBase} but category declared as ${declaredTechBase}`,
        component: component[category].name,
        severity: 'critical'
      };
    }
  }
}
```

**Error Messages**:
| Condition | Error Message | Resolution |
|-----------|---------------|------------|
| IS unit with Clan structural | "XL Engine (Clan) not compatible with Inner Sphere unit. Use XL Engine (IS) or enable Mixed Tech." | Replace with IS equivalent or change to Mixed Tech |
| Clan unit with IS structural | "Endo Steel (IS) not compatible with Clan unit. Use Endo Steel (Clan) or enable Mixed Tech." | Replace with Clan equivalent or change to Mixed Tech |
| Mixed unit category mismatch | "Engine category set to Clan but Light Engine (IS) selected. Select Clan engine or change category to IS." | Change component or change category tech base |

### Validation Rule: Component Availability by Tech Base

**Rule**: Selected component must be available for its declared tech base

**Severity**: Error (component doesn't exist)

**Validation Logic**:
```typescript
function validateComponentAvailability(
  component: string,
  category: StructuralComponentCategory,
  techBase: TechBase
): ValidationResult {
  const availableComponents = getAvailableComponents(category, techBase);

  if (!availableComponents.includes(component)) {
    return {
      valid: false,
      error: `${component} is not available for ${techBase} in ${category} category`,
      severity: 'critical',
      resolution: `Available ${techBase} options for ${category}: ${availableComponents.join(', ')}`
    };
  }

  return { valid: true };
}
```

**Error Messages**:
| Invalid Component | Error Message | Available Alternatives |
|-------------------|---------------|------------------------|
| Light Engine (Clan) | "Light Engine not available for Clan. Clans do not use Light Engines." | "Available: Standard, XL (Clan), XXL (Clan)" |
| XL Gyro (Clan) | "XL Gyro not available for Clan. Clans use only Standard Gyros." | "Available: Standard" |
| TSM (Clan) | "Triple Strength Myomer not available for Clan. TSM is Inner Sphere exclusive." | "Available: Standard, MASC (Clan)" |
| Compact Engine (Clan) | "Compact Engine not available for Clan." | "Available: Standard, XL (Clan)" |

### Validation Rule: Equipment Tech Base Independence

**Rule**: Equipment must NOT be validated against unit tech base, only against year/era

**Severity**: Info (not an error - this is allowed)

**Validation Logic**:
```typescript
// CORRECT validation
for (const equipment of unit.equipment) {
  // Check year availability
  if (equipment.introductionYear > unit.constructionYear) {
    return {
      valid: false,
      error: `${equipment.name} not available until ${equipment.introductionYear}`,
      severity: 'critical'
    };
  }

  // DO NOT check tech base compatibility for equipment
  // Equipment can be used regardless of unit tech base
}
```

**Info Messages** (not errors):
| Condition | Info Message | Impact |
|-----------|--------------|--------|
| IS unit with Clan weapons | "Unit uses Clan weapons on Inner Sphere chassis. This is valid (salvage scenario) but may increase tech rating and affect tournament legality." | Tech rating may increase, tournament restricted |
| Clan unit with IS equipment | "Unit uses Inner Sphere equipment on Clan chassis. This is valid but unusual for Clan doctrine." | No mechanical penalty, lore-unusual |

### Validation Rule: Mixed Tech Declaration Consistency

**Rule**: Mixed Tech units must have structuralTechBases defined for all categories

**Severity**: Error (configuration incomplete)

**Validation Logic**:
```typescript
if (unit.techBase === TechBaseFilter.MIXED) {
  const requiredCategories = [
    'structure', 'engine', 'gyro', 'heatSinks',
    'armor', 'myomer', 'actuators', 'movement'
  ];

  for (const category of requiredCategories) {
    if (!unit.structuralTechBases[category]) {
      return {
        valid: false,
        error: `Mixed Tech unit missing tech base selection for ${category} category`,
        severity: 'critical',
        resolution: `Select Inner Sphere or Clan for ${category} category`
      };
    }

    if (unit.structuralTechBases[category] === TechBaseFilter.MIXED) {
      return {
        valid: false,
        error: `Category ${category} tech base must be IS or Clan, not MIXED`,
        severity: 'critical',
        resolution: `Select concrete tech base (INNER_SPHERE or CLAN) for ${category}`
      };
    }
  }
}
```

**Error Messages**:
| Condition | Error Message | Resolution |
|-----------|---------------|------------|
| Missing category selection | "Mixed Tech unit missing tech base for Structure category" | "Select Inner Sphere or Clan for Structure" |
| Category set to MIXED | "Structure category tech base cannot be 'MIXED' - must be IS or Clan" | "Change to INNER_SPHERE or CLAN" |

### Validation Rule: Heat Sink Type Consistency

**Rule**: For systems with tech variants, choose ONE variant consistently across entire unit

**Severity**: Error (inconsistent configuration)

**Validation Logic**:
```typescript
// Heat Sink Type Consistency
const heatSinkTypes = new Set();

for (const heatSink of unit.heatSinks) {
  const typeKey = `${heatSink.type}-${heatSink.techBase}`;
  heatSinkTypes.add(typeKey);
}

if (heatSinkTypes.size > 1) {
  return {
    valid: false,
    error: `Mixed heat sink types detected: ${Array.from(heatSinkTypes).join(', ')}. All heat sinks must be same type and tech base.`,
    severity: 'major',
    resolution: `Choose one: All Double (IS) OR All Double (Clan) OR All Single, etc.`
  };
}
```

**Error Messages**:
| Invalid Configuration | Error Message | Resolution |
|-----------------------|---------------|------------|
| Mixed DHS types | "Unit has both Double (IS) and Double (Clan) heat sinks. All heat sinks must be same type and tech base." | "Replace all with either Double (IS) or Double (Clan)" |
| Mixed Single/Double | "Unit has both Single and Double heat sinks. While technically legal, this is highly unusual and not recommended." | "Warning only - suggest using consistent type" |

### Validation Rule: Introduction Year Availability

**Rule**: Component must be available in construction year for its tech base

**Severity**: Error (anachronistic component)

**Validation Logic**:
```typescript
function validateIntroductionYear(
  component: IComponent,
  constructionYear: number,
  techBase: TechBase
): ValidationResult {
  const introYear = component.introductionYears[techBase];

  if (!introYear) {
    return {
      valid: false,
      error: `${component.name} not available for ${techBase}`,
      severity: 'critical'
    };
  }

  if (constructionYear < introYear) {
    return {
      valid: false,
      error: `${component.name} (${techBase}) not available until ${introYear}. Construction year: ${constructionYear}`,
      severity: 'critical',
      resolution: `Change construction year to ${introYear} or later, or select different component`
    };
  }

  return { valid: true };
}
```

**Error Messages**:
| Condition | Error Message | Resolution |
|-----------|---------------|------------|
| IS XL engine in 3025 | "XL Engine (IS) not available until 3035. Construction year: 3025." | "Change year to 3035+ or use Standard Engine" |
| IS DHS in 3040 | "Double Heat Sink (IS) not available until 3050. Construction year: 3040." | "Change year to 3050+ or use Single Heat Sinks" |
| Clan Endo Steel in 2800 | "Endo Steel (Clan) not available until 2845. Construction year: 2800." | "Change year to 2845+ or use Standard Structure" |

### Validation Summary Matrix

| Validation Type | Applies To | Severity | When It Fails |
|-----------------|------------|----------|---------------|
| **Tech Base Match** | Structural Components | Error | Component tech base doesn't match unit/category declaration |
| **Component Availability** | All Components | Error | Component doesn't exist for selected tech base |
| **Equipment Independence** | Equipment Only | Info | Equipment tech base different from unit (allowed) |
| **Mixed Tech Consistency** | Mixed Tech Units | Error | Missing category tech base or category set to MIXED |
| **Type Consistency** | Heat Sinks | Error | Mixed types (e.g., some IS DHS, some Clan DHS) |
| **Introduction Year** | All Components | Error | Component not yet invented in construction year |
| **Tournament Legality** | Complete Unit | Warning | Mixed tech or advanced components may be restricted |

---

## Cross-Reference Table

This table shows where detailed specifications for each component category are documented:

| Component Category | Primary Specification | Matrix Row | Key Tech Base Differences |
|--------------------|----------------------|------------|---------------------------|
| **Engines** | [Engine System](../engine-system/spec.md) | Engines Matrix | XL: IS 3 side slots, Clan 2 side slots<br/>Light: IS-exclusive<br/>Compact: IS-exclusive |
| **Gyroscopes** | [Gyro System](../gyro-system/spec.md) | Gyroscopes Matrix | Advanced gyros (XL, Compact, Heavy-Duty): IS-exclusive<br/>Clan uses Standard only |
| **Heat Sinks** | [Heat Sink System](../heat-sink-system/spec.md) | Heat Sinks Matrix | Double: IS 3 external slots, Clan 2 external slots<br/>Clan DHS is Standard rules level |
| **Internal Structure** | [Internal Structure System](../internal-structure-system/spec.md) | Internal Structure Matrix | Endo Steel: IS 14 slots, Clan 7 slots (50% reduction) |
| **Armor** | [Armor System](../armor-system/spec.md) | Armor Matrix | Ferro-Fibrous: Clan 19.2 pts/ton + 7 slots, IS 17.92 pts/ton + 14 slots<br/>Light/Heavy FF: IS-exclusive |
| **Cockpits** | [Cockpit System](../cockpit-system/spec.md) | Cockpits Matrix | Minimal differences, primarily intro years<br/>Command Console: 222 year Clan advantage |
| **Movement** | [Movement System](../movement-system/spec.md) | Movement Matrix | Jump Jets identical<br/>Improved JJ: 239 year Clan advantage |
| **Critical Slots** | [Critical Slot Allocation](../critical-slot-allocation/spec.md) | N/A | Engine placement varies by tech base<br/>Distributed slots (structure/armor) halved for Clan |
| **Tech Base Integration** | [Tech Base Integration](../tech-base-integration/spec.md) | N/A | Overall rules for mixing and validation<br/>Mixed Tech toggle mechanics |
| **Tech Base Philosophy** | This Document | Philosophy Section | IS vs Clan design approaches and rationale |

### How to Use Cross-References

**When you need**:
- **General patterns**: Use this document (Tech Base Rules Matrix)
- **Specific component weights/formulas**: Use individual component specification
- **Validation rules**: Use this document's Validation Matrix
- **Construction sequence**: Use Tech Base Integration spec
- **Slot placement details**: Use Critical Slot Allocation spec
- **Philosophy/rationale**: Use this document's Philosophy section

**Reference Flow**:
```
Question: "How many slots does a Clan XL engine use?"
1. Check Engines Matrix (this document) → "Clan: 2 slots per side torso"
2. For details, see Engine System spec → Exact placement rules
3. For slot allocation, see Critical Slot Allocation spec → Placement patterns

Question: "Why do Clan and IS have different slot counts?"
1. Check Common Patterns (this document) → "3-2 Pattern"
2. Check Philosophy section → Clan miniaturization technology
3. See Tech Base Variants Reference → Historical context

Question: "Can I use a Light Engine on a Clan mech?"
1. Check Engines Matrix (this document) → "Light: IS-exclusive, NOT AVAILABLE to Clan"
2. Check Validation Matrix → Error message and alternatives
3. Answer: No, Clans don't have Light Engines
```

---

## Summary Statistics

### Critical Slot Savings (Clan vs IS)

**Typical Advanced Technology Mech Comparison**:

| Component | IS Slots | Clan Slots | Savings |
|-----------|----------|------------|---------|
| XL Engine (side torsos) | 6 | 4 | 2 |
| Endo Steel Structure | 14 | 7 | 7 |
| Ferro-Fibrous Armor | 14 | 7 | 7 |
| 5 External Double Heat Sinks | 15 | 10 | 5 |
| **TOTAL** | **49** | **28** | **21 slots** |

**Result**: Clan mech has 21 additional critical slots for weapons, ammunition, and equipment compared to equivalent IS mech.

### Introduction Year Gaps

**Average Gaps by Technology Category**:
- Advanced Structural (XL, Endo, FF): ~200-220 years Clan advantage
- Heat Management (DHS): ~222 years Clan advantage
- Movement (Improved JJ): ~239 years Clan advantage
- Enhancements (MASC): ~275 years Clan advantage (largest gap)
- Basic Tech (Standard components): ~30 years Clan advantage

**Historical Periods**:
- 2439-2784: Star League era (both sides have similar basic tech)
- 2784-3049: Clan maintains tech, IS regresses (largest gaps)
- 3050+: IS begins catching up through salvage and development

### Tech Base Exclusive Components

**Inner Sphere Exclusive**:
- Light Engine
- Compact Engine
- XL Gyro
- Compact Gyro
- Heavy-Duty Gyro
- Triple Strength Myomer
- Light Ferro-Fibrous Armor
- Heavy Ferro-Fibrous Armor

**Total**: 8 IS-exclusive technologies (interim solutions and alternatives)

**Clan Exclusive**:
- None in structural components (Clan uses superior versions of IS tech)

### Rules Level Distribution

**Standard Level Components**:
- IS: Standard Engine, Standard Structure, Standard Armor, Standard Gyro, Single Heat Sinks
- Clan: All above PLUS XL Engine, Double Heat Sinks

**Impact**: Clan "Standard" units can use XL engines and DHS, while IS "Standard" limited to basic tech.

---

## Document Version History

### Version 1.0 (2025-11-28)
- Initial creation of Tech Base Rules Matrix as single source of truth
- Consolidated all tech base differences from multiple specifications
- Created comprehensive component comparison matrices for all 8 structural categories
- Documented 8 common patterns (3-2, 14-7, Weight Identity, etc.)
- Defined complete validation rules with error messages and resolutions
- Documented tech base philosophy and design approaches
- Created cross-reference table to individual component specifications
- Provided summary statistics on slot savings and year gaps
- Established this as authoritative reference for all tech base questions

---

## References

### Source Specifications
- [Tech Base Variants Reference](../tech-base-variants-reference/spec.md) - General philosophy and patterns
- [Tech Base Integration](../tech-base-integration/spec.md) - Unit-level rules and mixed tech mechanics
- [Engine System](../engine-system/spec.md) - Engine type details and formulas
- [Gyro System](../gyro-system/spec.md) - Gyroscope specifications
- [Heat Sink System](../heat-sink-system/spec.md) - Heat sink types and integration
- [Internal Structure System](../internal-structure-system/spec.md) - Structure types and weights
- [Armor System](../armor-system/spec.md) - Armor types and efficiency
- [Cockpit System](../cockpit-system/spec.md) - Cockpit variations
- [Movement System](../movement-system/spec.md) - Jump jets and movement types
- [Critical Slot Allocation](../critical-slot-allocation/spec.md) - Slot placement rules

### Official BattleTech Sources
- **TechManual**: Pages 85-106 - Technology base differences and mixed tech rules
- **Total Warfare**: Pages 128-132 - Tech base overview
- **Strategic Operations**: Pages 125-135 - Advanced tech base rules
- **Interstellar Operations**: Pages 136-145 - Tech progression and extinction
- **Era Report: Golden Century**: Clan technology development timeline
- **Era Report: 3052**: Clan Invasion era technology introduction to IS

---

## Usage Guidelines

### For Developers

**This document is your first stop for any tech base question**:
1. Check the appropriate comparison matrix
2. Reference the validation rules for implementation
3. Use individual component specs for detailed formulas
4. Cite this document in code comments for tech base logic

**Example Code Comment**:
```typescript
// Using Clan XL Engine: 2 side slots per torso (not 3 like IS)
// See: Tech Base Rules Matrix - Engines Matrix
// Pattern: 3-2 Side Torso Slots
const clanXLSideSlots = 2;
```

### For Specification Authors

**Reference this document instead of duplicating**:
- Link to specific matrices for tech base comparisons
- Reference patterns by name (e.g., "follows 14-7 Pattern")
- Focus your spec on component-specific formulas and mechanics
- Defer tech base philosophy and validation to this document

**Example Spec Reference**:
```markdown
## Technology Base Variants

See [Tech Base Rules Matrix](../tech-base-rules-matrix/spec.md) for complete
tech base comparison. This component follows the "3-2 Pattern" for slot allocation.

### Component-Specific Details
[Component-specific implementation details only]
```

### For UI/UX Design

**Use this document to**:
- Display tech base differences to users (reference matrices)
- Show validation error messages (use Validation Matrix messages)
- Explain why components aren't available (reference availability matrices)
- Educate users about tech base choices (reference Philosophy section)

### For Game Masters and Players

**This document helps you**:
- Understand tech base differences for mech construction
- Make informed decisions about tech base selection
- Understand why certain components aren't available
- Learn historical context for technology development

---

**END OF SPECIFICATION**
