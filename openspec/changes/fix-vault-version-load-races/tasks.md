## 1. Reproduce version-view failures

- [x] 1.1 Add deferred-fetch component regressions for stale history/diff data, errors, and loading completion.
- [x] 1.2 Reproduce invalid diff selection, rollback failure, and successful rollback with failed refresh.
- [x] 1.3 Reproduce item changes during rollback POST and refresh; record the failing run.

## 2. Isolate operations

- [x] 2.1 Guard history, refresh, and diff commits with run IDs and cleanup invalidation.
- [x] 2.2 Clear invalid-selection state and render rollback errors in the dialog independently of load errors.
- [x] 2.3 Distinguish successful mutation from refresh failure and prove deliberate mutants fail.

## 3. Validate and hand off

- [x] 3.1 Run full vault and integration test directories, both TypeScript configs, lint, lint:units and its suite, formatting, OpenSpec validation, and the CI budget check.
- [ ] 3.2 Open a draft PR, record the absence of production route mounts, and make ready only after hosted CI passes.
