# 2026-07-09 guest floor read/push addendum

## Scope

This addendum records the follow-up fix for the two guest-floor failures found after the host persistence repair: no live day-advance push and a stale date after guest reload. It does not change `tasks.md` or any canonical spec under `openspec/specs/`.

## Pre-fix reproduction

The regression tests were written and run before the production fix.

- The real-registry integration timed out with `guest did not receive CampaignDayAdvanced within 1000ms`.
- The same-route reload regression observed zero calls to `GET /api/campaigns/<id>`.
- The connected guest projection regression expected `3025-07-10` but received `3025-07-09` after applying an older authoritative snapshot.
- The two-browser Playwright journey confirmed the server `PUT` and subsequent `GET` succeeded with the advanced date, but the guest UI remained on the prior date through its bounded 20-second poll.

## Root cause: live push

The live browser path had two disconnected campaign hosts.

- The API match creator registers the actual server-resident host in `src/pages/api/multiplayer/matches/index.ts:251`.
- Guest sockets bind to that registry in `src/lib/multiplayer/server/bindCampaignSyncConnection.ts:58-63`.
- `src/lib/campaign/coop/coopRuntimeSession.ts:60-61,93-121` owns separate browser-local maps and constructs another `CampaignMatchHost` and `CampaignSyncSession`.
- The prior day-advance implementation sent `AdvanceDay` to that browser-local runtime, so the server host bound to the guest never committed or broadcast the event.

The fix adds the authenticated `CampaignHostIntent` client frame (`src/types/multiplayer/Protocol.ts:396-403`), sends it through the existing campaign WebSocket transport (`src/lib/campaign/coop/campaignSyncTransport.ts:125-134`), and handles it inside the existing server binder (`src/lib/multiplayer/server/bindCampaignSyncConnection.ts:237-274`). The binder verifies the player is the registered host and invokes `entry.host.applyHostIntent(...)` on the exact host already serving guest sockets. The day action now emits through the active host transport only after the campaign save commits (`src/stores/campaign/useCampaignStore.dayActions.ts:332-354`).

## Root cause: reload and stale projection

The guest campaign is rehydrated from the persisted Zustand `campaign-store` during a full reload. `useCampaignRouteLoader` previously returned immediately whenever that campaign id already matched the route, so the guest never issued the fresh server GET. This reproduced as zero GET calls even though the server record held the new date.

The browser mirror store itself is not persisted, so a mirror snapshot surviving a true browser reload was not the primary cause. Two related stale inputs still existed: the reconnect snapshot came from the server host that the broken push path had never advanced, and `projectMirrorToCampaign()` applied any available snapshot without a date freshness guard.

The fix:

- forces one same-id guest refresh in `src/pages-modules/gameplay/campaigns/campaignPageShell.tsx:142-149`;
- performs that GET with `cache: 'no-store'` and preserves the local guest session/host-match identity when the persisted server record carries host authority (`src/stores/campaign/useCampaignPersistenceStore.ts:128-143,446-466`);
- makes date projection monotonic so an older reconnect snapshot cannot regress a fresher fetched date (`src/lib/campaign/coop/campaignMirrorProjection.ts:14-29`).

## Proposal/arbitration audit and deferred follow-up

The normal production proposal flow already uses the real WebSocket transport: `CampaignProposal` and `CampaignDecision` are handled by the connected route surface and the real server binder (`src/components/campaign/coop/CampaignCoopRouteSurfaceConnected.tsx:100-145,194-213`; `src/lib/multiplayer/server/bindCampaignSyncConnection.ts:338-400`).

However, its no-transport fallback still calls `submitGuestProposalToHost` / `decideGuestProposal`, which use the disconnected `coopRuntimeSession.ts` maps (`CampaignCoopRouteSurfaceConnected.tsx:194-213`; `coopRuntimeSession.ts:151-181`). This is a pre-existing degraded/offline fallback defect, not the live WebSocket flow exercised here. It was left unchanged to avoid expanding this guest day-advance fix. Follow-up: remove or explicitly test/label that fallback rather than treating the browser-local runtime as server authority.

## Permanent proof

- `src/__tests__/integration/coopMutationPersistence.test.ts:254-351` binds host and guest sockets to a real `CampaignHostRegistry`, sends the host intent through the registered transport, uses a bounded 1-second wait, and observes `CampaignDayAdvanced` on the guest.
- `src/components/gameplay/pages/campaigns/dashboard/__tests__/CampaignDashboardPage.coopPersistenceRegression.test.tsx:241-280` proves same-id guest refetch plus guest-authority preservation.
- `src/components/campaign/coop/__tests__/GuestProposalSurface.test.tsx:289-342` proves an older snapshot cannot regress a freshly fetched guest date.
- `e2e/coop-campaign-two-browser-journey.spec.ts:156-323` uses separate host and guest browser contexts, the real match API and campaign socket, bounded live-date polling, a real reload GET, and post-reload date assertion.

## Verification

- Focused Jest: 8 suites passed, 79 tests passed.
- Two-browser Playwright: 1 passed in 51.5 seconds; test body 40.3 seconds.
- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0; 1,935 warnings and 0 errors (repository warning baseline).
- `npm run test:stable`: 2,184 suites passed; 30,579 tests passed, 4 skipped; 8 snapshots passed.
- `npm run validate:multiplayer:dev-socket`: `ok: true`, co-op runtime proposal `committed`, event count 1.
