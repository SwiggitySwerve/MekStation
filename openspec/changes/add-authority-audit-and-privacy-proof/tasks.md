Every PR in this change MUST stay under 500 non-generated changed lines and 15 files, own one behavior seam, and split through an OpenSpec update before implementation if the cap cannot be met.

Work-path trace: this leaf follows `add-replay-schema-and-checkpoint-safety` and precedes the independently gated combat and campaign authority leaves in `../harden-gm-two-player-campaign-sessions/event-history-wave-map.md`.

## 0. Replay-Safety Admission Gate — Pre-Implementation Receipt

- [ ] 0.1 Before PR 1, verify on fetched exact main that `add-replay-schema-and-checkpoint-safety` is synced and archived, its task 21.3 and separately recorded post-merge terminal evidence pass, its active ledger entry/directory are absent, and its merged branch/worktree are pruned. Record the predecessor merge SHA and fail closed on missing or contradictory evidence.
- [ ] 0.2 Before PR 1, re-review every PR seam in this file against the then-current codebase for the 500-line/15-file cap and one-behavior-seam rule, and re-confirm seam ownership against `../harden-gm-two-player-campaign-sessions/event-history-wave-map.md`; if any seam no longer fits or ownership has drifted, split or reassign it through a spec-only OpenSpec update before implementation, and fail closed on unresolved ownership conflicts.

## 1. Authorized Viewer Contract and Resolver — PR 1

- [ ] 1.1 Add failing unit tests proving a known campaign/match ID, client role/ownership claim, or non-human principal claim cannot construct an authorized viewer without verified identity plus active durable membership.
- [ ] 1.2 Add the server-internal `IAuthorizedViewer` contract, membership resolver, and revision-bound cache with no transport deserializer or public constructor.
- [ ] 1.3 Prove membership revision changes invalidate cached contexts and internal non-human jobs cannot construct, serialize, borrow, or convert into human viewer authority; keep one healthy authorized control.
- [ ] 1.4 Run focused resolver/type tests, typecheck/lint/format, strict OpenSpec validation, and independent security review.
- [ ] 1.5 After merge, rerun exact-main resolver receipts and prune the merged branch/worktree.

## 2. Socket, Replay, and Publication Admission — PR 2

- [ ] 2.1 Add failing admission tests proving attachment, baseline, replay, reconnect, and publication send no protected payload before the resolver returns an active viewer.
- [ ] 2.2 Route socket attachment, baseline/replay recovery, and publication recipient selection through the authorized-viewer resolver; ignore client authority/role/ownership fields.
- [ ] 2.3 Prove revocation closes subsequent publication/reconnect access and non-human capabilities cannot attach or receive replay, with a healthy authorized reconnect control.
- [ ] 2.4 Run focused multiplayer/recovery tests and independent admission/security review.
- [ ] 2.5 After merge, rerun exact-main attachment/replay receipts and prune the merged branch/worktree.

## 3. Human Command and Read Authorization — PR 3

- [ ] 3.1 Add failing tests for command, raw/history read, branch operation, timeline, export, and private-audit entrypoints without a current authorized viewer.
- [ ] 3.2 Add one application authorization gate that rechecks viewer membership and requested entity/stream scope before those entrypoints reach authority or storage services.
- [ ] 3.3 Prove client scope escalation and non-human capabilities fail closed with no gameplay mutation or disclosure, while authorized GM/player controls remain healthy.
- [ ] 3.4 Run focused command/history authorization tests and independent code/security review.
- [ ] 3.5 After merge, rerun exact-main command/read receipts and prune the merged branch/worktree.

## 4. Action Audit Lifecycle — PR 4

- [ ] 4.1 Add the additive action-audit table and server-internal repository with command identity/digest, server-derived actor/authority, lifecycle, safe reason, correlation, timestamps, and published receipt identity.
- [ ] 4.2 Record accepted, rejected, vetoed, timed-out, and published lifecycle provenance idempotently; prove terminal failures create no gameplay event, outbox, projection mutation, or player delivery identity.
- [ ] 4.3 Run real-SQLite restart/idempotency tests and independent history review.
- [ ] 4.4 After merge, rerun exact-main lifecycle receipts and prune the merged branch/worktree.

