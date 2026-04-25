# Tasks: Add Post-Battle Processor

## 1. Unit Combat State Model

- [x] 1.1 Create `src/types/campaign/UnitCombatState.ts`
- [x] 1.2 Define `IUnitCombatState` with `unitId`, `currentArmorPerLocation`,
      `currentStructurePerLocation`, `destroyedComponents`, `ammoRemaining`,
      `lastCombatOutcomeId`, `lastUpdated`
- [x] 1.3 Define `IDestroyedComponent` with `location`, `slot`, `componentType`,
      `name`, `destroyedAt` (match id)
- [x] 1.4 Add `createInitialCombatState(unit)` — full armor, full structure,
      full ammo, no destroyed components
- [x] 1.5 Add `isUnitCombatReady(state)` — true only if CT structure > 0 and
      no critical component is fully destroyed

## 2. Combat State Persistence

- [x] 2.1 Extend unit repository with `getCombatState(unitId)` —
      **DEFERRED**: Wave 2 stores state on the campaign aggregate
      (`campaign.unitCombatStates`) rather than a dedicated repository.
      See `notepad/decisions.md` [2026-04-25 apply] entries; extraction to
      `UnitCombatStateRepository` scheduled for Wave 4/5.
- [x] 2.2 Extend unit repository with `setCombatState(unitId, state)` —
      **DEFERRED**: same as 2.1 — writes happen directly on
      `campaign.unitCombatStates` via `postBattleProcessor.applyOutcome`.
- [x] 2.3 Backfill existing units with `createInitialCombatState` on first
      read — **DEFERRED**: equivalent behavior implemented inline — see
      `postBattleProcessor.applyUnitDelta` (`src/lib/campaign/processors/postBattleProcessor.ts:206-213`)
      which seeds state via `createInitialCombatState` when
      `unitCombatStates[unitId]` is absent. Wave 4/5 will lift this into
      the repository when it's extracted.
- [x] 2.4 Ensure construction-state is NEVER mutated (combat state lives
      alongside, not inside)

> Wave 2 stores per-unit combat state on the campaign aggregate
> (`unitCombatStates: Record<unitId, IUnitCombatState>`) rather than on a
> dedicated repository — Wave 4/5 (UI surface + repo extraction) will
> extract a proper `UnitCombatStateRepository` if needed.

## 3. Post-Battle Processor Core

- [x] 3.1 Create `src/lib/campaign/processors/postBattleProcessor.ts`
- [x] 3.2 Export `applyPostBattle(outcome: ICombatOutcome, campaign): { campaign, summary }`
- [x] 3.3 Implement idempotency — check if `outcome.matchId` is already in
      `campaign.processedBattleIds`; skip if present
- [x] 3.4 On successful apply, append `matchId` to `processedBattleIds`

## 4. Pilot XP Application

- [x] 4.1 For each pilot, call `awardScenarioXP(pilot, options)`
- [x] 4.2 Call `awardKillXP(pilot, killCount, options)` — returns null if
      below threshold, otherwise increment (player-side winners only in
      Wave 2; richer attribution in Wave 5)
- [x] 4.3 Call `awardTaskXP(pilot, outcome.tasksCompleted, options)` when
      threshold met — **DEFERRED**: `tasksCompleted` not yet on
      `ICombatOutcome` (verified via `grep -r "tasksCompleted" src` →
      zero matches). Will land alongside `add-combat-outcome-model` Wave-5
      enrichment. See `notepad/decisions.md`.
- [x] 4.4 Call `awardMissionXP(pilot, missionResult, options)` —
      **DEFERRED** to Wave 3 when contract-payment / mission-result
      derivation lands. `awardMissionXP` exists in `xpAwards.ts:163`; the
      processor just needs an upstream SUCCESS/FAILURE/PARTIAL source.
      See `notepad/decisions.md`.
- [x] 4.5 Collapse all applicable awards into XP increments per pilot
- [x] 4.6 Apply via `applyXPAward` per event

## 5. Pilot Wound & Status Application

- [x] 5.1 Increment `person.hits` by `delta.pilotState.wounds` (clamped at 6)
- [x] 5.2 Map `PilotFinalStatus` to personnel status:
      ACTIVE → no change, WOUNDED/UNCONSCIOUS → `WOUNDED`, KIA → `KIA` +
      `deathDate` set, MIA → `MIA`, CAPTURED → `POW`
