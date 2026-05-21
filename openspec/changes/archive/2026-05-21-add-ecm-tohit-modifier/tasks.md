# Tasks: Add ECM Core-Engine To-Hit Modifier

## 1. Modifier table + types

- [x] 1.1 Define `ECM_TO_HIT_MODIFIERS` constant in `src/types/combat/ToHitModifier.ts` (or new `EcmModifiers.ts` if cleaner) with the 4 guidance-type → modifier-value entries
- [x] 1.2 Extend `IToHitModifier` discriminated-union with an `ecm` kind carrying `{ value: number; reason: 'c3-broken' | 'artemis-degraded' | 'tc-degraded' | 'narc-degraded' }` so the modifier surfaces in the post-resolve UI breakdown

## 2. To-hit calculator integration

- [x] 2.1 `src/engine/combatResolution/toHitCalculator.ts`: inject the active `EcmCoverageMap` (resolved at scenario start) into the modifier-accumulator
- [/] 2.2 Partial — `calculateEcmModifier` evaluates each guidance type per the per-guidance rule. Per-weapon guidance detection (mapping weapon definitions → `WeaponGuidanceType`) is DEFERRED to the EcmCoverageMap follow-on; callers currently pass guidance explicitly via `IEcmContext`.
- [x] 2.3 The modifier stacks additively with existing modifiers (range, movement, terrain, heat) — total to-hit is the sum

## 3. Test coverage

- [x] 3.1 Unit tests for each of the 4 guidance types across the 4 ECM-position combinations (shooter-only / target-only / both / neither) = 16 test cases
- [/] 3.2 DEFERRED to EcmCoverageMap follow-on — MegaMek golden-file regression test requires the full per-weapon guidance detection + ECM coverage map pipeline, which lands in the follow-up change. The 30-test `ecmModifier.test.ts` covers the modifier formula side; the scenario-level integration test lives in the follow-up.
- [x] 3.3 N/A — ECM is a positional to-hit modifier, NOT a per-unit BV input. The unit catalog's BV values do not change under this modifier; no balance-sanity test is needed because there is no per-unit BV input affected.

## 4. Spec delta + archive

- [x] 4.1 Author delta at `openspec/changes/add-ecm-tohit-modifier/specs/combat-resolution/spec.md` (or whichever capability owns the to-hit pipeline) ADDING an "ECM To-Hit Modifier" requirement with scenarios for each guidance type
- [x] 4.2 `openspec validate add-ecm-tohit-modifier --strict` passes
- [x] 4.3 `npm run verify:full` passes
- [ ] 4.4 Archive the change to `openspec/changes/archive/YYYY-MM-DD-add-ecm-tohit-modifier/` after merge
- [ ] 4.5 Trim gap #1 from `playtest/CLOSEOUT.md`
