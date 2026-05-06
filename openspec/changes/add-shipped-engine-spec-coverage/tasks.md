# Tasks — Add Shipped Engine Spec Coverage

## Phase 0 — Author retrofit deltas (~2h, single PR)

- [ ] 0.1 Author `specs/simulation-system/spec.md` with: MAX_TURNS engine-ceiling requirement; determinism-gap acknowledgment requirement.
- [ ] 0.2 Author `specs/combat-resolution/spec.md` with: `Math.random` audit guard CI gate requirement.
- [ ] 0.3 Author `specs/quick-session/spec.md` with: BV prewarm contract; two-tier resolution; disk cache invalidation rules.
- [ ] 0.4 Author `specs/combat-analytics/spec.md` with: turn-cap reconciliation in averageTurns / incompleteGameRate.
- [ ] 0.5 Run `openspec validate add-shipped-engine-spec-coverage` — passes.
- [ ] 0.6 Cross-reference with archived `add-encounter-swarm-harness` deltas — no double-coverage of identical requirements.

## Phase 1 — Open PR + verify

- [ ] 1.1 Push branch `docs/retrofit-shipped-engine-specs`.
- [ ] 1.2 Open PR `docs(openspec): retrofit shipped engine spec coverage`.
- [ ] 1.3 Wait for CI green (no code changes; only OpenSpec validation runs in CI).
- [ ] 1.4 Spec-verifier on the change before archive — APPROVE.
- [ ] 1.5 Merge.

## Phase 2 — Archive

- [ ] 2.1 `openspec archive add-shipped-engine-spec-coverage`.
- [ ] 2.2 Confirm source-of-truth specs at `openspec/specs/{simulation-system,combat-resolution,quick-session,combat-analytics}/spec.md` now contain the retrofit requirements.
- [ ] 2.3 Push archive PR.
- [ ] 2.4 Merge archive PR.

## Out of scope

- Closing the determinism gap (follow-on: `add-engine-determinism-audit`, named in `add-combat-fidelity-suite` tasks.md).
- Any code changes — this is a documentation retrofit only.