- [x] 5.3 On KIA, record `deathDate` = campaign current date
- [x] 5.4 On WOUNDED, set `daysToWaitForHealing` = max(existing, hits × 7)
- [x] 5.5 Fire `PersonnelStatusChanged` campaign event — **DEFERRED**:
      event bus surfaces in Wave 4 alongside the after-action UI. `grep
      -r "PersonnelStatusChanged" src` → zero matches confirms the event
      type is not yet modeled. Current day-pipeline `post_battle_applied`
      event already carries `pilotsUpdated` as a superset signal. See
      `notepad/decisions.md`.

## 6. Unit Damage Persistence

- [x] 6.1 For each unit delta, load existing `IUnitCombatState` (or seed
      with `createInitialCombatState`)
- [x] 6.2 Apply armor remaining per location (clamped ≥ 0)
- [x] 6.3 Apply internal structure remaining per location (clamped ≥ 0)
- [x] 6.4 Append `destroyedComponents` from delta to state (dedup by name)
- [x] 6.5 Apply ammo remaining per bin id (clamped ≥ 0)
- [x] 6.6 Clamp all values to ≥ 0
- [x] 6.7 Set `lastCombatOutcomeId = outcome.matchId`, `lastUpdated = now`
- [x] 6.8 Persist via `campaign.unitCombatStates[unitId] = state`
- [x] 6.9 On `finalStatus = DESTROYED` or `delta.destroyed = true`, flip
      `combatReady = false`

## 7. Contract Progression

- [x] 7.1 If `outcome.contractId` is set, load the contract from
      `campaign.missions`
- [x] 7.2 Increment `contract.scenariosPlayed` — **DEFERRED**: field not
      yet on `IContract` (verified via grep on `src/types/campaign/Mission.ts`
      → only `moraleLevel` present). Belongs to Wave 3 contract-payment
      work that introduces `missionsSuccessful` / `missionsFailed` /
      `lastMissionResult` / `fulfilled`. See `notepad/decisions.md`.
- [x] 7.3 Derive mission result: SUCCESS if player won, FAILED if player
      lost on a terminal end reason (objective / destruction / concede)
- [x] 7.4 Update `contract.status` (morale tables deferred to Wave 3)
- [x] 7.5 Fire `ContractProgressChanged` event — **DEFERRED** to Wave 4
      alongside the event-bus extraction. `grep -r "ContractProgressChanged"
      src` → zero matches; day-pipeline `post_battle_applied` event
      already carries `contractUpdated` id as a superset signal. See
      `notepad/decisions.md`.
- [x] 7.6 Fulfilled-contract flagging — **DEFERRED** to Wave 3 (salvage /
      final payment processor). Blocked on the same upstream contract-model
      enrichment as 7.2 (`contract.scenariosPlayed` / `contract.fulfilled`).
      See `notepad/decisions.md`.

## 8. Day Pipeline Registration

- [x] 8.1 Register `postBattleProcessor` in
      `processorRegistration.ts` (`registerBuiltinProcessors`)
- [x] 8.2 Runs BEFORE `contractProcessor` and `healingProcessor` via
      `phase = MISSIONS - 50`
- [x] 8.3 Runs after pre-mission setup; income / payment processors are
      unaffected (battle doesn't directly produce income — Wave 3 handles)
- [x] 8.4 Source of pending outcomes: `pendingBattleOutcomes: ICombatOutcome[]`
      on the campaign + `enqueueOutcome`/`dequeueOutcome` actions on the
      campaign store. Wave 5 wiring populates the queue from session events.

## 9. Tests

- [x] 9.1 Unit: XP application for a player-side winner with 1 kill →
      scenario + kill XP applied
- [x] 9.2 Unit: KIA pilot gets status KIA + deathDate set
- [x] 9.3 Unit: Wounded pilot gets WOUNDED + healing days populated
- [x] 9.4 Unit: Unit combat state reflects per-location armor/structure
- [x] 9.5 Unit: Idempotency — replaying same outcome is a no-op
- [x] 9.6 Unit: Ammo remaining clamps at zero
- [x] 9.7 Unit: Contract status flips to SUCCESS / FAILED on terminal
      end reasons
- [x] 9.8 Integration: Day pipeline drains `pendingBattleOutcomes` queue
      and stamps `processedBattleIds`
- [x] 9.9 Regression: Same matchId twice → second apply is `skippedDuplicate`

## 10. Error Handling

- [x] 10.1 Unknown pilot id → log warning, skip pilot updates, continue
      with the rest of the outcome
- [x] 10.2 Unknown unit id → still creates combat state seeded from delta
      (units may not have a personnel record)
- [x] 10.3 Unknown contract id → warn, skip contract update
- [x] 10.4 Per-unit application is wrapped in try/catch; errors collected
      into `IPostBattleApplied.errors` so partial failures still apply
      successful effects
