# Design: Reconcile Spec Source-of-Truth

## Context

The OpenSpec archive flow seeds every newly-promoted capability's `## Purpose` with
`TBD - created by archiving change <name>. Update Purpose after archive.` and relies on a
human to come back and write the real Purpose. Nobody does: 125 live capability specs
(re-verified 2026-06-20 via `grep -rl "TBD - created by archiving"` across 207 spec
directories) still carry the seed,
including high-traffic capabilities (`combat-resolution`, `movement-system`,
`campaign-system`, `replay-library`, `multiplayer-server`). Because validation never inspects
the Purpose body, the seed string is treated as valid spec content — the SoT is ratifying
"this capability has no stated purpose" as a passing state.

Two further drifts compound the trust problem. The ACAR victory-probability scenario in
`combat-resolution` makes a behavioral claim (`>0.7` for 2:1 BV) the code provably cannot
produce — the implementation at `src/lib/combat/acar.ts:142-143` is the linear
`playerBV / (playerBV + opponentBV)`, so 2:1 is `8000/12000 = 0.667` exactly. And the
`critical-hit-resolution` / `critical-hit-system` pair both describe the same code area while
disagreeing on actuator-type count (7 vs 8), so a reader has two conflicting "sources of
truth" for one behavior.

The correct fix per `correct-fix-over-easy-fix` is not to silently rewrite 125 Purposes
(which patches the symptom and lets the archive flow re-introduce the seed next time). It is
to (1) correct the one provably-wrong behavioral scenario now, and (2) add a guard that makes
the placeholder a hard failure so the rot cannot recur, then drive the backfill from the
guard.

## Decisions

### D1 — ACAR scenario is corrected to the linear model, not the code "fixed" to match the spec

The spec is wrong, not the code. `calculateVictoryProbability` is the well-formed linear odds
model `playerBV / (playerBV + opponentBV)` (read at `acar.ts:142-143` this session; the
docstring at `acar.ts:130` even documents `calculateVictoryProbability(4000, 2000) // returns
0.667`). The `>0.7` claim came from imagining a curved/logistic model that was never built.
Rationale: the linear model is the shipped, tested behavior and is a reasonable BV-odds proxy;
inventing a curve to satisfy a stale scenario would be an unrequested behavior change. The
MODIFIED scenario therefore asserts `approximately 0.667 (2/3)` and the requirement names the
linear model explicitly so the next reader cannot re-introduce the curve assumption.

### D2 — The integrity guard lives in `openspec/scripts/`, mirroring the terminology tool

The repo already has an openspec-lint precedent: `openspec/scripts/terminology-tool.ts` +
`validate-terminology.js`, exposed via `npm run terminology:validate:strict`. The new
`spec-purpose-lint` follows the same shape — a node/tsx script scanning `openspec/specs/*/spec.md`,
a `package.json` script entry, and wiring into the spec gate. Rationale: simplest-solution-first
— reuse the existing lint surface instead of inventing a new validation framework. The guard's
failure conditions: (a) Purpose body contains the literal `TBD - created by archiving`;
(b) Purpose body is empty or a bare `TBD`; (c) (advisory→blocking-on-allowlist) a code home is
claimed by >1 capability not declared as a pointer.

### D3 — Duplicate-owner pairs are recorded now, merged as a tracked task — not merged inline

`critical-hit-resolution` (13 reqs) and `critical-hit-system` (7 reqs) both own the
criticalHitResolution area; `validation-rules-master` / `unit-validation-framework` /
`validation-patterns` overlap. The one-spec-per-capability rule is recorded in the
`validation-rules-master` delta as enforceable behavior, and the lint check carries a
known-duplicates allowlist that must shrink to empty. Rationale: the actual merge (deciding
which capability is canonical and rewriting the loser as a `## Purpose` pointer) is a design
decision per pair that deserves its own reviewed diff, not a drive-by inside a guard change.
The honest spec state: the guard is added and the rule is stated; the merges are enumerated as
remaining work, not claimed done.

### D4 — No bulk Purpose backfill in this change

Backfilling 125 Purposes inline would bury the two load-bearing edits (ACAR + guard) under a
mechanical sweep and invite a rubber-stamp review. The guard makes the 125 visible and
blocking; the backfill is task group 5, executed as one mechanical commit once the guard is
green, per-capability Purpose written from the originating change's proposal.

### D5 - Active-change ownership order is part of source-of-truth hygiene

The active change set currently has shared-capability overlap that can create planning drift
without violating OpenSpec shape: `tactical-map-interface` is modified by five active changes,
and `game-session-management` is modified by both `wire-interactive-turn-engine` and
`persist-and-recover-interactive-battles`. The source-of-truth guard therefore also records an
active-change ownership matrix before implementation begins. Rationale: the issue is not that
these changes are duplicates; it is that their intended order must stay visible so future
agents do not implement visual/perf work before movement and to-hit agreement, or recovery
work before session mutation semantics are stable.

## Open Questions

(none — the ACAR model, the placeholder count, and the actuator drift were all verified
against source this session.)

## Risks

- **Guard turns the tree red on first run (125 failures).** Mitigation: ship the guard with a
  time-boxed allowlist seeded from the current 125 (and the known duplicate pairs), then drain
  the allowlist in task group 5. The guard fails on *new* placeholders immediately; existing
  ones are tracked, not silently exempted forever (allowlist entries carry the owning change so
  they are auditable).
- **ACAR scenario correction could mask a real desire for a curved model.** Mitigation: D1
  records that the linear model is the deliberate, shipped behavior; any future curve is a
  separate behavioral change with its own proposal, not a spec-only edit.
- **Duplicate-owner merge deferred → drift persists in the interim.** Mitigation: the rule is
  stated and the pairs are named in the delta + allowlist, so the divergence is documented and
  on the backlog rather than invisible.
