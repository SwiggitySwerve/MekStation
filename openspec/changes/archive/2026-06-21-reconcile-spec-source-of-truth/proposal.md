# Change: Reconcile Spec Source-of-Truth

## Why

The 2026-06-12 full codebase review (`docs/audits/2026-06-12-full-codebase-review.md`, SoT
cluster) found the living spec tree has started ratifying fiction. Four concrete defects:

- **125 live capability specs carry a placeholder Purpose** of the form
  `TBD - created by archiving change … Update Purpose after archive`. The archive mechanic
  seeds this string and nothing ever fails when it survives. `combat-resolution/spec.md:5`
  even cites the *wrong* originating change (`implement-comprehensive-campaign-system`), so
  the placeholder is not merely empty — it is actively misleading provenance. (Audit SoT
  finding: "125 of 199 capabilities (63%) carry `TBD — Update Purpose after archive`";
  live 2026-06-20 recount: 125 placeholders across 207 canonical spec directories.)
- **The ACAR victory-probability scenario contradicts the code and its own test.**
  `combat-resolution/spec.md:25-27` asserts probability is `greater than 0.7` for an 8000 vs
  4000 BV (2:1) matchup, but `calculateVictoryProbability` at `src/lib/combat/acar.ts:142-143`
  is the linear model `playerBV / (playerBV + opponentBV)`, which yields `8000 / 12000 = 0.667`
  — exactly 2/3, never above 0.7. The spec describes a logistic/curved model the code does not
  implement. (Audit SoT finding: "spec says >0.7 for 2:1 BV; code/test produce exactly 2/3".)
- **Two capabilities own the same code home and disagree.** `critical-hit-resolution` and
  `critical-hit-system` both describe the criticalHitResolution code area. They disagree on
  actuator-type count: `critical-hit-resolution/spec.md:121` declares "7 actuator types" while
  enumerating 8 scenarios (shoulder, upper arm, lower arm, hand, hip, upper leg, lower leg,
  foot — lines 123-168), and `critical-hit-system/spec.md:19` correctly lists all 8. A reader
  cannot tell which capability is authoritative. (Audit SoT finding: "7 vs 8 actuator types —
  concrete drift", `critical-hit-system/spec.md:60`.)
- **Three overlapping validation capabilities with a stale master.**
  `validation-rules-master/spec.md` is stamped `Last Updated: 2025-11-28` and overlaps
  `unit-validation-framework` and `validation-patterns` with no declared authority order.
  (Audit SoT finding, low: "Three overlapping validation capabilities with a stale master".)

This is a documentation + guard change. The fix is to (a) correct the one provably-wrong
behavioral scenario (ACAR), (b) add an executable lint guard that fails on the placeholder
Purpose string so the rot cannot recur, and (c) record the one-spec-per-capability /
authoritative-owner rule the guard enforces. The bulk Purpose backfill and the
critical-hit / validation capability merges are tracked as remediation tasks driven by the
guard — they are not hand-authored here.

## What Changes

- Correct the ACAR victory-probability scenario in `combat-resolution` to match the linear
  model the code implements: 2:1 BV yields exactly `2/3 ≈ 0.667`, not `>0.7`. The requirement
  it lives under (`ACAR System`) is tightened so the represented probability model is named.
- Add an executable openspec-lint check (home: `openspec/scripts/`, mirroring the existing
  `terminology-tool.ts` / `validate-terminology.js` pattern) that **FAILS** when any
  `openspec/specs/<cap>/spec.md` still contains the literal placeholder string
  `TBD - created by archiving` (or an empty/`TBD` Purpose), wired into the spec-validation
  gate so a placeholder Purpose can no longer survive merge.
- Record the **one-spec-per-capability** rule: every code home has exactly one authoritative
  capability; a second capability over the same area must either merge or become an explicit
  pointer. The lint check flags the known duplicate-owner pairs
  (`critical-hit-resolution` ↔ `critical-hit-system`;
  `validation-rules-master` ↔ `unit-validation-framework` ↔ `validation-patterns`).
- Capture the remediation backlog the guard creates (125 Purpose backfills, two capability
  merges, the stale-master reconciliation) as tasks — no bulk hand-edits of the 125 specs in
  this change; the guard makes them visible and blocking.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `combat-resolution`: the `ACAR System` requirement gains a corrected victory-probability
  scenario (linear `playerBV / (playerBV + opponentBV)` model; 2:1 BV → `2/3`, not `>0.7`).
- `validation-rules-master`: gains an ADDED `Spec Source-of-Truth Integrity` requirement
  carrying the no-placeholder-Purpose lint guard and the one-spec-per-capability rule.

## Impact

- Spec corrections (this change): `openspec/specs/combat-resolution/spec.md` (ACAR scenario)
  — applied via the spec delta on archive.
- New tooling (remediation tasks): `openspec/scripts/spec-purpose-lint.{ts,js}` (new) +
  `package.json` script entry + spec-validation gate wiring.
- Verified-but-not-edited evidence: `src/lib/combat/acar.ts:142-143` (linear model, read this
  session); `openspec/specs/critical-hit-resolution/spec.md:121` and
  `openspec/specs/critical-hit-system/spec.md:19` (actuator drift); 125 placeholder specs
  (counted this session, matches audit).
- No production combat/runtime code changes — ACAR code already matches the corrected spec.

## Non-goals

- Hand-editing the 125 placeholder Purposes in this change — the guard surfaces them; the
  backfill is a tracked task wave so reviewers see one mechanical sweep, not 125 inline diffs.
- Physically merging `critical-hit-resolution` into `critical-hit-system` (or the inverse)
  here — the decision and the pointer mechanics are recorded in `design.md`; the merge is a
  remediation task gated by the new lint check.
- Changing ACAR runtime behavior — the code is correct; only the spec scenario is wrong.
- Re-authoring `validation-rules-master` content (the 89-rule catalog) — only the
  authoritative-owner relationship and the integrity guard are added.
