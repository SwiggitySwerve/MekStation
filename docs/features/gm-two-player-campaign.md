# GM Two-Player Campaign

Operator view of the live GM plus two tactical-player campaign session. This page sits under `docs/features/` with the other product-facing notes (`docs/features/room-codes.md`, `docs/features/p2p-vault-sync.md`). It does not replace the construction-loop architecture note (`docs/architecture/campaign-combat-loop.md`).

Source: `openspec/changes/harden-gm-two-player-campaign-sessions/design.md` (D2 topology: one non-playing GM plus exactly two tactical seats).

## Authority

An accepted command is durable before any client is told it committed. The match store writes command identity, events, recipient-neutral outbox rows, the command receipt, and the stream head in one SQLite transaction. A crash at a mid-batch event insert, outbox insert, or head update rolls the whole batch back. A retry of the same command identity returns the existing receipt and does not append again.

The journal uses a monotonic authority sequence. Players do not receive that number as a public cursor.

Source: `src/lib/multiplayer/server/DurableMatchStore.ts` (`appendCommandBatch`); `e2e/gm-two-player-authority-order.pack.spec.ts` (E2E-04); `openspec/changes/harden-gm-two-player-campaign-sessions/design.md` (D1, D3).

## Delivery

Delivery is a per-viewer, gapless sequence assigned at send time (`src/lib/multiplayer/server/projection/ViewerDeliveryCursors.ts`). A frame that fog or the publication boundary withholds never consumes a delivery number. A failed send does consume one, so a hole is a real loss rather than a concealed event.

Clients acknowledge only after the projected reducer applies (`src/lib/multiplayer/__tests__/client.test.ts`). The durable receipt is `IViewerDeliveryAcknowledgement` (`src/lib/multiplayer/server/IMatchStore.ts`). Campaign sockets ack applied `CampaignEvent` frames with `CampaignAck` (`src/lib/multiplayer/server/bindCampaignSyncConnection.ts`).

A hole in delivery is the resync signal. The client re-sends `SessionJoin` with its last contiguous delivery cursor; the server replays that viewer's missed tail. A hole in the authority sequence is not a gap — under fog it usually means the viewer was never allowed to see that event (`openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md`, 2026-08-26 gap-recovery note).

There is no `MAX_VIEWER_UNACKED` constant on this tree (`src/lib/multiplayer/server/projection/ViewerDeliveryCursors.ts`). The live bound is `MAX_BUFFERED_BYTES` = 1,048,576 on `ws.bufferedAmount` (`src/lib/multiplayer/server/ServerMatchBroadcaster.ts`). A socket past that cap is marked behind, skipped for further live frames, and stays behind after the buffer drains so a mid-stream resume cannot punch a hole. The client reconnects and replays from its cursor. Finding #19: `bufferedAmount` is the Node pending-write backlog, not bytes the browser has not consumed (`openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md`, 2026-09-02 E2E-14 note). A per-viewer unacked bound is pending.

## Membership, reauthentication, and host loss

Membership is a durable row, not the invite code. Binders register a socket as a fan-out target only after authenticated membership (`openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md`, 6.1). A returning member joins by membership; the room code is the newcomer invite and can expire without locking out people already admitted (6.2). Revocation is a timestamp, never a delete (6.1).

Cold reauthentication uses account/vault identity plus that durable row and mints a scoped session token that never appears in a URL (6.3; `e2e/gm-two-player-token.pack.spec.ts` E2E-16). A mismatched player id is refused before payload disclosure.

When the last GM connection drops, the campaign session pauses. Nobody is promoted. `noteGmDisconnected` is the recoverable pause; `hostDisconnected` is terminal (closes the host, room code stops resolving, no campaign-tier host migration) (`src/lib/multiplayer/server/CampaignSyncSession.ts`; design D2/D6). Only the same reauthenticated GM can resume. Participant removal is a host-only audited command (`openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md`, 9.x 2026-08-30).

## Rewind boundary

Preview is a non-mutating consult. `previewGmCombatRewind` writes no journal, branch, head, lease, manifest, or checkpoint row. After a successful preview the route stores one server-only GM review record (`GmPrivatePreviewRecordWriter`); refusals store nothing; players never see that record (`openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md`, 18.3-a 2026-09-02).

