## Implementation

- [x] Replace the existing wrong retry expectation and record its red run before changing product code.
- [x] Check the committed receipt before the durable contract-offer read.
- [x] Prove duplicate recognition without writes, including a cold database reopen; preserve fresh-command and rollback behavior.
- [x] Kill the receipt-check-removal mutant with the retry regressions.
- [x] Run lane gates and record their results without changing replay fixtures or budgets.
- [x] Close K14b task 16 after runtime validation.

## Delivery

Open a draft PR, then mark ready when hosted CI is green. Root owns merging.

## Validation evidence

- First red: replaced only the existing wrong retry expectation before editing
  product code. The source-row suite failed that assertion with
  `offer-not-durable / offer-absent`; nine other tests passed.
- Focused green: 11 tests passed, including warm and cold SQLite reopen retries
  with a new request timestamp. Journal events, receipt, high-water mark, source
  payload and source version remain unchanged.
- Full `src/lib/campaign/authority/__tests__`, `src/__tests__/integration` and
  `src/simulation/runner/__tests__` directories: 237 suites passed, 2,433 tests
  passed and 32 skipped. Run with
  `node node_modules/jest/bin/jest.js --selectProjects unit --runInBand --roots src/lib/campaign/authority/__tests__ src/__tests__/integration src/simulation/runner/__tests__`.
- Mutant: deliberately removed the receipt guard, restoring the original product
  file. Both retry cases failed with `offer-not-durable`; nine controls passed.
  Restored the guard before running final gates.
- Replay/digest/golden baseline: 69 suites and 1,062 tests passed before the product
  edit; the same 69 suites and 1,062 tests passed after it. No fixtures or digest
  expectations were changed.
- `npm run validate:combat`: passed, including 79 suites, 2,107 tests, unresolved
  gap assertions and strict OpenSpec validation.
- `npm run typecheck`: both root and scripts TypeScript configurations passed.
- `npm run lint`: 63 warnings, zero errors. `npm run lint:units`: passed without
  raising ceilings; its Jest suite passed all 33 tests.
- `npm run format:check`: all 9,207 matched files passed. Changed documentation is
  formatted again after recording final evidence.
- `node scripts/ci/budget-check.mjs`: passed; 57 unkeyable and 92 repository-wide
  keys, with no new unkeyable test file.
- OpenSpec change validation and `npm run qc:openspec-ci:validate`: passed; all
  62 active changes accounted for and zero quality errors.
