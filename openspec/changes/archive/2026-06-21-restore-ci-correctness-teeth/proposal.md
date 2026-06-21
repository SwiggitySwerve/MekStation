# Change: Restore CI Correctness Teeth

## Why

The 2026-06-12 full codebase review (Wave 0 — Truth-in-reporting) found that the
repository's most load-bearing correctness signals have all migrated *out of* the
blocking PR lane, so a PR merges green without exercising the checks that would
catch a regression. "Green is systematically hollow" is named as systemic theme 3
of the audit; this change moves the teeth back into the gating path and stops the
suppression net from hiding real violations.

The verified gaps (each Read in this session against baseline `669905353`):

- **Statistical combat proofs are `it.skip`'d on PR CI (finding CI-1).** The PR
  `perf-smoke-tests` job sets `SIMULATION_COUNT: '5'`
  (`.github/workflows/pr-checks.yml:174`), and `integration.test.ts` gates its
  real existence assertions behind `statisticalIt = STATISTICAL_GAME_COUNT >=
  STATISTICAL_PROOF_GAME_MIN ? it : it.skip` with `STATISTICAL_PROOF_GAME_MIN =
  100` (`src/simulation/__tests__/integration.test.ts:73-75`). At count 5 every
  statistical proof is skipped; the real teeth run only in the non-gating
  nightly. A PR can change combat math and merge with zero statistical coverage.

- **The invariant suppression net hides violations behind broad regexes (finding
  CI / completeness gap 6).** `src/simulation/core/knownLimitations.ts:44-146`
  filters violation messages by category regexes that are far broader than their
  label — `/punch|kick|charge|push/i` (line 49) also matches "discharge",
  `/line.*of.*sight|los/i` (line 109) also matches "loss" / "close" — and *only*
  the invariant named exactly `battlemech-combat-validation` bypasses the filter
  (`KNOWN_LIMITATION_BYPASS_INVARIANTS`, lines 166-168). A newly-added detector
  whose message merely contains a common combat word is silently swallowed unless
  its author also discovers and edits the single-entry bypass set.

- **Perf wall-clock budgets run in NO PR lane (finding CI-6).** In
  `src/simulation/__tests__/simulation.test.ts:31-35`, `perfIt` becomes `it.skip`
  whenever `JEST_EXCLUDE_PERF_SENSITIVE === 'true'`. The PR `unit-test-shards` job
  sets exactly that env (`pr-checks.yml:149`), and the `perf-smoke-tests` job does
  not run `simulation.test.ts` at all (its `--runTestsByPath` list,
  `pr-checks.yml:168-172`, omits the file). The budgets only execute in the
  nightly lane that sets `SIMULATION_PERF_ASSERTIONS=true`.

- **The networked-multiplayer player journey has zero e2e coverage (finding
  CI-2).** `e2e/p2p-sync.spec.ts:264-285` holds three `test.skip` bodies with
  empty implementations; the multi-peer flow is never asserted.

- **Navigation e2e specs `test.skip`-on-missing-data without seeding (finding
  CI-3).** `e2e/replay-player.spec.ts:137-140` calls `test.skip(pilotCount === 0,
  …)`, so in a clean CI database the spec vacuously passes — it never exercises
  the navigation it claims to cover because no fixture seeds the pilot.

- **Coverage thresholds are never gated on PRs (finding CI low).** No PR
  `pr-checks.yml` job enforces a coverage floor; coverage runs nightly-only and
  below baseline.

Until these signals are blocking, Waves 1-3 of the remediation plan cannot be
trusted to be verified — which is exactly why this change is sequenced in Wave 0.

## What Changes

- Run at least one mid-size statistical combat batch as a **required PR check**:
  a bounded `SIMULATION_COUNT` (large enough that `statisticalIt` runs, i.e.
  `>= STATISTICAL_PROOF_GAME_MIN`) executes `integration.test.ts`'s statistical
  proofs in the gating lane, with a PR-budget time cap; the full nightly batch is
  retained as the high-confidence run. Equivalent guarantee: a passing nightly
  statistical batch becomes a merge requirement for combat-touching PRs.
