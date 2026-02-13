# hardened-armor-combat Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2026-02-13
**Dependencies**: armor-system, critical-hit-resolution
**Affects**: critical-hit-resolution, battle-value-system, movement-system

---

## Overview

### Purpose

Define the special combat mechanics for hardened armor that modify standard critical hit resolution, through-armor critical processing, movement penalties, and damage tracking. Hardened armor is a dense, heavy armor type that trades weight efficiency (8 pts/ton vs standard 16 pts/ton) for significantly improved critical hit resistance and TAC immunity.

### Scope

**In Scope:**

- Double critical hit determination roll mechanic
- Through-armor critical (TAC) prevention
- Walking MP reduction for mechs equipped with hardened armor
- Half-point damage tracking for hardened armor
- Armor type context threading to critical hit resolution functions

**Out of Scope:**

- Hardened armor construction rules (weight, slots, cost) — covered by `armor-system`
- Hardened armor BV multiplier calculation — covered by `battle-value-system`
- Modification of the base crit determination table (2-7/8-9/10-11/12)
- Behavior changes for any other armor type (standard, ferro-fibrous, reactive, etc.)
- Hardened armor availability by era/tech base — covered by `armor-system`

### Key Concepts

- **Double Crit Roll**: When hardened armor is present, two independent crit determination rolls are made; both must indicate crits for any to occur
- **TAC Prevention**: Hardened armor completely blocks through-armor critical hits regardless of the hit location roll
- **MP Reduction**: Mechs with hardened armor suffer -1 walking MP due to the armor's weight and rigidity
- **Half-Point Tracking**: Hardened armor absorbs damage in half-point increments; each point of weapon damage removes only 0.5 armor points

---

## Requirements

### Requirement: Double Critical Hit Determination for Hardened Armor

When a location protected by hardened armor takes internal structure damage, the system SHALL roll the critical hit determination table TWICE. Both rolls MUST independently indicate critical hits for any criticals to actually occur.

<!-- source: src/utils/gameplay/criticalHitResolution.ts:1041-1054 — hardened armor double-roll branch -->
<!-- source: src/utils/gameplay/criticalHitResolution.ts:199-201 — isHardenedArmor function -->
<!-- source: src/types/construction/ArmorType.ts:24 — ArmorTypeEnum.HARDENED -->

If either roll results in 0 critical hits (roll 2-7), the entire crit determination SHALL result in 0 critical hits regardless of the other roll.

When both rolls indicate critical hits, the number of criticals applied SHALL be the MINIMUM of the two rolls' crit counts.

The base crit determination table (2-7: 0 crits, 8-9: 1 crit, 10-11: 2 crits, 12: location-dependent) SHALL NOT be modified. Only the number of times the table is consulted changes.

**Rationale**: Hardened armor's double crit roll is the primary combat advantage justifying its 8 points-per-ton ratio (half of standard armor). This makes critical hits significantly less likely.

**Priority**: Critical

#### Scenario: Normal hit on standard armor unchanged

- **GIVEN** a location with standard armor takes internal structure damage
- **WHEN** the system performs critical hit determination
- **THEN** only ONE crit determination roll SHALL be made
- **AND** the standard crit table SHALL apply (2-7: 0, 8-9: 1, 10-11: 2, 12: location-dependent)

#### Scenario: Single positive roll on hardened armor negated

- **GIVEN** a location with hardened armor takes internal structure damage
- **WHEN** the first crit determination roll indicates 1 critical hit (roll 8-9)
- **AND** the second crit determination roll indicates 0 critical hits (roll 2-7)
- **THEN** 0 critical hits SHALL be applied
- **AND** the hardened armor SHALL have prevented the critical hit

#### Scenario: Both rolls positive on hardened armor uses minimum

- **GIVEN** a location with hardened armor takes internal structure damage
- **WHEN** the first crit determination roll indicates 2 critical hits (roll 10-11)
- **AND** the second crit determination roll indicates 1 critical hit (roll 8-9)
- **THEN** 1 critical hit SHALL be applied (minimum of 2 and 1)

#### Scenario: Both rolls indicate maximum crits on hardened armor torso

