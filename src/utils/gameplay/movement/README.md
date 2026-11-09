# Movement rules

## Per-turn state

`resetPerTurnMovementState` owns movement-mode cleanup and MASC/supercharger
prior-use advancement for the reducer and runner. It clears movement and
pending conversion/altitude MP accounting without changing position, posture,
or accumulated heat. Optional inactive sprint state can remain absent so an
otherwise unchanged unit does not acquire a new serialized flag.

Turn boundaries advance each booster's counter from the previous activation,
then clear activation. Movement entry uses `advanceBoosterCounters: false`
because the reducer already advanced counters at Initiative. Turn boundaries
reach the helper through `resetPerTurnUnitFields` (`../perTurnUnitFields.ts`),
which the reducer's `applyTurnStarted` and the runner's `resetTurnState` both
call; its `presence` option keeps each path's serialized shape. Normalization
and the represented maximum of six preserve the runner's existing contract.

The escalation and idle decay follow MegaMek commit `48fcb2f64`,
`megamek/src/megamek/common/units/Entity.java:16388–16414`, called by
`megamek/src/megamek/common/units/Mek.java:1240`. The first idle turn after an
escalation removes two levels; later idle turns remove one, bounded at zero.

## Ground path pricing

This movement module owns ground path MP arithmetic. The construction and
movement rules are specified in [movement-system](../../../../openspec/specs/movement-system/spec.md).
Consumers use `calculateGroundPathMpCost` for one final facing or
`prepareGroundPathMpCost` when pricing several final facings of the same path.

Both contracts sum entry costs in path order, then add the existing turning
cost for the initial and final facings. Non-finite entry costs produce
`Infinity`. The provided movement context is passed to each entry unchanged,
preserving the existing ground-path contract. The similarly named
`calculations.calculatePathMovementCost` applies first-step context separately
and is not interchangeable with this entry sum.

A prepared price is local to one unchanged grid, path, movement mode, initial
facing and context. Prepare again after any input changes. There is no global
cache or reuse across candidate destinations or calls. Path search, tie order,
candidate ordering and MP cutoffs belong to their existing callers and do not
change when a price is prepared.

The frozen pre-optimization references in the adjacent tests independently
check the complete prices and ordered AI candidates. Runner equivalence tests
retain every event and result field, controlling only envelope UUID generation
and explicitly normalizing diagnostic timestamps and elapsed duration.

## Terrain PSRs and stuck recovery

`planMovementTerrainEffects` (`terrainPsrTriggers.ts`) is the only producer of
movement terrain PSRs. It returns, in step order, the PSRs to queue and any
jump-entry bog-down that sticks a BattleMech without a roll. Callers apply the
effects to their own state and event stream; none re-derives the triggers.
Water, rubble, skid and ice PSRs follow MegaMek `Mek.canFall`: only a
BattleMech-like unit that is not prone rolls them. Water entry also skips
hover, VTOL, naval, hydrofoil, submarine, UMU, swim and WiGE motive modes, so
callers pass the unit's motive mode when they know it.

The rules follow MegaMek 48fcb2f64: a water roll for every step into a water
hex (`Entity.checkWaterMove`, no exit roll), `+1` for ultra-rubble (rubble
level above 5), and ice as reckless movement (`Entity.checkRecklessMove`): one
roll per non-jump step taken in an ice hex. There is no running-through-rough
roll. `planDisplacementTerrainPSRs` is the single producer for a unit forced
into a hex (domino today): building collapse, bog-down and water entry only
(`TWGameManager.doEntityDisplacement`), with no movement-step stamp.

The runner applies the effects in `queueMovementTerrainPSRs`. Interactive paths
(the session, its AI, `GameEngine` movement and P2P host translation) apply them
through `gameSessionMovementTerrain`, right after `MovementDeclared` and before
the movement is locked; the End-phase PSR drain resolves them. Interactive
steps come from the canonical decomposition of the declared path, so
`movement-step:<n>` matches the runner's numbering without adding steps to the
declared payload.

`planRunningWithDamagePSR` (`runningDamagePsr.ts`) is the only producer of the
running-with-damaged-hip-or-gyro roll. MegaMek 48fcb2f64 rolls it once after
the whole path (`MovePathHandler.java` L1283-L1286, `TWRulesPSR.java` L62-L77)
for a Run, Sprint or Evade move by a unit that can fall, when the gyro damage
counts (a heavy-duty gyro ignores its first hit) or a leg that is not
destroyed has a hip crit. A hip and a gyro are one roll, and a Walk or Jump
never rolls. The PSR is stamped with the last step and queued ahead of the
terrain PSRs; the runner's `queueMovementDamagePSRs` and
`gameSessionMovementTerrain` both call the planner.

`stuckRecovery.ts` owns the movement-start recovery roll: which stuck units may
roll, the `swamp_unstuck` PSR for the unit's hex, and the roll itself. Event
emission and state changes stay with the caller. The runner rolls it at the
start of `runMovementPhase`; the interactive session and
`GameEngine.runToCompletion` roll it through `rollSessionStuckRecovery`
right after advancing from Initiative into Movement, with the session's dice.
