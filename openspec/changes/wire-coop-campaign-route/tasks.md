# Tasks: Wire Co-op Campaign Route

## 1. Campaign-list entry points

- [x] 1.1 Add a "Create Co-op Campaign" button alongside the existing "New Campaign" button on `src/pages/gameplay/campaigns/index.tsx` (testid `create-coop-campaign-btn`)
- [x] 1.2 Add a "Join Co-op Campaign" button on the same page that opens a room-code prompt (testid `join-coop-campaign-btn`); on submit, resolve the invite via the existing multiplayer invite endpoint
- [x] 1.3 Extend `useCampaignStore.createCampaign(name, factionId, opts)` to accept an optional `coopSession: { mode: 'host' }` so the freshly minted campaign is flagged as a co-op host session at creation time — no new store action needed
- [x] 1.4 Add a guest-side `createGuestMirrorCampaign(hostMatchId, snapshot)` action that mints a campaign with `coopSession = { mode: 'guest', hostMatchId }` from the CO1 snapshot the guest receives on join
- [x] 1.5 Tests: a host-mode campaign is marked co-op on creation; a guest-mode campaign is marked co-op via the join flow; the existing single-player creation path is untouched

## 2. Campaign detail tree — conditional host/guest render

- [ ] 2.1 Render `<HostGmReviewSurface>` on the campaign detail page (`src/pages/gameplay/campaigns/[id]/index.tsx`) when `campaign.coopSession?.mode === 'host'` AND arbitration mode is `'host-review'`. Mount it in the dashboard column so the host sees pending guest proposals at a glance
- [ ] 2.2 Render the `<GuestProposalSurface>` pending-indicator on every campaign-mutating control when `campaign.coopSession?.mode === 'guest'`. Affected controls live in `personnel`, `mech-bay`, `hiring`, `contract-market`, `finances` sub-routes
- [ ] 2.3 Wire each existing mutation control to submit `IGuestProposal` (via `useGuestProposals.submitProposal`) when in guest mode, instead of calling the campaign store action directly
- [ ] 2.4 Surface proposal resolution (committed event, GM veto, mechanical rejection) via toast or inline status; a vetoed proposal must be visually distinct from a mechanical rejection
- [ ] 2.5 Add a `<CampaignNavigation>` "Co-op session" badge that shows "Host" or "Guest" with the co-op session's room code (testid `coop-session-badge`)
- [ ] 2.6 Tests: a host-mode campaign mounts the review surface; a guest-mode campaign shows pending overlays on mutation controls; a single-player campaign mounts neither

## 3. Mission-launch participation picker

- [ ] 3.1 Add the new route `src/pages/gameplay/campaigns/[id]/missions/[missionId]/launch.tsx`
- [ ] 3.2 On the new route, mount `<CoopParticipationPicker>` when `campaign.coopSession` is set; non-co-op missions skip the picker and launch directly (existing behavior)
- [ ] 3.3 Each player's choice (`deploy` | `command-hq`) commits via the existing CO1 intent transport; the launch button is gated until both players have chosen
- [ ] 3.4 Tests: a co-op mission shows the picker; a non-co-op mission skips it; a zero-`deploy` launch is blocked with a clear error per the existing Wave-5 spec rule

## 4. Manual UAT unblock + ledger update

- [ ] 4.1 Update `playtest/checklists/coop-uat.md` to remove its "BLOCKED" prefix (added separately as a closeout correction) once tasks 1–3 land
- [ ] 4.2 Add scripted spec `e2e/playtest-coop-route-smoke.spec.ts` that drives a single-context test: create co-op campaign as host, confirm `coop-session-badge` shows "Host", confirm `HostGmReviewSurface` mounts (empty queue), confirm navigation through 12 campaign sub-routes does not crash with `coopSession` set
- [ ] 4.3 Update `playtest/ISSUES.md` PT-103 (or equivalent — file as P1 if not yet ledgered) to `closed` referencing this change's PR

## 5. Spec delta + archive

- [ ] 5.1 Author the delta spec at `openspec/changes/wire-coop-campaign-route/specs/coop-campaign-sync/spec.md` adding the "Co-op Campaign Route Surface" requirement with scenarios for host create, guest join, and host-review mount
- [ ] 5.2 `openspec validate wire-coop-campaign-route --strict` passes
- [ ] 5.3 `npm run build`, lint, `tsc --noEmit` typecheck all pass
- [ ] 5.4 Archive the change to `openspec/changes/archive/YYYY-MM-DD-wire-coop-campaign-route/` after merge
