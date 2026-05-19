# Change: Add Campaign Combat Loop

## Why

The campaign day pipeline and combat engine are each largely built, but the
seam between them is missing. `scenarioGenerationProcessor` emits a
`scenario_generated` day event carrying a deterministic `scenarioId`,
`contractId`, `opForBV`, and conditions — but **nothing turns that event into a
launchable `IEncounter`**. The player sees "a scenario was generated" and has no
way to play it. Conversely, when a tactical match completes, `InteractiveSession`
publishes `CombatOutcomeReady` and the campaign store enqueues it onto
`pendingBattleOutcomes`; the day pipeline already drains that queue through
`postBattleProcessor` → `salvageProcessor` → `repairQueueBuilderProcessor`. But
there is no triggered, automatic path from finishing a *campaign* mission to
that queue — the round trip is only specified, not wired for campaign-launched
encounters.

This change is **integration wire-up only**. `postBattleProcessor`,
`salvageEngine`, and `repairQueueBuilder` are 60-70% built and are NOT
rebuilt here. The change supplies the three missing connectors: the
scenario-event → `IEncounter` persistence bridge, the campaign-mission →
encounter launch path, and the automatic `GameSession` completion →
`pendingBattleOutcomes` trigger for campaign-originated encounters — plus a
frozen post-battle inventory schema that the bay-UI change (CP2a) renders.

## What Changes

- ADDED a scenario-event → `IEncounter` bridge: a day-pipeline consumer reads
  `scenario_generated` events and persists a launchable `IEncounter` carrying
  the `scenarioId` / `contractId` linkage, OpFor force, map config, and victory
  conditions
- ADDED a campaign-mission → encounter launch path: opening a generated
  encounter from a campaign creates a `GameSession` with campaign linkage
  (`campaignId`, `contractId`, `scenarioId`) stamped on the session
- ADDED an automatic `GameSession` completion → `pendingBattleOutcomes` trigger:
  a campaign-linked session that publishes `CombatOutcomeReady` enqueues its
  outcome onto the originating campaign's queue without manual intervention
- ADDED a frozen post-battle inventory schema (`ICampaignInventory` —
  see design.md D4) that aggregates repair tickets, salvage allocations, and
  medical entries into one campaign-attached structure the bay UI reads
- ADDED an inventory-projection step: after the battle-effects processor block
  drains, a projection assembles the `ICampaignInventory` from the campaign's
  `repairTickets`, `salvageAllocations`, and `unitCombatStates`
- ADDED idempotency across the bridge: a `scenario_generated` event already
  bridged to an encounter is not bridged twice; a campaign-linked outcome
  already enqueued is not enqueued twice (by `matchId`)

## Dependencies

- **Requires**: `add-campaign-persistence` (CP0 — the campaign is read and
  written through the persistence store), `encounter-system` (`IEncounter`
  model, launch snapshot), `game-session-management` (`CombatOutcomeReady`,
  `Campaign Store Enqueues Outcomes`, `Day Advancement Applies Pending
  Outcomes`), `scenario-generation` (the `scenario_generated` event shape)
- **Required By**: `add-campaign-bay-ui` (CP2a — renders the frozen
  `ICampaignInventory`), and Wave 5 `add-coop-campaign-play` (co-op mission
  launch reuses this launch path)

## Impact

- Affected specs: `campaign-combat-loop` (new capability) — chosen over adding
  to `game-session-management` because the bridge spans scenario generation,
  encounter persistence, and the day pipeline; a dedicated capability keeps the
  cross-cutting wire-up coherent and gives CP2a a single schema to depend on
- Affected code: `src/lib/campaign/processors/` (new bridge consumer of
  `scenario_generated`), `src/lib/campaign/encounter/` (new
  scenario→encounter builder), `src/lib/campaign/inventory/` (new inventory
  projection), `src/stores/campaign/` (campaign-linked launch + enqueue trigger),
  `src/types/campaign/` (new `ICampaignInventory` and satellites)
- No new database engine — encounters persist through the existing
  `encounter-system` store; the inventory projection is a derived structure
  attached to the campaign snapshot
- Reuses, does not rebuild: `postBattleProcessor`, `salvageEngine`,
  `repairQueueBuilder` are consumed as-is

## Non-Goals

- Rebuilding `postBattleProcessor`, `salvageEngine`, or `repairQueueBuilder` —
  they are existing and only consumed
- The bay / repair / medical / salvage UI surfaces — that is CP2a; this change
  only freezes the schema CP2a renders
- AI-driven OpFor behavior in the launched encounter — Wave 2 owns AI
- Co-op mission launch with two players' forces — Wave 5 `add-coop-campaign-play`
- Manual ad-hoc encounter creation outside a campaign — `encounter-system`
  already covers standalone encounters
