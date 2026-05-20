# Change: Wire Co-op Campaign Route

## Why

`add-coop-campaign-play` (Wave 5) shipped the entire co-op campaign authority model — `CampaignMatchHost` with host-as-GM arbitration, `IGuestProposal` / `GmDecision` types, the `CoopParticipationPicker` / `GuestProposalSurface` / `HostGmReviewSurface` React components, the `useGuestProposals` hook, full unit-test coverage, and Storybook stories. Every Wave-5 task was checked off and the change archived.

But **no user can reach any of these components.** Grep across `src/pages/` returns zero matches for `coop` or `co.?op`. The host has no URL to create a co-op campaign at; the guest has no URL to accept an invite; the campaign page tree (`/gameplay/campaigns/[id]` and its 11 sub-routes) has zero conditional rendering of the host-review or guest-proposal surfaces when the active campaign is a co-op session.

The Wave-5 spec is technically correct — it scoped deliverables to "co-op proposal/review components" without requiring a URL, and the Librarian's re-read confirmed no SHALL clause names a route. But functionally the feature is unreachable: an operator running `playtest/checklists/coop-uat.md` is blocked at step 1 because "Host creates a new co-op campaign" has no UI to do it from. The Phase-5 playtest closed as "manual UAT only" with the co-op checklist explicitly noted as un-runnable.

This change closes that gap. It is a wiring change, not a feature change — every piece of logic already exists. The work is route-creation, conditional render gating, and one new "Create Co-op Campaign" entry point on the campaign list page.

## What Changes

- ADDED a "Create co-op campaign" action on `src/pages/gameplay/campaigns/index.tsx` that mints a campaign with `campaign.coopSession = { mode: 'host' }` set at creation
- ADDED a "Join co-op campaign" entry point that accepts a room code / invite link (reuses the multiplayer hub's room-code resolution) and mints a guest-mode mirror campaign with `coopSession = { mode: 'guest', hostMatchId }`
- ADDED conditional render of `HostGmReviewSurface` on the campaign detail page tree when `campaign.coopSession?.mode === 'host'` and arbitration mode is `'host-review'`
- ADDED conditional render of `GuestProposalSurface` indicators when `campaign.coopSession?.mode === 'guest'` — every existing campaign-mutating control (hire, accept contract, spend, refit, repair) renders a "proposal pending" overlay when the guest's intent is in flight
- ADDED a `CoopParticipationPicker` on the mission-launch flow at `/gameplay/campaigns/[id]/missions/[missionId]/launch` (new sub-route) for each player to pick `deploy` vs `command-hq`
- ADDED a "co-op session indicator" badge on the campaign navigation bar showing whether the user is host or guest in the current campaign
- No changes to the underlying Wave-5 hooks, actions, or types — every consumer already exists

## Dependencies

- **Requires (already shipped)**: `add-shared-campaign-state` (CO1), `add-coop-campaign-play` (CO2+CO3) — the entire co-op transport, authority model, and component library
- **Requires (already shipped)**: `add-campaign-system` (Wave 4) — the campaign page tree this change extends
- **Requires (already shipped)**: `add-matchmaking-and-spectator` (Wave 3) — the invite-link / room-code resolution this change reuses

## Impact

- Affected specs: `coop-campaign-sync` — ADD a "Co-op Campaign Route Surface" requirement formalizing that host + guest each have a routable entry point and that arbitration surfaces mount within the existing campaign page tree
- Affected code:
  - `src/pages/gameplay/campaigns/index.tsx` — new "Create co-op campaign" button + "Join co-op campaign" entry
  - `src/pages/gameplay/campaigns/[id]/index.tsx` and the existing sub-routes (`personnel`, `mech-bay`, `medical-bay`, `salvage`, `hiring`, `finances`, `contract-market`, `repair-bay`, `prestige-morale`, `missions`, `forces`) — conditional render of host/guest surfaces gated on `campaign.coopSession?.mode`
  - `src/pages/gameplay/campaigns/[id]/missions/[missionId]/launch.tsx` — new route hosting `CoopParticipationPicker`
  - `src/components/campaign/CampaignNavigation.tsx` — co-op session indicator badge
- No new components, hooks, or types — all consumers already exist
- No database migrations
- No transport changes — reuses CO1's campaign event broadcast

## Non-Goals

- Three-or-more-player co-op (Wave-5 scope decision; still out of scope)
- PvP campaigns (host vs guest forces fighting each other)
- Campaign-tier host migration — Wave-5's pause behavior stands
- Auto-promotion of guest to host on host disconnect
- A dedicated co-op campaign landing page separate from the existing `/gameplay/campaigns` list — the list-page entry points are sufficient
- New OpenSpec proposal-arbitration modes beyond the existing `auto-approve` / `host-review`
