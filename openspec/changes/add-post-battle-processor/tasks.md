# Tasks: Add Post-Battle Processor

## 1. Unit Combat State Model

- [ ] 1.1 Create `src/types/campaign/UnitCombatState.ts`
- [ ] 1.2 Define `IUnitCombatState` with `unitId`, `currentArmorPerLocation`,
      `currentStructurePerLocation`, `destroyedComponents`, `ammoRemaining`,
      `lastCombatOutcomeId`, `lastUpdated`
- [ ] 1.3 Define `IDestroyedComponent` with `location`, `slot`, `componentType`,
      `name`, `destroyedAt` (match id)
- [ ] 1.4 Add `createInitialCombatState(unit)` — full armor, full structure,
      full ammo, no destroyed components
- [ ] 1.5 Add `isUnitCombatReady(state)` — true only if CT structure > 0 and
      no critical component is fully destroyed

## 2. Combat State Persistence

- [ ] 2.1 Extend unit repository with `getCombatState(unitId)`
- [ ] 2.2 Extend unit repository with `setCombatState(unitId, state)`
- [ ] 2.3 Backfill existing units with `createInitialCombatState` on first
      read
- [ ] 2.4 Ensure construction-state is NEVER mutated (combat state lives
      alongside, not inside)

## 3. Post-Battle Processor Core

- [ ] 3.1 Create `src/lib/campaign/processors/postBattleProcessor.ts`
- [ ] 3.2 Export `applyPostBattle(outcome: ICombatOutcome, campaign): ICampaignChange[]`
- [ ] 3.3 Implement idempotency — check if `outcome.matchId` is already in
      `campaign.processedBattleIds`; skip if present
- [ ] 3.4 On successful apply, append `matchId` to `processedBattleIds`

## 4. Pilot XP Application

- [ ] 4.1 For each `IPilotOutcome`, call `awardScenarioXP(pilot, options)`
- [ ] 4.2 Call `awardKillXP(pilot, outcome.kills, options)` — returns null if
      below threshold, otherwise increment
- [ ] 4.3 Call `awardTaskXP(pilot, outcome.tasksCompleted, options)` when
      threshold met
- [ ] 4.4 Call `awardMissionXP(pilot, missionResult, options)` — where
      `missionResult` is derived from `outcome.winner` and the pilot's side
- [ ] 4.5 Collapse all four into a single `IXPAwardEvent[]` for this pilot
- [ ] 4.6 Apply via `applyXPAward` per event

## 5. Pilot Wound & Status Application

- [ ] 5.1 Increment `person.medical.wounds` by `outcome.woundsTaken`
- [ ] 5.2 Map `PilotFinalStatus` to personnel status:
      ACTIVE → no change, WOUNDED → `WOUNDED`, UNCONSCIOUS → `WOUNDED` + in
      medical queue, KIA → `KIA` + removed from active roster, MIA → `MIA`,
      CAPTURED → `CAPTURED`
- [ ] 5.3 On KIA, record `dateOfDeath` = campaign current date
- [ ] 5.4 On WOUNDED, enqueue into medical/healing queue with expected
      recovery days
- [ ] 5.5 Fire `PersonnelStatusChanged` campaign event

## 6. Unit Damage Persistence

- [ ] 6.1 For each `IUnitCasualty`, load current `IUnitCombatState`
- [ ] 6.2 Subtract `armorLostPerLocation` from current armor per location
- [ ] 6.3 Subtract `structureLostPerLocation` from current structure per
      location
- [ ] 6.4 Append `destroyedComponents` from casualty to state (dedup by
      location+slot)
- [ ] 6.5 Subtract `ammoConsumed` from `ammoRemaining` per ammo type
- [ ] 6.6 Clamp all values to ≥ 0
- [ ] 6.7 Set `lastCombatOutcomeId = outcome.matchId`, `lastUpdated = now`
- [ ] 6.8 Persist via `setCombatState`
- [ ] 6.9 On `finalStatus = DESTROYED`, mark unit as unusable in roster
      (combat-ready = false, awaiting total write-off or salvage)

## 7. Contract Progression

- [ ] 7.1 If `outcome.contractId` is set, load the contract
- [ ] 7.2 Increment `contract.scenariosPlayed`
- [ ] 7.3 Derive mission result: SUCCESS if player winner + objectives met,
      FAILURE if player lost, PARTIAL if turn-limit/withdrawal with
      partial objectives
- [ ] 7.4 Update `contract.lastMissionResult` and `contract.morale` per AtB
      morale tables
- [ ] 7.5 Fire `ContractProgressChanged` event
- [ ] 7.6 If contract is fulfilled (all required scenarios played), flag it
      for `contractProcessor` final-payment run

## 8. Day Pipeline Registration

- [ ] 8.1 Register `postBattleProcessor` in `dayPipeline.ts`
- [ ] 8.2 Runs BEFORE `contractProcessor` (so contract sees updated mission
      result) and BEFORE `healingProcessor` (so healing sees new wounds)
- [ ] 8.3 Runs AFTER any income processors (battle doesn't produce income
      directly; salvage and contract payment come separately)
- [ ] 8.4 Source of pending outcomes: a queue on the campaign state
      `pendingBattleOutcomes: ICombatOutcome[]` populated by the wiring
      change in `wire-encounter-to-campaign-round-trip`

## 9. Tests

- [ ] 9.1 Unit: XP application for a pilot with 2 kills + 1 task → correct
      `IXPAwardEvent[]`
- [ ] 9.2 Unit: KIA pilot gets status KIA, removed from active roster
- [ ] 9.3 Unit: Wounded pilot enters medical queue with recovery days set
- [ ] 9.4 Unit: Unit combat state reflects per-location armor/structure loss
- [ ] 9.5 Unit: Destroyed component list dedupes on re-application of same
      outcome (idempotency)
- [ ] 9.6 Unit: Ammo consumption clamps at zero
- [ ] 9.7 Unit: Contract progression increments `scenariosPlayed` once per
      outcome
- [ ] 9.8 Integration: Full outcome → processor → all downstream campaign
      state updated correctly
- [ ] 9.9 Regression: Replaying the same outcome twice produces zero net
      change beyond the first application

## 10. Error Handling

- [ ] 10.1 Unknown pilot id in outcome → log warning, skip that pilot, keep
      processing the rest
- [ ] 10.2 Unknown unit id → same: warn, skip, continue
- [ ] 10.3 Unknown contract id → warn, skip contract update
- [ ] 10.4 Partial failure → any already-applied effects stay; processor
      surfaces an `IPostBattleResult` with `appliedChanges` and `errors`
