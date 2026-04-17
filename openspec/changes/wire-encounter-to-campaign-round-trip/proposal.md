# Change: Wire Encounter To Campaign Round Trip

## Why

Every Phase 3 piece (outcome model, post-battle processor, salvage, repair
queue, review UI) is a component. This change is the integration glue that
makes them a system. The end-to-end flow must work: player accepts a
contract → campaign generates an encounter → player launches a game session
→ Phase 1 engine plays out → `ICombatOutcome` emitted → outcome flows through
review UI → pushed to `pendingBattleOutcomes` → next day-advance runs the
post-battle, salvage, and repair processors → player sees the consequences
on the campaign dashboard. Without this change, each Phase 3 piece works in
isolation but the overall loop is broken.

## What Changes

- Extend `EncounterService.launchEncounter` so the returned `gameSessionId`
  carries forward `encounterId`, `contractId`, and `scenarioId` onto the
  `IGameSession` configuration (today it produces the session but linkage
  is incomplete)
- Extend the `InteractiveSession` completion handler: when `GameEnded`
  fires, automatically derive `ICombatOutcome` and persist to
  `/api/matches` (wired in `add-combat-outcome-model`), then emit a global
  `CombatOutcomeReady` bus event the campaign store listens for
- Extend campaign store: subscribing to `CombatOutcomeReady`, enqueue the
  outcome into `campaign.pendingBattleOutcomes` (guard against double-push
  by checking `matchId`)
- Extend `wire-encounter-to-campaign-round-trip` flow: on `Return to
Campaign` from the review UI, navigate to the campaign dashboard with a
  query flag (`?pendingBattle=<matchId>`) so the dashboard shows a
  "Pending battle outcomes — advance day to apply" banner
- Extend the day-advancement flow: when the player clicks "Advance day",
  run `postBattleProcessor` + `salvageProcessor` + `repairQueueBuilderProcessor`
  as part of the pipeline before other processors; surface an audit card
  on the dashboard summarizing applied effects (N XP, K pilots wounded, J
  C-Bills salvage value, R tickets created)
- Extend scenario generation: when `scenarioGenerationProcessor` creates a
  scenario for a contract, tag the resulting encounter with the contract
  id so the full linkage is preserved through the entire loop

## Dependencies

- **Requires**: `add-combat-outcome-model`, `add-post-battle-processor`,
  `add-salvage-rules-engine`, `add-repair-queue-integration`,
  `add-post-battle-review-ui`
- **Requires (Phase 1 A1–A7, B6)**: correct combat math and post-battle
  summary — this change assumes those land first
- **Required By**: none — this is the terminal Phase 3 integration

## Impact

- Affected specs: `game-session-management` (MODIFIED — session carries
  encounter/contract/scenario linkage, emits outcome bus event),
  `contract-types` (MODIFIED — contract lifecycle event when a pending
  outcome advances its state), `scenario-generation` (MODIFIED —
  contract-generated encounters preserve full linkage)
- Affected code: extends
  `src/services/encounter/EncounterService.ts` (inject linkage into
  session config), extends
  `src/engine/InteractiveSession.ts` (emit outcome bus event on
  completion), extends
  `src/stores/campaign/campaignStore.ts` (subscribe to
  `CombatOutcomeReady`), extends
  `src/lib/campaign/dayAdvancement.ts` (registers the three new
  processors in order), extends
  `src/app/campaign/page.tsx` (pending-outcomes banner and audit card)
- Non-goals: multiplayer sync of outcomes (Phase 4), contract negotiation
  UI changes (already in contract-types spec), alternative paths for
  abandoning outcomes (future — for now, outcomes are always applied)
