# Combat System Cleanup — Learnings

## Task 1: DiceRoller Type Deduplication (2026-02-12)

### Patterns Discovered

- `isolatedModules` is enabled — re-exports of types must use `export { type X }` syntax
- Barrel `index.ts` does `export *` from both hitLocation and specialWeaponMechanics — both re-exporting DiceRoller from same source works without conflict
- `DiceRoller` type uses `readonly number[]` for dice (not `[number, number]` as task description suggested)
- `defaultD6Roller` was NOT exported from hitLocation.ts originally (only `const`, not `export const`) — diceTypes.ts exports it explicitly
- `balance.test.ts` is a known flaky test — random BV generation sometimes falls short

### Approach That Worked

- Create new canonical file -> re-export from original locations -> zero import changes needed in consumers
- `import { type X } from './diceTypes'` + `export { type X } from './diceTypes'` pattern for backward compat
- All 19,145 tests pass, zero TSC errors

### Files Changed

- **Created**: `src/utils/gameplay/diceTypes.ts` (single source of truth)
- **Modified**: `src/utils/gameplay/hitLocation.ts` (removed definitions, added re-exports)
- **Modified**: `src/utils/gameplay/gameSession.ts` (removed DiceRoller definition, added import+re-export)
- **Modified**: `src/utils/gameplay/specialWeaponMechanics.ts` (removed DiceRoller definition, added import+re-export)

## Task 2: Fix Unsafe D6Roller Type Casts

**Status**: ✅ COMPLETED

### Changes Made

- **File**: `src/utils/gameplay/pilotingSkillRolls.ts`
- **Lines Fixed**: 132 (was 131), 172 (was 171)
- **Pattern**: Replaced `undefined as unknown as D6Roller` with `defaultD6Roller`
- **Import Added**: `import { defaultD6Roller } from './diceTypes';`

### Key Insight

The unsafe double-cast pattern (`undefined as unknown as D6Roller`) was a TypeScript workaround that bypassed type safety. At runtime, calling these functions without the optional parameter would pass `undefined` to `roll2d6()`, which would then crash when trying to call it as a function.

By using `defaultD6Roller` as the default parameter value, we:

1. Maintain type safety (no casts needed)
2. Provide a working default implementation
3. Enable deterministic testing via dependency injection
4. Follow the same pattern already established in `diceTypes.ts` for `rollD6()` and `roll2d6()`

### Verification Results

- ✅ No remaining `undefined as unknown as` casts in `src/utils/gameplay/`
- ✅ All 64 PSR tests pass
- ✅ TypeScript type checking passes (zero errors)

### Pattern Reference

Both `resolvePSR()` and `resolveAllPSRs()` now follow the same safe default pattern:

```typescript
diceRoller: D6Roller = defaultD6Roller;
```

This matches the pattern in `diceTypes.ts`:

```typescript
export function rollD6(roller: D6Roller = defaultD6Roller): number;
export function roll2d6(roller: D6Roller = defaultD6Roller): IDiceRoll;
```

### Dependencies

- Depends on Task 1 (diceTypes.ts exports defaultD6Roller)
- Blocks Task 10 (final verification)

## Task 2: Replace Math.random() in roll2d6 (2026-02-12)

### Implementation

- Modified `gameSession.ts:299-301` to accept optional `D6Roller` parameter
- Function signature: `export function roll2d6(roller: D6Roller = defaultD6Roller): number`
- Body simplified: `return roller() + roller()` (replaces two `Math.floor(Math.random() * 6) + 1` calls)
- Imported `D6Roller` and `defaultD6Roller` from `diceTypes.ts`

### Verification

- ✅ No Math.random() in gameSession.ts (grep confirmed)
- ✅ All 110 gameSession tests pass
- ✅ Zero TypeScript errors
- ✅ Callers at lines 314-315 work without modification (optional parameter with default)

### Pattern Consistency

