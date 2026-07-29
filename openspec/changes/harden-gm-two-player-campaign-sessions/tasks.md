# Tasks: Harden GM + Two-Player Live Campaign Sessions

The PR order, dependency graph, ownership boundaries, exact-main regression cadence, and review evidence are maintained in `implementation-plan.md`. Each implementation PR MUST reference the requirement names and task IDs it closes.

## 1. Durable-Baseline Preflight

- [ ] 1.1 Verify the repository-supported Node version and rebuild/reinstall the native `better-sqlite3` dependency until `npm.cmd test -- --runInBand src/lib/multiplayer/server/__tests__/DurableMatchStore.test.ts src/lib/multiplayer/server/__tests__/hardenedTransport.test.ts` passes; record Node, ABI, and command output in `test-results/gm-two-player/preflight/` before any durability implementation.
- [ ] 1.2 Add RED unit/contract tests for `Atomic Command Event Batches`, `Commit Precedes Recipient Publication`, and crash-before/after-commit behavior at `IMatchStore.ts`, `DurableMatchStore.ts`, `InMemoryMatchStore.ts`, and `ServerMatchHostIntent.ts`; prove partial-batch and false-success behavior fail before implementation.
- [ ] 1.3 Add RED protocol/client tests for `Stable Intent Identity Survives Retries`, `Authority and Viewer Sequences Are Separate`, replay/live overlap, sequence collision, and `Heartbeat Is Bidirectional` in `src/lib/multiplayer/Protocol.ts`, `src/lib/multiplayer/client.ts`, and their existing test suites.
- [ ] 1.4 Keep SUPERHEAVY gyro serialization, zero-BV campaign materialization, Quick Game bootstrap recovery, and fail-open determinism CI in separate changes; document only their external prerequisite status in `implementation-plan.md`.

## 2. Additive Authority Schema and Store Contracts

- [ ] 2.1 Add additive SQLite migrations and TypeScript records for command receipts, command batches, recipient-neutral outbox, campaign sessions, participants, viewer cursors, branches, supersession, checkpoints, outcome inbox/receipts, and private GM audit references, implementing `Atomic Command Event Batches`, `Campaign Journal Migration Is Additive and Idempotent`, and `Branches Preserve Immutable Supersession Lineage`.
- [ ] 2.2 Extend `IMatchStore.ts` and the campaign event-store boundary with atomic batch, receipt lookup, outbox claim/acknowledgement, branch, participant, and cursor operations; update `InMemoryMatchStore.ts` only as a contract-compatible test/dev adapter.
- [ ] 2.3 Implement the additive schema and atomic operations in `DurableMatchStore.ts` and the selected campaign persistence adapter with uniqueness and foreign-key constraints for session-scoped idempotency, outcome versions, authority sequence, and branch activation.
- [ ] 2.4 Add migration/idempotency/rollback contract tests, including repeated backfill, ambiguous ownership fail-closed behavior, and a schema reader compatible with preserved materialized snapshots; run `npm.cmd test -- --runInBand src/lib/multiplayer/server/__tests__/DurableMatchStore.test.ts src/lib/campaign/persistence/__tests__/campaignMigration.test.ts`.

## 3. Atomic Batch Append API

- [ ] 3.1 Implement command-receipt digesting and atomic multi-event append in the store adapters, satisfying `Atomic Command Event Batches` and `Command Receipts Persist for the Authority Lifetime`.
- [ ] 3.2 Add controlled no-network/no-sleep store seams that fail before commit, during a middle event, during head update, and during outbox insert; assert full rollback and no successful receipt.
- [ ] 3.3 Add restart tests proving an identical retry returns the prior receipt and a reused identity with different actor, branch, kind, or payload returns a typed integrity conflict.
- [ ] 3.4 Verify with `npm.cmd test -- --runInBand src/lib/multiplayer/server/__tests__/InMemoryMatchStore.test.ts src/lib/multiplayer/server/__tests__/DurableMatchStore.test.ts src/lib/multiplayer/server/__tests__/MatchStoreStress.test.ts`.

