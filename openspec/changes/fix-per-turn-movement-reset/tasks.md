## 1. Regression proof

- [x] 1.1 Run existing replay, digest, and fixture suites before implementation.
- [x] 1.2 Add both-path two-turn tests and record the failing run.

## 2. Shared movement lifecycle

- [x] 2.1 Extract existing booster advancement without changing its results.
- [x] 2.2 Implement Shared Per-Turn Movement Reset in phaseManagement and SimulationRunnerState.
- [x] 2.3 Verify Booster Counters Advance Once Per Turn, including duplicate event boundaries.
- [x] 2.4 Document movement lifecycle ownership and pinned MegaMek evidence.

## 3. Validation

- [x] 3.1 Kill a mutant that skips the helper in one path, then restore it.
- [x] 3.2 Rerun the existing replay/digest/fixture suites unchanged; stop on fixture differences.
- [x] 3.3 Run focused suites, both tsc configs, lint:units and its Jest suite, root lint at no more than 63 warnings, oxfmt, and strict change validation.
- [ ] 3.4 Open one draft PR and report hosted CI to Root; never merge.

## Recorded evidence

- Before the fix, both new suites failed: 9 failures and 1 passing test.
- The extracted booster lifecycle produced byte-identical output across 99
  combinations of counter values, activation, and prior escalation, SHA-256
  `b19e4f9cce9efda3c9bd92abd9c285495b259727fb7521ef5c02b60f7e32f7e1`.
  The existing runner booster suite passed before changing reset behavior.
- Removing the runner's helper call caused all 5 runner regressions to fail;
  the call was restored immediately.
- Existing replay/checkpoint/schema, command digest, decision/journal recovery,
  P2P RNG replay, runner replay-source, simulation replay determinism, and
  snapshot-replay coverage passed before and after: 34 suites, 757 tests.
  No committed fixture or golden digest changed.
- Local SQLite tests use Node 22 to match the existing native binary.
  The local dependency view excludes an extraneous legacy `@types/electron`
  package absent from the lockfile; tracked dependencies are unchanged.
- Focused movement/reducer/heat suites and lint-units Jest coverage passed:
  37 suites, 184 tests (including 13 new regression cases). Both tsc configs
  passed. `lint:units` passed at 17084/17085, root lint reported 63 warnings
  and zero errors, changed files passed oxfmt, and the change passed strict
  OpenSpec validation. Hosted CI remains a separate check.
