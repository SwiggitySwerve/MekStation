## 1. Regression proof

- [x] 1.1 Record failing tests for occupied ports, overrides, startup ordering,
  child lifecycle, and production-evidence wiring.

## 2. Safe startup

- [x] 2.1 Implement and document the shared guard and development launcher.
- [x] 2.2 Route both development scripts and production evidence through it.
- [x] 2.3 Correct obsolete startup comments without changing CI overrides.

## 3. Verification

- [x] 3.1 Kill the destructive-prefix and hardcoded-port mutants.
- [x] 3.2 Run scripts tests, integration tests, both TypeScript configs, unit
  lint and its suite, root lint, formatting, OpenSpec, and cache budgets.
- [ ] 3.3 Open a draft PR documenting the CI callers and hosted check state.

## Local verification

- D-9: 23 focused tests pass on Node 22 and Node 24; both deliberate mutants
  are caught. The full directory run also passes both D-9 suites.
- Whole scripts and integration Jest run on Windows / Node 24: 200 suites
  pass, two fail (three child-process timeouts and one temporary Git-directory
  cleanup EPERM in unchanged roadmap/identity fixtures). All four failing cases
  pass in targeted Node 22 reruns, without changing code or deadlines.
- Node script suites: 167 pass. Python script tests: 337 pass. Both TypeScript
  configs, unit lint, root lint (63 warnings), formatting, OpenSpec delta, and
  OpenSpec CI validation pass. Cache census: 57 unkeyable and 92 repo-wide,
  including the new keyed test; no budget changes.