- **GIVEN** a location with hardened armor on a torso takes internal structure damage
- **WHEN** the first crit determination roll is 12 (3 crits on torso)
- **AND** the second crit determination roll is 12 (3 crits on torso)
- **THEN** 3 critical hits SHALL be applied

#### Scenario: Roll of 12 limb blowoff requires both rolls on hardened armor

- **GIVEN** a limb (arm or leg) with hardened armor takes internal structure damage
- **WHEN** the first crit determination roll is 12 (limb blown off)
- **AND** the second crit determination roll is 12 (limb blown off)
- **THEN** the limb SHALL be blown off
- **AND** if either roll does NOT indicate limb blowoff, the limb SHALL NOT be blown off

#### Scenario: First negative roll negates second positive on hardened armor

- **GIVEN** a location with hardened armor takes internal structure damage
- **WHEN** the first crit determination roll indicates 0 critical hits (roll 2-7)
- **AND** the second crit determination roll indicates 2 critical hits (roll 10-11)
- **THEN** 0 critical hits SHALL be applied

#### Scenario: forceCrits override bypasses hardened armor double-roll

- **GIVEN** the caller explicitly forces a crit count via `forceCrits`
- **WHEN** the location has hardened armor
- **THEN** the forced crit count SHALL be applied directly
- **AND** the double-roll logic SHALL NOT be invoked

### Requirement: Through-Armor Critical Prevention for Hardened Armor

Hardened armor SHALL completely prevent through-armor critical hits (TAC). When a hit location roll of 2 occurs against a unit with hardened armor at the TAC-eligible location, the TAC SHALL be skipped entirely.

<!-- source: src/utils/gameplay/criticalHitResolution.ts:1264-1276 — processTAC hardened armor early return -->
<!-- source: src/utils/gameplay/criticalHitResolution.ts:1236-1255 — checkTACTrigger function -->

The `processTAC` function SHALL return an empty result (no hits, no events, no destruction) when the armor type is hardened.

**Rationale**: Hardened armor's dense composition prevents damage from penetrating through intact armor to reach internal components.

**Priority**: Critical

#### Scenario: TAC prevented by hardened armor

- **GIVEN** a unit with hardened armor on the center torso
- **WHEN** a hit location roll of 2 occurs from the front arc
- **THEN** the through-armor critical check SHALL be skipped
- **AND** no critical hit determination roll SHALL be made for the TAC
- **AND** the returned result SHALL contain 0 hits and 0 events

#### Scenario: TAC still occurs on standard armor

- **GIVEN** a unit with standard armor on the center torso
- **WHEN** a hit location roll of 2 occurs from the front arc
- **THEN** the through-armor critical check SHALL proceed normally
- **AND** a critical hit determination roll SHALL be made

#### Scenario: TAC processing without armor type defaults to standard

- **GIVEN** the calling code does not specify an armor type
- **WHEN** a TAC is triggered
- **THEN** the system SHALL process the TAC as if the armor is standard (backward compatible)

### Requirement: Walking MP Reduction for Hardened Armor

A mech equipped with hardened armor SHALL suffer a -1 walking MP penalty. This penalty SHALL apply to the mech's base walking MP calculation.

<!-- source: TechManual p.205 — Hardened Armor movement penalty -->

The MP reduction SHALL be applied after the base walk MP is calculated from engine rating and tonnage. Running MP SHALL be recalculated from the reduced walking MP.

**Rationale**: Hardened armor's extreme density and rigidity restrict the mech's mobility.

**Priority**: High

#### Scenario: Walking MP reduced by 1

- **GIVEN** a mech with hardened armor and base walking MP of 4
- **WHEN** calculating final walking MP
- **THEN** walking MP SHALL be 3 (4 - 1)

#### Scenario: Running MP recalculated from reduced walking MP

- **GIVEN** a mech with hardened armor and base walking MP of 4 (reduced to 3)
- **WHEN** calculating running MP
- **THEN** running MP SHALL be floor(3 × 1.5) = 4

#### Scenario: Minimum walking MP with hardened armor

- **GIVEN** a mech with hardened armor and base walking MP of 1
- **WHEN** calculating final walking MP
- **THEN** walking MP SHALL be 0 (1 - 1)
- **AND** the mech SHALL be unable to walk but MAY still jump if equipped with jump jets

