# P2CA independent storage review

> **Reviewer:** /root/p2ca_review
> **Delegation identity:** provider cliproxy; model gpt-6.1-sol; effort high; task independent Task9/P2CA implementation review
> **Reviewed head:** 73532bcafcfa9cf65e30b46d45af6528315da127
> **Comparison baseline:** ba8007f2dfea7786a3823145eb999e308c97f3fa
> **Verdict:** APPROVE storage implementation; full semantic admission and delivery remain unresolved
> **Authority:** Owner D1, owner-unblock-decisions-20261016.md; no native capture required or attempted

I independently read the approved storage preparation and its review, the original Task9 card, the frozen admission census, the R2.authority-live P2CA leaf restriction, and the candidate source, tests and receipts. I did not write implementation code or change its tests, metadata, validator, capture registration or grants. This receipt is my only write.

No actionable storage-code defect remains in the reviewed candidate. The server owner accepts only a receipt identity and key; its trusted synchronous ports resolve the delivered cumulative completed offer and current authority on the same handle inside an immediate SQLite transaction. Public results omit the journal cut. Production issuance, admitted socket/principal resolution, verified history readers and consumer completion remain later integration obligations; the tests do not establish those integrations.

The canonical versioned JSON tuple binds campaign/session/participant, membership seat and boundAt incarnation, and proven viewer participant/isGm. The owner rejects a mismatched viewer, inactive membership and committed-removal context before duplicate acceptance. This is an entitlement identity, not a presentation hash or cursor epoch. Branch/generation and authority are revalidated before every accepted or duplicate result.

The migration creates exactly one empty keyed table without backfill. Missing rows remain null, including at cut zero. Exact duplicate evidence preserves row bytes; equal/lower cuts under matching authority preserve the newer row; conflicting current receipt reuse refuses. A lineage/authority change requires a replacement offer bound to the previous receipt, including when the new cut is lower. Real driver/preparation errors propagate, and the tested post-write exception rolls back the actual mutation.

## Independent runtime evidence

At the exact reviewed commit I ran, from E:/Projects/Personal/MekStation-wt/p2ca-applied-view-20261016:

```text
node node_modules/jest/bin/jest.js --runInBand --watchAll=false --runTestsByPath src/lib/campaign/sync/__tests__/campaignPublicAppliedView.integration.test.ts src/services/persistence/__tests__/SQLiteService.migrations.test.ts src/services/persistence/__tests__/SQLiteService.replayCheckpointsBranch.migration.test.ts
```

Exit 0: 3 suites passed, 33 tests passed, 0 snapshots, 2.57 seconds. The fixtures use real file-backed SQLite with production migrations, close/reset and reopen, table/row queries, reapplication, migration-ledger failure rollback, and a wrapper that executes the actual write before throwing. Authority/history ports are controlled test fixtures; database transactions are real.

I inspected the preserved failure.log under E:/Projects/MekStation/.omo/ulw-execute/mekstation-whole-roadmap-execution-20261002-01a0febd/task-9-20261016/. It contains the genuine absent-module/table RED and the later explicit migration-head mismatch (expected 31, received 32). The reviewed test preserves a literal expected 32 rather than a self-adjusting maximum. RED chronology is supported by the implementation lane's captured log; I did not independently rerun a pre-implementation checkout. Typecheck, lint and format PASS are recorded by the implementation lane; my independent execution was the focused three-suite command above.

## Scope and binding

The committed baseline-to-head diff has 10 changed files. This separately authored receipt occupies the reserved eleventh path, within 15. The six source/test leaves match the R2 P2CA restriction. Product additions are 245 owner + 21 migration + 2 registration = 268; lifecycle metadata adds 16, making the conservative counted total 284/500 without deletion credit. Test additions are 309 + 58 + 1 = 368. Existing deletions are 6 lifecycle and 1 test lines. Evidence additions are reported separately; no unnamed product path was added.

Working-file SHA256 values observed at the reviewed head (Windows checkout bytes):

| File | SHA256 |
| --- | --- |
| src/lib/campaign/sync/campaignPublicAppliedView.ts | fab760d1270757b3111408ff2ccc9fc14804937747b42c9ce8b315a4e118a151 |
| src/services/persistence/SQLiteService.publicAppliedViews.migration.ts | c30d5dd40eb4623e7ecc2bc282486ae7c6b079a7f1b5c666dc45c126d223be26 |
| src/services/persistence/SQLiteService.migrations.ts | be920064cc1690ea075ca72c9fe83aba8bd01030170bab2c9ee3c3d8d631ce5c |
| src/lib/campaign/sync/__tests__/campaignPublicAppliedView.integration.test.ts | 8a9a8b5ec69286fd283c013794c17aba80270d265a6f7e1f76589b7e4acc6b6b |
| src/services/persistence/__tests__/SQLiteService.migrations.test.ts | e9cc05448e694d99ff7a558c113344514dfb08c7808a86cbede5c50f42a42c36 |
| src/services/persistence/__tests__/SQLiteService.replayCheckpointsBranch.migration.test.ts | f77b5ca4fccf8fc9770179d0e5a54a5f0dcdc0d11565f731010b536932b7bbc2 |

## Admission and delivery limits

The implementation lane reported a local-verified lifecycle promotion refusal, independently confirmed in validator source at openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs:556-557: P2CA has sensitive review classes but no packet naming it in blocks. This is a packet ownership prerequisite, not an NDC1/native-capture refusal. The candidate deliberately retains state implementing and labels the local receipt as passing raw checks with lifecycle acceptance held. No validator or packet change is included. Root must resolve this prerequisite before claiming full semantic admission/delivery; passing validation while implementing does not discharge it.

This review approves the pinned storage implementation only. It does not certify hosted CI, a later commit, Opus phase-exit review, packet acceptance, merge or Main proof. Root retains those obligations. Adding this receipt changes the commit identity; unchanged source hashes bind the reviewed product to a later receipt-only commit, but any further product change requires renewed review.
