# Explain the co-op personnel market limitation

## Why

Co-op creation uses the Standard preset, whose personnel market is disabled. Players need to know before creation that hiring recruits requires a preset with an enabled personnel market. The owner ruling of 2026-11-09 preserves the pinned MekHQ default.

## What Changes

- Show a sentence-case hiring hint beside the existing defaults notice when the resolved co-op preset has `personnelMarketStyle` set to `DISABLED`.
- Resolve the options through the existing preset service; hide the hint for an enabled market.
- Preserve all preset values, campaign creation, initial market seeding, and failed-create cleanup.

## Impact

- Affected capability: `coop-campaign-sync`.
- Runtime change: presentation in `CampaignCoopEntryPanel` only, reached from the campaign-list page.
- No schema, persistence, protocol, gameplay engine, AI, multiplayer authority, P2P translation, or standalone simulation changes.
- One PR with component tests and this OpenSpec package.
