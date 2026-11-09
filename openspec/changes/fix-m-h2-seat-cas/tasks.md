## Implementation

- [x] 1. Capture old-shape `meta_json` rows from origin/main before the field exists, and record failing interleave tests for spectate, detach and lobby intents.
- [x] 2. Add the optional revision, stamp it in the shared patch writer, and add `updateMatchMetaIf` to both stores with the durable row guard.
- [x] 3. Add `updateMatchSeats` with a named retry bound.
- [x] 4. Route REST spectate, spectator detach and the lobby intent handler through it; broadcast the stored metadata.
- [x] 5. Move the MarkSeatAi pending-peer clear after the applied write.

## Verification

- [x] 6. Kill the ignore-expectedRevision, row-guard, eager-clear, no-retry and no-bump mutants separately and record the tests.
- [x] 7. Run full affected directories, integration, typecheck, lint, formatting, unit lint, OpenSpec validation and CI budgets.

## Evidence (2026-11-09)

- Old-shape fixture: two raw `mp_matches` rows captured from origin/main's
  `DurableMatchStore` (no `revision` key) in `fixtures/matchMetaOldShape.json`.
- Red first: 21 new tests failed against unmodified code; the lost-update tests
  failed on the real symptom (a seat or spectator erased, a spectator seated on a
  completed match). The MarkSeatAi retry test passed on old code by design: it
  guards the new code.
- Mutants, each killed separately: `expectedRevision` ignored (11 failures),
  durable row guard dropped (1), eager MarkSeatAi pending clear (1), no retry (8),
  revision not bumped (21). The first and third were re-run on the final code.
- Full affected directories (`src/lib/multiplayer`, `src/types/multiplayer`,
  `src/__tests__/unit/api`, `src/__tests__/integration`, `src/pages-modules/api`):
  276 suites, 3009 tests passed, 35 existing skips.
- Both tsc configs passed. Root lint 62 warnings, 0 errors (two files crossed the
  400-line limit during development and were brought back under it). Unit lint
  17,079 of 17,085, no ceiling change; its Jest suite passed. OpenSpec strict
  317 of 317. `scripts/ci/budget-check.mjs` passed: 57 unkeyable of 57, 92
  repo-wide of 93.
- Node v24.15.0, better-sqlite3 ABI 137.

Delivery is PR2 of three. PR3 (spectator boot sweep, intent-table drift test)
follows after merge. Root owns hosted CI and merge.
