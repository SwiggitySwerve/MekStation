## Implementation

- [x] 1. Record failing boot-sweep tests and the intent-table drift test.
- [x] 2. Add `lobby/spectatorBootSweep.ts` and call it from the full recovery pass only.
- [x] 3. Document the boot rule in TRANSPORT.md and AGENTS.md.
- [x] 3a. Add `useSpectatorRegistration` and the spectate page's bounded one-shot re-registration, with hook and page tests.
- [x] 3b. After the GM seat fix merged: use its shared predicate in the boot sweep, with the GM-survives-sweep test.

## Verification

- [x] 4. Kill the runner-list, scoped-sweep, wipe-all-seats and sweep-removed mutants and record the tests.
- [x] 5. Run full affected directories, integration, typecheck, lint, formatting, unit lint, OpenSpec validation and CI budgets.

## Evidence (2026-11-09, head after merging the GM seat fix)

- Red first: the full-pass recovery test failed on the real symptom (spectators
  still present after recovery); the sweep module test failed on the missing
  module; the GM-survives-sweep tests failed because the sweep removed the GM's
  seat before it used the shared `isAutoReleasableSpectatorSeat` rule; the page
  tests failed on "no second registration, no second socket" before the page
  re-registered. The drift test and the lobby/completed/scoped-pass tests pass on
  old code by design, as guards.
- Mutants, each killed: `Eject` dropped from the runner engine list (my drift test
  and the existing runner catalog test), the sweep also running on the scoped pass
  (1), the sweep wiping all seats (3), the sweep ignoring the GM rule (3), the sweep
  call removed (1), the re-register call dropped (4), the re-registration bound
  removed (3), the budget never refilled plus re-registering on any close (3).
- Two existing suites relied on the old rule and failed in the full directory run:
  `durableViewerDelivery` (spectator case) and
  `customCombatRecovery.recoveryDelivery`. Each restarts the host and re-admits a
  spectator without registering. They now re-register after recovery, as REST
  spectate does; every delivery and redaction assertion is unchanged, and the first
  also asserts admission is refused before re-registering.
- Affected server and client directories (`src/lib/multiplayer`,
  `src/types/multiplayer`, `src/__tests__/unit/api`, `src/__tests__/integration`,
  `src/pages-modules/api`, `src/hooks`, `src/__tests__/pages`,
  `src/pages-modules/multiplayer`): 397 suites, 4365 tests passed, 35 existing skips.
- Both tsc configs passed. Root lint 62 warnings, 0 errors. Unit lint 17,081 of
  17,085, no ceiling change; its Jest suite passed. OpenSpec strict 323 of 323.
  `scripts/ci/budget-check.mjs` passed: 57 unkeyable of 57, 91 repo-wide of 93.
- No runner file changed; the runner catalog contracts pass (66 tests).
- Node v24.15.0, better-sqlite3 ABI 137.

Delivery is PR3 of three. Root owns hosted CI and merge.
