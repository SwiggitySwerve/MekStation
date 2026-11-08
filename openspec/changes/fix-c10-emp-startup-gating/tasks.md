## 1. Behavior-preserving extraction

- [x] 1.1 Characterize startup eligibility and session EMP countdown.
- [x] 1.2 Extract both rules, compare representative outputs, and verify existing
  replay/digest/golden suites unchanged before committing the extraction.

## 2. C10 correction

- [x] 2.1 Record failing tests for EMP expiry in both paths and startup/shutdown
  branch exclusivity, including KO rolled-startup failure.
- [x] 2.2 Implement EMP-Gated Heat Startup and Exclusive Heat Shutdown Checks,
  preserving recorded event replay and existing heat constants.
- [x] 2.3 Verify interactive, engine, runToCompletion/QuickResolve/fast-forward,
  multiplayer journal authority, P2P translation/mirroring, and runner paths.
- [x] 2.4 Kill and restore all three mutants: premature startup, disabled runner
  countdown, and restored second shutdown check. Record the killing tests.

## 3. Gates and delivery

- [x] 3.1 Run full touched/consumer test directories and integration, plus runner,
  replay/digest/golden gates before/after. Stop on protected expectation changes.
- [x] 3.2 Run validate:combat, both tsc configs, lint:units and its Jest suite,
  root lint <=63 warnings, oxfmt, OpenSpec validation, and budget check <=57.
- [x] 3.3 Re-anchor shifted runner source citations by content and list every
  edited catalog in the draft PR. Open one draft PR and never merge.

## Recorded evidence

- The uncommitted probe at `ab42e8b1b` scanned 3,849 tracked test/fixture
  candidates. EMP shutdown cases exist in movementPhase.behavior.09,
  physicalAttackRunner.behavior.16, and phaseManagement tests; those cases do
  not continue through a later heat phase. The CombatMissionBaselineSchemaPack
  fixture records interference only. Sample runs with seeds 42, 1337, and 12345
  emitted no EMP shutdowns. Applying an old successful startup event still
  cleared shutdown with a positive EMP counter.
- Node 22.22.0, matching CI's Node 22 and the existing SQLite native ABI.
- Extraction commit `410e054ea` preserves representative outputs across 49
  cases, SHA-256 `0799e83a03212f406c61977983e128ee6d13fca49d86fe487fcc1ec0e9925d20`.
  Its characterization/countdown suites passed 26 tests, and the existing
  replay/checkpoint/digest/determinism/engine baseline passed 29 suites and 751
  tests before and after extraction. Both tsc configs passed; root lint had 63
  warnings and zero errors.
- Before the correction, the first regression run had 10 assertion failures;
  engine/recovery/multiplayer/P2P entry tests added 6 failing assertions. After
  the correction, all 7 focused suites passed, 102 tests. No existing seeded
  expectation was edited.
- Premature-startup mutant: removing the positive EMP timer guard failed
  `EMP startup gate blocks startup with 1/6 EMP rounds left` and
  `C10 heat startup lifecycle parity keeps EMP shutdown through heat with 1/6
  rounds left`.
- Countdown-disabled mutant: preserving the runner timer failed
  `C10 heat startup lifecycle parity expires runner EMP shutdown after exactly
  two new-turn boundaries`.
- Second-shutdown-check mutant: calling the runner shutdown check after startup
  failed `C10 heat startup lifecycle parity does not check shutdown after rolled
  startup success=true`.
- Each mutant was restored byte-for-byte before the next run. Source-reference
  updates match surviving source content rather than adding line offsets.
- The final replay baseline passed 29 suites and 753 tests: all 751 original
  tests plus two new engine cases. No fixture, pinned digest, seeded snapshot,
  or existing exact-roll expectation was changed.
- `npm run validate:combat` passed 79 suites and 2,095 tests, all subsequent
  gap-inventory checks, and strict OpenSpec validation.
- Final static gates passed both tsc configs, root lint at 63 warnings and zero
  errors, lint:units at 17,069/17,085 and its 33-test suite, oxfmt, strict change
  validation, and the CI budget at exactly 57 unkeyable tests (3,044 files).
- Full directory validation passed 852 suites and 13,387 tests, with 35 skipped
  tests and no snapshots updated. Selection included all gameplay, runner,
  engine, multiplayer-server, P2P, integration, simulation, fast-forward, stores,
  pre-battle, phase-helper, and constant test directories. This includes the
  default 1,000-run throughput suite and the 100-game simulation integration
  suite. Jest reported a worker teardown warning after the passing sweep and
  exited successfully; the source of that warning was not isolated.
- Merged main `1f3ada8888d9f99a06e4ba0ed3478a9810f848c3`, retaining all
  27 OpenSpec ledger entries. The combined tree then passed the same full
  directory selection: 853 suites, 13,415 passing tests, 35 skipped tests,
  zero failed tests, and no snapshots updated. The post-merge sweep did not
  repeat the worker teardown warning.
- Post-merge replay validation again passed 29 suites and 753 tests. Combat
  validation again passed 79 suites and 2,095 tests plus every inventory and
  strict-spec step. Both tsc configs, lint (63 warnings, zero errors), lint:units
  (17,069/17,085) and its 33-test suite, formatting, strict change validation,
  and the budget (3,048 files, exactly 57 unkeyable tests) passed again. No
  protected expectation or persisted format was changed.

## Ledger migration and C1 merge

- Merged fetched main `1ec2f3cee`, including C1 operability/exit-latch changes
  and the #3043 accounting rule. Resolved each conflicted runner citation by
  matching surviving source content against the merged tree, including the
  shorter `isUnitOperable` implementation. No runtime merge conflict remained.
- Ran Root's `ledger-convert.mjs`: C10 accounting now lives only in this
  change's `.ledger.json`; the legacy ledger is byte-identical to fetched main.
  The accounting validator reconciles all 33 active changes with zero errors.
- Under Node 22.22.0, replay/digest/golden validation passed 29 suites and 760
  tests unchanged. `validate:combat` passed 79 suites and 2,107 tests, its gap
  inventory checks, and strict-spec validation. Both tsc configs, lint at 63
  warnings and zero errors, lint:units at 17,072/17,085, repository formatting,
  strict C10 validation, and the budget at 57 unkeyable tests (3,054 files)
  passed. No committed fixture, digest, seeded snapshot, or existing exact-roll
  expectation was edited.
- The combined stable directory sweep passed 906 suites and 14,139 tests,
  with 39 skipped tests and no updated snapshots. It includes the full runner
  and phase-helper directories plus gameplay, engine, multiplayer, P2P,
  integration, fast-forward, QuickResolve, hooks, and store consumers. The
  existing `JEST_EXCLUDE_PERF_SENSITIVE=true` option excludes standalone stress
  suites from this sweep; earlier full-stress evidence remains recorded above.
- The entire `scripts/__tests__` directory passed 148 suites and 2,473 tests,
  with 17 skipped tests and no updated snapshots. This includes the new ledger
  parser/reconciliation tests, OpenSpec QC compatibility cases, and the
  33-test lint:units suite. The long roadmap-proof suite completed successfully;
  no script test was excluded from this run.
