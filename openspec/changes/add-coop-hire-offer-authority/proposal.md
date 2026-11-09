# Add co-op hire-offer authority (K14b)

## Why

Hiring was decided by the caller. A `HirePilot` intent named its own recruit
and its own C-bill cost, and every authority trusted both. The co-op guest
surface sent an invented `Co-op Recruit` at 12,000. Worse, the durable
`/api/campaigns/[id]/commands` endpoint admits any active seat, guests
included, so a guest could POST a `HirePilot` with a cost of 0 and it committed
with no GM review. The endpoint also checked only an intent's `kind` and
`campaignId`, so nothing at that boundary parsed the payload.

The co-op `AcceptContract` path has the same flaw: the match host accepts the
contract the caller describes. Co-op decline has no authoritative command at
all.

## What Changes

- New intent `HireOffer { offerId }`. The authority derives the recruit
  (`pilotId: hired-<offerId>`, the offer's name) and the cost (the offer's
  `hireCost`) from the personnel market it holds. Event payloads do not
  change: a hire still commits `FundsChanged` then `PilotHired`.
- `HirePilot` is retired on every path. It stays in the intent schema so an
  old frame gets the typed refusal `hire-requires-market-offer`.
- `validateCampaignIntent` takes an optional market reader. Without one, a
  `HireOffer` is refused `offer-source-unavailable`, so an authority that
  forgets to bind a market cannot fall back to trusting the caller.
- The durable command API hires through `campaignHireOfferCommand`. Inside one
  prepared transaction it reads the offer from the source record, validates,
  appends, and rewrites the source row: the offer leaves the market, the
  ledger gains a `tx-hire-<offerId>` expense, and the balance follows the
  journal.
- `/api/campaigns/[id]/commands` strictly parses the whole intent against the
  intent schema before the pipeline sees it. A `HireOffer` payload carrying
  anything besides `offerId` is refused.
- Later PRs bind the market reader for the server registry and the in-browser
  co-op host, derive the match host's `AcceptContract` from the authoritative
  market, route the co-op host's Hire button through `HireOffer`, and disable
  guest Hire, guest Accept and co-op decline with visible reasons.

Rules follow MekHQ e7adc2c: `ForceHumanResources.recruitPerson`
(`MekHQ/src/mekhq/campaign/ForceHumanResources.java:2548-2575`) debits the
recruitment cost first and enrols nobody when the debit fails, and the cost is
computed by the campaign (`RecruitmentCosts.getRecruitmentCost`).

## Impact

Extends [coop-campaign-sync](../../specs/coop-campaign-sync/spec.md).

- Intent vocabulary: one new intent kind and new rejection reasons. No new
  event type, no event payload change, no replay schema-pack change.
- Persistence: a committed durable hire rewrites the source row in shapes the
  row already holds (the market, `finances.transactions`, `finances.balance`).
- Journals that already hold a `PilotHired` from a caller-priced hire keep it
  as history; nothing is rewritten.
