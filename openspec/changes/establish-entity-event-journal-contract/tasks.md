## 1. Behavior Locks and Contract Types — PR 1

- [ ] 1.1 Add focused regression tests that demonstrate the current gap-accepting, partial-batch, duplicate-command, and cross-entity-history failures without changing production behavior.
- [ ] 1.2 Add `IStoredEvent`, `IEntityEventRef`, append/read inputs, receipts, and typed conflict results in a neutral event-journal module; preserve existing combat and campaign payload unions.
- [ ] 1.3 Add Zod runtime schemas for envelope metadata and entity-link roles, rejecting missing durable IDs, invalid versions, and caller-assigned final revisions.
- [ ] 1.4 Run focused TypeScript/LSP, schema, and behavior-lock tests; keep the PR under 500 non-generated changed lines and 15 files.
- [ ] 1.5 After merge, update an exact-main worktree, rerun the focused receipt, record the merge SHA, then prune the merged branch/worktree before PR 2.

## 2. Adapter Conformance — PR 2

- [ ] 2.1 Define one adapter conformance suite for atomic expected-revision append, contiguous revisions, command idempotency/collision, entity history, rollback, and restart.
- [ ] 2.2 Implement the smallest in-memory reference adapter needed to run the conformance suite; do not make it production authority.
- [ ] 2.3 Prove unrelated streams advance independently and commit position does not become a global expected head.
- [ ] 2.4 Run the conformance suite, typecheck, lint, format check, and `git diff --check`; independently review the contract and test soundness.
- [ ] 2.5 After merge, rerun conformance on exact main and prune the merged branch/worktree before PR 3.

## 3. SQLite Journal Adapter — PR 3

- [ ] 3.1 Add additive SQLite tables/indexes for stream heads, event batches, events, entity links, and command receipts using the repository migration pattern.
- [ ] 3.2 Implement the SQLite adapter transaction so head verification, receipt, contiguous events, links, commit positions, and head advancement succeed or roll back together.
- [ ] 3.3 Run the shared conformance suite against a real temporary SQLite file, including process restart and injected mid-transaction failure.
- [ ] 3.4 Add explicit imported-baseline support and prove migration never fabricates unrecorded domain history.
- [ ] 3.5 Run focused tests, Node 22 typecheck/lint/format, strict OpenSpec validation, and independent code/security/history review.
- [ ] 3.6 After merge, rerun SQLite conformance on exact main, archive authority rows/read-only proof, and prune the merged branch/worktree.
