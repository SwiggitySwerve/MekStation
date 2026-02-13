# ferro-lamellor-armor-combat Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2026-02-13
**Dependencies**: armor-system, critical-hit-resolution
**Affects**: critical-hit-resolution

---

## Overview

### Purpose

Define the special combat mechanics for Ferro-Lamellor armor that modify critical hit damage application. Ferro-Lamellor armor is a Clan experimental armor type that reduces the number of critical hits applied to components by half, providing enhanced survivability against internal damage without modifying the critical hit determination roll itself.

### Scope

**In Scope:**

- Critical hit count reduction (halving) for locations protected by Ferro-Lamellor armor
- Rounding and minimum rules for halved critical hit counts
- Armor type context threading to critical hit resolution functions
- Integration with the existing `resolveCriticalHits` pipeline

**Out of Scope:**

- Ferro-Lamellor armor construction rules (weight, slots, cost) — covered by `armor-system`
- Ferro-Lamellor armor BV multiplier calculation — covered by `battle-value-system`
- Modification of the base crit determination table (2-7/8-9/10-11/12)
- Through-armor critical (TAC) behavior — Ferro-Lamellor does NOT prevent TACs (unlike hardened armor)
- Behavior changes for any other armor type (standard, hardened, reactive, etc.)
- Half-point damage tracking (that is a hardened armor mechanic, not Ferro-Lamellor)
- Walking MP penalties (Ferro-Lamellor does not impose MP reduction)
- Ferro-Lamellor armor availability by era/tech base — covered by `armor-system`

### Key Concepts

- **Crit Damage Halving**: When Ferro-Lamellor armor protects a location, the number of critical hits actually applied to components is halved (rounded down), with a minimum of 1
- **Determination Unchanged**: The critical hit determination roll itself is not modified — only the number of hits applied after determination
- **Minimum 1 Rule**: If the determination roll indicates any critical hits (1 or more), at least 1 critical hit SHALL always be applied even after halving

---

## Requirements

### Requirement: Critical Hit Count Reduction for Ferro-Lamellor Armor

When a location protected by Ferro-Lamellor armor receives critical hits, the system SHALL halve the number of critical hits applied to components (rounded down), with a minimum of 1 hit.

<!-- source: src/utils/gameplay/criticalHitResolution.ts:1026-1034 — resolveCriticalHits signature with armorType -->
<!-- source: src/types/construction/ArmorType.ts:15-25 — ArmorTypeEnum -->

The critical hit determination roll (2d6 on the crit table) SHALL NOT be modified. Only the resulting critical hit count SHALL be reduced before slot selection and effect application.

When the determination roll indicates 0 critical hits, the result SHALL remain 0 (halving does not apply to zero).

**Rationale**: Ferro-Lamellor armor's layered composite structure absorbs and distributes the energy of internal impacts, reducing the number of components damaged but not preventing critical hits entirely.

**Priority**: Critical

#### Scenario: Standard armor location — critical hits unchanged

- **GIVEN** a location with standard armor takes internal structure damage
- **WHEN** the critical hit determination roll indicates N critical hits
- **THEN** N critical hits SHALL be applied to components
- **AND** no halving SHALL occur

#### Scenario: Ferro-Lamellor location hit with 2 crits — halved to 1

- **GIVEN** a location with Ferro-Lamellor armor takes internal structure damage
- **WHEN** the critical hit determination roll indicates 2 critical hits (roll 10-11)
- **THEN** floor(2 / 2) = 1 critical hit SHALL be applied to components

#### Scenario: Ferro-Lamellor location hit with 1 crit — minimum 1 applies

- **GIVEN** a location with Ferro-Lamellor armor takes internal structure damage
- **WHEN** the critical hit determination roll indicates 1 critical hit (roll 8-9)
- **THEN** max(floor(1 / 2), 1) = 1 critical hit SHALL be applied
- **AND** the minimum-1 rule SHALL ensure at least one hit is applied

#### Scenario: Ferro-Lamellor location hit with 3 crits on torso — halved to 1

- **GIVEN** a torso location with Ferro-Lamellor armor takes internal structure damage
- **WHEN** the critical hit determination roll is 12 (3 crits on torso)
- **THEN** floor(3 / 2) = 1 critical hit SHALL be applied to components

#### Scenario: Ferro-Lamellor location — 0 crits remains 0

- **GIVEN** a location with Ferro-Lamellor armor takes internal structure damage
- **WHEN** the critical hit determination roll indicates 0 critical hits (roll 2-7)
- **THEN** 0 critical hits SHALL be applied
- **AND** halving SHALL NOT change a 0 result

#### Scenario: Non-Ferro-Lamellor location — damage unchanged

- **GIVEN** a location with any armor type other than Ferro-Lamellor
- **WHEN** the critical hit determination roll indicates N critical hits
- **THEN** N critical hits SHALL be applied without modification
- **AND** the standard critical hit resolution pipeline SHALL be used

#### Scenario: forceCrits override bypasses Ferro-Lamellor halving

