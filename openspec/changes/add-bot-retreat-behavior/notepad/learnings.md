# Learnings — add-bot-retreat-behavior

## [2026-04-24 apply] Pre-existing scaffolding map

- `RetreatAI.ts` exposes `shouldRetreat`, `resolveEdge`, `scoreRetreatMove`, `effectiveSafeHeatThreshold`, `retreatMovementType`, `hasReachedEdge` — all pure helpers.
- `BotPlayer.evaluateRetreat` returns a `RetreatTriggered` event when triggers fire (caller appends to session events).
- `BotPlayer.selectMovementType` already routes retreating units through `retreatMovementType` (Run / Walk / never Jump).
- `MoveAI.selectMove` retreat branch already lives at `MoveAI.ts:271-300` — uses `scoreRetreatMove`, no LoS scoring.
- Reducers `applyRetreatTriggered` + `applyUnitRetreated` were already wired into `gameStateReducer.applyEvent`.
- `GameEngine.phases.runMovementPhase` already had `UnitRetreated` emission via `RetreatAI.hasReachedEdge`.

## [2026-04-24 apply] Critical formula gap (task 2.2 blocker — FIXED)

The orchestrator's apply-wave note flagged `BotPlayer.computeRetreatSignals` using `destroyedLocations.length / totalLocations`. Replaced with the spec-mandated `sum(starting - current) / sum(starting)` (`BotPlayer.ts:453-507`). The signature is now `computeRetreatSignals(unitId, session, currentStructure, startingStructure)` — pure function fed by the new `IUnitGameState.startingInternalStructure` field.

## [2026-04-24 apply] startingInternalStructure baseline propagation

Three feed points keep the baseline alive across the full session lifecycle:

1. **Initialization (`createInitialUnitState`):** seeds `startingInternalStructure: {}` (empty) so the field shape is stable for replay parity.
2. **CompendiumAdapter (`adaptUnitFromData`):** seeds `startingInternalStructure: { ...structure }` at session creation so the production path has full baseline data.
3. **Damage reducer (`applyDamageApplied`):** bootstraps any missing `startingInternalStructure[location]` from the pre-damage `unit.structure[location]` on first damage. This catches legacy callers / fixtures that didn't seed via the adapter.

## [2026-04-24 apply] Coordinate convention

- North edge = `r === +mapRadius`. South = `-mapRadius`. East = `q === +mapRadius`. West = `q === -mapRadius`.
- `RetreatAI.resolveEdge` uses `dNorth = mapRadius - position.r` (max 2*mapRadius at south edge, 0 at north edge).
- `RetreatAI.hasReachedEdge` uses the matching predicate (`position.r >= mapRadius` for north).
- Tests use `r = +mapRadius` for "on the north edge" — verified by smoke + compliance test fixtures.

## [2026-04-24 apply] Arc filter via twist suppression

`BotPlayer.playAttackPhase` clones the attacker with `torsoTwist: undefined` when retreating, then passes that to `AttackAI.selectWeapons`. Because the existing arc filter already keys off `attacker.facing + torsoTwist`, suppressing the twist forces the unit's true forward arc to govern weapon selection. Front-mounted weapons can no longer engage rear targets, but rear-mounted weapons (mountingArc=Rear) still match a rear target's relative arc and fire under the reduced heat budget.

## [2026-04-24 apply] UnitRetreated emission lives at engine wiring layer

`BotPlayer.playMovementPhase` only returns `MovementDeclared`. The engine layer (`GameEngine.phases.ts:174-202` AND `InteractiveSession.runAITurn:415-441`) calls `RetreatAI.hasReachedEdge` after `lockMovement` and emits `UnitRetreated` directly. Both phase drivers (autonomous + interactive) have parity.

## [2026-04-24 apply] Victory predicate updated to honor hasRetreated

`getSurvivingUnitsForSide` (`gameStateReducer.ts:271-282`) now filters on `!destroyed && !hasRetreated`. This lets the existing `isSideEliminated` / victory check honor withdrawn units without overloading the `destroyed` flag. Post-battle summaries can still distinguish withdrawal from combat loss via the two flags being independent.
