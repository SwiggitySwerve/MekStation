# Heat startup and EMP shutdown

`shutdownStartup.ts` owns shared startup eligibility and EMP shutdown countdown.
The session resolver and standalone runner own event emission and injected dice.
The replay reducer applies recorded `StartupAttempt.success` without deriving a
new startup decision.

Startup requires shutdown, heat no greater than
`HEAT_THRESHOLDS.AUTO_SHUTDOWN - 1`, and no positive EMP shutdown rounds. Session
turn-start handling and the runner decrement EMP shutdown rounds with the same
truncation and zero clamp. Missing runner timers remain absent for compatibility.
The existing interference countdown remains a separate effect and is unchanged.

Choose startup or shutdown checking once, after dissipation and before startup.
An already-shut-down unit does not check shutdown again, including after a
successful restart. A conscious pilot rolls when the startup target is positive;
a KO pilot emits a failed startup without consuming startup dice. Target zero
still starts automatically. Existing Hot Dog target-number relief is unchanged.

The first commit extracts the old startup guard and countdown unchanged. The
second applies these rules. Newly resolved thermal/EMP shutdowns may change RNG
consumption and outcomes; old event journals retain their recorded outcomes.

Pinned rules: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:

- `common/equipment/EMPMineEffectsTable.java:150-155`: EMP effects last 1d6 rounds.
- `server/totalWarfare/EMPMineEffectResolver.java:316-319`: shutdown stores the duration.
- `common/units/Entity.java:8255-8257`: a new round decrements the shutdown timer.
- `server/totalWarfare/HeatResolver.java:615-663`: startup below heat 30 requires
  zero EMP rounds; a KO pilot cannot pass a required startup roll.
- `server/totalWarfare/HeatResolver.java:690-705`: the alternative shutdown branch
  excludes already-shut-down and just-restarted units.
