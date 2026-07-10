# Root Cause - Instant Defeat On Initiative

## Repro

Headless repro used the campaign materializer unit-selection shape, then the same battle page session-build path:

1. `WIZARD_REPRESENTATIVE_UNITS` produced the starter roster refs `locust-lct-1v`, `hunchback-hbk-4g`, `marauder-mad-3r`, `atlas-as7-d`.
2. `selectOpponentUnits({ count: 4, seed: "fresh-campaign:mission-1" })` produced the same four refs, rotated: `marauder-mad-3r`, `atlas-as7-d`, `locust-lct-1v`, `hunchback-hbk-4g`.
3. Those forces went through `buildPreparedBattleData`, then `GameEngine.createInteractiveSession`, then one `interactive.advancePhase()` from Initiative.

The temporary repro script was run with:

```powershell
npx.cmd tsx -r tsconfig-paths/register tmp-root-cause-repro.ts
```

The script is not retained in the repo after this investigation wave.

## Observed Values

Canonical adaptation succeeded and HP was nonzero before the first phase advance:

| Unit | Player armor/structure/heat | Opponent armor/structure/heat |
| --- | --- | --- |
| Locust LCT-1V | 64 / 33 / 0 | 64 / 33 / 0 |
| Hunchback HBK-4G | 160 / 83 / 0 | 160 / 83 / 0 |
| Marauder MAD-3R | 184 / 114 / 0 | 184 / 114 / 0 |
| Atlas AS7-D | 304 / 152 / 0 | 304 / 152 / 0 |

`session.units` contained 8 entries with those nonzero combat seeds. But `session.currentState.units` contained only 4 keys:

```text
locust-lct-1v
hunchback-hbk-4g
marauder-mad-3r
atlas-as7-d
```

Every surviving current-state entry was side `opponent`. The player entries had been overwritten before any combat event:

```json
{
  "currentStateUnitKeyCount": 4,
  "outcomeInputs": [
    { "id": "locust-lct-1v", "side": "opponent", "destroyed": false, "hasRetreated": false, "hasEjected": false, "armorTotal": 64, "structureTotal": 33, "heat": 0 },
    { "id": "hunchback-hbk-4g", "side": "opponent", "destroyed": false, "hasRetreated": false, "hasEjected": false, "armorTotal": 160, "structureTotal": 83, "heat": 0 },
    { "id": "marauder-mad-3r", "side": "opponent", "destroyed": false, "hasRetreated": false, "hasEjected": false, "armorTotal": 184, "structureTotal": 114, "heat": 0 },
    { "id": "atlas-as7-d", "side": "opponent", "destroyed": false, "hasRetreated": false, "hasEjected": false, "armorTotal": 304, "structureTotal": 152, "heat": 0 }
  ],
  "survivors": { "player": 0, "opponent": 4 },
  "isGameEnded": true
}
```

After one Initiative advance, the phase became Movement but the session immediately completed with:

```json
{
  "eventTypes": ["game_created", "game_started", "initiative_rolled", "initiative_order_set", "phase_changed", "game_ended"],
  "result": {
    "winner": "opponent",
    "reason": "elimination",
    "description": "Defeat. All friendly units destroyed or exited combat.",
    "playerUnitsDestroyed": 0,
    "opponentUnitsDestroyed": 0,
    "playerUnitsSurviving": 0,
    "opponentUnitsSurviving": 4,
    "playerDamageDealt": 0,
    "opponentDamageDealt": 0,
    "turnsPlayed": 1
  },
  "gameEndedEvent": { "winner": "opponent", "reason": "destruction", "turns": 1 }
}
```

## Producing Code Path

