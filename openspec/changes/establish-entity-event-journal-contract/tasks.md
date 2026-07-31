Every PR in this change MUST stay under 500 non-generated changed lines and 15 files, own one behavior seam, and split through an OpenSpec update before implementation if the cap cannot be met.

## 1. Journal Contract Types — PR 1

- [ ] 1.1 Add `IStoredEvent`, `IEntityEventRef`, append/read inputs, atomic-batch receipts, fixed-root branch identity, versioned canonical-digest metadata, store-local high-water/read-through cursor types, and typed conflict results in a neutral event-journal module; preserve existing combat and campaign payload unions.
- [ ] 1.2 Define stored principal provenance with `human|system|migration` actor kind plus the server authority that accepted the command. Prove client DTOs cannot assign stored actor/authority identity, final stream revisions, commit positions, recorded timestamps, receipts, or digests.
- [ ] 1.3 Add Zod schemas and focused compile/runtime boundary tests that reject missing durable IDs, invalid versions, non-root branches, caller-assigned stored fields, ambiguous actor/authority provenance, negative/unsafe/reversed catch-up cursors, and non-integer page limits outside 1 through 500 without implementing an adapter or canonicalizer.
- [ ] 1.4 Run focused TypeScript/LSP and schema tests plus `git diff --check`; independently review the public contract and keep the PR under 500 non-generated changed lines and 15 files.
- [ ] 1.5 After merge, update an exact-main worktree, rerun the focused contract receipt, record the merge SHA, then prune the merged branch/worktree before PR 2.

## 2. Canonicalizer v1 — PR 2

- [ ] 2.1 Implement the smallest RFC 8785 canonicalizer-v1 boundary needed to produce UTF-8 digest material and lowercase SHA-256 for the versioned journal envelope; add no new runtime dependency unless a separate reviewed dependency decision supersedes this task.
- [ ] 2.2 Publish fixed byte/digest fixtures covering shuffled object keys, sorted entity-reference and causation sets, preserved payload-array order, Unicode without normalization, finite ECMAScript numbers, exact included/excluded fields, and rejection of unsupported or non-finite values.
- [ ] 2.3 Prove identical semantic input yields identical bytes and digest across repeated processes, while every included-field mutation changes the digest and excluded storage-only fields do not.
- [ ] 2.4 Run focused canonicalizer tests, typecheck/lint/format, strict OpenSpec validation, and independent integrity review.
- [ ] 2.5 After merge, rerun the published fixtures on exact main and prune the merged branch/worktree before PR 3.

## 3. Adapter Conformance — PR 3

- [ ] 3.1 Define one adapter conformance suite for atomic expected-head append, contiguous per-branch revisions, published canonical bytes/digests, command idempotency/collision, entity history, rollback, restart, and bounded catch-up through a captured store-local high-water cursor.
- [ ] 3.2 Implement the smallest in-memory reference adapter needed to run the conformance suite; do not make it production authority.
- [ ] 3.3 Prove stream-revision-gap acceptance, partial-batch commit, changed-content command-identity reuse, missing/duplicated entity-history results, and invalid catch-up bounds fail the contract; prove an identical command retry returns its receipt, an interrupted observation allocation may leave a numeric gap, unrelated streams validate independent expected heads, every non-exhausted page advances to a returned position, and a captured high-water can never skip an in-flight lower position or include a later commit beyond its boundary.
- [ ] 3.4 Run the conformance suite, typecheck, lint, format check, and `git diff --check`; independently review the contract and test soundness.
- [ ] 3.5 After merge, rerun conformance on exact main and prune the merged branch/worktree before PR 4.

## 4. SQLite Journal Adapter — PR 4

- [ ] 4.1 Add additive SQLite tables/indexes for fixed root-branch heads, event batches, events, entity links, command receipts, canonicalizer version, predecessor/event digests, and the store-local observation cursor using the repository migration pattern.
- [ ] 4.2 Implement the SQLite adapter transaction so expected branch/revision/digest verification, receipt, contiguous stream events, links, observation positions, integrity chain, and head advancement succeed or roll back together.
- [ ] 4.3 Run the shared conformance suite against a real temporary SQLite file, including process restart and injected mid-transaction failure.
- [ ] 4.4 Add explicit imported-baseline support and prove migration never fabricates unrecorded domain history.
- [ ] 4.5 Run focused tests, Node 22 typecheck/lint/format, strict OpenSpec validation, and independent code/security/history review.
- [ ] 4.6 After merge, rerun SQLite conformance on exact main, archive authority rows/read-only proof, and prune the merged branch/worktree.
