## 1. Protocol and identity

- [ ] 1.1 Define the minimal participation payload and reject unknown/full-force/identity fields.
- [ ] 1.2 Bind player and role from the verified connection and registry; capture an acknowledged baseline revision, atomically compare it at admission, and test stale-connection rejection plus rebind/rehydration.

## 2. Runtime admission

- [ ] 2.1 Accept an authorized choice and make an identical repeat idempotent without replacing the registry snapshot.
- [ ] 2.2 Reject forged identity, foreign force, stale revision, conflicting repeat, and full-force payload before mutation.

## 3. Verification and delivery

- [ ] 3.1 Run `npm.cmd test -- --watchAll=false --runTestsByPath src/types/multiplayer/__tests__/Protocol.test.ts src/lib/multiplayer/server/__tests__/bindCampaignSyncConnection.test.ts src/lib/campaign/coop/__tests__/coopRuntimeSession.test.ts --runInBand`, `npm.cmd run verify:qc:coop-campaign-journey`, Node 22 typecheck/lint/format, strict OpenSpec validation, and OpenSpec CI QC.
- [ ] 3.2 After CAMP-01B exact-main cleanup, use the row-resolved CAMP-01C controller register/proof gates and pass the 12-file/450-line cap; then SHA-guard merge, exact-main proof, cleanup, and prune before CAMP-01D.