- `src/lib/campaign/wizard/representativeUnits.ts:9-31` defines the four starter canonical refs.
- `src/lib/campaign/encounter/materializeCampaignMissionEncounter.forceUnits.ts:10-23` maps selected roster units directly to force unit refs, and `src/lib/campaign/encounter/materializeCampaignMissionEncounter.forceUnits.ts:35-56` creates OpFor refs from the same representative set.
- `src/lib/campaign/encounter/materializeCampaignMissionEncounter.ts:328-344` creates the player force from `rosterUnitsToForceUnits(rosterUnits)` and the opponent force from `selectOpponentUnits({ count: rosterUnits.length, seed: ... })`.
- `src/components/gameplay/pages/preBattleSessionBuilder.ts:90-99` adapts each assignment; `src/components/gameplay/pages/preBattleSessionBuilder.ts:114-132` then uses `playerAdapted[index]?.id` and `opponentAdapted[index]?.id` as `IGameUnit.id`. For mirrored canonical units, both sides therefore receive the same ids.
- `src/engine/InteractiveSession.setup.ts:105-115` also indexes adapted combat seeds by `unit.id`, but the observed seeds remained nonzero, so this is not the instant-defeat trigger.
- `src/utils/gameplay/gameState/lifecycle.ts:25-38` replays the GameCreated payload into `const units: Record<string, IUnitGameState> = {}` and assigns `units[unit.id] = createInitialUnitState(...)`. The later opponent entries overwrite the earlier player entries with the same ids.
- `src/utils/gameplay/gameState/initialization.ts:139-140` seeds armor/structure from the game unit, and `src/utils/gameplay/gameState/initialization.ts:157-189` initializes `destroyed: false`, `hasRetreated: false`, and `hasEjected: false`.
- `src/services/game-resolution/GameOutcomeCalculator.ts:89-103` counts surviving units from `Object.values(state.units)` by side and live flags, not by armor/structure. `src/services/game-resolution/GameOutcomeCalculator.ts:272-289` turns the resulting `playerSurviving = 0`, `opponentSurviving = 4` into opponent elimination victory.
- `src/services/game-resolution/GameOutcomeCalculator.ts:385-396` makes that collapsed state count as game-ended. `src/engine/InteractiveSession.lifecycle.ts:93-117` calls finalization after phase advancement, and `src/engine/InteractiveSession.lifecycle.ts:140-154` finalizes when `isInteractiveSessionGameOver` is true.
- `src/engine/InteractiveSession.outcome.ts:36-55` maps the calculated elimination result to the published `game_ended` event reason `destruction`.

## Hypothesis Result

Confirmed new root cause, not H1/H2/H3 as written: duplicate `IGameUnit.id` values collapse the player force out of `currentState.units`.

H1 is not confirmed as "zero or undefined armor/structure causes destruction." Runtime values showed the Locust at 64 armor / 33 structure / 0 heat and all eight session units had nonzero seeds. The outcome logic does not read HP to decide survival in this path; it reads `destroyed`, `hasRetreated`, `hasEjected`, and `side` from `state.units`.

H2 is not confirmed. `GameOutcomeCalculator` correctly counted the state it was given. The bad input was already present: four opponent units and zero player units in `currentState.units`.

H3 is not confirmed. The repro used a single `interactive.advancePhase()` from Initiative. The UI helper also calls `interactiveSession.advancePhase()` once for known advanceable phases at `src/stores/useGameplayStore.helpers.ts:130-137`. The instant completion happens because finalization runs after that single advance and sees the already-collapsed state.

## Diff Confirmation

`git blame` shows the direct duplicate-id expressions in `preBattleSessionBuilder.ts:115` and `preBattleSessionBuilder.ts:132` date to `03f39c105c` from 2026-02-15, and the state reducer overwrite at `gameState/lifecycle.ts:37` dates to `7b7bfe1030` from 2026-02-13. Those were latent assumptions. The regression became reachable in `a6decc27288233d3f1f10152b968479c6c8a1702` / PR #1015, `fix(campaign): roster reaches battle - canonical wizard units, vault pilots, full-selection materializer`, which introduced the representative starter canonical refs, the full-selection materializer, `selectOpponentUnits`, and the 4v4 launch integration test. `git blame` assigns `representativeUnits.ts:9-31`, `materializeCampaignMissionEncounter.forceUnits.ts:1-56`, and the materializer call site at `materializeCampaignMissionEncounter.ts:328-344` to that commit. The suspected stat-seeding work did run, but the runtime evidence shows it seeded armor/structure correctly; the actual failure is identity collision plus `Record<unit.id, state>` overwrite.

No fix is proposed or implemented in this wave.

## Wave 2 Fix Evidence

