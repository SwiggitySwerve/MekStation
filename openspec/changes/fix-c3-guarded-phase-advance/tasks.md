## 1. Record failing tests

- [x] 1.1 Skip with every unit locked in WeaponAttack resolves declared attacks
  before the flip; the store session is the interactive session.
- [x] 1.2 Skip in End drains the queued PSR; Skip in End does not advance past a
  finished game and finalizes it; Next Turn drains, then rolls into Movement.
- [x] 1.3 Interactive Advance in PhysicalAttack resolves the declared physical
  attack and flips to Heat.
- [x] 1.4 Preconditions hold in every red test (declared and unresolved before,
  so a red run fails on behaviour and not on fixture setup).

## 2. Implementation

- [x] 2.1 Route Skip and Next Turn through the interactive session; name the
  remaining raw store-only path in a code comment.
- [x] 2.2 Derive the advanceable set from `GAME_PHASE_ORDER` so PhysicalAttack
  advances.
- [x] 2.3 Kill and restore three mutants: raw Skip, raw Next Turn, and
  PhysicalAttack excluded from the advanceable set.

## 3. Gates and delivery

- [x] 3.1 Run full touched directories and integration, the full runner dir, and
  replay/digest/golden before and after. Stop on any protected change.
- [x] 3.2 Run validate:combat, both tsc configs, lint:units and its Jest suite,
  root lint <=63 warnings, oxfmt, OpenSpec validation, and budget check <=57.
- [x] 3.3 Open one draft PR and never merge.

## Recorded evidence

- Red run before the fix: 5 of 6 new tests failed on behaviour (attacks left
  unresolved, PSR not drained, game-over guard skipped, phase flipped to
  Initiative past a finished game, Physical advance a no-op); the sixth, the
  store-only raw path, passed by design. Every red test passes its
  preconditions first.
- Mutants: raw Skip failed 3 tests; PhysicalAttack excluded from the advanceable
  set failed 1; raw Next Turn failed 1. Each was restored before the next run.
- Replay, digest, golden, runner, engine and stores (`src/lib/events`,
  `src/simulation/runner/__tests__`, `src/engine`, `src/stores`): 342 suites and
  4,820 tests on the base commit `f529838e5`; 343 suites and 4,826 tests after
  (the one new suite, six new tests). No fixture, digest or golden changed.
- Consumers (`src/components/gameplay`, `src/pages-modules`,
  `src/__tests__/integration`, `src/__tests__/pages`, `src/hooks/gameplay`,
  `src/lib/interventions`): 391 of 392 suites; the one failure, `perfBudgets`,
  is a load timeout that passes alone (4 of 4).
- `validate:combat` exit 0; both tsc configs exit 0; oxlint 62 warnings; the
  `lint:units` script and its 33-test suite pass; budget 57 unkeyable tests;
  strict change validation and ledger accounting pass.
