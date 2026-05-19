# Tasks: Add Campaign Combat Loop

## 1. Inventory Schema Freeze

- [ ] 1.1 Add `ICampaignInventory`, `IRepairBayItem`, `ISalvageBayItem`, `IMedicalBayItem`, and `IInventorySummary` to `src/types/campaign/` exactly as frozen in design.md D4
- [ ] 1.2 Add a doc comment on each type marking the schema frozen and pointing CP2a at this change for any schema-change request
- [ ] 1.3 Type tests asserting every field is read-only and the projection sources (`IRepairTicket`, `ISalvageCandidate`) cover every `IRepairBayItem` / `ISalvageBayItem` field

## 2. Scenario-Event to Encounter Bridge

- [ ] 2.1 Implement `buildEncounterFromScenario(event, campaign)` mapping a `scenario_generated` payload onto an `IEncounter` with `campaignMeta = { campaignId, contractId, scenarioId }`
- [ ] 2.2 Derive the OpFor force from `opForBV` and `scenarioType` via the existing `opForGeneration` util; derive map config from scenario conditions; derive victory conditions from `scenarioType`
- [ ] 2.3 Implement `scenarioEncounterBridgeProcessor` at phase `DayPhase.EVENTS + 10`, consuming the day's `scenario_generated` events and persisting an `IEncounter` per event through the `encounter-system` store
- [ ] 2.4 Implement the `bridgedScenarioIds` idempotency set — a scenario already bridged is skipped
- [ ] 2.5 Register the bridge processor in `processorRegistration.ts`
- [ ] 2.6 Tests: a `scenario_generated` event yields one persisted launchable encounter with correct linkage; a re-run produces no duplicate; an empty day produces no encounters

## 3. Campaign-Linked Encounter Launch

- [ ] 3.1 Implement the campaign launch path — opening a generated encounter from a campaign creates a `GameSession` via the existing `encounter-system` launch snapshot
- [ ] 3.2 Stamp `campaignId`, `contractId`, and `scenarioId` onto the session using the existing `Session Carries Campaign Linkage` requirement
- [ ] 3.3 Tests: launching a generated encounter produces a campaign-linked session; the linkage fields round-trip to the session

## 4. Automatic Outcome Enqueue Trigger

- [ ] 4.1 Narrow the campaign store's `CombatOutcomeReady` handler — a session carrying campaign linkage enqueues its outcome onto that campaign's `pendingBattleOutcomes`
- [ ] 4.2 Preserve existing behavior — a session without campaign linkage is ignored
- [ ] 4.3 Reuse the duplicate-by-`matchId` guard so a re-published outcome is not enqueued twice
- [ ] 4.4 Tests: a campaign-linked session completion enqueues exactly once; a standalone skirmish is ignored; a duplicate `matchId` is dropped

## 5. Inventory Projection

- [ ] 5.1 Implement `projectCampaignInventory(campaign)` — a pure projection from `repairTickets`, `salvageAllocations`, and roster pilot injury state into `ICampaignInventory`
- [ ] 5.2 Implement a `CLEANUP`-phase processor that runs `projectCampaignInventory` after the battle-effects block drains and attaches the result to the campaign snapshot
- [ ] 5.3 Tests: projection from a populated post-battle campaign yields the expected `ICampaignInventory`; an empty campaign yields an empty inventory with zeroed summary; projection runs strictly after the battle-effects block

## 6. End-to-End Round Trip

- [ ] 6.1 Integration test: a generated scenario is bridged to an encounter, launched as a campaign-linked session, completed, and its outcome auto-enqueued
- [ ] 6.2 Integration test: advancing the day drains the enqueued outcome through the existing battle-effects processors and the inventory projection reflects the result
- [ ] 6.3 Integration test: the full round trip is idempotent — re-running the day produces no duplicate encounters, outcomes, or inventory entries

## 7. Verification

- [ ] 7.1 `openspec validate add-campaign-combat-loop --strict` clean
- [ ] 7.2 Build, lint, and typecheck pass
