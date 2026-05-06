# Add Shipped Engine Spec Coverage

## Why

Recent engine work landed in main without explicit OpenSpec deltas, leaving source-of-truth specs out of sync with code:

- **PR #514** (`fix(swarm-harness): prewarm BV from validation report + raise MAX_TURNS to 100`) shipped on 2026-05-06 as a bug fix, not through the OpenSpec workflow. Two material behavioral changes are now in `main` with no spec coverage:
  1. The simulation engine's `MAX_TURNS` ceiling lifted from `10` → `100` in `src/simulation/runner/SimulationRunnerConstants.ts`.
  2. A new `BVCatalogPrewarmer` module (`src/services/encounter/bvCatalogPrewarmer.ts`) introduced a two-tier BV resolution path (validation report → calculator fallback) with a disk cache at `.cache/swarm-bv-cache.json` keyed on catalog version.

- The archived `add-encounter-swarm-harness` change (archived 2026-05-06 at `openspec/changes/archive/2026-05-06-add-encounter-swarm-harness/`) auto-merged its delta specs into source-of-truth on archive, but during that archive a known headers-mismatch issue forced converting some `MODIFIED` headers to `ADDED`. Two requirement areas may have inconsistent or missing coverage in source-of-truth specs:
  1. The `it.skip`'d determinism test (`integration.test.ts: should produce identical results for same seed`) flags a real engine non-determinism (~1 event divergence over 300+) at the new turn ceiling. No source-of-truth spec acknowledges or constrains this gap.
  2. The grep audit guard for `Math.random` in `src/utils/gameplay/` and `src/simulation/` is enforced by no source-of-truth requirement.

This change retroactively specs the merged behavior so future contributors can read the spec to understand what's expected, rather than archaeology'ing PR titles + commit messages.

## What Changes

### `simulation-system` deltas

- **MAX_TURNS engine ceiling** — pin the value at 100 with explicit rationale (was 10, lifted to unblock real catalog 2v2+ encounters that produced 100% Incomplete outcomes at the lower ceiling).
- **`it.skip`'d determinism gap** — formally scope the determinism contract: same-seed runs MUST produce byte-identical event logs UP TO turn N; beyond N the engine is permitted to diverge by at most 1 event per 300 within a tracked-debt window. Add follow-on requirement: a future change MUST close the residual gap.

### `combat-resolution` deltas

- **`Math.random` audit guard** — formal CI requirement that no `Math.random()` call exist in `src/utils/gameplay/` or `src/simulation/` outside the explicit `defaultD6Roller` definition. The guard catches regressions before they corrupt seeded test runs.

### `quick-session` deltas

- **BV prewarm contract** — the swarm CLI runner MUST prewarm BV before any force generation; `BudgetUnsatisfiableError` from an unprewarmed catalog is a known failure mode that the prewarmer prevents.
- **Two-tier BV resolution** — Tier 1 reads `validation-output/bv-validation-report.json`; Tier 2 falls back to `calculateUnitBV()` for entries the report doesn't cover.
- **Disk cache contract** — keyed on catalog `version` + `totalUnits`; located at `.cache/swarm-bv-cache.json`; gitignored.

### `combat-analytics` deltas

- **Turn-cap reconciliation** — metrics `averageTurns` / `incompleteGameRate` reporting MUST account for the `MAX_TURNS=100` ceiling, NOT silently report against an old `10` value.

## Dependencies

- **Reflects**: PR #514 (already merged into `main` at 22dc7884).
- **Reflects**: archived `add-encounter-swarm-harness` (already in source-of-truth specs).
- **Sibling to**: open PR #515 (`add-combat-fidelity-suite`) — both are spec-only changes describing engine behavior. They are independent (different filename ownership) and can land in either order.

## Impact

- **Affected specs**: `simulation-system` (MODIFIED/ADDED), `combat-resolution` (ADDED), `quick-session` (ADDED), `combat-analytics` (MODIFIED).
- **Affected code**: NONE. This change is purely descriptive — it documents behavior already in `main`.
- **Risk**: low. Failure mode is "future contributor reads stale spec, builds wrong assumption" — the same risk that exists today, just slightly worse without this retrofit.

## Non-Goals

- No code changes. If retroactive review reveals a behavior bug in PR #514, fix it under a separate change.
- No deprecation of the `it.skip`'d determinism test. The test stays skipped until the determinism audit follow-on closes the gap; this change just makes the gap formally visible in the spec.
- No expansion of the BV cache contract beyond what PR #514 actually shipped. The cache is single-process, in-memory + on-disk, no concurrency considerations.
