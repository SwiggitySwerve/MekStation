# Combat System Post-Feature Cleanup

## TL;DR

> **Quick Summary**: Clean up code quality and consistency issues accumulated across the 19-phase combat parity implementation. No new features — purely technical debt reduction: type unification, constant extraction, barrel completeness, and test hygiene.
>
> **Deliverables**:
>
> - Unified dice roller type system in a single shared location
> - All magic numbers extracted to named constants (per-module)
> - Complete barrel exports for `src/utils/gameplay/index.ts`
> - Event reducer switch made exhaustive with documented intent
> - All unsafe type casts and `Math.random()` calls fixed
> - Test files cleaned of console.log and unnecessary `as any` casts
>
> **Estimated Effort**: Medium (10 tasks, ~4-6 hours)
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Task 1 → Tasks 2,3,4 → Tasks 5-9 → Task 10

---

## Context

### Original Request

Post-feature code review of the combat parity implementation (199 tasks, 15K+ lines, 19,145 tests). Two parallel audit agents (code quality + architecture) identified 14 issues across Critical/High/Medium/Low severity. User chose "Full cleanup plan" to address all issues.

### Interview Summary

**Key Discussions**:

- User completed full 19-phase combat parity implementation (all PRs merged)
- Repository already cleaned (stale branches, stashes, old .sisyphus files removed)
- Code review was triggered as natural post-feature quality gate

**Research Findings (from two explore agents + Metis verification)**:

- Architecture is clean: no circular imports, consistent absolute paths, proper event sourcing
- DiceRoller fragmentation is the #1 structural issue — 3 type definitions in 3 files
- 8 event types fall through reducer silently (most intentionally, 2 need investigation)
- 29/30 gameplay modules have test coverage (lineOfSight.ts was flagged but DOES have tests)
- `resolveLBXSlug()` was flagged as dead code but is an intentional marker function with test coverage

### Metis Review

**Identified Gaps (addressed)**:

- **lineOfSight.ts test gap was false positive** — tests exist at `src/__tests__/unit/utils/gameplay/lineOfSight.test.ts`. Removed from plan.
- **resolveLBXSlug dead code was false positive** — intentional marker function with test. Removed from plan.
- **Barrel export conflicts** — blind `export *` will break build due to name collisions. Task now requires conflict analysis step.
- **`as any` in tests needs categorization** — some are mock shortcuts (fix), some are intentional invalid-input tests (keep).
- **Event handlers are mostly info-only by design** — `default: return state` is intentional. Task becomes audit + document, not implement.

---

## Work Objectives

### Core Objective

Eliminate technical debt from iterative 19-phase development. Make the codebase consistent, type-safe, and maintainable for future work — without changing any runtime behavior.

### Concrete Deliverables

- `src/utils/gameplay/diceTypes.ts` — new shared file for `D6Roller` and `DiceRoller` types + helpers
- Updated imports in all files using dice roller types (remove duplicate definitions)
- Named constants in each gameplay module replacing magic numbers
- Complete `src/utils/gameplay/index.ts` with all modules exported (conflict-safe)
- Exhaustive switch in `gameState.ts` with documented intent per event type
- Zero `undefined as unknown as` casts in production code
- Zero `Math.random()` in gameplay production code (only in test infrastructure)
- Zero `console.log` in test files
- Zero unnecessary `as any` in test files (intentional invalid-input casts preserved)

### Definition of Done

- [x] `bun test` passes with ≥19,145 tests (zero regressions)
- [x] `npx tsc --noEmit` produces zero type errors
- [x] `grep -r "undefined as unknown as" src/utils/gameplay/` returns zero results
- [x] `grep -r "export type DiceRoller" src/` returns exactly 1 result (in diceTypes.ts)
- [x] `grep -r "export type D6Roller" src/` returns exactly 1 result (in diceTypes.ts)
- [x] `grep -r "Math.random" src/utils/gameplay/` returns only `terrainGenerator.ts` (seed gen — acceptable) and `diceTypes.ts` (default roller — acceptable)

### Must Have

- Zero test regressions (test count must remain ≥19,145)
- Zero type errors after changes
- All existing function signatures unchanged (no breaking API changes)
- Every task verified with `bun test` before and after

### Must NOT Have (Guardrails)

- **No new features** — this is cleanup only
- **No function signature changes** — parameter types, return types, parameter order stay the same
- **No resolveLBXSlug removal** — it's intentional and tested
- **No implementing the 4 TODOs in battleResultProcessing.ts** — those are new features
- **No `as any` removal on intentional invalid-input tests** (e.g., `'INVALID' as any`) — those are testing error paths
- **No `export *` without conflict analysis** — verify no duplicate symbol names first
- **No touching Math.random in non-gameplay code** (ID generation, storybook, campaign, etc.)
- **No gameSession.ts structural split** — that's a separate refactoring task
- **No numeric value changes** — only extract existing values to named constants

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.
> Every criterion is verified by running a command.

### Test Decision

- **Infrastructure exists**: YES
- **Automated tests**: YES (tests-after — existing tests serve as regression gate)
- **Framework**: bun test (19,145 tests passing)

### Baseline Capture (MANDATORY FIRST STEP OF EVERY TASK)

