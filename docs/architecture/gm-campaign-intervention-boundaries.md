# GM Campaign Intervention Boundaries

This note documents the first-slice boundary for GM interventions outside active combat. The ledger, authority, redaction, preview, and approval pipeline is live for combat and unit reload. Campaign cascade domains stay explicit deferred domains until their own implementers can prove mutation scope, replay order, and player-safe projection.

## Deferred Domains

| Domain        | Future mutable roots                                                              | Future public projection fields                                     | First-slice result    |
| ------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------- |
| `post-combat` | scenario result, payout summary, injury/death outcomes, salvage offer state       | public result delta, visible casualty/salvage summary, changed refs | deferred, no mutation |
| `economy`     | campaign funds, merchant transaction ledger, inventory lots, market stock         | net C-bill delta, public inventory delta, merchant transaction ref  | deferred, no mutation |
| `repair`      | repair queue, parts usage, technician assignment, bay schedule                    | public queue delta, visible repair status, changed unit refs        | deferred, no mutation |
| `salvage`     | salvage pool, claim assignments, scrapping/selling decisions, inventory additions | public salvage delta, visible inventory delta, claim refs           | deferred, no mutation |
| `time`        | campaign clock, travel progress, contract deadlines, queued time effects          | public time delta, visible deadline/travel changes, changed refs    | deferred, no mutation |

## Future Implementer Seams

- Post-combat amendments should wrap combat outcome edits and campaign sync deltas in one preview so payouts, injuries, salvage, and objective state cannot drift independently.
- Co-op GM arbitration should extend the authority context with host/owner identity and explicit arbitration records before allowing another GM to mutate a campaign owned by someone else.
- Finance and inventory reversals should treat merchant transactions as reversible ledger entries with net funds, stock, and inventory effects previewed together.
- Repair and salvage corrections should validate that unit refs, parts, bay capacity, and technician assignments still exist before approval.
- Time cascades should preview every accumulated effect caused by the clock change, including travel, deadlines, repair ticks, hiring windows, and contract availability.

Player-facing records for these future domains must show only the resulting public net effect and changed state refs. GM-private reason, default outcome, hidden scenario notes, and manual takeover notes stay in private projection only.
