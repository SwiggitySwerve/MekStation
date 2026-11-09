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

## 2. C-2: terrain rules to the pin

- [x] Read the full pin displacement path (`doEntityDisplacement`, L9694-L9982).
- [x] Record failing producer tests: no exit-water or rough roll, water on every
      water hex, ice as reckless movement, ultra-rubble +1, displacement limited
      to building, bog-down and water.
- [x] Remove the exit-water and running-through-rough rolls; roll water on every
      water hex; ice follows reckless-movement semantics; add the ultra-rubble
      modifier.
- [x] Fold the forked domino terrain producer into
      `planDisplacementTerrainPSRs` in the shared producer module.
- [x] Mark the `ExitingWater` and `RunningRoughTerrain` catalog rows
      out of scope; keep both enum values and factories for old replays.
- [x] Re-anchor shifted catalog citations by content.
- [x] Kill the mutants (ultra-rubble, water-entry-only-from-land, a rubble roll
      in displacement, an ice roll on a jump).
- [x] Prove no committed replay, digest or golden moved.