```bash
# Before ANY changes — capture baseline
bun test 2>&1 | tail -5
# Record exact pass count (should be ≥19,145)
```

### Post-Change Verification (MANDATORY LAST STEP OF EVERY TASK)

```bash
# After changes
bun test 2>&1 | tail -5
# Must match baseline count exactly

npx tsc --noEmit 2>&1 | head -20
# Must produce zero errors
```

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

> Every task uses Bash to run `bun test` and `npx tsc --noEmit` as the primary verification.
> Additional grep/search commands verify specific cleanup goals per task.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
└── Task 1: DiceRoller type deduplication (foundation — everything else builds on this)

Wave 2 (After Wave 1):
├── Task 2: Fix unsafe D6Roller casts (depends: 1)
├── Task 3: Replace Math.random() in roll2d6 (depends: 1)
└── Task 4: Standardize DI parameter naming (depends: 1)

Wave 3 (After Wave 1, parallel with Wave 2):
├── Task 5: Audit unhandled event types (independent)
├── Task 6: Extract magic numbers to constants (independent)
├── Task 7: Complete barrel exports (depends: 1 for new diceTypes module)
├── Task 8: Fix `as any` casts in test files (independent)
└── Task 9: Remove console.log from test files (independent)

Wave 4 (After all):
└── Task 10: Final verification + hardcoded deployment position fix
```

### Dependency Matrix

| Task | Depends On | Blocks     | Can Parallelize With |
| ---- | ---------- | ---------- | -------------------- |
| 1    | None       | 2, 3, 4, 7 | None (foundation)    |
| 2    | 1          | 10         | 3, 4, 5, 6, 7, 8, 9  |
| 3    | 1          | 10         | 2, 4, 5, 6, 7, 8, 9  |
| 4    | 1          | 10         | 2, 3, 5, 6, 7, 8, 9  |
| 5    | None       | 10         | 2, 3, 4, 6, 7, 8, 9  |
| 6    | None       | 10         | 2, 3, 4, 5, 7, 8, 9  |
| 7    | 1          | 10         | 2, 3, 4, 5, 6, 8, 9  |
| 8    | None       | 10         | 2, 3, 4, 5, 6, 7, 9  |
| 9    | None       | 10         | 2, 3, 4, 5, 6, 7, 8  |
| 10   | 2-9        | None       | None (final gate)    |

### Agent Dispatch Summary

| Wave | Tasks         | Recommended Agents                                                           |
| ---- | ------------- | ---------------------------------------------------------------------------- |
| 1    | 1             | `task(category="unspecified-high", load_skills=[], run_in_background=false)` |
| 2    | 2, 3, 4       | dispatch parallel, `category="quick"` each                                   |
| 3    | 5, 6, 7, 8, 9 | dispatch parallel, `category="quick"` or `"unspecified-low"` each            |
| 4    | 10            | `task(category="quick", load_skills=[], run_in_background=false)`            |

---

## TODOs

- [x] 1. DiceRoller Type Deduplication

  **What to do**:
  - Create `src/utils/gameplay/diceTypes.ts` as the single source of truth for dice types
  - Move `D6Roller` type from `hitLocation.ts:119` to `diceTypes.ts`
  - Move `DiceRoller` type from `gameSession.ts:503` to `diceTypes.ts`
  - Move `defaultD6Roller` function from `hitLocation.ts:121` to `diceTypes.ts`
  - Move `rollD6` function from `hitLocation.ts:126` to `diceTypes.ts`
  - Move `roll2d6` function from `hitLocation.ts:133` to `diceTypes.ts`
  - Delete duplicate `DiceRoller` type from `specialWeaponMechanics.ts:28`
  - Update ALL files that import these types to import from `diceTypes.ts` instead
  - Re-export from `hitLocation.ts` for backward compatibility (avoid breaking external imports)
  - Use `lsp_find_references` on each type BEFORE moving to find all import sites

  **Must NOT do**:
  - Change any type signatures (D6Roller stays `() => number`, DiceRoller stays `() => { dice, total, isSnakeEyes, isBoxcars }`)
  - Merge D6Roller and DiceRoller into a single type (they serve different purposes)
  - Change any function implementations (only move location)
  - Remove re-exports from original files until all importers are updated

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Touches many files across the codebase, requires careful import graph management
  - **Skills**: `[]`
    - No specialized skills needed — purely TypeScript refactoring with LSP tools
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed — no git operations during task

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: Tasks 2, 3, 4, 7
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/utils/gameplay/hitLocation.ts:119-140` — Current location of `D6Roller`, `defaultD6Roller`, `rollD6`, `roll2d6` definitions. These are the functions to move.
  - `src/utils/gameplay/gameSession.ts:503-512` — Current location of `DiceRoller` type (the `IDiceRoll`-returning variant). Move this type.
  - `src/utils/gameplay/specialWeaponMechanics.ts:28-35` — Duplicate `DiceRoller` type definition. DELETE this after moving to shared file.

  **API/Type References**:
  - `src/utils/gameplay/hitLocation.ts:119` — `export type D6Roller = () => number;` — exact signature to preserve
  - `src/utils/gameplay/gameSession.ts:503-510` — `export type DiceRoller = () => { dice: [number, number]; total: number; isSnakeEyes: boolean; isBoxcars: boolean; }` — exact signature to preserve

  **Import Site References** (all files that import D6Roller or DiceRoller — update these):
  - `src/utils/gameplay/criticalHitResolution.ts` — imports D6Roller from hitLocation
  - `src/utils/gameplay/ammoTracking.ts` — imports D6Roller from hitLocation
  - `src/utils/gameplay/physicalAttacks.ts` — imports D6Roller from hitLocation
  - `src/utils/gameplay/fallMechanics.ts` — imports D6Roller from hitLocation
  - `src/utils/gameplay/pilotingSkillRolls.ts` — imports D6Roller from hitLocation
  - `src/utils/gameplay/specialWeaponMechanics.ts` — defines own DiceRoller (delete)
  - `src/utils/gameplay/gameSession.ts` — defines own DiceRoller (move to shared)
  - All `__tests__/` files that import these types — use `lsp_find_references` to find all

  **Acceptance Criteria**:
  - [ ] New file `src/utils/gameplay/diceTypes.ts` exists and contains both `D6Roller` and `DiceRoller` types
  - [ ] `grep -r "export type DiceRoller" src/` returns exactly 1 result (in diceTypes.ts)
  - [ ] `grep -r "export type D6Roller" src/` returns exactly 1 result (in diceTypes.ts)
  - [ ] `bun test` passes with ≥19,145 tests
  - [ ] `npx tsc --noEmit` produces zero errors

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: DiceRoller type exists only in diceTypes.ts
    Tool: Bash
    Preconditions: Task changes applied
    Steps:
      1. grep -rn "export type DiceRoller" src/
      2. Assert: exactly 1 result, in src/utils/gameplay/diceTypes.ts
      3. grep -rn "export type D6Roller" src/
      4. Assert: exactly 1 result, in src/utils/gameplay/diceTypes.ts
    Expected Result: Single source of truth for both types
    Evidence: grep output captured

  Scenario: All tests pass with zero regressions
    Tool: Bash
    Preconditions: Task changes applied
    Steps:
      1. bun test 2>&1 | tail -10
      2. Assert: "Tests: X passed" where X >= 19145
      3. npx tsc --noEmit 2>&1 | head -20
      4. Assert: zero errors
    Expected Result: No regressions from type relocation
    Evidence: Test output and tsc output captured

  Scenario: No duplicate type definitions remain
    Tool: Bash
    Preconditions: Task changes applied
    Steps:
      1. grep -rn "type DiceRoller" src/utils/gameplay/ --include="*.ts" | grep -v diceTypes | grep -v ".test." | grep -v __tests__
      2. Assert: zero results (no non-diceTypes definitions)
      3. grep -rn "type D6Roller" src/utils/gameplay/ --include="*.ts" | grep -v diceTypes | grep -v ".test." | grep -v __tests__
      4. Assert: zero results
    Expected Result: All type definitions consolidated
    Evidence: grep output captured
  ```

  **Commit**: YES
  - Message: `refactor(gameplay): unify DiceRoller and D6Roller types into shared diceTypes module`
  - Files: `src/utils/gameplay/diceTypes.ts`, `src/utils/gameplay/hitLocation.ts`, `src/utils/gameplay/gameSession.ts`, `src/utils/gameplay/specialWeaponMechanics.ts`, and all updated importers
  - Pre-commit: `bun test`

---

- [x] 2. Fix Unsafe D6Roller Type Casts

  **What to do**:
  - Replace `undefined as unknown as D6Roller` with proper default parameter in `pilotingSkillRolls.ts:131`
  - Replace `undefined as unknown as D6Roller` with proper default parameter in `pilotingSkillRolls.ts:171`
  - Import `defaultD6Roller` from `diceTypes.ts` (created in Task 1) and use as the default value
  - Pattern: change `diceRoller: D6Roller = undefined as unknown as D6Roller` to `diceRoller: D6Roller = defaultD6Roller`

  **Must NOT do**:
  - Change function signatures (parameter order, types, return types)
  - Change function behavior (only the default value changes)
  - Modify callers — only the default parameter value

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 2-line change in a single file
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4)
  - **Blocks**: Task 10
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/utils/gameplay/pilotingSkillRolls.ts:131` — First unsafe cast: `diceRoller: D6Roller = undefined as unknown as D6Roller`
  - `src/utils/gameplay/pilotingSkillRolls.ts:171` — Second unsafe cast: `diceRoller: D6Roller = undefined as unknown as D6Roller`
  - `src/utils/gameplay/hitLocation.ts:121` — Pattern to follow: `const defaultD6Roller: D6Roller = () => Math.floor(Math.random() * 6) + 1;` — after Task 1, this lives in `diceTypes.ts`

  **Acceptance Criteria**:
  - [ ] `grep -r "undefined as unknown as" src/utils/gameplay/` returns zero results
  - [ ] `bun test` passes with ≥19,145 tests
  - [ ] `npx tsc --noEmit` produces zero errors

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: No unsafe casts remain
    Tool: Bash
    Preconditions: Task changes applied
    Steps:
      1. grep -rn "undefined as unknown as" src/utils/gameplay/
      2. Assert: zero results
    Expected Result: All unsafe casts replaced with proper defaults
    Evidence: grep output captured

  Scenario: PSR functions work with default roller
    Tool: Bash
    Preconditions: Task changes applied
    Steps:
      1. bun test src/utils/gameplay/__tests__/pilotingSkillRolls.test.ts 2>&1 | tail -10
      2. Assert: all tests pass
    Expected Result: PSR tests unaffected by default parameter change
    Evidence: Test output captured
  ```

  **Commit**: YES (groups with Tasks 3, 4)
  - Message: `fix(gameplay): replace unsafe D6Roller type casts with proper defaults`
  - Files: `src/utils/gameplay/pilotingSkillRolls.ts`
  - Pre-commit: `bun test`

---

- [x] 3. Replace Math.random() in roll2d6

  **What to do**:
  - In `gameSession.ts:297-298`, the standalone `roll2d6()` function uses raw `Math.random()` instead of the injectable `D6Roller` pattern
  - Modify `roll2d6()` to accept an optional `D6Roller` parameter with `defaultD6Roller` as default
  - Import `D6Roller` and `defaultD6Roller` from `diceTypes.ts` (created in Task 1)
  - Replace `Math.floor(Math.random() * 6) + 1` with `roller()` calls
  - Verify all callers of `roll2d6()` in gameSession.ts still work (they pass no arguments, so the default handles them)

  **Must NOT do**:
  - Change `terrainGenerator.ts:196` — seed generation using `Math.random()` is acceptable (non-combat code)
  - Change `hitLocation.ts:121` — `defaultD6Roller` definition using `Math.random()` is the correct pattern (it IS the default)
  - Break any callers of `roll2d6()` — the parameter must be optional

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single function modification in one file
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 4)
  - **Blocks**: Task 10
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/utils/gameplay/gameSession.ts:297-298` — Current `roll2d6()` function using raw `Math.random()`
  - `src/utils/gameplay/hitLocation.ts:133-139` — Existing injectable `roll2d6(roller: D6Roller)` pattern to follow — this is the ideal pattern

  **API/Type References**:
  - `src/utils/gameplay/diceTypes.ts` — (created in Task 1) `D6Roller` type and `defaultD6Roller` to import

  **Acceptance Criteria**:
  - [ ] `gameSession.ts` `roll2d6()` accepts optional `D6Roller` parameter
  - [ ] `grep -n "Math.random" src/utils/gameplay/gameSession.ts` returns zero results
  - [ ] `bun test` passes with ≥19,145 tests
  - [ ] `npx tsc --noEmit` produces zero errors

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: roll2d6 no longer uses Math.random directly
    Tool: Bash
    Preconditions: Task changes applied
    Steps:
      1. grep -n "Math.random" src/utils/gameplay/gameSession.ts
      2. Assert: zero results
    Expected Result: No direct Math.random usage in gameSession.ts
    Evidence: grep output captured

  Scenario: Game session tests still pass
    Tool: Bash
    Preconditions: Task changes applied
    Steps:
      1. bun test src/utils/gameplay/__tests__/gameSession.test.ts 2>&1 | tail -10
      2. Assert: all tests pass
    Expected Result: roll2d6 default parameter maintains backward compatibility
    Evidence: Test output captured
  ```

  **Commit**: YES (groups with Tasks 2, 4)
  - Message: `fix(gameplay): make roll2d6 accept injectable D6Roller instead of Math.random`
  - Files: `src/utils/gameplay/gameSession.ts`
  - Pre-commit: `bun test`

---

- [x] 4. Standardize DI Parameter Naming

  **What to do**:
  - Audit all functions accepting dice roller parameters across gameplay modules
  - Standardize parameter name to `diceRoller` everywhere (currently mix of `roller` and `diceRoller`)
  - The only file that uses `roller` is `hitLocation.ts` — rename to `diceRoller` there
  - Use `lsp_prepare_rename` then `lsp_rename` for safe renames (catches all usages including tests)

  **Must NOT do**:
  - Change parameter types or positions
  - Change any function behavior
  - Rename parameters in test files manually (let `lsp_rename` handle propagation)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Parameter rename using LSP — safe and mechanical
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3)
  - **Blocks**: Task 10
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/utils/gameplay/hitLocation.ts` — uses `roller` parameter name (should be `diceRoller`)
  - `src/utils/gameplay/fallMechanics.ts` — uses `diceRoller` (correct, keep as-is)
  - `src/utils/gameplay/criticalHitResolution.ts` — uses `diceRoller` (correct, keep as-is)
  - `src/utils/gameplay/pilotingSkillRolls.ts` — uses `diceRoller` (correct, keep as-is)

  **Acceptance Criteria**:
  - [ ] `grep -rn "roller:" src/utils/gameplay/ --include="*.ts" | grep -v diceRoller | grep -v "\.test\."` returns zero results (no bare `roller:` params)
  - [ ] `bun test` passes with ≥19,145 tests
  - [ ] `npx tsc --noEmit` produces zero errors

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: All dice parameters named consistently
    Tool: Bash
    Preconditions: Task changes applied
    Steps:
      1. grep -rn "roller:" src/utils/gameplay/ --include="*.ts" | grep -v diceRoller | grep -v ".test." | grep -v __tests__
      2. Assert: zero results (only diceRoller naming used)
    Expected Result: Consistent DI parameter naming
    Evidence: grep output captured
  ```

  **Commit**: YES (groups with Tasks 2, 3)
  - Message: `refactor(gameplay): standardize dice roller parameter name to diceRoller`
  - Files: `src/utils/gameplay/hitLocation.ts`, `src/utils/gameplay/diceTypes.ts`, and any affected test files
  - Pre-commit: `bun test`

---

- [x] 5. Audit and Document Unhandled Event Types

  **What to do**:
  - In `gameState.ts` reducer, 8 event types fall through to `default: return state`
  - For each unhandled event, determine if it SHOULD mutate state or is correctly info-only
  - Add explicit `case` entries for all 8 with comments explaining intent:
    - `TurnEnded` — info/bookkeeping event, no state change needed
    - `InitiativeOrderSet` — info event (order set via InitiativeRolled handler)
    - `AttacksRevealed` — simultaneous resolution marker, no state change
    - `AttackResolved` — individual attack result (damage applied via DamageApplied event)
    - `HeatEffectApplied` — effect tracking (heat tracked via HeatGenerated/HeatDissipated)
    - `CriticalHit` — legacy/info-only (CriticalHitResolved is the actual handler)
    - **`FacingChanged`** — INVESTIGATE: should this update unit facing in state? Check if `IUnitGameState` has a facing field
    - **`AmmoExplosion`** — INVESTIGATE: should this apply damage or is it handled via DamageApplied events?
  - If FacingChanged/AmmoExplosion need real handlers, implement them
  - Goal: make the switch statement exhaustive (every enum member has explicit case)

  **Must NOT do**:
  - Add new game logic without verifying against BattleTech rules
  - Remove any event types from the enum
  - Change existing handler behavior

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Mostly adding comment-only case statements; 2 cases need investigation
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 6-9)
  - **Blocks**: Task 10
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/utils/gameplay/gameState.ts:118-219` — Current reducer switch statement with 22 handled cases and `default: return state`
  - `src/types/gameplay/GameSessionInterfaces.ts:69-115` — `GameEventType` enum with all 30 members

  **API/Type References**:
  - `src/types/gameplay/GameSessionInterfaces.ts` — `IUnitGameState` interface — check for `facing` field
  - `src/types/gameplay/GameSessionInterfaces.ts` — Event payload interfaces for each unhandled type

  **Acceptance Criteria**:
  - [ ] Every member of `GameEventType` enum has an explicit `case` in the reducer (no `default` fallthrough for known types)
  - [ ] Each info-only case has a comment explaining why no state change is needed
  - [ ] FacingChanged and AmmoExplosion investigated and either implemented or documented as info-only
  - [ ] `bun test` passes with ≥19,145 tests
  - [ ] `npx tsc --noEmit` produces zero errors

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: All event types have explicit case handlers
    Tool: Bash
    Preconditions: Task changes applied
    Steps:
      1. Read GameEventType enum members from GameSessionInterfaces.ts
      2. For each member, grep for "case GameEventType.{member}" in gameState.ts
      3. Assert: every enum member has a matching case
    Expected Result: Exhaustive switch coverage
    Evidence: grep output captured

  Scenario: Existing event handling unchanged
    Tool: Bash
    Preconditions: Task changes applied
    Steps:
      1. bun test src/utils/gameplay/__tests__/gameState.test.ts 2>&1 | tail -10
      2. Assert: all tests pass
    Expected Result: No regressions in state management
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `refactor(gameplay): make event reducer switch exhaustive with documented intent per event type`
  - Files: `src/utils/gameplay/gameState.ts`
  - Pre-commit: `bun test`

