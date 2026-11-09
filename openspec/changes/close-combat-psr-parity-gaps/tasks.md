## 1. C-5: runner 20+ damage PSR after the Physical Attack phase

- [x] Record the runner, engine, integration, replay and gameplay suites on
      unmodified main.
- [x] Record failing tests: physical damage crossing 20 queues one PSR; none
      below 20; no duplicate; none for a prone or non-BattleMech unit; 30 for a
      dual cockpit with a dedicated pilot.
- [x] Move the threshold into `checkPhaseDamagePSR`; gate on `canFall`; sweep
      every unit at the end of `runPhysicalAttackPhase`.
- [x] Kill the mutants (drop the sweep; drop the `canFall` gate).
- [x] Prove no committed replay, digest or golden moved.
