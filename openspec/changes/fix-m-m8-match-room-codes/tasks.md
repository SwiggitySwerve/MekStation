## Implementation

- [x] Record failing store, retry, migration, and DELETE regressions.
- [x] Consolidate metadata patch handling with unchanged lobby patch semantics.
- [x] Enforce lobby-only codes and atomic uniqueness in both stores.
- [x] Backfill and install the partial UNIQUE index before boot reads.
- [x] Retry generated-code collisions at most five times.
- [x] Demonstrate deliberate mutant failures and restore the implementation.
- [x] Run whole-directory tests, both TypeScript configs, lint, lint:units and
      its Jest suite, formatting, OpenSpec checks and the budget check.
- [x] Open one draft PR and report evidence to Root without merging.

## Hosted privacy-fixture follow-up

- [x] Reproduce the five hosted metadata privacy failures and correct only non-lobby fixtures.
- [x] Audit roomCode: fixtures across the requested paths and run every containing directory, recording browser failures and incomplete coverage explicitly.
- [x] Preserve privacy assertions and rerun both TypeScript configs, lint gates, formatting, OpenSpec and the unchanged budget.
