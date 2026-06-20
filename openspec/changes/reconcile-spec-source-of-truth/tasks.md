# Tasks: Reconcile Spec Source-of-Truth

## 1. Investigation and red-first evidence

- [ ] 1.1 Re-confirm the ACAR drift: read `src/lib/combat/acar.ts` `calculateVictoryProbability`
      (linear `playerBV / (playerBV + opponentBV)`, lines 142-143) and the ACAR test fixture, and
      record that 8000 vs 4000 BV yields exactly `2/3 ≈ 0.667`, contradicting
      `openspec/specs/combat-resolution/spec.md:25-27` (`>0.7`).
- [ ] 1.2 Re-confirm the placeholder count: `grep -rl "TBD - created by archiving" openspec/specs/`
      returns 125 live capability spec.md files across the current 207 spec directories; capture
      the full list as the guard's initial allowlist seed.
- [ ] 1.3 Re-confirm the duplicate-owner drift: `critical-hit-resolution/spec.md:121` says
      "7 actuator types" while enumerating 8 (lines 123-168); `critical-hit-system/spec.md:19`
      lists 8. Record both capabilities' code home.
- [ ] 1.4 Write a red-first guard probe: a fixture spec.md containing `TBD - created by archiving`
      and assert the new `spec-purpose-lint` exits non-zero on it (proves the guard catches the
      defect before the real wiring lands).

## 2. ACAR scenario correction (spec delta)

- [ ] 2.1 Apply the `combat-resolution` spec delta: tighten the `ACAR System` requirement to name
      the linear probability model and replace the `Higher BV increases win chance` scenario's
      `greater than 0.7` assertion with `approximately 0.667 (2/3)`.
- [ ] 2.2 Confirm no ACAR production code change is needed (code already linear); add/confirm a
      unit test asserting `calculateVictoryProbability(8000, 4000) === 8000/12000` so the corrected
      scenario is executable.

## 3. Spec-purpose integrity lint guard

- [ ] 3.1 Author `openspec/scripts/spec-purpose-lint.ts` (+ a `validate-spec-purpose.js` runner if
      the gate calls node directly), mirroring `openspec/scripts/terminology-tool.ts` /
      `validate-terminology.js`. It scans every `openspec/specs/*/spec.md` `## Purpose` body and
      FAILS on: (a) literal `TBD - created by archiving`; (b) empty or bare-`TBD` Purpose.
- [ ] 3.2 Add the known-placeholder allowlist (the 125 from task 1.2) and the known duplicate-owner
      pairs allowlist (`critical-hit-resolution`↔`critical-hit-system`;
      `validation-rules-master`↔`unit-validation-framework`↔`validation-patterns`); each entry
      records the owning change so it is auditable and drainable.
- [ ] 3.3 Add a `package.json` script (`spec:purpose:validate` / `:strict`) and wire it into the
      spec-validation gate so a NEW placeholder Purpose fails CI immediately while allowlisted
      legacy ones are tracked.
- [ ] 3.4 Confirm task 1.4's red probe now passes (guard exits non-zero on a fresh placeholder,
      zero on a real Purpose).

## 4. One-spec-per-capability rule (spec delta)

- [ ] 4.1 Apply the `validation-rules-master` spec delta adding the `Spec Source-of-Truth
      Integrity` requirement (no-placeholder-Purpose guard + one-spec-per-capability /
      authoritative-owner rule + pointer mechanic).
- [ ] 4.2 Extend the lint check to flag a code home claimed by >1 non-pointer capability, seeded
      from the duplicate-owner allowlist, so the allowlist must shrink to empty over time.
- [ ] 4.3 Record the active-change ownership/order matrix for shared capabilities before
      implementation begins: serialize the five `tactical-map-interface` changes as movement
      agreement -> to-hit agreement -> perf/label pressure -> top-down badges -> isometric
      extrusion, and sequence `wire-interactive-turn-engine` before
      `persist-and-recover-interactive-battles` for shared `game-session-management` semantics.

## 5. Remediation backlog (driven by the guard, not hand-authored here)

- [ ] 5.1 Backfill the 125 placeholder Purposes in one mechanical sweep — write each capability's
      real Purpose from its originating change's proposal; drain the task 3.2 allowlist as each
      lands. (Correct `combat-resolution/spec.md:5`'s wrong originating-change citation.)
- [ ] 5.2 Resolve the `critical-hit-resolution` ↔ `critical-hit-system` duplicate: pick the
      canonical owner, rewrite the loser's Purpose as a pointer, and reconcile the 7-vs-8
      actuator-count wording to a single source. Remove the pair from the duplicate allowlist.
- [ ] 5.3 Reconcile the `validation-rules-master` (stale 2025-11-28) /
      `unit-validation-framework` / `validation-patterns` overlap: declare the authoritative
      owner, point the others, and remove the trio from the duplicate allowlist.

## 6. Verification and documentation

- [ ] 6.1 Run the guard against the full tree: NEW placeholders fail, allowlisted legacy ones are
      reported as tracked debt; ACAR unit test green; `npx tsc --noEmit --skipLibCheck` + lint on
      the new script.
- [ ] 6.2 Run `npx openspec validate reconcile-spec-source-of-truth --strict` and confirm it prints
      valid.
- [ ] 6.3 Update `docs/audits/2026-06-12-full-codebase-review.md` SoT-cluster rows: ACAR scenario
      corrected, integrity guard landed, Purpose backfill + duplicate merges enumerated as the
      remaining drained-by-guard work.
