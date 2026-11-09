## Why

Enabled personnel markets are absent when a campaign is created. The local hiring
page masks the gap with unseeded first-open generation, but co-op refuses that
fallback. Since co-op HireOffer derives recruits from the saved source market,
initial offers must exist before the first campaign save.

## What Changes

- Initialize enabled personnel markets in the shared store create action.
- Derive offer identities from campaign identity, resolved seed, date and ordinal
  without consuming additional attribute rolls.
- Reuse the initializer for local old-save first-open recovery, preserving saved
  and explicitly empty markets.
- Keep Standard's personnel market disabled, matching the pinned base default.
  A stock co-op campaign on Standard has no personnel market by design; co-op
  hiring needs a market-enabled preset.

## Impact

The markets-system capability, personnel-market owner, store creation action and
local hiring-page fallback change. Existing serializers already retain offers.
No migration, event payload, wire shape, schema version or replay fixture changes.
Guest market delivery, mission launch and participation are outside this change.
