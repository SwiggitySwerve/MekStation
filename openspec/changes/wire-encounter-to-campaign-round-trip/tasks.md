# Tasks: Wire Encounter To Campaign Round Trip

## 1. Encounter → Session Linkage

- [ ] 1.1 Extend `EncounterService.launchEncounter` signature: accept
      `contractId?` and `scenarioId?` alongside the encounter
- [ ] 1.2 Pass these into the `IGameSession` config as fields
      `encounterId`, `contractId`, `scenarioId`
- [ ] 1.3 Assert that launched sessions have these fields populated when
      the source is a contract (fail fast if they're null)
- [ ] 1.4 Update `encounterToGameSession.ts` tests to assert linkage

## 2. Session Completion Emits Outcome Bus Event

- [ ] 2.1 Add `CombatOutcomeReady` to the session-level event bus (in
      `src/engine/InteractiveSession.ts`)
- [ ] 2.2 On `GameEnded`, derive `ICombatOutcome` (per
      `add-combat-outcome-model`) and publish `CombatOutcomeReady`
- [ ] 2.3 POST outcome to `/api/matches` for persistence
- [ ] 2.4 Include `matchId` in the bus payload

## 3. Campaign Store Subscribes To Outcomes

- [ ] 3.1 In `src/stores/campaign/campaignStore.ts`, subscribe to the
      `CombatOutcomeReady` bus event
- [ ] 3.2 On receipt, enqueue the outcome into
      `campaign.pendingBattleOutcomes` if `matchId` is not already present
      (idempotent push)
- [ ] 3.3 Persist the queue alongside the campaign record
- [ ] 3.4 Emit a campaign-level `PendingOutcomeAdded` event so the
      dashboard can re-render

## 4. Review UI → Campaign Handoff

- [ ] 4.1 On the review page's "Return to Campaign" CTA, ensure the
      outcome is in the pending queue (re-enqueue if not, matched by
      matchId — still idempotent)
- [ ] 4.2 Close the tactical session in session store
- [ ] 4.3 Navigate to `/campaign?pendingBattle=<matchId>`

## 5. Campaign Dashboard Pending-Outcomes Banner

- [ ] 5.1 Add `PendingOutcomesBanner` component on the campaign dashboard
- [ ] 5.2 Banner visible whenever `pendingBattleOutcomes.length > 0`
- [ ] 5.3 Banner summary: "N pending battle outcomes — advance day to
      apply"
- [ ] 5.4 Banner lists match ids with links to each review page for
      re-inspection
- [ ] 5.5 Banner dismisses itself once queue is drained by the
      post-battle processor

## 6. Day Advancement Pipeline Order

- [ ] 6.1 Register `postBattleProcessor` at the start of the "battle
      effects" group
- [ ] 6.2 Register `salvageProcessor` after `postBattleProcessor`
- [ ] 6.3 Register `repairQueueBuilderProcessor` after `salvageProcessor`
- [ ] 6.4 These three run before the existing `contractProcessor`,
      `healingProcessor`, `maintenanceProcessor`
- [ ] 6.5 Document the full order in `dayAdvancement.ts` header comment

## 7. Day Advancement Audit Card

- [ ] 7.1 Aggregate the effects applied by the three battle-effects
      processors into a per-day `IDailyBattleAuditEntry`
- [ ] 7.2 Entry fields: matches processed, total XP awarded, pilots
      wounded/KIA/MIA, salvage value secured, repair tickets created
- [ ] 7.3 Surface the entry in the campaign dashboard's audit feed
- [ ] 7.4 Clicking the entry navigates to the relevant match review pages

## 8. Scenario Generation Linkage

- [ ] 8.1 Update `scenarioGenerationProcessor` so every generated scenario
      produced from a contract records the `contractId` on the resulting
      encounter record
- [ ] 8.2 When `EncounterService.launchEncounter` is called, the
      `contractId` flows through per task group 1

## 9. Contract Lifecycle Events

- [ ] 9.1 When `postBattleProcessor` flags a contract as fulfilled,
      publish `ContractFulfilled` event
- [ ] 9.2 `contractProcessor` listens and closes the contract (final
      payment, faction standing, contract removal from active list) on its
      next run
- [ ] 9.3 Surface closure in the campaign dashboard as an audit entry

## 10. End-to-End Test

- [ ] 10.1 Integration test: mock contract → generated encounter →
      launched session → simulated battle outcome → review → return to
      campaign → day advance → assert state
- [ ] 10.2 Assertions: pilots have XP, wounded pilots in medical queue,
      units have combat state reflecting damage, salvage inventory has
      awarded items, repair queue has expected tickets
- [ ] 10.3 E2E test: full Playwright flow replicating a single-contract
      play loop

## 11. Error & Recovery Paths

- [ ] 11.1 If the player quits mid-battle, no outcome is produced — queue
      remains untouched; session marked abandoned
- [ ] 11.2 If `postBattleProcessor` fails on an outcome, it stays in the
      queue with an error flag; banner shows "1 outcome failed to apply —
      see details" link
- [ ] 11.3 Retry on next day advance or via manual "retry application"
      button in the review page

## 12. Documentation

- [ ] 12.1 Add `docs/architecture/campaign-combat-loop.md` with a sequence
      diagram covering: contract → encounter → session → outcome → queue →
      processors → campaign state
- [ ] 12.2 Cross-link the doc from the main architecture index
