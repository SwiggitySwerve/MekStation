# Tasks: Add AI Coordination Tactics

## 1. Coordination Tier Parameters

- [ ] 1.1 Add `IAITierCoordinationParameters` (`lanceCoordination`, `cohesionRadius`, `cohesionWeight`, `focusFireWeight`) and an optional `coordination` block on `IAITierParameters` in `src/simulation/ai/AITierRegistry.ts`
- [ ] 1.2 Populate the `coordination` block per tier — `Green`/`Regular`/`Veteran` fully inert (`lanceCoordination: false`, zeroed weights); `Elite` populated
- [ ] 1.3 Tests: every tier resolves a `coordination` block; `Veteran` stays exactly A1+A2 depth (coordination disabled)

## 2. Multi-Unit Threat Aggregation

- [ ] 2.1 Create `src/simulation/ai/AIThreatMap.ts` with `buildThreatMap(friendly, enemies)` returning ranked `IThreatEntry` records
- [ ] 2.2 Sum each enemy's threat across every friendly lance unit, reusing A2's threat scoring
- [ ] 2.3 Populate `engageableBy` with the friendly units that can reach each enemy this turn
- [ ] 2.4 Tests: a high-threat enemy ranks above a low-threat enemy; aggregation is order-independent; `engageableBy` excludes out-of-range units

## 3. Focus-Fire Coordination

- [ ] 3.1 Create `src/simulation/ai/AIFireCoordinator.ts` producing an `IFireAssignment` (`assignments` map + `finishableTargets`)
- [ ] 3.2 Prefer assignments where combined expected damage finishes a target this turn
- [ ] 3.3 Release surplus firepower from an already-finishable target to the next-ranked threat
- [ ] 3.4 When no target is finishable, concentrate on the highest-aggregate-threat target the most units can engage
- [ ] 3.5 In `playAttackPhase`, bias `selectTarget` toward the assigned target, falling back to the unit's own pick when the assignment is out of arc/range
- [ ] 3.6 Tests: two units finishing one target concentrate fire; surplus is released; an unreachable assignment falls back cleanly

## 4. Formation Cohesion

- [ ] 4.1 Add a cohesion term to `scoreMove`, multiplied by `cohesionWeight`, penalizing destinations beyond `cohesionRadius` from the lance centroid
- [ ] 4.2 Add an extra penalty when the destination enters enemy line of sight with no lancemate within `cohesionRadius`
- [ ] 4.3 A unit inside the cohesion radius SHALL pay no cohesion penalty
- [ ] 4.4 Gate the cohesion term on `lanceCoordination`; when disabled it contributes zero
- [ ] 4.5 Tests: a unit drifting from the lance is pulled back; advancing alone into enemy LOS is penalized; an in-radius unit is unaffected

## 5. Per-Lance Turn Plan

- [ ] 5.1 Create `src/simulation/ai/AILancePlanner.ts` with `planTurn(friendly, enemies)` returning an immutable `ILanceTurnPlan`
- [ ] 5.2 Compute the threat map, fire assignment, and lance centroid once per side per turn
- [ ] 5.3 Add an optional lance-context parameter to `BotPlayer.playMovementPhase`/`playAttackPhase`; callers that omit it get the per-unit behavior
- [ ] 5.4 Tests: the plan is deterministic for a given unit set; per-unit decisions consume the plan; omitting the context reproduces pre-change behavior

## 6. Verification

- [ ] 6.1 Integration test: an `Elite` lance focus-fires and destroys a target in one turn where a `Veteran` lance spreads damage and kills none
- [ ] 6.2 Integration test: an `Elite` lance advances in formation; a `Veteran` lance lets a unit wander ahead
- [ ] 6.3 Determinism test: SimulationRunner golden traces on the `Veteran` tier are byte-identical to pre-change traces
- [ ] 6.4 `npx openspec validate add-ai-coordination-tactics --strict` reports valid
- [ ] 6.5 Build, lint, and typecheck pass
