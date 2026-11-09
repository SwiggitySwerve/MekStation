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
3. **C-1.** Interactive movement damage, control and enhancement PSRs.
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

## Non-goals

- The post-phase PSR drain timing (MegaMek resolves after Movement, Firing and
  Physical; MekStation drains at End) is a separate follow-up.
