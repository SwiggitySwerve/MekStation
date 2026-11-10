## Why

The terrain-PSR lane (#3049, #3062, #3066, #3078, #3082) found combat PSR
behaviour that differs from the pinned MegaMek 48fcb2f64. This change closes
those gaps one PR at a time.

## What Changes

Sequential PRs, one gap each:

1. **C-5.** The standalone runner queues the `20+_damage` PSR after the Physical
   Attack phase, as MegaMek does after Movement, Firing and Physical
   (`TWPhaseEndManager.java:156, 206, 239`). One helper owns the rule: the
   threshold is 20, or 30 for a dual cockpit with a dedicated pilot, and only a
   unit that can fall (`Mek.canFall`, not prone) queues it
   (`TWGameManager.java:17843-17893`).
2. **C-2.** Terrain rules to the pin: drop exiting-water and running-through-rough
   rolls, roll water on every water hex, ice as reckless movement, ultra-rubble
   +1, and fold the displacement producer into the shared one.
3. **C-1.** Interactive movement damage, control and enhancement PSRs, in three PRs. C-1a: running with a damaged hip or gyro rolls once per move (`MovePathHandler.java:1283-1286`, `TWRulesPSR.java:62-77`) in every path. C-1b: flanking-and-turning and controlled sideslip belong to VTOL, hover and WiGE only (`MovePathHandler.java:3715-3727`). C-1c: MASC and Supercharger failure.
4. **C-3.** Per-step rolls that cut the move short on a failure.
5. **C-4a.** Vehicle bog-down in the shared producer.

Later PRs extend the tasks and delta specs below.

## Impact

Affected capability: piloting-skill-rolls.

C-5: no schema-pack, payload or persisted-format change; `PSRTriggered` and
`PSRResolved` shapes are unchanged. The queue happens in runner state, as the
weapon-phase queue does. No committed replay, digest or golden moves (full
runner, engine, integration, replay and gameplay suites compared before and
after).

The dual-cockpit threshold is implemented in `checkPhaseDamagePSR` but has no
unit-state source yet: MekStation has no dual-cockpit construction type and no
multi-crew model, so no caller sets `dualCockpitDedicatedPilot`.

C-2: no schema-pack, payload or persisted-format change. `ExitingWater` and
`RunningRoughTerrain` stay in `PSRTrigger` and keep their factories, so older
journals and replays parse and resolve as before; only the producers stop
emitting them. `createRubblePSR` gains an optional rubble level. Runner output
changes are listed in the C-2 PR: no exit-water or rough PSR in movement or
domino displacement, a water PSR for every water hex entered, an ice PSR per
non-jump step in an ice hex (none on a jump landing), and domino displacement
no longer queues rubble or ice PSRs.

C-1a: no schema-pack, payload or persisted-format change. The runner now queues one running-with-damage PSR per move instead of one hip PSR per forward step plus a separate gyro PSR, and none for a destroyed-leg hip or a first heavy-duty gyro hit. Interactive, AI, engine and P2P movement queue the same PSR, which they did not before. `RunningDamagedHip` and `RunningDamagedGyro` keep their factories and reason codes.

C-1b: no schema-pack, payload or persisted-format change. The standalone runner no longer queues `controlled_sideslip` or `flanking_and_turning` PSRs for BattleMechs; interactive, AI, engine and P2P movement never did, which matches the pin. `ControlledSideslip` and `FlankingAndTurning` stay in `PSRTrigger` with their factories and the Maneuvering Ace relief, so older journals and replays parse and resolve as before. Four catalog rows move to out of scope: two PSR trigger rows and two Maneuvering Ace producer-application rows (out-of-scope inventory 151 to 155, leaf 148 to 152, `lifecycleAndPsr` 4 to 6, `pilotSkills` 9 to 11). Removing those PSRs removes their dice, so the runner's seeded stream shifts and the CI-sized (N=5) asymmetric dominance ceiling in `swarm-pilot-skills-batch.test.ts` moves behind `statisticalIt`. The only committed values that move are D-8's `replayScope` characterization pins (re-pinned in the PR); no digest, golden or other fixture moves.

C-1c PR 1: adds the pure MASC/Supercharger planner and resolver with no callers, so no behaviour, schema, payload, persisted-format or committed value changes. The runner imports the shared Supercharger engine-hit table and MASC leg list instead of keeping a second copy (same values).

## Non-goals

- The post-phase PSR drain timing (MegaMek resolves after Movement, Firing and
  Physical; MekStation drains at End) is a separate follow-up.
- Careful movement (the `checkRecklessMove` exemption) is not modelled; ice
  rolls as the non-careful case.
- Ice-covered water: the jump-landing PSR and ice breaking
  (`MovePathHandler.java:1573-1611`) are not modelled; a jump landing on ice
  rolls nothing.
- The pin applies the displacement terrain checks to every displacement (push,
  charge, DFA); the runner still applies them to domino displacement only.
- Skidding on ice (`Entity.checkSkid`, `Entity.java:9514-9517`) applies to walking
  as well as running, and uses a move-and-turn step rather than a turn step.
- Lateral shifts are not terrain-bearing steps in the shared producer.
- The pavement exemption for rubble and water (`isPavementStep`) is not modelled.
