## PR1: durable contract acceptance (#3065)

- [x] 1. Refuse a durable acceptance of a declined offer (`offer-declined`) or an offer that ended before the source record date (`offer-expired`).

## PR2: hire-offer intent and the durable command

- [x] 2. Record failing regressions: forged recruit or price at the commands endpoint, `HirePilot` refusal, durable hire derivation and row rewrite, match-host validation.
- [x] 3. Add the `HireOffer` intent, its strict schema and the new rejection reasons; retire `HirePilot` with `hire-requires-market-offer`.
- [x] 4. Give `validateCampaignIntent` an optional market reader that fails closed; add the match-host and arbiter seam, unbound in production.
- [x] 5. Add `campaignHireOfferCommand` and route `HireOffer` through it from the command pipeline.
- [x] 6. Strictly parse the intent at `/api/campaigns/[id]/commands`.
- [x] 7. Kill the derivation, refusal, row-write and parse mutants; run the full affected directories and gates.

## PR3: co-op authority bindings

- [x] 8. Bind the market reader for the server host registry (source row) and the in-browser co-op host (local campaign).
- [x] 9. Derive the match host's `AcceptContract` (id, employer, terms) from the authoritative contract market, refusing declined and expired offers.
- [x] 10. Drop consumed personnel and contract offers from the saved record when a co-op command rewrites it.

## PR4: co-op UI

- [x] 11. Route the co-op host's Hire button through `HireOffer`.
- [x] 12. Disable guest Hire and guest Accept with a visible reason: guests receive no market data.
- [x] 13. Disable co-op decline with a visible reason until a host-authoritative decline command exists.

## Follow-ups (not in this change)

- [ ] 14. Project the personnel and contract markets to co-op guests, so guest Hire and Accept can name real offers.
- [ ] 15. Add a host-authoritative co-op decline command.
- [ ] 16. Answer a retried durable `AcceptContract` as a duplicate. Today a retry after a committed acceptance finds the offer gone and answers `offer-not-durable`.
- [x] 17. Route the co-op host's Accept through `AcceptContract` on the host transport, as Hire now is (brought into PR4 by Root, 2026-11-08).
