# GM Campaign Intervention Boundaries

This note documents the current boundary for GM interventions outside active combat. The ledger, authority, redaction, preview, and approval pipeline is live for combat, unit reload, campaign funds corrections, and accumulated campaign time corrections.

Campaign GM controls are owner/host-only surfaces. Single-player campaign owners and co-op hosts may preview, approve, and manually take over supported corrections. Co-op guests may only see player-public ledger projections for approved effects; GM-private reason, default outcome, hidden notes, and manual takeover notes stay out of player mirrors.

## Supported Campaign Domains

| Domain    | Mutable roots                                    | Public projection fields                                   | Current result                                  |
| --------- | ------------------------------------------------ | ---------------------------------------------------------- | ----------------------------------------------- |
| `economy` | campaign funds, merchant transaction ledger      | net C-bill delta, public transaction summary, changed refs | supported for funds transaction corrections     |
| `time`    | campaign clock, repair queue, generated day work | public time delta, visible timeline summary, changed refs  | supported for accumulated time-cascade advances |

## Deferred Domains

| Domain        | Future mutable roots                                                              | Future public projection fields                                     | Current result                |
| ------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------- |
| `post-combat` | scenario result, payout summary, injury/death outcomes, salvage offer state       | public result delta, visible casualty/salvage summary, changed refs | deferred, no mutation         |
| `economy`     | inventory lots, market stock, merchant inventory                                  | public inventory delta, merchant transaction ref                    | not covered by funds slice    |
| `repair`      | repair queue edits, parts usage, technician assignment, bay schedule              | public queue delta, visible repair status, changed unit refs        | deferred beyond time tick     |
| `salvage`     | salvage pool, claim assignments, scrapping/selling decisions, inventory additions | public salvage delta, visible inventory delta, claim refs           | deferred, no mutation         |
| `time`        | travel progress, contract deadlines, complex queued time effects                  | visible deadline/travel changes, changed refs                       | deferred beyond 2-day advance |

## Future Implementer Seams

- Post-combat amendments should wrap combat outcome edits and campaign sync deltas in one preview so payouts, injuries, salvage, and objective state cannot drift independently.
- Co-op GM arbitration should extend the authority context with host/owner identity and explicit arbitration records before allowing another GM to mutate a campaign owned by someone else.
- Inventory reversals should treat merchant stock and inventory effects as reversible ledger entries with net funds, stock, and inventory effects previewed together.
- Repair and salvage corrections should validate that unit refs, parts, bay capacity, and technician assignments still exist before approval.
- Time cascades should preview every accumulated effect caused by the clock change, including travel, deadlines, repair ticks, hiring windows, and contract availability.

Player-facing records for supported and future domains must show only the resulting public net effect and changed state refs. GM-private reason, default outcome, hidden scenario notes, and manual takeover notes stay in private projection only.