## 4. Per-Session Serialized Command Cutover

- [ ] 4.1 Add one bounded serialized executor per match/session and route `ServerMatchHostIntent.ts` validation, reducer execution, and batch creation through it, implementing `Per-Session Command Execution Is Serialized`.
- [ ] 4.2 Split atomic store capability from host cutover behind a disabled-by-default shadow/cutover flag; compare existing and journal-derived results before the new path becomes authoritative.
- [ ] 4.3 Prove concurrent Player 1/Player 2 commands form deterministic non-interleaved batches while commands in unrelated sessions continue independently.
- [ ] 4.4 Verify with `npm.cmd test -- --runInBand src/lib/multiplayer/server/__tests__/ServerMatchHost.test.ts src/lib/multiplayer/server/__tests__/ServerMatchHostEngineDispatch.test.ts src/lib/multiplayer/server/__tests__/MatchStoreStress.test.ts`.

## 5. Stable Intent and Viewer Delivery Protocol

- [ ] 5.1 Extend production `Protocol.ts` and `client.ts` envelopes with stable command/idempotency identity, branch, gapless per-viewer `deliverySequence`, projection digest, acknowledgement, and typed gap/collision receipts, implementing the `multiplayer-sync` requirements without exposing private authority sequences.
- [ ] 5.2 Persist pending command identity client-side until a terminal receipt and reuse it across reconnect attempts; clear only the matching committed, rejected, vetoed, timed-out, or integrity-conflict state.
- [ ] 5.3 Replace max-high-water application with contiguous exactly-once reducer application, replay/live buffering, gap recovery, and sequence-collision blocking.
- [ ] 5.4 Verify with `npm.cmd test -- --runInBand src/lib/multiplayer/__tests__/client.test.ts src/lib/multiplayer/server/__tests__/replayStream.test.ts src/lib/multiplayer/server/__tests__/reconnectionFlow.test.ts`.

## 6. Durable Admission, Active Routing, and Reauthentication

- [ ] 6.1 Persist participant-to-campaign-session and participant-to-match bindings, and require authenticated durable membership before `bindMultiplayerSocketConnection.ts` or `bindCampaignSyncConnection.ts` registers a replay/fan-out recipient, implementing `Authenticated Membership Precedes Socket Attachment`.
- [ ] 6.2 Replace active room-code routing with durable campaign-session/match routing after join while preserving invite expiry for newcomers.
- [ ] 6.3 Implement cold reauthentication from account/vault identity plus durable membership and mint scoped session tokens outside URLs; reject revoked or mismatched identities before payload disclosure.
- [ ] 6.4 Verify with `npm.cmd test -- --runInBand src/lib/multiplayer/server/__tests__/bindMultiplayerSocketConnection.test.ts src/lib/multiplayer/server/__tests__/bindCampaignSyncConnection.test.ts src/lib/multiplayer/server/__tests__/auth.test.ts` and a focused Playwright cold-reload test.

## 7. Durable Publication, Heartbeat, and Backpressure

- [ ] 7.1 Publish committed results from durable outbox rows after transaction commit and resume pending publication after restart, implementing `Commit Precedes Recipient Publication`.
- [ ] 7.2 Complete the bidirectional heartbeat contract in `Protocol.ts`, `ServerMatchSocketLifecycle.ts`, and `client.ts`; prove quiet healthy sessions remain connected and dead peers transition through reconnect.
- [ ] 7.3 Add bounded per-connection queues to `ServerMatchBroadcaster.ts`; on saturation mark only that participant behind, continue healthy delivery, and resynchronize from the durable viewer cursor.
- [ ] 7.4 Add tests for one socket-send failure, slow-client isolation, bounded queue/memory behavior, and convergence-gated progression; run `npm.cmd test -- --runInBand src/lib/multiplayer/server/__tests__/ServerMatchSocketLifecycle.test.ts src/lib/multiplayer/server/__tests__/reconnectPersistence.integration.test.ts src/lib/multiplayer/server/__tests__/hardenedTransport.test.ts`.

