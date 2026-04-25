# Tasks: Add Bot Retreat Behavior

## 1. Retreat State on IAIUnitState

- [x] 1.1 Add `isRetreating: boolean` and `retreatTargetEdge: 'north' | 'south' | 'east' | 'west' | null` fields to `IAIUnitState` in `src/simulation/ai/types.ts`
- [x] 1.2 Default both to `false` / `null` when the session builder constructs the unit state — `createInitialUnitState` (`src/utils/gameplay/gameState/initialization.ts:53-87`) seeds `isRetreating: false`, `retreatTargetEdge: undefined`, `hasRetreated: false`, and `startingInternalStructure: {}`.
- [x] 1.3 Write unit tests confirming defaults and that fields survive event replay — `addBotRetreatBehavior.compliance.test.ts` § "IUnitGameState retreat defaults".

## 2. Retreat Trigger Evaluation

- [x] 2.1 Add `shouldRetreat(unit, behavior)` helper in `BotPlayer` (or new `RetreatAI.ts` module) that returns true when either trigger fires
- [x] 2.2 Trigger A: `sum(destroyed internal structure points) / sum(starting internal structure points) > behavior.retreatThreshold`. Implemented as the spec-mandated points-of-IS ratio in `BotPlayer.computeRetreatSignals` (`src/simulation/ai/BotPlayer.ts:453-507`). Starting baseline travels on `IUnitGameState.startingInternalStructure` (seeded by `CompendiumAdapter` and bootstrapped on first damage by `applyDamageApplied`). Pinned by `addBotRetreatBehavior.compliance.test.ts` § "Trigger A — points-of-internal-structure ratio".
- [x] 2.3 Trigger B: unit has received any through-armor critical on cockpit, gyro, or engine — implemented via a scan of `session.events` for `GameEventType.ComponentDestroyed` events with `payload.unitId` matching and `payload.componentType ∈ {cockpit, gyro, engine}` (`BotPlayer.ts:498-506`). Pinned by compliance test § "Trigger B — vital-component TAC".
- [x] 2.4 Set `isRetreating = true` and `retreatTargetEdge = resolveEdge(behavior, unit, grid)` once triggered — lock the edge for the rest of the match. The `applyRetreatTriggered` reducer (`extendedCombat.ts:259-281`) latches one-way; `evaluateRetreat` short-circuits when already latched. Pinned by compliance test § "Latch + edge lock".
- [x] 2.5 Write unit tests: unit at 51% structural loss triggers; cockpit TAC triggers even at 0% structural loss; `retreatEdge = 'none'` suppresses trigger — covered by `addBotRetreatBehavior.smoke.test.ts` and `.compliance.test.ts`.

## 3. Target Edge Resolution

- [x] 3.1 Implement `resolveEdge(behavior, unit, grid)` that returns the concrete edge to retreat toward
- [x] 3.2 For explicit edges (`north`/`south`/`east`/`west`), return the field value directly
- [x] 3.3 For `nearest`, compute the edge with minimum axial distance from the unit's current hex; break ties deterministically (north → east → south → west)
- [x] 3.4 For `none`, return `null` and retreat stays disabled
- [x] 3.5 Write unit tests covering each branch, including edge-distance ties

## 4. Retreat Movement Scoring

- [x] 4.1 In `MoveAI`, when `attacker.isRetreating === true`, override the scoring formula with retreat-specific weights — `MoveAI.selectMove` (`src/simulation/ai/MoveAI.ts:271-300`) routes through `scoreRetreatMove` and short-circuits the standard combat scorer.
- [x] 4.2 Score `+1000 * progressTowardEdge` where progress is the delta in Chebyshev distance from the retreat edge before vs. after the move (positive = closer to edge)
- [x] 4.3 Score `+200` if the move's ending facing points the forward arc toward the retreat edge (maximizes future run MP)
- [x] 4.4 Score `-50` for jump moves (discourage jumping during retreat) — effectively force Run by making Run always outscore Jump when progress is equal
- [x] 4.5 Skip the standard line-of-sight scoring — retreating units do not care about maintaining LoS. The retreat scoring branch in `selectMove` does not call `scoreMove` or `calculateLOS`; only `scoreRetreatMove` is invoked, which has no LoS term. Pinned indirectly by compliance test § "MoveAI retreat override".
- [x] 4.6 Write unit tests: retreating unit with edge `north` picks the move with largest northward progress; equal-progress moves pick the one facing north; jump move loses to equivalent run move

## 5. Movement Type Selection While Retreating

- [x] 5.1 Override `BotPlayer.selectMovementType` so that when `unit.isRetreating === true`, the return value is `MovementType.Run` whenever `capability.runMP > 0` — `BotPlayer.ts:419-433`. Pinned by compliance test § "selectMovementType retreat branch".
- [x] 5.2 Fall back to `MovementType.Walk` if Run is unavailable (e.g., leg actuator damage prevents running)
- [x] 5.3 Never return `MovementType.Jump` during retreat
- [x] 5.4 Write unit tests covering each fallback path — compliance test § "selectMovementType retreat branch".

