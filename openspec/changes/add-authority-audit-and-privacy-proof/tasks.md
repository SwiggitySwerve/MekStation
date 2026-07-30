Every PR in this change MUST stay under 500 non-generated changed lines and 15 files, own one behavior seam, and split through an OpenSpec update before implementation if the cap cannot be met.

## 1. Membership and Viewer Context — PR 1

- [ ] 1.1 Add failing admission tests proving a known match/campaign ID cannot attach, replay, read history, send human commands, or receive publication before durable active-membership resolution.
- [ ] 1.2 Add the smallest server-derived authorized-viewer context and route socket attachment plus human command/history entrypoints through it; ignore client authority/role/ownership claims.
- [ ] 1.3 Add a distinct non-serializable system-effect principal bound to one committed admitted outbox effect, source generation, delivery-admission token, target campaign, and binding revision, with no viewer/private/history/other-command rights; a lease alone grants none.
- [ ] 1.4 Add revocation and membership-revision cache invalidation tests plus worker retry after human revocation, leased-but-not-admitted and cross-effect/target misuse, and a healthy authorized control.
- [ ] 1.5 Run focused auth/admission tests, typecheck/lint/format, strict OpenSpec validation, and independent security review; keep the PR under 500 non-generated changed lines and 15 files.
- [ ] 1.6 After merge, rerun exact-main admission/privacy receipts and prune the merged branch/worktree.

## 2. Action Audit and Private Record Lifecycle — PR 2

- [ ] 2.1 Add separate additive action-audit, private-record, private-access-audit, and retention-state tables plus server-internal repositories.
- [ ] 2.2 Record accepted, rejected, vetoed, timed-out, and published lifecycle provenance idempotently; prove terminal failures create no gameplay event, outbox, projection mutation, or player delivery-sequence entry.
- [ ] 2.3 Keep private payload content out of player-safe rows/digests and add current-membership authorization, export-deny default, configured retention, and audited erasure/redaction tests.
- [ ] 2.4 Run real-SQLite restart/idempotency/privacy tests and independent security/history review.
- [ ] 2.5 After merge, rerun exact-main lifecycle/retention receipts and prune the merged branch/worktree.

## 3. Pre-Serialization Projection Boundary — PR 3

- [ ] 3.1 Add an application history/projection service that requires an authorized-viewer context; prohibit transport, replay UI, snapshot, timeline, and export modules from serializing raw journal/private rows.
- [ ] 3.2 Assign gapless per-viewer delivery identities after authorization and prove hidden authority events reveal neither payload nor sequence gap.
- [ ] 3.3 Add projection-object, raw-frame, snapshot, history, timeline, and export parity tests with projection failure closed.
- [ ] 3.4 Run focused multiplayer/replay/privacy contracts and independent code/security review.
- [ ] 3.5 After merge, rerun exact-main projection parity and prune the merged branch/worktree.

## 4. Three-Context Privacy Evidence — PR 4

- [ ] 4.1 Add one isolated GM/Player 1/Player 2 browser journey covering live action, rejection, reconnect, replay, history, timeline, and export.
- [ ] 4.2 Inspect pre-serialization objects, raw frames, snapshots, browser history/storage, exported bytes, and DOM with positive authorized controls and negative private-data searches.
- [ ] 4.3 Run applicable GM sandbox, replay/recovery, deep-audit, viewport/accessibility, and long-browser gates plus independent visual/security review.
- [ ] 4.4 After merge, rerun exact-main evidence, record authority/store/reload proof, and prune the merged branch/worktree before any combat or campaign journal cutover.