- **GIVEN** the caller explicitly forces a crit count via `forceCrits`
- **WHEN** the location has Ferro-Lamellor armor
- **THEN** the forced crit count SHALL be applied directly
- **AND** the halving logic SHALL NOT be invoked

#### Scenario: Limb blowoff on roll of 12 is NOT affected by Ferro-Lamellor

- **GIVEN** a limb (arm or leg) with Ferro-Lamellor armor takes internal structure damage
- **WHEN** the critical hit determination roll is 12 (limb blown off)
- **THEN** the limb SHALL be blown off normally
- **AND** Ferro-Lamellor halving applies only to the crit count, not to limb blowoff mechanics

#### Scenario: Head destruction on roll of 12 is NOT affected by Ferro-Lamellor

- **GIVEN** the head with Ferro-Lamellor armor takes internal structure damage
- **WHEN** the critical hit determination roll is 12 (head destroyed)
- **THEN** the head SHALL be destroyed normally
- **AND** Ferro-Lamellor halving does not prevent head destruction

---

## Data Model Requirements

### Required Interfaces

The implementation MUST provide the following TypeScript function and enum extension:

```typescript
import { ArmorTypeEnum } from '@/types/construction/ArmorType';

/**
 * Check if an armor type uses Ferro-Lamellor rules (crit count halving).
 */
function isFerroLamellorArmor(armorType?: ArmorTypeEnum): boolean;

/**
 * Halve a critical hit count for Ferro-Lamellor armor.
 * Returns floor(critCount / 2) with a minimum of 1 (when critCount > 0).
 */
function halveCritCount(critCount: number): number;
```

### Required Properties

| Property    | Type            | Required | Description                    | Valid Values              | Default     |
| ----------- | --------------- | -------- | ------------------------------ | ------------------------- | ----------- |
| `armorType` | `ArmorTypeEnum` | No       | Armor type at the hit location | Any `ArmorTypeEnum` value | `undefined` |

### Enum Extension

```typescript
export enum ArmorTypeEnum {
  // ... existing values ...
  FERRO_LAMELLOR = 'Ferro-Lamellor',
}
```

### Type Constraints

- `ArmorTypeEnum.FERRO_LAMELLOR` MUST be added to the existing `ArmorTypeEnum`
- The `armorType` parameter on `resolveCriticalHits` is already optional — no signature change needed
- `isFerroLamellorArmor` MUST return `false` for `undefined` input
- `halveCritCount(0)` MUST return `0` (halving does not manufacture hits)

---

## Calculation Formulas

### Crit Count Halving

**Formula**:

```
if critCount === 0:
  effectiveCrits = 0
else:
  effectiveCrits = max(floor(critCount / 2), 1)
```

**Where**:

- `critCount` = number of critical hits from the determination roll

**Example**:

```
Input: critCount = 2
Calculation: max(floor(2 / 2), 1) = max(1, 1) = 1
Output: effectiveCrits = 1

Input: critCount = 3
Calculation: max(floor(3 / 2), 1) = max(1, 1) = 1
Output: effectiveCrits = 1

Input: critCount = 1
Calculation: max(floor(1 / 2), 1) = max(0, 1) = 1
Output: effectiveCrits = 1
```

**Special Cases**:

- When `forceCrits` is provided: bypass halving, use forceCrits directly
- Limb blowoff (roll 12 on arm/leg): unaffected by halving — the limb is still blown off
- Head destruction (roll 12 on head): unaffected by halving — the head is still destroyed

**Rounding Rules**:

- Always round down (floor) when halving

---

## Validation Rules

### Validation: Ferro-Lamellor Crit Count Halving Applied

**Rule**: When Ferro-Lamellor armor is detected and `forceCrits` is not provided, the effective crit count MUST be halved.

**Severity**: Error

**Condition**:

```typescript
if (
  isFerroLamellorArmor(armorType) &&
  forceCrits === undefined &&
  critCount > 0
) {
  critCount = Math.max(Math.floor(critCount / 2), 1);
}
```

**Error Message**: "Ferro-Lamellor armor requires crit count halving"

**User Action**: Internal validation — not user-facing

---

## Technology Base Variants

### Inner Sphere Implementation

Ferro-Lamellor armor is NOT available to Inner Sphere tech base.

### Clan Implementation

Ferro-Lamellor armor is a Clan technology (Experimental rules level).

- pointsPerTon: 17.6 (estimated — same efficiency as Light Ferro)
- criticalSlots: 12
- costMultiplier: 3.5
- techBase: Clan
- isSpecial: true

### Mixed Tech Rules

- A mixed-tech unit with Clan Ferro-Lamellor armor SHALL apply all Ferro-Lamellor combat rules
- The combat modifications apply regardless of the unit's base tech

---

## Dependencies

### Depends On

- **armor-system**: Defines `ArmorTypeEnum.FERRO_LAMELLOR` and Ferro-Lamellor armor properties
  <!-- source: src/types/construction/ArmorType.ts:15-25 -->
