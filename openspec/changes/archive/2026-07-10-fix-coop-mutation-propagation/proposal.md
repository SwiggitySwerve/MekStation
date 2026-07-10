## Why

Co-op campaigns don't actually share state: after a guest joins (works since #1016), the host's campaign mutations never reach them. Verified live (walkthrough-2, 2026-07-09): host clicked Advance Day on co-op campaign 2JLK79 — host UI shows 7/9, but the guest still shows 7/8 **even after a full page reload**, proving the mutation was never persisted to the shared server-side campaign record (a reload re-fetches from the server). Supporting evidence: silent `PUT /api/campaigns/<id> 409` conflict responses were observed in dev-server logs during the original 2026-07-07 playtest — a rejected optimistic write the UI never surfaced.

## What Changes

- Root-cause investigation of the co-op host mutation write path: where does a host day-advance (and other campaign mutations) go in co-op mode — local store only, socket broadcast only, or server persistence — and why does the server record not update (candidate: campaign PUT 409 conflict swallowed silently).
- Fix so host-committed co-op campaign mutations persist to the shared campaign record and reach connected guests (live push via the existing campaign sync channel, with reload-fetch correctness as the floor).
- Surface write failures: a campaign persistence conflict/failure SHALL NOT be silent — the acting user sees an error state instead of a UI that lies about success.
- Regression test: host-side day advance in a co-op session → server campaign record reflects the new date; guest fetch returns it.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `coop-campaign-sync`: host-committed campaign mutations SHALL persist to the shared campaign record and be visible to guests (at minimum on refetch; live push where the sync channel exists); persistence failures SHALL be surfaced to the acting user.

## Impact

- Suspects: `src/lib/campaign/coop/coopRuntimeSession.ts` (host-authoritative intent application), campaign persistence store write path (`useCampaignPersistenceStore` / `/api/campaigns` PUT with optimistic concurrency — the 409), `bindCampaignSyncConnection` push path.
- Tests: co-op runtime + persistence integration (host mutation → server record → guest read); UI error surface for persistence conflicts.
- Non-goals: guest-initiated mutations/proposal arbitration flows beyond what day-advance exercises; multiplayer combat sync; the harness journey-09 room-code issue (separate backlog item).
