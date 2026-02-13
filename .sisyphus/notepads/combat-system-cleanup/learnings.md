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
