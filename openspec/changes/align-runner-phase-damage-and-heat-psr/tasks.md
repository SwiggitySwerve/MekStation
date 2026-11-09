## Implementation

- [x] Failing tests first: per-phase damage and non-pooling, physical-damage accumulation, shutdown-PSR `PSRResolved` at loop level, helper D2 and D8 cases (17 failures before the fixes).
- [x] D1: `resetPhaseDamage` as the Weapon Attack, Physical Attack and Heat phases begin.
- [x] Physical-attack damage increments `damageThisPhase`.
- [x] D2: sparse reset decrements a carried `empInterferenceTurns`.
- [x] Heat-shutdown PSR: `runPSRPhase` after the Heat phase in `SimulationRunner.run`.
- [x] D8: explicit reset zeroes `damageThisPhase`.
- [x] Update PR 2's helper tests and PR 1's pins only where these changes intend it.
- [x] Kill a mutant for each change.
- [x] Re-anchor affected runner citations by content.
- [x] Whole-directory gates, replay/digest/golden suites, `validate:combat`, both tsc configs, lint, unit lint, oxfmt and the budget check at 57/92.

## Known divergences left as they are

- [ ] **D5, turn-1 reset.** MegaMek runs `Entity.newRound` before round 1 (`resetEntityRound` on every INITIATIVE phase including the first, TWPhasePreparationManager.java:77-84). The reducer first resets at turn 2. Declined by Root: resetting at `GameStarted` moves three committed post-state digest locks (`commandDigestLock`, `decideCommandBatch` EQUALITY, `journalAuthorityPath` FLAG ON) for no real gain, and a variant guarded to units with seeded state needs a hand-kept field list. A fresh game has nothing to reset. Revisit only if a scenario can seed per-turn counters (MASC or supercharger prior-use, EMP durations, a PSR queue) at game start.
- [ ] **D3/D4, spotting and cargo.** The runner never clears `isSpotting`, `spotTargetId` or `isLoadingOrUnloadingCargo`, as `Entity.newRound` does. Dormant: nothing in the runner sets them.
- [ ] **Runner 20+ PSR from physical damage.** Physical damage now counts toward `damageThisPhase`, but the runner does not queue a 20+ damage PSR after the Physical Attack phase. Not part of this change.
- [ ] **Runner-log replay fidelity.** With a real bot, replaying a runner log through `deriveState` does not match the runner's own state; see the verification section.

## Verification evidence

Node 22.22.0 (better-sqlite3 opens with this ABI).

- Red: 17 failures before the helper changes and 7 before the phase, physical-damage and PSR fixes, each at the intended assertion.
- Killed mutants, each restored: attack phase keeps old damage; physical phase keeps old damage; heat phase keeps old damage; sparse reset drops the EMP decrement; explicit reset drops the damage zero; physical damage not counted; PSR phase removed.
- Whole directories green: `src/simulation` 3058 tests, `src/engine` 594, `src/utils/gameplay` 6839, `src/__tests__/integration` 642 (32 skipped), `src/lib/{events,multiplayer,p2p}` 3271 (3 skipped). Replay, digest and golden suites passed with the same counts as before the change; no committed value moved and nothing was rebaselined.
- `validate:combat`, both tsc configs, strict change validation and oxfmt passed; lint is 63 warnings; `lint:units` passed; budget check 57 unkeyable / 92 repository-wide.
- Three `SimulationRunner.ts` citations re-anchored by identical content (`run()` grew by 10 lines).

## Replay gap after D8 (measured, not fixed)

`deriveState` over a bot-driven runner log (8 seeds, 32 units, end of turn 3) still differs from the runner's own state:

- `weaponsFiredThisTurn`: 30 of 32 units (replay `[]`, runner non-empty).
- `damageThisPhase`: 12 of 32 units (e.g. replay 5, runner 0). A runner log has no `PhaseChanged`, so the reducer cannot zero it per phase; D8 only stops it leaking across turns. The cause of the residual was not investigated.
- Key shape only, equal in value once absent is read as cleared: `activeMASC`, `empShutdownTurns` and `empInterferenceTurns`, on all 32 units.

Closing this is a separate change.