---

- [x] 6. Extract Magic Numbers to Named Constants

  **What to do**:
  - Extract hardcoded magic numbers to named constants in EACH module (per-module, NOT a single god-file)
  - Key modules and their magic numbers:
    - `criticalHitResolution.ts` — `3` (gyro destruction threshold), `2` (gyro hits), `999` (cannot stand), `5` (engine heat sinks)
    - `physicalAttacks.ts` — `2` (kick penalty), `10` (punch divisor), `5` (kick divisor), `9` (TSM heat threshold)
    - `ammoTracking.ts` — `19-30` (heat explosion thresholds), `20` (Gauss damage)
    - `electronicWarfare.ts` — `6` (ECM radius), `4`/`8`/`5` (BAP ranges)
    - `environmentalModifiers.ts` — `1`, `2` (light/weather modifier values)
    - `SimulationRunner.ts` — `10` (MAX_TURNS), `65` (DEFAULT_TONNAGE), `5` (DEFAULT_PILOTING)
  - Name constants descriptively: `GYRO_DESTRUCTION_THRESHOLD`, `KICK_DAMAGE_DIVISOR`, `TSM_HEAT_THRESHOLD`, etc.
  - Place constants at the top of each module, near their usage
  - Use `ast_grep_replace(dryRun=true)` first to preview changes before applying

  **Must NOT do**:
  - Change any numeric values (only extract to named constants)
  - Create a single centralized constants file (per-module is the pattern)
  - Extract numbers that are genuinely contextual (e.g., `+1` in loop increments, array indices)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Touches 6+ files with 50+ individual constant extractions — needs careful attention to each
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 5, 7-9)
  - **Blocks**: Task 10
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/utils/gameplay/criticalHitResolution.ts` — Magic numbers: 3 (gyro), 2 (gyro hits), 999 (cannot stand), 5 (engine)
  - `src/utils/gameplay/physicalAttacks.ts` — Magic numbers: 2 (kick), 10 (punch), 5 (kick), 9 (TSM)
  - `src/utils/gameplay/ammoTracking.ts` — Magic numbers: 19-30 (heat thresholds), 20 (Gauss)
  - `src/utils/gameplay/electronicWarfare.ts` — Magic numbers: 6 (ECM), 4/8/5 (BAP ranges)
  - `src/utils/gameplay/environmentalModifiers.ts` — Magic numbers: 1, 2 (modifier values)
  - `src/simulation/runner/SimulationRunner.ts` — Magic numbers: 10, 65, 5 (simulation defaults)

  **Documentation References**:
  - BattleTech TotalWarfare rulebook — source of all combat constants
  - MegaMek source at `E:\Projects\megamek\` — cross-reference for constant naming conventions

  **Acceptance Criteria**:
  - [ ] Each module has named constants at the top for formerly-magic numbers
  - [ ] `bun test` passes with ≥19,145 tests (proves no value changes)
  - [ ] `npx tsc --noEmit` produces zero errors

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: All tests pass after constant extraction (proving no value changes)
    Tool: Bash
    Preconditions: Task changes applied
    Steps:
      1. bun test 2>&1 | tail -10
      2. Assert: pass count >= 19145
    Expected Result: Zero regressions — values unchanged, only extracted to constants
    Evidence: Test output captured

  Scenario: Constants are properly named and placed
    Tool: Bash
    Preconditions: Task changes applied
    Steps:
      1. grep -n "const.*THRESHOLD\|const.*DIVISOR\|const.*RADIUS\|const.*MAX_\|const.*DEFAULT_" src/utils/gameplay/criticalHitResolution.ts src/utils/gameplay/physicalAttacks.ts src/utils/gameplay/ammoTracking.ts src/utils/gameplay/electronicWarfare.ts
      2. Assert: multiple named constants found in each file
    Expected Result: Magic numbers replaced with descriptive constant names
    Evidence: grep output captured
  ```

  **Commit**: YES
  - Message: `refactor(gameplay): extract magic numbers to named constants across combat modules`
  - Files: All 6 modules listed above
  - Pre-commit: `bun test`