## 8. Durable Campaign Journal Migration and Cutover

- [ ] 8.1 Replace `CampaignHostRegistry.ts`'s unconditional in-memory event-store selection with an environment-aware durable server campaign journal while preserving a loud dev/test adapter.
- [ ] 8.2 Add idempotent backfill from existing materialized campaign snapshots into a genesis branch, preserving snapshots during migration and blocking ambiguous ownership for GM remapping.
- [ ] 8.3 Make campaign activity a role-scoped authoritative projection rather than a browser-global log and remove whole-envelope 409 retry as a conflict strategy.
- [ ] 8.4 Implement command-based conflict handling: revalidate disjoint stale commands, reject same-field stale commands, and return current branch/revision plus safe recovery action.
- [ ] 8.5 Verify with `npm.cmd test -- --runInBand src/lib/multiplayer/server/__tests__/CampaignHostRegistry.test.ts src/lib/multiplayer/server/__tests__/CampaignMatchHost.test.ts src/lib/campaign/persistence/__tests__/campaignMigration.test.ts`.

## 9. Non-Playing GM and Two-Player Membership

- [ ] 9.1 Extend campaign membership to one non-playing GM and two tactical player slots with durable role, ownership, readiness revision, branch, acknowledgement cursor, and revocation state, implementing `Co-op Campaign Has One Non-Playing GM and Two Tactical Players`.
- [ ] 9.2 Validate unit, force, proposal, readiness, and launch commands against durable ownership; clear only affected readiness when an authoritative force or revision changes.
- [ ] 9.3 Implement durable GM-loss pause with no implicit player promotion; allow resume only by the same reauthenticated GM and participant removal only through an audited GM command.
- [ ] 9.4 Gate scenario progression on convergence of all retained participants while allowing eligible committed delivery to healthy clients.
- [ ] 9.5 Verify with `npm.cmd test -- --runInBand src/lib/multiplayer/server/__tests__/CampaignSyncSession.test.ts src/lib/multiplayer/server/__tests__/CampaignGmArbiter.test.ts src/lib/multiplayer/server/__tests__/CampaignMatchHost.test.ts`.

## 10. Awaited Campaign Creation and Canonical Unit Adoption

- [ ] 10.1 Make campaign creation/adoption await authoritative campaign, genesis branch, GM membership, player-slot placeholders, force ownership, and unit-reference commit before returning success, implementing `Campaign Creation Has an Awaited Authority Checkpoint`.
- [ ] 10.2 Preserve customized-unit identity, weight, tech base, engine, gyro, armor, equipment, critical slots, and temporal metadata through campaign adoption and player ownership.
- [ ] 10.3 Materialize both tactical player forces from the active campaign branch/revision and reject stale force or ownership revisions before encounter creation.
- [ ] 10.4 Verify with focused campaign creation, serialization, customizer-handoff, and encounter-materialization tests plus `npm.cmd test -- --runInBand src/lib/campaign/persistence/__tests__/serializeCampaign.test.ts src/lib/campaign/encounter/__tests__/materializeCampaignMissionEncounter.test.ts`.

## 11. Pre-Serialization Viewer Projection

- [ ] 11.1 Introduce one server-side viewer projector used before `JSON.stringify` for live match and campaign frames, implementing `Viewer Projection Occurs Before Serialization` and private authority-sequence separation.
- [ ] 11.2 Store GM previews and private reasons in separately authorized server-only records; ensure player-safe facts contain no private fields or correlatable private identifiers.
- [ ] 11.3 Implement sealed Player 1/Player 2 choices and authoritative reveal while keeping ordinary public combat facts on immediate committed publication.
- [ ] 11.4 Add schema/object tests and raw-frame negative tests for GM-private reason, hidden metadata, private IDs, authority sequences, and inferable gaps; fail closed on any projection error.
- [ ] 11.5 Verify with `npm.cmd test -- --runInBand src/lib/multiplayer/server/__tests__/ServerMatchHost.fogOfWarIntegration.test.ts src/lib/multiplayer/server/__tests__/CampaignSyncSession.test.ts src/lib/multiplayer/server/__tests__/ServerMatchHost.test.ts`.