- Follows same injectable pattern as `hitLocation.ts:roll2d6()`
- `defaultD6Roller` from `diceTypes.ts` provides production behavior
- Enables deterministic testing by injecting mock rollers

## Task 3: Standardize DI Parameter Naming (2026-02-12)

**Status**: ✅ COMPLETED

### Changes Made

Renamed all `roller` parameters to `diceRoller` for consistency across gameplay modules:

**Files Modified**:

1. **diceTypes.ts**
   - `rollD6(roller: D6Roller)` → `rollD6(diceRoller: D6Roller)` (line 43)
   - `roll2d6(roller: D6Roller)` → `roll2d6(diceRoller: D6Roller)` (line 50)
   - Updated all usages within function bodies

2. **gameSession.ts**
   - `roll2d6(roller: D6Roller)` → `roll2d6(diceRoller: D6Roller)` (line 299)
   - Updated function body: `return diceRoller() + diceRoller()`

3. **hitLocation.ts**
   - `determineHitLocation(roller: D6Roller)` → `determineHitLocation(diceRoller: D6Roller)` (line 144)
   - `determinePunchLocation(roller: D6Roller)` → `determinePunchLocation(diceRoller: D6Roller)` (line 231)
   - `determineKickLocation(roller: D6Roller)` → `determineKickLocation(diceRoller: D6Roller)` (line 245)
   - `distributeClusterHits(roller: D6Roller)` → `distributeClusterHits(diceRoller: D6Roller)` (line 268)
   - Updated all usages within function bodies

### Verification Results

- ✅ `grep -rn "roller:" src/utils/gameplay/ --include="*.ts" | grep -v diceRoller | grep -v ".test."` returns zero results
- ✅ TypeScript compilation: zero errors (`npx tsc --noEmit`)
- ✅ hitLocation tests: 64 pass
- ✅ gameSession tests: 110 pass
- ✅ All parameter usages updated consistently

### Pattern Consistency

All DI parameters now follow the `diceRoller` naming convention:

- Matches existing usage in: `ammoTracking.ts`, `criticalHitResolution.ts`, `physicalAttacks.ts`, `pilotingSkillRolls.ts`, `specialWeaponMechanics.ts`
- Provides clear semantic meaning: "dice roller" vs generic "roller"
- Enables easy grep/search for all DI injection points

### Dependencies

- Depends on Task 1 (diceTypes.ts exists with functions to rename)
- Depends on Task 2 (pilotingSkillRolls already uses `diceRoller`)
- Blocks Task 10 (final verification)

## Event Reducer Exhaustiveness (Task 9)

### Investigation Findings

**FacingChanged Event:**

- Enum member exists but never emitted anywhere in codebase
- No payload interface defined in GameSessionInterfaces.ts
- Facing is updated via `MovementDeclared` event (includes `facing` field)
- **Decision:** Mark as legacy/unused info-only event

**AmmoExplosion Event:**

- Enum member exists, used in KeyMomentDetector for UI/logging
- No payload interface in GameSessionInterfaces.ts (only local definition in KeyMomentDetector)
- Damage is applied via separate `DamageApplied` events (see gameSession.ts:1355, 1386)
- **Decision:** Mark as info-only event for logging purposes

### Implementation

Added explicit `case` entries for 8 unhandled event types:

1. `TurnEnded` - bookkeeping event, turn tracked in event base
2. `InitiativeOrderSet` - order set via InitiativeRolled handler
3. `AttacksRevealed` - simultaneous resolution marker
4. `AttackResolved` - damage applied via DamageApplied events
5. `HeatEffectApplied` - heat tracked via HeatGenerated/HeatDissipated
6. `CriticalHit` - legacy event, actual handling via CriticalHitResolved
7. `FacingChanged` - legacy/unused, facing updated via MovementDeclared
8. `AmmoExplosion` - info-only, damage applied via DamageApplied events

### Pattern: Info-Only Events in Event-Sourced Architecture

Many events are intentionally info-only (no state mutation):

