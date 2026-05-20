# Tasks: Add ECM Core-Engine To-Hit Modifier

## 1. Modifier table + types

- [ ] 1.1 Define `ECM_TO_HIT_MODIFIERS` constant in `src/types/combat/ToHitModifier.ts` (or new `EcmModifiers.ts` if cleaner) with the 4 guidance-type → modifier-value entries
- [ ] 1.2 Extend `IToHitModifier` discriminated-union with an `ecm` kind carrying `{ value: number; reason: 'c3-broken' | 'artemis-degraded' | 'tc-degraded' | 'narc-degraded' }` so the modifier surfaces in the post-resolve UI breakdown

## 2. To-hit calculator integration

- [ ] 2.1 `src/engine/combatResolution/toHitCalculator.ts`: inject the active `EcmCoverageMap` (resolved at scenario start) into the modifier-accumulator
- [ ] 2.2 For each weapon attack the calculator evaluates: detect the weapon's guidance type (C3 / Artemis / TC / NARC) and apply the modifier when the shooter, target, or both are inside an ECM bubble per the per-guidance rule
- [ ] 2.3 The modifier stacks additively with existing modifiers (range, movement, terrain, heat) — total to-hit is the sum

## 3. Test coverage

- [ ] 3.1 Unit tests for each of the 4 guidance types across the 4 ECM-position combinations (shooter-only / target-only / both / neither) = 16 test cases
- [ ] 3.2 Regression test: a fixed-seed combat scenario with mixed C3 + ECM produces the same total to-hit numbers as MegaMek's reference calculation (capture the MegaMek baseline as a golden-file)
- [ ] 3.3 Balance-sanity test: aggregate BV change across the unit catalog under the new modifier is < 1% (ECM is positional, not per-unit, so no balance-driven re-rating expected)

## 4. Spec delta + archive

- [ ] 4.1 Author delta at `openspec/changes/add-ecm-tohit-modifier/specs/combat-resolution/spec.md` (or whichever capability owns the to-hit pipeline) ADDING an "ECM To-Hit Modifier" requirement with scenarios for each guidance type
- [ ] 4.2 `openspec validate add-ecm-tohit-modifier --strict` passes
- [ ] 4.3 `npm run verify:full` passes
- [ ] 4.4 Archive the change to `openspec/changes/archive/YYYY-MM-DD-add-ecm-tohit-modifier/` after merge
- [ ] 4.5 Trim gap #1 from `playtest/CLOSEOUT.md`
