## Context

K7 repairs campaign tickets only. The standalone bay was removed by D1. Rules follow MekHQ e7adc2c6f3b17ec8ad243d30843e22207fe935e4; see src/lib/campaign/repair/RULES.md for pinned evidence.

## Decisions

1. Extract applyCompletedRepair without changing its guards, clamps or fallbacks, in a separate commit with characterization tests.
2. GM completion bypasses repair time, not parts. Normal MekHQ GM fix uses available stock; fix-and-acquire is a separate action. Block an atomic ticket completion when stock or unit state is missing.
3. Record concrete unit and inventory results in existing base-unit-state and inventory-lot effects alongside the ticket effect. No new persisted fields or replay shapes. Legacy status-only records retain their meaning.
4. Active work is queued, in-progress or parts-needed. Terminal tickets do not count as outstanding work even before cleanup.
5. Prune only input-terminal tickets, retaining any whose source match is still in pendingBattleOutcomes or recentlyAppliedOutcomes. Newly completed tickets survive their completion pass. No new retention window or field is introduced; processedBattleIds continues to guard outcome application.
6. Loading does not repair or charge legacy terminal tickets. Their rows are removed on a later successful processing/save. Old derived bay projections defer to canonical tickets when available.

## Entry paths

The day pipeline, campaign fast-forward, GM time cascade and travel previews share the repair processor. GM ledger approval and replay use existing effect families. Interactive and automatic combat publish campaign outcomes; combat phases and standalone simulation do not process campaign repairs. Co-op preserves its existing host-first day advance and campaign save boundaries. Its ApplyGmIntervention wire intent remains funds-only; this change adds no repair event or authority bypass.

## Risks and verification

Pruning must preserve referenced tombstones and must not replay resource effects. Integration tests load/save old ticket-heavy snapshots, retain pending/recent references, rerun an already-processed outcome and compare GM replay across JSON save/reload. Mutants omit a GM unit effect and remove retention respectively. Fixtures/digests are never regenerated.