---

- [x] 7. Complete Barrel Exports in index.ts

  **What to do**:
  - Add missing module exports to `src/utils/gameplay/index.ts`
  - Missing modules (~15): `ammoTracking`, `combatStatistics`, `criticalHitResolution`, `eventPayloads`, `fallMechanics`, `firingArc`, `heat`, `indirectFire`, `lineOfSight`, `physicalAttacks`, `pilotingSkillRolls`, `quirkModifiers`, `spaModifiers`, `terrainGenerator`, `diceTypes` (new from Task 1)
  - **CRITICAL**: For each module, check for name conflicts with already-exported symbols before using `export *`
  - Use `ast_grep_search` to find all exported symbol names from each new module
  - Compare against existing exports — use named exports (like `gameSession.ts` and `toHit.ts` patterns) for modules with conflicts
  - Test build with `npx tsc --noEmit` after each module addition

  **Must NOT do**:
  - Use `export *` without checking for name conflicts first
  - Remove any existing exports or aliases (like `calculateTMMModifier`, `getToHitRangeBracket`)
  - Change the order of existing exports

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Mechanical barrel export additions with conflict checking
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 5, 6, 8, 9)
  - **Blocks**: Task 10
  - **Blocked By**: Task 1 (new diceTypes module needs exporting)

  **References**:

  **Pattern References**:
  - `src/utils/gameplay/index.ts:1-89` — Current barrel with 16 modules exported. Two use named exports due to conflicts: `gameSession` (line 35-47) and `toHit` (line 51-81). Follow this pattern for new modules with conflicts.
  - `src/utils/gameplay/index.ts:60` — `calculateTMM as calculateTMMModifier` — example of alias for conflict resolution
  - `src/utils/gameplay/index.ts:78` — `getRangeBracket as getToHitRangeBracket` — example of alias for conflict resolution

  **Acceptance Criteria**:
  - [ ] All gameplay modules are exported from `index.ts` (either `export *` or named exports)
  - [ ] `npx tsc --noEmit` produces zero errors (no duplicate symbol conflicts)
  - [ ] `bun test` passes with ≥19,145 tests

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: No duplicate export errors after barrel expansion
    Tool: Bash
    Preconditions: Task changes applied
    Steps:
      1. npx tsc --noEmit 2>&1 | head -30
      2. Assert: zero errors
      3. grep -c "export" src/utils/gameplay/index.ts
      4. Assert: significantly more export lines than current 89
    Expected Result: Build succeeds with expanded barrel
    Evidence: tsc output and line count captured

  Scenario: All modules reachable through barrel
    Tool: Bash
    Preconditions: Task changes applied
    Steps:
      1. For each previously-missing module, verify at least one symbol is exported:
         grep "ammoTracking\|combatStatistics\|criticalHitResolution\|diceTypes" src/utils/gameplay/index.ts
      2. Assert: each module name appears in index.ts
    Expected Result: Complete barrel coverage
    Evidence: grep output captured
  ```

  **Commit**: YES
  - Message: `refactor(gameplay): complete barrel exports in index.ts for all gameplay modules`
  - Files: `src/utils/gameplay/index.ts`
  - Pre-commit: `bun test && npx tsc --noEmit`

---

- [x] 8. Fix `as any` Casts in Test Files

  **What to do**:
  - Address `as any` casts in `damagePipeline.test.ts:690-691,768-769`
  - These are `'short' as any` and `'front' as any` — mock shortcuts for range bracket and attack direction
  - **Categorize first**: are these mock shortcuts (fix) or intentional invalid-input tests (keep)?
  - For mock shortcuts: replace with proper type imports (e.g., `RangeBracket.Short`, `AttackDirection.Front` or the correct enum/union values)
  - Search other test files for similar `as any` patterns and fix those too
  - **PRESERVE** any `as any` casts that are intentionally testing invalid inputs (e.g., `'INVALID' as any`)

  **Must NOT do**:
  - Remove `as any` on intentional invalid-input tests — those test error handling paths
  - Change test behavior or expected outcomes
  - Modify production code (test files only)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small targeted fixes in test files
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 5-7, 9)
  - **Blocks**: Task 10
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/utils/gameplay/__tests__/damagePipeline.test.ts:690-691` — `'short' as any` and `'front' as any`
  - `src/utils/gameplay/__tests__/damagePipeline.test.ts:768-769` — Same pattern repeated

  **API/Type References**:
  - `src/types/gameplay/CombatInterfaces.ts` — Check for range bracket and attack direction type definitions to use instead of `as any`

  **Acceptance Criteria**:
  - [ ] `grep -n "as any" src/utils/gameplay/__tests__/damagePipeline.test.ts` shows only intentional invalid-input casts (if any), not mock shortcuts
  - [ ] `bun test` passes with ≥19,145 tests
  - [ ] `npx tsc --noEmit` produces zero errors

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Mock shortcut 'as any' removed, damage tests pass
    Tool: Bash
    Preconditions: Task changes applied
    Steps:
      1. grep -n "'short' as any\|'front' as any" src/utils/gameplay/__tests__/damagePipeline.test.ts
      2. Assert: zero results
      3. bun test src/utils/gameplay/__tests__/damagePipeline.test.ts 2>&1 | tail -10
      4. Assert: all tests pass
    Expected Result: Type-safe test code with no regressions
    Evidence: grep and test output captured
  ```

  **Commit**: YES (groups with Task 9)
  - Message: `fix(tests): replace as-any mock shortcuts with proper types in damage pipeline tests`
  - Files: `src/utils/gameplay/__tests__/damagePipeline.test.ts`
  - Pre-commit: `bun test`

---

- [x] 9. Remove console.log from Test Files

  **What to do**:
  - Remove `console.log` and `console.warn` statements from test files:
    - `src/simulation/__tests__/integration.test.ts` — 12 instances (lines 201, 207, 227, 230, 251, 272, 287, 559-562, 578)
    - `src/simulation/__tests__/simulation.test.ts` — 1 instance (line 113)
  - **Before removing**: check each statement to determine if the output is being validated (i.e., is it part of a test assertion or just debug spew?)
  - The performance profile block (lines 559-562) logs timing data — verify this isn't asserted elsewhere before removing
  - If any console statements are used for diagnostic purposes in CI, replace with test framework logging or remove entirely

  **Must NOT do**:
  - Remove console statements that are part of test validation logic
  - Modify test assertions or expected outcomes
  - Touch console statements in production code

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward deletion of debug statements
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 5-8)
  - **Blocks**: Task 10
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/simulation/__tests__/integration.test.ts:201,207,227,230,251,272,287,559-562,578` — All console.log/warn locations
  - `src/simulation/__tests__/simulation.test.ts:113` — Single console.warn

  **Acceptance Criteria**:
  - [ ] `grep -rn "console\.\(log\|warn\)" src/simulation/__tests__/` returns zero results
  - [ ] `bun test` passes with ≥19,145 tests
  - [ ] `npx tsc --noEmit` produces zero errors

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: No console statements in simulation test files
    Tool: Bash
    Preconditions: Task changes applied
    Steps:
      1. grep -rn "console.log\|console.warn" src/simulation/__tests__/
      2. Assert: zero results
      3. bun test src/simulation/__tests__/ 2>&1 | tail -10
      4. Assert: all simulation tests pass
    Expected Result: Clean test output with no debug spew
    Evidence: grep and test output captured
  ```

  **Commit**: YES (groups with Task 8)
  - Message: `chore(tests): remove console.log/warn debug statements from simulation tests`
  - Files: `src/simulation/__tests__/integration.test.ts`, `src/simulation/__tests__/simulation.test.ts`
  - Pre-commit: `bun test`

---

- [x] 10. Final Verification + Hardcoded Deployment Fix

  **What to do**:
  - Fix hardcoded deployment positions in `gameState.ts:239-241` — extract `row = isPlayer ? 5 : -5` to named constants (`PLAYER_DEPLOY_ROW = 5`, `OPPONENT_DEPLOY_ROW = -5`)
  - Run full verification suite confirming all previous tasks are complete:
    - Zero `undefined as unknown as` casts
    - Single DiceRoller/D6Roller definition location
    - Zero `Math.random` in gameSession.ts
    - Exhaustive event switch
    - Complete barrel exports
    - Zero unnecessary `as any` in tests
    - Zero `console.log` in test files
    - Named constants in all target modules
  - Run full test suite as final gate

  **Must NOT do**:
  - Change deployment logic (only extract position literals to constants)
  - Add new deployment features
  - Skip any verification step

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small constant extraction + verification commands
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (solo — final gate)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 2, 3, 4, 5, 6, 7, 8, 9

  **References**:

  **Pattern References**:
  - `src/utils/gameplay/gameState.ts:239-241` — Hardcoded `row = isPlayer ? 5 : -5` deployment positions

  **Acceptance Criteria**:
  - [ ] Deployment positions use named constants, not raw numbers
  - [ ] Full verification battery passes (all grep checks from tasks 1-9)
  - [ ] `bun test` passes with ≥19,145 tests
  - [ ] `npx tsc --noEmit` produces zero errors

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Complete cleanup verification battery
    Tool: Bash
    Preconditions: All tasks 1-9 complete
    Steps:
      1. grep -r "undefined as unknown as" src/utils/gameplay/ → Assert: 0 results
      2. grep -r "export type DiceRoller" src/ → Assert: exactly 1 (in diceTypes.ts)
      3. grep -r "export type D6Roller" src/ → Assert: exactly 1 (in diceTypes.ts)
      4. grep -n "Math.random" src/utils/gameplay/gameSession.ts → Assert: 0 results
      5. grep -rn "console.log\|console.warn" src/simulation/__tests__/ → Assert: 0 results
      6. bun test 2>&1 | tail -10 → Assert: ≥19,145 tests pass
      7. npx tsc --noEmit 2>&1 | head -20 → Assert: 0 errors
    Expected Result: All cleanup goals achieved, zero regressions
    Evidence: All outputs captured

  Scenario: Deployment positions use named constants
    Tool: Bash
    Preconditions: Task changes applied
    Steps:
      1. grep -n "DEPLOY_ROW\|DEPLOY_POSITION" src/utils/gameplay/gameState.ts
      2. Assert: named constants found
      3. grep -n "= isPlayer ? 5 : -5" src/utils/gameplay/gameState.ts
      4. Assert: zero results (raw numbers replaced)
    Expected Result: Deployment positions are configurable via constants
    Evidence: grep output captured
  ```

  **Commit**: YES
  - Message: `refactor(gameplay): extract deployment positions to constants and verify full cleanup`
  - Files: `src/utils/gameplay/gameState.ts`
  - Pre-commit: `bun test`

