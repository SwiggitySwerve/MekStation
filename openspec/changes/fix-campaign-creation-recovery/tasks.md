## 1. Regressions and implementation

- [x] 1.1 Record red tests for incomplete-roster retry, stale persistence identity,
      and refusal of unsettled campaign replacement.
- [x] 1.2 Move the pending marker after population and guard both creation actions
      before resetting clean persistence.
- [x] 1.3 Prove removal of the guard, restoration of the early pending marker,
      and omission of the reset each fail their regression tests.

## 2. Verification and delivery

- [x] 2.1 Run full campaign store/library (including fastForward), wizard,
      page-module and integration test directories.
- [x] 2.2 Run simulation runner and before/after replay/digest checks without
      changing committed fixtures; run combat validation.
- [x] 2.3 Run both TypeScript configs, root lint, unit lint and its tests,
      formatting, strict OpenSpec validation and the unchanged CI budgets.
- [ ] 2.4 Open one draft PR and record hosted checks for Root; never merge.

## Evidence

- Initial red run: 18 failing tests, one passing test. The two new suites
  passed all 20 tests after implementation.
- Guard mutant: three dirty-campaign tests failed. Early-marker mutant: two
  population-retry tests failed. Missing-reset mutant: the stale-version test
  failed. Each deliberate break was restored before directory verification.
- Pre-change replay/digest baseline: 30 suites and 764 tests passed on Node
  22.22.0. Node 24 was incompatible with the installed SQLite binary; the
  shared binary was left unchanged and subsequent gates use Node 22.
- Both TypeScript configurations passed; root lint has 63 warnings and no
  errors; unit lint passed without raising ceilings; repository formatting
  passed. CI budgets passed with 57 unkeyable tests and 91 repository-wide keys.
- Campaign, library/fastForward, integration, wizard and page-module directories:
  309 suites passed, 4,541 tests passed and 32 tests skipped.
- Runner/replay/digest and unit-lint suites: 181 suites and 2,268 tests passed.
  No committed fixtures, digest expectations, replay packs or source citations
  changed.
- `npm run validate:combat` passed: 79 suites and 2,095 tests, with gap inventory
  checks and strict combat spec validation. Full strict OpenSpec validation
  passed all 247 items. Hosted CI and Root handoff remain pending.
