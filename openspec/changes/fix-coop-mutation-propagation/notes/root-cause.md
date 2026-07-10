# Root Cause: Co-op Host Mutation Propagation

## 1. Day-advance trace

1. `src/components/gameplay/pages/campaigns/dashboard/CampaignDashboardPage.sections.tsx:125` - The header `Advance Day` button invokes the `onAdvanceDay` callback passed by the dashboard page.
2. `src/components/gameplay/pages/campaigns/dashboard/CampaignDashboardPage.tsx:123` - `useCampaignDayReports` receives `onAdvanceDay: () => store.getState().advanceDay()`.
3. `src/components/gameplay/pages/campaigns/dashboard/CampaignDashboardPage.hooks.ts:40` - `handleAdvanceDay` calls `onAdvanceDay()` synchronously and treats a returned `DayReport` as success.
4. `src/components/campaign/dashboard/CampaignDashboardActivityCards.tsx:147` - The dashboard-card "Advance one day" button is a second entry point.
5. `src/components/campaign/dashboard/CampaignDashboard.tsx:53` - The dashboard-card handler also calls `store.getState().advanceDay()` synchronously.
6. `src/stores/campaign/useCampaignStore.dayActions.ts:173` - `advanceDayAction` reads the current live `campaign` from `useCampaignStore`.
7. `src/stores/campaign/useCampaignStore.dayActions.ts:184` - The day pipeline computes the advanced campaign and report.
8. `src/stores/campaign/useCampaignStore.dayActions.ts:210` - The live store is updated immediately with `campaign: campaignWithAudit`; this is what makes the host UI show the new date before any server write has completed.
9. `src/stores/campaign/useCampaignStore.dayActions.ts:224` - The action calls `get().saveCampaign()`, but this is the campaign store save, not the server persistence-store save.
10. `src/stores/campaign/useCampaignStore.actions.ts:211` - The campaign store `saveCampaignAction` starts.
11. `src/stores/campaign/useCampaignStore.actions.ts:229` - It builds `updatedCampaign` and stamps `updatedAt`.
12. `src/stores/campaign/useCampaignStore.actions.ts:235` - It writes the updated campaign back into the live store, again before server persistence.
13. `src/stores/campaign/useCampaignStore.actions.ts:236` - It calls `persistCampaignRecord(...)`.
14. `src/stores/campaign/useCampaignStore.persistence.ts:409` - `persistCampaignRecord` serializes the campaign and writes `campaign-${campaign.id}` to client-safe local storage only.
15. `src/stores/campaign/campaignPersistenceWiring.ts:48` - Separately, the installed persistence wiring watches `useCampaignStore` campaign object changes.
16. `src/stores/campaign/campaignPersistenceWiring.ts:58` - A non-null to non-null campaign reference change is treated as dirty.
17. `src/stores/campaign/campaignPersistenceWiring.ts:59` - Dirty state is sent to `useCampaignPersistenceStore.markDirty()`.
18. `src/stores/campaign/useCampaignPersistenceStore.ts:330` - `markDirty` sets `dirty: true` and keeps/sets the persistence `campaignId`.
19. `src/stores/campaign/useCampaignPersistenceStore.ts:338` - Server auto-save is delayed by the debounce timer.
20. `src/stores/campaign/useCampaignPersistenceStore.ts:343` - The server save is fire-and-forget via `void performSave(set, get)`.
21. `src/stores/campaign/useCampaignPersistenceStore.ts:226` - `performSave` reads the live campaign from `useCampaignStore`.
22. `src/stores/campaign/useCampaignPersistenceStore.ts:231` - It selects the version token as `baseVersionOverride ?? get().baseVersion`.
23. `src/stores/campaign/useCampaignPersistenceStore.ts:232` - It builds the outgoing envelope with proposed `version = baseVersion + 1`.
24. `src/stores/campaign/useCampaignPersistenceStore.ts:241` - It sends `PUT /api/campaigns/${campaignId}`.
25. `src/stores/campaign/useCampaignPersistenceStore.ts:246` - The request body is `JSON.stringify({ envelope, baseVersion })`.
26. `src/pages/api/campaigns/[id].ts:98` - The API route handles `PUT`.
27. `src/pages/api/campaigns/[id].ts:106` - The route rejects an envelope whose `campaignId` does not match the URL id.
28. `src/pages/api/campaigns/[id].ts:113` - The route calls `saveCampaign(body.envelope, body.baseVersion)`.
29. `src/services/campaignPersistence/CampaignPersistenceService.ts:121` - The service compares client `baseVersion` to the stored row version.
30. `src/services/campaignPersistence/CampaignPersistenceService.ts:141` - A mismatch returns `{ kind: 'conflict', current }` without changing the stored campaign.
31. `src/pages/api/campaigns/[id].ts:114` - The route detects the conflict result.
32. `src/pages/api/campaigns/[id].ts:117` - The route returns HTTP 409 with the current server record.
33. `src/stores/campaign/useCampaignPersistenceStore.ts:260` - The client recognizes HTTP 409.
34. `src/stores/campaign/useCampaignPersistenceStore.ts:262` - The client stores `saveState: 'conflict'` and `conflictServerRecord`, then returns without throwing.
35. `src/components/gameplay/pages/campaigns/dashboard/CampaignSaveStatusCard.tsx:108` - The dashboard save card can render a conflict message, but this is separate from the day-advance action that already returned success.
36. `src/lib/campaign/coop/coopRuntimeSession.ts:81` - Opening a host co-op runtime creates an in-memory `CampaignMatchHost`, `CampaignSyncSession`, and `CampaignGmArbiter`.
37. `src/lib/campaign/coop/coopRuntimeSession.ts:99` - It opens a `CampaignSyncSession`.
38. `src/lib/multiplayer/server/CampaignSyncSession.ts:95` - `open()` starts the co-op sync session.
39. `src/lib/multiplayer/server/CampaignSyncSession.ts:101` - `open()` calls `host.open()`, which commits a campaign-sync baseline event, not a `/api/campaigns` persistence write.
40. `src/lib/multiplayer/server/CampaignMatchHost.ts:264` - The host-authoritative day intent path exists as `applyHostIntent(...)`.
41. `src/lib/multiplayer/server/CampaignMatchHostIntent.ts:208` - An `AdvanceDay` intent would derive a `CampaignDayAdvanced` event.
42. `src/lib/multiplayer/server/CampaignMatchHost.ts:416` - Committed campaign events are appended, applied to authoritative sync state, and broadcast.
43. `src/lib/multiplayer/server/CampaignGmArbiter.ts:377` - Approved guest proposals do use `host.applyHostIntent(...)`.
44. `src/components/gameplay/pages/campaigns/dashboard/CampaignDashboardPage.tsx:132` - The host dashboard day-advance path does not call `applyHostIntent`; it calls the local campaign store directly.