- **Narrow / scope the `knownLimitations` regexes and require explicit
  per-invariant opt-in.** Patterns must use anchored / word-boundary matching so
  "discharge" / "loss" / "close" no longer trip combat buckets, and suppression
  must apply only to detectors that *explicitly opt in* (e.g. a `legacyGeneric`
  flag or an allowlist of legacy detector names) rather than to any violation
  whose message text happens to match a broad pattern. New detectors are visible
  by default; suppression is the carve-out.
- **Move perf wall-clock budgets into a blocking PR lane.** `simulation.test.ts`'s
  `perfIt` budgets run as a required check with PR-sized env caps (no longer
  skipped by `JEST_EXCLUDE_PERF_SENSITIVE` in every PR lane simultaneously), so a
  perf regression fails a PR rather than only the nightly.
- **Seed e2e fixtures so navigation specs assert unconditionally.** Replace the
  `test.skip`-on-missing-data guard in `replay-player.spec.ts` with a seeded
  pilot fixture; the spec asserts the Career History tab unconditionally. The
  multiplayer journey in `p2p-sync.spec.ts` is either wired to a real assertion
  or its skip is converted to an explicit, enumerated `test.fixme` tied to an
  open follow-up — never a silent empty body.
- **Gate a coverage floor on PRs** for the combat/simulation source trees so
  coverage can only rise, not silently erode.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `e2e-testing`: "Subsystem Validation Coverage" gains an unconditional-assertion
  constraint (no `test.skip`-on-missing-data without seeding); new requirements
  add seeded-fixture navigation assertions, an honest multiplayer-journey
  coverage status, and a PR-gated coverage floor.
- `simulation-system`: "Statistical Validation" gains a blocking-PR-lane gate
  requirement (mid-size batch required, or passing nightly required to merge);
  "Programmatic Exclusion" (known-limitations) is tightened to anchored regexes +
  explicit per-invariant opt-in; new requirements add a PR-gated perf-budget lane.

## Impact

- `.github/workflows/pr-checks.yml` — add/retarget jobs: a statistical-proof PR
  job (or nightly-required gate), a perf-budget PR job that runs
  `simulation.test.ts` without `JEST_EXCLUDE_PERF_SENSITIVE`, and a coverage-floor
  job; adjust the `lint-and-test` aggregator `needs` list.
- `src/simulation/core/knownLimitations.ts` — anchor the category regexes; replace
  message-text matching with explicit per-invariant opt-in (flag or allowlist);
  keep the contract traps in `CombatValidationScopeSupport.ts` in lockstep.
- `src/simulation/__tests__/integration.test.ts` — confirm the statistical batch
  runs under the new PR env; no math change.
- `src/simulation/__tests__/simulation.test.ts` — the `perfIt` budgets execute in
  the new PR perf job.
- `e2e/replay-player.spec.ts` — seed a pilot fixture; drop the conditional skip.
- `e2e/p2p-sync.spec.ts` — wire the multi-peer journey assertion or convert the
  skips to enumerated `test.fixme`.
- `e2e/helpers/campaignSeeders.ts` (and/or a new replay/pilot seeder) — provide the
  fixture the navigation spec needs.

## Non-goals

- No combat-math or simulation-rule change — this change only repositions which
  lane the existing checks run in and how violations are surfaced (finding CI is a
  measurement-integrity issue, not a parity fix).
- Not the BV-harness green-on-zero fix (D-1) — that is the sibling
  `restore-bv-parity-reproducibility` change.
- No spec-Purpose / SoT reconciliation (125 TBD purposes, ACAR contradiction) —
  that is the sibling `reconcile-spec-source-of-truth` change.
- No new e2e subsystem specs beyond fixing the conditional-skip / empty-skip
  pattern; the 19-subsystem matrix scope is unchanged.
- Wiring the multiplayer transport itself is out of scope (owned by Wave 2
  `reconcile-multiplayer-coop-reality`); this change only makes the *coverage
  status* of the MP journey honest.
