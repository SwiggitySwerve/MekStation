# Technology Base Variants Reference

**Status**: Active
**Version**: 1.0
**Last Updated**: 2025-11-28
**Scope**: Cross-cutting reference for Phase 2 Construction specifications

---

## Overview

### Purpose
This document provides the authoritative reference for understanding technology base (Inner Sphere vs Clan) differences across BattleMech construction systems. All Phase 2 construction specifications reference this document for general tech base variant principles.

### Scope
**In Scope:**
- General philosophy of Inner Sphere vs Clan technology differences
- Common patterns in weight, slots, and tech rating differences
- When and how tech base affects component characteristics
- Mixed tech rules and implications
- General availability and introduction year patterns

**Out of Scope:**
- Component-specific variant details (documented in each component's spec)
- Specific weights, slot counts, or formulas (component specs are authoritative)
- Combat mechanics and tech base interactions
- Era-specific availability (covered in Era & Temporal System spec)

---

## Tech Base Philosophy

### Inner Sphere Technology

**General Characteristics**:
- **Development approach**: Incremental advancement following Star League technology loss
- **Weight efficiency**: Generally less efficient than Clan equivalents
- **Critical slots**: Typically requires more slots for advanced technology
- **Complexity**: Higher tech rating for equivalent capabilities
- **Protection trade-offs**: Advanced technologies often have greater vulnerability
- **Availability**: Later introduction dates for advanced tech (3040s-3060s typically)

**Design Philosophy**:
Inner Sphere technology represents rediscovery and incremental improvement of Star League technology following the Succession Wars. IS engineers prioritize battlefield repair and maintainability, resulting in designs that are bulkier but easier to service. Advanced IS technology often trades protection for weight savings (e.g., XL engines with 3 side torso slots).

### Clan Technology

**General Characteristics**:
- **Development approach**: Continuous improvement of original Star League technology
- **Weight efficiency**: Generally more efficient than IS equivalents
- **Critical slots**: Typically requires fewer slots for same capability
- **Complexity**: Lower tech rating for equivalent capabilities (Standard vs Advanced)
- **Compactness**: Better integration and miniaturization
- **Availability**: Earlier introduction dates (Clan Golden Century, 2800s-2900s)

**Design Philosophy**:
Clan technology represents unbroken technological advancement from the Star League exodus. Clan engineers achieved superior miniaturization and efficiency through superior manufacturing and materials science. Clan advanced technology tends to be more compact and better protected than IS equivalents (e.g., Clan XL engines with only 2 side torso slots).

---

## Common Variant Patterns

### Pattern 1: Weight Identical, Slots Differ

**Description**: Component has same weight regardless of tech base, but slot requirements differ.

**Common in**: Engines (XL), Heat Sinks (Double), Structure (Endo Steel)

**Example Pattern**:
- Inner Sphere: 1.0 ton, 3 critical slots
- Clan: 1.0 ton, 2 critical slots
- Net effect: Clan saves critical space without weight penalty

**Typical Ratio**: IS requires ~1.5× the slots of Clan equivalent

### Pattern 2: Weight and Slots Both Differ

**Description**: Component differs in both weight and slot requirements between tech bases.

**Common in**: Endo Steel structure, certain equipment types

**Example Pattern**:
- Inner Sphere: 14 critical slots
- Clan: 7 critical slots (exactly half)
- Both achieve same 50% weight reduction

**Typical Ratio**: Clan requires half the slots of IS

### Pattern 3: Tech-Exclusive Components

**Description**: Component available only to one tech base.

**Common in**: Light Engines (IS-only), Compact Engines (IS-only), certain equipment

**Example Pattern**:
- Inner Sphere: Light Engine (75% weight, 2 side slots) - available
- Clan: Light Engine - NOT available (Clans use XL instead)

**Rationale**: Different technological development paths led to different solutions

### Pattern 4: Rules Level Differences

**Description**: Same component classified at different rules complexity levels.

**Common in**: XL Engines, Double Heat Sinks

**Example Pattern**:
- Inner Sphere: XL Engine at RulesLevel.ADVANCED
- Clan: XL Engine at RulesLevel.STANDARD
- Reason: Clans adopted XL technology earlier and more widely

### Pattern 5: Introduction Year Gaps

**Description**: Clan technology available decades or centuries before IS equivalent.

**Common in**: Most advanced technologies (Double Heat Sinks, XL Gyros, Ferro-Fibrous armor)

**Example Pattern**:
- Clan: Double Heat Sinks available 2828 (Clan Golden Century)
- Inner Sphere: Double Heat Sinks available 3050 (Clan Invasion era)
- Gap: ~220 years

**Historical Context**: Represents technological superiority maintained by Clans

---

## Weight Differences

### Components with Identical Weight
These components weigh the same regardless of tech base:
- Standard Fusion Engines
- Standard Gyros
- Single Heat Sinks
- Most weapons of same class
- Standard Armor

### Components with Different Weight Efficiency
These components have better weight efficiency for one tech base:
- **Endo Steel Structure**: Both 50% weight reduction, but Clan requires half the slots
- **Double Heat Sinks**: Same 1 ton weight, but Clan requires fewer slots
- **Ferro-Fibrous Armor**: Clan provides 19.2 pts/ton vs IS 17.92 pts/ton

### Weight Calculation Consistency
When weight differs by tech base:
- Always use component's specific tech base formula
- Round to nearest 0.5 ton as final step
- Weight multipliers apply equally (e.g., Hardened armor 2× for both)

---

## Critical Slot Differences

### The "3-2 Pattern"
**Most common slot difference**: IS requires 3 slots, Clan requires 2 slots

**Examples**:
- Double Heat Sinks: IS 3 slots external, Clan 2 slots external
- XL Engine side torsos: IS 3 per side, Clan 2 per side

**Rationale**: Clan miniaturization technology

### The "14-7 Pattern"
**Distributed slot difference**: IS requires 14 slots, Clan requires 7 slots

**Examples**:
- Endo Steel Structure: IS 14 slots distributed, Clan 7 slots distributed
- Ferro-Fibrous Armor: IS 14 slots distributed, Clan 7 slots distributed

**Rationale**: Reflects material distribution requirements for weight-saving technologies

### Slot Placement Rules
Regardless of tech base:
- Slots must be contiguous for single equipment item
- Distributed structure/armor slots may be split across locations
- Engine slots follow fixed placement patterns
- Head location typically unavailable for distributed slots

---

## Tech Rating Impact

### Tech Rating Progression
Inner Sphere advanced technology typically appears at higher tech rating:

| Technology | IS Tech Rating | Clan Tech Rating | Rating Difference |
|------------|----------------|------------------|-------------------|
| Standard Equipment | Introductory | Introductory | None |
| XL Engine | Advanced | Standard | +1 IS |
| Double Heat Sinks | Advanced | Standard | +1 IS |
| Endo Steel | Standard | Standard | None |
| Ferro-Fibrous | Standard | Standard | None |

### Mixed Tech Impact
When mixing tech bases:
- Each component uses its own tech rating
- Overall unit tech rating = highest component rating
- IS unit using Clan tech: rating penalty applies
- Clan unit using IS tech: no rating increase (downgrade allowed)

---

## Mixed Tech Rules

### General Principles

**Definition**: Mixed tech units incorporate components from both Inner Sphere and Clan tech bases.

**When Allowed**:
- Campaign rules explicitly allow mixed tech
- Construction year is during appropriate era (typically 3050+)
- Unit tech base set to TechBase.MIXED

**Restrictions**:
- Cannot mix incompatible components (e.g., IS XL with Clan XL in same unit)
- Heat sink type must be consistent (all IS Double or all Clan Double, not mixed)
- Each component tracks its own tech base origin

### Component Selection Rules

1. **One Type Rule**: For systems with tech variants (heat sinks, engines), choose ONE variant for entire mech
   - Example: All Double Heat Sinks must be IS OR all Clan, never mixed

2. **Tech Base Declaration**: Each component explicitly declares its tech base
   - IS Light Engine on Mixed unit: Valid, uses IS rules
   - Clan XL Engine on Mixed unit: Valid, uses Clan rules (2 side slots)

3. **Availability Check**: Component must be available to its declared tech base
   - Cannot use "Light Engine (Clan)" - doesn't exist
   - Cannot use IS-exclusive equipment on pure Clan unit

### Weight and Slot Calculations

Mixed tech units calculate properties per-component:
```
For each component:
  1. Use component's declared tech base
  2. Apply that tech base's weight formula
  3. Apply that tech base's slot requirements
  4. Sum all components for total weight/slots
```

### Tech Rating Escalation

**Rule**: Mixed tech increases unit tech rating

**Calculation**:
```
Unit Tech Rating = MAX(
  Base chassis tech rating,
  Highest component tech rating,
  Mixed tech penalty (if IS using Clan tech: +1)
)
```

**Example**:
- IS mech (Standard rating) using Clan DHS (Standard rating)
- Mixed tech penalty: +1
- Result: Advanced tech rating

---

## Availability and Eras

### General Timeline Patterns

**Inner Sphere Technology Waves**:
1. **Pre-3050**: Primarily Succession Wars technology, limited advanced tech
2. **3050-3060**: Clan Invasion era, rediscovery of advanced tech begins
3. **3060-3070**: FedCom Civil War, widespread advanced tech deployment
4. **3070+**: Jihad and Dark Age, mature advanced tech

**Clan Technology Baseline**:
1. **2800s-2900s**: Golden Century, most "advanced" Clan tech already available
2. **3000-3050**: Refinement period, technology largely static
3. **3050+**: Contact with Inner Sphere, some cross-pollination

### Introduction Year Gaps

Common patterns for tech introduction timing:

| Technology Type | Clan Introduction | IS Introduction | Gap |
|-----------------|-------------------|-----------------|-----|
| Double Heat Sinks | ~2828 | 3050 | ~220 years |
| XL Engines | ~2830 | 3035 | ~200 years |
| Endo Steel | ~2845 | 3040 | ~195 years |
| Ferro-Fibrous | ~2825 | 3040 | ~215 years |
| Advanced Gyros | ~2850 | 3067 | ~215 years |

### Extinction Periods

Some IS technologies have extinction periods where availability is limited:
- Jihad era (3067-3085): Some advanced tech production disrupted
- Succession Wars (2785-3049): Advanced Star League tech largely lost
- Availability rules may require campaign setting consideration

---

## Validation Rules

### Tech Base Compatibility Validation

**Rule**: Component tech base must be compatible with unit tech base

**Validation Logic**:
```typescript
if (unit.techBase === TechBase.INNER_SPHERE &&
    component.techBase === TechBase.CLAN) {
  if (campaignAllowsMixedTech) {
    // Allow but flag as mixed tech
    return { valid: true, warning: 'Mixed tech increases tech rating' };
  } else {
    // Reject
    return { valid: false, error: 'Clan component not allowed on IS unit' };
  }
}
```

### Variant Selection Validation

**Rule**: When tech variants exist, must select appropriate variant

**Examples**:
- IS unit selecting "XL Engine": Must use XL_INNER_SPHERE variant (3 side slots)
- Clan unit selecting "XL Engine": Must use XL_CLAN variant (2 side slots)
- Cannot select "XL Engine (generic)" - must specify tech base

### Availability Validation

**Rule**: Component must be available in construction year for its tech base

**Validation**:
```typescript
if (constructionYear < component.introductionYear) {
  return {
    valid: false,
    error: `${component.name} not available until ${component.introductionYear}`
  };
}
```

---

## Implementation Guidance

### When Component Specs Should Reference This Document

Reference this document for:
- ✅ General "Inner Sphere vs Clan differences" explanations
- ✅ Philosophy of why differences exist
- ✅ Common patterns (3-2 slots, 14-7 distributed, etc.)
- ✅ Mixed tech rules and implications

Do NOT reference for:
- ❌ Specific component weights or formulas (use component spec)
- ❌ Specific slot counts (use component spec)
- ❌ Component-unique variant behaviors (use component spec)

### Recommended Section Structure in Component Specs

Replace verbose "Technology Base Variants" sections with:

```markdown
## Technology Base Variants

See [Tech Base Variants Reference](../tech-base-variants-reference/spec.md)
for general Inner Sphere vs Clan differences and common patterns.

### Component-Specific Variants

**[Component Name] Tech Base Differences**:
- Inner Sphere: [specific differences]
- Clan: [specific differences]

**Example**: [Brief example showing the specific difference]
```

### Code Implementation Pattern

```typescript
// Good: Component spec is authoritative for specific values
const isXLEngine = {
  techBase: TechBase.INNER_SPHERE,
  sideTorsoSlots: 3  // IS-specific: 3 slots per side
};

const clanXLEngine = {
  techBase: TechBase.CLAN,
  sideTorsoSlots: 2  // Clan-specific: 2 slots per side
};

// Component specs should document these specific differences
// This reference doc explains WHY (miniaturization, efficiency)
```

---

## Cross-Reference Table

Quick reference for where specific tech base variant information is documented:

| Component/System | Specification Document | Key Variant Difference |
|------------------|------------------------|------------------------|
| Engine (XL) | engine-system/spec.md | Side torso slots: IS 3, Clan 2 |
| Engine (Light) | engine-system/spec.md | IS-only, not available to Clan |
| Gyro (types) | gyro-system/spec.md | Same weight/slots, earlier Clan intro |
| Heat Sinks (Double) | heat-sink-system/spec.md | External slots: IS 3, Clan 2 |
| Endo Steel | internal-structure-system/spec.md | Distribution slots: IS 14, Clan 7 |
| Ferro-Fibrous | armor-system/spec.md | Points/ton + slots: IS 17.92/14, Clan 19.2/7 |
| Critical Slots | critical-slot-allocation/spec.md | Engine placement varies by tech base |
| Cockpit | cockpit-system/spec.md | Minimal differences, mostly availability |
| Movement | movement-system/spec.md | Same formulas, component differences affect capacity |
| Tech Base Integration | tech-base-integration/spec.md | Overall rules for mixing and validation |
| Construction Rules | construction-rules-core/spec.md | Tech base affects construction sequence |

---

## Examples

### Example 1: Understanding an XL Engine Difference

**Question**: Why does an IS XL engine use 3 side torso slots but Clan only uses 2?

**Answer** (from this reference):
- Pattern: "3-2 Pattern" - common Clan miniaturization advantage
- Philosophy: Clan superior materials science and manufacturing
- Impact: Clan saves 2 critical slots total (1 per side) compared to IS

**For specifics** (from engine-system/spec.md):
- IS XL: 6 CT + 3 LT + 3 RT = 12 total slots
- Clan XL: 6 CT + 2 LT + 2 RT = 10 total slots
- Weight: Both 50% of standard fusion (identical)
- Protection: Both vulnerable to side torso destruction

### Example 2: Choosing Heat Sinks for Mixed Tech Unit

**Scenario**: Building a mixed tech IS mech, want to use Clan Double Heat Sinks

**Considerations** (from this reference):
1. **Compatibility**: Allowed - mixed tech permits Clan components on IS units
2. **Consistency**: All DHS must be Clan type (cannot mix IS and Clan DHS)
3. **Slot advantage**: Clan DHS requires 2 slots external vs IS 3 slots
4. **Tech rating**: Mixed tech increases unit tech rating by +1
5. **Weight**: Identical (1 ton per heat sink regardless)

**For specifics** (from heat-sink-system/spec.md):
- Clan DHS: 2 heat/turn, 1 ton, 2 slots external, 0 when engine-integrated
- Must be available in construction year (2828+ for Clan)

### Example 3: Endo Steel Structure Choice

**Question**: Should I use IS or Clan Endo Steel for my mixed tech unit?

**Trade-off Analysis** (from this reference):
- Weight savings: Identical (both 50% reduction)
- Slot cost: IS requires 14 slots, Clan requires 7 slots (half!)
- Tech rating: Both "Standard" rating, no difference
- Decision: Clan Endo Steel is strictly better (fewer slots, same weight)

**For specifics** (from internal-structure-system/spec.md):
- Placement rules: Slots distributed across locations (not in head)
- Weight formula: tonnage × 5%, round up to 0.5 ton
- Structure points: Same as standard (no multiplier)

---

## References

### Official BattleTech Sources
- **TechManual**: Pages 85-106 - Technology Base differences and mixed tech rules
- **Total Warfare**: Pages 128-132 - Tech base overview
- **Strategic Operations**: Pages 125-135 - Advanced tech base rules
- **Interstellar Operations**: Pages 136-145 - Tech progression and extinction

### Related Specifications
- All Phase 2 Construction specifications reference this document
- Core Entity Types: Defines ITechBaseEntity interface
- Era & Temporal System: Covers introduction years and extinction periods
- Tech Base Integration: Covers validation and mixed tech implementation

---

## Changelog

### Version 1.0 (2025-11-28)
- Initial specification created
- Consolidated common tech base variant information from all Phase 2 specs
- Defined philosophy, patterns, and common behaviors
- Established cross-reference structure for component-specific details
- Created to eliminate duplication across 10 Phase 2 construction specifications
