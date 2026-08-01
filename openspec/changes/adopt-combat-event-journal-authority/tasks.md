Every PR in this change MUST stay under 500 non-generated changed lines and 15 files, own one behavior seam, and split through an OpenSpec update before implementation if the cap cannot be met.

Work-path trace: this leaf follows `add-authority-audit-and-privacy-proof`, may proceed independently of campaign adoption, and must finish before `add-cross-stream-effect-receipts` in `../harden-gm-two-player-campaign-sessions/event-history-wave-map.md`.

## 0. Privacy-Gate Admission — Pre-Implementation Receipt

- [ ] 0.1 Before PR 1, verify on fetched exact main that `add-authority-audit-and-privacy-proof` is synced and archived, its task 10.4 and post-merge terminal evidence pass, its active ledger entry/directory are absent, and its merged branch/worktree are pruned. Record the predecessor merge SHA and fail closed on missing or contradictory evidence.

## 1. Atomic Match Store Contract — PR 1

- [ ] 1.1 Add failing `IMatchStore`/`DurableMatchStore` tests for multi-event atomicity, no-gap revisions, event identity, command retry, and restart.
- [ ] 1.2 Adapt the match store to the journal batch API while preserving current match metadata and legacy completed-log reads.
- [ ] 1.3 Import retained legacy events with source identities and explicit baseline metadata for any missing prefix; persist an immutable baseline tuple containing stream/branch/revision/digest/effective-generation identity.
- [ ] 1.4 Run focused durable-store tests on Node 22, typecheck/lint/format, strict OpenSpec validation, and independent durability/security review.
- [ ] 1.5 After merge, rerun the real SQLite receipt on exact main and prune the merged branch/worktree.

## 2. Decide, Commit, Apply, Publish — PR 2

- [ ] 2.1 Lock existing command-to-`IGameEvent` and post-state digests before refactoring the engine/host boundary.
- [ ] 2.2 Add the smallest decision seam that produces an ordered event batch without advancing the authoritative live engine.
- [ ] 2.3 Change `ServerMatchHost` to append the batch and expected post-state digest at the expected revision; the first journal-authority batch transaction also writes the immutable one-time started fact containing command ID, event range, and resulting head tuple. Apply only the committed batch, verify its digest, and only then publish projections.
- [ ] 2.4 Inject revision conflict, persistence failure, and post-apply digest divergence; prove no premature success frame, quarantine plus deterministic journal rebuild on divergence, and a typed recovery result without deleting the commit.
- [ ] 2.5 Run focused engine/host/store suites plus multiplayer contracts; independently review authority ordering and scope.
- [ ] 2.6 After merge, rerun exact-main command/restart authority proof and prune the merged branch/worktree.

## 3. Recovery and Client Mirror — PR 3

- [ ] 3.1 Resume combat replay/live delivery from durable committed history and acknowledge only successfully applied contiguous projected events through the privacy-owned `(deliveryEpochId, deliverySequence)` mapping; do not mint a combat-specific epoch, sequence allocator, or raw-journal cursor.
- [ ] 3.2 Preserve IndexedDB as a browser recovery mirror; detect truncated/replaced immutable prefixes and request authoritative resync.
- [ ] 3.3 Add cold reload, process restart, replay/live overlap, duplicate delivery, and legal post-recovery command coverage.
- [ ] 3.4 Run `verify:qc:multiplayer:browser`, `verify:qc:replay-recovery`, `qc:command:browser:quick`, and independent browser/security review with store-backed evidence.
- [ ] 3.5 After merge, rerun the combat journey on exact main, archive journal/IndexedDB/reload proof, and prune the merged branch/worktree.

## 4. Shadow Cutover — PR 4

- [ ] 4.1 Add a reviewed feature flag for new match journal authority and shadow state/event digest comparison without dual-authoring.
- [ ] 4.2 Enable journal authority only for new controlled matches after shadow equality and the active-membership, server-derived-viewer, action-audit, private-record, and pre-serialization privacy gates pass; preserve schema-compatible legacy reads.
- [ ] 4.3 Implement rollback selection from the durable cutover marker: allow the compatible legacy reader only before the first journal-authored command, otherwise require a journal/upcaster/effective-generation-compatible reader or typed blocked state while preserving rows, receipts, head, generation, and recovery state.
- [ ] 4.4 Prove pre-cutover legacy reopen, exact-tuple baseline-only cutover rollback, crash/reopen immediately after the first batch transaction, post-command compatible rollback, and post-command incompatible rollback without silent snapshot/log substitution or new command/effect admission.
- [ ] 4.5 Run applicable combat, multiplayer, replay, command-browser, and long-browser gates plus final independent visual/authority review.
- [ ] 4.6 After merge, run the exact-main regression suite, record the merge SHA and evidence, and prune the merged branch/worktree before combat closeout or cross-stream effects; campaign adoption remains independently gated.