## 12. Replay Snapshot Timeline and Export Parity

- [ ] 12.1 Reuse the pre-serialization projector for replay, resync, snapshot, cold recovery, audit timeline, and export, implementing `Visibility Is Equivalent Across Surfaces` and `Timeline and Export Use the Same Viewer Projection`.
- [ ] 12.2 Add per-viewer projection digests and parity tests across live/replay/snapshot/cold-recovery/timeline/export for GM, Player 1, and Player 2.
- [ ] 12.3 Add authorization tests proving a player cannot query a private GM audit identifier or infer hidden authority events from delivery gaps.
- [ ] 12.4 Verify with focused replay, recovery, fog, audit, and export suites and `npm.cmd run verify:qc:replay-recovery`.

## 13. Durable Combat Outcome Receipt Boundary

- [ ] 13.1 Replace process-local terminal publication as the authority boundary with a combat outcome outbox written in the terminal combat transaction, implementing `Terminal Combat Outcome Uses Durable Outbox and Inbox`.
- [ ] 13.2 Add a campaign inbox and unique `(outcomeId, outcomeVersion)` receipt that commits campaign consequences atomically.
- [ ] 13.3 Prove duplicate delivery, crash-before-receipt, restart, and campaign ingestion retries apply one consequence batch.
- [ ] 13.4 Enforce `Combat-Only Rewind Stops at Campaign Receipt` with a typed closed-boundary response.
- [ ] 13.5 Verify with `npm.cmd test -- --runInBand src/lib/multiplayer/server/__tests__/bindCampaignSyncConnection.reconcile.test.ts src/lib/multiplayer/server/__tests__/CampaignMatchHost.test.ts` and focused `InteractiveSession.outcome` tests.

## 14. Immutable Combat Correction and Rewind Kernel

- [ ] 14.1 Route finalized combat corrections through server-authored authoritative commands while keeping preview non-mutating and GM-private, implementing `Combat Intervention Has Distinct Preview and Commit Phases`.
- [ ] 14.2 Add immutable combat branch, supersession, trusted-checkpoint, and stale-branch command semantics without changing existing combat reducers.
- [ ] 14.3 Reject commands during rebuild with retryable `PROJECTION_REBUILDING`; do not queue them invisibly.
- [ ] 14.4 Rebuild combat state, RNG provenance, fog, sealed choices, and viewer projections; activate the replacement branch atomically only after verification.
- [ ] 14.5 Verify with GM intervention suites, deterministic replay tests, fog integration tests, and `npm.cmd run verify:qc:gm:campaign-ledger`.

## 15. Cache-Only Checkpoints and Branch Recovery

- [ ] 15.1 Implement immutable checkpoints keyed by branch, authority head, reducer version, and digest, satisfying `Checkpoints and Compaction Are Cache-Only`.
- [ ] 15.2 Prove compatible checkpoint-plus-tail equals full replay for authoritative state and all three viewer digests.
- [ ] 15.3 Prove reducer-version or digest mismatch rebuilds from an earlier base or blocks truthfully without publishing partial recovery.
- [ ] 15.4 Add per-session corruption quarantine for broken sequence, lineage, receipt, or digest while a healthy control session remains available.

## 16. Retroactive Campaign Rebuild

- [ ] 16.1 Extend campaign intervention preview to declare affected date, missions/contracts, finances, transactions, loans, reputation, rewards, salvage, repairs, inventory, roster, unit/pilot/personnel, markets, receipts, scenario artifacts, activity, audit, and viewer-projection families.
- [ ] 16.2 Implement backward time and retroactive correction as replacement-branch replay from a trusted base, not a negative forward-day loop, satisfying `Retroactive Campaign Changes Rebuild Declared Families`.
- [ ] 16.3 Reject commands during rebuild with `PROJECTION_REBUILDING`; activate only after every declared state, artifact, receipt, audit, and viewer projection verifies.
- [ ] 16.4 Invalidate stale scenario drafts, force selections, outcomes, and other externalized artifacts explicitly and reject their later use.
- [ ] 16.5 Verify with campaign day-pipeline, campaign intervention control-plane, mission-launch, and time-cascade tests plus `npm.cmd run verify:qc:gm:time-cascade`.

