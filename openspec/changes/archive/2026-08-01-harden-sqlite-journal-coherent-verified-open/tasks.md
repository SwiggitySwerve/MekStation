## 1. Coherent Verified-Open Implementation — PR 1

- [x] 1.1 In `SQLiteEventJournalRecovery.ts`, reject a borrowed handle that already has an active transaction without committing or rolling back caller-owned state.
- [x] 1.2 Replace promise-returning recovery reads with private synchronous snapshot helpers and run quick/FK checks, high-water/position accounting, full hydrated event scans, stream-chain/head checks, and receipt/command-identity checks inside one `db.transaction(...).deferred()` callback with no promise or `await`.
- [x] 1.3 Preserve `SQLiteEventJournalRecoveryError` fail-closed behavior, borrowed-handle initialization/migration/checkpoint/close ownership, the public journal interface, existing schema, and the no-production-wiring boundary.
- [x] 1.4 Keep the implementation PR below 500 non-generated changed lines and 15 files; do not combine replay, checkpoint, privacy, combat, campaign, or imported-baseline work.

## 2. Two-Connection and Recovery Proof — PR 1

- [x] 2.1 Extend the real-file harness/tests with separate reader and writer connections to the same WAL database and deterministically commit a complete batch immediately after the reader's snapshot is pinned, without adding a production timing hook.
- [x] 2.2 Prove the in-flight open accepts one complete pre-commit snapshot, a fresh open sees the complete post-commit state, and no hybrid high-water/event/head/receipt view is accepted or falsely rejected.
- [x] 2.3 Preserve the corruption matrix and prove factory-owned success/failure leaves no active transaction or reader lock; prove an already-active caller transaction rejects without being ended.
- [x] 2.4 Run the native SQLite ABI preflight, focused durable recovery/conformance tests, the complete journal/migration lane, Node 22 nonincremental TypeScript, targeted lint/format, strict OpenSpec/QC, `git diff --check`, the no-production-wiring scan, and one sequential independent integrity/concurrency review.
  - Receipt: Node `22.22.0` / ABI `127`, `better-sqlite3` `12.5.0`, SQLite `3.51.1`; focused recovery 8/8 and complete journal/migration 120/120 passed; nonincremental TypeScript, targeted lint/format, strict OpenSpec 231/231, active-change QC 14/14, whitespace, and no-production-wiring checks passed; sequential review APPROVE with zero findings.

## 3. Exact-Main Closeout — PR 2

- [x] 3.1 After PR 1 merges, update an exact-main worktree, record its merge SHA and Node/module-ABI/`better-sqlite3`/SQLite versions, rerun the focused and complete recovery gates, and remove its worktree, dependency junction, local/remote branch, and stale refs.
  - Receipt: PR #1118 squash-merged as `e323865cce7e790cbe5ac7ce75d5ab7e599c2bdb` after all 29 checks passed. Exact main ran under Node `22.22.0`, module ABI `127`, `better-sqlite3` `12.5.0`, and SQLite `3.51.1`; focused recovery passed 8/8 and the complete journal/migration lane passed 120/120. Nonincremental TypeScript, targeted lint/format, strict OpenSpec 231/231, active-change QC 14/14, whitespace, and no-production-wiring checks passed. The implementation worktree, verified dependency junction, local/remote branch, tracking ref, and stale worktree metadata were removed while the protected maintenance checkout remained unchanged.
- [x] 3.2 Reconcile and sync this `event-store` delta, archive the intact change with all implementation receipts, and keep the active-change ledger plus entity-history wave map exact in one docs-only PR.
  - Receipt: the canonical `event-store` spec gained the coherent verified-open requirement without changing replay, checkpoint, privacy, combat, campaign, or production-adoption ownership. This change moved to `openspec/changes/archive/2026-08-01-harden-sqlite-journal-coherent-verified-open/`; its active-ledger entry was removed, and the entity-history wave map now identifies both prerequisite leaves as archived while retaining replay as the next strict dependency.

Post-merge terminal evidence: after the closeout PR merges, verify the archived artifacts, active ledger, entity-history wave map, and strict OpenSpec/QC gates on exact main, then prune the closeout branch/worktree/dependency junction and stale refs before replay or authority-adoption implementation begins. This is intentionally not an artifact checkbox because an archived change cannot truthfully record its own future merge SHA or branch deletion.
