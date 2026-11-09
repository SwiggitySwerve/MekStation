## Implementation and verification

- [x] Record a failing seeded duplicate-header Node test before implementation.
- [x] Add the active-delta check and pinned full-validation script; repoint callers.
- [x] Regroup parity additions and prove operation/header and byte preservation.
- [x] Wire checker and tests into PR static checks, including docs-only changes.
- [x] Record a killed count-check mutant and pass all required local gates.

The mutant was killed: raising the duplicate threshold made all four seeded
duplicate cases fail. The final Node test file passes all nine cases.

All required gate commands ran. After merging main, the whole-directory Jest
rerun passed all 210 suites / 3,484 tests, with 49 existing skips. The original
pre-merge run's two unchanged-test `ETIMEDOUT` failures are historical; both
affected cases passed standalone retries with their original timeouts and now
pass in the full rerun. Hosted CI review belongs to the coordinator. The catalog
validators and their 13 suites / 115 tests also passed.
