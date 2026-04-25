# Change: Add Post-Battle Review UI

## Why

Phase 1's `add-victory-and-post-battle-summary` (B6) produces a basic
post-battle report from the event log, but it's raw numbers — damage dealt,
damage received, kills. Phase 3 generates much richer data: per-unit
casualties with per-location armor/structure loss, pilot XP awarded,
pilot wounds and status transitions, salvage awarded split employer vs.
mercenary, contract mission completion, repair queue updates with C-Bill
estimates. Players need a single screen that surfaces all of this after a
battle, so that "what just happened to my campaign?" is immediately
legible. This change provides that screen.

## What Changes

- Add `/gameplay/games/[id]/review` route — the post-battle review page
- New `post-battle-ui` capability (new spec)
- Outcome summary header: winner, end reason, turn count, BV delta, MVP
- Per-unit casualty panel with hoverable armor diagram — shows armor lost
  per location, structure lost per location, destroyed components listed
  by slot with visual damage overlay on the mech silhouette
- Per-pilot outcome panel — XP earned (itemized: scenario + kill + task
  - mission), wound count, consciousness rolls, final status badge
    (ACTIVE / WOUNDED / UNCONSCIOUS / KIA / MIA / CAPTURED)
- Salvage panel — two columns (employer award + mercenary award) showing
  awarded units and parts with BV and estimated repair cost
- Contract status panel — scenarios played, mission result, morale shift,
  C-Bill earnings so far, remaining scenarios before fulfillment
- Repair queue preview — ticket count, total C-Bill cost, longest expected
  repair, parts shortage count
- "Return to Campaign" CTA — commits the outcome to the pending queue (if
  not already), closes the tactical session, returns player to campaign
  dashboard with a toast confirming "X XP awarded, Y salvage secured"
- Responsive (mobile column-stack, desktop side-by-side)
- Re-openable from `/gameplay/matches/[id]` (persisted match log already
  stores the outcome per `add-combat-outcome-model`)

## Dependencies

- **Requires**: `add-combat-outcome-model` (data shape),
  `add-post-battle-processor` (pilot XP + status fields are populated in
  the outcome), `add-salvage-rules-engine` (salvage allocation surfaces in
  outcome), `add-repair-queue-integration` (repair preview)
- **Requires (Phase 1 B6)**: `add-victory-and-post-battle-summary` —
  extends B6's `/gameplay/matches/[id]` page rather than replacing it
- **Required By**: `wire-encounter-to-campaign-round-trip` (this is the
  user-visible hand-off point)

## Impact

- Affected specs: `after-combat-report` (MODIFIED — B6's report extended
  with per-pilot XP + salvage + repair preview sections), new
  `post-battle-ui` (ADDED — layout + interaction rules for the review
  screen)
- Affected code: new `src/app/gameplay/games/[id]/review/page.tsx`, new
  `src/components/gameplay/post-battle/` directory
  (CasualtyPanel, PilotOutcomePanel, SalvagePanel, ContractStatusPanel,
  RepairPreviewPanel, ArmorDiagram, OutcomeSummaryHeader), extends
  `src/stores/gameplayStore.ts` with `reviewReady` selector
- Non-goals: applying effects (already done by processors via
  `add-post-battle-processor`), editable ticket UI (use existing repair
  UI), salvage rejection / custom splits (future change)
