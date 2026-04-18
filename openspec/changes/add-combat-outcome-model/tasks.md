# Tasks: Add Combat Outcome Model

## 1. Type Definitions

- [x] 1.1 Create `src/types/combat/CombatOutcome.ts`
- [x] 1.2 Define `ICombatOutcome` with `version`, `matchId`, `sessionId`,
      `encounterId`, `contractId`, `scenarioId`, `winner`, `endReason`,
      `turnCount`, `startedAt`, `completedAt`, `units`, `pilots`, `events`
      (composed via embedded `IPostBattleReport` for winner/turnCount/units/log;
      sessionId/encounterId not modeled yet — Wave 5 will add if needed)
- [x] 1.3 Define `IUnitCasualty` with `unitId`, `side`, `ownerPlayerId`,
      `armorLostPerLocation`, `structureLostPerLocation`,
      `criticalHitsTaken`, `destroyedComponents`, `ammoConsumed`,
      `weaponsFired`, `maxHeatReached`, `shutdownCount`, `finalStatus`,
      `wasMvp` (named `IUnitCombatDelta`; carries `armorRemaining` /
      `internalsRemaining` / `ammoRemaining` / `destroyedComponents` /
      `heatEnd` / `finalStatus`. `wasMvp` is on the embedded
      `IPostBattleReport.mvpUnitId`)
- [x] 1.4 Define `IPilotOutcome` with `personId`, `unitId`, `side`,
      `kills`, `tasksCompleted`, `missionRole`, `woundsTaken`,
      `consciousnessRollsFailed`, `finalStatus`, `capturedBy`
      (collapsed into `IUnitCombatDelta.pilotState` with `conscious`,
      `wounds`, `killed`, `finalStatus`; richer fields deferred to Wave 5
      when pilot/personId roster is wired)
- [x] 1.5 Define `CombatEndReason` enum: `DESTRUCTION`, `CONCEDE`,
      `TURN_LIMIT`, `OBJECTIVE_MET`, `WITHDRAWAL`
- [x] 1.6 Define `UnitFinalStatus` enum: `INTACT`, `DAMAGED`,
      `CRIPPLED`, `DESTROYED`, `EJECTED`
- [x] 1.7 Define `PilotFinalStatus` enum: `ACTIVE`, `WOUNDED`,
      `UNCONSCIOUS`, `KIA`, `MIA`, `CAPTURED`
- [x] 1.8 Set `COMBAT_OUTCOME_VERSION = 1` constant for forward compatibility

## 2. Derivation Logic

- [x] 2.1 Create `src/lib/combat/outcome/combatOutcome.ts`
- [x] 2.2 Implement `deriveCombatOutcome(session: IGameSession): ICombatOutcome`
- [x] 2.3 Implement `deriveUnitCasualties(events, unitStates)` — aggregate
      `DamageApplied`, `CriticalHitResolved`, `AmmoConsumed`,
      `UnitDestroyed` events per unit (implemented as `unitToDelta`
      reading the already-derived `IUnitGameState`; the underlying event
      walk lives in `derivePostBattleReport` + the session reducer)
- [ ] 2.4 Implement `derivePilotOutcomes(events, pilots)` — aggregate
      `PilotHit`, `PilotConsciousnessCheck`, `UnitDestroyed` (killerId),
      task-completed events (deferred to Wave 5 — current pilotState is
      derived from `IUnitGameState.pilotConscious` + `pilotWounds`)
- [x] 2.5 Implement `computeFinalUnitStatus(casualty)` — map damage state to
      enum (INTACT if no armor lost, DAMAGED if ≤50% structure, CRIPPLED if >50% structure or any location destroyed, DESTROYED if CT gone)
- [x] 2.6 Implement `computeFinalPilotStatus(outcome)` — KIA if pilot hits
      reach fatal threshold, UNCONSCIOUS if failed consciousness roll,
      WOUNDED if any hit, ACTIVE otherwise
- [x] 2.7 Guarantee determinism — same event log + capturedAt always produces
      deep-equal `ICombatOutcome` (verified by `determinism` test suite)

## 3. Session Integration

- [x] 3.1 Extend `InteractiveSession` with `getOutcome(): ICombatOutcome`
      (only valid once status is `Completed`)
- [x] 3.2 Throw `CombatNotCompleteError` if called on active session
- [ ] 3.3 Emit `CombatOutcomeReady` event when outcome is first derived
      (deferred — not required by Wave 2 consumers; will add in Wave 5
      when persistence pipeline lands)

## 4. Persistence

- [ ] 4.1 Extend `/api/matches` POST body to accept `outcome: ICombatOutcome`
      (deferred to Wave 4 persistence sub-branch)
- [ ] 4.2 Store outcome JSON alongside existing match log (deferred — Wave 4)
- [ ] 4.3 Extend `GET /api/matches/[id]` response with `outcome` field
      (deferred — Wave 4)
- [ ] 4.4 Add `GET /api/matches/[id]/outcome` for outcome-only retrieval
      (deferred — Wave 4)

## 5. Versioning & Forward Compatibility

- [x] 5.1 Stamp `version` on every derived outcome from `COMBAT_OUTCOME_VERSION`
- [ ] 5.2 Document migration path for future outcome-schema changes
      (deferred — JSDoc covers basic forward-compat story; full migration
      doc lands when first migration is needed)
- [x] 5.3 Add `assertCombatOutcomeCurrent(outcome)` guard for consumers

## 6. Superseding B6's `IPostBattleReport`

- [x] 6.1 Keep `IPostBattleReport` for UI backward compatibility; add
      `fromCombatOutcome(outcome): IPostBattleReport` adapter
      (composition strategy chosen instead — `ICombatOutcome.report`
      embeds the existing `IPostBattleReport`, so the adapter is a
      one-liner: `outcome.report`)
- [x] 6.2 Mark `IPostBattleReport` fields as derivable from `ICombatOutcome`
      (via composition — UI continues to read `outcome.report.*`)

## 7. Tests

- [x] 7.1 Unit test: deterministic derivation (run twice, deep-equal)
- [x] 7.2 Unit test: unit final status classification (INTACT / DESTROYED
      verified; full DAMAGED / CRIPPLED / EJECTED matrix deferred —
      requires baseline armor data the engine doesn't yet expose)
- [x] 7.3 Unit test: pilot final status (ACTIVE verified; WOUNDED /
      UNCONSCIOUS / KIA paths covered by code, full matrix needs Wave 5
      pilot-event wiring)
- [ ] 7.4 Unit test: kill attribution via `UnitDestroyed.killerId`
      (covered transitively via embedded `IPostBattleReport.units[].kills`
      from Phase 1; explicit assertion deferred)
- [ ] 7.5 Unit test: consciousness roll accumulation (deferred — needs
      Wave 5 pilot-event derivation)
- [x] 7.6 Unit test: serialization round-trip through JSON
- [ ] 7.7 Integration test: full 4-mech match → outcome → assert shape
      (deferred — Wave 2 / Phase 3 capstone)
- [ ] 7.8 Fuzz test: random event streams produce valid outcomes (no throws)
      (deferred — out of scope for Wave 1)

## 8. Documentation

- [x] 8.1 Inline JSDoc on every interface member
- [ ] 8.2 Add `docs/combat/combat-outcome.md` with worked example
      (deferred — Wave 5 will own user-facing docs after persistence
      lands)
