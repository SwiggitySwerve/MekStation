## Why

The GM intervention ledger can already correct tactical combat safely, but the next campaign checkpoints still fall back to deferred results. Post-combat and base-economy mistakes need the same preview, approval, replay, and redaction contract so a GM can repair salvage, repair, inventory, funds, or base-state errors without resetting a campaign.

## What Changes

- Add ledger-backed campaign correction implementers for `post-combat`, `economy`, `repair`, and `salvage`.
- Support ready cascade previews for salvage allocations, repair tickets, funds/merchant reversals, parts inventory lots, and base unit state/configuration corrections.
- Preserve separate GM-private rationale and player-visible net effect projections for approved campaign corrections.
- Replay approved records into campaign state and action ledger history using the existing intervention/cascade pipeline.
- Keep accumulated `time` cascades deferred for the later time-cascade wave.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `gm-campaign-intervention-boundaries`: post-combat, economy, repair, and salvage domains move from deferred-only seams to supported first-class campaign implementers; `time` remains deferred.
- `gm-cascade-preview`: ready campaign previews SHALL show net effects for post-combat/base economy corrections while conflicts still require manual takeover.
- `intervention-ledger-abstraction`: campaign implementers SHALL satisfy the shared append-only preview/apply/public/private projection interface.
- `gm-authority-redaction`: player projections for campaign corrections SHALL omit hidden GM rationale while GM projections retain it.

## Impact

- New intervention types and implementer/projection helpers under `src/types/interventions` and `src/lib/interventions`.
- Focused intervention tests covering preview, rejection, manual takeover, approval replay, action-ledger append, redaction, and remaining `time` deferral.
- No new economic processor behavior: existing campaign fields such as `finances`, `repairQueue`, `salvageAllocations`, `partsInventory`, `unitCombatStates`, and `unitConfigurations` are corrected by additive GM records.
- No UI implementation in this wave; UI surfaces can consume the same cascade preview and public/private projection contracts.
