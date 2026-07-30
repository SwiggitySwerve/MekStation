## 1. Durable Campaign Batch Adapter — PR 1

- [ ] 1.1 Add failing campaign-store tests for atomic multi-event commands, expected revision, retry identity, no gaps, and restart.
- [ ] 1.2 Replace the production-only in-memory campaign event adapter with the shared journal adapter behind a disabled cutover flag; keep explicit test/dev adapters.
- [ ] 1.3 Commit each campaign command batch atomically before projection or fan-out and prove funds/personnel/roster changes cannot partially apply.
- [ ] 1.4 Run focused campaign host/store tests, real SQLite recovery, typecheck/lint/format, strict OpenSpec validation, and independent authority review.
- [ ] 1.5 After merge, rerun exact-main campaign batch/restart proof and prune the merged branch/worktree.

## 2. Honest Baseline and Snapshot Projection — PR 2

- [ ] 2.1 Import existing snapshot-only campaigns as explicit baseline events with source revision/digest metadata and no fabricated history.
- [ ] 2.2 Record branch, revision, projector version, and digest on materialized campaign snapshots.
- [ ] 2.3 Shadow-project journal and snapshot paths, block cutover on any mismatch, and preserve one write authority.
- [ ] 2.4 Add rollback-reader tests that preserve journal rows and reject ambiguous post-cutover fallback.
- [ ] 2.5 After focused gates and independent migration review pass, merge, rerun shadow equality on exact main, and prune the branch/worktree.

## 3. Entity Lineage Through Campaign Handoff — PR 3

- [ ] 3.1 Add durable entity links for customized unit, canonical source, campaign instance, force, pilot, mission, encounter, and session identities.
- [ ] 3.2 Prove canonical customization save/reload and campaign adoption preserve weight, tech base, engine, gyro, armor, equipment, critical slots, and temporal metadata.
- [ ] 3.3 Prove the same unit instance appears in mech bay and mission readiness after navigation and cold reload with journal plus snapshot evidence.
- [ ] 3.4 Run focused serialization/campaign handoff tests, `qc:ux-audit:deep`, applicable viewport/accessibility checks, and independent visual/authority review.
- [ ] 3.5 After merge, rerun the full customizer-to-readiness journey on exact main and prune the merged branch/worktree.

## 4. Gap-Free Campaign Synchronization — PR 4

- [ ] 4.1 Implement high-water capture plus buffered subscription before replay and bounded drain/resync afterward.
- [ ] 4.2 Persist each participant's highest contiguous applied delivery cursor and reject gaps, identity collisions, and hidden-authority leakage.
- [ ] 4.3 Add two-player restart, event-during-catch-up, replay/live overlap, slow-client, and healthy-client control tests.
- [ ] 4.4 Run multiplayer/campaign sync validators, `qc:campaign-long:browser`, and independent privacy/backpressure review.
- [ ] 4.5 After merge, run exact-main two-player campaign regression, record cursor/journal/reload evidence, and prune the merged branch/worktree.

## 5. Per-Campaign Cutover — PR 5

- [ ] 5.1 Enable journal authority for new campaigns behind the reviewed flag only after shadow parity and synchronization gates pass.
- [ ] 5.2 Add per-campaign migration eligibility and truthful blocked state for ambiguous ownership or inconsistent snapshots.
- [ ] 5.3 Document cutover/rollback and prove a restart never creates a fresh empty event log.
- [ ] 5.4 Run all applicable campaign, multiplayer, replay, deep-audit, long-browser, and exact-main gates with independent final review.
- [ ] 5.5 Record the merge SHA/evidence and prune the merged branch/worktree before cross-stream effects.
