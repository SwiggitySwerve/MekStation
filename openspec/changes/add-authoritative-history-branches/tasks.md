Every PR in this change MUST stay under 500 non-generated changed lines and 15 files, own one behavior seam, and split through an OpenSpec update before implementation if the cap cannot be met.

## 1. Genesis Branch and Prior-Head Resolver — PR 1

- [ ] 1.1 Add branch, effective-head, and supersession tables with one genesis/effective branch per existing journal stream.
- [ ] 1.2 Enforce same-stream acyclic immutable ancestry, root genesis semantics, typed monotonic statuses, and exactly one effective branch.
- [ ] 1.3 Resolve verified parent prefix plus contiguous child suffix at an explicit branch/revision and prove entity state/history at prior heads.
- [ ] 1.4 Add branch-aware expected-head validation and typed `STALE_BRANCH` without enabling branch creation in production.
- [ ] 1.5 Run focused branch storage/resolver/integrity tests, typecheck/lint/format, strict OpenSpec validation, and independent lineage/security review.
- [ ] 1.6 After merge, rerun exact-main resolver receipts and prune the merged branch/worktree.

## 2. Candidate Build and Atomic Activation — PR 2

- [ ] 2.1 Add authorized candidate creation plus a durable correction lease bound to expected branch/revision/digest/generation, actor, and reason.
- [ ] 2.2 Reject commands with `PROJECTION_REBUILDING` while the live lease rebuilds; make restart recovery/expiry explicit and never queue commands invisibly.
- [ ] 2.3 Verify replay, viewer projections, and an immutable server-derived affected-artifact manifest before activation.
- [ ] 2.4 Fence the prior effective generation; serialize the fence against lease-to-admitted promotion, stop new leases/admissions, supersede unleased pending rows, and keep the candidate waiting plus prior branch effective while an old-generation delivery is unresolved.
- [ ] 2.5 Compare the lease-bound expected head/generation, then atomically activate the candidate, increment generation, supersede the prior branch, publish invalidations, and enable candidate effects; stale or failed comparison leaves the prior branch effective.
- [ ] 2.6 Prove deterministic replay, correction-lease restart/expiry, stale activation, injected activation failure, both fence/admission serial orders, lease expiry, and receipt/reconciliation behavior.
- [ ] 2.7 After independent review and focused gates pass, merge, rerun activation/failure on exact main, and prune the branch/worktree.

## 3. Combat Rewind — PR 3

- [ ] 3.1 Keep GM combat rewind preview non-mutating and bind finalization to current branch/revision/digest/generation.
- [ ] 3.2 Rebuild combat state, RNG provenance, fog, sealed choices, viewer projections, and affected artifacts on a candidate branch before activation.
- [ ] 3.3 Prove stale-branch, rebuild-time, unauthorized-player, failed-verification, and owner-restart commands append nothing.
- [ ] 3.4 Run GM intervention, combat replay, fog, multiplayer, command-browser, viewport/accessibility, and independent visual/privacy review.
- [ ] 3.5 After merge, rerun exact-main rewind/reconnect proof and prune the merged branch/worktree.

## 4. Campaign Replacement and Artifact Invalidation — PR 4

- [ ] 4.1 Require campaign correction preview to declare every affected state and externalized artifact family.
- [ ] 4.2 Build backward-time and retroactive correction as replacement-branch replay; invalidate stale missions, force selections, outcomes, and readiness artifacts by identity and source revision.
- [ ] 4.3 Prove replacement construction, failed validation, and stale-artifact rejection without cross-stream outcome delivery or UI changes.
- [ ] 4.4 Run focused campaign time-cascade, ledger, branch, and artifact tests plus independent authority review.
- [ ] 4.5 After merge, rerun exact-main campaign replacement proof and prune the merged branch/worktree.

## 5. Coordinated Post-Receipt Correction Saga — PR 5

- [ ] 5.1 Reject combat-only rewind after the active outcome receipt and create a higher-version source correction plus replacement outbox in one source-local transaction.
- [ ] 5.2 Persist canonical command bytes/digest/schema/canonicalizer versions; recovery never regenerates them from mutable projection state.
- [ ] 5.3 Apply the target-scoped replacement receipt and deterministic campaign consequence batch in one target-local transaction; do not claim cross-store atomicity.
- [ ] 5.4 Persist pending, retrying, blocked, and applied saga states and keep scenario progression gated until the active target receipt and projections converge.
- [ ] 5.5 Prove retry, lost acknowledgement, source/target restart, unsupported stored version, target-scope mismatch, activation-fence versus delivery-admission race, and blocked recovery apply replacement consequences once.
- [ ] 5.6 Run focused cross-stream receipt/correction tests and independent durability/security review.
- [ ] 5.7 After merge, rerun exact-main coordinated correction proof and prune the merged branch/worktree.

## 6. Branch Timeline and Recovery UX — PR 6

- [ ] 6.1 Add authorization-filtered branch/supersession/impact timeline and effect-free, cursor-neutral prior-head inspection.
- [ ] 6.2 Add desktop/narrow accessible status, impact confirmation, rebuild progress, correction-saga state, failure focus, and recovery feedback.
- [ ] 6.3 Prove player views expose no GM-private reasons, hidden facts, authority gaps, or inaccessible branch identifiers.
- [ ] 6.4 Run deep audit, viewport sweep, replay/export parity, campaign-long, post-battle, and independent visual/security review.
- [ ] 6.5 After merge, rerun exact-main correction/next-scenario browser proof, archive authority evidence, and prune the merged branch/worktree.

## 7. Optional Simulation Promotion — Deferred

- [ ] 7.1 Keep player-authored simulation creation disabled; enabling it requires a separate approved UX change.
- [ ] 7.2 A future change may promote only by revalidating semantic commands against the current target and emitting new target events with provenance.
- [ ] 7.3 A future change MUST prove simulations cannot dispatch effects, reveal hidden history, mutate authority, or bypass branch/revision validation.
