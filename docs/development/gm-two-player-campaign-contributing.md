# GM Two-Player Campaign (contributor)

How to change the GM plus two-player campaign authority path without inventing a second store or a second live harness. This page sits under `docs/development/` with the other contributor notes (`docs/development/getting-started.md`, `docs/development/coding-standards.md`). Operator meaning of authority, delivery, rewind, evidence, and budgets is `docs/features/gm-two-player-campaign.md`.

## Store boundaries and ports

Match persistence is `IMatchStore`. Production is `DurableMatchStore` (SQLite). `InMemoryMatchStore` is for tests and must stay loud about non-durability (`src/lib/multiplayer/server/AGENTS.md`; `src/lib/multiplayer/server/IMatchStore.ts`).

Optional capabilities are structural flags — the methods exist or they do not:

- `IViewerDeliveryStore` / `IViewerDeliveryAcknowledgementStore` on `IMatchStore` (`src/lib/multiplayer/server/IMatchStore.ts`).
- Shared facade ports on both match and campaign stores (`src/lib/events/storeCapabilityPorts.ts`): `IEventHistoryBranchPort` (keyed by `IEventHistoryStreamRef`), `ICampaignSessionParticipantPort` (campaign / session / participant — never `matchId`), `IParticipantDeliveryCursorPort` (grant + viewer facts supplied on the ack call).

Guards: `hasViewerDeliveryStore`, `hasViewerDeliveryAcknowledgementStore`, `hasHistoryBranchStore`, `hasParticipantStore`, `hasDeliveryCursorStore`. Absence of a port is the pre-capability path; do not invent a default that papers over a missing store.

`appendCommandBatch` is the authority write: identity, events, outbox, receipt, and head in one transaction (`src/lib/multiplayer/server/DurableMatchStore.ts`). Do not move the outbox insert after commit. Publication is a later drain of unpublished outbox rows.

Zustand stores are projections, never authority (`openspec/changes/harden-gm-two-player-campaign-sessions/design.md`, D8).

## Branches store and rewind modules

Branch questions go through `IEventHistoryBranchPort` / `SQLiteEventHistoryBranchStore`. Effective-head reads must name a branch; unqualified head reads pick an arbitrary row once a stream holds more than one head (`openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md`, 2026-09-02 finding #86). Use `EventHistoryEffectiveStreamHead.readEffectiveStreamHead`.

Rewind modules (combat stack):

- Preview: `src/lib/multiplayer/server/history/GmCombatRewindPreview.ts` — non-mutating consult; same refusal vocabulary as commit, including `campaign-receipt-delivered`.
- Commit: `src/lib/multiplayer/server/history/GmCombatRewindCommit.ts` — inbox read first, then correction lease, `createCorrectionCandidateBranch` at `baseRevision = targetRevision`, `verifyCandidatePath`, `deriveAndSealCandidateImpact`, `activateCandidateBranch`.
- Activation: `src/lib/events/journal/EventHistoryActivation.ts` — prior branch superseded, candidate effective, supersession row, effective head, in one transaction.
- Lineage projection: `src/lib/multiplayer/server/history/ViewerHistoryLineage.ts` — sibling `lineage` on timeline and export bodies; GM gets `reason` / `createdBy`, players do not.

Do not patch current state or delete tail events (design D5). A delivered campaign receipt closes combat-only rewind. Coordinated post-receipt correction is a distinct command (design D6); task 17.2 is still open.

During rebuild, live admission uses `refuseDuringHistoryRebuild` / `readDurableStreamRebuild`. Commands return typed `PROJECTION_REBUILDING` and are not silently queued (design D5).

## Live pack conventions

Invoke one group: `npm run verify:qc:gm-two-player-campaign -- --group=<name>` (`package.json`; `scripts/qc/run-gm-two-player-campaign.mjs`). Every implemented plan uses Playwright `--workers=1` and `MEKSTATION_E2E_REUSE_EXISTING_SERVER=false` (`scripts/qc/gm-two-player-campaign-core.cjs`).

Playwright defaults to port 3600 when `MEKSTATION_E2E_PORT` is unset (`playwright.config.ts`; same default as `npm run dev` in `docs/development/getting-started.md`). A direct Playwright run on that default therefore shares the live app port — run one live group at a time. The QC runner always assigns a derived fixture port (`37000 + hash(runId) % 10000`) and exits `PORT_IN_USE` if that port is taken.

Respawning groups are only `restart-pack` and `resilience-pack`. Those set `MEKSTATION_E2E_SERVER_COMMAND` to `node scripts/e2e/relaunching-server.mjs`. Every other implemented group uses `node server.js`. The relaunching wrapper is the exception; pin the server command per group so a future respawning row has to say so (`scripts/__tests__/gm-two-player-campaign-qc.test.ts`).

Reserved names that still throw `NOT_IMPLEMENTED`: `authority` (complete E2E-01..18), `visibility` (complete E2E-19..30), and the other catalog keys without a `SPEC_BY_GROUP` entry (`scripts/qc/gm-two-player-campaign-core.cjs`).

## Adding a row, a group, and a pin

1. Write the Playwright test with the scenario id in the title and the `@E2E-NN` tag beside the pack tag. Grep selection is the title tag (`openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md`, 21.1 2026-09-02; examples in `e2e/gm-two-player-authority-order.pack.spec.ts`).
2. Register the group in `GROUP_CATALOG` (`name:owner`) and add a `SPEC_BY_GROUP` line that names the spec file. If any row kills the process, add the group to `RESPAWNING_GROUPS`.
3. Pin the plan in `scripts/__tests__/gm-two-player-campaign-qc.test.ts`: catalog key order, spec path, `--workers=1`, and the server command. The `authority-order` pin exists because absence of the key was a silent skip (Expected 28 / Received 27).
4. If the group is part of the evolving `smoke` subset, add its spec to the `smoke` list in the same file. Narrowing that list is caught by the pin (24.4).

Do not instantiate `DurableMatchStore` to read proof. Open `.sisyphus/e2e-runtime/<run-id>/multiplayer-matches.db` (or the campaign db the row names) through `e2e/fixtures/sqliteEvidenceReader.ts` or the same `readonly: true, fileMustExist: true` options (`e2e/helpers/matchAuthorityEvidence.ts`).

## Mutant and ladder discipline

Receipts treat a green run as insufficient. Named mutants that must stay red include: moving the outbox insert out of the batch transaction; digesting events without fog state; dropping Player 2 from an audience digest; a p95 gate that quietly compares against the p99 budget; a performance gate that reads an earlier run's archive; dropping a spec from `smoke` (`openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md`, 7.1 / 24.1 / 23.1 / 24.4).

The landing ladder is exact-main, one applicable group at a time: `fixture-smoke`, then `membership-smoke`, then `smoke`, then the named pack for the slice (`openspec/changes/harden-gm-two-player-campaign-sessions/design.md`, D11; tasks 24.4). Unimplemented groups must keep throwing typed `NOT_IMPLEMENTED`. Do not fold `performance` into `smoke`; its budgets gate the recorded controlled class (`scripts/qc/gm-two-player-campaign-core.cjs`).