## 17. Coordinated Post-Receipt Outcome Correction

- [ ] 17.1 Implement a distinct higher-version coordinated outcome-correction command for the post-campaign-receipt boundary, satisfying `Coordinated Outcome Correction Supersedes Across Journals`.
- [ ] 17.2 Atomically record combat supersession, replacement outcome outbox, campaign replacement receipt, invalidation manifest, and deterministic replacement consequence batch.
- [ ] 17.3 Gate scenario N+1 on the active outcome receipt, replacement artifacts, active branch, and convergence of every retained participant.
- [ ] 17.4 Prove retry, reconnect, and restart cannot apply the coordinated correction twice and preserve cross-journal audit causality.

## 18. Role-Scoped Audit Timeline

- [ ] 18.1 Add branch/effective-head/supersession rendering and cross-journal outcome causality to the audit timeline, implementing `Timeline Preserves Branch and Supersession Lineage`.
- [ ] 18.2 Add separate authorized GM-private audit lookup and player-safe history/export; record private-record access.
- [ ] 18.3 Add rewind-impact preview showing affected domains and artifacts without mutating state.
- [ ] 18.4 Add GM and player timeline/export parity tests plus negative privacy scans for private fields and hidden-event identifiers.

## 19. Accessible Lifecycle and Recovery UX

- [ ] 19.1 Add stable UI states and locators for pending, sealed, finalized, syncing, reconnecting, behind, rebuilding, rewound, and blocked across campaign, combat, and GM surfaces.
- [ ] 19.2 Gate command surfaces during rebuild, stale branch, blocked recovery, and required convergence; provide actor-safe typed conflict and recovery actions.
- [ ] 19.3 Add keyboard-complete rewind preview/confirmation, focus management after errors and decisions, persistent text, live-region announcements, and narrow-viewport primary actions.
- [ ] 19.4 Verify affected component tests, `npm.cmd run verify:qc:viewport-sweep`, and accessibility assertions for every lifecycle state.

## 20. Three-Context Sandbox Foundation

- [ ] 20.1 Add `e2e/fixtures/gmTwoPlayerCampaign.ts` with isolated non-playing GM, Player 1, and Player 2 browser contexts, harness-owned server, per-run database, distinct identities, and deterministic seeds.
- [ ] 20.2 Add test-only fault controls guarded by `NODE_ENV === 'test'`, E2E run ID, explicit session scope, and one-shot consumption; make production startup reject enabled controls.
- [ ] 20.3 Add a dedicated SQLite evidence reader opened `readonly: true, fileMustExist: true`; never instantiate the production store for read-only proof.
- [ ] 20.4 Add role-labeled traces, screenshots, raw socket transcript, pre-serialization projection capture, latency timestamps, durable-row export, state/projection hashes, environment manifest, and cleanup log under `test-results/gm-two-player/<run-id>/`.
- [ ] 20.5 Add ownership-scoped cleanup that preserves ambient browser tabs, Chrome processes, unrelated servers, databases, and user artifacts.

## 21. Strict Acceptance Scenarios E2E-01 Through E2E-45

- [ ] 21.1 Implement and pass E2E-01 through E2E-18 for durable creation, order, atomicity, idempotency, replay/live recovery, cursor integrity, slow-client isolation, restart, reauthentication, active routing, and heartbeat.
- [ ] 21.2 Implement and pass E2E-19 through E2E-30 for pre-serialization privacy, sealed choices, immediate public facts, fog projections, live/replay/export parity, unauthorized access, veto/timeout, and simultaneous proposal attribution.
- [ ] 21.3 Implement and pass E2E-31 through E2E-45 for player ownership, deterministic concurrency, server RNG, disconnect policy, outcome receipts, immutable correction, pre-receipt combat rewind, branch convergence, fog restoration, and coordinated post-receipt correction.
- [ ] 21.4 Register an exact command `npm.cmd run verify:qc:gm-two-player-campaign -- --group=authority` and make failures retain the complete evidence bundle.

