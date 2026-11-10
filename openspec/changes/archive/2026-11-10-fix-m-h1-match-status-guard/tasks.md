## Implementation

- [x] 1. Record failing transition, create-guard and LaunchMatch-race regressions.
- [x] 2. Add the `MatchStatus` union, transition table and typed error; derive the store type and `LobbyUpdated` enum from them.
- [x] 3. Assert the edge in `patchMatchMeta` and the create status in both stores.
- [x] 4. Turn a refused lobby write into a logged `INVALID_INTENT` frame.
- [x] 5. Move test fixtures that created or reopened a match directly onto legal writers.

## Verification

- [x] 6. Kill the guard, create-guard and typed-handler mutants separately and record the tests.
- [x] 7. Run full affected directories, integration, typecheck, lint, formatting, unit lint, OpenSpec validation and CI budgets.

## Evidence (2026-11-09)

- Red first: 10 new tests failed against unmodified code (illegal edges, create
  guard, LaunchMatch race); the legal-edge tests already passed.
- Mutants, each killed separately: guard removed from `patchMatchMeta` (7 failures),
  create guard removed (2), typed handler branch removed (1).
- Full affected directories (`src/lib/multiplayer`, `src/types/multiplayer`,
  `src/__tests__/unit/api`, `src/__tests__/integration`, `src/pages-modules/api`):
  273 suites, 2970 tests passed, 35 existing skips. Before the fixture updates 7
  suites failed, all on direct creation of a `completed` row or an
  `active -> lobby` write.
- Both tsc configs passed. Root lint: 63 warnings, 0 errors. Unit lint 17,079 of
  17,085 with no ceiling change; its Jest suite passed. OpenSpec strict: 313 of 313.
- Runner catalog contracts (`combatActionCatalog`, `battlemechCombatCatalog`) pass
  after the one-line shift in `Protocol.ts`.
- Budget census (same keyer, run with a longer `jest --listTests` timeout because
  the script's 120 s cap tripped on a loaded machine): 57 unkeyable of 57, 92
  repo-wide of 93. This PR adds no unkeyable test.
- Node v24.15.0, better-sqlite3 ABI 137.

Delivery is PR1 of three. PR2 (seat compare-and-swap) and PR3 (spectator boot
sweep, intent-table drift test) follow after merge. Root owns hosted CI and merge.
