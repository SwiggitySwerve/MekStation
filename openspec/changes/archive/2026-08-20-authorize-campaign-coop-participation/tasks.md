> Completed 2026-08-20 (reconciliation): implemented and delivered by the CAMP-01C wave (product PR #1235); attested by the durable reviewed-head + exact-main + cleanup receipts (full durable index readmitted 23/23 through validator plus all four anchors after CAMP-R1, 2026-08-12) and the council review at `openspec/council-decisions/2026-08-12-camp01-wave-execution-review.md`.

## 1. Protocol and identity

- [x] 1.1 Define the minimal participation payload and reject unknown/full-force/identity fields.
- [x] 1.2 Bind player and role from the verified connection and registry; capture an acknowledged baseline revision, atomically compare it at admission, and test stale-connection rejection plus rebind/rehydration.

## 2. Runtime admission

- [x] 2.1 Accept an authorized choice and make an identical repeat idempotent without replacing the registry snapshot.
- [x] 2.2 Reject forged identity, foreign force, stale revision, conflicting repeat, and full-force payload before mutation.

## 3. Verification and delivery

- [x] 3.1 Run `npm.cmd test -- --watchAll=false --runTestsByPath src/types/multiplayer/__tests__/Protocol.test.ts src/lib/multiplayer/server/__tests__/bindCampaignSyncConnection.test.ts src/lib/campaign/coop/__tests__/coopRuntimeSession.test.ts --runInBand`, `npm.cmd run verify:qc:coop-campaign-journey`, Node 22 typecheck/lint/format, strict OpenSpec validation, and OpenSpec CI QC.
- [x] 3.2 After CAMP-01B exact-main cleanup, use the row-resolved CAMP-01C controller register/proof gates and pass the 12-file/450-line cap; then SHA-guard merge, exact-main proof, cleanup, and prune before CAMP-01D.