Implemented the producer-side identity fix in `src/components/gameplay/pages/preBattleSessionBuilder.ts`.

- Before: `buildGameUnits` used the adapted/catalog id as deployed `IGameUnit.id` for player and opponent units (`src/components/gameplay/pages/preBattleSessionBuilder.ts:114-132` in the accepted root-cause note), so mirrored player/OpFor canonical refs collided.
- After: `buildSessionUnitId` now constructs `{side}-{slot}-{canonicalRef}` ids (`src/components/gameplay/pages/preBattleSessionBuilder.ts:83-88`), and player/opponent game-unit ids are assigned with that helper at `src/components/gameplay/pages/preBattleSessionBuilder.ts:134` and `src/components/gameplay/pages/preBattleSessionBuilder.ts:151`.
- The canonical ref remains separate in `unitRef` (`src/components/gameplay/pages/preBattleSessionBuilder.ts:140` and `src/components/gameplay/pages/preBattleSessionBuilder.ts:157`).
- The returned adapted units are also aliased to the same deployed ids so engine lookup maps and combat-seed splicing remain keyed consistently (`src/components/gameplay/pages/preBattleSessionBuilder.ts:91-99`, `src/components/gameplay/pages/preBattleSessionBuilder.ts:206-227`). This preserves `InteractiveSession.setup` expectations that weapons, movement, tonnage, and seed maps are keyed by `unit.id` (`src/engine/InteractiveSession.setup.ts:67-68`, `src/engine/InteractiveSession.setup.ts:105-110`).

Red/green launch-integrity test:

- Added `src/__tests__/integration/campaignMissionEncounterLaunchIntegrity.test.ts`.
- Pre-fix red command:

```text
npm.cmd test -- --watchAll=false --runTestsByPath src/__tests__/integration/campaignMissionEncounterLaunchIntegrity.test.ts --runInBand
```

- Key pre-fix failure:

```text
Expected length: 8
Received length: 4
Received array:  ["locust-lct-1v", "hunchback-hbk-4g", "marauder-mad-3r", "atlas-as7-d"]

src/__tests__/integration/campaignMissionEncounterLaunchIntegrity.test.ts:200
expect(Object.keys(launched.currentState.units)).toHaveLength(8);
```

- Post-fix green command:

```text
npm.cmd test -- --watchAll=false --runTestsByPath src/__tests__/integration/campaignMissionEncounterLaunchIntegrity.test.ts src/__tests__/integration/campaignMissionEncounterLaunch.test.ts src/components/gameplay/pages/__tests__/preBattleSessionBuilder.test.ts src/engine/__tests__/InteractiveSession.recovery.test.ts src/services/game-resolution/__tests__/GameOutcomeCalculator.test.ts --runInBand
```

- Post-fix result: 5 suites passed, 42 tests passed.
- The new test asserts 8 distinct `currentState.units` keys after launch (`src/__tests__/integration/campaignMissionEncounterLaunchIntegrity.test.ts:207`), nonzero armor/structure matching the mocked canonical sheets (`src/__tests__/integration/campaignMissionEncounterLaunchIntegrity.test.ts:212-224`), Movement phase after one Initiative advance (`src/__tests__/integration/campaignMissionEncounterLaunchIntegrity.test.ts:229`), Active status/no terminal result (`src/__tests__/integration/campaignMissionEncounterLaunchIntegrity.test.ts:230-231`), 8 live units (`src/__tests__/integration/campaignMissionEncounterLaunchIntegrity.test.ts:232-237`), and no `GameEnded` event (`src/__tests__/integration/campaignMissionEncounterLaunchIntegrity.test.ts:238-242`).

Ripple list found and handled:

