# Tasks: Restore CI Correctness Teeth

## 1. Investigation and red-first evidence

- [ ] 1.1 Measure the wall-clock of `integration.test.ts` at `SIMULATION_COUNT=100`
  under the CI runner profile (record in the PR description). This resolves
  design Open Question D1 — mid-size PR batch vs nightly-required status — and
  decides the shape of the CI job authored in task 2.
- [ ] 1.2 Write a red-first suppression probe: a unit test that constructs an
  `IViolation` with `invariant: 'some-new-detector'` and `message` containing the
  word `discharge` (or `loss`/`close`) and asserts that `isKnownLimitation` /
  `filterKnownLimitations` in `src/simulation/core/knownLimitations.ts`
  **currently swallows it** (proves the substring-bleed + suppress-by-default
  hazard is observable before the fix). The probe flips to asserting the violation
  is surfaced after task 3.
- [ ] 1.3 Run a coverage report for `src/utils/gameplay/**` and `src/simulation/**`
  and record the current per-tree numbers, so the D5 floor (task 5) is pinned at
  or below measured coverage and does not red-gate on merge.
- [ ] 1.4 Confirm `e2e/replay-player.spec.ts:137` `test.skip(pilotCount === 0, …)`
  fires in a clean CI database (no seed) — demonstrate the vacuous pass before
  task 4 seeds it.

## 2. Statistical-proof PR gate

- [ ] 2.1 Add a blocking PR job in `.github/workflows/pr-checks.yml` that runs
  `src/simulation/__tests__/integration.test.ts` with `SIMULATION_COUNT` set
  `>= STATISTICAL_PROOF_GAME_MIN` (the `integration.test.ts:73` constant, 100) so
  `statisticalIt` (`integration.test.ts:74-75`) resolves to `it` and the existence
  assertions execute; pin PR-sized `SIMULATION_PROFILE_*` time caps.
- [ ] 2.2 If task 1.1 shows the mid-size batch exceeds the PR budget, instead wire
  the nightly statistical batch as a *required status* for combat-touching PRs
  (per design D1 fallback) and document the merge requirement in the workflow
  comment. Either path satisfies the spec guarantee.
- [ ] 2.3 Add the new job to the `lint-and-test` aggregator `needs` list
  (`pr-checks.yml:425-440`) so branch protection picks it up under the preserved
  required-check name.

## 3. Known-limitations suppression net

- [ ] 3.1 In `src/simulation/core/knownLimitations.ts`, anchor every category
  pattern in `KNOWN_LIMITATION_PATTERNS` (lines 44-146) to whole-token / phrase
  matching — e.g. `/punch|kick|charge|push/i` → word-boundary form so `discharge`
  no longer matches; `/line.*of.*sight|los/i` → `\bline of sight\b|\blos\b` so
  `loss`/`close` no longer match. Review all 11 buckets for the same substring
  bleed.
- [ ] 3.2 Invert suppression from suppress-by-message-text to explicit
  per-invariant opt-in: `isKnownLimitation` / `filterKnownLimitations` /
  `partitionViolations` SHALL suppress only violations whose `invariant` is on an
  explicit legacy-detector allowlist (or carries an explicit `legacyGeneric`
  marker). New detectors are surfaced by default. Retire the inverted
  single-entry `KNOWN_LIMITATION_BYPASS_INVARIANTS` posture in favor of the
  suppressible-allowlist posture.
- [ ] 3.3 Update the contract traps in
  `src/simulation/runner/CombatValidationScopeSupport.ts` (one validation trap per
  category) in lockstep with the regex/opt-in change so the pinning tests still
  pass; update `src/simulation/known-limitations.md` human-readable doc.
- [ ] 3.4 Flip the task-1.2 probe to assert the new-detector violation is now
  surfaced (not swallowed) and add a positive trap proving a genuinely legacy
  allowlisted detector is still suppressed.

## 4. Perf-budget PR lane

- [ ] 4.1 Add a blocking PR job in `pr-checks.yml` that runs
  `src/simulation/__tests__/simulation.test.ts` with `SIMULATION_PERF_ASSERTIONS=true`
  (the override `perfIt` already honors at `simulation.test.ts:32`) and PR-sized
  wall-clock budget envs, in a dedicated uncontended runner — NOT on the
  `unit-test-shards` lane (which keeps `JEST_EXCLUDE_PERF_SENSITIVE=true`).
- [ ] 4.2 Add the perf-budget job to the `lint-and-test` aggregator `needs` list.

## 5. Coverage floor PR gate

- [ ] 5.1 Add a PR coverage job enforcing a minimum threshold (set at or below the
  task-1.3 measured numbers) for `src/utils/gameplay/**` and `src/simulation/**`;
  fail the PR if coverage drops below the floor. Add to the aggregator `needs`.

## 6. E2E seeding and honest skip

- [ ] 6.1 Add a pilot seeder (extend `e2e/helpers/campaignSeeders.ts` or a sibling
  replay/pilot seeder) that guarantees at least one pilot exists before
  `e2e/replay-player.spec.ts` navigates.
- [ ] 6.2 In `e2e/replay-player.spec.ts`, remove the `test.skip(pilotCount === 0,
  …)` guard (lines 137-140) and assert the Career History tab and its seeded
  values unconditionally.
- [ ] 6.3 In `e2e/p2p-sync.spec.ts`, replace the three empty `test.skip` multi-peer
  bodies (lines 264-285) with either a real assertion (if the harness supports the
  transport) or explicit `test.fixme` entries each commented with the Wave 2
  `reconcile-multiplayer-coop-reality` follow-up — no silent empty skips remain.

## 7. Verification and documentation

- [ ] 7.1 Full verification: `npx tsc --noEmit`, `npm run lint`, the affected Jest
  suites (`integration.test.ts` at gating count, `simulation.test.ts` perf
  budgets, the `knownLimitations` traps + probe), and the two Playwright specs
  green; run `npx openspec validate restore-ci-correctness-teeth --strict`.
- [ ] 7.2 Confirm the `lint-and-test` aggregator gates on all new jobs and that a
  deliberately-introduced statistical/perf/coverage regression fails a PR (smoke
  the gate, not just the tests).
- [ ] 7.3 Record in the PR description which D1 mechanism was chosen (mid-size PR
  batch vs nightly-required) and the pinned coverage-floor values, closing the
  design Open Questions.
