## 1. Regression proof

- [x] 1.1 Record failing tests for version-read errors, setup and migration failures, same-instance retry, cleanup failure and file-backed data preservation.

## 2. Lifecycle recovery

- [x] 2.1 Rethrow migration-version errors and clear/close failed initialization handles while preserving the original error.
- [x] 2.2 Pass regressions and kill both the swallowed-version-error and retained-handle mutants.

## 3. Validation and delivery

- [x] 3.1 Run full service/persistence, integration, DB-backed events/campaign/multiplayer, API and simulation event-log suites.
- [x] 3.2 Run both TypeScript configurations, lint, lint:units and its Jest suite, oxfmt, OpenSpec validation and the unchanged 57-file unkeyable budget.
- [x] 3.3 Prepare one draft PR with evidence and separate-singleton behavior documented; do not merge.

## Evidence

- Before the production fix, the complete migration suite reported 6 failed and
  6 passed tests: both read errors became UNIQUE violations, both pragma failures
  and the migration failure retained the initialized state, and the cleanup
  scenario lost its initialization error.
- After the fix, the complete migration suite passed all 12 tests, including
  unchanged database file identity/bytes, sentinel BLOB data, migration records,
  same-instance retry and original-error identity when connection closing fails.
- Restoring version-read `return 0` killed both version-read tests with the
  masked UNIQUE error. Omitting handle clearing killed the pragma recovery test
  because isInitialized remained true. Both mutant runs exited 1; the production
  fix was restored after each run.
- The full directory run completed: 954 suites passed and one failed; 14,758
  tests passed, one failed, 41 skipped, and all five snapshots passed. The sole
  failure is the local-seat migration rollback test reading the failed service
  handle. Root subsequently approved adapting that additional test file.
- The post-failure handle audit searched src, scripts, desktop and e2e, including
  test helpers. It reviewed 269 files containing getDatabase and found only two
  affected rollback tests: SQLiteService.migrations.test.ts and the additional
  SQLiteService.localSeatCredentials.migration.test.ts. Both now inspect through
  separate read-only connections, assert the service is uninitialized and close
  inspection connections in finally. All original schema and record assertions
  remain intact. The existing retry test removes its injected trigger through a
  separate repair connection after inspection; production code is unchanged.
- The rerun after that approval passed all 955 suites: 14,759 tests passed,
  41 were skipped and all five snapshots passed. The full persistence directory
  also passed separately: 24 suites and 182 tests. Both original rollback tests
  retain all three original assertions each; no schema or record assertion was
  weakened. SQLiteService's production-file hash was unchanged after approval
  of the extra test file.
- Both TypeScript configurations passed. Root lint reported 63 warnings and
  zero errors. lint:units and its Jest suite passed without ceiling changes.
  Formatting and all 247 strict OpenSpec items passed. The OpenSpec CI inventory
  accounted for all 26 active changes. The final budget census reported 3,043
  files, 57 unkeyable and 92 repo-wide keys, within the unchanged budgets.
- All of those gates were rerun successfully after the extra-test approval.
  Hosted CI and merge remain Root's responsibility; the PR stays a draft.