- **Bookkeeping events:** TurnEnded (turn number in event base)
- **Redundant events:** InitiativeOrderSet (already handled by InitiativeRolled)
- **Marker events:** AttacksRevealed (phase transition marker)
- **Decomposed events:** AttackResolved, AmmoExplosion (state changes via other events)
- **Legacy events:** CriticalHit, FacingChanged (superseded by newer events)

**Key insight:** In event-sourced systems, not all events need to mutate state. Some exist purely for:

- UI/logging purposes
- Audit trail completeness
- Phase transition markers
- Backward compatibility

### Verification

- All 41 gameState tests pass
- TypeScript compilation clean (zero errors)
- Switch statement now exhaustive (every enum member has explicit case)

## Task 6: Extract Magic Numbers to Named Constants (2026-02-12)

**Status**: ✅ COMPLETED

### Implementation Summary

Extracted 50+ magic numbers to named constants across 6 modules:

**Files Modified**:

1. **criticalHitResolution.ts** — 14 constants (engine, gyro, pilot, actuator modifiers)
2. **physicalAttacks.ts** — 23 constants (damage divisors, to-hit modifiers, weapon bonuses)
3. **ammoTracking.ts** — 10 constants (heat thresholds, explosion damage, CASE protection)
4. **environmentalModifiers.ts** — No changes needed (already had constants)
5. **electronicWarfare.ts** — Already complete (ECM_RADIUS, BAP ranges, stealth modifiers)
6. **SimulationRunner.ts** — 20 constants (simulation defaults, heat values, weapon stats)

### Constant Naming Patterns

- **Thresholds**: `ENGINE_DESTRUCTION_THRESHOLD`, `GYRO_CANNOT_STAND_THRESHOLD`, `HEAT_AUTO_EXPLOSION_THRESHOLD`
- **Divisors**: `PUNCH_DAMAGE_DIVISOR`, `KICK_DAMAGE_DIVISOR`, `CHARGE_DAMAGE_DIVISOR`
- **Modifiers**: `GYRO_PSR_MODIFIER_PER_HIT`, `UPPER_ARM_PUNCH_MODIFIER`, `KICK_TO_HIT_BONUS`
- **Defaults**: `DEFAULT_TONNAGE`, `DEFAULT_PILOTING`, `DEFAULT_GUNNERY`
- **Ranges**: `BAP_ECM_COUNTER_RANGE`, `MEDIUM_LASER_SHORT_RANGE`

### Key Insights

- **Per-module constants** (not god-file) — each module owns its domain constants
- **Descriptive names** — `GYRO_DESTRUCTION_THRESHOLD` is clearer than `GYRO_HITS_MAX`
- **Sentinel values documented** — `CANNOT_STAND_PENALTY = 999` with comment explaining intent
- **Heat thresholds grouped** — `HEAT_EXPLOSION_TN4_THRESHOLD`, `HEAT_EXPLOSION_TN6_THRESHOLD`, etc.

### Verification Results

- ✅ TypeScript compilation: zero errors
- ✅ All 236 tests pass (criticalHitResolution, physicalAttacks, ammoTracking)
- ✅ Build succeeds (Next.js production build completed)
- ✅ No numeric value changes (tests prove behavior unchanged)

### Pattern Reference

```typescript
// BEFORE:
if (gyroHits >= 2) {
  movementPenalty = 999; // cannot stand
}

// AFTER:
const GYRO_CANNOT_STAND_THRESHOLD = 2;
const CANNOT_STAND_PENALTY = 999;
if (gyroHits >= GYRO_CANNOT_STAND_THRESHOLD) {
  movementPenalty = CANNOT_STAND_PENALTY;
}
```

### Commit

- **Hash**: dbcc9cf4
- **Message**: `refactor(gameplay): extract magic numbers to named constants across combat modules`
- **Files**: 5 (criticalHitResolution, physicalAttacks, ammoTracking, environmentalModifiers, SimulationRunner)

