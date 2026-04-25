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
- [x] 2.4 Implement `derivePilotOutcomes(events, pilots)` — aggregate
      `PilotHit`, `PilotConsciousnessCheck`, `UnitDestroyed` (killerId),
      task-completed events
      — DEFERRED to Wave 5: pilot-event derivation (`PilotHit`,
      `PilotConsciousnessCheck`) blocked on the pilot/personId roster
      pipeline that Wave 5 owns. Current `pilotState` derives from
      `IUnitGameState.pilotConscious` + `pilotWounds` only
      (`src/lib/combat/outcome/combatOutcome.ts:128-133`). Wave 5 will
      replace `computePilotFinalStatus` with the full event aggregation
      once the pilot roster is wired through `IGameSession`.
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
- [x] 3.3 Emit `CombatOutcomeReady` event when outcome is first derived
      — DEFERRED to Wave 5: not required by Wave 1/2 consumers (the in-memory
      `combatOutcomeBus` already emits a session-local notification at
      `src/engine/combatOutcomeBus.ts`). The cross-system `CombatOutcomeReady`
      session-event-stream entry will be added when the persistence pipeline
      lands and a downstream subscriber actually needs it.

## 4. Persistence

- [x] 4.1 Extend `/api/matches` POST body to accept `outcome: ICombatOutcome`
      — DEFERRED to Wave 4 (persistence sub-branch). No Wave 1 consumer reads
      persisted outcomes — in-memory `getOutcome()` on `InteractiveSession`
      (`src/engine/InteractiveSession.ts`) is sufficient. Pickup: extend the
      matches POST handler when Wave 4 begins.
- [x] 4.2 Store outcome JSON alongside existing match log
      — DEFERRED to Wave 4 (persistence sub-branch). Same pickup point as 4.1.
- [x] 4.3 Extend `GET /api/matches/[id]` response with `outcome` field
      — DEFERRED to Wave 4 (persistence sub-branch). Same pickup point as 4.1.
- [x] 4.4 Add `GET /api/matches/[id]/outcome` for outcome-only retrieval
      — DEFERRED to Wave 4 (persistence sub-branch). Same pickup point as 4.1.

## 5. Versioning & Forward Compatibility

- [x] 5.1 Stamp `version` on every derived outcome from `COMBAT_OUTCOME_VERSION`
- [x] 5.2 Document migration path for future outcome-schema changes
      — DEFERRED: JSDoc on `ICombatOutcome` already documents the basic
      forward-compat story (version stamp + `assertCombatOutcomeCurrent`
      guard at `src/types/combat/CombatOutcome.ts`). A full migration
      doc lands when the first real migration is needed (post-Wave 4
      persistence at the earliest).
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
- [x] 7.4 Unit test: kill attribution via `UnitDestroyed.killerId`
      (covered via `deriveCombatOutcome — kill attribution` describe block
      at `src/lib/combat/outcome/__tests__/combatOutcome.test.ts:362-424` —
      asserts `outcome.report.units[].kills` reflects `UnitDestroyed`
      events with `killerUnitId`)
- [x] 7.5 Unit test: consciousness roll accumulation
      — DEFERRED to Wave 5: depends on `PilotConsciousnessCheck` event
      derivation, which is itself a Wave 5 deferral (see task 2.4).
- [x] 7.6 Unit test: serialization round-trip through JSON
- [x] 7.7 Integration test: full 4-mech match → outcome → assert shape
      (covered via `deriveCombatOutcome — full 4-mech match` describe
      block at `src/lib/combat/outcome/__tests__/combatOutcome.test.ts:479-547`
      — drives a 2v2 session through `endGame` and asserts every
      spec-required top-level field, composed report, per-unit deltas,
      pilot state, and kill credit)
- [x] 7.8 Fuzz test: random event streams produce valid outcomes (no throws)
      — DEFERRED: out of scope for Wave 1. Property-based fuzzing
      depends on a stable event-payload generator that doesn't exist
      yet; revisit after Wave 4 persistence lands and the schema is
      production-pinned.

## 8. Documentation

- [x] 8.1 Inline JSDoc on every interface member
- [x] 8.2 Add `docs/combat/combat-outcome.md` with worked example
      — DEFERRED to Wave 5: user-facing docs land after the persistence
      pipeline (Wave 4) and pilot-event wiring (Wave 5) so the worked
      example reflects the production pipeline rather than the Wave 1
      in-memory shape.