## 2. The exact break

The break is `src/stores/campaign/useCampaignStore.dayActions.ts:210` plus `src/stores/campaign/useCampaignStore.dayActions.ts:224`: day advance commits the new campaign into the host's local store and returns a successful `DayReport` while the only direct save it invokes is the local-storage campaign-store save. The server write is only an indirect debounced side effect from `src/stores/campaign/campaignPersistenceWiring.ts:59` through `src/stores/campaign/useCampaignPersistenceStore.ts:343`, and that path is fire-and-forget.

When the server write gets a stale-version 409, `src/stores/campaign/useCampaignPersistenceStore.ts:260` to `src/stores/campaign/useCampaignPersistenceStore.ts:263` converts the response into persistence `saveState: 'conflict'` and returns without throwing. That means the failure never reaches the day-advance caller at `src/components/gameplay/pages/campaigns/dashboard/CampaignDashboardPage.hooks.ts:40`, no rollback occurs, and the already-mutated local store keeps rendering the new date. The server record remains at the previous date because `src/services/campaignPersistence/CampaignPersistenceService.ts:121` to `src/services/campaignPersistence/CampaignPersistenceService.ts:141` rejects the stale write before storage. A guest reload then re-fetches the unchanged server record and still sees the old date.

There is also a push-channel break for live guests: the host's dashboard day advance never calls `CampaignMatchHost.applyHostIntent(...)`, even though that path exists at `src/lib/multiplayer/server/CampaignMatchHost.ts:264` and would produce `CampaignDayAdvanced` via `src/lib/multiplayer/server/CampaignMatchHostIntent.ts:208`. Therefore the co-op event log/broadcast path is skipped for host-local day advance.

## 3. Design hypothesis status

Partially confirmed. The optimistic-concurrency part is real: `PUT /api/campaigns/[id]` carries `{ envelope, baseVersion }` from `src/stores/campaign/useCampaignPersistenceStore.ts:246`, the server compares that token at `src/services/campaignPersistence/CampaignPersistenceService.ts:121`, and a mismatch returns HTTP 409 at `src/pages/api/campaigns/[id].ts:117`. The host-local lie is also real: day advance updates local state before server persistence and does not roll back or block on the PUT.

The proposed reason for the stale token is not confirmed in current code. I found no `/api/campaigns` write in co-op runtime startup or snapshot delivery. `openCoopRuntimeSession` builds an in-memory runtime at `src/lib/campaign/coop/coopRuntimeSession.ts:93` to `src/lib/campaign/coop/coopRuntimeSession.ts:109`; `CampaignSyncSession.open()` commits only a campaign-sync baseline event at `src/lib/multiplayer/server/CampaignSyncSession.ts:101`; and `/api/multiplayer/matches` registers the co-op match/sync host at `src/pages/api/multiplayer/matches/index.ts:246` to `src/pages/api/multiplayer/matches/index.ts:257`, which persists match metadata, not the shared `/api/campaigns` campaign record. So the evidence confirms "409 can be swallowed by the host mutation UX and leave the server stale," but does not confirm "co-op session init/snapshot write bumps the campaign persistence version." A stale `baseVersion` may still arise from another server campaign write, but this investigation did not find co-op init/snapshot as that writer.

## 4. Push-path status

`bindCampaignSyncConnection.ts` has a guest-facing event push path for campaign-sync events, but it is not wired to host dashboard day-advance mutations. On guest join, `src/lib/multiplayer/server/bindCampaignSyncConnection.ts:284` calls `entry.syncSession.joinGuest(...)` and passes a sink that forwards events to the socket at `src/lib/multiplayer/server/bindCampaignSyncConnection.ts:286` to `src/lib/multiplayer/server/bindCampaignSyncConnection.ts:288`; `sendCampaignEvent` wraps those as `CampaignSnapshot` or `CampaignEvent` messages at `src/lib/multiplayer/server/bindCampaignSyncConnection.ts:378` to `src/lib/multiplayer/server/bindCampaignSyncConnection.ts:395`. The missing link is upstream: host day advance never emits a `CampaignDayAdvanced` event into `entry.host`/`entry.syncSession`, because the UI uses `store.getState().advanceDay()` rather than `CampaignMatchHost.applyHostIntent(...)`. Therefore the live push transport exists for events that reach `CampaignMatchHost`, but the day-advance mutation is absent from that channel today.
