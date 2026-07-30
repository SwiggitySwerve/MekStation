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

## 4. Campaign Correction and Outcome Boundary — PR 4

- [ ] 4.1 Require campaign correction preview to declare every affected state and externalized artifact family.
- [ ] 4.2 Build backward-time and retroactive correction as replacement-branch replay; invalidate stale missions, force selections, outcomes, and readiness artifacts explicitly.
- [ ] 4.3 Reject combat-only rewind after the active outcome receipt and route accepted requests through higher-version coordinated correction across both streams.
- [ ] 4.4 Prove retry/restart applies coordinated replacement consequences once and preserves prior branches/receipts.
- [ ] 4.5 Run GM time-cascade, campaign ledger, campaign-long, post-battle, and independent authority review; merge only with exact store-backed evidence.
- [ ] 4.6 After merge, rerun exact-main correction/next-scenario proof and prune the merged branch/worktree.

## 5. Branch Timeline and Optional Simulations — PR 5

- [ ] 5.1 Add authorization-filtered branch/supersession/impact timeline and explicit prior-head inspection.
- [ ] 5.2 Add desktop/narrow accessible status, impact confirmation, rebuild progress, failure focus, and recovery feedback.
- [ ] 5.3 If a concrete simulation workflow is approved, promote only by revalidating semantic commands against the current target; otherwise keep simulation creation disabled.
- [ ] 5.4 Prove player views expose no GM-private reasons, hidden facts, authority gaps, or inaccessible branch identifiers.
- [ ] 5.5 Run deep audit, viewport sweep, replay/export parity, independent visual/security review, and exact-main regression; record final evidence and prune the merged branch/worktree.