---

## Commit Strategy

| After Task(s) | Message                                                                                         | Key Files                                                                               | Verification                   |
| ------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------ |
| 1             | `refactor(gameplay): unify DiceRoller and D6Roller types into shared diceTypes module`          | diceTypes.ts, hitLocation.ts, gameSession.ts, specialWeaponMechanics.ts + all importers | `bun test && npx tsc --noEmit` |
| 2, 3, 4       | Can commit individually or group as `refactor(gameplay): fix dice roller injection consistency` | pilotingSkillRolls.ts, gameSession.ts, hitLocation.ts                                   | `bun test`                     |
| 5             | `refactor(gameplay): make event reducer switch exhaustive with documented intent`               | gameState.ts                                                                            | `bun test`                     |
| 6             | `refactor(gameplay): extract magic numbers to named constants`                                  | 6 files                                                                                 | `bun test`                     |
| 7             | `refactor(gameplay): complete barrel exports in index.ts`                                       | index.ts                                                                                | `bun test && npx tsc --noEmit` |
| 8, 9          | `chore(tests): clean up type casts and console statements in test files`                        | damagePipeline.test.ts, integration.test.ts, simulation.test.ts                         | `bun test`                     |
| 10            | `refactor(gameplay): extract deployment positions and final cleanup verification`               | gameState.ts                                                                            | `bun test && npx tsc --noEmit` |

---

## Success Criteria

### Verification Commands

```bash
# Full test suite — zero regressions
bun test                         # Expected: ≥19,145 tests pass

# Type safety
npx tsc --noEmit                 # Expected: zero errors

# DiceRoller consolidation
grep -r "export type DiceRoller" src/  # Expected: 1 result (diceTypes.ts)
grep -r "export type D6Roller" src/    # Expected: 1 result (diceTypes.ts)

# Unsafe casts eliminated
grep -r "undefined as unknown as" src/utils/gameplay/  # Expected: 0 results

# Math.random eliminated from gameplay
grep -n "Math.random" src/utils/gameplay/gameSession.ts  # Expected: 0 results

# Console statements cleaned
grep -rn "console.log\|console.warn" src/simulation/__tests__/  # Expected: 0 results
```

### Final Checklist

- [ ] All "Must Have" present (zero regressions, zero type errors, all function signatures preserved)
- [ ] All "Must NOT Have" absent (no new features, no dead code removal of resolveLBXSlug, no signature changes)
- [ ] All 10 tasks completed with individual verification
- [ ] All tests pass (≥19,145)
