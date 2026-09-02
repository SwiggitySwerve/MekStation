Every PR in this change MUST stay under 1000 non-generated changed lines and 15 files, own one behavior seam, and split through an OpenSpec update before implementation if the cap cannot be met. (Cap follows wave-map rule 7; line cap raised 500 -> 1000 on 2026-08-28.)

Work-path trace: this final event-history leaf follows `add-cross-stream-effect-receipts` in `../harden-gm-two-player-campaign-sessions/event-history-wave-map.md` and activates the lineage checks explicitly deferred by replay safety.

## 0. Effect-Receipt Admission — Pre-Implementation Receipt

- [ ] 0.1 Before PR 1, verify on fetched exact main that `add-cross-stream-effect-receipts` is synced and archived, its task 10.4 and post-merge terminal evidence pass, its active ledger entry/directory are absent, and its merged branch/worktree are pruned. Record the predecessor merge SHA and fail closed on missing or contradictory evidence.
  - Gate amendment (2026-09-02, owner-directed under the finish-all-107 program directive; precedent: the 2026-08-20 per-group gate refinement #1259): NARROWED for PR 1-3 only. The original clause demands add-cross-stream-effect-receipts synced and archived, but PR 1 (branch/effective-head/supersession tables + prior-head resolver), PR 2 (candidate build + atomic activation), and PR 3 (combat rewind) consume NONE of the cross-stream machinery - they are pure branch-storage and combat-side work; the umbrella's sections 13.4/14/15/16/17/18.x/19.2-19.3 (23 boxes) are gated on exactly these three PRs. PR 4+ (campaign replacement, coordinated correction saga) DO consume effect receipts and KEEP the original gate untouched. Recorded predecessor state at amendment time: adopt-combat-event-journal-authority archived 2026-08-29 (merge base 293790e09); cross-stream 0/51 open, gated on the campaign journal cutover. This amendment is spec-only, reversible, and rides PR 1 for review.

- [ ] 0.2 Before PR 1, re-review every PR seam in this file against the then-current codebase for the 1000-line/15-file cap and one-behavior-seam rule, and re-confirm seam ownership against `../harden-gm-two-player-campaign-sessions/event-history-wave-map.md`; if any seam no longer fits or ownership has drifted, split or reassign it through a spec-only OpenSpec update before implementation, and fail closed on unresolved ownership conflicts.
  - Progress (2026-09-02): re-reviewed at implementation time. Section 1 as one seam measured 18 files / 2108 non-comment added lines against the 15-file / 1000-line cap (5 of the files are the forced trigger-catalog consumers, 33 lines), so PR 1 was split into three sequential PRs with no file straddling a seam and no back-edges: PR 1a schema + backfill (tasks 1.1/1.2; 11 files), PR 1b contract + store (typed refusals; 3 files), PR 1c resolver + expected-head (tasks 1.3/1.4; 4 files); each prefix proven independently green (tsc 0; 98 / 106 / 1763 tests). Seam ownership per event-history-wave-map.md unchanged. The box stays open until the same re-review is done for PR 2+ seams.


## 1. Genesis Branch and Prior-Head Resolver — PR 1

- [x] 1.1 Add branch, effective-head, and supersession tables with one genesis/effective branch at generation `1` per existing journal stream; preserve the linear stream's stored generation idempotently.
  - Receipt (2026-09-02, PR 1 of 3 for this section - the section was split per the 1000-line cap, see 0.2): SQLite migration 23 `event_history_branches_schema` (sidecar SQLiteService.historyBranches.migration.ts) adds three ADDITIVE tables - event_history_branches (one immutable row per branch: stream, opaque id, parent, base revision/event/digest, creator, reason, typed status), event_history_effective_heads (one row per stream naming the answering branch and its generation), event_history_supersessions (one immutable row per superseded branch binding prior to replacement generation, CHECK replacement = prior + 1) - with no foreign key into event_journal_* and the journal's branch_id='root' pin untouched (design D1). Genesis backfill: one effective branch per stream that already has journal events, root digest = sha256(canonicalizeJsonV1([])) pinned as a literal (the contract test proves it equals the derivation and the value genesisJournalAuthorityBaseline records); the generation is READ - match_authority_baseline.effective_generation when stored, else 1 - never computed from stream_revision; both statements NOT EXISTS-guarded and proven idempotent by cold reopen and by replaying the migration after deleting its ledger record. Migration-head pins in the eventJournal and campaignOutcomeInbox suites are retitled to derive from the MIGRATIONS catalog instead of the literal 22. Red-first: module-not-found on the sidecar. Mutants: (c) generation derived from stream_revision - killed by 'preserves the stored generation across repeated migration' and the backfill row; orchestrator re-ran it (2 red) plus N1 partial-index WHERE dropped (9 red) and N2 ancestry guard made cross-stream (1 red). Gates: tsc 0; oxlint 77-pin; events+persistence trees 47 suites / 863 green; openspec validate clean.

- [x] 1.2 Enforce same-stream acyclic immutable ancestry, root genesis semantics, typed monotonic statuses, and exactly one effective branch.
  - Receipt (2026-09-02, PR 1 of 3): the four rules land as CONSTRAINTS, not convention. Same-stream acyclic ancestry: ancestor_depth is 0 at the root and the event_history_branches_ancestry_guard trigger requires each child's parent to already exist IN THE SAME STREAM at exactly depth-1, so depth strictly increases along parentage; lineage columns are immutable (_immutable_lineage trigger; only status may move) and rows cannot be deleted (_no_delete), so no later write can bend an edge into a cycle. Root genesis semantics: depth 0, null parent, null base event, base revision 0 are one fact stated four ways and the CHECKs require them to agree, so a child cannot masquerade as a root. Exactly one effective branch: a PARTIAL unique index over (stream_type, stream_id) WHERE status='effective' - the load-bearing guard that binds ANY writer (the effective-heads primary key alone only says which branch is installed). Monotonic status: a rank ladder building < waiting-effects < blocked < effective < superseded an UPDATE may only climb (the precise legal transition table is the store's typed refusal in PR 2 - proven NOT redundant there: blocked->effective climbs the ladder and only the table refuses it). Worker mutants killed: (a1) depth clause dropped and (a2) immutable-lineage trigger deleted - both by 'refuses ancestry that leaves the stream, skips a generation, or closes a cycle'; (b) partial unique index deleted - by 'permits exactly one effective branch per stream'. Five exhaustive trigger-catalog suites are mechanical consumers of the six new triggers. Typed refusals over these constraints (invalid-ancestry, duplicate-effective-branch, illegal-status-transition) are PR 2's store.

