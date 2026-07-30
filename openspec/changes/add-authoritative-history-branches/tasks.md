## 1. Genesis Branch and Prior-Head Resolver — PR 1

- [ ] 1.1 Add additive branch, effective-head, and supersession tables with one genesis/effective branch per existing journal stream.
- [ ] 1.2 Resolve parent prefix plus child suffix at an explicit branch/revision and prove entity state/history at prior heads.
- [ ] 1.3 Add branch-aware expected-head validation and typed `STALE_BRANCH` without enabling branch creation in production.
- [ ] 1.4 Run focused branch storage/resolver tests, typecheck/lint/format, strict OpenSpec validation, and independent lineage/security review.
- [ ] 1.5 After merge, rerun exact-main resolver receipts and prune the merged branch/worktree.

## 2. Candidate Build and Atomic Activation — PR 2

- [ ] 2.1 Add authorized candidate creation anchored to parent branch, base revision/event/digest, actor, and reason.
- [ ] 2.2 Gate commands with `PROJECTION_REBUILDING` while a candidate replays and validates; do not queue commands invisibly.
- [ ] 2.3 Atomically activate a verified candidate and supersede the prior branch; leave the prior branch effective on any failure.
- [ ] 2.4 Add deterministic replay, viewer-projection, affected-artifact, and injected activation-failure tests.
- [ ] 2.5 After independent review and focused gates pass, merge, rerun activation/failure on exact main, and prune the branch/worktree.

## 3. Combat Rewind — PR 3

- [ ] 3.1 Keep GM combat rewind preview non-mutating and bind finalization to current branch/revision.
- [ ] 3.2 Rebuild combat state, RNG provenance, fog, sealed choices, and viewer projections on a candidate branch before activation.
- [ ] 3.3 Prove stale-branch, rebuild-time, unauthorized-player, and failed-verification commands append nothing.
- [ ] 3.4 Run GM intervention, combat replay, fog, multiplayer, command-browser, viewport/accessibility, and independent visual/privacy review.
- [ ] 3.5 After merge, rerun exact-main rewind/reconnect proof and prune the merged branch/worktree.

## 4. Campaign Replacement and Artifact Invalidation — PR 4

- [ ] 4.1 Require campaign correction preview to declare every affected state and externalized artifact family.
- [ ] 4.2 Build backward-time and retroactive correction as replacement-branch replay; invalidate stale missions, force selections, outcomes, and readiness artifacts explicitly.
- [ ] 4.3 Prove replacement construction, failed validation, and invalidated-artifact rejection without cross-stream outcome delivery or UI changes.
- [ ] 4.4 Run focused campaign time-cascade, ledger, branch, and artifact tests plus independent authority review.
- [ ] 4.5 After merge, rerun exact-main campaign replacement proof and prune the merged branch/worktree.

## 5. Coordinated Post-Receipt Correction Saga — PR 5

- [ ] 5.1 Reject combat-only rewind after the active outcome receipt and create a higher-version source correction plus replacement outbox in one source-local transaction.
- [ ] 5.2 Apply the target-scoped replacement receipt and deterministic campaign consequence batch in one target-local transaction; do not claim cross-store atomicity.
- [ ] 5.3 Persist pending, retrying, blocked, and applied saga states and keep scenario progression gated until the active target receipt and projections converge.
- [ ] 5.4 Prove retry, lost acknowledgement, source/target restart, target-scope mismatch, and blocked recovery apply replacement consequences once.
- [ ] 5.5 Run focused cross-stream receipt/correction tests and independent durability/security review.
- [ ] 5.6 After merge, rerun exact-main coordinated correction proof and prune the merged branch/worktree.

## 6. Branch Timeline and Recovery UX — PR 6

- [ ] 6.1 Add authorization-filtered branch/supersession/impact timeline and explicit prior-head inspection.
- [ ] 6.2 Add desktop/narrow accessible status, impact confirmation, rebuild progress, correction-saga state, failure focus, and recovery feedback.
- [ ] 6.3 Prove player views expose no GM-private reasons, hidden facts, authority gaps, or inaccessible branch identifiers.
- [ ] 6.4 Run deep audit, viewport sweep, replay/export parity, campaign-long, post-battle, and independent visual/security review.
- [ ] 6.5 After merge, rerun exact-main correction/next-scenario browser proof, archive authority evidence, and prune the merged branch/worktree.

## 7. Optional Simulation Promotion — PR 7

- [ ] 7.1 Keep player-authored simulation creation disabled unless a separate concrete UX scope is approved.
- [ ] 7.2 If approved, promote only by revalidating semantic commands against the current target and emitting new target events with provenance.
- [ ] 7.3 Prove simulations cannot dispatch effects, reveal hidden history, mutate authority, or bypass branch/revision validation.
- [ ] 7.4 Run focused simulation/promotion tests and independent authority/privacy review; rerun exact-main receipts and prune the merged branch/worktree.
