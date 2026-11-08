# Heat startup and EMP shutdown

`shutdownStartup.ts` owns shared startup eligibility and EMP shutdown countdown.
The session resolver and standalone runner own event emission and injected dice.
The replay reducer applies recorded `StartupAttempt.success` without deriving a
new startup decision.

The initial extraction preserves existing behavior: startup requires shutdown
and heat no greater than `HEAT_THRESHOLDS.AUTO_SHUTDOWN - 1`. Session turn-start
handling decrements EMP shutdown rounds with the existing truncation and zero
clamp. The approved C10 behavior correction follows in a separate commit.

Pinned rules: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:

- `common/equipment/EMPMineEffectsTable.java:150-155`: EMP effects last 1d6 rounds.
- `server/totalWarfare/EMPMineEffectResolver.java:316-319`: shutdown stores the duration.
- `common/units/Entity.java:8255-8257`: a new round decrements the shutdown timer.
- `server/totalWarfare/HeatResolver.java:615-663`: startup below heat 30 requires
  zero EMP rounds; a KO pilot cannot pass a required startup roll.
- `server/totalWarfare/HeatResolver.java:690-705`: the alternative shutdown branch
  excludes already-shut-down and just-restarted units.
