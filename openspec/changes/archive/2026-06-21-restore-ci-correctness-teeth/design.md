# Design: Restore CI Correctness Teeth

## Context

The audit's headline is "an excellent rules library wearing the costume of a
finished game", and its systemic theme 3 is that the most load-bearing
correctness signals have migrated *out of* the blocking path while CI stays
green. This change is Wave 0 work: it does not fix any combat rule — it repairs
the *gate* so that Wave 1-3 fixes are actually verified and future regressions
fail a PR instead of silently degrading.

Five signals are off the gating path (all verified in this session against
`669905353`):

1. Statistical combat proofs (`integration.test.ts`) skip at the PR
   `SIMULATION_COUNT=5` because `statisticalIt` requires `>= 100`.
2. The `knownLimitations` net suppresses violations by broad message-text regex,
   with a single hard-coded bypass invariant.
3. Perf wall-clock budgets (`simulation.test.ts` `perfIt`) skip in every PR lane.
4. The networked-multiplayer e2e journey is three empty `test.skip` bodies.
5. A navigation e2e (`replay-player.spec.ts`) `test.skip`s on missing data with
   no seeding, so it vacuously passes in clean CI.

The constraint is the **PR time budget**: the gating lane cannot run the full
1000-game nightly batch. The design therefore picks bounded-but-meaningful
batch sizes for the PR lane and keeps the full batch as the nightly
high-confidence run.

## Decisions

### D1. Statistical proofs gated via a mid-size PR batch (with a nightly-required fallback)

Run `integration.test.ts` in a dedicated PR job with `SIMULATION_COUNT` set to at
least `STATISTICAL_PROOF_GAME_MIN` (currently 100) so `statisticalIt` resolves to
`it` and the existence assertions actually execute, bounded by a PR-sized time cap
(reuse the `perf-smoke-tests` pattern of explicit `SIMULATION_PROFILE_*` env
caps). The full nightly 1000-game batch is retained as the high-confidence run.

Rationale: the audit names the precise mechanism — `SIMULATION_COUNT=5 <
STATISTICAL_PROOF_GAME_MIN=100`. Raising only the *gating* lane's count to the
threshold is the minimum that restores teeth without changing any test math.
The spec is written to permit an equivalent guarantee — **a passing nightly
statistical batch as a documented merge requirement** for combat-touching PRs —
so the implementer can choose the cheaper-sufficient mechanism if the mid-size
batch proves too slow for the PR budget. The spec mandates the *guarantee* (no
combat-touching PR merges without a statistical proof having passed), not one
specific job layout.

### D2. Known-limitations: anchored regexes + explicit per-invariant opt-in

Two coupled changes to `knownLimitations.ts`:

- **Anchor the category patterns** so they match whole tokens, not substrings:
  `/punch|kick|charge|push/i` becomes word-boundary-anchored (`\b(?:punch|kick|
  charge|push)\b`) so "discharge" no longer matches; `/line.*of.*sight|los/i`
  becomes `\bline of sight\b|\blos\b` so "loss" / "close" no longer match. Every
  bucket is reviewed for the same substring-bleed class.
- **Invert the default from suppress-by-text to opt-in-by-invariant.** Suppression
  applies only to violations whose `invariant` is on an explicit
  legacy-detector allowlist (or carries an explicit `legacyGeneric` marker), not
  to any violation whose `message` happens to match a pattern. A new detector is
  *visible by default*; suppressing it is a deliberate, named act. The existing
  single-entry `KNOWN_LIMITATION_BYPASS_INVARIANTS` (only
  `battlemech-combat-validation`) is the inverse of what we want — the safe
  posture is an allowlist of *suppressible* legacy detectors, with everything else
  surfaced.

Rationale: the audit's completeness gap 6 calls out both the substring bleed and
the single-invariant bypass as the mechanism by which "newly-added detectors
whose message contains common combat words are silently swallowed." The
contract traps in `CombatValidationScopeSupport.ts` (one validation trap per
category) must be updated in lockstep — the module's own header documents this
constraint.

### D3. Perf budgets in a blocking PR lane with PR-sized caps

