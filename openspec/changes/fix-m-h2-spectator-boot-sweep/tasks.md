## Implementation

- [x] 1. Record failing boot-sweep tests and the intent-table drift test.
- [x] 2. Add `lobby/spectatorBootSweep.ts` and call it from the full recovery pass only.
- [x] 3. Document the boot rule in TRANSPORT.md and AGENTS.md.
- [x] 3a. Add `useSpectatorRegistration` and the spectate page's bounded one-shot re-registration, with hook and page tests.
- [ ] 3b. After the GM seat fix merges: use its shared predicate in the boot sweep, with the GM-survives-sweep test.

## Verification

- [x] 4. Kill the runner-list, scoped-sweep, wipe-all-seats and sweep-removed mutants and record the tests.
- [x] 5. Run full affected directories, integration, typecheck, lint, formatting, unit lint, OpenSpec validation and CI budgets.

## Evidence (2026-11-09)

- Red first: the full-pass recovery test failed on the real symptom (spectators
  still present after recovery); the sweep module test failed on the missing
  module. The drift test and the lobby/completed/scoped-pass tests pass on old
  code by design, as guards.
- Mutants, each killed: `Eject` dropped from the runner engine list (my drift test
  and the existing runner catalog test), the sweep also running on the scoped pass
  (1), the sweep wiping all seats (3), the sweep call removed (1).
- Two existing suites relied on the old rule and failed in the full directory run:
  `durableViewerDelivery` (spectator case) and
  `customCombatRecovery.recoveryDelivery`. Each restarts the host and re-admits a
  spectator without registering. They now re-register after recovery, as REST
  spectate does; every delivery and redaction assertion is unchanged, and the first
  also asserts admission is refused before re-registering.
- Full affected directories: 279 suites, 3035 tests passed, 35 existing skips.
- Both tsc configs passed. Root lint 62 warnings, 0 errors. Unit lint 17,080 of
  17,085, no ceiling change; its Jest suite passed. OpenSpec strict 320 of 320.
  `scripts/ci/budget-check.mjs` passed: 57 unkeyable of 57, 91 repo-wide of 93.
- No runner file changed; the runner catalog contracts pass (66 tests).
- Node v24.15.0, better-sqlite3 ABI 137.

Delivery is PR3 of three. Root owns hosted CI and merge.