## 22. Strict Acceptance Scenarios E2E-46 Through E2E-80

- [ ] 22.1 Implement and pass E2E-46 through E2E-60 for time cascade, retroactive rebuild, invalidation, scenario continuity, customized-unit fidelity, ten-scenario restarts, checkpoint equivalence, receipts, provenance, and impact preview.
- [ ] 22.2 Implement and pass E2E-61 through E2E-70 for malformed/replay attacks, atomic failure, fail-closed projection, GM loss, partition catch-up, stale branch, quarantine, bounded replay, and socket failure.
- [ ] 22.3 Implement and pass E2E-71 through E2E-80 for latency, catch-up, backpressure, accessible lifecycle UX, confirmation, typed conflicts, evidence completeness, cleanup, and exact-main post-merge audits.
- [ ] 22.4 Register `--group=campaign`, `--group=failure`, `--group=performance`, and `--group=all` selectors without weakening strict backing requirements.

## 23. Performance and Long-Run Gates

- [ ] 23.1 Commit the controlled fixture configuration: 20 warm-up commands, at least 200 measured representative commands, monotonic correlated clocks, nearest-rank percentile calculation, named runner class, 100-event/512-KiB replay chunks, 256-frame/4-MiB queue bound, and 128-MiB post-warm memory-growth ceiling.
- [ ] 23.2 Gate p95 at 250 milliseconds, p99 at 750 milliseconds, and 1,000-event cold catch-up at 2 seconds on the recorded controlled loopback runner; keep the 2,000-millisecond Playwright wait as a functional timeout only.
- [ ] 23.3 Run ten sequential scenarios with periodic player reconnects, GM reconnect, server restart, correction, pre-receipt rewind, post-receipt coordinated correction, and checkpoint/full-replay comparison.
- [ ] 23.4 Verify `npm.cmd run verify:qc:gm-two-player-campaign -- --group=performance` and `npm.cmd run verify:qc:campaign-long`; archive latency and memory JSON with the run.

## 24. Cutover Rollback and Exact-Main Regression

- [ ] 24.1 Prove shadow dual-write state and audience digests match before enabling journal authority for new sandbox sessions.
- [ ] 24.2 Cut over new sessions behind the reviewed feature flag, preserve legacy completed-log read compatibility, and refuse ambiguous active-session migration.
- [ ] 24.3 Document rollback that stops new admission, preserves journal/branch/receipt/audit rows, and returns to a schema-compatible reader without destructive history edits.
- [ ] 24.4 After each major merge, update the evidence ledger and run the applicable `npm.cmd run verify:qc:gm-two-player-campaign -- --group=<slice>` against exact main before the next dependent PR.

## 25. Final Verification and Documentation

- [ ] 25.1 Run focused changed-area Jest and Playwright suites, then `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run format:check`, `npm.cmd run verify:qc:multiplayer:contracts`, `npm.cmd run verify:qc:multiplayer:browser`, `npm.cmd run verify:qc:coop-campaign-journey`, `npm.cmd run verify:qc:encounter-combat-continuity`, `npm.cmd run verify:qc:replay-recovery`, and the complete GM/two-player command.
- [ ] 25.2 Run `openspec validate harden-gm-two-player-campaign-sessions --strict --no-interactive`, `npm.cmd run qc:openspec-ci:validate`, and LSP diagnostics for every modified TypeScript/TSX file.
- [ ] 25.3 Update operator and contributor documentation for authority versus delivery sequence, membership/reauthentication, host loss, rewind boundary, recovery/quarantine, evidence bundle, performance methodology, and exact-main post-merge audit.
- [ ] 25.4 Reconcile all 80 acceptance scenarios to test identifiers and evidence paths, leave no unchecked implementation task without a linked blocker, and archive the change only after every applicable strict gate passes.