- Producer id construction fixed in `src/components/gameplay/pages/preBattleSessionBuilder.ts:83-99`, `src/components/gameplay/pages/preBattleSessionBuilder.ts:134`, `src/components/gameplay/pages/preBattleSessionBuilder.ts:151`, and `src/components/gameplay/pages/preBattleSessionBuilder.ts:206-227`.
- Builder regression expectations updated so deployed ids use the new shape while `unitRef` remains canonical (`src/components/gameplay/pages/__tests__/preBattleSessionBuilder.test.ts:133`, `src/components/gameplay/pages/__tests__/preBattleSessionBuilder.test.ts:141`, `src/components/gameplay/pages/__tests__/preBattleSessionBuilder.test.ts:166-192`, `src/components/gameplay/pages/__tests__/preBattleSessionBuilder.test.ts:282-320`, `src/components/gameplay/pages/__tests__/preBattleSessionBuilder.test.ts:344-409`).
- Recovery path fixed because it re-adapts by canonical `unitRef` but must key recovered engine maps by deployed `IGameUnit.id` (`src/engine/InteractiveSession.recovery.ts:48`). The regression test covers mirrored deployed ids sharing the same canonical `unitRef` (`src/engine/__tests__/InteractiveSession.recovery.test.ts:243-293`).
- Supplemental display maps were checked: armor/structure/pilot/heat/weapons are already keyed by `session.units[].id` (`src/stores/useGameplayStore.session.ts:184`, `src/stores/useGameplayStore.helpers.ts:177-185`), so no source change was needed after the adapted-id alignment.
- Rail/token DOM testids were checked: UnitToken renders `unit-token-${token.unitId}` (`src/components/gameplay/UnitToken/UnitTokenForType.metadata.ts:116`) and TacticalTurnRail renders `rail-unit-${unit.id}` (`src/components/gameplay/TacticalTurnRail/TacticalTurnRail.tsx:153`) from the runtime id, so they naturally follow the new deployed id shape. UnitToken tests passed post-fix.
- Tactical rail lookup was checked: rail metadata maps `gameUnits` by deployed `unit.id` (`src/components/gameplay/TacticalTurnRail/TacticalTurnRail.tsx:284`), so no source change was needed.
- Movement/attack handler paths were checked through the targeted GameEngine, useQuickGameStore, usePreBattleLaunch, and gameplay recovery tests. They treat unit ids as opaque runtime ids, and the aligned adapted ids keep movement/weapon maps coherent.
- Outcome-predicate table test added for alive, partially destroyed, fully destroyed, and mutual destruction force shapes (`src/services/game-resolution/__tests__/GameOutcomeCalculator.test.ts:451-508`). This guards the H2-style predicate behavior separately from the producer identity bug.

Additional validation:

```text
npm.cmd test -- --watchAll=false --runTestsByPath src/engine/__tests__/GameEngine.test.ts src/stores/__tests__/useQuickGameStore.test.ts src/components/gameplay/pages/preBattle/__tests__/usePreBattleLaunch.test.ts src/components/gameplay/UnitToken/__tests__/UnitTokenForType.01.test.tsx src/components/gameplay/UnitToken/__tests__/UnitTokenForType.02.test.tsx src/components/gameplay/UnitToken/__tests__/UnitTokenForType.03.test.tsx src/components/gameplay/UnitToken/__tests__/UnitTokenForType.05.test.tsx --runInBand
```

Result: 7 suites passed, 77 tests passed.

```text
npm.cmd test -- --watchAll=false --runTestsByPath src/stores/__tests__/useGameplayStore.recover.test.ts src/lib/multiplayer/server/__tests__/MatchHostRegistry.unitBootstrap.test.ts src/lib/multiplayer/__tests__/gameIntentMap.test.ts src/types/multiplayer/__tests__/Protocol.test.ts --runInBand
```

Result: 4 suites passed, 67 tests passed.

```text
npm.cmd run typecheck
```

Result: passed.

Networked/co-op id-shape note:

- No old "unit id must equal canonical ref" dependency was found in the checked co-op/network wire-format surface. Existing multiplayer roster bootstrap already emits the same side/slot/ref family (`src/lib/multiplayer/matchRosterPresets.ts:158`, `src/lib/multiplayer/matchRosterPresets.ts:216`), and the server intent protocol/mapper validate unit ids as opaque nonempty strings (`src/types/multiplayer/Protocol.ts:79-157`, `src/lib/multiplayer/gameIntentMap.ts:268-383`).
- No co-op wire-format code was changed for this wave. The only persistence/recovery ripple changed here is `InteractiveSession.fromSessionAsync` adapted-id aliasing, because recovered playable sessions require engine maps keyed by deployed ids (`src/engine/InteractiveSession.recovery.ts:48`).