- [x] 1.3 Resolve verified parent prefix plus contiguous child suffix at an explicit branch/revision and prove entity state/history at prior heads.
  - Receipt (2026-09-02, PR 1c of 3 - PR 1a schema #1495, PR 1b contract+store #1497): EventHistoryBranchResolver resolves a branch path at an explicit branch/revision as the immutable parent PREFIX through the base revision followed by the child's own contiguous SUFFIX beginning at baseRevision+1 (resolveBranchPath -> prefix/suffix segments); materializeBranchPath verifies event identity, revision contiguity, digest linkage, and event schema version on every resolved event before use and quarantines with the typed branch-integrity error otherwise (six quarantine cases tested); entity state/history at a prior head is proven with a REAL SQLiteEventJournal append driving the production journalBranchSegmentReader adapter. The resolver works over a structurally narrower IBranchEventView that every IStoredEvent satisfies, so multi-branch paths are expressible while EventBranchId stays pinned to 'root' (widening it would ripple through the zod literals and every journal consumer; production genuinely stays genesis-only). NOT claimed: projector compatibility - that is the checkpoint contract and lands with candidate verification in PR 2; stated in the module header. Red-first: module-not-found on the resolver. Worker mutant (d) drop the branchId != active -> STALE_BRANCH check - killed by three expected-head rows. Gates at the full-section tree: tsc 0; oxlint 77-pin; events+persistence 47 suites / 863 green; the section's own 161 suites / 1763.

- [x] 1.4 Add branch-aware expected-head validation and typed `STALE_BRANCH` without enabling branch creation in production.
  - Receipt (2026-09-02, PR 1c of 3): validateExpectedBranchHead (EventHistoryExpectedHead.ts) is the branch-aware expected-head validation: a command naming a branch other than the stream's active head is refused STALE_BRANCH carrying the active head and a resync action, and it appends NOTHING - proven by a before/after snapshot of branches, heads, supersessions and the journal event count around the refusal (including a superseded branch). Branch creation stays OFF in production: createBranch requires an explicit IBranchCreationSeam capability and the production seam refuses ('keeps branch creation off in production and open only through the explicit seam'); the authorized GM correction/rewind finalization that will open it is PR 3. NOT claimed: activation compare-and-swap, correction leases, generation increment, GENERATION_EXHAUSTED, the supersession WRITER, PROJECTION_REBUILDING - all PR 2+.

- [ ] 1.5 Run focused branch storage/resolver/integrity tests, typecheck/lint/format, strict OpenSpec validation, and independent lineage/security review.
  - Progress (2026-09-02): focused storage/resolver/integrity suites, typecheck/lint/format, and strict OpenSpec validation ran green on every one of the three PRs (receipts under 1.1-1.4); the independent lineage/security review half stays open until a fresh-context reviewer reads PR 1a-1c together on merged main.

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
