Every PR in this change MUST stay under 500 non-generated changed lines and 15 files, own one behavior seam, and split through an OpenSpec update before implementation if the cap cannot be met.

Work-path trace: this leaf follows `add-replay-schema-and-checkpoint-safety` and precedes the independently gated combat and campaign authority leaves in `../harden-gm-two-player-campaign-sessions/event-history-wave-map.md`.

## 0. Replay-Safety Admission Gate — Pre-Implementation Receipt

- [x] 0.1 Before PR 1, verify on fetched exact main that `add-replay-schema-and-checkpoint-safety` is synced and archived, its task 21.3 and separately recorded post-merge terminal evidence pass, its active ledger entry/directory are absent, and its merged branch/worktree are pruned. Record the predecessor merge SHA and fail closed on missing or contradictory evidence.
  - Receipt (2026-08-21, fetched exact main 8f084e4be): `add-replay-schema-and-checkpoint-safety` is synced and ARCHIVED as `openspec/changes/archive/2026-08-22-add-replay-schema-and-checkpoint-safety/` (closeout PR #1300, squash-merged SHA-guarded); its 21.3 receipt records the exact-main battery on 243a4f657 (focused sweep 1456/1456, replay + multiplayer QC gates green) and the post-merge terminal evidence was separately verified on 8f084e4be: archive directory present, active-change-ledger entry ABSENT (10 active, `validate-openspec-ci-quality` 10/10 accounted, errors=0), change directory absent from `openspec/changes/`, and zero `mekstation-rs-*` worktrees/branches remaining. Predecessor merge SHA: 8f084e4be (#1300); final implementation PR chain #1279-#1299 with the reviewed inventory amendment #1287. No missing or contradictory evidence.
- [x] 0.2 Before PR 1, re-review every PR seam in this file against the then-current codebase for the 500-line/15-file cap and one-behavior-seam rule, and re-confirm seam ownership against `../harden-gm-two-player-campaign-sessions/event-history-wave-map.md`; if any seam no longer fits or ownership has drifted, split or reassign it through a spec-only OpenSpec update before implementation, and fail closed on unresolved ownership conflicts.
  - Receipt (2026-08-21): all ten PR seams re-reviewed against main 8f084e4be. Ownership vs `../harden-gm-two-player-campaign-sessions/event-history-wave-map.md` row 3 (waves 11/12/18: membership-gated projection, action/private audit, privacy evidence) is UNCHANGED - the predecessor wave's only adjacent landings were consumer-side: replay-safety PR 19B gated the CLIENT mirror (`buildMirrorSessionGated`) and PR 18/19A gated library/recovery CONSUMPTION, while this change's seams own the SERVER production surfaces (socket attachment, baseline/replay frame publication, recipient selection, projection service, delivery epochs) - complementary, no seam absorbed or split. Cap review: each seam remains one behavior (viewer contract; admission routing; one authorization gate; one additive audit table; private storage; projection service; delivery-epoch store; live/replay adoption; historical adoption; evidence journey) and none obviously exceeds 500 lines/15 files given the current surface sizes (ServerMatchHost* modules are already decomposed; SQLite migrations follow the small per-migration module idiom at v10). Two watch-items recorded, neither a conflict today: (a) PR 8's server frame routing must compose with the PR-19B client gate (the mirror will consume projected objects - the match-broadcast host-stamp destamp contract must be preserved or explicitly superseded by projected objects); (b) PR 7's delivery-epoch schema is the named dependency of `design-campaign-authority-and-sync`'s delivery side (its tasks preamble consumes the (deliveryEpochId, deliverySequence) cursor mapping) - schema decisions there must be made with that consumer named.

## 1. Authorized Viewer Contract and Resolver — PR 1

- [x] 1.1 Add failing unit tests proving a known campaign/match ID, client role/ownership claim, or non-human principal claim cannot construct an authorized viewer without verified identity plus active durable membership.
  - Receipt (2026-08-21): failing-first negative set (red before the module existed, green after): a structurally identical client claim with known campaign/match/participant ids AND role/ownership fields fails `isAuthorizedViewer`; a bare `{principalId}` fails `isVerifiedPrincipal`; resolution with an unminted principal fails typed `unverified-identity`; a verified principal without an active durable membership (inactive row AND unknown principal - same code, no membership-existence oracle) fails typed `no-active-membership`; a service-kind membership row fails typed `non-human-principal`.
- [x] 1.2 Add the server-internal `IAuthorizedViewer` contract, membership resolver, and revision-bound cache with no transport deserializer or public constructor.
  - Receipt (2026-08-21): `src/lib/multiplayer/server/authorization/AuthorizedViewer.ts` - `IAuthorizedViewer` exactly per design D1; NO public constructor and NO transport deserializer: viewers are minted only inside the module and registered in a module-private WeakSet, so spreads, escalated copies, JSON round-trips, and client claims are not authority; `JSON.stringify(viewer)` THROWS (typed) so a viewer context cannot cross a transport boundary; `AuthorizedViewerResolver` derives every field from the durable membership row alone via the server-internal `IMembershipSource` port (durable store binding is PR 2's seam) with a revision-bound cache; `mintVerifiedPrincipal` is the server session layer's identity proof.
- [x] 1.3 Prove membership revision changes invalidate cached contexts and internal non-human jobs cannot construct, serialize, borrow, or convert into human viewer authority; keep one healthy authorized control.
  - Receipt (2026-08-21): revision-bound invalidation proven - cached resolve reuses the same context with ONE source lookup; a membership change (ownership shrink + revision bump) flips `isCurrent(old)` false and re-resolution mints a fresh context carrying the new row; revocation (active=false) removes the context entirely with the typed failure. Non-human non-convertibility: a service principal fails typed while a healthy authorized HUMAN control resolves in the same test; forged/copy objects fail `isCurrent` outright; the viewer and its ownedForceIds are frozen.
- [x] 1.4 Run focused resolver/type tests, typecheck/lint/format, strict OpenSpec validation, and independent security review.
  - Receipt (2026-08-21): focused resolver/type suite 8/8; typecheck/oxlint/format clean; strict OpenSpec green; independent fresh-context SECURITY review (Grok 4.6, attack-minded charter: forgery via prototype/proxy, serialization escapes, mint export scope + client-bundle runtime question, cache TOCTOU, membership-existence oracles) recorded in the PR description - initial verdict REJECT on a REAL blocker (the resolver minted whatever row the source returned; verified identity was only a lookup key), fixed by binding the row to the verified principal + requested session with typed `membership-source-integrity` failure and treacherous/cross-session-source tests; re-review APPROVE with both residual hardenings folded (explicit consumer contract: every PR 2/3 trust boundary MUST call `isAuthorizedViewer`, never authorize from property reads; single-snapshot row reads defeating getter-based TOCTOU). Seam cap: one behavior, 2 files, well under limits.
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
