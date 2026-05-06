# Tasks — Add Shipped Engine Spec Coverage

## Phase 0 — Author retrofit deltas (~2h, single PR)

- [x] 0.1 Author `specs/simulation-system/spec.md` with: MAX_TURNS engine-ceiling requirement; determinism-gap acknowledgment requirement.
- [x] 0.2 Author `specs/combat-resolution/spec.md` with: `Math.random` audit guard CI gate requirement.
- [x] 0.3 Author `specs/quick-session/spec.md` with: BV prewarm contract; two-tier resolution; disk cache invalidation rules.
- [x] 0.4 Author `specs/combat-analytics/spec.md` with: turn-cap reconciliation in averageTurns / incompleteGameRate.
- [x] 0.5 Run `openspec validate add-shipped-engine-spec-coverage` — passes.
- [x] 0.6 Cross-reference with archived `add-encounter-swarm-harness` deltas — no double-coverage of identical requirements.

## Phase 1 — Open PR + verify

- [x] 1.1 Push branch `docs/retrofit-shipped-engine-specs`.
- [x] 1.2 Open PR `docs(openspec): retrofit shipped engine spec coverage`.
- [x] 1.3 Wait for CI green (no code changes; only OpenSpec validation runs in CI).
- [x] 1.4 Spec-verifier on the change before archive — APPROVE.
- [x] 1.5 Merge. (PR #516 squash-merged at 9a12dcec.)

## Phase 2 — Archive

- [x] 2.1 `openspec archive add-shipped-engine-spec-coverage`.
- [x] 2.2 Confirm source-of-truth specs at `openspec/specs/{simulation-system,combat-resolution,quick-session,combat-analytics}/spec.md` now contain the retrofit requirements.
- [ ] 2.3 Push archive PR.
- [ ] 2.4 Merge archive PR.

## Out of scope

- Closing the determinism gap (follow-on: `add-engine-determinism-audit`, named in `add-combat-fidelity-suite` tasks.md).
- Any code changes — this is a documentation retrofit only.