Add a PR job that runs `simulation.test.ts` *without* `JEST_EXCLUDE_PERF_SENSITIVE`
(or with `SIMULATION_PERF_ASSERTIONS=true`, which the file already honors as an
override at line 32) and with PR-sized wall-clock budget envs. The
`unit-test-shards` lane keeps `JEST_EXCLUDE_PERF_SENSITIVE=true` (sharded runners
are contended; wall-clock there is noise, per the file's own comment) — the new
job is the dedicated, uncontended budget runner.

Rationale: the budgets already have an override seam (`SIMULATION_PERF_ASSERTIONS`).
The minimum fix is to add one PR lane that flips it on, not to rewrite the gate.
PR-sized caps (not the local 1500-2250 ms defaults) keep the lane inside the PR
budget while still failing on gross regressions.

### D4. Seed e2e fixtures; make navigation assert unconditionally; multiplayer skip is honest

For `replay-player.spec.ts`: seed a pilot via `e2e/helpers/campaignSeeders.ts`
(the seeder the e2e-testing spec already mandates for read-only subsystems) so
`pilotCount` is never 0, then drop `test.skip(pilotCount === 0, …)` and assert the
Career History tab unconditionally.

For `p2p-sync.spec.ts`: the three empty `test.skip` multi-peer bodies are either
(a) wired to a real assertion if the transport supports it in the e2e harness, or
(b) converted to explicit `test.fixme` with a comment naming the Wave 2
`reconcile-multiplayer-coop-reality` follow-up. A silent empty `test.skip` that
looks like coverage but asserts nothing is forbidden — the coverage status must be
*honest*, matching the audit's truth-in-reporting framing.

Rationale: a conditional skip that fires in clean CI is indistinguishable from a
deleted test. Seeding is the e2e-testing spec's own prescribed mechanism for
read-only surfaces, so this aligns the failing spec with the existing
requirement rather than inventing a new pattern.

### D5. Coverage floor gated on PRs for the combat/simulation trees

Add a PR coverage job that enforces a minimum coverage threshold (set at or below
current measured coverage to avoid an immediate red, ratcheting up over time) for
`src/utils/gameplay/**` and `src/simulation/**`. Coverage can rise but not
silently erode.

Rationale: the audit's low finding is "coverage thresholds never gated on PRs
(nightly-only, below baseline)". A ratcheting floor is the standard minimum-risk
way to stop erosion without blocking on aspirational targets.

## Open Questions

- D1 mechanism choice: mid-size PR batch vs nightly-required-status. The spec
  mandates the guarantee, not the job; the implementer picks based on the measured
  wall-clock of a 100-game batch under the PR runner. Investigation task 1.1
  resolves this before the CI job is authored.
- D5 initial threshold value: must be measured from a current coverage run
  (task 1.3) before being pinned, to avoid an immediate red gate.

## Risks

- **PR wall-clock blowout (D1/D3).** A 100-game statistical batch plus perf
  budgets could push the PR lane past its time budget. Mitigation: PR-sized env
  caps, run in dedicated uncontended jobs (not on the contended shards), and the
  D1 fallback to a nightly-required status if the batch is too slow.
- **knownLimitations contract-trap breakage (D2).** Anchoring regexes and
  inverting the default will change which messages the category traps match; the
  `CombatValidationScopeSupport.ts` traps must move in lockstep or the contract
  tests fail. Mitigation: task group 3 updates traps and tests together; the
  red-first probe (task 1.2) pins the current suppression behavior before the
  change.
- **Flaky statistical assertions at mid-size (D1).** Existence assertions that are
  reliable at 1000 games may be marginal at 100. Mitigation: keep the PR batch at
  exactly `STATISTICAL_PROOF_GAME_MIN` or above, and if an assertion proves flaky
  at that size, widen its tolerance per the repo's 3× perf-budget convention with
  an explanatory comment rather than re-skipping.
- **e2e seeding coupling (D4).** The pilot seeder must produce data the
  Career-History tab actually renders; a thin seed re-introduces a vacuous pass.
  Mitigation: assert on seeded *values*, not mere presence, per the e2e-testing
  read-only-subsystem requirement.
