# Tasks: Add Combat Outcome Model

## 1. Type Definitions

- [ ] 1.1 Create `src/types/combat/CombatOutcome.ts`
- [ ] 1.2 Define `ICombatOutcome` with `version`, `matchId`, `sessionId`,
      `encounterId`, `contractId`, `scenarioId`, `winner`, `endReason`,
      `turnCount`, `startedAt`, `completedAt`, `units`, `pilots`, `events`
- [ ] 1.3 Define `IUnitCasualty` with `unitId`, `side`, `ownerPlayerId`,
      `armorLostPerLocation`, `structureLostPerLocation`,
      `criticalHitsTaken`, `destroyedComponents`, `ammoConsumed`,
      `weaponsFired`, `maxHeatReached`, `shutdownCount`, `finalStatus`,
      `wasMvp`
- [ ] 1.4 Define `IPilotOutcome` with `personId`, `unitId`, `side`,
      `kills`, `tasksCompleted`, `missionRole`, `woundsTaken`,
      `consciousnessRollsFailed`, `finalStatus`, `capturedBy`
- [ ] 1.5 Define `CombatEndReason` enum: `DESTRUCTION`, `CONCEDE`,
      `TURN_LIMIT`, `OBJECTIVE_MET`, `WITHDRAWAL`
- [ ] 1.6 Define `UnitFinalStatus` enum: `INTACT`, `DAMAGED`,
      `CRIPPLED`, `DESTROYED`, `EJECTED`
- [ ] 1.7 Define `PilotFinalStatus` enum: `ACTIVE`, `WOUNDED`,
      `UNCONSCIOUS`, `KIA`, `MIA`, `CAPTURED`
- [ ] 1.8 Set `COMBAT_OUTCOME_VERSION = 1` constant for forward compatibility

## 2. Derivation Logic

- [ ] 2.1 Create `src/lib/combat/outcome/combatOutcome.ts`
- [ ] 2.2 Implement `deriveCombatOutcome(session: IGameSession): ICombatOutcome`
- [ ] 2.3 Implement `deriveUnitCasualties(events, unitStates)` — aggregate
      `DamageApplied`, `CriticalHitResolved`, `AmmoConsumed`,
      `UnitDestroyed` events per unit
- [ ] 2.4 Implement `derivePilotOutcomes(events, pilots)` — aggregate
      `PilotHit`, `PilotConsciousnessCheck`, `UnitDestroyed` (killerId),
      task-completed events
- [ ] 2.5 Implement `computeFinalUnitStatus(casualty)` — map damage state to
      enum (INTACT if no armor lost, DAMAGED if ≤50% structure, CRIPPLED if >50% structure or any location destroyed, DESTROYED if CT gone)
- [ ] 2.6 Implement `computeFinalPilotStatus(outcome)` — KIA if pilot hits
      reach fatal threshold, UNCONSCIOUS if failed consciousness roll,
      WOUNDED if any hit, ACTIVE otherwise
- [ ] 2.7 Guarantee determinism — same event log always produces
      deep-equal `ICombatOutcome`

## 3. Session Integration

- [ ] 3.1 Extend `InteractiveSession` with `getOutcome(): ICombatOutcome`
      (only valid once status is `Completed`)
- [ ] 3.2 Throw `CombatNotCompleteError` if called on active session
- [ ] 3.3 Emit `CombatOutcomeReady` event when outcome is first derived

## 4. Persistence

- [ ] 4.1 Extend `/api/matches` POST body to accept `outcome: ICombatOutcome`
- [ ] 4.2 Store outcome JSON alongside existing match log
- [ ] 4.3 Extend `GET /api/matches/[id]` response with `outcome` field
- [ ] 4.4 Add `GET /api/matches/[id]/outcome` for outcome-only retrieval

## 5. Versioning & Forward Compatibility

- [ ] 5.1 Stamp `version` on every derived outcome from `COMBAT_OUTCOME_VERSION`
- [ ] 5.2 Document migration path for future outcome-schema changes
- [ ] 5.3 Add `assertCombatOutcomeCurrent(outcome)` guard for consumers

## 6. Superseding B6's `IPostBattleReport`

- [ ] 6.1 Keep `IPostBattleReport` for UI backward compatibility; add
      `fromCombatOutcome(outcome): IPostBattleReport` adapter
- [ ] 6.2 Mark `IPostBattleReport` fields as derivable from `ICombatOutcome`

## 7. Tests

- [ ] 7.1 Unit test: deterministic derivation (run twice, deep-equal)
- [ ] 7.2 Unit test: unit final status classification across all five states
- [ ] 7.3 Unit test: pilot final status across all five states
- [ ] 7.4 Unit test: kill attribution via `UnitDestroyed.killerId`
- [ ] 7.5 Unit test: consciousness roll accumulation
- [ ] 7.6 Unit test: serialization round-trip through JSON
- [ ] 7.7 Integration test: full 4-mech match → outcome → assert shape
- [ ] 7.8 Fuzz test: random event streams produce valid outcomes (no throws)

## 8. Documentation

- [ ] 8.1 Inline JSDoc on every interface member
- [ ] 8.2 Add `docs/combat/combat-outcome.md` with worked example
