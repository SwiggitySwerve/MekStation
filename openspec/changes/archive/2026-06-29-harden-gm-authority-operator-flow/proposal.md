## Why

The GM ledger engine now validates economy and time-cascade corrections, but the app still exposes the GM Ledger as a normal campaign command tab and the control plane assumes GM authority. The next operator-flow slice needs the UI to distinguish owner/host GM authority from guest/player mirrors so private GM reasoning cannot be reached through normal navigation or direct routes.

## What Changes

- Gate the campaign GM Ledger tab to users with campaign GM authority: single-player campaign owners and co-op hosts.
- Make guest/player mirrors that deep-link to the GM Ledger route render only the player-safe ledger projection and a clear authority explanation.
- Keep existing GM preview, approval, manual takeover, and redaction behavior unchanged for owner/host campaigns.
- Update the intervention boundary documentation so economy and time cascade domains are no longer described as deferred when current implementers and QC gates support them.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `coop-campaign-sync`: Host-as-GM authority must gate campaign GM ledger controls and private projection visibility.
- `campaign-command-ui`: Campaign command navigation must expose GM Ledger only to authorized campaign GM viewers.
- `gm-campaign-intervention-boundaries`: Campaign GM correction surfaces must distinguish mutable GM control access from player-safe public ledger projection.

## Non-goals

- Adding full authentication or account ownership beyond the current single-player/co-op host/guest authority model.
- Implementing new campaign correction families beyond the existing economy and time-cascade browser control plane.
- Expanding tactical combat GM interventions; that remains a separate combat UI slice.

## Impact

- `src/components/campaign/CampaignNavigation.tsx`
- `src/pages/gameplay/campaigns/[id]/gm-ledger.tsx`
- `src/components/campaign/gm/*`
- `src/lib/campaign/*`
- `src/components/campaign/**/__tests__`
- `e2e/gm-campaign-ledger-control-plane.spec.ts`
- `docs/architecture/gm-campaign-intervention-boundaries.md`