Commit activates a candidate branch through the branches store: fence, cut at `targetRevision`, verify, seal impact, then `activateCandidateBranch` (`src/lib/multiplayer/server/history/GmCombatRewindCommit.ts`; `src/lib/events/journal/EventHistoryActivation.ts`). Prior history is not deleted.

Combat-only rewind stops when a campaign receipt exists. The commit module reads `campaign_combat_outcome_inbox` before any write and refuses `campaign-receipt-delivered` (409); preview answers the same reason (`openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md`, 13.4 2026-09-02). Design D6 names a distinct coordinated retroactive-outcome correction that uses a higher `outcomeVersion` only after campaign acceptance. Task 17.2, which would execute that saga, is still open.

History HTTP bodies carry a sibling `lineage` block (`src/lib/multiplayer/server/history/ViewerHistoryLineage.ts`). A player sees the same transition ids, cutoff, and actor role as the GM, without `reason` or `createdBy`, and only their own projection artifacts. The GM projection includes reason and createdBy.

## Recovery and quarantine

A match whose history cannot be rebuilt returns typed `blocked` with no host registered and no partial session published. One blocked match does not stop the recovery sweep (`openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md`, 15.x 2026-09-02).

Quarantine is derived, not stored. `detectAuthorityCorruption` runs before the fold: sequence-gap, broken-lineage, duplicate-receipt, and missing-digest each produce a blocked verdict. The registry is keyed `{authorityType, authorityId}` so a corrupt session cannot take a healthy one down. There is no quarantine table; every boot sweep re-derives the verdict (`src/lib/events/checkpoints/AuthorityQuarantine.ts`).

## Evidence a run leaves

Live packs live under `e2e/` and are invoked as `npm run verify:qc:gm-two-player-campaign -- --group=<name>` (`package.json`; `scripts/qc/run-gm-two-player-campaign.mjs`). The group catalog is `GROUP_CATALOG` in `scripts/qc/gm-two-player-campaign-core.cjs`.

Each Playwright run owns `.sisyphus/e2e-runtime/<run-id>/` (`playwright.config.ts`). Match evidence is `multiplayer-matches.db` in that directory (`e2e/helpers/matchAuthorityEvidence.ts`). Readers open a dedicated connection with `readonly: true, fileMustExist: true` and import nothing from the production store (`e2e/fixtures/sqliteEvidenceReader.ts`). A missing file throws `EVIDENCE_DB_MISSING` instead of creating an empty database.

Row titles carry `@E2E-NN` tags (for example `@E2E-04` in `e2e/gm-two-player-authority-order.pack.spec.ts`). Grep selection is the title tag.

## Performance budgets

Controlled fixture (`src/lib/multiplayer/performance/controlledLoopbackFixture.ts`; tasks 23.1): 20 warm-up commands excluded from percentiles, at least 200 measured commands, nearest-rank percentiles, 100-event / 512-KiB replay chunks, 256-envelope / 1-MiB queue bound, 128-MiB server and 64-MiB per-client post-warm memory-growth ceilings. Product constants asserted against those ceilings: `REPLAY_CHUNK_SIZE` ≤ 100, `MAX_BUFFERED_BYTES` ≤ 1 MiB.

Gates (23.2): p95 accepted-command-to-eligible-render ≤ 250 ms; p99 ≤ 750 ms; 1,000-event cold catch-up ≤ 2,000 ms on `ControlledLoopbackPerformanceRunner:controlled-loopback-local`. The 2,000 ms Playwright wait is `functionalWaitMs` only.

The probe is e2e-guarded `GET /api/e2e/performance-probe` (404 outside e2e mode or without the run token). Pack: `e2e/gm-two-player-performance.pack.spec.ts` (`@E2E-71` `@E2E-72` `@E2E-73`). Group `performance` is registered separately so it is not folded into `smoke` (`scripts/qc/gm-two-player-campaign-core.cjs`). `verify:qc:campaign-long` and the ten-scenario run (23.3) are still open (`openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md`, 23.4 2026-09-02).

## Exact-main post-merge audit

After each later major merge, update the evidence ledger and run the applicable staged group against exact main before the next dependent PR: `fixture-smoke` before role admission, `membership-smoke` when durable GM/P1/P2 roles land, then the evolving `smoke` subset (`openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md`, 24.4; design D11). `smoke` is the composition of landed groups in one runner plan; dropping a spec from that list reds the pin in `scripts/__tests__/gm-two-player-campaign-qc.test.ts`.
