Every PR in this change MUST stay under 500 non-generated changed lines and 15 files, own one behavior seam, and split through an OpenSpec update before implementation if the cap cannot be met.

## 1. Atomic Match Store Contract — PR 1

- [ ] 1.1 Add failing `IMatchStore`/`DurableMatchStore` tests for multi-event atomicity, no-gap revisions, event identity, command retry, and restart.
- [ ] 1.2 Adapt the match store to the journal batch API while preserving current match metadata and legacy completed-log reads.
- [ ] 1.3 Import retained legacy events with source identities and explicit baseline metadata for any missing prefix.
- [ ] 1.4 Run focused durable-store tests on Node 22, typecheck/lint/format, strict OpenSpec validation, and independent durability/security review.
- [ ] 1.5 After merge, rerun the real SQLite receipt on exact main and prune the merged branch/worktree.

## 2. Decide, Commit, Apply, Publish — PR 2

- [ ] 2.1 Lock existing command-to-`IGameEvent` and post-state digests before refactoring the engine/host boundary.
- [ ] 2.2 Add the smallest decision seam that produces an ordered event batch without advancing the authoritative live engine.
- [ ] 2.3 Change `ServerMatchHost` to append at the expected revision before applying the committed batch or publishing projections.
- [ ] 2.4 Inject revision conflict and persistence failure; prove no live-engine advance, no success frame, and a typed recovery result.
- [ ] 2.5 Run focused engine/host/store suites plus multiplayer contracts; independently review authority ordering and scope.
- [ ] 2.6 After merge, rerun exact-main command/restart authority proof and prune the merged branch/worktree.

## 3. Recovery and Client Mirror — PR 3

- [ ] 3.1 Resume combat replay/live delivery from durable committed history and acknowledge only successfully applied contiguous projected events.
- [ ] 3.2 Preserve IndexedDB as a browser recovery mirror; detect truncated/replaced immutable prefixes and request authoritative resync.
- [ ] 3.3 Add cold reload, process restart, replay/live overlap, duplicate delivery, and legal post-recovery command coverage.
- [ ] 3.4 Run `verify:qc:multiplayer:browser`, `verify:qc:replay-recovery`, `qc:command:browser:quick`, and independent browser/security review with store-backed evidence.
- [ ] 3.5 After merge, rerun the combat journey on exact main, archive journal/IndexedDB/reload proof, and prune the merged branch/worktree.

## 4. Shadow Cutover — PR 4

- [ ] 4.1 Add a reviewed feature flag for new match journal authority and shadow state/event digest comparison without dual-authoring.
- [ ] 4.2 Enable journal authority only for new controlled matches after shadow equality and the active-membership, server-derived-viewer, action-audit, private-record, and pre-serialization privacy gates pass; preserve schema-compatible legacy reads.
- [ ] 4.3 Document rollback that stops new admission and never deletes committed rows.
- [ ] 4.4 Run applicable combat, multiplayer, replay, command-browser, and long-browser gates plus final independent visual/authority review.
- [ ] 4.5 After merge, run the exact-main regression suite, record the merge SHA and evidence, and prune the merged branch/worktree before campaign adoption.