## Task 6 (Re-run): Magic Number Extraction — Additional Constants (2026-02-12)

Re-executed magic number extraction after codebase changes. Found and extracted additional constants:

- **environmentalModifiers.ts**: Added 4 new constants (atmosphere/temperature heat modifiers)
- **SimulationRunner.ts**: Added 15 new constants (weapon stats, heat values, damage thresholds)
- **electronicWarfare.ts**: Already complete — no changes needed

### Key Finding

Full test suite times out with bun test (>5 minutes). Targeted module tests (676 tests/24 files) complete in 1.57s. Use targeted runs for verification.

## Task 4: Complete Barrel Exports in index.ts (2026-02-12)

**Status**: ✅ COMPLETED

### Implementation Summary

Added 15 missing gameplay modules to `src/utils/gameplay/index.ts` barrel exports:

**Modules Added**:

1. `diceTypes` - Dice rolling utilities (D6Roller, DiceRoller, defaultD6Roller, rollD6, roll2d6)
2. `ammoTracking` - Ammunition management and explosions (20 exports)
3. `combatStatistics` - Damage tracking and performance metrics (6 exports)
4. `criticalHitResolution` - Critical hit determination and effects (24 exports)
5. `eventPayloads` - Event payload extraction utilities (20 exports)
6. `fallMechanics` - Fall damage and direction resolution (9 exports)
7. `firingArc` - Arc calculations and facing (2 exports)
8. `heat` - Heat dissipation and effects (3 exports)
9. `indirectFire` - Indirect fire and spotter mechanics (11 exports)
10. `lineOfSight` - LOS calculations and terrain blocking (4 exports)
11. `physicalAttacks` - Melee combat resolution (35 exports)
12. `pilotingSkillRolls` - PSR resolution and modifiers (38 exports)
13. `quirkModifiers` - Unit and weapon quirk effects (30+ exports)
14. `spaModifiers` - Special Pilot Ability effects (30+ exports)
15. `terrainGenerator` - Procedural terrain generation (5 exports)

### Conflict Analysis

**Zero conflicts detected** - all exports are domain-specific and unique:

- Used `export *` for all modules (no need for named exports like gameSession/toHit)
- Checked all exported symbols via grep before adding
- All module exports follow clear naming conventions (e.g., `calculatePunchDamage`, `resolvePSR`, `getHeatAmmoExplosionTN`)

### Verification Results

- ✅ TypeScript compilation: zero errors (`npx tsc --noEmit`)
- ✅ Gameplay tests: 1646 pass (bun test src/utils/gameplay/)
- ✅ Build succeeds: Next.js production build completed in 11.4s
- ✅ Export count: 31 export statements (up from 16)

### Pattern Consistency

Followed existing barrel structure:

- Descriptive comments for each module (e.g., `// Dice Types - Dice rolling utilities`)
- Grouped related modules together
- Used `export *` for clean, conflict-free re-exports
- Maintained alphabetical ordering within new additions

### Files Changed

- **Modified**: `src/utils/gameplay/index.ts` (89 lines → 134 lines, +45 lines)

### Commit

- **Hash**: 6192b626
- **Message**: `refactor(gameplay): complete barrel exports in index.ts for all gameplay modules`
- **Files**: 1 (index.ts)

### Key Insight

Domain-specific naming conventions prevent conflicts in barrel exports. When modules follow clear naming patterns (e.g., `calculatePunchDamage` vs `calculateKickDamage` vs `calculateChargeDamage`), `export *` is safe and preferred over verbose named exports.

## Task 7: Fix as-any Casts in damagePipeline.test.ts (2026-02-12)

**Status**: ✅ COMPLETED

### Changes Made

Fixed two instances of unsafe `as any` casts in test file:

**File**: `src/utils/gameplay/__tests__/damagePipeline.test.ts`

1. **Lines 692-693** (originally 690-691):
   - `'short' as any` → `RangeBracket.Short`
   - `'front' as any` → `FiringArc.Front`

