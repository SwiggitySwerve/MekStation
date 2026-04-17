# Tasks: Add Bot Retreat Behavior

## 1. Retreat State on IAIUnitState

- [ ] 1.1 Add `isRetreating: boolean` and `retreatTargetEdge: 'north' | 'south' | 'east' | 'west' | null` fields to `IAIUnitState` in `src/simulation/ai/types.ts`
- [ ] 1.2 Default both to `false` / `null` when the session builder constructs the unit state
- [ ] 1.3 Write unit tests confirming defaults and that fields survive event replay

## 2. Retreat Trigger Evaluation

- [ ] 2.1 Add `shouldRetreat(unit, behavior)` helper in `BotPlayer` (or new `RetreatAI.ts` module) that returns true when either trigger fires
- [ ] 2.2 Trigger A: `sum(destroyed internal structure points) / sum(starting internal structure points) > behavior.retreatThreshold`
- [ ] 2.3 Trigger B: unit has received any through-armor critical on cockpit, gyro, or engine this match (check game event log for `CriticalHitApplied` events with matching locations)
- [ ] 2.4 Set `isRetreating = true` and `retreatTargetEdge = resolveEdge(behavior, unit, grid)` once triggered — lock the edge for the rest of the match
- [ ] 2.5 Write unit tests: unit at 51% structural loss triggers; cockpit TAC triggers even at 0% structural loss; `retreatEdge = 'none'` suppresses trigger

## 3. Target Edge Resolution

- [ ] 3.1 Implement `resolveEdge(behavior, unit, grid)` that returns the concrete edge to retreat toward
- [ ] 3.2 For explicit edges (`north`/`south`/`east`/`west`), return the field value directly
- [ ] 3.3 For `nearest`, compute the edge with minimum axial distance from the unit's current hex; break ties deterministically (north → east → south → west)
- [ ] 3.4 For `none`, return `null` and retreat stays disabled
- [ ] 3.5 Write unit tests covering each branch, including edge-distance ties

## 4. Retreat Movement Scoring

- [ ] 4.1 In `MoveAI`, when `attacker.isRetreating === true`, override the scoring formula with retreat-specific weights
- [ ] 4.2 Score `+1000 * progressTowardEdge` where progress is the delta in Chebyshev distance from the retreat edge before vs. after the move (positive = closer to edge)
- [ ] 4.3 Score `+200` if the move's ending facing points the forward arc toward the retreat edge (maximizes future run MP)
- [ ] 4.4 Score `-50` for jump moves (discourage jumping during retreat) — effectively force Run by making Run always outscore Jump when progress is equal
- [ ] 4.5 Skip the standard line-of-sight scoring — retreating units do not care about maintaining LoS
- [ ] 4.6 Write unit tests: retreating unit with edge `north` picks the move with largest northward progress; equal-progress moves pick the one facing north; jump move loses to equivalent run move

## 5. Movement Type Selection While Retreating

- [ ] 5.1 Override `BotPlayer.selectMovementType` so that when `unit.isRetreating === true`, the return value is `MovementType.Run` whenever `capability.runMP > 0`
- [ ] 5.2 Fall back to `MovementType.Walk` if Run is unavailable (e.g., leg actuator damage prevents running)
- [ ] 5.3 Never return `MovementType.Jump` during retreat
- [ ] 5.4 Write unit tests covering each fallback path

## 6. Retreat-Aware Attack Behavior

- [ ] 6.1 When `unit.isRetreating === true`, reduce the effective `safeHeatThreshold` passed to `AttackAI` heat management by 2 (minimum 0)
- [ ] 6.2 Exclude weapons whose mount arc does not align with the retreat forward facing (retreating units do not twist away from the escape path)
- [ ] 6.3 Skip physical-attack declarations entirely for retreating units
- [ ] 6.4 Write unit tests: retreating unit with threshold 13 uses effective 11; retreating unit with rear-mounted weapons and target behind still fires rear weapons (rear mounts align with escape facing when escape is away from enemy)

## 7. Retreat Completion Event

- [ ] 7.1 Add `GameEventType.UnitRetreated` with payload `{ unitId: string; retreatEdge: 'north'|'south'|'east'|'west'; turn: number }`
- [ ] 7.2 In `BotPlayer.playMovementPhase`, detect when the move reaches a hex on the target edge (`grid.isEdgeHex(destination, retreatTargetEdge) === true`)
- [ ] 7.3 Emit `UnitRetreated` in addition to the movement event for that turn
- [ ] 7.4 In the session reducer, mark the retreated unit as `destroyed: true` for victory-check purposes but distinguish it from combat destruction (for post-battle summary accuracy)
- [ ] 7.5 Write integration tests covering the full retreat arc: trigger → multi-turn withdrawal → edge reached → event emitted → unit removed from active list

## 8. Determinism & Edge Cases

- [ ] 8.1 Retreat triggers SHALL be pure functions of game state — no randomness — so identical states always yield identical retreat decisions
- [ ] 8.2 If a retreating unit cannot move (immobilized, all legs destroyed) it SHALL remain in place, continue firing under reduced-heat rules, and SHALL NOT emit `UnitRetreated`
- [ ] 8.3 If both triggers fire in the same turn, `isRetreating` is set once — no double-trigger side effects
- [ ] 8.4 If the retreat edge is directly adjacent at trigger time, the unit SHALL reach the edge on its next movement phase (single-turn retreat is valid)
- [ ] 8.5 Write unit tests covering each edge case above
