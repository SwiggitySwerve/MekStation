Every PR in this change MUST stay under 500 non-generated changed lines and 15 files, own one behavior seam, and split through an OpenSpec update before implementation if the cap cannot be met.

Work-path trace: this final event-history leaf follows `add-cross-stream-effect-receipts` in `../harden-gm-two-player-campaign-sessions/event-history-wave-map.md` and activates the lineage checks explicitly deferred by replay safety.

## 0. Effect-Receipt Admission — Pre-Implementation Receipt

- [ ] 0.1 Before PR 1, verify on fetched exact main that `add-cross-stream-effect-receipts` is synced and archived, its task 10.4 and post-merge terminal evidence pass, its active ledger entry/directory are absent, and its merged branch/worktree are pruned. Record the predecessor merge SHA and fail closed on missing or contradictory evidence.
- [ ] 0.2 Before PR 1, re-review every PR seam in this file against the then-current codebase for the 500-line/15-file cap and one-behavior-seam rule, and re-confirm seam ownership against `../harden-gm-two-player-campaign-sessions/event-history-wave-map.md`; if any seam no longer fits or ownership has drifted, split or reassign it through a spec-only OpenSpec update before implementation, and fail closed on unresolved ownership conflicts.

## 1. Genesis Branch and Prior-Head Resolver — PR 1

- [ ] 1.1 Add branch, effective-head, and supersession tables with one genesis/effective branch at generation `1` per existing journal stream; preserve the linear stream's stored generation idempotently.
- [ ] 1.2 Enforce same-stream acyclic immutable ancestry, root genesis semantics, typed monotonic statuses, and exactly one effective branch.
- [ ] 1.3 Resolve verified parent prefix plus contiguous child suffix at an explicit branch/revision and prove entity state/history at prior heads.
- [ ] 1.4 Add branch-aware expected-head validation and typed `STALE_BRANCH` without enabling branch creation in production.
- [ ] 1.5 Run focused branch storage/resolver/integrity tests, typecheck/lint/format, strict OpenSpec validation, and independent lineage/security review.
- [ ] 1.6 After merge, rerun exact-main resolver receipts and prune the merged branch/worktree.

## 2. Candidate Build and Atomic Activation — PR 2

- [ ] 2.1 Add authorized candidate creation plus a durable correction lease with opaque ID, owner, expiry, monotonically increasing fencing epoch, expected branch/revision/digest/generation, actor, and reason.
- [ ] 2.2 Reject commands with `PROJECTION_REBUILDING` while the live lease rebuilds; make restart recovery/expiry explicit and never queue commands invisibly.
- [ ] 2.3 Verify replay, viewer projections, and an immutable server-derived affected-artifact manifest before activation.
- [ ] 2.4 Fence the prior effective generation; serialize the fence against lease-to-admitted promotion, stop new leases/admissions, supersede unleased pending rows, and keep the candidate waiting plus prior branch effective while an old-generation delivery has an unknown target result.
- [ ] 2.5 Lock and verify the current unexpired correction lease ID, owner, and epoch with the expected-head comparison. If a prior receipt was accepted, atomically create the higher-version replacement outbox and pending saga while activating the candidate, incrementing generation by exactly one, superseding the prior branch, and publishing invalidations; otherwise activate without correction. Never wait for a pre-activation replacement receipt.
- [ ] 2.6 Prove deterministic replay, correction-lease restart/expiry/takeover, stale-owner activation rejection with an unchanged head, stale-head activation, safe-integer generation exhaustion before mutation, injected activation failure, both fence/admission serial orders, accepted-prior-receipt activation, and target outage/restart at each saga boundary.
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

- [ ] 5.1 Reject combat-only rewind after the active outcome receipt and create the new effective branch, higher-version source correction, replacement outbox, and pending saga in one source activation transaction.
- [ ] 5.2 Persist canonical command bytes/digest/schema/canonicalizer versions; recovery never regenerates them from mutable projection state.
- [ ] 5.3 Apply the target-scoped replacement receipt and deterministic campaign consequence batch in one target-local transaction; do not claim cross-store atomicity.
- [ ] 5.4 Persist pending, retrying, blocked, and applied saga states and keep scenario progression gated until the active target receipt and projections converge.
- [ ] 5.5 Prove accepted prior receipt → source activation → replacement dispatch → target receipt → applied saga, plus retry, lost acknowledgement, source/target restart at every boundary, unsupported stored version, target-scope mismatch, activation-fence versus delivery-admission race, and blocked recovery apply replacement consequences once.
- [ ] 5.6 Run focused cross-stream receipt/correction tests and independent durability/security review.
- [ ] 5.7 After merge, rerun exact-main coordinated correction proof and prune the merged branch/worktree.

## 6. Branch Timeline and Recovery UX — PR 6

- [ ] 6.1 Add authorization-filtered branch/supersession/impact timeline and effect-free, cursor-neutral prior-head inspection.
- [ ] 6.2 Add desktop/narrow accessible status, impact confirmation, rebuild progress, correction-saga state, failure focus, and recovery feedback.
- [ ] 6.3 Prove player views expose no GM-private reasons, hidden facts, authority gaps, or inaccessible branch identifiers.
- [ ] 6.4 Run deep audit, viewport sweep, replay/export parity, campaign-long, post-battle, and independent visual/security review.
- [ ] 6.5 After merge, rerun exact-main correction/next-scenario browser proof, archive authority evidence, and prune the merged branch/worktree.

## 7. Branch/Generation Rollback Compatibility — PR 7

- [ ] 7.1 Add a branch/generation-aware rollback reader compatible with the persisted journal schema, upcasters, canonicalizer, and effective-head contract.
- [ ] 7.2 Preserve the exact effective branch/revision/digest/generation plus fences, outbox/admission/receipt, saga, candidate, and supersession rows across rollback and cold restart.
- [ ] 7.3 If compatibility is unavailable, stop command/effect/correction admission and expose a typed blocked state; never substitute root, prior/superseded history, or generation `1`.
- [ ] 7.4 Prove rollback from generation greater than one, non-effective candidate retention, incompatible-reader blocking, and exact-head/generation restart without new admission.
- [ ] 7.5 Run focused rollback/restart/integrity tests and independent durability/security review.
- [ ] 7.6 After merge, rerun exact-main rollback receipts and prune the merged branch/worktree.

## 8. Optional Simulation Promotion — Deferred

- [ ] 8.1 Keep player-authored simulation creation disabled; enabling it requires a separate approved UX change.
- [ ] 8.2 A future change may promote only by revalidating semantic commands against the current target and emitting new target events with provenance.
- [ ] 8.3 A future change MUST prove simulations cannot dispatch effects, reveal hidden history, mutate authority, or bypass branch/revision validation.
