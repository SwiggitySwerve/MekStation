# hardened-armor-combat Specification

## Purpose

Define the special combat mechanics for hardened armor that modify standard critical hit resolution. Hardened armor requires a double crit determination roll (both must indicate crits) and completely prevents through-armor critical hits (TAC).

## Non-Goals

- MP reduction for mechs with hardened armor (movement penalty) — future scope
- Half-point damage tracking for hardened armor — future scope
- Hardened armor construction rules (weight, slots, cost) — covered by `armor-system`
- Hardened armor BV multiplier — covered by `battle-value-system`
- Modification of the base crit determination table (2-7/8-9/10-11/12)
- Behavior changes for any other armor type

## Dependencies

### Depends On

- **armor-system**: Defines `ArmorTypeEnum.HARDENED` and hardened armor properties (type, pointsPerTon, criticalSlots)
  <!-- source: src/types/construction/ArmorType.ts:24 -->
- **critical-hit-resolution**: Defines the base crit determination flow (rollCriticalHits, resolveCriticalHits, processTAC)
  <!-- source: src/utils/gameplay/criticalHitResolution.ts:197-264,1012-1195,1233-1248 -->

### Used By

- **critical-hit-resolution**: Hardened armor rules modify crit determination behavior
- **battle-value-system**: Uses hardened armor BV multiplier (2.0×) for defensive BV calculation

## Requirements

### Requirement: Double Critical Hit Determination for Hardened Armor

When a location protected by hardened armor takes internal structure damage, the system SHALL roll the critical hit determination table TWICE. Both rolls MUST independently indicate critical hits for any criticals to actually occur.

<!-- source: src/utils/gameplay/criticalHitResolution.ts:197-264 — rollCriticalHits function -->
<!-- source: src/types/construction/ArmorType.ts:24 — ArmorTypeEnum.HARDENED -->

If either roll results in 0 critical hits (roll 2-7), the entire crit determination SHALL result in 0 critical hits regardless of the other roll.

When both rolls indicate critical hits, the number of criticals applied SHALL be the MINIMUM of the two rolls' crit counts.

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

#### Scenario: Both rolls positive on hardened armor

- **GIVEN** a location with hardened armor takes internal structure damage
- **WHEN** the first crit determination roll indicates 2 critical hits (roll 10-11)
- **AND** the second crit determination roll indicates 1 critical hit (roll 8-9)
- **THEN** 1 critical hit SHALL be applied (minimum of 2 and 1)

#### Scenario: Both rolls indicate maximum crits on hardened armor

- **GIVEN** a location with hardened armor takes internal structure damage on a torso
- **WHEN** the first crit determination roll is 12 (3 crits on torso)
- **AND** the second crit determination roll is 12 (3 crits on torso)
- **THEN** 3 critical hits SHALL be applied

#### Scenario: Roll of 12 limb blowoff with hardened armor

- **GIVEN** a location with hardened armor on an arm or leg takes internal structure damage
- **WHEN** the first crit determination roll is 12 (limb blown off)
- **AND** the second crit determination roll also indicates crits (8+)
- **THEN** the limb SHALL be blown off
- **AND** if the second roll does NOT indicate crits, the limb SHALL NOT be blown off

### Requirement: Through-Armor Critical Prevention for Hardened Armor

Hardened armor SHALL completely prevent through-armor critical hits (TAC). When a hit location roll of 2 occurs against a unit with hardened armor at the TAC-eligible location, the TAC SHALL be skipped entirely.

<!-- source: src/utils/gameplay/criticalHitResolution.ts:1208-1248 — checkTACTrigger and processTAC -->
<!-- source: src/types/construction/ArmorType.ts:140-149 — HARDENED definition -->

**Rationale**: Hardened armor's dense composition prevents damage from penetrating through intact armor to reach internal components.

**Priority**: Critical

#### Scenario: TAC prevented by hardened armor

- **GIVEN** a unit with hardened armor on the center torso
- **WHEN** a hit location roll of 2 occurs from the front arc
- **THEN** the through-armor critical check SHALL be skipped
- **AND** no critical hit determination roll SHALL be made for the TAC

#### Scenario: TAC still occurs on non-hardened armor

- **GIVEN** a unit with standard armor on the center torso
- **WHEN** a hit location roll of 2 occurs from the front arc
- **THEN** the through-armor critical check SHALL proceed normally
- **AND** a critical hit determination roll SHALL be made

### Requirement: Armor Type Context for Critical Resolution

The critical hit resolution functions SHALL accept an optional armor type parameter to determine whether hardened armor rules apply at the hit location.

<!-- source: src/utils/gameplay/criticalHitResolution.ts:1012-1019 — resolveCriticalHits signature -->
<!-- source: src/utils/gameplay/criticalHitResolution.ts:1233-1248 — processTAC signature -->

The armor type SHALL be provided per-location, as mixed configurations could theoretically exist.

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

## Data Model Requirements

### Required Interface Extensions

The implementation MUST extend the existing critical hit resolution functions with armor type awareness:

```typescript
import { ArmorTypeEnum } from '@/types/construction/ArmorType';

/**
 * Check if an armor type uses hardened armor rules.
 */
function isHardenedArmor(armorType?: ArmorTypeEnum): boolean;

/**
 * Extended resolveCriticalHits with armor type parameter.
 * @param armorType - Armor type at the hit location (optional, defaults to standard behavior)
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
 * Extended processTAC with armor type parameter.
 * Returns early with no crits if armor is hardened.
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

## Implementation Notes

### Performance Considerations

- The double-roll mechanic adds at most one additional 2d6 roll per crit determination — negligible performance impact

### Edge Cases

- **forceCrits override**: When `forceCrits` is provided, hardened armor double-roll logic SHALL NOT apply (the caller is explicitly forcing a crit count)
- **Mixed armor scenarios**: If a unit has different armor types per location (not currently supported but defensive coding), the armor type check is per-call
- **Roll of 12 on limbs**: Both rolls must produce the limb-blowoff result; if only one does, the result degrades to the minimum crit count interpretation

### Common Pitfalls

- **Pitfall**: Applying hardened armor rules when `forceCrits` is set
  - **Solution**: Skip hardened armor logic when `forceCrits !== undefined`
- **Pitfall**: Forgetting to pass armor type from the calling code in `gameSession.ts`
  - **Solution**: Default to standard behavior when armor type is not provided (backward compatible)

## References

### Official BattleTech Rules

- **TechManual**: Pages 205-206 — Hardened Armor description and combat effects
- **Total Warfare**: Page 136 — Critical hit determination procedure

### Related Specifications

- `openspec/specs/armor-system/spec.md` — Hardened armor type definition (8 pts/ton, 0 crit slots)
- `openspec/specs/critical-hit-resolution/spec.md` — Base critical hit determination flow
- `openspec/specs/battle-value-system/` — Hardened armor BV multiplier (2.0×)
