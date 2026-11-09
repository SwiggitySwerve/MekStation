## Implementation

- [x] Record failing page tests for missing/error feedback, retry, upload precedence, and superseded responses.
- [x] Add the recovery banner and guarded retry without changing replay formats or producers.
- [x] Verify preserved upload and persisted-source precedence.

## Verification

- [x] Kill a disconnected-retry mutant and restore the implementation.
- [x] Run whole affected test directories and `src/__tests__/integration`.
- [x] Run both TypeScript configs, unit lint and its Jest suite, root lint, formatting, OpenSpec validation, and CI budgets.
- [x] Prepare the draft PR handoff and verification evidence.
- [ ] Make the PR ready after hosted CI is green. Root owns merging.

## Verification evidence

- Initial red run: 10 failed and 5 passed. Failure cases included missing/error
  feedback, retry, fallback loading, and superseded response JSON.
- Disconnected-retry mutant: 1 failed and 14 skipped. The recovery test observed
  one fetch instead of the required two. The implementation was restored.
- Final affected directories: 31 suites and 214 tests passed, including 17
  standalone replay tests. Integration: 53 suites passed, 642 tests passed,
  and 32 skipped.
- Both TypeScript configurations passed after merging origin/main c85f2912c.
- Root lint: 63 warnings and zero errors. Unit lint: 17079/17085 and all per-path
  gates passed; its Jest suite passed all 33 tests.
- Formatting passed across 9207 files. Strict OpenSpec validation passed all
  283 items; OpenSpec CI accounting reported zero errors.
- The final CI budget check passed: 3116 files, 57 unkeyable, and 92 repo-wide.
  No test file was added and no ceiling was raised.
- No engine, reducer, simulation, fixture, schema pack, event payload, or
  persisted replay format was changed. The Wave 3 gameplay-only gates do not
  apply to this presentation change.

Raw logs are under `E:/Projects/Personal/_scratch/sm-audit-reports/w3-U20/`.