### Requirement: Half-Point Damage Tracking for Hardened Armor

Each point of damage applied to a location protected by hardened armor SHALL remove only 0.5 armor points. The system SHALL track half-point armor values for hardened armor locations.

<!-- source: TechManual p.205 — Hardened Armor damage absorption -->
<!-- source: src/types/construction/ArmorType.ts:144 — pointsPerTon: 8 (already accounts for half efficiency) -->

When damage reduces armor to a fractional value, the remaining fraction SHALL be retained (not rounded). A location's armor is breached only when it reaches exactly 0.

**Rationale**: Hardened armor's 8 points-per-ton ratio already encodes this — each "point" of hardened armor absorbs 2 points of damage. The half-point tracking is the per-hit resolution of this property.

**Priority**: High

#### Scenario: Single point of damage to hardened armor

- **GIVEN** a location with 10 points of hardened armor
- **WHEN** 1 point of weapon damage is applied
- **THEN** remaining armor SHALL be 9.5

#### Scenario: Two points of damage to hardened armor

- **GIVEN** a location with 10 points of hardened armor
- **WHEN** 2 points of weapon damage are applied
- **THEN** remaining armor SHALL be 9.0

#### Scenario: Armor breach with hardened armor

- **GIVEN** a location with 0.5 points of hardened armor remaining
- **WHEN** 1 point of weapon damage is applied
- **THEN** armor SHALL be reduced to 0
- **AND** remaining 0.5 points of damage SHALL transfer to internal structure

### Requirement: Armor Type Context for Critical Resolution

The critical hit resolution functions SHALL accept an optional armor type parameter to determine whether hardened armor rules apply at the hit location.

<!-- source: src/utils/gameplay/criticalHitResolution.ts:1026-1034 — resolveCriticalHits signature with armorType -->
<!-- source: src/utils/gameplay/criticalHitResolution.ts:1257-1263 — processTAC signature with armorType -->

When the armor type parameter is not provided, the functions SHALL default to standard (non-hardened) behavior to maintain backward compatibility.

**Priority**: High

#### Scenario: Armor type passed to crit resolution

- **GIVEN** the combat resolution system processes structure damage at a location
- **WHEN** calling `resolveCriticalHits` for a location with hardened armor
- **THEN** the `armorType` parameter SHALL be set to `ArmorTypeEnum.HARDENED`
- **AND** the double-roll logic SHALL be applied

#### Scenario: Armor type defaults to non-hardened

- **GIVEN** the combat resolution system processes structure damage
- **WHEN** calling `resolveCriticalHits` without specifying an armor type
- **THEN** the system SHALL default to standard (non-hardened) behavior
- **AND** only ONE crit determination roll SHALL be made

---

## Data Model Requirements

### Required Interfaces

The implementation MUST provide the following TypeScript functions and type extensions:

```typescript
import { ArmorTypeEnum } from '@/types/construction/ArmorType';

/**
 * Check if an armor type uses hardened armor rules (double crit roll, TAC prevention).
 */
function isHardenedArmor(armorType?: ArmorTypeEnum): boolean;

/**
 * Resolve critical hits with optional armor type awareness.
 * When armorType is ArmorTypeEnum.HARDENED, applies double-roll logic.
 */
function resolveCriticalHits(
  unitId: string,
  location: CombatLocation,
  manifest: CriticalSlotManifest,
  componentDamage: IComponentDamageState,
  diceRoller: D6Roller,
  forceCrits?: number,
  armorType?: ArmorTypeEnum,
): ICriticalResolutionResult;

/**
 * Process through-armor critical with optional armor type awareness.
 * Returns empty result when armor is hardened.
 */
function processTAC(
  unitId: string,
  tacLocation: CombatLocation,
  manifest: CriticalSlotManifest,
  componentDamage: IComponentDamageState,
  diceRoller: D6Roller,
  armorType?: ArmorTypeEnum,
): ICriticalResolutionResult;
```

### Required Properties

| Property    | Type            | Required | Description                    | Valid Values              | Default     |
| ----------- | --------------- | -------- | ------------------------------ | ------------------------- | ----------- |
| `armorType` | `ArmorTypeEnum` | No       | Armor type at the hit location | Any `ArmorTypeEnum` value | `undefined` |

