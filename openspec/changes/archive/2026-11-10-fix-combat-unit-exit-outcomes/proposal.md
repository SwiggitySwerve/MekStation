## Why

A unit can leave a battle three ways: it is destroyed, its pilot ejects, or
it retreats off a map edge. The flags behind those exits are read by seven
hand-rolled operability predicates and written by reducers that do not
exclude each other, and none of the three exits reach the combat outcome:

- Ejected and retreated units are scored Intact with an Active pilot.
- A damaged enemy that retreated becomes salvage.
- A unit destroyed with a knocked-out (not dead) pilot records the pilot KIA.
- The retreat and withdrawal latches share `retreatTargetEdge`, so a later
  latch overwrites the first unit's edge.

Rules follow the pinned MegaMek 48fcb2f64 and MekHQ e7adc2c:

- Ejection destroys the abandoned unit as a salvageable wreck
  (`TWGameManager.java:30273-30286`, `REMOVE_EJECTED`; `Game.java:1334-1344`
  counts it as graveyard).
- Retreat is `REMOVE_IN_RETREAT` (`Game.java:1367-1379`). MekHQ's retreated
  loop (`ResolveScenarioTracker.java:568-608`) handles only the player side,
  so an enemy that retreated is never salvage.
- Enemy graveyard wrecks, ejected units included, are salvage
  (`ResolveScenarioTracker.java:658-680`). A player-side wreck is lost when
  the player does not control the field (`assignFoundEntity(wreck, !control)`,
  `ResolveScenarioTracker.java:637`).
- A pilot is dead when hits reach 6 (`PersonStatus.setHits`/`isDead`,
  `ResolveScenarioTracker.java:2615-2645`); MegaMek sets hits to 6 on crew
  death or doom and not once ejected (`Crew.java:1201-1215, 1252-1258`), and
  a destroyed head dooms the crew (`TWGameManager.java:23879-23880`).
  Unconsciousness is not a post-battle status.

## What Changes

Two sequential PRs.

1. Unit operability and exit latches:
   - One `getUnitOperability` helper (`exitReason`, `onField`, `crewActive`,
     `canAct`) replaces the seven predicates. Every call site keeps its
     current meaning, pinned by characterization tests.
   - Exit reducers latch once: a later eject, retreat, retreat trigger or
     withdrawal for a unit that already left the battle is ignored.
   - The retreat and withdrawal latches keep the first edge.
   - `declarePlayerWithdrawal` refuses a retreating unit.
   - The victory page lists retreated and ejected units by how they left.
2. Combat outcome:
   - Additive optional `IUnitCombatDelta.exitReason` (`'ejected' |
     'retreated'`), omitted when the unit did not exit.
   - KIA only for lethal wounds or a pilot-killing destruction, never once
     ejected.
   - Salvage excludes retreated enemies and includes ejected ones; co-op
     salvage shares the same eligibility helper.
   - An ejected player unit loses `combatReady` when the player did not win.
   - Outcomes persisted without the field are read through the `report.log`
     event order.

## Impact

Affected capabilities: combat-morale-and-withdrawal, combat-resolution.

Replay: journals with the newly guarded orderings (an exit after another
exit, or a second latch with a different edge) fold differently. The replay,
checkpoint, digest and golden suites are unchanged before and after.
No replay schema pack, event payload or SQLite shape changes.
`COMBAT_OUTCOME_VERSION` stays 1.
