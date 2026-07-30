Every PR in this change MUST stay under 500 non-generated changed lines and 15 files, own one behavior seam, and split through an OpenSpec update before implementation if the cap cannot be met.

## 1. Durable Campaign Batch Adapter — PR 1

- [ ] 1.1 Add failing campaign-store tests for atomic multi-event commands, expected revision, retry identity, no gaps, and restart.
- [ ] 1.2 Replace the production-only in-memory campaign event adapter with the shared journal adapter behind a disabled cutover flag; keep explicit test/dev adapters.
- [ ] 1.3 Commit each campaign command batch and expected post-state digest atomically, verify that digest after committed apply, and prove funds/personnel/roster changes cannot partially apply or fan out on divergence.
- [ ] 1.4 Run focused campaign host/store tests, real SQLite recovery, typecheck/lint/format, strict OpenSpec validation, and independent authority review.
- [ ] 1.5 After merge, rerun exact-main campaign batch/restart proof and prune the merged branch/worktree.

## 2. Honest Baseline and Snapshot Projection — PR 2

- [ ] 2.1 Add durable `legacy`, `shadowing`, `journal`, and `blocked` migration states plus a cutover marker with source snapshot revision/digest, imported baseline identity, and first journal-authority command.
- [ ] 2.2 Import existing snapshot-only campaigns as explicit baseline events with source revision/digest metadata and no fabricated history; retain legacy `CampaignSnapshotPublished` reads while prohibiting it as post-cutover mutation authority.
- [ ] 2.3 Record branch, revision, projector version, and digest on materialized campaign snapshots.
- [ ] 2.4 Shadow-project journal and snapshot paths, block cutover on any mismatch, and preserve one write authority.
- [ ] 2.5 Prove snapshot-authority rollback is allowed only before the first post-baseline journal command; afterward require a compatible journal reader or truthful blocked state.
- [ ] 2.6 After focused gates and independent migration review pass, merge, rerun shadow equality on exact main, and prune the branch/worktree.

## 3. Entity Lineage Through Campaign Handoff — PR 3

- [ ] 3.1 Add durable entity links for customized unit, canonical source, campaign instance, force, pilot, mission, encounter, and session identities.
- [ ] 3.2 Prove canonical customization save/reload and campaign adoption preserve weight, tech base, engine, gyro, armor, equipment, critical slots, and temporal metadata.
- [ ] 3.3 Prove the same unit instance appears in mech bay and mission readiness after navigation and cold reload with journal plus snapshot evidence.
- [ ] 3.4 Run focused serialization/campaign handoff tests, `qc:ux-audit:deep`, applicable viewport/accessibility checks, and independent visual/authority review.
- [ ] 3.5 After merge, rerun the full customizer-to-readiness journey on exact main and prune the merged branch/worktree.

## 4. Replay/Live Server Handshake — PR 4

- [ ] 4.1 Establish buffered subscription before high-water observation through one coordinated boundary, then replay through the mark and perform bounded contiguous drain/resync afterward.
- [ ] 4.2 Add server contract tests for event-during-boundary, event-during-catch-up, replay/live overlap, duplicate delivery, and bounded resync without durable client cursor or UI changes.
- [ ] 4.3 Run focused campaign server/protocol tests and independent ordering/backpressure review.
- [ ] 4.4 After merge, rerun the handshake receipt on exact main and prune the merged branch/worktree.

## 5. Durable Participant Cursors — PR 5

- [ ] 5.1 Persist each authorized participant's highest contiguous applied delivery cursor and reject gaps, identity collisions, and hidden-authority leakage.
- [ ] 5.2 Add two-player restart, slow-client, healthy-client, revoked-membership, and cursor-resume tests without changing user-facing presentation.
- [ ] 5.3 Run focused client/server synchronization contracts and independent privacy/backpressure review.
- [ ] 5.4 After merge, rerun exact-main cursor/reconnect proof and prune the merged branch/worktree.

## 6. Synchronization UX and Browser Proof — PR 6

- [ ] 6.1 Expose persistent catching-up, retrying, behind, resyncing, and blocked states without enabling commands before authorized convergence.
- [ ] 6.2 Add one two-player browser journey pairing UI state with journal rows, delivery cursors, navigation, cold reload, and a healthy-client control.
- [ ] 6.3 Run multiplayer/campaign sync validators, `qc:campaign-long:browser`, viewport/accessibility checks, and independent visual/privacy review.
- [ ] 6.4 After merge, rerun the browser journey on exact main, archive authority evidence, and prune the merged branch/worktree.

## 7. Per-Campaign Cutover — PR 7

- [ ] 7.1 Enable journal authority for new campaigns behind the reviewed flag only after shadow parity, membership/projection, and synchronization gates pass.
- [ ] 7.2 Add per-campaign migration eligibility and truthful blocked state for ambiguous ownership or inconsistent snapshots.
- [ ] 7.3 Document cutover/rollback and prove a restart never creates a fresh empty event log or falls back after a journal-authored command.
- [ ] 7.4 Run all applicable campaign, multiplayer, replay, deep-audit, long-browser, and exact-main gates with independent final review.
- [ ] 7.5 Record the merge SHA/evidence and prune the merged branch/worktree before cross-stream effects.