### Type Constraints

- `armorType` MUST be optional to maintain backward compatibility
- When `armorType` is `undefined`, behavior MUST match pre-hardened-armor behavior exactly
- `isHardenedArmor` MUST return `false` for `undefined` input

---

## Calculation Formulas

### Double Roll Crit Count

**Formula**:

```
if roll1.criticalHits === 0 OR roll2.criticalHits === 0:
  effectiveCrits = 0
else:
  effectiveCrits = min(roll1.criticalHits, roll2.criticalHits)
```

**Where**:

- `roll1` = first independent 2d6 critical hit determination roll
- `roll2` = second independent 2d6 critical hit determination roll

**Example**:

```
Input: roll1 = 10 (2 crits), roll2 = 8 (1 crit)
Calculation: both > 0, min(2, 1) = 1
Output: effectiveCrits = 1
```

**Special Cases**:

- When `forceCrits` is provided: bypass double-roll, use forceCrits directly
- Limb blowoff (roll 12 on arm/leg): both rolls must independently produce limb blowoff
- Head destruction (roll 12 on head): both rolls must independently produce head destruction

### Half-Point Damage Absorption

**Formula**:

```
armorRemoved = weaponDamage * 0.5
remainingArmor = currentArmor - armorRemoved
```

**Where**:

- `weaponDamage` = incoming weapon damage points
- `currentArmor` = current armor points at the location

**Example**:

```
Input: weaponDamage = 5, currentArmor = 10
Calculation: armorRemoved = 5 * 0.5 = 2.5
Output: remainingArmor = 7.5
```

**Rounding Rules**:

- No rounding — fractional armor values SHALL be tracked exactly

### Walking MP Reduction

**Formula**:

```
finalWalkMP = baseWalkMP - 1
finalRunMP = floor(finalWalkMP * 1.5)
```

**Where**:

- `baseWalkMP` = walk MP from engine rating / tonnage calculation

**Example**:

```
Input: baseWalkMP = 4
Calculation: finalWalkMP = 4 - 1 = 3, finalRunMP = floor(3 * 1.5) = 4
Output: walkMP = 3, runMP = 4
```

---

## Validation Rules

### Validation: Hardened Armor Crit Roll Count

**Rule**: When hardened armor is detected, exactly two crit determination rolls MUST be made (unless forceCrits is provided).

**Severity**: Error

**Condition**:

```typescript
if (isHardenedArmor(armorType) && forceCrits === undefined) {
  // Must make two rolls
  const roll1 = rollCriticalHits(location, diceRoller);
  const roll2 = rollCriticalHits(location, diceRoller);
  // Both must independently indicate crits
}
```

**Error Message**: "Hardened armor requires double crit determination roll"

**User Action**: Internal validation — not user-facing

---

## Technology Base Variants

### Inner Sphere Implementation

Hardened armor is an Inner Sphere technology (introduced 3047, Experimental rules level).

- pointsPerTon: 8
- criticalSlots: 0
- costMultiplier: 2.5
- techBase: Inner Sphere

### Clan Implementation

Hardened armor is NOT available to Clan tech base.

### Mixed Tech Rules

- A mixed-tech unit with Inner Sphere hardened armor SHALL apply all hardened armor combat rules
- The hardened armor combat modifications apply regardless of the unit's base tech

---

## Dependencies

### Depends On

- **armor-system**: Defines `ArmorTypeEnum.HARDENED` and hardened armor properties (type: 'Hardened', pointsPerTon: 8, criticalSlots: 0, isSpecial: true)
  <!-- source: src/types/construction/ArmorType.ts:24,140-149 -->
- **critical-hit-resolution**: Defines the base crit determination flow (`rollCriticalHits`, `resolveCriticalHits`, `processTAC`, `checkTACTrigger`)
  <!-- source: src/utils/gameplay/criticalHitResolution.ts:211-278,1026-1223,1236-1285 -->

### Used By

- **critical-hit-resolution**: Hardened armor rules modify crit determination behavior via `isHardenedArmor()` guard and double-roll branch
- **movement-system**: Walking MP reduction (-1) when hardened armor is equipped
- **battle-value-system**: Hardened armor defensive BV multiplier

### Construction Sequence

