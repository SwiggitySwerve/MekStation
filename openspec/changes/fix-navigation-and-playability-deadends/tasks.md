# Tasks: Fix Navigation And Playability Dead-Ends

## 1. Investigation and red-first evidence

- [ ] 1.1 Confirm the `/gameplay` 404: verify no `src/pages/gameplay/index.tsx`
  exists and enumerate the mobile-tab + breadcrumb callers that route to
  `/gameplay` (`MobileBottomNav.tsx:38` + breadcrumb sources) so the hub's link
  set is complete. Write a red routing test asserting `/gameplay` currently
  resolves to 404.
- [ ] 1.2 Confirm the `listMatchLogs` reader signature and `MatchLogSummary`
  shape (`MatchLogService.ts:135`) and write a red test asserting the games
  list currently renders the `DEMO_GAMES` fake entry rather than real logs.
- [ ] 1.3 Confirm `GET /api/campaigns` returns `ICampaignSummary[]` via
  `listCampaignSummaries` (`api/campaigns/index.ts:4`) and write a red test
  asserting the campaign list currently shows at most one campaign and that
  `createCampaign` overwrites the active `campaign` slot
  (`useCampaignStore.ts:95`).
- [ ] 1.4 Write a red test asserting `CampaignDashboardPage` does not re-render
  when the campaign store updates (the `getState()`-at-render bug,
  `CampaignDashboardPage.tsx:54`).

## 2. Gameplay hub route (U-1)

- [ ] 2.1 Add `src/pages/gameplay/index.tsx` as a hub index per design D1,
  linking Quick Game, Pilots, Forces, Campaigns, Encounters, Games, and
  Multiplayer, reusing the existing nav item definitions.
- [ ] 2.2 Add a route test asserting `/gameplay` renders the hub (no 404) and
  exposes a link to each gameplay sub-surface; confirm task 1.1's red test now
  passes.

## 3. Multiplayer navigation entry (U-2)

- [ ] 3.1 Append a Multiplayer entry to `gameplayItems` in
  `src/components/common/TopBar.tsx:70` per design D2.
- [ ] 3.2 Mirror the Multiplayer entry in `src/components/common/MobileBottomNav.tsx`
  (mobile gameplay menu).
- [ ] 3.3 Add a nav test asserting a Multiplayer link to `/multiplayer` is
  present in both the desktop sidebar Gameplay section and the mobile menu.

## 4. Games list real data (U-3)

- [ ] 4.1 Replace `DEMO_GAMES` in `src/pages/gameplay/games/index.tsx:34` with a
  read from `listMatchLogs()`, mapping `MatchLogSummary[]` to the list rows per
  design D3; delete the demo constant.
- [ ] 4.2 Render a real `EmptyState` when `listMatchLogs()` returns no rows;
  honor the reader's existing limit.
- [ ] 4.3 Add a games-list test for the populated case (real logs render) and
  the empty case (EmptyState renders, no fake entry); confirm task 1.2's red
  test now passes.

## 5. Quick Game interactive on-ramp + auto-resolve labeling (U-4)

- [ ] 5.1 Relabel the existing auto path in `QuickGamePlay.tsx` / the Quick Game
  setup surface as "Auto-Resolve" per design D4 so it is honestly named.
- [ ] 5.2 Add a low-friction interactive "Skirmish" on-ramp that launches an
  interactive session on the hex board (the engine `Watch AI Battle` drives,
  human controlling one side) without campaign/force setup, per design D4.
- [ ] 5.3 Add a test asserting the auto path is labeled Auto-Resolve and that
  selecting the interactive Skirmish on-ramp reaches the tactical/hex-board
  surface rather than the auto results table.

## 6. Multi-campaign list + switcher (medium)

- [ ] 6.1 Wire the campaign list page to `GET /api/campaigns`
  (`listCampaignSummaries`) per design D5 so multiple campaigns are listed.
- [ ] 6.2 Add a switcher action to `useCampaignStore` that loads a chosen
  campaign into the active `campaign` slot, and ensure `createCampaign` no
  longer clobbers the active campaign for the list (`useCampaignStore.ts:95`).
- [ ] 6.3 Add a test asserting the list shows >1 campaign after two creations
  and that switching changes the active campaign without deleting the other;
  confirm task 1.3's red test now passes.

## 7. Reactive campaign dashboard (medium)

- [ ] 7.1 Convert `CampaignDashboardPage` (`CampaignDashboardPage.tsx:54`) to
  read campaign/roster/mission state via Zustand selector subscriptions per
  design D6, preserving the client-ready/auto-save dirty-bridge ordering.
- [ ] 7.2 Add a test asserting the dashboard re-renders when the campaign store
  updates; confirm task 1.4's red test now passes.

## 8. Onboarding entry point + glossary (medium)

- [ ] 8.1 Add a first-run onboarding/tutorial entry to `navigationCards` in
  `src/pages/index.tsx:23` per design D7.
- [ ] 8.2 Add an inline glossary surface defining BV, gunnery, piloting, heat,
  and PSR.
- [ ] 8.3 Add a test asserting the onboarding entry is reachable from home and
  the glossary surface defines the core jargon terms.

## 9. Multiplayer entry setup path (medium)

- [ ] 9.1 Add a vault-setup link/route and a path-forward affordance to the
  vault-password gate in `src/pages/multiplayer/index.tsx:216` per design D8,
  without changing the auth model or transport.
- [ ] 9.2 Add a test asserting the multiplayer entry page surfaces a setup path
  and a path-forward affordance when no vault token exists.

## 10. Verification and documentation

- [ ] 10.1 Full verification: `npx tsc --noEmit --skipLibCheck`, lint, and the
  affected Jest/route suites green (sections 2–9).
- [ ] 10.2 Run `npx openspec validate fix-navigation-and-playability-deadends --strict`.
- [ ] 10.3 Update the 2026-06-12 review tracker: mark U-1/U-2/U-3/U-4 and the
  four mediums (multi-campaign clobber, dashboard reactivity, onboarding, vault
  friction) addressed by this change.
