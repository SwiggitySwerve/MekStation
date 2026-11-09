## 1. Reproduce

- [x] 1.1 Record failing existing-suite component/hook regressions for preview
      re-selection, inactive loading, reset timer disposal, and late completion.

## 2. Implement

- [x] 2.1 Guard preview re-selection and clear inactive preview loading while
      retaining the existing cancellation/session guards.
- [x] 2.2 Hold reset timers in refs, dispose them at lifecycle boundaries, and
      ignore completion from disposed openings.

## 3. Verify

- [x] 3.1 Remove the re-select guard and reset timer cleanup deliberately;
      record both mutants being caught and restore the implementation.
- [x] 3.2 Run both complete dialog test directories, integration tests, both
      TypeScript configs, root lint, unit lint and its suite, formatting,
      OpenSpec validation, and CI budget checks.
- [ ] 3.3 Open a draft PR with evidence; mark ready after hosted CI is green.

Local evidence: the original implementations fail 10 regressions; the fixed
dialog suites pass all 30 tests. Removing the re-select guard fails 1 test;
removing close/unmount timer disposal fails 7 tests. Required directory gates
pass 63 suites with 811 tests passed and 32 skipped. Both TypeScript configs,
root formatting, unit lint and its suite, root lint (63 warnings, no errors),
strict change validation, and CI budgets (57 unkeyable / 92 repo-wide) pass.
The directory gates use Node 22.22.0 to match the local SQLite binary; an initial
Node 24 run failed at the SQLite ABI boundary. The broad Jest run reports a
worker teardown warning after its passing results. Logs are under
`E:/Projects/Personal/_scratch/sm-audit-reports/w3-u11/`.
Both complete dialog directories also pass with `--detectOpenHandles`: 9 suites,
136 tests, and no open handles reported.