1. Unit construction selects hardened armor type (armor-system)
2. During combat, damage resolution checks armor type at hit location
3. If hardened armor: apply half-point damage absorption
4. If internal structure exposed: apply double crit roll determination
5. If TAC triggered: skip TAC processing entirely

---

## Implementation Notes

### Performance Considerations

- The double-roll mechanic adds at most one additional 2d6 roll per crit determination — negligible performance impact
- Half-point tracking requires storing fractional armor values; use number type (not integer)

### Edge Cases

- **forceCrits override**: When `forceCrits` is provided, hardened armor double-roll logic SHALL NOT apply (the caller is explicitly forcing a crit count)
- **Mixed armor scenarios**: If a unit has different armor types per location (not currently supported but defensive coding), the armor type check is per-call
- **Roll of 12 on limbs**: Both rolls must produce the limb-blowoff result; if only one does, the result degrades to the minimum crit count interpretation (which is 0 since limb-blowoff produces criticalHits=0)
- **Zero walk MP**: If base walk MP is 1 and hardened armor reduces it to 0, the mech cannot walk but can still jump
- **Fractional armor at 0.5**: A single point of damage to 0.5 armor removes the armor (0.5 - 0.5 = 0) and transfers 0.5 damage to structure

### Common Pitfalls

- **Pitfall**: Applying hardened armor rules when `forceCrits` is set
  - **Solution**: Check `forceCrits !== undefined` before entering double-roll branch
- **Pitfall**: Forgetting to pass armor type from the calling code
  - **Solution**: Default to standard behavior when armor type is not provided (backward compatible)
- **Pitfall**: Rounding fractional armor values
  - **Solution**: Never round hardened armor — track exact fractional values
- **Pitfall**: Applying MP reduction multiple times
  - **Solution**: Apply -1 MP reduction exactly once during movement calculation

---

## Examples

### Example 1: Double Roll — Both Positive

**Input**:

```typescript
const armorType = ArmorTypeEnum.HARDENED;
// Roll 1: dice [5, 5] = 10 -> 2 crits
// Roll 2: dice [4, 4] = 8  -> 1 crit
```

**Processing**:

```typescript
// Both rolls > 0, take minimum
const effectiveCrits = Math.min(2, 1); // = 1
// Apply 1 critical hit to the location
```

**Output**:

```typescript
// result.hits.length === 1
// One critical slot selected and effect applied
```

### Example 2: Double Roll — One Negative

**Input**:

```typescript
const armorType = ArmorTypeEnum.HARDENED;
// Roll 1: dice [4, 4] = 8 -> 1 crit
// Roll 2: dice [1, 3] = 4 -> 0 crits
```

**Processing**:

```typescript
// Roll 2 is 0, so result is 0
const effectiveCrits = 0;
```

**Output**:

```typescript
// result.hits.length === 0
// No critical hits applied — hardened armor prevented them
```

### Example 3: TAC Prevention

**Input**:

```typescript
const armorType = ArmorTypeEnum.HARDENED;
const hitLocationRoll = 2; // TAC trigger
```

**Processing**:

```typescript
// processTAC checks isHardenedArmor -> true
// Returns immediately with empty result
```

**Output**:

```typescript
// result.hits === []
// result.events === []
// result.unitDestroyed === false
```

---

## References

### Official BattleTech Rules

- **TechManual**: Pages 205-206 — Hardened Armor description, combat effects, MP reduction, damage absorption
- **Total Warfare**: Page 136 — Critical hit determination procedure (base table)
- **Tactical Operations**: Pages 283-284 — Additional hardened armor clarifications

### Related Documentation

- `openspec/specs/armor-system/spec.md` — Hardened armor type definition (8 pts/ton, 0 crit slots, IS only)
- `openspec/specs/critical-hit-resolution/spec.md` — Base critical hit determination flow and component effects
- `src/utils/gameplay/criticalHitResolution.ts` — Implementation of double-roll and TAC prevention
- `src/types/construction/ArmorType.ts` — `ArmorTypeEnum.HARDENED` and `ARMOR_DEFINITIONS`

---

## Changelog

### Version 1.0 (2026-02-13)

- Initial specification covering double crit roll, TAC prevention, MP reduction, half-point damage tracking, and armor type context threading
