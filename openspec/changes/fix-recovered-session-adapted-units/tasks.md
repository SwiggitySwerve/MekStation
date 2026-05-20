# Tasks: Fix Recovered-Session Adapted Units

## 1. Recovery-path fix

- [ ] 1.1 `src/multiplayer/server/InteractiveSession.ts`: locate the `fromSession` factory method
- [ ] 1.2 Add a call to the existing `adaptedUnitRebuilder` (or equivalent — the function the bootstrap path uses to derive per-unit adapted state from canonical campaign state) so the recovered session's `adaptedUnits` is populated, not empty
- [ ] 1.3 Update the doc-comment on `fromSession` explaining the derivation step

## 2. Regression coverage

- [ ] 2.1 New regression test at `src/multiplayer/server/__tests__/InteractiveSession.recovery.test.ts`:
  - Bootstrap a session, advance to mid-combat (turn 3, some moves committed)
  - Persist via the existing persistence path
  - Reconstruct via `fromSession`
  - Assert `adaptedUnits` is non-empty + carries the expected per-unit state
  - Execute a move + attack on the recovered session — assert it does NOT throw

## 3. Spec delta + archive

- [ ] 3.1 Author delta at `openspec/changes/fix-recovered-session-adapted-units/specs/multiplayer-session-recovery/spec.md` (or relevant existing capability) ADDING a "Recovered Session Has Populated Adapted Units" requirement with scenarios for bootstrap-vs-recovery parity + the move/attack regression
- [ ] 3.2 `openspec validate fix-recovered-session-adapted-units --strict` passes
- [ ] 3.3 `npm run verify:full` passes
- [ ] 3.4 Archive the change after merge
- [ ] 3.5 Trim gap #2 from `playtest/CLOSEOUT.md`