## 6. Retreat-Aware Attack Behavior

- [x] 6.1 When `unit.isRetreating === true`, reduce the effective `safeHeatThreshold` passed to `AttackAI` heat management by 2 (minimum 0) — `RetreatAI.effectiveSafeHeatThreshold` (`RetreatAI.ts:112-125`).
- [x] 6.2 Exclude weapons whose mount arc does not align with the retreat forward facing (retreating units do not twist away from the escape path) — `BotPlayer.playAttackPhase` builds an `arcAttacker` with `torsoTwist: undefined` when retreating (`BotPlayer.ts:288-296`); `selectWeapons` then filters by the unit's true forward facing. Pinned by compliance test § "Retreating units do not torso-twist".
- [x] 6.3 Skip physical-attack declarations entirely for retreating units — `BotPlayer.playPhysicalAttackPhase` early-returns `null` when `attacker.isRetreating === true` (`BotPlayer.ts:343-354`). Pinned by compliance test § "Retreating units skip physical attacks".
- [x] 6.4 Write unit tests: retreating unit with threshold 13 uses effective 11; retreating unit with rear-mounted weapons and target behind still fires rear weapons — covered by smoke test § "effectiveSafeHeatThreshold" + compliance test § "Retreating units do not torso-twist" (rear-mount sub-case).

## 7. Retreat Completion Event

- [x] 7.1 Add `GameEventType.UnitRetreated` with payload `{ unitId: string; retreatEdge: 'north'|'south'|'east'|'west'; turn: number }` — declared in `GameSessionInterfaces.ts:178` + `IUnitRetreatedPayload` at line 879. `createUnitRetreatedEvent` lives at `gameEvents/status.ts:556-576`.
- [x] 7.2 In `BotPlayer.playMovementPhase`, detect when the move reaches a hex on the target edge (`grid.isEdgeHex(destination, retreatTargetEdge) === true`) — implemented at the engine wiring layer instead (`GameEngine.phases.ts:174-202` and `InteractiveSession.runAITurn`) using `RetreatAI.hasReachedEdge`. The detection lives where the session is mutable (the engine), not inside the BotPlayer (which has no session reference).
- [x] 7.3 Emit `UnitRetreated` in addition to the movement event for that turn — both `GameEngine.phases.runMovementPhase` and `InteractiveSession.runAITurn` append `UnitRetreated` immediately after `lockMovement` when `hasReachedEdge` is true.
- [x] 7.4 In the session reducer, mark the retreated unit as `destroyed: true` for victory-check purposes but distinguish it from combat destruction. **Implemented as:** `applyUnitRetreated` sets `hasRetreated: true` (`extendedCombat.ts:291-312`) WITHOUT setting `destroyed: true`; the victory-check predicate `getSurvivingUnitsForSide` (`gameStateReducer.ts:271-282`) excludes both `destroyed` AND `hasRetreated` units, so retreated units don't count toward side totals while staying distinct for post-battle summaries. Pinned by compliance test § "UnitRetreated reducer + victory exclusion".
- [x] 7.5 Write integration tests covering the full retreat arc: trigger → multi-turn withdrawal → edge reached → event emitted → unit removed from active list — covered by compliance test § "UnitRetreated reducer + victory exclusion" and the existing `wireBotAiHelpersAndCapstone.smoke.test.ts` retreat-arc tests.

## 8. Determinism & Edge Cases

- [x] 8.1 Retreat triggers SHALL be pure functions of game state — no randomness — so identical states always yield identical retreat decisions
- [x] 8.2 If a retreating unit cannot move (immobilized, all legs destroyed) it SHALL remain in place, continue firing under reduced-heat rules, and SHALL NOT emit `UnitRetreated`. **Implemented as:** `BotPlayer.playMovementPhase` returns `null` cleanly when no non-stationary moves exist, and the post-move `hasReachedEdge` guard reads `postMoveUnit.position` (unchanged from start when no move was declared). The `UnitRetreated` emission is only fired when the unit's NEW position lies on the edge — an immobilized unit not on the edge produces no event. Pinned indirectly by compliance test § "selectMovementType retreat branch / never selects Jump even when only Jump remains".
- [x] 8.3 If both triggers fire in the same turn, `isRetreating` is set once — no double-trigger side effects. `evaluateRetreat` returns ONE event (`vital_crit` reason takes precedence in the unified scan); `applyRetreatTriggered` reducer is idempotent per unit. Pinned by compliance test § "Dual-trigger latch".
- [x] 8.4 If the retreat edge is directly adjacent at trigger time, the unit SHALL reach the edge on its next movement phase (single-turn retreat is valid). `hasReachedEdge` runs after EVERY retreating move, including the very first turn after latch. The reducer fires `UnitRetreated` regardless of whether the latch was set this turn or earlier.
- [x] 8.5 Write unit tests covering each edge case above — compliance test § "Dual-trigger latch" + § "selectMovementType retreat branch".