## 5. Private Record Storage and Retention — PR 5

- [ ] 5.1 Add separate private-record, private-access-audit, and retention-state tables plus server-internal repositories.
- [ ] 5.2 Keep private payload content out of player-safe rows/digests and require current membership/role for every private lookup.
- [ ] 5.3 Add export-deny default, configured retention, audited access, and erasure/redaction tests that preserve only the player-safe fact and unavailable-detail marker.
- [ ] 5.4 Run real-SQLite restart/privacy tests and independent security/history review.
- [ ] 5.5 After merge, rerun exact-main private-lifecycle receipts and prune the merged branch/worktree.

## 6. Viewer Projection Service — PR 6

- [ ] 6.1 Add an application projection service that requires an authorized viewer, authorizes the requested entity/stream, and returns only versioned viewer-safe projection objects.
- [ ] 6.2 Prohibit raw journal/private rows from crossing the service boundary and prove membership, audience, or projection failure yields a typed failure with no raw fallback.
- [ ] 6.3 Run focused projection-object/privacy tests and independent code/security review.
- [ ] 6.4 After merge, rerun exact-main projection-service receipts and prune the merged branch/worktree.

## 7. Durable Viewer Delivery Epochs — PR 7

- [ ] 7.1 Add the delivery-epoch and event-mapping schema keyed by principal, campaign session, participant, membership revision, stream type/ID, projector version, and effective generation, with unique epoch/event and epoch/sequence constraints.
- [ ] 7.2 Derive and compare the complete epoch key on every cursor request; reject cross-principal/session/participant/stream or stale revision/version/generation cursors without revealing epoch existence.
- [ ] 7.3 Atomically allocate a gapless sequence only after successful visible projection; prove hidden/failed events assign nothing and concurrent reconnect/retry/replay returns one mapping without duplicates or reserved gaps.
- [ ] 7.4 Prove cold reopen, pagination, same-epoch replay stability, explicit new baselines, and typed stale-epoch rejection with real SQLite.
- [ ] 7.5 Run focused delivery-store/privacy tests and independent concurrency/security review.
- [ ] 7.6 After merge, rerun exact-main delivery-epoch receipts and prune the merged branch/worktree.

## 8. Live, Replay, and Snapshot Projection Adoption — PR 8

- [ ] 8.1 Route live publication, replay/recovery frames, and snapshots through the projection service plus delivery-epoch boundary.
- [ ] 8.2 Add projected-object and raw-frame parity tests with hidden-gap, projection-failure, reconnect, and stale-cursor cases.
- [ ] 8.3 Run focused multiplayer/replay/recovery contracts and independent code/security review.
- [ ] 8.4 After merge, rerun exact-main live/replay/snapshot parity and prune the merged branch/worktree.

## 9. History, Timeline, and Export Projection Adoption — PR 9

- [ ] 9.1 Route history, timeline, and export serialization through the projection service and enforce private-export denial by default.
- [ ] 9.2 Add history/timeline/export byte parity tests with cross-entity authorization, hidden-gap, projection-failure, and stale-cursor cases.
- [ ] 9.3 Run focused history/timeline/export privacy contracts and independent code/security review.
- [ ] 9.4 After merge, rerun exact-main historical-surface parity and prune the merged branch/worktree.

## 10. Three-Context Privacy Evidence — PR 10

- [ ] 10.1 Add one isolated GM/Player 1/Player 2 browser journey covering live action, rejection, reconnect, replay, history, timeline, and export.
- [ ] 10.2 Inspect pre-serialization objects, raw frames, snapshots, browser history/storage, exported bytes, and DOM with positive authorized controls and negative private-data searches.
- [ ] 10.3 Run applicable GM sandbox, replay/recovery, deep-audit, viewport/accessibility, and long-browser gates plus independent visual/security review.
- [ ] 10.4 After merge, rerun exact-main evidence, record authority/store/reload proof, and prune the merged branch/worktree before any combat or campaign journal cutover.
