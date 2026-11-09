## Implementation and verification

- [x] Record a failing seeded duplicate-header Node test before implementation.
- [x] Add the active-delta check and pinned full-validation script; repoint callers.
- [x] Regroup parity additions and prove operation/header and byte preservation.
- [x] Wire checker and tests into PR static checks, including docs-only changes.
- [ ] Record a killed count-check mutant and pass all required local gates.

The mutant was killed: raising the duplicate threshold made all four seeded
duplicate cases fail. The final Node test file passes all nine cases.

All required gate commands ran. The whole-directory Jest run reported 207
passing suites and two child-process timeouts; both affected cases then passed
unchanged standalone retries with their original timeouts. The final gate item
stays open because that original whole-directory command was not clean. Hosted
CI review belongs to the coordinator. All other required gates passed, including
the additional catalog validators and their 13 suites / 115 tests.
