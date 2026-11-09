## 1. Characterize

- [x] 1.1 Run new lifecycle characterization tests against the original store.
- [x] 1.2 Record failure of the unconditional dirty-clear acknowledgment mutant.

## 2. Extract

- [x] 2.1 Introduce the pure snapshot reducer and exhaustive event contract.
- [x] 2.2 Route all internal persistence updates through it without moving effects.
- [x] 2.3 Document supported stale-event no-ops and deferred external writers.

## 3. Verify

- [x] 3.1 Run the full campaign test directory and integration directory unchanged.
- [x] 3.2 Run both TypeScript configs, lint, formatting, unit-lint tests, and CI budgets.
- [x] 3.3 Validate OpenSpec, verify existing race-test blobs, and record evidence.