2. **Lines 770-771** (originally 768-769):
   - `'short' as any` → `RangeBracket.Short`
   - `'front' as any` → `FiringArc.Front`

### Implementation Details

**Imports Added**:

- `RangeBracket` from `@/types/gameplay` (enum from HexGridInterfaces.ts)
- `FiringArc` from `@/types/gameplay` (enum from HexGridInterfaces.ts)

**Type Mapping**:

- `'short'` → `RangeBracket.Short` (0-3 hexes, +0 modifier)
- `'front'` → `FiringArc.Front` (front arc, facing direction ±1)

### Context

These were mock shortcuts in test setup for `declareAttack()` function calls:

- `declareAttack(session, attackerId, targetId, weapons, range, rangeBracket, firingArc)`
- The 6th parameter expects `RangeBracket` enum value
- The 7th parameter expects `FiringArc` enum value

### Verification Results

- ✅ `grep -n "'short' as any\|'front' as any"` returns zero results
- ✅ All 22 damage pipeline tests pass
- ✅ TypeScript compilation: zero errors (`npx tsc --noEmit`)
- ✅ Commit: `f6d2a031` — "fix(tests): replace as-any mock shortcuts with proper types in damage pipeline tests"

### Pattern Consistency

Follows the same pattern as other test files in the codebase:

- Use proper enum values instead of string literals with `as any`
- Import types from `@/types/gameplay` barrel
- Enables type checking and IDE autocomplete in tests

### Key Insight

Test files should use the same type safety as production code. Using `as any` in tests:

1. Bypasses TypeScript's type checking
2. Makes refactoring harder (enum changes won't be caught)
3. Reduces IDE support (no autocomplete for enum values)
4. Hides bugs (invalid values won't be caught until runtime)

By using proper enum values, tests become more maintainable and catch type errors early.

## Task 7: Remove Console Debug Statements from Test Files (2026-02-12)

**Status**: ✅ COMPLETED

### Implementation Summary

Removed 13 console.log/warn statements from simulation test files:

**Files Modified**:

1. **integration.test.ts** — 12 console statements removed
2. **simulation.test.ts** — 1 console statement removed

### Console Statements Removed

**integration.test.ts**:

- Line 201-202: `console.log` with game count (debug output)
- Line 207-208: `console.log` with elapsed time (debug output)
- Line 227-228: `console.log` with win rates (debug output)
- Line 230-231: `console.log` with completion stats (debug output)
- Line 251-252: `console.log` with violation rate (debug output)
- Line 272-273: `console.warn` with systematic violation (debug output)
- Line 287-288: `console.log` with performance stats (debug output)
- Line 559-562: `console.log` block with performance profile (debug output)
- Line 578-579: `console.log` with benchmark results (debug output)

**simulation.test.ts**:

- Line 113-115: `console.warn` with critical violations (debug output)

### Analysis

All console statements were **debug/diagnostic output**, not part of test assertions:

- None were used in `expect()` statements
- None were validating test outcomes
- All were informational logging for development/CI visibility
- Safe to remove without affecting test behavior

### Verification Results

- ✅ `grep -rn "console\.\(log\|warn\)" src/simulation/__tests__/` returns zero results
- ✅ `bun test src/simulation/__tests__/` passes all 437 tests (7004 expect calls)
- ✅ `npx tsc --noEmit` produces zero errors
- ✅ Build succeeds (Next.js production build completed in 11.5s)

### Commit

- **Hash**: e0257e02
- **Message**: `chore(tests): remove console.log/warn debug statements from simulation tests`
- **Files**: 2 (integration.test.ts, simulation.test.ts)
- **Lines Removed**: 41

### Key Insight

In test files, console statements should be reserved for actual test output/assertions. Debug logging should use test framework features (e.g., `describe.skip()`, `it.only()`, or dedicated logging utilities) rather than console methods, which pollute test output and CI logs.
