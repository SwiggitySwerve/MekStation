## Context

Wave 8 added ledger-backed campaign corrections for salvage, repair, economy, inventory, and base unit state. The remaining campaign intervention gap is accumulated time: a GM may need to advance or repair one day, several travel days, a repair window, a contract deadline, a market cycle, or upkeep after players have already acted.

The repo already has a deterministic day pipeline in `src/lib/campaign/dayPipeline.ts` plus built-in processors for repair progress, contracts, finances, markets, and other daily campaign effects. Store actions such as `advanceDay`, `advanceDays`, and `travelToSystem` currently mutate live Zustand state directly. Wave 9 keeps those processors as the source of time rules, but wraps them in a preview/apply/replay contract for GM approvals.

## Goals / Non-Goals

**Goals:**

- Add a `time` campaign intervention domain that uses the shared intervention ledger.
- Preview one-day and multi-day campaign time advancement before state mutation.
- Capture changed state references, per-day summaries, generated day events, and conflict blockers.
- Apply approved time records by replaying stored projected effects, not by re-running random or store-coupled processors.
- Emit public net effects while keeping GM reason, hidden notes, default outcome, and manual-takeover notes private.
- Treat ambiguous external-store effects, such as roster-owned pilot recovery without a projected roster patch, as manual-takeover conflicts.

**Non-Goals:**

- Rewrite campaign day processors or rebalance economics, market generation, repair hours, travel times, or contract generation.
- Build the final browser UI. The UI will call the domain service added here.
- Solve long-campaign stability or catalog combat parity. Those remain later waves.

## Decisions

### Decision 1: Reuse the intervention ledger instead of adding a time-specific override log

Time cascades SHALL be implemented as an intervention domain with the same preview, approval, public projection, private projection, and replay hooks used by combat and campaign corrections.

Alternative considered: add a separate time-jump history. Rejected because it would split player-visible history and make cross-domain causality harder to audit.

### Decision 2: Store projected time effects in the approved record

Preview SHALL build serializable projected effects containing the before/after campaign dates, affected state references, day summaries, generated events, and changed campaign root snapshots needed for replay. Apply SHALL consume those projected effects directly.

Alternative considered: replay the day pipeline from the command payload during apply. Rejected because random streams, current processor registration, and store-coupled personnel processors could drift between preview and approval.

### Decision 3: Separate campaign-owned auto-apply from external-store manual takeover

Campaign-root effects such as `currentDate`, `currentSystemId`, `repairQueue`, `partsInventory`, `unitCombatStates`, `finances`, `missions`, and command-extension markets can be replayed automatically from projected effects. Effects owned outside `ICampaign`, such as roster/vault pilot recovery patches, require explicit projected patches; otherwise the preview SHALL require manual takeover.

Alternative considered: let the time cascade mutate roster stores during preview. Rejected because preview must be side-effect-free and player-visible redaction depends on stable stored projections.

### Decision 4: Keep travel as an optional time-cascade input

The time payload MAY include a destination system and travel-day count. The preview SHALL show both the location change and the days advanced. Travel validation will reuse the current system ID and known destination identifier; detailed jump-route/pathfinding remains outside this slice.

Alternative considered: require a full starmap route planner now. Rejected because the requested GM control surface can be useful with explicit GM-approved travel-day inputs.

## Risks / Trade-offs

- [Risk] Day processors with hidden store side effects make pure preview unsafe. -> Mitigation: preview treats unsupported external side effects as manual-takeover conflicts unless the command includes explicit projected patches.
- [Risk] Multi-day previews can become large. -> Mitigation: store compact day summaries and final root snapshots, with detailed generated events capped or grouped when necessary.
- [Risk] Applying stored snapshots can overwrite later campaign changes. -> Mitigation: projected effects carry `baseUpdatedAt` and changed state references so stale approvals can be blocked or escalated.
- [Risk] Time reversal is more complex than advancement. -> Mitigation: Wave 9 supports forward time jumps first; reversal is represented as a manual correction requiring explicit replacement snapshots.

## Migration Plan

1. Add time-cascade types and a `time` domain implementer.
2. Add pure preview/projection helpers that produce serializable time effects.
3. Register the time implementer alongside campaign intervention domains.
4. Add focused Jest coverage for ready preview, approval replay, player/GM redaction, stale/manual takeover conflict, and deferred-boundary removal.
5. Archive the OpenSpec change after strict validation and green tests.

## Open Questions

- Should Wave 10 or Wave 11 add a compact artifact retention policy for very long time previews?
- Should UI expose route-derived travel days before the starmap has a dedicated campaign route planner?