- **critical-hit-resolution**: Defines the base crit determination flow (`rollCriticalHits`, `resolveCriticalHits`)
  <!-- source: src/utils/gameplay/criticalHitResolution.ts:211-278,1026-1223 -->

### Used By

- **critical-hit-resolution**: Ferro-Lamellor rules modify crit count via `isFerroLamellorArmor()` guard and halving branch

### Construction Sequence

1. Unit construction selects Ferro-Lamellor armor type (armor-system)
2. During combat, damage resolution checks armor type at hit location
3. Standard damage application (no half-point tracking — unlike hardened armor)
4. If internal structure exposed: perform standard crit determination roll
5. If Ferro-Lamellor armor: halve the resulting crit count (floor, min 1) before applying

---

## Implementation Notes

### Performance Considerations

- The halving operation is a single Math.floor + Math.max — negligible performance impact
- No additional dice rolls required (unlike hardened armor's double-roll)

### Edge Cases

- **forceCrits override**: When `forceCrits` is provided, Ferro-Lamellor halving SHALL NOT apply (the caller is explicitly forcing a crit count)
- **Limb blowoff**: Roll of 12 on a limb still blows off the limb — halving only affects the `critCount` path, not `limbBlownOff`/`headDestroyed` flags
- **Head destruction**: Roll of 12 on head still destroys the head — same reasoning
- **Hardened + Ferro-Lamellor**: These armor types are mutually exclusive (a location has one armor type). No interaction case exists
- **TAC with Ferro-Lamellor**: TACs proceed normally — Ferro-Lamellor does NOT prevent TACs. However, if the TAC results in crits, those crits ARE halved because `resolveCriticalHits` is called with the armor type

### Common Pitfalls

- **Pitfall**: Applying halving when `forceCrits` is set
  - **Solution**: Check `forceCrits !== undefined` before entering halving branch
- **Pitfall**: Halving zero crits to get a negative or non-zero result
  - **Solution**: Only apply halving when `critCount > 0`
- **Pitfall**: Forgetting minimum-1 rule, causing 1 crit to become 0
  - **Solution**: Always apply `Math.max(halved, 1)` after `Math.floor`
- **Pitfall**: Applying halving to limb blowoff / head destruction paths
  - **Solution**: Halving only applies to the `critCount` variable, not to the `limbBlownOff` or `headDestroyed` flags

---

## Examples

### Example 1: 2 Crits Halved to 1

**Input**:

```typescript
const armorType = ArmorTypeEnum.FERRO_LAMELLOR;
// Determination roll: dice [5, 5] = 10 -> 2 crits
```

**Processing**:

```typescript
// Standard determination: 2 crits
// Ferro-Lamellor halving: max(floor(2 / 2), 1) = 1
const effectiveCrits = 1;
// Apply 1 critical hit to the location
```

**Output**:

```typescript
// result.hits.length === 1
// One critical slot selected and effect applied
```

### Example 2: 3 Crits (Torso Roll 12) Halved to 1

**Input**:

```typescript
const armorType = ArmorTypeEnum.FERRO_LAMELLOR;
// Determination roll: dice [6, 6] = 12 on torso -> 3 crits
```

**Processing**:

```typescript
// Standard determination: 3 crits
// Ferro-Lamellor halving: max(floor(3 / 2), 1) = 1
const effectiveCrits = 1;
```

**Output**:

```typescript
// result.hits.length === 1
// Only 1 critical hit applied instead of 3
```

### Example 3: 1 Crit — Minimum 1 Applies

**Input**:

```typescript
const armorType = ArmorTypeEnum.FERRO_LAMELLOR;
// Determination roll: dice [4, 4] = 8 -> 1 crit
```

**Processing**:

```typescript
// Standard determination: 1 crit
// Ferro-Lamellor halving: max(floor(1 / 2), 1) = max(0, 1) = 1
const effectiveCrits = 1;
```

**Output**:

```typescript
// result.hits.length === 1
// Minimum-1 rule ensures the hit still goes through
```

---

## References

### Official BattleTech Rules

- **Tactical Operations**: Pages 286-287 — Ferro-Lamellor Armor description, critical hit reduction rules
- **Total Warfare**: Page 136 — Critical hit determination procedure (base table)

### Related Documentation

- `openspec/specs/armor-system/spec.md` — Armor type definitions and construction properties
- `openspec/specs/critical-hit-resolution/spec.md` — Base critical hit determination flow and component effects
- `openspec/specs/hardened-armor-combat/spec.md` — Hardened armor combat rules (similar pattern, different mechanic)
- `src/utils/gameplay/criticalHitResolution.ts` — Implementation of crit resolution pipeline
- `src/types/construction/ArmorType.ts` — `ArmorTypeEnum` and `ARMOR_DEFINITIONS`

---

## Changelog

### Version 1.0 (2026-02-13)

- Initial specification covering crit count halving, minimum-1 rule, and integration with existing crit resolution pipeline
